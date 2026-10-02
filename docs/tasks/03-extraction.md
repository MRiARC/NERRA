# Task 03 — Claude Extraction (the core AI step)

| | |
|---|---|
| **Difficulty** | Medium |
| **Depends on** | Task 02 |
| **File you implement** | `app/services/extractor.py` — three functions: `extract_chapter`, `validate_payload`, `persist_extraction` |
| **Files to read first** | `app/services/extractor.py` top-to-bottom (contracts + prompt are given), `app/models.py` (story tables), `tests/tasks/test_task03_extraction.py` |
| **Tests** | `make test-task TASK=tests/tasks/test_task03_extraction.py` (no API key needed) |
| **Needs for manual runs** | `ANTHROPIC_API_KEY` in `backend/.env` |

## The idea

One chapter of prose goes in; a structured description of the story world
comes out: characters, relationships, locations, objects, events, factual
claims, and knowledge updates. **One Claude call per chapter** using the
fast/cheap model — this is the MVP's cost design (mvp_blueprint.md §5.2).

The SDK pattern you'll use is called **structured output via tool-use**: we
describe a JSON schema to Claude and *force* it to "call a tool" named
`save_extraction` whose arguments ARE the JSON. The Pydantic models
(`ExtractionPayload` and friends) are already defined in the file — read
them first; they are the contract.

**LLM output is untrusted.** Claude will sometimes invent plausible things.
Two defenses are built into this task:

1. `ExtractionPayload.model_validate(raw)` — schema validation (wrong shape
   → exception → the pipeline's guard marks the manuscript failed)
2. `validate_payload` — your hallucination guard: every claim must quote the
   chapter, and the quote must actually appear in the text

## Concepts you'll practice

- The Anthropic SDK: `client.messages.create(...)` with `tools` +
  `tool_choice`
- Validating LLM output with Pydantic (`model_json_schema()`,
  `model_validate()`)
- Writing to multiple related tables with deduplication (upsert-by-name)
- Why evidence/provenance turns "AI said so" into a checkable fact

## Requirements

`extract_chapter(chapter_number, chapter_text, roster)`:
- [ ] Builds the prompt from `EXTRACTION_PROMPT_TEMPLATE` (chapter number,
      roster, and chapter text all injected)
- [ ] One `client.messages.create` call with `settings.extraction_model`,
      `tools=[save_extraction with ExtractionPayload schema]`,
      `tool_choice` forcing the tool
- [ ] Parses the `tool_use` block and returns `ExtractionPayload.model_validate(raw)`

`validate_payload(payload, chapter_text)`:
- [ ] Keeps only claims whose `evidence_quote` passes `quote_in_text()`
- [ ] Drops claims with blank subject/value; drops empty-named
      characters/locations/objects
- [ ] Returns a NEW payload (does not mutate the input)

`persist_extraction(db, project_id, chapter_number, payload)`:
- [ ] Characters deduped by case-insensitive name **or alias**; new → insert;
      existing → widen `first_chapter`/`last_chapter`, fill empty
      description, refresh status
- [ ] Relationships resolved to character ids (unknown name → skip the row);
      duplicate pair+type skipped
- [ ] Locations/objects deduped by name; objects accumulate `mention_chapters`
- [ ] Events, claims, knowledge_updates inserted with the chapter number
- [ ] One `db.commit()` at the end

## See it working

The unit tests pass **without an API key** (they use a fake client). For the
real thing:

1. Add `ANTHROPIC_API_KEY` to `backend/.env`
2. Import `samples/sample_story.txt` into a project (import endpoint)
3. Once Task 04 is also done, the status endpoint reaches `ready`, and:
   `GET /projects/{id}/characters` shows **Sarah**, **Park**, **John** (or
   the deputy) with Sarah's alias none/first_chapter=1
4. Until Task 04 exists, verify your function directly in a python shell:

```bash
cd backend && ../.venv/bin/python
>>> from app.services.extractor import extract_chapter
>>> payload = extract_chapter(1, open("../samples/sample_story.txt").read()[:1200], "None yet")
>>> payload.characters, len(payload.claims)
```

## Questions

1. Why is `tool_choice={"type": "tool", ...}` essential here? What happens
   without it when the model decides to chat instead?
2. Your hallucination guard rejects a claim whose quote isn't verbatim.
   Name one legitimate edit Claude might make to a sentence that would get
   a TRUE claim rejected — and why the tradeoff is still worth it.
3. Why dedupe characters by alias too? Give an example from `sample_story.txt`.
4. What would go wrong if `persist_extraction` committed after every model
   instead of once at the end?

## Stretch (optional)

- Record a `continuity_note` issue when a character's description changes
  between chapters (needs claims — peek at Task 05's data).
- Track token usage per call and log it (the SDK response has
  `.usage.input_tokens` / `.output_tokens`) — first step toward the cost
  story in blueprint §6.
