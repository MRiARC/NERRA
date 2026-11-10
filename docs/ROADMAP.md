# NERRA — Development Roadmap & Current Status

> Progress measured strictly against [`docs/ARCHITECTURE.md`](ARCHITECTURE.md), [`docs/PIPELINE_AND_VALIDATION.md`](PIPELINE_AND_VALIDATION.md), and [`docs/FEATURES_AND_VISION.md`](FEATURES_AND_VISION.md).

---

## Summary of Progress

| Phase | Scope | Status | Reference |
|---|---|---|---|
| **Phase 1** | Core Story Ingestion, Extraction, Quote Guard, Pairwise Consistency, pgvector Story Chat, Test Dashboard UI | **Completed (Merged)** | PR `#1` |
| **Phase 2 (M2.1–M2.5 + AI Quality Upgrade)** | Neo4j Graph DB, Relationship Evolution, Dual Timeline (LLM chronological), Knowledge Matrix, Custody, LLM World Rules & Semantic Contradictions, Auto Intent Reasoner, Graph RAG Chat, Draft Snapshots & `.md` Bible Export | **Merged (`#12`–`#19`) + AI Upgrade (`PR #21`)** | PRs `#12`, `#14`–`#19`, `#21` |
| **Phase 3** | True `Untitled Diagram` Incremental Pipeline & Quality-First Reasoning (`Change Detector`, `LLM Signal Pre-Scanner`, Deep Graph `Context Builder`, Multi-Pass Extraction, Pre-Graph LLM Confidence Validation Gate, `Feedback Loop`, Full Cross-Chapter `Plot Thread Tracker`, `Feature Customization`, `.pdf` Import) | **Next** | Below |
| **Phase 4** | Live Writing Mode UI (`Paragraph Edited` / `Live Writing Pause`), Full Author Dashboard Redesign, Privacy-First Controls | **Remaining** | Below |
| **Phase 5** | Multi-Book Series Support, Cross-Book Canon Graph & Extended Exports (`.pdf` / `.docx`) | **Remaining** | Below |

> **Frontend Testing Scope Note:** The current Next.js dashboard serves purely as an internal test harness while Phases 2–3 harden the AI & Graph intelligence core. A dedicated UI/UX overhaul is deferred until the core intelligence engine is complete.

---

## Remaining Phases (3 Phases Left)

### Phase 3 — True Incremental Pipeline, Pre-Graph Validation & Plot Thread Core
Brings the codebase into 1:1 parity with [`docs/architecture.drawio.xml`](architecture.drawio.xml) without LLM cost compromises:
1. **Incremental Ingestion & Triggers:**
   - Implement **Change Detector** and an **LLM Signal & Coreference Pre-Scanner** (`claude-haiku-4.5` / `claude-sonnet-4.5` + deterministic anchors) capturing both explicit names and lowercase/implicit references before context retrieval.
   - Implement deep **Context Builder** (`200K`-window aware) drawing multi-hop Neo4j subgraphs, `pgvector` recall, prior chapter summaries, active world rules, open plot threads, and correction rules.
   - Upgrade `AI Processing` to **multi-pass specialized `claude-sonnet-4.5` agents** (Entities/Coreference, Events/Chronology, Claims/Knowledge/Custody, World Rules/Plot Threads).
   - Add missing non-editor triggers: **`New Chapter Added`**, **`Large Rewrite Reprocessing`** (stale fact comparison + LLM semantic draft diff + downstream re-audit), and **`Character Rename`** (preserving graph node IDs while appending aliases).
   - Add `.pdf` manuscript ingestion alongside `.txt` / `.md` / `.docx` and pasted prose.
2. **Pre-Graph Validation Gate & Feedback Loop:**
   - Insert candidate staging + mandatory **LLM Semantic Validation + Confidence Routing** **before** `Graph Update`:
     - **High (`0.90–1.00`)** → auto-commit to Postgres + Neo4j
     - **Medium (`0.40–0.89`)** → hold in **Human Review** queue (including LLM-explained entity split/merge confirmation prompts)
     - **Low (`0.00–0.39`)** → quarantine in **Reject / Hold**
   - Build LLM-backed **`Pronoun Resolution`** and pre-commit **`Unreliable Narrator`** verification inside the Validation Layer.
   - Build **`Feedback Loop`** (`User Corrects AI Mistake` → entity merge/split + `CorrectionRule`s → LLM downstream re-audit of affected chapters & Context Builder injection).
3. **Complete Module & Customization Parity:**
   - Build full cross-chapter LLM + Graph **`Plot Thread Tracker`** (linking setups, clues, and payoffs across the entire book as `PlotThread` nodes).
   - Add **`Feature Customization`** hooks (`Custom Context`, `Custom Prompt`, `Custom Validation`, `Custom Graph Write`, `Custom UI Output`) per project, plus minimal test-harness controls in the Next.js UI.

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
