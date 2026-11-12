<div align="center">

# ✦ NERRA ✦
### *The Intelligent Story Operating System for Novelists & Narrative Designers*

**Your story has a memory. NERRA makes it intelligent.**

[![Build & Test Suite](https://img.shields.io/badge/tests-71%2F71%20passing-10B981?style=for-the-badge&logo=pytest&logoColor=white)](https://github.com/MRiARC/NERRA)
[![Python 3.13](https://img.shields.io/badge/python-3.13-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15%20App%20Router-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL + pgvector](https://img.shields.io/badge/PostgreSQL-pgvector-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Neo4j Graph](https://img.shields.io/badge/Neo4j-5.x%20Graph-008CC1?style=for-the-badge&logo=neo4j&logoColor=white)](https://neo4j.com/)
[![Claude 3.5 Sonnet](https://img.shields.io/badge/AI-Claude%203.5%20Sonnet-D97706?style=for-the-badge&logo=anthropic&logoColor=white)](https://anthropic.com/)

[**Explore Architecture**](docs/ARCHITECTURE.md) • [**Frontend Roadmap**](docs/FRONTEND_ARCHITECTURE.md) • [**Pipeline & Validation**](docs/PIPELINE_AND_VALIDATION.md) • [**Empirical Benchmark**](docs/BENCHMARK_20CH_REPORT.md)

</div>

---

## ✦ The Problem: Narrative Complexity Collapse

As novels scale beyond 30,000 words, human memory falters under the weight of exponential story entanglements:

* *Did Sarah's eyes turn from steel-gray to amber between Chapter 1 and Chapter 8?*
* *Does John know about the murder at the banquet, or is he speaking with knowledge he hasn't acquired yet?*
* *Where was the brass compass left when Marcus fled the pier in Chapter 4?*
* *Did this flashback occur before or after the Treaty of Ashford was signed?*
* *Which of the 14 subplots introduced in Act I were abandoned without resolution?*

Traditional writing tools (Scrivener, Notion, Word) treat prose as flat text. They force authors to manually update external wikis that inevitably fall out of sync with the manuscript.

**NERRA transforms the manuscript itself into a living, queryable, graph-backed intelligence layer.**

---

## ✦ System Architecture

NERRA operates on an **incremental, graph-first, human-in-the-loop** architecture:

```
                             ┌─────────────────────────────────┐
                             │    Manuscript (.txt/.md/.pdf)   │
                             │      or Phase 4 Live Editor     │
                             └────────────────┬────────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │   ChangeDetector & SignalScanner│
                             │     (Sub-paragraph diffing)     │
                             └────────────────┬────────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │   Story Memory ContextBuilder   │
                             │    (Graph Roster + Neighbors)   │
                             └────────────────┬────────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │   Multi-Pass Sonnet Extraction  │
                             │  (Entities, Claims, Custody,    │
                             │   Knowledge, Events, Threads)   │
                             └────────────────┬────────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │     Pre-Graph Validation Gate   │
                             │  (Junk Quarantine, Entity &    │
                             │   Pronoun Disambiguation)       │
                             └────────┬───────────────┬────────┘
                                      │               │
                                      ▼               ▼
                 ┌──────────────────────────┐   ┌──────────────────────────┐
                 │ Neo4j Story Graph Layer  │   │  PostgreSQL + pgvector   │
                 │   (Evolutionary Edges,   │   │  (Epistemic States,      │
                 │    Spatiotemporal Nodes) │   │   Embeddings, Claims)    │
                 └────────────┬─────────────┘   └─────────────┬────────────┘
                              │                               │
                              └───────────────┬───────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │   Continuity & Intent Engines   │
                             │  • Dual Timeline (Chronological)│
                             │  • Knowledge Matrix (Epistemic) │
                             │  • Object Custody Paradoxes     │
                             │  • Intent Reasoner & Rules      │
                             │  • Plot Thread Lifecycle        │
                             └────────────────┬────────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │    Author Studio & UI (Phase 4) │
                             │  • Live Consistency Squiggles   │
                             │  • Triage Hub & Feedback Loop   │
                             │  • Graph Explorer & Story Bible │
                             └─────────────────────────────────┘
```

---

## ✦ Key Intelligence Modules

### 1. ⏳ Dual Timeline & Chronological Ordering
Authors rarely write in chronological order. NERRA extracts scene temporal anchors (`"twelve years earlier"`, `"the morning after the siege"`) and decouples **Narrative Order** (the order the reader reads) from **In-Universe Chronological Order**. Spatiotemporal collisions (e.g. a character appearing in two cities simultaneously) are automatically flagged.

### 2. 🧠 Epistemic Knowledge Matrix
Prevents characters from acting on information they couldn't possibly possess. The system tracks every character’s knowledge state: *who knows what fact, since which chapter, and how they learned it* (witnessed, told by X, eavesdropped, or read in a letter).

### 3. 🗝️ Object Custody & Paradox Prevention
Tracks critical relics, letters, weapons, and macguffins as they change hands across chapters. If a character attempts to wield or mention an item that is locked in a vault or in another character's possession 50 miles away, NERRA detects a **Custody Paradox**.

### 4. 🎭 Intent Reasoner & Positive World Rules
Not every contradiction is an error. NERRA's Intent Reasoner evaluates potential issues against authorial craft (*"Is this an unreliable narrator, intentional disguise, magical transformation, or an actual author oversight?"*). Authors can define positive and negative world rules (*"Teleportation requires a full moon"*) that are semantically enforced across all chapters.

### 5. 🧵 Cross-Chapter Plot Thread Tracker
Monitors the lifecycle of every subplot, mystery, and character goal across chapters (`Introduced` → `In-Progress` → `Escalating` → `Resolved` → `Abandoned`). Identifies dangling threads and unfulfilled promises before the final draft is submitted.

### 6. ✍️ Phase 4: Live Prose Studio with Real-Time Consistency Squiggles
An aesthetic, distraction-free writing environment built on **TipTap / ProseMirror**:
* **Real-time debounced consistency linter**: Emits inline squiggles as you type (Crimson for physical contradictions, Amber for epistemic leaks).
* **Hover quick-fix popovers**: One-click actions to mark an apparent inconsistency as an intentional plot twist, update the story canon, or adjust world rules.
* **Floating Graph Copilot**: Natural language conversational assistant citing precise chapter and graph evidence.

### 7. 🔐 Cookie-Based Sessions & Rotating Refresh Tokens
Enterprise-grade authentication built with HttpOnly cookies, 15-minute JWT access tokens with unique RFC 7519 `jti` identifiers, in-place rotating refresh tokens with replay attack rejection, and multi-device active session tracking with instant remote revocation.

---

## ✦ Empirical Stress Test: 20-Chapter Fantasy Novel

NERRA was audited on a full-length 20-chapter fantasy thriller (*The Obsidian Archive of Aethelgard*, **51,960 words**):

| Metric | Result |
|---|---|
| **Novel Word Count** | **51,960 words** (20 chapters, 1,500 to 4,200 words/chapter) |
| **Total Ingestion Time** | **950.66 seconds** (~47s / chapter full multi-pass pipeline) |
| **Token Telemetry** | **2,642,102 tokens** (2.41M input, 230K output, 100% LLM cache efficiency) |
| **Graph Entities Resolved** | **7 Characters, 65 Locations, 62 Objects, 196 Events, 400 Claims** |
| **Custody Transitions** | **46 object transitions tracked** with zero state corruption |
| **Plot Threads Monitored** | **261 thread states** tracked across 20 chapters |
| **Consistency Resolution** | **94 issues triaged** (with auto-classification of magic rules vs author errors) |
| **Data Integrity** | **0 lost characters**, 100% of chapter text preserved without truncation |

*Read the full empirical benchmark report in [`docs/BENCHMARK_20CH_REPORT.md`](docs/BENCHMARK_20CH_REPORT.md).*

---

## ✦ The 12-Page Frontend Suite

Built with **Next.js 15 App Router** and the **"Obsidian Velvet & Forest Noir"** editorial design system:

```
/                             -> Projects Dashboard & Ingestion Hub
/projects/:id/editor          -> Live Prose Studio & Real-time Linter (Phase 4)
/projects/:id/reader          -> Deep Manuscript Reader & Context Inspector
/projects/:id/issues          -> Consistency & Intent Triage Hub
/projects/:id/timeline        -> Dual Chronology & Flashback Matrix
/projects/:id/plot-threads    -> Subplot & Narrative Arc Tracker
/projects/:id/world           -> Interactive Story Graph & Epistemic Matrix
/projects/:id/custody         -> Artifact & Object Custody Chains
/projects/:id/bible           -> Story Bible & World Lore Wiki
/projects/:id/versions        -> Version History & Draft Diffing
/projects/:id/audit           -> Pipeline Telemetry & Token Analytics
/settings                     -> LLM Config & Multi-Device Sessions
```

*Complete design tokens and phased implementation plan: [`docs/FRONTEND_ARCHITECTURE.md`](docs/FRONTEND_ARCHITECTURE.md).*

---

## ✦ Quickstart & Setup

### Prerequisites
* **Python 3.13+**
* **Node.js 20+**
* **Docker & Docker Compose**
* **Anthropic API Key** (or local LLM proxy)

### 1. Clone & Start Infrastructure
```bash
git clone https://github.com/MRiARC/NERRA.git
cd NERRA

# Launch PostgreSQL (with pgvector) and Neo4j
docker compose up -d
```

### 2. Backend Setup
```bash
cd backend
python -m venv ../.venv
source ../.venv/bin/activate
pip install -r requirements.txt

# Run full test suite (71 passing tests)
pytest

# Launch FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to access the NERRA Studio.

---

## ✦ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend Framework** | FastAPI, Python 3.13, Starlette, Uvicorn |
| **Databases** | PostgreSQL 16 (Relational + `pgvector`), Neo4j 5.x (Story Graph) |
| **ORM & Migrations** | SQLAlchemy 2.0, Alembic |
| **LLM Orchestration** | Anthropic Claude 3.5 Sonnet & Haiku, Dynamic Token Budgeting |
| **Frontend Framework** | Next.js 15 (App Router), React 19, TypeScript |
| **State Management** | TanStack React Query v5, Zustand |
| **Prose Editor** | TipTap (ProseMirror), Custom Linter Decoration Extension |
| **Styling & Icons** | Tailwind CSS (Custom Editorial Tokens), Lucide React, Sonner |
| **Testing** | Pytest, TestClient, In-Memory Fixtures |

---

## ✦ License & Contribution

NERRA is released under the **MIT License**. Contributions, bug reports, and novel test manuscripts are welcome.

<div align="center">
  <sub>Designed for novelists who care about their fictional worlds.</sub>
</div>
