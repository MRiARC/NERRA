# NERRA — Development Roadmap & Current Status

> Progress measured strictly against [`docs/ARCHITECTURE.md`](ARCHITECTURE.md), [`docs/PIPELINE_AND_VALIDATION.md`](PIPELINE_AND_VALIDATION.md), and [`docs/FEATURES_AND_VISION.md`](FEATURES_AND_VISION.md).

---

## Summary of Progress

| Phase | Scope | Status | Reference |
|---|---|---|---|
| **Phase 1** | Core Story Ingestion, Extraction, Quote Guard, Pairwise Consistency, pgvector Story Chat, Dashboard UI | **Completed (Merged)** | PR `#1` |
| **Phase 2 (M2.1–M2.5)** | Neo4j Graph DB, Relationship Evolution, Dual Timeline, Multi-Hop Epistemic Matrix, Object Custody, World Rules, Contradiction Intent Reasoner, Graph RAG Chat, Draft Snapshots & `.md` Bible Export | **Implemented (Open PRs)** | PR `#12` – PR `#16` |
| **Phase 3** | True `Untitled Diagram` Pipeline & Incremental Core (`Change Detector`, `Cheap Scanner`, Graph `Context Builder`, Pre-Graph Validation Gate, `Feedback Loop`, `Plot Thread Tracker`, `Feature Customization`, `.docx`/`.pdf` Import) | **Remaining** | Below |
| **Phase 4** | Live Writing Mode UI (`Paragraph Edited` / `Live Writing Pause`), Split Editor + Map Panels, Privacy-First Controls | **Remaining** | Below |
| **Phase 5** | Multi-Book Series Support, Cross-Book Canon Graph & Extended Exports (`.pdf` / `.docx`) | **Remaining** | Below |

---

## Remaining Phases (3 Phases Left)

### Phase 3 — True Incremental Pipeline, Pre-Graph Validation & Plot Thread Core
Brings the codebase into 1:1 structural parity with [`docs/architecture.drawio.xml`](architecture.drawio.xml) and `Universal Processing Blueprint`:
1. **Incremental Ingestion & Triggers:**
   - Implement **Change Detector** and **Cheap Scanner** (`capitalized terms`, dialogue speakers, temporal phrases, candidate locations/objects) before LLM calls.
   - Implement compact-packet **Context Builder** drawing directly from Neo4j, `pgvector`, recent events, and feedback rules.
   - Add missing non-editor triggers: **`New Chapter Added`**, **`Large Rewrite Reprocessing`** (stale fact comparison), and **`Character Rename`** (preserving graph node IDs while appending aliases).
   - Add `.pdf` manuscript ingestion alongside `.txt` / `.md` / `.docx` and pasted prose.
2. **Pre-Graph Validation Gate & Feedback Loop:**
   - Insert candidate staging + confidence routing **before** `Graph Update`:
     - **High (`0.90–1.00`)** → auto-commit to Postgres + Neo4j
     - **Medium (`0.40–0.89`)** → hold in **Human Review** queue (including entity split/merge confirmation prompts)
     - **Low (`0.00–0.39`)** → quarantine in **Reject / Hold**
   - Build **`Pronoun Resolution`** and pre-commit **`Unreliable Narrator`** checks into the Validation Layer.
   - Build **`Feedback Loop`** (`User Corrects AI Mistake` → entity merge/split + correction rules → re-check affected scenes & update future Context Builder packets).
3. **Complete Module & Customization Parity:**
   - Build true **`Plot Thread Tracker`** (tracking narrative setups, promises, payoffs, and open vs. resolved vs. abandoned `PlotThread` nodes).
   - Add **`Feature Customization`** hooks (`Custom Context`, `Custom Prompt`, `Custom Validation`, `Custom Graph Write`, `Custom UI Output`) per project.

---

### Phase 4 — Live Writing Mode & Privacy-First Author Experience
Activates the remaining real-time triggers from the diagram:
1. **Rich Editor & Real-Time Triggers:**
   - Integrate an in-app manuscript editor supporting **`Paragraph Edited`** diffing (recomputing only changed `source_paragraph_id` facts & affected chunks) and debounced **`Live Writing Pause`** analysis.
   - Split-view **Manuscript + Story Intelligence Context Panel** showing inline margin warnings, active character tags, timeline anchors, and unresolved threads at the cursor position.
2. **Author Privacy & Security Controls:**
   - Configurable local-only LLM/embedding routing, zero-training API policy enforcement, manuscript export/deletion controls, and encrypted secret handling.

---

### Phase 5 — Multi-Book Series Support & Publishing Exports
1. **Series Canon Graph:**
   - Group multiple projects under a `Series` container with cross-book character resolution, series-wide timelines (`BEFORE`/`AFTER` across books), and cross-book contradiction checks.
2. **Extended Story Bible Exports:**
   - Add formatted `.pdf` and `.docx` Story Bible generation alongside the existing Markdown exporter.
