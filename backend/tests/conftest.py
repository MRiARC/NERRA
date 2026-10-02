"""Pytest fixtures: a throwaway test database + an API client.

Runs BEFORE any app import (order matters: the DATABASE_URL override below
must be in place when app.config reads the environment).

Requirements: Docker Postgres running (`make up`). The test database
(`nerra_test`) is created automatically if missing, and every test starts
from clean tables.
"""

import os

TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://nerra:nerra_dev_password@localhost:5433/nerra_test",
)
os.environ["DATABASE_URL"] = TEST_DB_URL

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402
from sqlalchemy.exc import ProgrammingError  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402

_test_engine = create_engine(TEST_DB_URL, pool_pre_ping=True)
TestSessionLocal = sessionmaker(bind=_test_engine, autoflush=False, expire_on_commit=False)


def _ensure_test_database() -> None:
    """CREATE DATABASE nerra_test if it doesn't exist, plus the pgvector
    extension (the Vector column type needs it)."""
    admin_url = make_url(TEST_DB_URL)._replace(database="postgres")
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    db_name = make_url(TEST_DB_URL).database
    try:
        with admin_engine.connect() as conn:
            conn.exec_driver_sql(f'CREATE DATABASE "{db_name}"')
    except ProgrammingError:
        pass  # database already exists — exactly what we want
    finally:
        admin_engine.dispose()

    with _test_engine.connect() as conn:
        conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS vector")
        conn.commit()


_ensure_test_database()


def _override_get_db():
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
def clean_database():
    """Every test starts from empty tables (drop + recreate — simple and
    bulletproof, since task code commits freely)."""
    Base.metadata.drop_all(bind=_test_engine)
    Base.metadata.create_all(bind=_test_engine)
    yield


@pytest.fixture()
def db_session():
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def auth_headers(client) -> dict:
    """Register + log in a fresh user; return Authorization headers."""
    email = f"author-{os.urandom(4).hex()}@nerra.dev"
    resp = client.post(
        "/auth/register",
        json={"email": email, "password": "correct horse battery", "display_name": "Tester"},
    )
    assert resp.status_code == 201, resp.text
    resp = client.post("/auth/login", data={"username": email, "password": "correct horse battery"})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
