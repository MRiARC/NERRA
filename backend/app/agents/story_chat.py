"""Story chat agent — Task 06 (the two node functions are yours).

The ONLY place in NERRA that uses LangGraph, and deliberately so: this is a
genuine agent workflow (retrieve -> answer, with room to grow a grading/
retrieval loop), while extraction is a straight pipeline that doesn't need
an agent framework (see techstack.md, "LangGraph — use it, not for
everything").

The graph structure below is ALREADY WIRED:

    START -> retrieve -> answer -> END

You implement what the two nodes DO. The graph itself — state, nodes, edges
— compiles and runs as soon as your node bodies are filled in.

How state flows: each node receives the state dict and returns a dict of the
keys it wants to ADD/UPDATE. LangGraph merges them into the next state.
"""

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
    contexts: list[dict]  # [{chapter, content}] retrieved passages + facts
    answer: str
    citations: list[dict]  # [{chapter, excerpt}]


# ---------------------------------------------------------------------------
# YOUR TWO NODES (Task 06)
# ---------------------------------------------------------------------------


def retrieve_node(state: ChatState) -> dict:
    """Gather evidence for answering the question.

    Build `contexts`: a list of {"chapter": int, "content": str} dicts, the
    most relevant passages for state["question"]:

      1. Semantic search: embed the question with services.embedder, then
         query Chunk rows joined to Manuscript on project_id, ordered by
         .embedding.cosine_distance(vector) — take the top 4.
      2. Add facts: the project's Character names + active Claims (top 10)
         as one extra context dict {"chapter": 0, "content": "Known facts: ..."}.
      3. Return {"contexts": contexts}.
    """
    from app.database import SessionLocal
    from app.models import Character, Claim, Chunk, Manuscript
    from app.services import embedder

    project_id = state["project_id"]
    question = state["question"]

    contexts = []
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
                .limit(4)
                .all()
            )
            for chunk in chunks:
                contexts.append({
                    "chapter": chunk.chapter_number,
                    "content": chunk.content
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
                contexts.append({
                    "chapter": chunk.chapter_number,
                    "content": chunk.content
                })

        # 2. Add facts: Character names + active Claims (top 10)
        characters = db.query(Character).filter(Character.project_id == project_id).all()
        char_names = [c.name for c in characters]
        claims = (
            db.query(Claim)
            .filter(Claim.project_id == project_id, Claim.status == "active")
            .limit(10)
            .all()
        )
        claim_facts = [
            f"{cl.subject} {cl.attribute}: {cl.value} (ch. {cl.chapter})"
            for cl in claims
        ]
        facts_summary = f"Characters: {', '.join(char_names)}. Claims: {'; '.join(claim_facts)}."
        contexts.append({"chapter": 0, "content": f"Known facts: {facts_summary}"})

    finally:
        db.close()

    return {"contexts": contexts}


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
        max_tokens=1024,
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

    return {"answer": answer, "citations": citations}
