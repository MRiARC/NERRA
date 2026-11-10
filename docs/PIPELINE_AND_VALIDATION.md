# NERRA — Processing Pipeline, Incremental Rules & Validation Spec

> Authoritative behavioral specification compiled from:
> - Obsidian Vault: `02 Core Pipeline/Universal Processing Blueprint.md`
> - Obsidian Vault: `02 Core Pipeline/Incremental Processing.md`
> - Obsidian Vault: `05 Validation System/Validation Layer.md`

---

## 1. The Universal Processing Pattern

Every major NERRA capability follows the same 9-stage backbone so the codebase stays modular rather than becoming 20 disconnected LLM prompts:

1. **Trigger** — Starts the run (`Import Manuscript`, `New Chapter Added`, `Paragraph Edited`, `Live Writing Pause`, `User Asks Story Question`, `User Corrects AI Mistake`, plus user actions like character merge or marking an issue intentional).
2. **Data Collection** — Identifies changed spans via the **Change Detector** and runs the lightweight deterministic **Cheap Scanner** (capitalized names, dialogue speakers, dates, temporal markers, locations, repeated nouns/objects) to decide which memory to fetch.
3. **Context Builder** — Fetches only relevant memory (not *"all facts about Sarah from 100 chapters"*): relevant characters & aliases, recent events, related objects, timeline anchors, open plot threads, active world rules, and prior user correction rules.
4. **AI Processing** — LLM receives `{target_text, compact_memory_packet, schema, instructions}` and proposes structured candidate updates. **The LLM never mutates the graph directly.**
5. **Validation Layer** — Combines algorithmic checks + targeted AI checks + confidence routing to decide `Accept`, `Human Review`, or `Reject / Hold`.
6. **Graph Update** — Persists only validated updates (`create/update/merge node`, `create/update edge`, `attach source_chapter/scene/paragraph + confidence`), keeping provenance intact.
7. **Reasoning Layer** — Runs cross-story reasoning checks over the updated graph (contradictions, knowledge violations, timeline/spatiotemporal conflicts, object custody paradoxes, world rules, plot thread state).
8. **User Output** — Updates UI views (Character Cards, Relationship Graph, Dual Timeline, Knowledge Matrix, Issues/Review Queue, Plot Threads, Story Chat).
9. **Feedback Loop** — Captures author decisions (*merge/split characters*, *mark intentional*, *edit/reject fact*, *set timeline order*) to update graph canon, validation memory, confidence scoring, and future Context Builder packets.

---

## 2. Incremental Processing Rules

Full manuscript processing runs **only on initial import**. All subsequent edits follow span-targeted processing:

| Case | Input Event | Required Pipeline Behavior |
|---|---|---|
| **Case 1: First Import** | Full manuscript uploaded | Split books → chapters → scenes → paragraphs → extract initial entities/facts → generate embeddings → build story memory |
| **Case 2: New Chapter Added** | Chapter appended | Detect chapter → Cheap Scan → fetch relevant character/world memory → extract → validate → update graph → embed **new chapter only** |
| **Case 3: Paragraph Edited** | Paragraph updated | Diff changed paragraph → locate affected scene/chapter → version or supersede old facts linked to `source_paragraph_id` → extract & validate new facts → re-embed affected chunk only |
| **Case 4: Large Chapter Rewrite** | Whole chapter rewritten | Mark previously extracted chapter facts stale → reprocess chapter cleanly → diff old graph facts vs. new graph facts → ask author review on major structural contradictions |
| **Case 5: Character Rename** | e.g., `"Sarah"` → `"Mira"` | Update canonical name, keep old name in aliases, update labels, **preserve graph node UUIDs** so entity history is never lost |
| **Case 6: User Correction** | e.g., *"Miss Mitchell is Sarah's mother"* | Split or merge entity nodes safely, update aliases & validation memory, re-evaluate affected scenes, and persist a reusable correction rule |

**Versioning Principle:** *Never overwrite story memory blindly.* Every extracted fact should carry provenance (`source_chapter`, `source_scene`, `source_paragraph`, `extraction_version`, `confidence`, `validation_status`): `version → compare → validate → update`.

---

## 3. Validation Layer Specification

> *"Algorithms guard structure. AI interprets meaning. User confirms ambiguity."*

### Confidence Routing Bands

| Confidence Score | Route | Action |
|---|---|---|
| **`0.90 – 1.00`** | **Auto Accept** | Write directly to canon Story Graph (e.g., exact alias match `Miss Mitchell -> Sarah Mitchell`) |
| **`0.65 – 0.89`** | **AI Validator / Suggestion** | Run AI validation pass or attach suggested action to author queue |
| **`0.40 – 0.64`** | **Human Review** | Hold out of canon truth and prompt author (e.g., *"Miss Mitchell entered. Her daughter Sarah followed." — Is Miss Mitchell the same person as Sarah Mitchell?*) |
| **`0.00 – 0.39`** | **Reject / Hold** | Quarantine candidate extraction (e.g., `"Monday"` extracted as a Character) |

### Validation Dimensions
1. **Entity Validation:** New entity vs. alias vs. merge vs. split; dangerous cases like mother/daughter sharing a surname, siblings, or title confusion.
2. **Fact Validation:** Duplicate check, contradiction against existing claims, verbatim textual support check.
3. **Relationship Validation:** Explicit vs. inferred, sentiment transition, contradiction.
4. **Timeline Validation:** Fit within story-time chronology, `BEFORE`/`AFTER` edge conflicts, flashback classification.
5. **Knowledge Validation:** Verify whether a character actually learned a fact (witnessed/told/deduced) before referencing it in story-time order.
6. **Location Validation:** Spatiotemporal plausibility — confirm a character is not acting in two distant places at the same story-time coordinate.
