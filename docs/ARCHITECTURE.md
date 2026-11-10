# NERRA — Canonical System Architecture

> Synthesized from the two authoritative sources of truth:
> - **Architecture Diagram:** [`docs/architecture.drawio.xml`](architecture.drawio.xml)
> - **Design Vault:** Obsidian `Story Intelligence Engine` (`01 Architecture/System Overview.md`, `02 Core Pipeline/`, `05 Validation System/`)

---

## 1. Core Mental Model

```text
LLM          = interpreter
Graph        = memory
Validator    = judge
User         = final authority
Vector Store = fuzzy recall
Frontend     = author interface
```

**Core Principle:** The system never sends the full manuscript to the LLM on every change. Instead, it constructs a **compact context packet**:

```text
New or changed text
  + Relevant Graph Memory (entities, aliases, relationships, open threads)
  + Recent Timeline & Epistemic Context
  + Fuzzy Vector Recall
  + Author Feedback / Correction Rules
```

---

## 2. End-to-End Architecture Flow

This flow maps directly to [`docs/architecture.drawio.xml`](architecture.drawio.xml):

```mermaid
flowchart TD
    subgraph Triggers["Possible Triggers"]
        T1["Import Manuscript"]
        T2["New Chapter Added"]
        T3["Paragraph Edited"]
        T4["Live Writing Pause"]
        T5["User Asks Story Question"]
        T6["User Corrects AI Mistake"]
    end

    T1 & T2 & T3 & T4 & T5 & T6 --> TR["Trigger"]
    TR --> DC["Data Collection\n(Change Detector + Cheap Scanner)"]
    DC -->|"Chunk / Scene Embeddings"| VDB[("Vector Store\npgvector")]
    DC --> CB["Context Builder"]

    VDB --> CB
    GDB[("Story Graph DB\nNeo4j + Postgres")] --> CB
    FB["Feedback Loop"] --> CB

    CB --> AI["AI Processing\n(LLM Extraction / Synthesis)"]
    AI --> VL["Validation Layer"]
    VL --> CONF{"Confidence?"}

    CONF -- "High (0.90–1.00)" --> GU["Graph Update"]
    CONF -- "Medium (0.40–0.89)" --> HR["Human Review\n(Author Queue)"]
    CONF -- "Low (0.00–0.39)" --> RH["Reject / Hold\n(Quarantine)"]
    HR --> GU

    GU --> GDB
    GU --> RL["Reasoning Layer"]

    subgraph Modules["8 Intelligence Modules"]
        M1["Character Intelligence"]
        M2["Relationship Intelligence"]
        M3["Timeline Engine"]
        M4["Knowledge-State Tracker"]
        M5["Contradiction Engine"]
        M6["Plot Thread Tracker"]
        M7["Object Tracker"]
        M8["Location Intelligence"]
    end

    RL --> M1 & M2 & M3 & M4 & M5 & M6 & M7 & M8
    M1 & M2 & M3 & M4 & M5 & M6 & M7 & M8 --> OUT["User Output\n(Cards, Graph, Timeline, Warnings, Chat)"]
    OUT --> FB
```

### Extension & Research Hooks in [`architecture.drawio.xml`](architecture.drawio.xml)

| Group | Nodes & Targets |
|---|---|
| **Feature Customization** | `Context Builder → Custom Context` · `AI Processing → Custom Prompt` · `Validation Layer → Custom Validation` · `Graph Update → Custom Graph Write` · `User Output → Custom UI Output` |
| **Open Research Areas** | `Large Rewrite Reprocessing → Data Collection` · `World Rule Extraction → AI Processing` · `Pronoun Resolution → Validation Layer` · `Unreliable Narrator → Validation Layer` · `Flashback Detection → Reasoning Layer` · `Plot Thread Resolution → Reasoning Layer` |

---

## 3. Data Persistence Layer (`docker-compose.yml`)

1. **PostgreSQL 16 + `pgvector` (`nerra-postgres`):**
   - Authoritative ACID relational records: users, projects, manuscripts, version snapshots (`manuscript_versions`), verbatim quote evidence, factual claims, timeline events, object custody logs, world rules, and author decisions.
   - Vector recall: 384-dimensional chunk embeddings (`all-MiniLM-L6-v2`) queried via `pgvector` cosine distance.
   - Embeddings must update incrementally (recomputing only changed chapters/chunks).
2. **Neo4j 5 Community (`nerra-neo4j`):**
   - Native graph memory for multi-hop Cypher traversals, relationship evolution edges, and neighborhood expansion.
   - **Canonical Graph Nodes:** `Character`, `Event`, `Location`, `Object`, `Fact`, `Knowledge`, `PlotThread`, `Scene`.
   - **Canonical Graph Edges:** `APPEARS_IN`, `HAS_ALIAS`, `KNOWS`, `LEARNED`, `TOLD`, `OWNS`, `POSSESSES`, `PARTICIPATED_IN`, `OCCURRED_AT`, `BEFORE`, `AFTER`, `CONTRADICTS`, `RELATED_TO`.

---

## 4. Current Codebase Mapping

| Architectural Block | Current Implementation Path | Current Maturity |
|---|---|---|
| **Triggers & Ingestion API** | `backend/app/routers/manuscripts.py`, `backend/app/services/splitter.py` | Batch manuscript import + SHA-256 chapter cache implemented; paragraph-diff & live triggers planned in Phase 3–4 |
| **LLM Interpreter** | `backend/app/services/extractor.py`, `backend/app/services/pipeline.py` | Chapter extraction with quote provenance + Neo4j/SQL sync; `Change Detector`, `Cheap Scanner`, and Graph `Context Builder` planned in Phase 3 |
| **Validation & Intent Gate** | `backend/app/services/extractor.py`, `backend/app/agents/contradiction_reasoner.py` | Verbatim-quote validation + LangGraph intent reasoner (`error` vs `intentional`); pre-graph confidence quarantine (`High`/`Medium`/`Reject-Hold`) planned in Phase 3 |
| **Graph & Vector Memory** | `backend/app/models.py`, `backend/app/services/graph.py`, `backend/app/services/embedder.py` | Postgres + `pgvector` + Neo4j `StoryEntity` graph projection implemented |
| **Reasoning Modules** | `backend/app/services/{consistency,timeline,knowledge,exporter}.py` | Character, Relationship, Dual Timeline, Epistemic Knowledge Matrix, Custody, World Rules, Contradictions implemented; full `Plot Thread Tracker` & `Feature Customization` planned in Phase 3 |
| **Story Chat (Graph RAG)** | `backend/app/agents/story_chat.py` | Intent routing, `pgvector` + Neo4j neighborhood + timeline/knowledge retrieval, context grading retry, verbatim chapter citations |
| **Author Interface** | `frontend/src/app/page.tsx`, `frontend/src/components/` | Next.js dashboard (Issues & Review Queue, Characters & Merge, Story Graph, Dual Timeline, Knowledge Matrix, World & Custody, Claims, Versions, Story Bible Export, Chat) |
