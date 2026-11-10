"""LangGraph Contradiction Intent Reasoner — Milestone 2.4.

Upgrades raw pairwise contradiction flags with an intent-classification agent:

    START -> gather_context -> reason_about_intent -> route_by_confidence -> END

Distinguishes accidental author continuity errors from intentional narrative
tension (disguises, false names, unreliable narrators, deliberate deception).
"""

import logging
import re
from typing import TypedDict

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

try:
    from langgraph.graph import END, StateGraph  # type: ignore
except ImportError:  # pragma: no cover
    StateGraph = None
    END = None

_INTENTIONAL_CUES = re.compile(
    r"\b(false name|alias|disguise|pretend|lied|deceiv|undercover|fake|mask|dream|hallucinat|unreliable)\b",
    re.I,
)


class IntentResult(BaseModel):
    intent_classification: str = Field(
        description="One of: error | intentional | ambiguous"
    )
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str


class ReasonerState(TypedDict, total=False):
    project_id: str
    issue_type: str
    description: str
    evidence: list[dict]
    surrounding_context: str
    use_llm: bool
    intent_classification: str
    confidence: float
    ai_reasoning: str
    severity: str


def gather_context_node(state: ReasonerState) -> dict:
    """Gather full surrounding manuscript chunks and character context for involved chapters."""
    from app.database import SessionLocal
    from app.models import Character, Chunk, Manuscript

    chapters = {
        ev.get("chapter")
        for ev in (state.get("evidence") or [])
        if isinstance(ev.get("chapter"), int)
    }
    passages: list[str] = []
    if state.get("project_id"):
        db = SessionLocal()
        try:
            chars = (
                db.query(Character)
                .filter(Character.project_id == state["project_id"])
                .all()
            )
            if chars:
                roster_lines = [
                    f"{c.name}" + (f" (aliases: {', '.join(c.aliases)})" if c.aliases else "")
                    for c in chars
                ]
                passages.append("[Known Characters]\n" + ", ".join(roster_lines))
            if chapters:
                chunks = (
                    db.query(Chunk)
                    .join(Manuscript, Chunk.manuscript_id == Manuscript.id)
                    .filter(Manuscript.project_id == state["project_id"])
                    .filter(Chunk.chapter_number.in_(list(chapters)))
                    .all()
                )
                for ch in chunks:
                    passages.append(f"[Chapter {ch.chapter_number}]\n{ch.content[:4000]}")
        except Exception as exc:  # noqa: BLE001
            logger.debug("Context gather skipped DB chunks: %s", exc)
        finally:
            db.close()

    return {"surrounding_context": "\n\n".join(passages)}


def reason_about_intent_node(state: ReasonerState) -> dict:
    """Classify whether the contradiction is an error, intentional tension, or ambiguous."""
    description = state.get("description", "")
    evidence = state.get("evidence", [])
    context = state.get("surrounding_context", "")
    evidence_text = " ".join(str(e.get("quote") or e.get("fact") or "") for e in evidence)
    combined = f"{description}\n{evidence_text}\n{context}"

    # 1. Try LLM classification when enabled and API key is configured
    if state.get("use_llm", True):
        try:
            from app.config import settings
            from app.services.extractor import get_anthropic_client

            if settings.anthropic_api_key:
                client = get_anthropic_client()
                prompt = f"""Analyze this story continuity issue carefully and classify the author's intent.

ISSUE TYPE: {state.get('issue_type')}
DESCRIPTION: {description}
EVIDENCE QUOTES: {evidence_text}
SURROUNDING PASSAGES & CHARACTER CONTEXT:
{context[:12000]}

Decide whether this is:
- "error": A genuine accidental continuity mistake (e.g. changing eye color, impossible timeline/custody contradiction, or leaked secret with no plot explanation).
- "intentional": Deliberate narrative tension (e.g. a character using a false name, disguise, lying, magical shift, or unreliable narrator).
- "ambiguous": Plausible either way without author confirmation (route to review queue).
"""
                response = client.messages.create(
                    model=settings.chat_model,
                    max_tokens=1024,
                    tools=[
                        {
                            "name": "classify_intent",
                            "description": "Record contradiction intent classification",
                            "input_schema": IntentResult.model_json_schema(),
                        }
                    ],
                    tool_choice={"type": "tool", "name": "classify_intent"},
                    messages=[{"role": "user", "content": prompt}],
                )
                for block in response.content:
                    if getattr(block, "type", None) == "tool_use" and block.name == "classify_intent":
                        parsed = IntentResult.model_validate(block.input)
                        return {
                            "intent_classification": parsed.intent_classification,
                            "confidence": parsed.confidence,
                            "ai_reasoning": parsed.reasoning,
                        }
        except Exception as exc:  # noqa: BLE001
            logger.warning("LLM intent reasoner fallback to heuristic: %s", exc)

    # 2. Deterministic heuristic fallback
    cue_match = _INTENTIONAL_CUES.search(combined)
    if cue_match:
        return {
            "intent_classification": "intentional",
            "confidence": 0.78,
            "ai_reasoning": (
                f'Surrounding text contains deception/disguise indicator ("{cue_match.group(0)}"), '
                "suggesting deliberate narrative tension rather than an error."
            ),
        }

    if state.get("issue_type") in ("contradiction", "spatiotemporal_conflict", "custody_paradox"):
        return {
            "intent_classification": "error",
            "confidence": 0.92,
            "ai_reasoning": (
                "Direct factual contradiction across chapters with no textual cues for disguise or "
                "unreliable narration."
            ),
        }

    return {
        "intent_classification": "ambiguous",
        "confidence": 0.68,
        "ai_reasoning": "Flagged for author confirmation in the Review Queue.",
    }


def route_by_confidence_node(state: ReasonerState) -> dict:
    """Assign final severity band based on intent & confidence."""
    intent = state.get("intent_classification", "error")
    conf = float(state.get("confidence", 0.9))

    if intent == "intentional":
        return {"severity": "blue", "intent_classification": "intentional", "confidence": conf}
    if intent == "error" and conf >= 0.85:
        return {"severity": "red", "intent_classification": "error", "confidence": conf}
    return {"severity": "yellow", "intent_classification": "ambiguous", "confidence": conf}


_compiled_reasoner = None


def build_reasoner_graph():
    if StateGraph is None:
        raise RuntimeError("langgraph is not installed")
    graph = StateGraph(ReasonerState)
    graph.add_node("gather_context", gather_context_node)
    graph.add_node("reason_about_intent", reason_about_intent_node)
    graph.add_node("route_by_confidence", route_by_confidence_node)
    graph.set_entry_point("gather_context")
    graph.add_edge("gather_context", "reason_about_intent")
    graph.add_edge("reason_about_intent", "route_by_confidence")
    graph.add_edge("route_by_confidence", END)
    return graph.compile()


def analyze_issue_intent(
    project_id,
    issue_type: str,
    description: str,
    evidence: list[dict],
    surrounding_context: str = "",
    use_llm: bool = True,
) -> dict:
    """Execute the LangGraph intent reasoner and return classification metadata."""
    global _compiled_reasoner
    if _compiled_reasoner is None:
        _compiled_reasoner = build_reasoner_graph()

    initial: ReasonerState = {
        "project_id": str(project_id),
        "issue_type": issue_type,
        "description": description,
        "evidence": evidence,
        "use_llm": use_llm,
    }
    if surrounding_context:
        # Preserve caller-supplied context if provided directly (e.g. unit tests)
        state_after_reason = reason_about_intent_node({**initial, "surrounding_context": surrounding_context})
        routed = route_by_confidence_node({**initial, **state_after_reason})
        return {**state_after_reason, **routed}

    final_state = _compiled_reasoner.invoke(initial)
    return {
        "intent_classification": final_state.get("intent_classification", "error"),
        "confidence": final_state.get("confidence", 0.9),
        "ai_reasoning": final_state.get("ai_reasoning", ""),
        "severity": final_state.get("severity", "yellow"),
    }


def evaluate_issue_in_db(db, issue, use_llm: bool = True):
    """Run intent reasoning on a persisted Issue row and save results."""
    res = analyze_issue_intent(
        project_id=issue.project_id,
        issue_type=issue.type,
        description=issue.description,
        evidence=issue.evidence or [],
        use_llm=use_llm,
    )
    issue.intent_classification = res["intent_classification"]
    issue.confidence = res["confidence"]
    issue.ai_reasoning = res["ai_reasoning"]
    issue.severity = res["severity"]
    db.commit()
    db.refresh(issue)
    return issue


def analyze_issues_batch_intent(
    project_id,
    drafts: list,
    conflict_types: set[str] | None = None,
    batch_size: int | None = None,
    use_llm: bool = True,
) -> list[dict]:
    """Classify a batch of IssueDraft objects sharing context to prevent O(N) LLM bursts."""
    if not drafts:
        return []

    target_types = conflict_types or {
        "contradiction",
        "knowledge_violation",
        "spatiotemporal_conflict",
        "custody_paradox",
        "world_rule_violation",
    }

    # Pre-populate deterministic baseline for all items
    results: list[dict] = [
        analyze_issue_intent(
            project_id=project_id,
            issue_type=d.type,
            description=d.description,
            evidence=d.evidence,
            surrounding_context=" ",  # skip per-issue DB roundtrip; heuristic fallback runs cleanly
            use_llm=False,
        )
        for d in drafts
    ]

    if not use_llm:
        return results

    try:
        from app.config import settings
        from app.services import llm_budget
        from app.services.extractor import get_anthropic_client

        if not settings.anthropic_api_key:
            return results
    except Exception:  # noqa: BLE001
        return results

    conflict_indices = [idx for idx, d in enumerate(drafts) if d.type in target_types]
    if not conflict_indices:
        return results

    # Gather shared project context once across involved chapters
    all_chapters = sorted(
        {
            ev.get("chapter")
            for idx in conflict_indices
            for ev in (drafts[idx].evidence or [])
            if isinstance(ev.get("chapter"), int)
        }
    )
    ctx_state = gather_context_node(
        {
            "project_id": str(project_id),
            "evidence": [{"chapter": ch} for ch in all_chapters[:6]],
        }
    )
    shared_limit = llm_budget.compute_shared_context_budget(settings.chat_model, max_output_tokens=2048)
    shared_ctx = (ctx_state.get("surrounding_context") or "")[:shared_limit]
    eff_batch_size = batch_size if batch_size is not None else llm_budget.compute_intent_batch_size(2048)

    class BatchIntentItem(BaseModel):
        index: int
        intent_classification: str = Field(description="One of: error | intentional | ambiguous")
        confidence: float = Field(ge=0.0, le=1.0)
        reasoning: str

    class BatchIntentResult(BaseModel):
        items: list[BatchIntentItem] = Field(default_factory=list)

    client = get_anthropic_client()
    for start in range(0, len(conflict_indices), eff_batch_size):
        chunk_idxs = conflict_indices[start : start + eff_batch_size]
        issues_block = "\n".join(
            f"[{i}] ({drafts[i].type}) {drafts[i].description} | Quotes: "
            + "; ".join(str(e.get("quote") or e.get("fact") or "") for e in (drafts[i].evidence or []))
            for i in chunk_idxs
        )
        prompt = f"""Analyze each numbered continuity issue carefully and classify the author's intent.
Decide for every index whether it is:
- "error": A genuine accidental continuity mistake.
- "intentional": Deliberate narrative tension (alias, disguise, lying, unreliable narrator, magic rule).
- "ambiguous": Needs author confirmation.

SURROUNDING CHARACTER & CHAPTER CONTEXT:
{shared_ctx}

ISSUES TO CLASSIFY:
{issues_block}"""
        try:
            resp = client.messages.create(
                model=settings.chat_model,
                max_tokens=2048,
                tools=[
                    {
                        "name": "classify_intent_batch",
                        "description": "Record intent classifications for each numbered issue",
                        "input_schema": BatchIntentResult.model_json_schema(),
                    }
                ],
                tool_choice={"type": "tool", "name": "classify_intent_batch"},
                messages=[{"role": "user", "content": prompt}],
            )
            for block in resp.content:
                if getattr(block, "type", None) == "tool_use" and block.name == "classify_intent_batch":
                    parsed = BatchIntentResult.model_validate(block.input)
                    valid_idx = set(chunk_idxs)
                    for item in parsed.items:
                        if item.index not in valid_idx:
                            continue
                        routed = route_by_confidence_node(
                            {
                                "intent_classification": item.intent_classification,
                                "confidence": item.confidence,
                            }
                        )
                        results[item.index] = {
                            "intent_classification": routed["intent_classification"],
                            "confidence": routed["confidence"],
                            "ai_reasoning": item.reasoning,
                            "severity": routed["severity"],
                        }
                    break
        except Exception as exc:  # noqa: BLE001
            logger.warning("Batched LLM intent reasoner fallback to heuristic: %s", exc)

    return results
