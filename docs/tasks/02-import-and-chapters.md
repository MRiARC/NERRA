# Task 02 — Manuscript Import & Chapter Splitting

| | |
|---|---|
| **Difficulty** | Easy |
| **Depends on** | Task 01 |
| **File you implement** | `app/services/splitter.py` — one function: `split_chapters` |
| **Files to read first** | `app/services/splitter.py` (the contract), `app/routers/manuscripts.py` (already built — see how your function gets used), `tests/tasks/test_task02_splitter.py` |
| **Tests** | `make test-task TASK=tests/tasks/test_task02_splitter.py` |

## The idea

A manuscript arrives as one big string (from the import endpoint, which is
already built — try it: it saves the manuscript and runs the pipeline stub).
Everything downstream — extraction, embeddings, citations, the timeline —
works on **chapters**, so we first need to cut the text into chapters.

This is a pure-Python function: no database, no LLM. Small, satisfying, and
the tests define success precisely.

## Concepts you'll practice

- Working with text: `str.splitlines()`, offsets via `text.find()` /
  index arithmetic
- Compiling and using regular expressions (`re.match`, `re.IGNORECASE`)
- Designing a deterministic function: same input → same output, fully
  unit-testable (this is why it's tested without any database)

## Requirements

- [ ] A line matching any pattern in `HEADING_PATTERNS` (case-insensitive)
      starts a new chapter
- [ ] Chapter `title` = the heading line (stripped); `content` = everything
      up to the next heading (headings are NOT inside content)
- [ ] Chapters numbered 1..N in manuscript order
- [ ] Text **before the first heading is prepended to chapter 1** — no text
      is ever dropped
- [ ] No headings at all → ONE chapter (`number=1, title="Full text"`) with
      the whole text
- [ ] Empty/blank text → still returns one chapter; you never return `[]`
- [ ] `start`/`end` offsets slice the original text back to `content`:
      `text[ch.start:ch.end].strip() == ch.content.strip()`
- [ ] Roman numerals (`CHAPTER XII`) and `12. Title` styles also split

## Where to code

`app/services/splitter.py::split_chapters` — the docstring lists the exact
algorithm. Suggested shape (you may deviate if the tests pass):

```
find all heading lines (pattern match per line, remember line offsets)
no headings?  -> return [single chapter with everything]
otherwise:
    chapter 1 starts at the beginning of the text (preamble included)
    for each heading: close the previous chapter, start a new one
    close the last chapter at end-of-text
```

## See it working

You can watch your splitter run through the API without Tasks 03–05:

1. `POST /projects/{id}/manuscripts/import` with `samples/sample_story.txt`
   as the uploaded file → 201 with a `manuscript_id`
2. `GET /manuscripts/{id}/status?project_id=...` — the pipeline (Task 04)
   is still a stub, so expect `status: "failed"` with a note pointing at
   Task 04. That's the playground contract working — once Tasks 03/04 are
   done, this same import runs the real pipeline.

The real proof for THIS task is the test file — it checks the exact
chapter boundaries, offsets, and fallbacks:

```bash
make test-task TASK=tests/tasks/test_task02_splitter.py
```

## Questions

1. Why must the splitter never return an empty list — what would break
   downstream in the pipeline?
2. Why are `start`/`end` offsets part of the contract? (Hint: the Task 03
   evidence check compares quotes against *chapter content*.)
3. `HEADING_PATTERNS` are module-level constants, not hardcoded inside the
   function. What does that make easy for the next person?

## Stretch (optional)

- Handle `Chapter Twelve` (word numbers) — is that worth a regex? Write
  down your reasoning either way.
- Support scene breaks (`***`) as metadata on `Chapter` without changing
  the chapter count.
