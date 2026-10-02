# NERRA Architecture Guide — for new team members

> This explains how the backend is put together and how a request travels
> through it. No prior architecture knowledge assumed. Everything is shown
> through the one feature that's fully built: **auth**. Read `app/auth/`
> alongside this — it's only three short files.

---

## 1. The big picture

NERRA is one Python web application (FastAPI) backed by one Postgres
database. There is no magic: an HTTP request arrives, passes through a few
layers, each with one job, and a response goes back.

```
HTTP request
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ ROUTER        app/routers/*.py, app/auth/router.py          │
│ "What HTTP endpoint is this? Is the caller logged in?        │
│  Does the request body have the right shape?"                │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ SERVICE       app/services/*.py, app/agents/*.py            │
│ "What does the product actually DO?"                         │
│ extraction, consistency rules, pipeline, chat agent          │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ MODEL         app/models.py                                  │
│ "How is the data stored?" — 13 tables, one Python class each │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
                    Postgres (Docker)
```

Why layers? So changes stay local. A new endpoint touches a router; a new
rule touches a service; a new piece of data touches a model. Nothing bleeds.

## 2. The five ideas you need (and only five)

### 2.1 Models = tables (`app/models.py`)

Each class = one table; each `Mapped[...]` line = one column. Example:

```python
class Claim(Base):
    __tablename__ = "claims"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    subject: Mapped[str]
    attribute: Mapped[str]
    value: Mapped[str]
    chapter: Mapped[int]
```

`Base.metadata.create_all()` (runs at startup, in `main.py`) turns every
class into a real `CREATE TABLE`. To see the data: `make up`, then connect
with any Postgres client to `localhost:5432` (user `nerra`).

### 2.2 Sessions = your database handle (`app/database.py`)

You never open connections yourself. Routes declare:

```python
def my_route(db: Session = Depends(get_db)):
    rows = db.query(Claim).filter(...).all()
```

FastAPI calls `get_db()`, hands your function a session, and closes it when
the request ends. That's *dependency injection* — you declare what you need,
the framework provides it. You'll see `Depends(...)` everywhere; it always
means "the framework fills this argument in for me".

### 2.3 Schemas = request/response shapes (`app/schemas.py`)

Pydantic classes with two jobs:

- **Incoming**: `ProjectCreate` requires a `title` — a request without one
  is rejected with a 422 before your code runs. You never write
  "check if title is present" by hand.
- **Outgoing**: `response_model=ProjectOut` filters the object you return
  down to exactly the listed fields. This is why `password_hash` can never
  leak, even by accident.

### 2.4 Auth = a dependency (`app/auth/`)

This is the worked example. Trace one request:

```
POST /auth/register   → auth/router.py::register
    1. RegisterIn schema validates the email/password (422 if too short)
    2. hash_password() turns the password into a bcrypt hash
    3. db.add(user); db.commit(); db.refresh(user)
    4. return user   → serialized by UserOut (password_hash filtered out)

POST /auth/login      → auth/router.py::login
    1. verify_password() checks the attempt against the stored hash
    2. create_access_token(user.id) signs a JWT: {sub: user_id, exp: +60min}
    3. the token string goes back to the client

GET /projects (any protected route)
    1. Depends(get_current_user) pulls the "Authorization: Bearer <token>"
       header, verifies the JWT signature + expiry, loads the User
    2. invalid/expired token → 401 before your code runs
    3. your function just receives `user: User`
```

**The habit to copy:** routes that need the logged-in user declare
`user: User = Depends(get_current_user)`; routes that need one of the user's
projects declare `project = Depends(get_owned_project)` (which also answers
404 for other people's projects — see `app/auth/dependencies.py`).

### 2.5 The stub pattern = how the playground works

Every not-yet-implemented endpoint ends with:

```python
raise not_implemented("01-projects-crud")   # from app/errors.py
```

→ the API answers `501` with `Not implemented yet — this is part of Task
01-projects-crud. See docs/tasks/01-projects-crud.md`. When you implement a
function, you delete that one line. The app never has a broken state.

## 3. The data flow of the whole product

One manuscript's journey through the system (Tasks 02–06 build this):

```
import (.txt/.docx) ──► Manuscript row (status: pending)
        │ background task starts (routers/manuscripts.py)
        ▼
pipeline (services/pipeline.py)          status: processing
        │ splitter.split_chapters()          — Task 02
        │ for each chapter:
        │     extractor.extract_chapter()    — Task 03  (Claude, 1 call)
        │     extractor.validate_payload()   — Task 03  (hallucination guard)
        │     extractor.persist_extraction() — Task 03  (→ story tables)
        │     embedder.embed_one()           — built     (→ chunks.embedding)
        │     chapters_done += 1  → status endpoint shows progress
        ▼
consistency.run_consistency_pass()       — Task 05 (pure Python rules)
        │                                    (→ issues table)
        ▼
manuscript status: ready
        │
        ▼
story chat (agents/story_chat.py)        — Task 06 (LangGraph)
   question → pgvector similarity search over chapters → Claude answers
   with [chapter N] citations
```

Note the two kinds of "AI" (this distinction is a third of your grade):

- **Extraction** is a *pipeline*: text in → JSON out, one straight pass. No
  agent framework.
- **Chat** is an *agent*: the LangGraph graph retrieves evidence, then
  answers, and can grow extra steps (grading, re-retrieval) without
  restructuring.

## 4. Conventions

- **Import whole modules, not functions**, in services:
  `from app.services import extractor` then `extractor.extract_chapter(...)`.
  Tests rely on this to swap in fakes.
- **Routers stay thin**: parse request → call service/model → return. Any
  `if` beyond validation belongs in a service.
- **Every row keeps its chapter number** — provenance is the product.
- **Commit often, commit small.** One task = at least one commit with a
  message like `task 03: implement extract_chapter + validation`.
- **Ask early.** A 10-minute question beats a 2-day wrong direction.

## 5. Vocabulary cheat sheet

| Term | Meaning |
|---|---|
| ORM | Object-Relational Mapper — Python classes standing for SQL tables (SQLAlchemy) |
| Migration | A versioned change to the DB schema (we auto-create tables for now; Alembic later) |
| Pydantic | The validation library behind FastAPI schemas |
| JWT | Signed token proving who you are (see §2.4) |
| Dependency injection | "Fill this function argument for me" (`Depends`) |
| Embedding | Text → a 384-number vector; similar texts get similar vectors (pgvector searches them) |
| RAG | Retrieval-Augmented Generation — LLM answers only from passages you retrieved first |
| Structured output | Forcing an LLM to return JSON matching a schema (tool-use in Task 03) |
| Hallucination | An LLM inventing plausible nonsense; guarded in Task 03 via evidence quotes |
