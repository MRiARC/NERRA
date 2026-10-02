"""Database engine and session management.

The pattern to understand (it appears everywhere in FastAPI apps):

- `engine`      — the connection pool to Postgres (one per process).
- `SessionLocal`— a factory that hands out *sessions*. A session is a short-
                  lived workspace for a handful of queries.
- `get_db`      — a FastAPI *dependency*: each request gets its own session,
                  which is closed automatically when the request finishes.
                  Route functions just declare `db: Session = Depends(get_db)`.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """Base class every ORM model inherits from."""


def get_db() -> Generator[Session, None, None]:
    """Yield a database session for the duration of one request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
