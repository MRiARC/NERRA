"""Task 04 tests — pipeline orchestration, caching, and failure handling.

All collaborators (splitter, extractor, consistency) are replaced with
fakes, so this tests YOUR orchestration logic only — no LLM, no embedding
model needed. It relies on the module-import style from the docstring:

    from app.services import extractor, splitter   ->  extractor.extract_chapter(...)
"""

import uuid

import pytest

from app.models import ChapterAnalysis, Chunk, Manuscript, Project, User
from app.services import consistency, extractor, pipeline, splitter
from app.services.extractor import ExtractedCharacter, ExtractionPayload
from app.services.splitter import Chapter
from tests.utils import run_or_hint

TASK = "04-pipeline"


@pytest.fixture()
def manuscript(db_session):
    user = User(email=f"{uuid.uuid4().hex[:8]}@nerra.dev", password_hash="x")
    db_session.add(user)
    db_session.commit()
    project = Project(owner_id=user.id, title="Pipeline Tests")
    db_session.add(project)
    db_session.commit()
    manuscript = Manuscript(
        project_id=project.id,
        title="Test Novel",
        raw_text="Chapter 1\nContents one.\n\nChapter 2\nContents two.",
        status="pending",
    )
    db_session.add(manuscript)
    db_session.commit()
    return manuscript


def _fake_chapters(manuscript):
    return [
        Chapter(number=1, title="Chapter 1", content=f"{manuscript.title} — chapter one text"),
        Chapter(number=2, title="Chapter 2", content=f"{manuscript.title} — chapter two text"),
    ]


def _canned_payload() -> ExtractionPayload:
    return ExtractionPayload(characters=[ExtractedCharacter(name="Sarah")])


def test_pipeline_runs_end_to_end(monkeypatch, db_session, manuscript):
    calls = {"extract": 0, "persist": 0, "consistency": 0}

    monkeypatch.setattr(splitter, "split_chapters", lambda text: _fake_chapters(manuscript))
    monkeypatch.setattr(extractor, "get_roster", lambda db, project_id: "None yet")
    monkeypatch.setattr(extractor, "extract_chapter", lambda n, text, roster: calls.__setitem__("extract", calls["extract"] + 1) or _canned_payload())
    monkeypatch.setattr(extractor, "validate_payload", lambda payload, text: payload)
    monkeypatch.setattr(extractor, "persist_extraction", lambda db, pid, n, payload: calls.__setitem__("persist", calls["persist"] + 1))
    monkeypatch.setattr(consistency, "run_consistency_pass", lambda db, pid: calls.__setitem__("consistency", calls["consistency"] + 1) or 0)

    run_or_hint(TASK, lambda: pipeline.run_import_pipeline(manuscript.id, db_session))

    db_session.expire_all()
    refreshed = db_session.get(Manuscript, manuscript.id)
    assert refreshed.status == "ready", (
        f"[{TASK}] manuscript should end 'ready', got '{refreshed.status}' ({refreshed.error_note})"
    )
    assert refreshed.chapters_total == 2 and refreshed.chapters_done == 2
    assert calls["extract"] == 2 and calls["persist"] == 2
    assert calls["consistency"] == 1, "the consistency pass must run when the last chapter finishes"
    assert db_session.query(ChapterAnalysis).filter_by(manuscript_id=manuscript.id).count() == 2, (
        f"[{TASK}] every analysed chapter must be cached in chapter_analyses"
    )
    assert db_session.query(Chunk).filter_by(manuscript_id=manuscript.id).count() == 2


def test_cache_prevents_second_llm_call(monkeypatch, db_session, manuscript):
    """Re-running on unchanged text must hit the cache, not Claude."""

    def boom(chapter_number, chapter_text, roster):
        raise AssertionError("LLM called for a cached chapter — the hash check is missing")

    monkeypatch.setattr(splitter, "split_chapters", lambda text: _fake_chapters(manuscript))
    monkeypatch.setattr(extractor, "get_roster", lambda db, project_id: "None yet")
    monkeypatch.setattr(extractor, "extract_chapter", boom)
    monkeypatch.setattr(extractor, "validate_payload", lambda payload, text: payload)
    monkeypatch.setattr(extractor, "persist_extraction", lambda db, pid, n, payload: None)
    monkeypatch.setattr(consistency, "run_consistency_pass", lambda db, pid: 0)

    # First run: stub the extractor so the cache fills up.
    monkeypatch.setattr(extractor, "extract_chapter", lambda n, text, roster: _canned_payload())
    run_or_hint(TASK, lambda: pipeline.run_import_pipeline(manuscript.id, db_session))

    # Second run: the "should never happen" extractor is back in place.
    monkeypatch.setattr(extractor, "extract_chapter", boom)
    run_or_hint(TASK, lambda: pipeline.run_import_pipeline(manuscript.id, db_session))

    db_session.expire_all()
    assert db_session.get(Manuscript, manuscript.id).status == "ready"


def test_failure_marks_manuscript_failed(monkeypatch, db_session, manuscript):
    monkeypatch.setattr(splitter, "split_chapters", lambda text: _fake_chapters(manuscript))
    monkeypatch.setattr(extractor, "get_roster", lambda db, project_id: "None yet")

    def exploding_extract(chapter_number, chapter_text, roster):
        raise RuntimeError("Claude is down")

    monkeypatch.setattr(extractor, "extract_chapter", exploding_extract)

    # The guarded wrapper is what the import endpoint schedules — use it.
    pipeline.run_import_pipeline_guarded(manuscript.id)

    db_session.expire_all()
    refreshed = db_session.get(Manuscript, manuscript.id)
    assert refreshed.status == "failed", f"[{TASK}] pipeline crashes must mark the manuscript 'failed'"
    assert "Claude is down" in (refreshed.error_note or "")
