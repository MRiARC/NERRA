# NERRA MVP — Implementation Blueprint

> **Status:** Proposed — awaiting verification. This file is the contract between the team lead and the implementer. Once approved, code must match this file; if we deviate, we update this file first.
>
> **Companion docs:** `product.md` (vision) · `features.md` (full feature universe) · `implementation_phases.md` (production-scale plan — *background reading only, we are not building this*) · `techstack.md` (same)

---

## 1. What We Are Building

**NERRA** is a Story Intelligence Engine: the author imports a manuscript, and the system automatically builds a queryable map of the story world — characters, relationships, locations, objects, events, factual claims, knowledge states — and flags contradictions.

This MVP is the **simplest honest version** of that idea: a FastAPI backend (auth + CRUD + AI pipeline + agents in **one app**), Postgres 16 with pgvector, Claude for extraction and chat, and a LangGraph agent for story Q&A. No frontend in this phase (built later); verification happens through Swagger UI, curl, and pytest. The codebase doubles as a **learning playground**: the infrastructure is complete, feature logic is left as guided `# YOUR CODE` exercises for four team members (two of whom are new to the architecture).

| In scope | Out of scope (this MVP) |
|---|---|
| Import `.txt` / `.md` / `.docx` or paste text | `.pdf` import, live-writing mode, real-time annotations |
| Character / relationship / location / object / event extraction | Causality graphs, tension/pacing scores |
| Consistency checker (contradictions, knowledge violations, dangling objects) | LangGraph "intent reasoning" for contradictions (stretch goal) |
| Knowledge-state tracking (who learned what, when) | Full knowledge matrix UI, POV/narrator modeling |
| Story chat with citations (LangGraph + pgvector RAG) | Streaming responses, conversation memory beyond session |
| JWT auth (email + password), worked example | OAuth, refresh tokens, roles, collaboration, series support |
| Background pipeline with progress polling | Celery/Redis queues, WebSockets, paragraph-level diffing |
| Series / billing / deployment | — all cut |

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    FastAPI app (one process)              │
│                                                          │
│  routers/            services/            agents/        │
│  auth ▪ projects     extractor.py         story_chat.py  │
│  manuscripts ▪       consistency.py       (LangGraph:    │
│  characters ▪        embedder.py           retrieve →    │
│  events ▪ issues     pipeline.py           answer →      │
│  world ▪ knowledge   (BackgroundTasks)     cite)         │
│  chat                                                     │
└───────────────┬──────────────────────────┬───────────────┘
                │                          │
        SQLAlchemy                   Anthropic SDK
                │                          │
┌───────────────▼──────────┐   ┌───────────▼─────────────┐
│  Postgres 16 (Docker)    │   │  Claude API             │
│  • relational (13 tables)│   │  • Haiku  → extraction  │
│  • pgvector (embeddings) │   │  • Sonnet → chat agent  │
└──────────────────────────┘   └─────────────────────────┘
         ▲
         │  sentence-transformers (all-MiniLM-L6-v2, local, free)
         └── embeddings computed in-process — Anthropic has no
             embedding API, so this runs on-device, no extra key
```

**Component responsibilities:**

| Component | Responsibility |
|---|---|
| `routers/` | HTTP layer only: parse request, call a service, return schema. No business logic. |
| `services/pipeline.py` | Orchestrates import → chapters → extraction → persistence → consistency pass. Runs as a FastAPI `BackgroundTask`; updates progress row-by-row so the frontend (later) can poll. |
| `services/extractor.py` | One Claude call per chapter → structured JSON (Pydantic-validated) → rows in tables. |
| `services/consistency.py` | Pure-Python rules over claims/knowledge data. No LLM. Deterministic and unit-testable. |
| `services/embedder.py` | Wraps sentence-transformers; encode chapter text → 384-dim vector → pgvector. |
| `agents/story_chat.py` | The only LangGraph usage: a small state graph for retrieval-augmented story Q&A. |
| `auth/` | Fully implemented by me — the worked example the team reads and copies. |

**How this maps to the full architecture in `implementation_phases.md`:**

| Full-scale design | Our MVP | Why |
|---|---|---|
| Go backend + Python AI service, Redis Streams between | Single FastAPI app, in-process `BackgroundTasks` | One deployable, one language per layer; queues are overkill for demo scale |
| Apache AGE graph DB (story/canon/belief graphs) | Plain relational tables (`characters`, `relationships`, `claims`…) | A graph DB earns its keep at graph-query complexity we don't have yet; tables are teachable and queryable |
| gRPC contract between services | Direct function calls | No network boundary exists anymore |
| LangGraph everywhere | LangGraph for the chat agent only | Extraction is a straight pipeline; the chat agent is the genuinely agentic part |
| Paragraph-level incremental diffing | **Chapter-level** re-analysis with content-hash caching | Same idea (don't reprocess what didn't change) at a granularity that's simple and testable |
| pgvector + Postgres | pgvector + Postgres ✓ (kept as-is) | Already the pragmatic choice |

---

## 3. Data Model (13 tables)

All extraction-derived rows carry their **chapter citation** — provenance is non-negotiable; it's what makes the demo credible.

| Table | Key fields | Notes |
|---|---|---|
| `users` | id, email (unique), password_hash, display_name | bcrypt hashes |
| `projects` | id, owner_id → users, title, genre | |
| `manuscripts` | id, project_id, title, raw_text, status (`pending/processing/ready/failed`), chapters_done, chapters_total, error_note | `status` powers polling |
| `chapter_analyses` | id, manuscript_id, chapter_number, content_hash, result (JSONB) | **cache + audit**: re-analysis skips chapters whose hash is unchanged |
| `chunks` | id, manuscript_id, chapter_number, content, content_hash, embedding vector(384) | chapter = analysis unit |
| `characters` | id, project_id, name, aliases (JSONB), description, first_chapter, last_chapter, status (`alive/dead/unknown`) | deduped by name/alias across chapters |
| `relationships` | id, project_id, character_a_id, character_b_id, type, description, chapter | type ∈ family/friend/enemy/romantic/professional/mentor/unknown |
| `locations` | id, project_id, name, description, first_chapter | |
| `objects` | id, project_id, name, description, first_chapter | dangling-object rule uses mention spread |
| `events` | id, project_id, chapter_number, summary, participants (JSONB names), location | the timeline source |
| `claims` | id, project_id, subject, attribute, value, chapter, evidence_quote, status (`active/superseded/intentional`) | the consistency engine's fuel |
| `knowledge_updates` | id, project_id, character, fact, chapter, how_learned (`witnessed/told/deduced/overheard`) | powers knowledge violations |
| `issues` | id, project_id, type (`contradiction/knowledge_violation/unresolved_thread/continuity_note`), severity (`red/yellow/green/blue`), status (`open/accepted/rejected/intentional`), description, evidence (JSONB), claim_a_id, claim_b_id | the killer feature's output |

---

## 4. API Surface

All `/projects/...` routes require a valid JWT (dependency-injected — the worked example pattern).

| Method & path | Purpose | Implemented by |
|---|---|---|
| `POST /auth/register`, `POST /auth/login` | JWT auth | **me** (worked example) |
| `POST/GET /projects`, `GET/PATCH/DELETE /projects/{id}` | Project CRUD | **Task 01** |
| `POST /projects/{id}/manuscripts/import` | Upload file or paste text → starts pipeline | spine by me, splitter in **Task 02** |
| `GET /manuscripts/{id}/status` | `{status, chapters_done, chapters_total, error_note}` for polling | me (trivial), consumes 04's progress writes |
| `POST /manuscripts/{id}/reanalyze` | Re-run one chapter (clears its cache entry) | **Task 04** |
| `GET /projects/{id}/characters`, `GET /characters/{id}` | Character list + profile | **Task 03** writes, **Task 01**-style read endpoints |
| `GET /projects/{id}/relationships` | Relationship list | Task 01 pattern |
| `GET /projects/{id}/events?character=` | Timeline (chapter-ordered events) | Task 01 pattern |
| `GET /projects/{id}/world` | Locations + objects | Task 01 pattern |
| `GET /projects/{id}/issues`, `PATCH /issues/{id}` | Issue list; accept / reject / **mark intentional** | reads from **Task 05** |
| `GET /projects/{id}/knowledge` | Per-character known-facts view | reads from **Task 03** |
| `POST /projects/{id}/chat` | `{question}` → `{answer, citations[]}` | **Task 06** |

**Every stub endpoint responds** with `501 {"detail": "Not implemented yet — see docs/tasks/0X-….md"}` — the app boots and is fully explorable at every stage of development.

---

## 5. The AI Pipeline

### 5.1 Import → chapters (Task 02)
1. Text stored on `manuscripts.raw_text`; status → `processing`; `BackgroundTasks` job starts.
2. **Chapter splitter** (pure Python, learner task): regex heuristics for common heading patterns (`Chapter 12`, `CHAPTER XII`, `12. Title`); if nothing matches, the whole text is one chapter. Deterministic → pytest-friendly. (Stretch: LLM-assisted split for messy manuscripts.)

### 5.2 Per-chapter extraction (Task 03)
**One Claude Haiku call per chapter** (cost control by design) with tool-use/JSON structured output. The response schema (Pydantic-enforced):

```json
{
  "characters":  [{ "name", "aliases", "description", "status" }],
  "relationships": [{ "character_a", "character_b", "type", "description" }],
  "locations":   [{ "name", "description" }],
  "objects":     [{ "name", "description" }],
  "events":      [{ "summary", "participants", "location" }],
  "claims":      [{ "subject", "attribute", "value", "evidence_quote" }],
  "knowledge":   [{ "character", "fact", "how_learned" }]
}
```

**Hallucination guard (the cheap-but-impressive trick):** every `evidence_quote` must actually appear in that chapter's text (normalized fuzzy substring check). Quotes that don't match → claim dropped and logged. Schema violations → dropped. This is our MVP version of the production validation layer.

Context sent per call is deliberately small: the chapter text + a one-line character roster so far (name + aliases). **We never send the whole manuscript** — our simplified answer to the context-window concern.

Dedup on write: character matched by lowercase name/alias → update existing row; otherwise insert. `first_chapter` / `last_chapter` maintained automatically.

### 5.3 Embedding (built by me — plumbing)
Each chapter embedded with local `all-MiniLM-L6-v2` (384-dim) → `chunks.embedding`. Content-hash cached like extraction.

### 5.4 Pipeline orchestration (Task 04)
Loop chapters → skip cached (hash match) → extract → persist → update `chapters_done` (commit per chapter so polling shows live progress). Failure → `status=failed` with `error_note`; processed chapters stay; `POST /manuscripts/{id}/reanalyze` re-runs one chapter. On completion → run consistency pass → `status=ready`.

### 5.5 Consistency rules (Task 05) — pure Python, no LLM
| Rule | Logic | Issue produced |
|---|---|---|
| Contradiction | Group `claims` by (normalized subject, attribute); two different values in different chapters | 🔴 `contradiction` with both citations |
| Knowledge violation | Character *references* a fact at chapter M but `knowledge_updates` says they learned it at chapter N > M | 🔵 `knowledge_violation` |
| Dangling object | Object mentioned in only one chapter and never again | 🟢 `unresolved_thread` |
| Continued flag | The same claim (subject+attribute+value) repeated across ≥ 2 distinct chapters | 🔵 `continuity_note` (informational) |

Every issue can be **accepted / rejected / marked intentional** (stored, so it stops re-firing) — our simplified confidence routing: instead of AI-judged confidence tiers, the human is the filter. (Stretch: Claude-judged confidence score per issue.)

### 5.6 Story chat agent (Task 06) — LangGraph

```
START → retrieve → answer → END
                 (stretch: → grade_context → retrieve loop)
```

| Node | Does |
|---|---|
| `retrieve` | pgvector top-4 similar chapters + character roster + top claims from DB |
| `answer` | Claude Sonnet with strict instruction: answer **only** from provided context; cite chapters inline |

Response: `{answer, citations: [{chapter, excerpt}]}`. The graph shape is real LangGraph (`StateGraph`) so the stretch node slots in without restructuring — that's *why* we use LangGraph here and not a plain function.

---

## 6. Engineering Concerns — Simplified, Not Ignored

From `product.md` / `features.md` / `techstack.md`, right-sized for a college MVP. **This table is the "we know what production would need" story for the report/viva.**

| Concern (from our docs) | Production answer | Our MVP answer |
|---|---|---|
| **Context management** — can't stuff 100k words in a prompt | Context builder + targeted graph retrieval | Fixed compact context: chapter text + character roster only. Whole manuscript is *never* sent |
| **Hallucinated facts** | Multi-stage validation layer | Pydantic schema check + evidence-quote-must-exist-in-chapter check; violations dropped & logged |
| **Contradiction false positives** | LLM intent reasoning + confidence tiers | Human override: accept / reject / mark intentional, persisted |
| **LLM cost explosion** | Semantic caching + tiered routing + budgets | One Haiku call per chapter + content-hash cache (`chapter_analyses`) — re-imports of unchanged chapters cost **zero** |
| **Incremental processing** | Paragraph-level diffing, Redis Streams | Chapter-level re-analysis with hash skipping; `reanalyze` endpoint |
| **Privacy of unpublished manuscripts** | Local mode, E2EE, no-training flags | Everything local: Postgres in Docker, embeddings computed on-device; only chapter text goes to Claude API; keys in `.env`, never committed |
| **Performance at scale** | Queues, pooling, load tests | BackgroundTasks + polling; honest target: demo-scale (~≤50k words) |

---

## 7. The Playground Format

**Rule #1: the app always boots and runs**, regardless of how many `# YOUR CODE` gaps remain.

| Built completely by me (the spine) | Left for the team (signatures + docstrings + `# YOUR CODE HERE`) |
|---|---|
| docker-compose (Postgres + pgvector), `.env.example`, `Makefile` | Task 01 — Projects CRUD (routers + service) |
| FastAPI bootstrap, config, DB session, CORS, error handlers | Task 02 — Chapter splitter (pure Python) |
| **All 13 SQLAlchemy models** (the map of what they build toward) | Task 03 — Claude extraction + hallucination guard |
| **Auth package, fully working** — the worked example | Task 04 — Pipeline orchestration + progress + reanalyze |
| All routers registered with real request/response schemas; stubs return `501` + pointer to their task doc | Task 05 — Consistency rules + issue override endpoints |
| `services/embedder.py`, project scaffolding, pytest infra | Task 06 — LangGraph chat agent nodes |
| `docs/ARCHITECTURE_GUIDE.md` (request lifecycle tour, for beginners) | |

**Task sequence** (each MD doc: difficulty tag → concept explainer → requirements checklist → exact file/line TODOs → **See it working** (Swagger UI steps + curl with expected JSON) → questions-to-answer → stretch goal):

```
01 Projects CRUD ....... Easy   ── immediately (copies the auth pattern)
02 Import & split ...... Easy   ── needs 01
03 Extraction .......... Medium ── needs 02 (lights up characters/events/world)
04 Pipeline ............ Medium ── needs 03 ┓ two members work
05 Consistency ......... Medium ── needs 03 ┛ in PARALLEL here
06 Story chat agent .... Hard   ── needs 03, do last
```

**Verification:** pytest files per logic task (fail with clear messages until correct — "make the tests pass"), curl blocks with expected JSON, and Swagger UI as the visual check. **Solutions live in a gitignored `solutions/` folder only the lead controls** (never pushed, never on the learners' path) — the working tree always stays at boilerplate state.

---

## 8. Testing Strategy

| What | How |
|---|---|
| Chapter splitter | pytest: sample text with known headings → exact chapter boundaries (incl. no-heading fallback) |
| Consistency rules | pytest: fixture claims/knowledge rows → expected issues (the core logic tests) |
| Hallucination guard | pytest: fake extraction payloads — valid quote passes, invented quote is dropped |
| Auth (worked example) | pytest via FastAPI `TestClient`: register → login → access protected route → 401 without token |
| API endpoints | `TestClient` + transaction-rolled-back test DB |
| Chat agent | mocked embedder + mocked Claude — tests graph wiring and citation format, not the LLM |

---

## 9. Limitations (Honest List)

1. **Chapter is the smallest analysis unit** — no paragraph-level incremental analysis.
2. **English only**, conventional chapter headings expected (fallback exists, detection is heuristic).
3. **Contradiction detection is attribute-based** (`subject + attribute + value`); complex logical/plot contradictions need the Phase-2-style reasoning agent.
4. **No real-time anything** — analysis is batch-after-import; re-analysis is manual.
5. **No refresh tokens / OAuth / roles** — simple JWT (60-min expiry), one user owns their projects.
6. **`.pdf` import skipped** (`.txt` / `.md` / `.docx` only).
7. **Local embedding model** (`all-MiniLM-L6-v2`) — good enough for demo retrieval, not state of the art.
8. **Demo-scale performance** — a 100k-word import would take minutes of Claude calls; we don't optimize beyond hash-caching.
9. **Single-process BackgroundTasks** — a server restart mid-pipeline marks the manuscript `failed` (reanalyze recovers).
10. **No frontend, no deployment story** in this phase.

---

## 10. Repo Layout (what will exist after the build)

```
nerra/
├── mvp_blueprint.md            ← this file
├── docker-compose.yml          postgres 16 + pgvector
├── .env.example                DATABASE_URL, ANTHROPIC_API_KEY, JWT_SECRET, model names
├── Makefile                    up · api · test · reset-db
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py             bootstrap + router registration        [done]
│   │   ├── config.py           pydantic-settings                      [done]
│   │   ├── database.py         engine + session dependency            [done]
│   │   ├── models.py           13 tables                              [done]
│   │   ├── schemas.py          Pydantic request/response models       [done]
│   │   ├── auth/               register, login, JWT dependency        [done — worked example]
│   │   ├── routers/            projects (T01) · story (characters, events,
│   │   │                       world, knowledge, issues — T01) ·
│   │   │                       manuscripts (built) · chat (wraps T06)
│   │   │                       [schemas done · stub bodies = tasks]
│   │   ├── services/
│   │   │   ├── embedder.py     sentence-transformers wrapper          [done]
│   │   │   ├── extractor.py                                           [# YOUR CODE — Task 03]
│   │   │   ├── pipeline.py                                            [# YOUR CODE — Task 04]
│   │   │   └── consistency.py                                         [# YOUR CODE — Task 05]
│   │   └── agents/
│   │       └── story_chat.py   LangGraph StateGraph skeleton          [# YOUR CODE — Task 06]
│   └── tests/                  pytest per task + auth example         [done]
└── docs/
    ├── ARCHITECTURE_GUIDE.md   request-lifecycle tour for beginners   [done]
    └── tasks/
        ├── 01-projects-crud.md  …  06-story-chat-agent.md             [done]
```

---

## 11. Definition of Done (verify me against this)

- [ ] Fresh clone: `docker compose up -d` → `pip install -r backend/requirements.txt` → `make api` → Swagger UI at `/docs` loads, register + login works
- [ ] Import a sample `.txt` → pipeline runs → characters/events/claims land in Postgres (via Task 03+04 when done; stub path before)
- [ ] All 6 task MDs exist with requirements, TODO spots, curl + Swagger verification, questions, stretch goals
- [ ] `pytest` passes **except** the learner-task tests, which fail with instructive messages
- [ ] Every stub endpoint returns its `501` + task pointer
- [ ] A gitignored `solutions/` folder exists at the repo root with the lead's verified solutions; the working tree carries zero solution code
- [ ] `ARCHITECTURE_GUIDE.md` explains the request lifecycle using the auth example, readable by a beginner

---

## 12. What Makes This Score Well (report / viva highlights)

- **RAG done properly:** pgvector semantic retrieval + grounded answers + citations (not a raw chatbot)
- **Agentic workflow:** a real LangGraph state graph, with an argued reason for where agents are and aren't used
- **Structured outputs + validation:** LLM output treated as untrusted input — schema-checked and evidence-grounded before it touches the database
- **Deliberate simplification:** every production concern (context, cost, hallucination, privacy, incrementality) has a documented "full-scale vs. MVP" answer — Section 6 is that story
- **Engineering hygiene:** JWT auth, layered architecture (router → service → model), background jobs with observable progress, content-hash caching, pytest
- **The demo:** import a short story with a planted contradiction ("green eyes" ch. 1 → "blue eyes" ch. 3) → watch the issue appear with both citations, then ask the chat agent about it
