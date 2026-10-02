"""The import pipeline — Task 04 (run_import_pipeline is yours).

Orchestration: text -> chapters -> extraction -> persistence -> embeddings
-> consistency pass -> status updates. This is where the whole system clicks
together, which is why it comes after Tasks 02 and 03.

Already built for you (study, don't rewrite):
- run_import_pipeline_guarded  — the background-task safety net
- status helpers               — _set_status
- the content-hash cache       — _find_cached_analysis / _save_analysis

Guarantee you must preserve: the pipeline NEVER crashes silently. Any
exception bubbles up to the guard, which marks the manuscript 'failed' with
the error message — that's the behavior the status endpoint shows.
"""

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
# YOUR TWO FUNCTIONS (Task 04)
# ---------------------------------------------------------------------------


def run_import_pipeline(manuscript_id, db: Session) -> None:
    """Analyze a manuscript end to end. Recommended order:

    1. Load the manuscript; set status='processing', commit.
    2. chapters = splitter.split_chapters(manuscript.raw_text)     (Task 02)
       Set chapters_total = len(chapters), chapters_done = 0, commit —
       the status endpoint should show progress ASAP.
    3. For each chapter:
         a. content_hash = _content_hash(chapter.content)
         b. cached = _find_cached_analysis(...); if cached: reuse — skip the
            LLM call, but STILL persist the cached payload (a re-import of a
            changed manuscript must not lose chapters that didn't change).
         c. roster = extractor.get_roster(db, manuscript.project_id)
            payload = extractor.extract_chapter(...)                (Task 03)
            payload = extractor.validate_payload(payload, chapter.content)
         d. extractor.persist_extraction(db, manuscript.project_id,
                                         chapter.number, payload)
         e. _save_analysis(...) — the cache for next time
         f. _embed_and_store_chunk(...)
         g. chapters_done += 1; db.commit()  <- commit per chapter so the
            status endpoint shows live progress
    4. consistency.run_consistency_pass(db, manuscript.project_id)  (Task 05)
    5. _set_status(db, manuscript, 'ready')

    Args:
        manuscript_id: uuid of the Manuscript row.
        db: a fresh session (the guard owns its lifecycle).

    Implementation note: import whole modules, not individual functions —
        from app.services import consistency, extractor, splitter
    then call `extractor.extract_chapter(...)`, rather than
    `from app.services.extractor import extract_chapter`. The tests (and the
    lead's code review) rely on this style.
    """
    # ========== YOUR CODE HERE (Task 04) ==========
    raise NotImplementedError(
        "Task 04 — implement run_import_pipeline. See docs/tasks/04-pipeline.md"
    )


def reanalyze_chapter(db: Session, manuscript: Manuscript, chapter_number: int) -> None:
    """Re-extract a single chapter (backs POST /manuscripts/{id}/reanalyze).

    Steps: load the chapter's text via splitter (or stored Chunk), DELETE its
    ChapterAnalysis cache row, then run steps 3b–3f of run_import_pipeline
    for just that chapter, then re-run the consistency pass.
    """
    # ========== YOUR CODE HERE (Task 04) ==========
    raise NotImplementedError(
        "Task 04 — implement reanalyze_chapter. See docs/tasks/04-pipeline.md"
    )
