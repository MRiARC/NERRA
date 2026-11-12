"""Graph RAG Story Chat agent built on LangGraph (`START -> retrieve -> answer -> END`)."""

import logging
import re
from typing import TypedDict

logger = logging.getLogger(__name__)

try:  # langgraph is in requirements.txt; this guard keeps the app bootable
    from langgraph.graph import END, StateGraph  # type: ignore
except ImportError:  # pragma: no cover
    StateGraph = None
    END = None
    logger.warning("langgraph is not installed — the story chat agent is disabled")


class ChatState(TypedDict, total=False):
    """The agent's working memory as it moves through the graph."""

    project_id: str
    question: str
    intent: str
    graph_entities: list[str]
    contexts: list[dict]  # [{chapter, content}] retrieved passages + facts
    answer: str
    citations: list[dict]  # [{chapter, excerpt}]


def classify_query_intent(question: str, use_llm: bool = True) -> str:
    """Classify the story question via Claude (with deterministic keyword fallback)."""
    if use_llm and question and question.strip():
        try:
            from pydantic import BaseModel

            from app.config import settings
            from app.services.extractor import get_anthropic_client

            if settings.anthropic_api_key:
                class IntentChoice(BaseModel):
                    intent: str  # epistemic | relational | chronological | factual | semantic

                client = get_anthropic_client()
                res = client.messages.create(
                    model=settings.chat_model,
                    max_tokens=128,
                    tools=[
                        {
                            "name": "set_intent",
                            "description": "Classify query intent",
                            "input_schema": IntentChoice.model_json_schema(),
                        }
                    ],
                    tool_choice={"type": "tool", "name": "set_intent"},
                    messages=[
                        {
                            "role": "user",
                            "content": (
                                "Classify this story question into one of: epistemic, relational, "
                                f"chronological, factual, semantic.\nQuestion: {question}"
                            ),
                        }
                    ],
                )
                for block in res.content:
                    if getattr(block, "type", None) == "tool_use" and block.name == "set_intent":
                        choice = IntentChoice.model_validate(block.input).intent.strip().lower()
                        if choice in ("epistemic", "relational", "chronological", "factual", "semantic"):
                            return choice
        except Exception as exc:  # noqa: BLE001
            logger.debug("LLM intent classification fallback: %s", exc)

    q = (question or "").lower()
    if any(k in q for k in ("know", "knew", "knows", "secret", "aware", "suspect", "learned", "discovered", "told")):
        return "epistemic"
    if any(k in q for k in ("relationship", "between", "ally", "enemy", "trust", "friend", "rival", "related", "mentor")):
        return "relational"
    if any(k in q for k in ("when", "before", "after", "timeline", "chronolog", "flashback", "order", "sequence")):
        return "chronological"
    if any(k in q for k in ("what color", "where", "who", "attribute", "describe", "eyes", "hair", "holding", "custody", "carry")):
        return "factual"
    return "semantic"


def grade_contexts(question: str, contexts: list[dict], use_llm: bool = True) -> bool:
    """Grade whether retrieved contexts provide sufficient grounding for the question."""
    if not contexts:
        return False
    if use_llm:
        try:
            from pydantic import BaseModel

            from app.config import settings
            from app.services.extractor import get_anthropic_client

            if settings.anthropic_api_key:
                class GradeResult(BaseModel):
                    sufficient: bool

                preview = "\n".join(
                    f"[Ch.{c.get('chapter', 0)}] {c.get('content', '')[:300]}"
                    for c in contexts[:8]
                )
                client = get_anthropic_client()
                res = client.messages.create(
                    model=settings.chat_model,
                    max_tokens=128,
                    tools=[
                        {
                            "name": "grade",
                            "description": "Grade retrieval sufficiency",
                            "input_schema": GradeResult.model_json_schema(),
                        }
                    ],
                    tool_choice={"type": "tool", "name": "grade"},
                    messages=[
                        {
                            "role": "user",
                            "content": f"Is this context sufficient to answer '{question}'?\n\n{preview}",
                        }
                    ],
                )
                for block in res.content:
                    if getattr(block, "type", None) == "tool_use" and block.name == "grade":
                        return bool(GradeResult.model_validate(block.input).sufficient)
        except Exception as exc:  # noqa: BLE001
            logger.debug("LLM context grading fallback: %s", exc)

    has_chapter = any(int(ctx.get("chapter", 0) or 0) > 0 for ctx in contexts)
    q_tokens = {w for w in re.findall(r"[a-z]{4,}", (question or "").lower())}
    combined = " ".join(ctx.get("content", "").lower() for ctx in contexts)
    overlap = any(tok in combined for tok in q_tokens) if q_tokens else True
    return has_chapter and overlap


def rewrite_query_for_retrieval(question: str) -> list[str]:
    """Generate focused fallback search keywords/terms via Claude when initial RAG recall is weak."""
    try:
        from pydantic import BaseModel

        from app.config import settings
        from app.services.extractor import get_anthropic_client

        if settings.anthropic_api_key:
            class SearchTerms(BaseModel):
                terms: list[str]

            client = get_anthropic_client()
            res = client.messages.create(
                model=settings.chat_model,
                max_tokens=128,
                tools=[
                    {
                        "name": "search_terms",
                        "description": "Extract high-signal search keywords",
                        "input_schema": SearchTerms.model_json_schema(),
                    }
                ],
                tool_choice={"type": "tool", "name": "search_terms"},
                messages=[
                    {
                        "role": "user",
                        "content": f"Extract 2-4 exact entity/topic keywords to search a novel for: {question}",
                    }
                ],
            )
            for block in res.content:
                if getattr(block, "type", None) == "tool_use" and block.name == "search_terms":
                    return [t.strip() for t in SearchTerms.model_validate(block.input).terms if t.strip()]
    except Exception as exc:  # noqa: BLE001
        logger.debug("LLM query rewrite fallback: %s", exc)
    return re.findall(r"[A-Za-z]{4,}", question)[:3]


# ---------------------------------------------------------------------------
# Graph RAG nodes
# ---------------------------------------------------------------------------


def retrieve_node(state: ChatState) -> dict:
    """Gather Graph RAG evidence for answering the question.

    Combines:
      1. Intent classification (`epistemic`, `relational`, `chronological`, `factual`, `semantic`).
      2. pgvector semantic passage search (+ keyword retry fallback when needed).
      3. Multi-hop Graph neighborhood expansion (Neo4j/SQL) for mentioned entities,
         plus timeline & knowledge facts matching the query intent.
      4. Active structured Claim facts.
    """
    from app.database import SessionLocal
    from app.models import Character, Claim, Chunk, KnowledgeUpdate, Location, Manuscript, PlotThread, Relationship
    from app.services import embedder, graph, timeline

    project_id = state["project_id"]
    question = state["question"]
    intent = classify_query_intent(question)

    contexts: list[dict] = []
    graph_entities: list[str] = []
    seen_chunk_ids: set[str] = set()
    db = SessionLocal()
    try:
        # 1. Semantic search using local sentence-transformers embedder
        try:
            vec = embedder.embed_one(question)
            chunks = (
                db.query(Chunk)
                .join(Manuscript, Chunk.manuscript_id == Manuscript.id)
                .filter(Manuscript.project_id == project_id)
                .filter(Chunk.embedding.isnot(None))
                .order_by(Chunk.embedding.cosine_distance(vec))
                .limit(8)
                .all()
            )
            for chunk in chunks:
                seen_chunk_ids.add(str(chunk.id))
                contexts.append({
                    "chapter": chunk.chapter_number,
                    "content": chunk.content,
                })
        except Exception as exc:
            logger.warning("Retrieval chunk search failed: %s", exc)

        # Fallback if no embeddings or vector match returned
        if not contexts:
            fallback_chunks = (
                db.query(Chunk)
                .join(Manuscript, Chunk.manuscript_id == Manuscript.id)
                .filter(Manuscript.project_id == project_id)
                .limit(4)
                .all()
            )
            for chunk in fallback_chunks:
                seen_chunk_ids.add(str(chunk.id))
                contexts.append({
                    "chapter": chunk.chapter_number,
                    "content": chunk.content,
                })

        # 2. Graph RAG: match Character & Location entities and expand neighborhood
        characters = db.query(Character).filter(Character.project_id == project_id).all()
        locations = db.query(Location).filter(Location.project_id == project_id).all()
        char_by_id = {c.id: c.name for c in characters}
        char_names = [c.name for c in characters]

        q_lower = question.lower()
        matched_char_ids = {
            c.id for c in characters if len(c.name) >= 2 and c.name.lower() in q_lower
        }
        matched_entities = [c.name for c in characters if c.id in matched_char_ids]
        for loc in locations:
            if len(loc.name) >= 2 and loc.name.lower() in q_lower and loc.name not in matched_entities:
                matched_entities.append(loc.name)

        graph_notes: list[str] = []
        if matched_char_ids:
            rel_rows = (
                db.query(Relationship)
                .filter(Relationship.project_id == project_id)
                .all()
            )
            for r in rel_rows:
                if r.character_a_id in matched_char_ids or r.character_b_id in matched_char_ids:
                    ca = char_by_id.get(r.character_a_id, str(r.character_a_id))
                    cb = char_by_id.get(r.character_b_id, str(r.character_b_id))
                    graph_notes.append(
                        f"{ca} --[{r.type}, ch.{r.chapter or '?'}]--> {cb}"
                        + (f": {r.description}" if r.description else "")
                    )

        for entity_name in matched_entities[:8]:
            graph_entities.append(entity_name)
            try:
                neighbors = graph.get_entity_neighborhood(db, project_id, entity_name, hops=2)
                for nbr in neighbors[:15]:
                    labels = ", ".join(nbr.get("labels") or ["Entity"])
                    graph_notes.append(
                        f"Neighbor of {entity_name}: {nbr.get('name')} ({labels}, ch.{nbr.get('chapter') or '?'})"
                    )
            except Exception as exc:  # noqa: BLE001
                logger.warning("Graph neighborhood lookup failed for %s: %s", entity_name, exc)

        if intent == "chronological":
            try:
                tl = timeline.get_project_timeline(db, project_id, order="chronological")
                for ev in tl.get("events", [])[:8]:
                    ev_chars = ", ".join(ev.get("characters") or [])
                    graph_notes.append(
                        f"Chronological event ch.{ev.get('chapter')} (order {ev.get('story_time_order')}): {ev.get('summary')}"
                        + (f" [{ev_chars}]" if ev_chars else "")
                    )
            except Exception as exc:  # noqa: BLE001
                logger.warning("Timeline Graph RAG lookup failed: %s", exc)

        if intent == "epistemic":
            k_rows = (
                db.query(KnowledgeUpdate)
                .filter(KnowledgeUpdate.project_id == project_id)
                .order_by(KnowledgeUpdate.chapter.asc())
                .limit(10)
                .all()
            )
            for ku in k_rows:
                graph_notes.append(f"Knowledge ch.{ku.chapter}: {ku.character} learned '{ku.fact}'")

        if graph_notes:
            contexts.append({
                "chapter": 0,
                "content": f"Graph & Timeline Context ({intent}): " + "; ".join(graph_notes[:30]),
            })

        # 3. Structured Claims facts
        claims = (
            db.query(Claim)
            .filter(Claim.project_id == project_id, Claim.status == "active")
            .limit(30)
            .all()
        )
        claim_facts = [
            f"{cl.subject} {cl.attribute}: {cl.value} (ch. {cl.chapter})"
            for cl in claims
        ]
        facts_summary = f"Characters: {', '.join(char_names)}. Claims: {'; '.join(claim_facts)}."
        contexts.append({"chapter": 0, "content": f"Known facts: {facts_summary}"})

        threads = db.query(PlotThread).filter(PlotThread.project_id == project_id).order_by(PlotThread.setup_chapter.asc()).all()
        if threads:
            threads_summary = "; ".join(
                f"[{t.status}] Ch.{t.setup_chapter} {t.title}: {t.description}"
                + (f" (payoff Ch.{t.payoff_chapter})" if t.payoff_chapter else "")
                for t in threads[:20]
            )
            contexts.append({"chapter": 0, "content": f"Plot Threads & Mysteries: {threads_summary}"})

        # 4. Self-correction retry: if context grading fails, rewrite search terms & retrieve additional chunks
        if not grade_contexts(question, contexts):
            for tok in rewrite_query_for_retrieval(question)[:3]:
                extra = (
                    db.query(Chunk)
                    .join(Manuscript, Chunk.manuscript_id == Manuscript.id)
                    .filter(Manuscript.project_id == project_id, Chunk.content.ilike(f"%{tok}%"))
                    .limit(3)
                    .all()
                )
                for ch_row in extra:
                    if str(ch_row.id) not in seen_chunk_ids:
                        seen_chunk_ids.add(str(ch_row.id))
                        contexts.insert(0, {"chapter": ch_row.chapter_number, "content": ch_row.content})

    finally:
        db.close()

    return {"contexts": contexts, "intent": intent, "graph_entities": graph_entities}


def answer_node(state: ChatState) -> dict:
    """Answer STRICTLY from the retrieved contexts, with citations.

      1. One Claude call with settings.chat_model (see
         services/extractor.py: get_anthropic_client for the client).
      2. System-style instruction (put it in the user message): answer ONLY
         from the provided passages; if they don't contain the answer, say
         you can't find it in the manuscript; end citations inline as
         [chapter N].
      3. Build citations: one {chapter, excerpt} per context you actually
         used (excerpt = first ~200 chars).
      4. Return {"answer": ..., "citations": [...]}.
    """
    from app.config import settings
    from app.services.extractor import get_anthropic_client

    question = state.get("question", "")
    contexts = state.get("contexts", [])

    context_str = "\n\n".join(
        f"[Chapter {ctx.get('chapter', 0)}]\n{ctx.get('content', '')}"
        for ctx in contexts
    )

    prompt = f"""You are NERRA's story intelligence assistant. Answer the author's question STRICTLY based on the provided manuscript passages and facts.

Instructions:
1. Answer ONLY using information explicitly stated in the passages.
2. If the passages do not contain the answer, say clearly that you cannot find the answer in the manuscript.
3. Cite the relevant chapter inline using [chapter N] format (e.g. [chapter 1]).
4. Never invent or assume facts outside the provided passages.

PASSAGES:
{context_str}

QUESTION:
{question}
"""

    client = get_anthropic_client()
    response = client.messages.create(
        model=settings.chat_model,
        max_tokens=settings.chat_max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    answer = response.content[0].text

    citations = []
    mentioned_chapters = set()
    for match in re.finditer(r"\[chapter\s+(\d+)\]", answer, re.IGNORECASE):
        mentioned_chapters.add(int(match.group(1)))

    for ctx in contexts:
        ch = ctx.get("chapter", 0)
        if ch > 0 and (ch in mentioned_chapters or not citations):
            citations.append({
                "chapter": ch,
                "excerpt": ctx.get("content", "")[:200]
            })

    if not citations and contexts:
        for ctx in contexts:
            ch = ctx.get("chapter", 0)
            if ch > 0:
                citations.append({
                    "chapter": ch,
                    "excerpt": ctx.get("content", "")[:200]
                })
                break

    return {"answer": answer, "citations": citations}


# ---------------------------------------------------------------------------
# Graph wiring — already done. Read it once to see how simple LangGraph is.
# ---------------------------------------------------------------------------

_compiled = None


def build_graph():
    if StateGraph is None:
        raise RuntimeError(
            "langgraph is not installed — run `make install` (see requirements.txt)"
        )
    graph = StateGraph(ChatState)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("answer", answer_node)
    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "answer")
    graph.add_edge("answer", END)
    return graph.compile()


def run_story_chat(project_id, question: str) -> dict:
    """Compile the graph once per process, then invoke it.

    Guarantees every answer carries at least one chapter citation.
    """
    global _compiled
    if _compiled is None:
        _compiled = build_graph()
    final_state = _compiled.invoke(
        {"project_id": str(project_id), "question": question}
    )
    answer = final_state.get("answer", "")
    citations = list(final_state.get("citations") or [])
    if not citations and final_state.get("contexts"):
        for ctx in final_state["contexts"]:
            ch = ctx.get("chapter", 0)
            if ch > 0:
                citations.append({
                    "chapter": ch,
                    "excerpt": ctx.get("content", "")[:200]
                })
                break
        if not citations:
            first_ctx = final_state["contexts"][0]
            citations.append({
                "chapter": first_ctx.get("chapter", 1),
                "excerpt": first_ctx.get("content", "")[:200]
            })

    return {
        "answer": answer,
        "citations": citations,
        "intent": final_state.get("intent", "general"),
        "graph_entities": list(final_state.get("graph_entities") or []),
    }
