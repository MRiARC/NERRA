"""FastAPI application entrypoint.

Run from the backend/ directory:

    uvicorn app.main:app --reload

Then open http://localhost:8000/docs for the interactive Swagger UI.

This file is deliberately boring: it wires together config, database, and
routers. The interesting logic lives in routers/, services/, and agents/.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import Base, engine
from app.routers import chat, manuscripts, projects, settings as settings_router, story
from app.auth.router import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create any missing tables on startup. Simple and fine for the MVP;
    # a growing project would move to explicit migrations (Alembic).
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="NERRA — Story Intelligence Engine",
    description=(
        "Import a manuscript, get a living map of your story world: "
        "characters, relationships, events, facts, knowledge states — "
        "with contradiction detection and a citation-backed story chat."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# Support credentials (cookies) across local dev ports (Next.js, Vite, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(settings_router.router)
app.include_router(projects.router)
app.include_router(manuscripts.router)
app.include_router(story.router)
app.include_router(chat.router)


@app.get("/health", tags=["system"])
def health() -> dict:
    """Liveness plus real dependency checks, so the UI never guesses."""
    database_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        database_ok = True
    except Exception:  # noqa: BLE001 — health must always answer
        database_ok = False

    neo4j_ok = False
    try:
        from app.services.graph import is_neo4j_connected

        neo4j_ok = is_neo4j_connected()
    except Exception:  # noqa: BLE001
        neo4j_ok = False

    return {
        "status": "ok" if database_ok else "degraded",
        "app": "NERRA",
        "database": database_ok,
        "neo4j": neo4j_ok,
    }


@app.get("/", tags=["system"])
def root() -> dict:
    return {
        "app": "NERRA — Story Intelligence Engine",
        "docs": "/docs",
        "health": "/health",
    }
