# NERRA Playground — How This Works

> Read this first. It explains how the project is set up for the team and
> what your tasks are. For the product vision see `README.md`; for the full
> plan see `mvp_blueprint.md`.

## The idea

This repository is a **working backend with gaps**. All the boring-but-hard
infrastructure — database, auth, routing, schemas, configuration — is
already built and running. The six feature modules at the heart of NERRA
are declared but **not implemented**: you'll find their function signatures,
docstrings explaining exactly what to do, and `# YOUR CODE HERE` markers.

You implement one task at a time. The app **always runs** — anything not
implemented yet answers `501 Not Implemented` with a message telling you
which task document to read. Nothing ever crashes mysteriously.

## Setup (once)

```bash
make install     # creates .venv + installs backend dependencies
make up          # starts Postgres (pgvector) in Docker
cp .env.example backend/.env    # then add your ANTHROPIC_API_KEY inside
```

## Every work session

```bash
make up          # ensure Postgres is running
make api         # backend with hot reload → http://localhost:8000/docs
make test        # run the whole test suite
```

## The task sequence (do them in this order)

| # | Task | Difficulty | Depends on | You implement |
|---|------|-----------|------------|----------------|
| 01 | [Projects CRUD + story views](tasks/01-projects-crud.md) | Easy | nothing | `app/routers/projects.py`, `app/routers/story.py` |
| 02 | [Import & chapter splitting](tasks/02-import-and-chapters.md) | Easy | 01 | `app/services/splitter.py` |
| 03 | [Claude extraction](tasks/03-extraction.md) | Medium | 02 | `app/services/extractor.py` (3 functions) |
| 04 | [The pipeline](tasks/04-pipeline.md) | Medium | 03 | `app/services/pipeline.py` (2 functions) |
| 05 | [Consistency checker](tasks/05-consistency-checker.md) | Medium | 03 | `app/services/consistency.py` (5 functions) — **parallel with 04** |
| 06 | [Story chat agent](tasks/06-story-chat-agent.md) | Hard | 03 | `app/agents/story_chat.py` (2 nodes) |

After Task 03 two people can work at the same time (04 and 05 don't touch
the same files). The chat agent (06) comes last.

## How you know you're done

1. **`make test`** — every task has a test file in `backend/tests/tasks/`.
   While a task is unimplemented its tests fail with an instructive message;
   when you're done, they pass. Tests that were passing before your change
   must still pass.
2. **Swagger UI** — each task doc has a "See it working" section: exact
   requests to click through in `http://localhost:8000/docs` and the exact
   responses to expect.
3. **The demo** — after Task 04+05, import `samples/sample_story.txt` into a
   project. The sample has planted mistakes: an eye-color contradiction, a
   knowledge violation, and a dangling object. The issues endpoint should
   find all three.

## Ground rules

- **Don't edit the spine** (auth, models, database, config, main.py,
  manuscripts router, embedder). If you think something there is wrong or
  missing, raise it with the lead — don't patch around it.
- **Read `docs/ARCHITECTURE_GUIDE.md` before starting Task 01.** It explains
  how a request travels through the app, using the working auth feature as
  the example. If you only ever read one doc, read that one.
- **Models are the map.** Before writing any task, read the relevant part of
  `app/models.py` — it tells you exactly what data exists and its shape.
- **Never commit a `# YOUR CODE HERE` you didn't fill in**, and never copy
  from the `solutions/` folder before genuinely trying (it exists for the
  lead to unblock you after you've attempted it).

## Where things live

```
backend/
├── app/
│   ├── main.py            app bootstrap — routers registered here
│   ├── config.py          settings from environment/.env
│   ├── database.py        engine + session-per-request dependency
│   ├── models.py          ★ all 13 database tables — the map of the world
│   ├── schemas.py         ★ request/response shapes (Pydantic)
│   ├── errors.py          the 501 helper used by every stub
│   ├── auth/              ★ WORKED EXAMPLE — fully implemented, read it
│   ├── routers/           HTTP layer (projects/story = Task 01)
│   ├── services/          business logic (your tasks live here)
│   └── agents/            LangGraph agent (Task 06)
├── tests/                 auth tests pass now; task tests pass when you finish
└── docs/
    ├── ARCHITECTURE_GUIDE.md   ← read before Task 01
    └── tasks/                  ← your instructions, one file per task
```
