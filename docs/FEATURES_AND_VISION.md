# NERRA — Product Vision, Feature Universe & Open Research Problems

> Authoritative product specification synthesized from the Obsidian `Story Intelligence Engine` vault:
> - `00 Vision/Project Vision.md`
> - `03 Features/Feature Index.md`
> - `03 Features/Character Intelligence.md`
> - `06 Open Problems/Open Problems.md`

---

## 1. Vision & Core Differentiator

> **One-Line Pitch:** *Drop your manuscript in. Get a living, intelligent map of every character, event, relationship, location, and contradiction in your story — automatically.*

Unlike manual organization tools (**Scrivener**, **Notion**, **Plottr**) or plain string search (**Ctrl+F**), NERRA treats the **manuscript as the input** and the **Story Knowledge Graph as the living memory**.

### Design Philosophy
1. **Incremental:** Full processing happens only once; afterward only changed chapters, scenes, or paragraphs reprocess.
2. **Graph-First:** Structured world memory (`Character`, `Event`, `Relationship`, `Location`, `Object`, `Knowledge`, `PlotThread`, `WorldRule`) powers reasoning and Q&A rather than raw text lookup alone.
3. **Quality-First AI + Deterministic Guardrails:** Use full LLM reasoning (`claude-sonnet-4.5`) wherever narrative nuance matters—never replace semantic understanding with brittle keyword/regex shortcuts—while deterministic algorithms strictly enforce quote provenance and graph invariants.
4. **Human-Correctable:** Authors can always resolve ambiguity or override AI mistakes, and corrections improve future passes.
5. **Privacy-Aware:** Unpublished fiction is sensitive IP — strict data isolation, no training on private manuscripts, encryption, and optional local processing are first-class constraints.

---

## 2. Master Feature Index

| # | Feature | Capabilities |
|---|---|---|
| **1** | **Manuscript Import** | `.txt`, `.docx`, `.pdf`, pasted text; chapter detection, scene splitting, paragraph indexing, initial graph build |
| **2** | **Live Writing Mode** | In-app writing workspace triggering incremental paragraph diffing & warnings while pausing/typing |
| **3** | **Character Intelligence** | Entity + alias resolution, profile cards, physical traits, first/last appearance, alive/dead status, character timeline, merge/split suggestions |
| **4** | **Relationship Intelligence** | Pairwise types, sentiment shifts (`positive`/`neutral`/`hostile`), chapter/story-time intervals, evolution history |
| **5** | **Event Mapping** | Structured scenes (`who`, `what`, `where`, `when`, `why`), participant edges |
| **6** | **Timeline Engine** | Dual timelines (**Narrative Order** vs. **Story-Chronological Order**), `BEFORE`/`AFTER` edges, flashback/flashforward detection, unexplained time-gap checks |
| **7** | **Knowledge-State Tracker** | Epistemic matrix (`Character × Fact`: knows, when learned, how learned, source character) & early-knowledge violation alerts |
| **8** | **Contradiction Engine** | Factual, location/spatiotemporal, timeline, epistemic knowledge, object custody, and world-rule contradictions + intent reasoning (*error vs. disguise/lie/unreliable narrator*) |
| **9** | **Plot Thread Tracker** | Open vs. resolved vs. abandoned narrative promises, mystery setups & payoffs, dangling threads/objects |
| **10** | **Object Tracking** | Chain-of-custody transfers (`acquired`/`lost`/`moved`/`locked`/`destroyed`), current holder per chapter, paradox detection |
| **11** | **Location Intelligence** | Location registry, scene associations, character movement tracking, location contradictions |
| **12** | **Story Chat / Query Engine** | Graph RAG Q&A combining Neo4j multi-hop traversal, `pgvector` chunk recall, timeline/knowledge lookup, context grading, and verbatim chapter citations |
| **13** | **Series Support** | Multi-book canon graphs, cross-book character/world evolution, and cross-book continuity checks |

---

## 3. Canonical Character & Story Graph Schema

From `Character Intelligence.md` & `System Overview.md`:
- **`Character` properties:** `id`, `canonicalName`, `aliases`, `gender`, `role`, `status`, `firstAppearance`, `lastAppearance`, `descriptionSummary`, `confidence`, `createdAt`, `updatedAt`.
- **Core Relationships:**
  - `Character --APPEARS_IN--> Scene`
  - `Character --HAS_ALIAS--> Alias`
  - `Character --KNOWS_CHARACTER / RELATED_TO--> Character`
  - `Character --PARTICIPATED_IN--> Event`
  - `Character --LOCATED_AT / LOCATED_IN--> Location`
  - `Character --LEARNED / KNOWS--> Fact` & `Character --TOLD--> Character`
  - `Character --OWNS / POSSESSES--> Object`
  - `Event --BEFORE / AFTER--> Event`
  - `Fact/Claim --CONTRADICTS--> Fact/Claim`

---

## 4. Open Research Problems Tracked in the Design

These problems are explicitly tracked in `Open Problems.md` and mapped to modules in [`docs/architecture.drawio.xml`](architecture.drawio.xml):

1. **Pronoun Resolution** *(→ Validation Layer)*: Disambiguating local/cross-paragraph pronouns (*"Sarah handed the diary to Emma. She smiled."*) using context + graph memory + human confirmation.
2. **Flashback Detection** *(→ Reasoning Layer)*: Separating narrative presentation order from actual `BEFORE`/`AFTER` story chronology.
3. **Knowledge Inference**: Distinguishing true knowledge acquisition from lies, false assumptions, indirect implications, and dramatic irony.
4. **Contradiction vs. Intentional Mystery** *(→ Validation Layer / Intent Reasoner)*: Distinguishing real author mistakes from disguises, unreliable narrators, or magical transformations.
5. **Plot Thread Resolution** *(→ Reasoning Layer)*: Distinguishing a forgotten Chekhov's gun from an intentional red herring or slow-burn mystery.
6. **World Rule Extraction** *(→ AI Processing)*: Discovering implicit speculative/sci-fi/magic rules automatically and verifying later chapters against them.
7. **Large Rewrite Reprocessing** *(→ Data Collection)*: Determining downstream graph invalidation and diff resolution when whole chapters are rewritten.
