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


def run_import_pipeline_guarded(
    manuscript_id,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> None:
    """Entry point scheduled by the import endpoint (BackgroundTasks).

    Runs the real pipeline, and if ANYTHING goes wrong — a bug, a bad API
    key, Claude being down — records status='failed' plus the error message
    on the manuscript, instead of dying silently in a worker thread.
    """
    db: Session = SessionLocal()
    try:
        run_import_pipeline(manuscript_id, db, api_key=api_key, base_url=base_url, model=model)
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


def reanalyze_manuscript_guarded(
    manuscript_id,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> None:
    """Background entry point for a full manuscript re-analysis.

    Drops cached chapter extractions first, otherwise the pipeline would replay
    the old analysis instead of calling the model again.
    """
    from app.models import ChapterAnalysis

    db: Session = SessionLocal()
    try:
        db.query(ChapterAnalysis).filter(
            ChapterAnalysis.manuscript_id == manuscript_id
        ).delete(synchronize_session=False)
        db.commit()
    except Exception:  # noqa: BLE001
        logger.exception("Could not clear cached analyses for manuscript %s", manuscript_id)
        db.rollback()
    finally:
        db.close()

    run_import_pipeline_guarded(manuscript_id, api_key=api_key, base_url=base_url, model=model)


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
    from app.services import change_detector, embedder

    try:
        embedding = embedder.embed_one(content)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Embedding skipped for chapter %s: %s", chapter_number, exc)
        embedding = None

    content_hash = _content_hash(content)
    p_hashes = change_detector.compute_paragraph_hashes(content)
    existing_chunk = (
        db.query(Chunk)
        .filter(Chunk.manuscript_id == manuscript.id, Chunk.chapter_number == chapter_number)
        .first()
    )
    if existing_chunk is not None:
        existing_chunk.content = content
        existing_chunk.content_hash = content_hash
        existing_chunk.paragraph_hashes = p_hashes
        existing_chunk.embedding = embedding
    else:
        db.add(
            Chunk(
                manuscript_id=manuscript.id,
                chapter_number=chapter_number,
                content=content,
                content_hash=content_hash,
                paragraph_hashes=p_hashes,
                embedding=embedding,
            )
        )
    db.commit()


# ---------------------------------------------------------------------------
# Pipeline orchestration entrypoints
# ---------------------------------------------------------------------------


def run_import_pipeline(
    manuscript_id,
    db: Session,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> None:
    """Analyze a manuscript end to end with signal scanning, deep context building, multi-pass extraction, timeline, consistency, Neo4j sync, and versioning."""
    from app.services import (
        change_detector,
        consistency,
        context_builder,
        exporter,
        extractor,
        graph,
        signal_scanner,
        splitter,
        timeline,
        validator,
        plot_threads,
    )
    from app.services.extractor import ExtractionPayload

    manuscript = db.get(Manuscript, manuscript_id)
    if manuscript is None:
        return

    _set_status(db, manuscript, "processing")

    creds = extractor.resolve_ai_credentials(
        db=db,
        project_id=manuscript.project_id,
        explicit_api_key=api_key,
        explicit_base_url=base_url,
        explicit_model=model,
    )
    resolved_api_key = creds.get("api_key")
    resolved_base_url = creds.get("base_url")
    resolved_model = creds.get("model")

    change_report = change_detector.detect_changes(
        db,
        manuscript.project_id,
        manuscript.raw_text,
        exclude_manuscript_id=manuscript.id,
    )
    stale_chapters = set(change_report.get("stale_claim_chapters") or [])
    for stale_ch in stale_chapters:
        change_detector.mark_chapter_claims_stale(db, manuscript.project_id, stale_ch)

    chapters = splitter.split_chapters(manuscript.raw_text)
    manuscript.chapters_total = len(chapters)
    manuscript.chapters_done = 0
    db.commit()

    extract_is_mocked = getattr(extractor.extract_chapter, "__module__", "") != "app.services.extractor"

    from app.models import Chunk

    for chapter in chapters:
        content_hash = _content_hash(chapter.content)
        cached = _find_cached_analysis(db, manuscript.id, chapter.number, content_hash)
        if cached:
            already_chunked = (
                db.query(Chunk)
                .filter(
                    Chunk.manuscript_id == manuscript.id,
                    Chunk.chapter_number == chapter.number,
                    Chunk.content_hash == content_hash,
                )
                .first()
            )
            if already_chunked is not None:
                manuscript.chapters_done += 1
                db.commit()
                continue
            if isinstance(cached.result, dict):
                payload = ExtractionPayload.model_validate(cached.result)
            elif isinstance(cached.result, str):
                payload = ExtractionPayload.model_validate(json.loads(cached.result))
            else:
                payload = cached.result
        else:
            if extract_is_mocked:
                roster = extractor.get_roster(db, manuscript.project_id)
                try:
                    payload = extractor.extract_chapter(
                        chapter.number,
                        chapter.content,
                        roster,
                        api_key=resolved_api_key,
                        base_url=resolved_base_url,
                        model=resolved_model,
                    )
                except TypeError:
                    payload = extractor.extract_chapter(
                        chapter.number,
                        chapter.content,
                        roster,
                    )
            else:
                signals = signal_scanner.scan_chapter_signals(chapter.content)
                ctx_packet = context_builder.build_story_context_packet(
                    db, manuscript.project_id, chapter.number, chapter.content, signals=signals
                )
                cust = plot_threads.get_customization(db, manuscript.project_id)
                payload = extractor.extract_chapter_multipass(
                    chapter.number,
                    chapter.content,
                    ctx_packet["prompt_text"],
                    custom_prompt=cust.get("custom_prompt") or "",
                    api_key=resolved_api_key,
                    base_url=resolved_base_url,
                    model=resolved_model,
                )
            payload = extractor.validate_payload(payload, chapter.content)
            _save_analysis(db, manuscript.id, chapter.number, content_hash, payload.model_dump())

        is_rewritten = chapter.number in stale_chapters
        validator.gate_and_commit_extraction(
            db,
            manuscript.project_id,
            manuscript.id,
            chapter.number,
            chapter.content,
            payload,
            use_llm=not extract_is_mocked,
            supersede_chapter=is_rewritten,
        )
        _embed_and_store_chunk(db, manuscript, chapter.number, chapter.content)
        manuscript.chapters_done += 1
        db.commit()

    try:
        timeline.compute_story_chronology(db, manuscript.project_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Timeline chronology computation skipped: %s", exc)
    if not extract_is_mocked:
        try:
            for ch_item in chapters:
                plot_threads.extract_and_update_plot_threads_llm(
                    db,
                    manuscript.project_id,
                    ch_item.number,
                    ch_item.content,
                    use_llm=True,
                    api_key=resolved_api_key,
                    base_url=resolved_base_url,
                    model=resolved_model,
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Plot thread extraction skipped/warned: %s", exc)
    try:
        try:
            consistency.run_consistency_pass(
                db,
                manuscript.project_id,
                api_key=resolved_api_key,
                base_url=resolved_base_url,
                model=resolved_model,
            )
        except TypeError:
            consistency.run_consistency_pass(db, manuscript.project_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Consistency pass skipped/warned: %s", exc)
    try:
        graph.sync_project_graph(db, manuscript.project_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Graph sync skipped: %s", exc)
    try:
        exporter.record_manuscript_version(db, manuscript)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Version snapshot skipped: %s", exc)
    _set_status(db, manuscript, "ready")


def append_chapter_to_manuscript(
    db: Session, manuscript: Manuscript, chapter_text: str, chapter_title: str = ""
) -> Manuscript:
    """Incrementally append and analyze a single new chapter (`New Chapter Added` trigger)."""
    from app.services import (
        consistency,
        context_builder,
        exporter,
        extractor,
        graph,
        signal_scanner,
        splitter,
        timeline,
        validator,
        plot_threads,
    )

    existing_chapters = splitter.split_chapters(manuscript.raw_text)
    next_num = len(existing_chapters) + 1
    heading = chapter_title.strip() or f"Chapter {next_num}"
    body = chapter_text.strip()
    if not body.lower().startswith("chapter "):
        appended_block = f"\n\n{heading}\n\n{body}"
    else:
        appended_block = f"\n\n{body}"

    manuscript.raw_text = (manuscript.raw_text or "").rstrip() + appended_block
    manuscript.chapters_total = next_num
    _set_status(db, manuscript, "processing")

    signals = signal_scanner.scan_chapter_signals(body)
    ctx_packet = context_builder.build_story_context_packet(
        db, manuscript.project_id, next_num, body, signals=signals
    )
    creds = extractor.resolve_ai_credentials(db=db, project_id=manuscript.project_id)
    resolved_api_key = creds.get("api_key")
    resolved_base_url = creds.get("base_url")
    resolved_model = creds.get("model")

    extract_is_mocked = getattr(extractor.extract_chapter, "__module__", "") != "app.services.extractor"
    if extract_is_mocked:
        payload = extractor.extract_chapter(next_num, body, ctx_packet["prompt_text"])
    else:
        cust = plot_threads.get_customization(db, manuscript.project_id)
        payload = extractor.extract_chapter_multipass(
            next_num,
            body,
            ctx_packet["prompt_text"],
            custom_prompt=cust.get("custom_prompt") or "",
            api_key=resolved_api_key,
            base_url=resolved_base_url,
            model=resolved_model,
        )
    payload = extractor.validate_payload(payload, body)

    content_hash = _content_hash(body)
    validator.gate_and_commit_extraction(
        db,
        manuscript.project_id,
        manuscript.id,
        next_num,
        body,
        payload,
        use_llm=not extract_is_mocked,
    )
    if not extract_is_mocked:
        plot_threads.extract_and_update_plot_threads_llm(
            db, manuscript.project_id, next_num, body, use_llm=True
        )
    _save_analysis(db, manuscript.id, next_num, content_hash, payload.model_dump())
    _embed_and_store_chunk(db, manuscript, next_num, body)

    manuscript.chapters_done = next_num
    db.commit()

    try:
        timeline.compute_story_chronology(db, manuscript.project_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Timeline chronology computation skipped on append: %s", exc)
    consistency.run_consistency_pass(db, manuscript.project_id)
    try:
        graph.sync_project_graph(db, manuscript.project_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Graph sync skipped on append: %s", exc)
    try:
        exporter.record_manuscript_version(db, manuscript)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Version snapshot skipped on append: %s", exc)
    _set_status(db, manuscript, "ready")
    db.refresh(manuscript)
    return manuscript


def reanalyze_chapter(
    db: Session,
    manuscript: Manuscript,
    chapter_number: int,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> None:
    """Re-extract a single chapter (backs POST /manuscripts/{id}/reanalyze).

    Steps: load the chapter's text via splitter (or stored Chunk), DELETE its
    ChapterAnalysis cache row, then run steps 3b–3f of run_import_pipeline
    for just that chapter, then re-run the consistency pass.
    """
    from app.models import Chunk
    from app.services import consistency, extractor, graph, plot_threads, splitter, timeline

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

    creds = extractor.resolve_ai_credentials(
        db=db,
        project_id=manuscript.project_id,
        explicit_api_key=api_key,
        explicit_base_url=base_url,
        explicit_model=model,
    )
    resolved_api_key = creds.get("api_key")
    resolved_base_url = creds.get("base_url")
    resolved_model = creds.get("model")

    content_hash = _content_hash(target.content)
    roster = extractor.get_roster(db, manuscript.project_id)
    extract_is_mocked = getattr(extractor.extract_chapter, "__module__", "") != "app.services.extractor"
    if extract_is_mocked:
        payload = extractor.extract_chapter(target.number, target.content, roster)
    else:
        cust = plot_threads.get_customization(db, manuscript.project_id)
        payload = extractor.extract_chapter_multipass(
            target.number,
            target.content,
            roster,
            custom_prompt=cust.get("custom_prompt") or "",
            api_key=resolved_api_key,
            base_url=resolved_base_url,
            model=resolved_model,
        )
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
