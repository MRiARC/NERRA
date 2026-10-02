"""Task 06 tests — the LangGraph story chat (wiring, not the LLM).

Both nodes are replaced with fakes: we verify that the graph compiles, state
flows retrieve -> answer, and run_story_chat returns the right shape. The
real Claude call is your job; keep it out of tests.
"""

import importlib.util

import pytest

from app.agents import story_chat
from tests.utils import run_or_hint

pytestmark = pytest.mark.skipif(
    importlib.util.find_spec("langgraph") is None,
    reason="langgraph is not installed (run `make install`)",
)

TASK = "06-story-chat-agent"


@pytest.fixture(autouse=True)
def fresh_graph(monkeypatch):
    """Each test rebuilds the graph from the CURRENT node functions."""
    monkeypatch.setattr(story_chat, "_compiled", None)
    yield


def test_graph_flow_returns_answer_and_citations(monkeypatch):
    def fake_retrieve(state):
        assert state["question"] == "What color are Sarah's eyes?"
        assert state["project_id"]
        return {
            "contexts": [
                {"chapter": 1, "content": "Her green eyes scanned the platform."},
            ]
        }

    def fake_answer(state):
        assert state["contexts"], "answer_node received no retrieved contexts — check the graph edges"
        return {
            "answer": "Sarah's eyes are green [chapter 1].",
            "citations": [{"chapter": 1, "excerpt": "Her green eyes scanned the platform."[:200]}],
        }

    monkeypatch.setattr(story_chat, "retrieve_node", fake_retrieve)
    monkeypatch.setattr(story_chat, "answer_node", fake_answer)

    result = run_or_hint(
        TASK,
        lambda: story_chat.run_story_chat("11111111-1111-1111-1111-111111111111", "What color are Sarah's eyes?"),
    )
    assert result["answer"] == "Sarah's eyes are green [chapter 1]."
    assert result["citations"] == [{"chapter": 1, "excerpt": "Her green eyes scanned the platform."}]


def test_answer_node_cannot_skip_citations(monkeypatch):
    def fake_retrieve(state):
        return {"contexts": [{"chapter": 2, "content": "fact"}]}

    def bad_answer(state):
        return {"answer": "An answer with no citations", "citations": []}

    monkeypatch.setattr(story_chat, "retrieve_node", fake_retrieve)
    monkeypatch.setattr(story_chat, "answer_node", bad_answer)

    result = run_or_hint(TASK, lambda: story_chat.run_story_chat("11111111-1111-1111-1111-111111111111", "q?"))
    assert len(result["citations"]) >= 1, (
        f"[{TASK}] every answer must carry at least one chapter citation — NERRA is "
        "citation-first by design (even this fake answer node got flagged)"
    )
