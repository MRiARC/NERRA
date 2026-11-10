"""Manuscript import & chapter re-analysis orchestration pipeline."""

import hashlib
import json
import logging
import uuid

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import ChapterAnalysis, Manuscript

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Built for you
# ---------------------------------------------------------------------------


def run_import_pipeline_guarded(manuscript_id) -> None:
    """Entry point scheduled by the import endpoint (BackgroundTasks).

    Runs the real pipeline, and if ANYTHING goes wrong — a bug, a bad API
    key, Claude being down — records status='failed' plus the error message
    on the manuscript, instead of dying silently in a worker thread.
    """
    db: Session = SessionLocal()
    try:
        run_import_pipeline(manuscript_id, db)
    except Exception as exc:  # noqa: BLE001 — the guard's whole job is to catch
        logger.exception("Pipeline failed for manuscript %s", manuscript_id)
        db.rollback()
        manuscript = db.get(Manuscript, manuscript_id)
        if manuscript is not None:
            manuscript.status = "failed"
            manuscript.error_note = str(exc)[:500]
            db.commit()
    finally:
        db.close()


def _set_status(db: Session, manuscript: Manuscript, status: str, error_note: str | None = None) -> None:
    manuscript.status = status
    manuscript.error_note = error_note
    db.commit()


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _find_cached_analysis(db: Session, manuscript_id, chapter_number: int, content_hash: str):
    """The cost saver: if this exact chapter text was already analysed, skip
    the paid Claude call and reuse the stored result."""
    return (
        db.query(ChapterAnalysis)
        .filter(
            ChapterAnalysis.manuscript_id == manuscript_id,
            ChapterAnalysis.chapter_number == chapter_number,
            ChapterAnalysis.content_hash == content_hash,
        )
        .first()
    )


def _save_analysis(db: Session, manuscript_id, chapter_number: int, content_hash: str, payload_dict: dict) -> None:
    db.add(
        ChapterAnalysis(
            manuscript_id=manuscript_id,
            chapter_number=chapter_number,
            content_hash=content_hash,
            result=payload_dict,
        )
    )
    db.commit()


def _embed_and_store_chunk(db: Session, manuscript: Manuscript, chapter_number: int, content: str) -> None:
    """Store the chapter text + embedding vector (built for you).

    Uses the local embedder; if the model isn't installed we still store the
    chunk with embedding=None and log — the pipeline must not die over this.
    """
    from app.models import Chunk
    from app.services import embedder

    try:
        embedding = embedder.embed_one(content)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Embedding skipped for chapter %s: %s", chapter_number, exc)
        embedding = None

    db.add(
        Chunk(
            manuscript_id=manuscript.id,
            chapter_number=chapter_number,
            content=content,
            content_hash=_content_hash(content),
            embedding=embedding,
        )
    )
    db.commit()


# ---------------------------------------------------------------------------
# Pipeline orchestration entrypoints
# ---------------------------------------------------------------------------


def run_import_pipeline(manuscript_id, db: Session) -> None:
    """Analyze a manuscript end to end: split chapters, extract & validate, embed, compute timeline, check consistency, sync Neo4j, and snapshot version."""
    from app.services import consistency, exporter, extractor, graph, splitter, timeline
    from app.services.extractor import ExtractionPayload

    manuscript = db.get(Manuscript, manuscript_id)
    if manuscript is None:
        return

    _set_status(db, manuscript, "processing")

    chapters = splitter.split_chapters(manuscript.raw_text)
    manuscript.chapters_total = len(chapters)
    manuscript.chapters_done = 0
    db.commit()

    for chapter in chapters:
        content_hash = _content_hash(chapter.content)
        cached = _find_cached_analysis(db, manuscript.id, chapter.number, content_hash)
        if cached:
            if isinstance(cached.result, dict):
                payload = ExtractionPayload.model_validate(cached.result)
            elif isinstance(cached.result, str):
                payload = ExtractionPayload.model_validate(json.loads(cached.result))
            else:
                payload = cached.result
        else:
            roster = extractor.get_roster(db, manuscript.project_id)
            payload = extractor.extract_chapter(chapter.number, chapter.content, roster)
            payload = extractor.validate_payload(payload, chapter.content)
            _save_analysis(db, manuscript.id, chapter.number, content_hash, payload.model_dump())

        extractor.persist_extraction(db, manuscript.project_id, chapter.number, payload)
        _embed_and_store_chunk(db, manuscript, chapter.number, chapter.content)
        manuscript.chapters_done += 1
        db.commit()

    try:
        timeline.compute_story_chronology(db, manuscript.project_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Timeline chronology computation skipped: %s", exc)
    consistency.run_consistency_pass(db, manuscript.project_id)
    try:
        graph.sync_project_graph(db, manuscript.project_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Graph sync skipped: %s", exc)
    try:
        exporter.record_manuscript_version(db, manuscript)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Version snapshot skipped: %s", exc)
    _set_status(db, manuscript, "ready")


def reanalyze_chapter(db: Session, manuscript: Manuscript, chapter_number: int) -> None:
    """Re-extract a single chapter (backs POST /manuscripts/{id}/reanalyze).

    Steps: load the chapter's text via splitter (or stored Chunk), DELETE its
    ChapterAnalysis cache row, then run steps 3b–3f of run_import_pipeline
    for just that chapter, then re-run the consistency pass.
    """
    from app.models import Chunk
    from app.services import consistency, extractor, graph, splitter, timeline

    chapters = splitter.split_chapters(manuscript.raw_text)
    target = next((c for c in chapters if c.number == chapter_number), None)
    if not target:
        raise ValueError(f"Chapter {chapter_number} not found in manuscript")

    # Delete chapter's ChapterAnalysis cache row(s)
    db.query(ChapterAnalysis).filter(
        ChapterAnalysis.manuscript_id == manuscript.id,
        ChapterAnalysis.chapter_number == chapter_number,
    ).delete()

    # Delete existing chunk if any
    db.query(Chunk).filter(
        Chunk.manuscript_id == manuscript.id,
        Chunk.chapter_number == chapter_number,
    ).delete()
    db.commit()

    content_hash = _content_hash(target.content)
    roster = extractor.get_roster(db, manuscript.project_id)
    payload = extractor.extract_chapter(target.number, target.content, roster)
    payload = extractor.validate_payload(payload, target.content)
    extractor.persist_extraction(db, manuscript.project_id, target.number, payload)
    _save_analysis(db, manuscript.id, target.number, content_hash, payload.model_dump())
    _embed_and_store_chunk(db, manuscript, target.number, target.content)

    try:
        timeline.compute_story_chronology(db, manuscript.project_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Timeline chronology computation skipped on reanalyze: %s", exc)
    consistency.run_consistency_pass(db, manuscript.project_id)
    try:
        graph.sync_project_graph(db, manuscript.project_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Graph sync skipped on reanalyze: %s", exc)
