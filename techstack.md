# Tech Stack — Honest Assessment and Refinements

## Your Instincts Are Right

The three-layer split is the correct architecture:

```
[Fast I/O Layer]  →  [AI/Intelligence Layer]  →  [Data Layer]
   Go or Node            Python + LangGraph        Graph + Vector + Relational
```

Let me go through each choice with specifics.

---

## The Backend: Go vs Node

**My recommendation: Go, but with a caveat.**

Here's the reasoning mapped to your actual architecture:

| Requirement | Go | Node |
|---|---|---|
| Event Router (debounce, diff, prioritize) | ✅ Goroutines are perfect for this | ⚠️ Works but event loop can bottleneck |
| WebSocket to editor | ✅ Excellent (gorilla/websocket, nhooyr) | ✅ Excellent (ws, Socket.io) |
| Manuscript diffing | ✅ Fast string processing | ⚠️ Fine for small diffs, struggles with large rewrites |
| Async pipeline orchestration | ✅ Channels + goroutines | ⚠️ Promise chains get messy at scale |
| Version/snapshot management | ✅ Strong typing helps complex models | ⚠️ TypeScript helps but runtime is loose |
| Time to first working prototype | ⚠️ Slower | ✅ Faster |
| Hiring pool | ⚠️ Smaller | ✅ Larger |
| Sharing types with frontend | ❌ Need codegen | ✅ If TypeScript frontend |

**The caveat:** If your editor is a web app and your team is 2-3 people who already know TypeScript, **just use Node.** The performance difference doesn't matter until you have thousands of concurrent manuscripts. Premature optimization of the backend language will slow you down more than any runtime cost.

**If you're building a VS Code / Obsidian / desktop plugin**, Go makes more sense because the backend is a standalone service and you don't share a type system with the frontend anyway.

---

## Python AI Layer — Correct, But Be Specific

"Python AI layer" is right. The real question is **how it communicates with the backend** and **what runs inside it.**

### Communication Pattern

```
Go/Node Backend  ──gRPC or HTTP──→  Python AI Service
                   ←── streaming ──←  (results + progress)
```

**gRPC is the right call here**, not REST. Reasons:
- Your context packets are large (passages + graph facts + timeline)
- You need streaming responses (analysis results come back module by module)
- Strong typing between backend and AI layer prevents silent schema drift
- Lower overhead than HTTP+JSON for high-frequency calls

### What Lives in Python

```
python-ai-service/
├── orchestrator/          # LangGraph workflows
│   ├── analysis_graph.py  # Main analysis DAG
│   ├── review_graph.py    # Human-in-the-loop review
│   └── contradiction.py   # Iterative contradiction resolution
├── extractors/            # Entity extraction (spaCy + LLM hybrid)
├── chunkers/              # Manuscript chunking logic
├── validators/            # Schema + evidence + consistency checks
├── embeddings/            # Embedding generation + caching
└── prompts/               # Versioned prompt templates
```

---

## LangGraph — Use It, But Not For Everything

This is where I'd push back slightly. Your pipeline has **two distinct patterns**, and LangGraph is only the right tool for one of them.

### Pattern 1: DAG Pipeline (Don't use LangGraph)

```
Parse → Chunk → Extract → Embed → Store
```

This is a **straight data pipeline.** LangGraph adds overhead and debugging complexity for no benefit. Use:
- **Simple Python async** (`asyncio` + `asyncio.gather` for parallel steps)
- Or **a lightweight task framework** like Dramatiq or even just Celery

### Pattern 2: Stateful Agent Loops (Use LangGraph)

```
Contradiction detected → Reason about intent → 
  Is it intentional tension? → No → Flag to user
                             → Yes → Update belief graph
                             → Uncertain → Ask for more context → Re-evaluate
```

This is **genuinely agent-like** — cyclic, stateful, conditional. LangGraph is perfect here. Specifically:

- **Contradiction resolution** — needs iterative reasoning with the graph
- **Human-in-the-loop review** — LangGraph's `interrupt_before` / `interrupt_after` maps directly to your confidence routing
- **Complex story queries** — "What does Character X know at this point?" requires multi-step graph traversal + inference

### Suggested Split

```
Simple pipeline (async Python):
  - Manuscript parsing
  - Chunking and embedding
  - Entity extraction (first pass)
  - Graph writes (CRUD)

LangGraph agents:
  - Analysis orchestrator (parallel module dispatch with shared state)
  - Contradiction engine (iterative reasoning)
  - Story Q&A (multi-step retrieval + inference)
  - Review/correction loop (human-in-the-loop)
```

---

## Things You're Missing

### 1. Message Queue / Event Bus

Your architecture has a **lot** of async handoffs. The Event Router shouldn't call the AI service directly — it should publish events and let consumers process at their own pace.

**Recommendation: Redis Streams** (not Kafka, not RabbitMQ)

Why:
- You already need Redis for debouncing state and caching
- Redis Streams give you consumer groups, ack, and replay
- Low operational overhead (one less service to run)
- Fast enough for your throughput (you're not processing millions of events/sec)
- If you outgrow it, migration to NATS or Kafka is straightforward

```
Event Router → Redis Stream → [Parser Worker] [AI Worker] [Graph Worker]
```

### 2. Graph Database Choice

Your diagram shows three graph stores (Story Graph, Canon Graph, Belief Graph). You need to pick an actual database.

| Option | Pros | Cons | Best For |
|---|---|---|---|
| **Neo4j** | Best query language (Cypher), mature, great tooling | Heavy, expensive at scale, separate infra | If graph queries are complex and central |
| **Apache AGE** (Postgres extension) | Runs inside Postgres, one less DB, SQL + Cypher | Younger, fewer features, smaller community | **Pragmatic early choice** |
| **FalkorDB** | Very fast, Redis-compatible | Smaller ecosystem | If latency is critical |
| **SurrealDB** | Multi-model (graph + doc + relational), modern | New, less battle-tested | If you want to consolidate stores |

**My honest recommendation: Start with Apache AGE on Postgres.**

Reasoning:
- You already need Postgres for users, manuscripts, versions, billing
- AGE lets you run Cypher queries *inside* Postgres
- Your "three graphs" (story, canon, belief) can be three subgraphs in one database
- You avoid the operational cost of running Neo4j alongside Postgres
- If you outgrow it, you can migrate the graph portion to Neo4j later

### 3. Vector Store Choice

| Option | Recommendation |
|---|---|
| **pgvector** | ✅ Start here. Same Postgres, zero extra infra. Good enough for <1M passages. |
| **Qdrant** | Move here when you need advanced filtering (by chapter, character, timeline position) |
| **Pinecone** | Only if you want fully managed and don't care about cost |

**Start with pgvector.** Your vector search needs are relatively simple (find semantically similar passages near a changed scene). You don't need a dedicated vector DB on day one.

### 4. Cache Layer

**Redis** (you need it anyway for Streams). Use it for:
- Debounce state (per-document, per-user)
- Context packet caching (don't rebuild context for the same scene twice)
- LLM response caching (identical queries → cached results)
- Rate limiting per user
- Session state for active editing sessions

### 5. Editor Integration Layer

This is **the most important architectural decision you haven't mentioned.** Where does this thing live?

| Option | Stack Implications |
|---|---|
| **VS Code Extension** | TypeScript frontend, Go/Node backend, Python AI. Extension communicates via WebSocket to your service. |
| **Web Editor** (ProseMirror/TipTap) | Full-stack TypeScript frontend, Go/Node backend, Python AI. Easiest real-time integration. |
| **Obsidian Plugin** | TypeScript plugin, local or remote backend. Interesting for the writing community. |
| **Standalone Desktop App** (Tauri) | Rust/TS frontend, embedded or remote backend. Best UX control, hardest to build. |
| **API-first, integrate later** | Build the backend + AI, expose an API, let others build editor plugins. |

**My suggestion: API-first + one reference integration.** Build the engine as a service. Pick *one* editor to integrate with first (VS Code or a simple web editor). This keeps the backend clean and lets you validate the core value before investing in UX.

---

## The Stack I'd Actually Ship

```
┌─────────────────────────────────────────────────────┐
│  EDITOR (VS Code Extension or Web)                  │
│  TypeScript · ProseMirror/VS Code API · WebSocket   │
└──────────────────────┬──────────────────────────────┘
                       │ WebSocket + gRPC
┌──────────────────────▼──────────────────────────────┐
│  API GATEWAY / BACKEND                              │
│  Go (or Node if team prefers)                       │
│  • Event Router (debounce, diff, prioritize)        │
│  • Auth, user management, manuscript CRUD           │
│  • WebSocket server for real-time push              │
│  • Version/snapshot management                      │
└──────┬───────────────┬──────────────┬───────────────┘
       │               │              │
  Redis Streams    gRPC to AI    Direct DB
       │               │              │
┌──────▼──────┐ ┌──────▼──────────────▼───────────────┐
│   REDIS     │ │  PYTHON AI SERVICE                  │
│ • Streams   │ │  • LangGraph (agents, review loops) │
│ • Cache     │ │  • Async pipeline (parse, chunk)    │
│ • Debounce  │ │  • spaCy + LLM hybrid extraction    │
│ • Rate limit│ │  • Embedding generation             │
└─────────────┘ │  • Validation + confidence scoring  │
                └──────┬──────────────┬───────────────┘
                       │              │
          ┌────────────▼──┐    ┌──────▼──────────┐
          │  POSTGRES     │    │  (same Postgres) │
          │  + Apache AGE │    │  + pgvector      │
          │  • Story graph│    │  • Passage       │
          │  • Canon graph│    │    embeddings    │
          │  • Belief graph│   │  • Semantic      │
          │  • Users      │    │    search        │
          │  • Manuscripts│    │                  │
          │  • Versions   │    │                  │
          │  • Audit log  │    │                  │
          └───────────────┘    └──────────────────┘
```

### Infrastructure Summary

| Component | Technology | Why |
|---|---|---|
| Backend API | **Go** (or Node) | Concurrency, real-time, typed |
| AI Service | **Python 3.12+** | Ecosystem, LLM clients, NLP |
| Agent Orchestration | **LangGraph** | Cyclic workflows, human-in-loop |
| Pipeline Tasks | **asyncio + Dramatiq** | Simple async for DAG steps |
| Message Bus | **Redis Streams** | Already need Redis, good enough |
| Cache | **Redis** | Debounce, context cache, LLM cache |
| Relational DB | **Postgres 16** | Users, manuscripts, versions |
| Graph DB | **Apache AGE** | Graph queries inside Postgres |
| Vector Store | **pgvector** | Zero extra infra, good enough |
| LLM Provider | **Anthropic + OpenAI** | Claude for analysis, GPT-4o for extraction (or vice versa, benchmark both) |
| Editor | **VS Code Extension** (v1) | Largest writer-dev overlap, good extension API |
| Frontend (views) | **React + Cytoscape.js** | Story bible, graph view, timeline |
| Deployment | **Fly.io or Railway** | Easy multi-region, good for Go+Python |

---

## One More Thing: LLM Cost Management

This architecture will make **a lot** of LLM calls. A single paragraph edit could trigger:
- Entity extraction (1 call)
- Context assembly (0 calls, but retrieval)
- 4 analysis modules (4 calls, parallelizable)
- Validation (1 call)
- Contradiction check (1-3 calls)

That's **7-10 LLM calls per meaningful edit.** At scale, this gets expensive fast.

Build in from day one:
- **Semantic caching** — if the same passage was analyzed recently and hasn't changed, reuse results
- **Tiered models** — use a small/fast model for extraction, a large model for reasoning
- **Batching** — when a user pauses writing, batch all pending edits into one analysis pass
- **Token budgets** — per-user daily limits with clear upgrade paths

This isn't an optimization for later. It's a **unit economics problem** that determines whether the product is viable at your target price point.