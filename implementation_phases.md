# Nerra — Phased Implementation Plan

> **Product:** AI Story Continuity and Intelligence Engine  
> **Stack:** Go Backend · Python AI Service · Postgres + Apache AGE + pgvector · Redis · React Frontend  
> **Total estimated timeline:** ~34 weeks (8.5 months) from zero to public launch

---

## Architecture Quick Reference

```
[Editor (React + ProseMirror / TipTap)]
          ↕ WebSocket + REST
[Go Backend — Event Router, Auth, CRUD, WebSocket server]
          ↕ Redis Streams (async) + gRPC (direct)
[Python AI Service — LangGraph agents + asyncio pipelines]
          ↕ Direct DB
[Postgres 16 + Apache AGE (Graph) + pgvector (Vectors)]
[Redis — Streams, Cache, Debounce, Rate Limiting]
```

> **Architecture fix applied:** The original diagram showed the Event Router calling the AI service directly for all cases. The correct design is: Event Router → Redis Streams → [AI Worker Consumers]. Redis Streams provide backpressure, ack, replay, and consumer group isolation. gRPC direct-call is reserved only for synchronous, latency-sensitive paths (e.g., story Q&A where the user is waiting for a response).

---

## Phase 0 — Foundation and Infrastructure
**Duration: 4 weeks**  
**Goal:** A working skeleton where every layer can talk to every other layer. No features yet, just the plumbing done right.

---

### 0.1 Monorepo and Project Setup
- Initialize monorepo structure:
  ```
  /nerra
    /backend          → Go service
    /ai-service       → Python service
    /frontend         → React app
    /infra            → Docker, Terraform, CI config
    /shared/proto      → gRPC proto definitions (shared source of truth)
  ```
- Set up pre-commit hooks: formatting (gofmt, black, prettier), linting, secret scanning
- Configure CI/CD: GitHub Actions with separate pipelines per service (lint → test → build → deploy)
- Set up Docker Compose for local development: spins up Postgres, Redis, Go backend, Python AI, and React frontend with a single `docker-compose up`

### 0.2 Database Infrastructure
- **Postgres 16** with:
  - **Apache AGE** extension installed and configured (graph queries via Cypher inside Postgres)
  - **pgvector** extension for vector similarity search
- Design and run initial schema migrations (use `golang-migrate` or `Flyway`):
  - Core relational tables: `users`, `sessions`, `projects`, `manuscripts`, `manuscript_versions`, `audit_log`
  - Graph schema: define Apache AGE graph names: `story_graph`, `canon_graph`, `belief_graph`
  - pgvector table: `passage_embeddings(id, chunk_id, embedding vector(1536), metadata jsonb)`
- Set up connection pooling (PgBouncer)
- Automated backup schedule from day one (daily snapshots to S3-compatible storage)

### 0.3 Redis Setup
- Redis 7+ with Streams and persistence (AOF) enabled
- Define stream names: `events:ingestion`, `events:analysis`, `events:corrections`
- Define consumer group conventions: `ingestion-workers`, `ai-workers`, `graph-workers`
- Configure eviction policy: `allkeys-lru` for the cache namespace, `noeviction` for the streams namespace

### 0.4 Go Backend Skeleton
- Initialize Go module, folder structure, and dependency management
- Set up HTTP router (Chi or Fiber) with middleware: logging, request ID, recovery, CORS
- Set up WebSocket server (nhooyr.io/websocket or gorilla/websocket) with a basic ping/pong keepalive
- Set up gRPC server (to communicate with Python AI service) with generated stubs from shared proto
- Set up Redis client (go-redis) with stream producer helper
- Basic health check endpoint (`GET /health`) that checks DB + Redis + AI service connectivity
- Configuration management: environment-based config with Viper

### 0.5 Python AI Service Skeleton
- Initialize Python 3.12 project with Poetry for dependency management
- Set up gRPC server (grpcio) consuming the shared proto
- Set up asyncio event loop with graceful shutdown handling
- Set up Redis consumer group worker framework (aioredis) for processing stream events
- Set up LangGraph with a minimal stub graph (one node, one edge — just to confirm the framework works)
- Set up spaCy with the `en_core_web_trf` model (transformer-based NER)
- Set up LLM clients: Anthropic SDK + OpenAI SDK with retry wrappers
- Logging structured as JSON (structlog)

### 0.6 React Frontend Skeleton
- Initialize React app with Vite + TypeScript
- Set up React Router v6 for client-side routing
- Set up TanStack Query for server state management
- Set up Zustand for local UI state
- Set up WebSocket client hook
- Configure Cytoscape.js for graph rendering
- Basic shell: Auth pages (login/register), Dashboard shell, 404 page

### 0.7 gRPC Contract Definition
Define all service interfaces in shared `.proto` files before either service implements them:
- `ManuscriptService`: `ParseManuscript`, `AnalyzeChunk`, `RunContradictionCheck`
- `QueryService`: `AskQuestion`
- `FeedbackService`: `SubmitCorrection`
- All streaming responses defined (server-side streaming for analysis progress)

### 0.8 Auth Foundation
- JWT-based auth: access token (15min TTL) + refresh token (30-day TTL, stored in Redis)
- bcrypt password hashing
- Email/password registration + login endpoints
- Session invalidation on logout (add token to Redis blocklist)
- Rate limiting on auth endpoints (Redis sliding window)

**Phase 0 Success Criteria:**
- `docker-compose up` boots all services without errors
- Go backend ↔ Python AI service can exchange a gRPC request and response
- Go backend → Redis Streams → Python AI worker can publish and consume a test event
- Go backend → Postgres can read/write a test user row
- Python AI service → pgvector can store and query a test embedding
- Apache AGE can execute a basic Cypher CREATE/MATCH query
- React frontend can call the health check endpoint and display a green status

---

## Phase 1 — Core Intelligence MVP
**Duration: 6 weeks**  
**Goal:** Import a manuscript, get a character list, get a basic issues list. The core loop works end-to-end even if the UI is minimal.

---

### 1.1 File Import Pipeline
- **Backend:** `POST /projects/:id/manuscripts/import` endpoint accepting multipart file upload
  - Supported formats: `.txt`, `.docx` (via mammoth.js server-side or python-docx), `.pdf` (via pdfminer)
  - Store raw file in object storage (S3 / Cloudflare R2)
  - Create a `manuscript_version` record and publish an `IMPORT` event to Redis Streams
- **AI Service:** `ingestion-worker` consumes `IMPORT` events:
  1. **Parser:** Segment text into chapters → scenes → paragraphs → sentences (regex + heuristics + LLM for edge cases)
  2. **Chunker:** Split into 300–500 token chunks, attach location metadata
  3. **Embedder:** Generate embeddings for each chunk (OpenAI `text-embedding-3-small`), upsert to pgvector
  4. **Entity Extractor:** spaCy NER pass (persons, places, objects), followed by an LLM pass for characters that spaCy missed (nicknames, titles, pronouns)
  5. **Graph Writer:** Write extracted characters, locations, objects, and events to Apache AGE `story_graph`

### 1.2 Character Intelligence (v1)
- **Graph queries:** After ingestion, query the `story_graph` for all character nodes
- **Character Profile Card generation:**
  - Name, aliases (collected from all alias mentions), first/last appearance (chapter/scene)
  - Physical descriptions: scan all chunks mentioning this character; extract description sentences; deduplicate
  - Status: detect death/disappearance events for each character
- **Backend API:**
  - `GET /projects/:id/characters` — list all characters with summary data
  - `GET /projects/:id/characters/:charId` — full profile card with all mentions and descriptions

### 1.3 Basic Relationship Extraction
- LLM prompt over adjacent character co-occurrences in scenes: "What is the relationship between A and B in this passage?"
- Structured output: `{character_a, character_b, relationship_type, evidence_text, chapter, confidence}`
- Write to `story_graph` as relationship edges with provenance
- **API:** `GET /projects/:id/characters/:charId/relationships`

### 1.4 Basic Consistency Checker (v1)
- **Fact Extractor:** For each chunk, LLM extracts factual claims as structured objects:
  ```json
  { "subject": "Sarah", "attribute": "eye_color", "value": "green", "chapter": 2, "evidence": "..." }
  ```
- **Contradiction Detector:** After all facts are extracted, run pairwise comparison for same `subject + attribute` with different `value`
- **Simple rule-based logic first** (no LangGraph yet): if two claims have the same subject and attribute but different values → flag as `CONTRADICTION`
- Store flags in `issue_log` table with type, severity, evidence, status=`OPEN`
- **API:** `GET /projects/:id/issues` with filters for type, severity, status

### 1.5 Validation and Confidence Layer (v1)
- Schema validation on all AI outputs using Pydantic models (Python) before any write to the graph
- Evidence check: every claim must include a non-empty `evidence` field pointing to a manuscript chunk
- Basic confidence scoring: spaCy extraction confidence + LLM self-reported confidence (via prompt) → composite score
- Route: high confidence → auto-write to graph; medium → write to review queue; low → discard

### 1.6 Basic Frontend — Dashboard + Character View
- **Dashboard:** Project list, "Import manuscript" button, ingestion progress indicator (WebSocket-pushed)
- **Character View:** Grid of character profile cards. Each card shows: name, aliases, first appearance, status
- **Issues View (v1):** Simple table of detected contradictions with chapter citations
- Basic project creation flow

**Phase 1 Success Criteria:**
- Import a 50,000-word novel in `.txt` format, end-to-end pipeline completes without errors
- Character list shows all named characters with correct aliases
- At least one real contradiction detected in a test manuscript with known contradictions
- All API endpoints return correctly structured JSON with evidence citations
- Frontend displays character grid and issues table from live API data

---

## Phase 2 — Rich UI and Full Intelligence Layer
**Duration: 8 weeks**  
**Goal:** All core intelligence modules working. A polished, usable application that an author could actually use daily.

---

### 2.1 Full AI Analysis Pipeline (LangGraph)
- Build the LangGraph DAG with four parallel analysis modules:
  - **Character & Relationship Module:** Deep relationship analysis, relationship evolution detection
  - **World, Object & Location Module:** Location profiles, object chain-of-custody tracking, world rule detection
  - **Timeline & Knowledge-State Module:** Dual timeline construction, character whereabouts mapping, knowledge state matrix
  - **Plot Thread & Continuity Module:** Thread identification and classification, dangling thread detection, pacing score computation
- Each module shares a LangGraph `State` object containing: manuscript chunks, retrieved graph facts, timeline data, author preferences
- All four modules run in parallel (LangGraph fan-out) → results merge back into the Validation Layer

### 2.2 Full Contradiction Engine (LangGraph Agent)
Replace the simple rule-based Phase 1 checker with a proper LangGraph agent:
- **Nodes in the contradiction agent:**
  1. `gather_facts`: Retrieve all claims related to the detected conflict from the graph
  2. `reason_about_intent`: LLM prompt — "Is this a factual error or intentional narrative tension?"
  3. `route_by_confidence`: Branch to human_review, auto_flag, or discard
  4. `update_belief`: If resolved, update the graph accordingly
  5. `human_interrupt`: LangGraph `interrupt_before` for human-review cases
- Distinguish: factual contradiction vs. unreliable narrator choice vs. intentional dramatic tension vs. author error

### 2.3 Knowledge State Tracker (Full Implementation)
- After timeline construction, build the knowledge matrix:
  ```
  For each significant fact F:
    For each character C:
      { knows: bool, since_chapter: int, how_learned: string }
  ```
- Knowledge violation detector: scan all character dialogue and actions against the knowledge matrix
- **API:** `GET /projects/:id/knowledge-matrix?character=:charId&chapter=:chapterNum`

### 2.4 Timeline Engine (Full Implementation)
- Build dual timeline (story-time vs. narrative-time) for all extracted events
- Time gap detector: scan consecutive chapters for time references, flag unexplained gaps > threshold
- Flashback detector: pattern matching on temporal language ("three years earlier", "she remembered when", etc.) + LLM classification
- Character location tracker: for each chapter, map every character to their inferred location
- **API:** `GET /projects/:id/timeline?from=:storyTime&to=:storyTime`

### 2.5 World Building Database (Full Implementation)
- Location Registry: full profiles with all scene associations
- Object chain-of-custody: directed graph of object transfers with timestamps
- World rules: LLM extraction pass + author manual entry UI
- Rule violation detector: for each world rule, scan subsequent chapters for violations

### 2.6 Version and Snapshot Management
- Auto-snapshot on every writing pause (debounced 30-second idle timer)
- Manuscript version diff (unified diff format stored in DB, rendered in frontend)
- Story graph versioned on every auto-commit (graph snapshots via Postgres JSONB serialization)
- **API:** `GET /projects/:id/versions`, `POST /projects/:id/versions/:versionId/restore`

### 2.7 Human Review Interface
- Dedicated Review Queue page in the UI
- Show each medium-confidence finding with: the issue, the evidence, the AI's reasoning
- Author actions: Accept / Reject / Edit / Mark Intentional
- Accepted → Canon Graph write; Rejected → logged; Intentional → suppression record in Canon Graph

### 2.8 Rich Frontend Views
- **Timeline View:** Implement interactive timeline with Cytoscape.js or a custom SVG/Canvas timeline. Characters as horizontal lanes. Playhead scrubber. Toggle story-time vs. narrative-time.
- **Graph View:** Full relationship graph with Cytoscape.js. Node types, edge types, filters. Click node → character card. Click edge → relationship history.
- **World View:** Tabbed interface for Locations, Objects, World Rules. Searchable. Timeline-aware.
- **Issues View (v2):** Full filtering, severity badges, review queue integration, bulk actions.
- **Character View (v2):** Click-through to full profile. Inline relationship list with graph links.

### 2.9 Story Bible Export (v1)
- Generate a structured Markdown story bible from the graph data
- Sections: Characters, Relationships, Locations, Objects, Timeline, World Rules, Open Issues
- Download as `.md` or `.pdf`

**Phase 2 Success Criteria:**
- All four AI analysis modules produce outputs for a test manuscript with ground-truth annotations
- Contradiction engine correctly distinguishes intentional narrative tension from author errors in a test set (target: >75% precision)
- Knowledge state violations correctly detected for mystery/thriller test cases
- Timeline view renders correctly with 20+ characters across 30+ chapters
- Graph view renders with 50+ nodes and 100+ edges without performance issues
- Story Bible export generates a readable, accurate document from a real manuscript

---

## Phase 3 — Live Writing Mode and Advanced Features
**Duration: 8 weeks**  
**Goal:** Write inside the tool. Get real-time intelligence. The product is now differentiated and shippable to early adopters.

---

### 3.1 Rich Text Editor Integration (ProseMirror / TipTap)
- Integrate TipTap (built on ProseMirror) as the in-app writing editor
- Custom extensions:
  - **Character Tag Extension:** Highlight detected character names in the manuscript text
  - **Issue Annotation Extension:** Show issue markers in the editor margin (like VS Code problem indicators)
  - **Scene Break Extension:** Insert and detect scene break markers
- Chapter/scene binder sidebar: Scrivener-style navigation panel with drag-to-reorder chapters
- Word count, scene count, chapter count in the status bar
- Auto-save: debounce + backend `PATCH /manuscripts/:id/content` every 2 seconds of inactivity

### 3.2 Real-Time Analysis Pipeline
- **Frontend → Backend:** Send `paragraph_edited` events over WebSocket on every editor change
- **Backend Event Router:** Debounce (2-second window), compute diff (character-level changed spans), prioritize queue
- **Backend → Redis Streams:** Publish debounced, diffed event
- **AI Service Consumer:** Consume event → run targeted Context Construction + Analysis (only affected modules) → produce results
- **Backend → Frontend:** Push analysis results back over WebSocket → frontend applies inline annotations
- End-to-end target latency: < 5 seconds (paragraph edit → annotation visible)

### 3.3 Context Construction Layer (Full Implementation)
- **Targeted Retrieval:** Given a changed chunk's entity mentions, retrieve their full graph neighborhoods from Apache AGE
- **Vector Search:** pgvector ANN search for top-5 semantically similar chunks from the rest of the manuscript
- **Context Builder:** Assemble a structured context packet:
  ```python
  {
    "changed_chunk": {...},
    "graph_facts": [...],       # from Apache AGE
    "similar_passages": [...],  # from pgvector
    "timeline_position": {...},
    "world_rules": [...],
    "author_preferences": {...}
  }
  ```
- **Analysis Planner:** Rule-based module selector — if a character description changed → run Character + Consistency modules; if a location was edited → run World + Timeline modules; etc.
- **Custom Context Rules:** Author can define per-project context overrides stored in project settings

### 3.4 Semantic Caching (Phase 3 — Cost Critical)
- Cache analysis results in Redis keyed by: `sha256(chunk_content) + module_name + model_version`
- TTL: 24 hours, invalidated immediately when the underlying chunk changes
- Cache hit rate monitoring (log and alert if hit rate drops below 40%)
- LLM response caching for identical queries within a session (Redis, 1-hour TTL)

### 3.5 Tiered Model Routing
- Configuration map: `{task_type → {primary_model, fallback_model, max_tokens}}`
  - `entity_extraction` → GPT-4o-mini (fast, cheap)
  - `contradiction_reasoning` → Claude Sonnet
  - `knowledge_state_inference` → Claude Sonnet
  - `story_qa` → Claude Sonnet (with Haiku fallback on budget exceeded)
  - `embedding` → OpenAI `text-embedding-3-small`
- Token usage tracking per call, aggregated per user per day, stored in `token_usage_log` table

### 3.6 Story Query Interface (Chat)
- **Frontend:** Full-screen chat UI with conversation history, citation cards, follow-up input
- **Backend:** `POST /projects/:id/query` → gRPC call to Python AI Service `QueryService.AskQuestion`
- **Python AI Service — Query Agent (LangGraph):**
  1. `parse_intent`: Classify query type — factual, semantic, reasoning, multi-hop
  2. `graph_lookup`: For factual queries, run Cypher query against Apache AGE canon graph
  3. `vector_search`: For semantic queries, pgvector ANN search
  4. `synthesis`: LLM synthesizes an answer from retrieved evidence
  5. `citation_formatter`: Format response with chapter/paragraph citations
- Conversation context persisted per session (Redis, 30-minute TTL)

### 3.7 Manuscript View + Map View Split
- Two-panel layout: editor (left 60%) + context panel (right 40%)
- Context panel tabs: Character Card | Timeline Position | Issues | Writing Context
- Click paragraph in editor → context panel updates to reflect that point in the story
- Highlight character name → jump to character card in context panel
- Toggle: hide map panel for full-screen writing focus

### 3.8 Feedback and Correction Loop (Full Implementation)
- **UI:** Inline "Edit this" button on any AI-extracted fact in character cards or issue panel
- **Backend:** `PATCH /projects/:id/facts/:factId` → correction event published to Redis Streams
- **AI Service:** Correction consumer → update Canon Graph → re-evaluate dependent facts → publish new analysis results
- Learning signal storage: `correction_log(fact_id, original_value, corrected_value, user_id, timestamp)`

### 3.9 LLM Cost Monitoring Dashboard
- Backend: expose `GET /users/me/usage` with daily/monthly token consumption by module
- Frontend: simple usage chart (token consumption over time, by feature)
- Alert at 80% of daily budget (in-app notification)
- Automatic model downgrade at 95% of daily budget (switch to Haiku/mini)

**Phase 3 Success Criteria:**
- Author writes a paragraph, sees an inline contradiction warning within 5 seconds
- Chat query returns an answer with correct citation within 8 seconds
- Manuscript + map split view is stable with a 100K+ word manuscript
- Semantic cache achieves >40% hit rate in a simulated writing session
- Token consumption per writing session is within projected unit economics

---

## Phase 4 — Series Support, Collaboration Foundation, and Growth
**Duration: 8 weeks**  
**Goal:** Series multi-book support. First collaboration features. Public launch readiness. Billing and monetization.

---

### 4.1 Series and Multi-Book Support
- **Data model:** `series` table linking multiple `project` records. Shared `series_canon_graph` subgraph in Apache AGE
- **Cross-book entity resolution:** When a character or location appears in multiple books, merge their records into a series-level entity node
- **Cross-book consistency checks:** Run contradiction engine across book boundaries
- **Series timeline:** Unified timeline rendering spanning all books in a series
- **API:** `POST /series`, `GET /series/:id`, `POST /series/:id/books`, `GET /series/:id/timeline`

### 4.2 Collaboration Foundation (Co-Author v1)
- Add `project_members` table with roles: `OWNER`, `CO_AUTHOR`, `EDITOR`, `VIEWER`
- Per-role permission checks on all project endpoints
- **Editor Mode:** Editors can add annotations to manuscript paragraphs (stored separately from AI findings)
- Activity feed: show what each collaborator changed and when
- Real-time presence indicators (WebSocket-based): "Sarah is editing Chapter 3"
- Full real-time collaborative editing (OT/CRDT) is deferred to post-launch — v1 is turn-based with conflict warnings

### 4.3 Billing and Subscription Management
- Integrate Stripe: Checkout, Billing Portal, Webhooks
- Implement tier enforcement: Free / Pro / Studio limits enforced at the API layer
- Token budget enforcement per tier
- Usage tracking dashboard (Phase 3 built the data; this phase adds the billing-aware UI)
- One-time purchase option for Pro (via Stripe Payment Links or Lemon Squeezy as alternative)
- Upgrade prompts at natural limit-hit moments (not intrusive pop-ups)

### 4.4 Notifications System
- In-app notification center: new contradictions detected, analysis complete, review queue items, collaborator activity
- Email notifications: weekly story health digest, major contradiction detected
- Notification preferences (in-app toggle per notification type)
- Backend: `notifications` table + WebSocket push for real-time delivery

### 4.5 Full Story Bible Export
- Enhanced export: full PDF rendering with styled sections, table of contents, cover page with manuscript title
- DOCX export using python-docx
- Notion import via Notion API
- Custom export templates (Pro feature): author selects which sections to include and the order

### 4.6 Privacy and Security Hardening
- Penetration test / security audit before public launch
- Data isolation audit: confirm no cross-user data leakage in graph queries (Cypher queries must include user-scoped graph names)
- "No training" policy enforcement: configure all LLM API calls with `no-training` flags; document this process in a public-facing trust page
- Full GDPR flow: data export endpoint + account deletion with cascade
- Encryption key rotation policy

### 4.7 Observability and Operations
- Structured logging: all services emit JSON logs (Go: zerolog; Python: structlog)
- Distributed tracing: OpenTelemetry → Jaeger / Honeycomb (trace a request from editor keystroke to AI annotation back to frontend)
- Metrics: Prometheus + Grafana dashboards for: API latency (p50/p95/p99), analysis pipeline throughput, cache hit rates, LLM cost per user, DB query times
- Alerting: PagerDuty / Opsgenie rules for: API error rate >1%, AI pipeline queue depth >500 events, Redis memory >80%
- Runbooks for common failure modes: Redis OOM, Postgres connection pool exhaustion, AI service crash

### 4.8 Performance Optimization Pass
- Postgres query plan analysis: add missing indexes, optimize slow Cypher traversals
- pgvector index tuning: IVFFlat or HNSW index for production-scale embedding search
- Go service profiling: identify and fix memory leaks or goroutine leaks
- Python AI service: profile asyncio task scheduling, identify blocking calls
- Frontend bundle optimization: lazy-load heavy libraries (Cytoscape.js, chart libraries)
- Load testing: simulate 100 concurrent active writing sessions, measure and resolve bottlenecks

**Phase 4 Success Criteria:**
- Series with 3 books (300K total words) runs cross-book consistency check successfully
- Billing correctly enforces Free/Pro limits on manuscript length and feature access
- 100 concurrent writing sessions in load test with p95 annotation latency < 8 seconds
- Security audit passes with no critical or high findings
- Distributed trace covers the full request lifecycle from editor event to AI annotation

---

## Cross-Cutting Concerns (All Phases)

### Testing Strategy

| Layer | Framework | What to Test |
|-------|-----------|--------------|
| Go Backend | `testing` + `testify` | API handlers, auth middleware, event routing logic, DB queries |
| Python AI Service | `pytest` + `pytest-asyncio` | Entity extraction accuracy, LangGraph graph execution, LLM mock responses |
| Frontend | Vitest + React Testing Library | Component rendering, form validation, WebSocket mock |
| End-to-End | Playwright | Critical user flows: import → view characters → see issues; write paragraph → get annotation |
| AI Quality | Custom eval harness | Ground-truth test manuscripts with known contradictions; measure precision/recall |

### Error Handling Philosophy
- **AI failures are non-fatal.** If the AI service is down, the editor still works, saves, and imports. Analysis is queued and retried when the service recovers.
- **Graceful degradation:** If context construction fails, fall back to a smaller context window rather than failing the analysis entirely
- **Dead letter queue:** Events that fail after 3 retries go to a dead letter stream (`events:dlq`). An ops dashboard shows DLQ depth and allows manual replay.

### Security Baseline (Maintained Throughout)
- All endpoints require valid JWT (except `/health` and auth endpoints)
- Input validation on all user-supplied content (manuscript text, project names, query strings)
- SQL injection prevention: parameterized queries everywhere; Cypher injection prevention: parameterized Cypher
- File upload validation: MIME type check + file size limits + virus scan (ClamAV or cloud-based)
- Rate limiting on all endpoints: per-user sliding window in Redis

---

## Tech Decisions and Architecture Notes

### Why Apache AGE over Neo4j
The original documents considered multiple graph DB options. **Apache AGE on Postgres** is the right choice for the early stages because:
- You already need Postgres for users/billing/manuscripts — this is one less service to run and operate
- Your three logical graphs (story, canon, belief) map cleanly to three AGE graph names in one DB
- Cypher query syntax is identical to Neo4j — migration to Neo4j is possible later if scale demands it
- No additional infrastructure cost or operational overhead for a small team

### Why Redis Streams over Kafka
- Kafka is the right choice at 10M+ events/day and multiple consuming teams. You are not there.
- Redis Streams provide consumer groups, acknowledgment, and replay — which are the specific Kafka features you need
- You already need Redis for debounce state and caching. One less service = faster development.

### Why gRPC between Go and Python
- Context packets (passages + graph facts + timeline data) are large structured objects — gRPC binary encoding is more efficient than JSON
- Server-side streaming lets the AI service push results module-by-module as they complete (progressive updates to the frontend)
- Strong schema enforcement via proto files prevents silent API drift between teams

### Architecture Corrections from Original Documents
1. **Fixed:** Event Router now publishes to Redis Streams; AI service consumes from streams. Original diagram showed direct calls.
2. **Fixed:** LangGraph is used selectively — only for cyclic agent workflows (contradiction engine, story Q&A, human review loop). Simple DAG pipelines use asyncio. Original documents proposed using LangGraph for everything.
3. **Fixed:** pgvector and Apache AGE live in the same Postgres instance (not separate database boxes). The original architecture diagram showed them as separate infrastructure blocks, which implied separate deployments.
4. **Note:** `archtitecture.md` filename has a typo — intended filename is `architecture.md`. Suggest renaming before committing to the repo.

---

## Milestone Summary

| Phase | Duration | What You Have at the End |
|-------|----------|--------------------------|
| **Phase 0** | 4 weeks | Full dev environment, all services talking to each other, auth working |
| **Phase 1** | 6 weeks | Import manuscript → see characters + basic issues. Usable by alpha testers. |
| **Phase 2** | 8 weeks | Full intelligence layer: timeline, knowledge state, world DB, plot threads. Polished UI. Beta-ready. |
| **Phase 3** | 8 weeks | Live writing mode with real-time annotations. Story chat. Cost management. Early adopter launch. |
| **Phase 4** | 8 weeks | Series support. Billing. Collaboration. Observability. **Public launch ready.** |

**Total: ~34 weeks**

---

*Last updated: 2026-08-21 | Version: 0.1 — Pre-Engineering Review*
