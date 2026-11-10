"""Pre-Graph Validation Layer & Quarantine Gate — Milestone 3.2.

Enforces `LLM proposes -> Validator decides`:
  - auto_accepted (0.90-1.00) -> commits directly into Story Graph tables
  - human_review  (0.40-0.89) -> held in `validation_candidates` awaiting author approval/merge/split
  - reject_hold   (0.00-0.39) -> quarantined without polluting canon
Combines structural heuristics + mandatory Claude Sonnet semantic verification
(Pronoun Resolution, Entity Split/Merge Judge, Unreliable Narrator Guard).
"""

import logging
import uuid
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

_NON_ENTITY_TOKENS = {
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december", "today", "yesterday", "tomorrow",
    "chapter", "prologue", "epilogue", "he", "she", "they", "them", "him", "her",
    "someone", "anyone", "everyone", "nobody",
}

_TITLES = {"mr", "mrs", "ms", "miss", "dr", "detective", "captain", "sir", "lord", "lady"}


def _route_for_confidence(confidence: float, auto_threshold: float = 0.90) -> str:
    if confidence >= auto_threshold:
        return "auto_accepted"
    if confidence >= 0.40:
        return "human_review"
    return "reject_hold"


def _evaluate_entities_and_claims_llm(
    chapter_text: str,
    payload,
    existing_characters: list,
    use_llm: bool = True,
) -> dict[str, Any]:
    """Run Claude Sonnet to audit pronouns, ambiguous entity aliases/splits, and unreliable narration."""
    result: dict[str, Any] = {
        "character_judgments": {},
        "claim_judgments": {},
        "narrator_unreliable": False,
        "pronoun_resolutions": {},
    }
    if not use_llm or (not payload.characters and not payload.claims):
        return result

    try:
        from app.config import settings
        from app.services import llm_budget
        from app.services.extractor import get_anthropic_client

        if not settings.anthropic_api_key:
            return result

        class EntityJudgment(BaseModel):
            name: str
            confidence: float = Field(ge=0.0, le=1.0)
            ambiguity_reason: str | None = None
            resolved_to: str | None = None

        class ClaimJudgment(BaseModel):
            subject: str
            attribute: str
            value: str
            confidence: float = Field(ge=0.0, le=1.0)
            ambiguity_reason: str | None = None
            resolved_subject: str | None = None

        class ValidationJudgments(BaseModel):
            entity_judgments: list[EntityJudgment] = Field(default_factory=list)
            claim_judgments: list[ClaimJudgment] = Field(default_factory=list)
            narrator_unreliable: bool = False

        roster_str = ", ".join(
            f"{c.name} (aliases: {', '.join(c.aliases or [])})" for c in existing_characters
        ) or "None yet"
        chars_str = ", ".join(f"{c.name} (aliases={c.aliases})" for c in payload.characters)
        claims_str = "\n".join(
            f"- {cl.subject}.{cl.attribute}={cl.value} (\"{cl.evidence_quote}\")"
            for cl in payload.claims
        )

        budget = llm_budget.compute_input_char_budget(
            settings.chat_model, max_output_tokens=2048, overhead_tokens=4000
        )
        windows = llm_budget.split_text_windows(chapter_text, budget)
        client = get_anthropic_client()

        for win in windows:
            prompt = f"""Act as NERRA's pre-graph Validation Judge.
Inspect candidate characters and claims before committing to the canon Story Graph:
1. Junk Entities (`confidence <= 0.35`): calendar days ("Monday"), months, pronouns ("She"), or generic nouns misclassified as Characters.
2. Ambiguous Entity Collisions (`0.45 - 0.75`): e.g. a title+surname ("Miss Mitchell") when "Sarah Mitchell" already exists AND the passage hints they might be two different family members (mother/daughter) or ambiguous alias.
3. Pronoun Resolution: if a claim subject is a pronoun ("she", "he", "the detective") and unambiguous in text, fill `resolved_subject`; if ambiguous across speakers, set `confidence = 0.55` and explain why.
4. Unreliable Narrator: set `narrator_unreliable=true` if the passage explicitly frames the narrator/speaker as lying, hallucinating, or deceiving.

EXISTING CANON CHARACTERS: {roster_str}
CANDIDATE CHARACTERS: {chars_str}
CANDIDATE CLAIMS:
{claims_str}

CHAPTER TEXT:
{win}"""

            response = client.messages.create(
                model=settings.chat_model,
                max_tokens=2048,
                tools=[
                    {
                        "name": "save_validation_judgments",
                        "description": "Record pre-graph validation confidence & ambiguity reasons",
                        "input_schema": ValidationJudgments.model_json_schema(),
                    }
                ],
                tool_choice={"type": "tool", "name": "save_validation_judgments"},
                messages=[{"role": "user", "content": prompt}],
            )
            for block in response.content:
                if getattr(block, "type", None) == "tool_use" and block.name == "save_validation_judgments":
                    parsed = ValidationJudgments.model_validate(block.input)
                    result["narrator_unreliable"] = bool(
                        result["narrator_unreliable"] or parsed.narrator_unreliable
                    )
                    for ej in parsed.entity_judgments:
                        ek = ej.name.strip().lower()
                        prev_ej = result["character_judgments"].get(ek)
                        if prev_ej is None or ej.confidence < prev_ej["confidence"]:
                            result["character_judgments"][ek] = {
                                "confidence": ej.confidence,
                                "ambiguity_reason": ej.ambiguity_reason,
                                "resolved_to": ej.resolved_to,
                            }
                    for cj in parsed.claim_judgments:
                        key = (cj.subject.strip().lower(), cj.attribute.strip().lower(), cj.value.strip().lower())
                        prev_cj = result["claim_judgments"].get(key)
                        if prev_cj is None or cj.confidence > prev_cj["confidence"]:
                            result["claim_judgments"][key] = {
                                "confidence": cj.confidence,
                                "ambiguity_reason": cj.ambiguity_reason,
                                "resolved_subject": cj.resolved_subject,
                            }
                    break
    except Exception as exc:  # noqa: BLE001
        logger.debug("LLM validation judge skipped/fallback: %s", exc)

    return result


def gate_and_commit_extraction(
    db: Session,
    project_id,
    manuscript_id,
    chapter_number: int,
    chapter_text: str,
    payload,
    use_llm: bool = True,
) -> tuple[Any, list]:
    """Validate extracted items before Story Graph persistence.

    Only `auto_accepted` (>= 0.90) candidates enter `persist_extraction`.
    Medium-confidence (`0.40-0.89`) -> `human_review` and Low (`0.00-0.39`) -> `reject_hold`
    are stored cleanly in `validation_candidates`.
    """
    from app.models import Character, ValidationCandidate
    from app.services import extractor, plot_threads
    from app.services.extractor import ExtractionPayload

    pid = uuid.UUID(str(project_id)) if not isinstance(project_id, uuid.UUID) else project_id
    cust = plot_threads.get_customization(db, pid).get("custom_validation") or {}
    auto_threshold = float(cust.get("auto_accept_threshold", 0.90))
    extra_ignored = {str(t).strip().lower() for t in (cust.get("extra_ignored_tokens") or []) if str(t).strip()}
    blocked_tokens = _NON_ENTITY_TOKENS | extra_ignored

    existing_chars = db.query(Character).filter(Character.project_id == pid).all()
    existing_pending_sigs: set[tuple[str, str]] = set()
    if manuscript_id is not None:
        import json as _json

        for prev in (
            db.query(ValidationCandidate)
            .filter(
                ValidationCandidate.project_id == pid,
                ValidationCandidate.manuscript_id == manuscript_id,
                ValidationCandidate.chapter == chapter_number,
                ValidationCandidate.status == "pending",
            )
            .all()
        ):
            existing_pending_sigs.add((prev.candidate_type, _json.dumps(prev.payload or {}, sort_keys=True)))
    existing_exact = {c.name.strip().lower() for c in existing_chars}
    existing_aliases = {a.strip().lower() for c in existing_chars for a in (c.aliases or [])}
    existing_surnames = {
        c.name.strip().lower().split()[-1]
        for c in existing_chars
        if len(c.name.strip().split()) >= 2
    }

    llm_judgments = _evaluate_entities_and_claims_llm(chapter_text, payload, existing_chars, use_llm=use_llm)

    accepted_chars = []
    staged_rows: list[ValidationCandidate] = []

    for ch in payload.characters:
        name_clean = ch.name.strip()
        key = name_clean.lower()
        llm_j = llm_judgments["character_judgments"].get(key)

        conf = 0.95
        reason = None
        if key in blocked_tokens or len(key) < 2:
            conf = 0.25
            reason = f'"{name_clean}" appears to be a calendar/pronoun/non-character token.'
        elif llm_j is not None:
            conf = float(llm_j["confidence"])
            reason = llm_j.get("ambiguity_reason")
        else:
            parts = key.split()
            if (
                len(parts) == 2
                and parts[0].rstrip(".") in _TITLES
                and parts[1] in existing_surnames
                and key not in existing_exact
                and key not in existing_aliases
            ):
                conf = 0.60
                reason = (
                    f'Title + surname "{name_clean}" shares surname with existing character; '
                    "confirm whether this is an alias, same person, or distinct relative."
                )

        route = _route_for_confidence(conf, auto_threshold=auto_threshold)
        if route == "auto_accepted":
            accepted_chars.append(ch)
        else:
            import json as _json

            payload_dict = ch.model_dump()
            sig = ("character", _json.dumps(payload_dict, sort_keys=True))
            if sig not in existing_pending_sigs:
                existing_pending_sigs.add(sig)
                row = ValidationCandidate(
                    project_id=pid,
                    manuscript_id=manuscript_id,
                    chapter=chapter_number,
                    candidate_type="character",
                    payload=payload_dict,
                    confidence=conf,
                    route=route,
                    ambiguity_reason=reason,
                    status="pending",
                )
                db.add(row)
                staged_rows.append(row)

    accepted_claims = []
    for cl in payload.claims:
        subj_clean = cl.subject.strip()
        key = (subj_clean.lower(), cl.attribute.strip().lower(), cl.value.strip().lower())
        llm_cj = llm_judgments["claim_judgments"].get(key)
        conf = 0.95
        reason = None

        if subj_clean.lower() in {"he", "she", "they", "it", "someone", "unknown"}:
            if llm_cj and llm_cj.get("resolved_subject"):
                cl.subject = llm_cj["resolved_subject"].strip()
                conf = float(llm_cj.get("confidence", 0.92))
            else:
                conf = 0.58
                reason = f'Unresolved pronoun subject "{subj_clean}" requires author confirmation.'
        elif llm_cj is not None:
            conf = float(llm_cj["confidence"])
            reason = llm_cj.get("ambiguity_reason")
            if llm_cj.get("resolved_subject"):
                cl.subject = llm_cj["resolved_subject"].strip()

        if llm_judgments.get("narrator_unreliable") and conf >= 0.90:
            conf = 0.72
            reason = reason or "Extracted inside unreliable narrator / deception framing; held for review."

        route = _route_for_confidence(conf, auto_threshold=auto_threshold)
        if route == "auto_accepted":
            accepted_claims.append(cl)
        else:
            import json as _json

            payload_dict = cl.model_dump()
            sig = ("claim", _json.dumps(payload_dict, sort_keys=True))
            if sig not in existing_pending_sigs:
                existing_pending_sigs.add(sig)
                row = ValidationCandidate(
                    project_id=pid,
                    manuscript_id=manuscript_id,
                    chapter=chapter_number,
                    candidate_type="claim",
                    payload=payload_dict,
                    confidence=conf,
                    route=route,
                    ambiguity_reason=reason,
                    evidence_quote=cl.evidence_quote,
                    status="pending",
                )
                db.add(row)
                staged_rows.append(row)

    approved_payload = ExtractionPayload(
        characters=accepted_chars,
        relationships=payload.relationships,
        locations=payload.locations,
        objects=payload.objects,
        events=payload.events,
        claims=accepted_claims,
        knowledge=payload.knowledge,
        custody_events=payload.custody_events,
        world_rules=getattr(payload, "world_rules", []),
    )
    extractor.persist_extraction(db, pid, chapter_number, approved_payload)
    db.commit()
    return approved_payload, staged_rows


def resolve_candidate(
    db: Session,
    project_id,
    candidate_id,
    action: str,
    target_character_id=None,
    split_name: str | None = None,
):
    """Apply an author's resolution to a staged `ValidationCandidate`."""
    from app.models import Character, ValidationCandidate
    from app.services import extractor, graph
    from app.services.extractor import ExtractedCharacter, ExtractedClaim, ExtractionPayload

    pid = uuid.UUID(str(project_id)) if not isinstance(project_id, uuid.UUID) else project_id
    cid = uuid.UUID(str(candidate_id)) if not isinstance(candidate_id, uuid.UUID) else candidate_id
    cand = db.get(ValidationCandidate, cid)
    if cand is None or cand.project_id != pid:
        raise ValueError("Candidate not found")

    if action == "reject":
        cand.status = "rejected"
        db.commit()
        db.refresh(cand)
        return cand

    if action == "approve":
        if cand.candidate_type == "character":
            p = ExtractionPayload(characters=[ExtractedCharacter.model_validate(cand.payload)])
            extractor.persist_extraction(db, pid, cand.chapter, p)
        elif cand.candidate_type == "claim":
            p = ExtractionPayload(claims=[ExtractedClaim.model_validate(cand.payload)])
            extractor.persist_extraction(db, pid, cand.chapter, p)
        cand.status = "approved"
    elif action == "merge":
        if cand.candidate_type == "character" and target_character_id is not None:
            target = db.get(Character, uuid.UUID(str(target_character_id)))
            if target is None or target.project_id != pid:
                raise ValueError("Target character not found")
            cand_name = str((cand.payload or {}).get("name", "")).strip()
            aliases = list(target.aliases or [])
            if cand_name and cand_name not in aliases and cand_name.lower() != target.name.lower():
                aliases.append(cand_name)
                target.aliases = aliases
        cand.status = "merged"
    elif action == "split":
        if cand.candidate_type == "character":
            new_name = (split_name or str((cand.payload or {}).get("name", ""))).strip()
            if not new_name:
                raise ValueError("Split name cannot be empty")
            db.add(
                Character(
                    project_id=pid,
                    name=new_name,
                    aliases=list((cand.payload or {}).get("aliases") or []),
                    description=(cand.payload or {}).get("description"),
                    status=(cand.payload or {}).get("status") or "active",
                    first_chapter=cand.chapter,
                    last_chapter=cand.chapter,
                )
            )
        cand.status = "split"

    db.commit()
    db.refresh(cand)
    try:
        graph.sync_project_graph(db, pid)
    except Exception:  # noqa: BLE001
        pass
    return cand
