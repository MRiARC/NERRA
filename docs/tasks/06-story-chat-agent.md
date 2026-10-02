# Task 06 — The Story Chat Agent (LangGraph)

| | |
|---|---|
| **Difficulty** | Hard |
| **Depends on** | Task 03 (characters/claims exist; chunks+embeddings are built by the pipeline) |
| **File you implement** | `app/agents/story_chat.py` — two node functions: `retrieve_node`, `answer_node` |
| **Files to read first** | `app/agents/story_chat.py` (graph is already wired — read it all), `docs/ARCHITECTURE_GUIDE.md` §3, `app/services/embedder.py` |
| **Tests** | `make test-task TASK=tests/tasks/test_task06_chat.py` — fakes provided, no LLM needed |
| **Needs for manual runs** | `ANTHROPIC_API_KEY`, and a project with an imported manuscript |

## The idea

The author asks their own story questions: *"What color are Sarah's eyes?"*,
*"Where was the compass at the end of chapter 3?"*, *"Does Park know about
the murder yet?"* The answer must be **grounded** — built only from
retrieved passages/facts, with chapter citations — never from Claude's
imagination. This pattern is **RAG (Retrieval-Augmented Generation)**, and
it's the single most-asked-about architecture pattern in AI right now. You
will implement it properly.

Why LangGraph *here* and nowhere else: chat is a genuine agent workflow —
retrieve, then answer, with a natural place to grow a "was the retrieved
context good enough?" loop later. Extraction (Task 03) is a straight line
and doesn't need an agent framework. Making that distinction deliberately
is exactly the kind of judgment that scores well.

## Concepts you'll practice

- LangGraph: `StateGraph`, typed state (`ChatState`), nodes, edges, compile,
  invoke — the graph is already wired; your nodes make it real
- **Semantic search**: embed the question (local model) → pgvector
  `cosine_distance` → top-k most similar chapters
- Prompt grounding: strict instructions so the model answers ONLY from
  supplied context, and says "not in the manuscript" otherwise
- Citations as a product principle: every answer carries `{chapter, excerpt}`

## The graph (already wired for you)

```
START → retrieve_node → answer_node → END
           │                  │
   question → contexts     contexts → answer + citations
```

Nodes receive the state dict and return a dict of keys to merge.
`run_story_chat` compiles the graph once per process and invokes it.

## Requirements

`retrieve_node(state)`:
- [ ] Embeds `state["question"]` via `services.embedder.embed_one`
- [ ] Queries `Chunk` rows joined to `Manuscript` filtered on `project_id`,
      ordered by `Chunk.embedding.cosine_distance(vec)`, limit 4
- [ ] Adds one facts context: project character names + up to 10 active
      claims, as `{"chapter": 0, "content": "Known facts: ..."}`
- [ ] Returns `{"contexts": [{"chapter": int, "content": str}, ...]}`

`answer_node(state)`:
- [ ] One Claude call with `settings.chat_model`; the prompt includes ALL
      contexts (labeled with chapter numbers) and the question
- [ ] Grounding instructions: answer only from the passages; if they don't
      contain the answer, say you couldn't find it in the manuscript; cite
      chapters inline as `[chapter N]`
- [ ] Returns `{"answer": str, "citations": [{"chapter", "excerpt"}, ...]}`
      with at least one citation for a grounded answer

## See it working

After a project has `samples/sample_story.txt` analyzed (Tasks 03+04):

```bash
curl -s -X POST "localhost:8000/projects/$PROJECT_ID/chat" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"question": "What color are Sarah'\''s eyes, and did it change?"}'
```

Expect an answer that cites both chapters:

```json
{
  "answer": "In chapter 1 Sarah's eyes are green [chapter 1], but chapter 3 describes them as blue [chapter 3] — that's flagged as a contradiction in the issues list.",
  "citations": [{"chapter": 1, "excerpt": "Her green eyes..."}, {"chapter": 3, "excerpt": "Sarah's blue eyes..."}]
}
```

Also try a question the manuscript can't answer ("What's the capital of
France?") — the correct behavior is a refusal to answer from outside
knowledge, not a confident hallucination. Show this to your lead; it's the
grounding proof.

## Questions

1. Why retrieve by embedding similarity instead of keyword search? Give a
   question where keywords fail but embeddings work.
2. Why send chapter 1's text rather than the whole manuscript to answer a
   chapter-1 question? What does this cost-wise at 100 chapters?
3. Your agent happily answered from outside knowledge before you added the
   grounding instructions. Name one way an author could be *harmed* by that
   in this product specifically.
4. What would a `grade_contexts` node between retrieve and answer do, and
   what edge would you add for the "not good enough" case? (Design it — you
   don't have to build it. This is blueprint's stated stretch path.)

## Stretch (optional)

- Add the `grade_contexts` node for real: Claude judges whether the contexts
  can answer the question; if not, re-retrieve once with the question
  reworded. You'll need one conditional edge — LangGraph's
  `add_conditional_edges` — the graph was structured for exactly this.
- Persist conversations: a `chat_messages` table + `conversation_id`.
