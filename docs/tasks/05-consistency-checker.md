# Task 05 — The Consistency Checker (the killer feature)

| | |
|---|---|
| **Difficulty** | Medium |
| **Depends on** | Task 03 (claims/knowledge/objects exist) — **parallel with Task 04, different file** |
| **File you implement** | `app/services/consistency.py` — five functions |
| **Files to read first** | `app/services/consistency.py` (rules + helpers documented), `app/models.py` (`Claim`, `KnowledgeUpdate`, `StoryObject`, `Issue`), `tests/tasks/test_task05_consistency.py` |
| **Tests** | `make test-task TASK=tests/tasks/test_task05_consistency.py` — pure logic, no LLM, no key |

## The idea

NERRA's reason to exist: catch the author's own mistakes. "Green eyes in
chapter 1, blue eyes in chapter 3." "Park mentions the murder in chapter 2 —
but only learns of it in chapter 3." "This brass compass appears once and is
never seen again."

The beautiful engineering part: **this is pure Python**. No LLM here —
Task 03 already turned prose into structured `Claim` / `KnowledgeUpdate` /
`StoryObject` rows. Cross-referencing structured facts is deterministic,
free, instant, and perfectly testable. (The full-scale architecture would
add an LLM "intent judge" later — that's blueprint §6's "false positives"
row; our answer is simpler: the human decides via accept/reject/intentional.)

## Concepts you'll practice

- Set/group reasoning: group claims by `(subject, attribute)`, compare values
- Fuzzy matching with token overlap (helpers `_same_entity`, `_facts_match`
  are given — read them, don't rewrite)
- Deduplication on write (don't re-create open issues on every pipeline run)
- Dataclasses as internal DTOs (`IssueDraft`) before persisting ORM rows

## The rules

| Detector | Fires when | Produces |
|---|---|---|
| `detect_contradictions` | same normalized subject+attribute with different values | 🔴 `contradiction`, both citations as evidence, both claim ids |
| `detect_knowledge_violations` | claim `knows_about X` at ch.M + KnowledgeUpdate(character, ~X) at ch.N, N > M | 🔵 `knowledge_violation` |
| `detect_dangling_objects` | object with exactly 1 distinct mention chapter (zero is a data anomaly — skip) | 🟢 `unresolved_thread` |
| `detect_continuity_notes` | the same normalized value for a (subject, attribute) in ≥ 2 **distinct** chapters | 🔵 `continuity_note` (informational — never a defect) |
| `run_consistency_pass` | orchestrates all four, dedupes, persists | count of NEW `Issue` rows |

## Requirements

- [ ] `detect_contradictions`: exactly one draft per conflicting value pair
      (regardless of how many other claims exist); identical values never
      fire; evidence carries `{chapter, quote}` from both sides
- [ ] `detect_knowledge_violations`: only `knows_about` claims participate;
      entity match is case-insensitive via `_same_entity`; fact match via
      `_facts_match`; strictly `learned_chapter > reference_chapter`
- [ ] `detect_dangling_objects`: one draft per object with exactly 1 distinct
      mention chapter; description names the object and chapter
- [ ] `detect_continuity_notes`: one draft per identical value repeated across
      ≥ 2 distinct chapters; same-chapter repeats and single-chapter facts
      never fire; differing values belong to `detect_contradictions`, not here
- [ ] `run_consistency_pass`: loads active claims + knowledge + objects for
      the project → runs all detectors → skips drafts matching an existing
      `open` issue (same type AND description) → inserts new `Issue` rows →
      returns the count of newly created ones

## See it working

After Tasks 03 + 04 have run on `samples/sample_story.txt` (which has three
planted mistakes), in Swagger:

1. `GET /projects/{id}/issues` → expect three issues:
   - 🔴 contradiction — Sarah eye_color green (ch.1) vs blue (ch.3)
   - 🔵 knowledge_violation — Park references the curator's murder (ch.2)
     but learns of it only in ch.3
   - 🟢 unresolved_thread — the brass compass (only in ch.1)
2. `PATCH /projects/{id}/issues/{id}` with `{"status": "intentional"}` →
   the author-overrides-the-machine moment (a core NERRA principle)
3. Re-import the manuscript (Task 04's cache) → `GET /issues` → no
   duplicates, and the intentional one stays suppressed (that's your dedupe)

No `continuity_note` appears with the sample — it never repeats a claim
verbatim. To see one: edit `samples/sample_story.txt` so chapter 3 also
says Sarah has **green** eyes (identical fact, new chapter), re-import, and
your fourth detector should produce the note with both chapters as evidence.

## Questions

1. Why is the contradiction rule based on normalized `(subject, attribute)`
   pairs? What real contradiction from a novel would this rule MISS?
2. `_facts_match` fires at 60% token overlap. Give one false positive it
   would produce and one false negative — which is worse for the author?
3. Why dedupe by `(type, description)` instead of using a unique database
   constraint? What would the constraint miss that the query catches?
4. If Claude extracts "Sarah has emerald eyes" instead of "green", your
   contradiction never fires. What phase-2 feature (blueprint §6) addresses
   exactly this?

## Stretch (optional)

- Add a `detect_ghost_characters` rule: characters with exactly one event
  appearance across the whole manuscript (blueprint/features.md §18.3).
- Rank `list_issues` by severity (red → blue) in the story router and
  justify where you put the sort (SQL vs Python).
