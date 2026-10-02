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
         (db.query(Chunk, Manuscript).join(Manuscript, ...).filter(
              Manuscript.project_id == project_id)
          .order_by(Chunk.embedding.cosine_distance(vec)).limit(4))
      2. Add facts: the project's Character names + active Claims (top 10)
         as one extra context dict {"chapter": 0, "content": "Known facts: ..."}.
      3. Return {"contexts": contexts}.
    """
    # ========== YOUR CODE HERE (Task 06) ==========
    raise NotImplementedError(
        "Task 06 — implement retrieve_node. See docs/tasks/06-story-chat-agent.md"
    )


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
    # ========== YOUR CODE HERE (Task 06) ==========
    raise NotImplementedError(
        "Task 06 — implement answer_node. See docs/tasks/06-story-chat-agent.md"
    )


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

    Raises NotImplementedError until the two nodes are implemented (the chat
    router translates that into a helpful 501).
    """
    global _compiled
    if _compiled is None:
        _compiled = build_graph()
    final_state = _compiled.invoke(
        {"project_id": str(project_id), "question": question}
    )
    return {"answer": final_state["answer"], "citations": final_state["citations"]}
