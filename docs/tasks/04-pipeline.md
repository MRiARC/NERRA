# Task 04 — The Import Pipeline (orchestration)

| | |
|---|---|
| **Difficulty** | Medium |
| **Depends on** | Task 03 (and Task 02) |
| **File you implement** | `app/services/pipeline.py` — two functions: `run_import_pipeline`, `reanalyze_chapter` |
| **Files to read first** | `app/services/pipeline.py` (helpers are built and documented), `app/routers/manuscripts.py` (how you get called), `tests/tasks/test_task04_pipeline.py` |
| **Tests** | `make test-task TASK=tests/tasks/test_task04_pipeline.py` — no API key needed (fakes provided) |

## The idea

This is where the system clicks together: text → chapters → extraction →
persistence → embeddings → consistency pass → `status: ready`. Your two
functions mostly *sequence* calls to code that already exists — but the
sequencing has real engineering in it: **content-hash caching** (never pay
Claude twice for the same chapter), **per-chapter progress commits** (so the
status endpoint shows live progress), and **guaranteed failure recording**
(any crash marks the manuscript `failed` with the reason, never a silent
death).

> **Implementation note (the tests rely on this):** import whole modules and
> call through them — `from app.services import extractor, splitter,
> consistency`, then `extractor.extract_chapter(...)`. Do NOT
> `from app.services.extractor import extract_chapter` — that would freeze
> the function reference and break both the tests and monkeypatching.

## Concepts you'll practice

- Orchestrating a multi-step process with per-step checkpointing
- Content-hash caching — the MVP's answer to "LLM cost" (blueprint §6)
- The guard pattern: `run_import_pipeline_guarded` (built) wraps your
  function; anything you raise becomes a visible `failed` status
- Why progress is committed *per chapter*, not once at the end

## Requirements

`run_import_pipeline(manuscript_id, db)`:
- [ ] Status → `processing`, `chapters_total` set, commit — **before** the
      first LLM call (the UI should see progress immediately)
- [ ] Each chapter: hash → cache lookup → (skip LLM on hit, but still
      persist the cached payload) → extract → validate → persist →
      save cache → embed chunk → `chapters_done += 1` + commit
- [ ] After the last chapter: `consistency.run_consistency_pass`, then
      status → `ready`
- [ ] The per-chapter loop works for ONE chapter and for fifty

`reanalyze_chapter(db, manuscript, chapter_number)`:
- [ ] Deletes that chapter's cached analysis, re-runs extraction → persist →
      embed for just that chapter, re-runs the consistency pass
- [ ] (It backs `POST /manuscripts/{id}/reanalyze` — wire that route's body
      to your function while you're here; it currently returns 501)

## See it working

The end-to-end moment of the whole project (needs Tasks 03 + 05 done and an
API key — before that, the tests carry the proof):

1. `POST /projects/{id}/manuscripts/import` with `samples/sample_story.txt`
2. Immediately poll: `GET /manuscripts/{id}/status?project_id=...` —
   watch `chapters_done` climb `0 → 1 → 2 → 3 → 4`
3. Final state: `"status": "ready"`, `"chapters_total": 4`
4. Import the same file again into the same project — it finishes with
   **zero new Claude calls** (the logs show cache hits; the extraction
   cache rows in `chapter_analyses` prove it)

## Questions

1. Why check the content hash *before* calling the extractor, and what
   exactly would a user notice if the cache were removed?
2. Why must a cached chapter still be *persisted* on a re-import? (Think:
   the user imports a revised manuscript; chapters 1,2 unchanged, chapter 3
   rewritten. What does project data look like if cached chapters skip
   persisting?)
3. The guard converts any exception into `status=failed`. Why is that
   better for this product than retrying silently forever?
4. `chapters_done += 1; db.commit()` happens inside the loop. What does the
   status endpoint show if the process dies at chapter 3 of 4 — and why is
   that the *right* answer?

## Stretch (optional)

- Log timing per chapter (`time.perf_counter()`) and put totals in
  `error_note`-style metadata — your first performance instrumentation.
- Add `POST /manuscripts/{id}/cancel`-style behavior: if status is set to
  `failed` mid-loop by an external actor, stop early.
