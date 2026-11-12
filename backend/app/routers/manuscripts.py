"""Manuscript import, chapter re-analysis, and pipeline status routes."""

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Header, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_owned_project
from app.database import get_db
from app.models import Manuscript, User
from app.schemas import (
    ChangeDetectionOut,
    ChapterAppendIn,
    ChapterDetailOut,
    ChapterSummaryOut,
    ChapterUpdateIn,
    ImportOut,
    ManuscriptOut,
    StatusOut,
)
from app.services import change_detector, splitter
from app.services.pipeline import append_chapter_to_manuscript, run_import_pipeline_guarded

router = APIRouter(tags=["manuscripts"])

MAX_IMPORT_BYTES = 10 * 1024 * 1024  # 10 MB supports long .pdf / .docx / .txt manuscripts


def _extract_text(file: UploadFile | None, pasted_text: str) -> str:
    """Get plain text from an uploaded file (.txt/.md/.docx/.pdf) or pasted text."""
    if file is not None:
        data = file.file.read(MAX_IMPORT_BYTES + 1)
        if len(data) > MAX_IMPORT_BYTES:
            raise HTTPException(status_code=413, detail="File too large (max 10 MB)")

        filename = (file.filename or "").lower()
        if filename.endswith(".docx"):
            import io

            from docx import Document  # python-docx

            document = Document(io.BytesIO(data))
            return "\n".join(p.text for p in document.paragraphs)

        if filename.endswith(".pdf") or file.content_type == "application/pdf":
            import io

            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(data))
            return "\n\n".join((page.extract_text() or "") for page in reader.pages)

        if filename.endswith((".txt", ".md")) or file.content_type == "text/plain":
            return data.decode("utf-8", errors="replace")

        raise HTTPException(status_code=415, detail="Unsupported file type — use .txt, .md, .docx, or .pdf")

    return pasted_text


@router.post("/projects/{project_id}/manuscripts/import", response_model=ImportOut, status_code=201)
def import_manuscript(
    project_id: uuid.UUID,
    background: BackgroundTasks,
    title: str = Form(default=""),
    text: str = Form(default=""),
    file: UploadFile | None = File(default=None),
    x_anthropic_key: str | None = Header(default=None, alias="X-Anthropic-Key"),
    x_anthropic_base_url: str | None = Header(default=None, alias="X-Anthropic-Base-Url"),
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ImportOut:
    """Import a manuscript: upload a .txt/.md/.docx file, or paste text.

    In Swagger (the /docs page): click 'Try it out', optionally choose a
    file, or type into the `text` field. The response returns immediately —
    analysis continues in the background; poll the status endpoint.
    """
    content = _extract_text(file, text).strip()
    if len(content) < 100:
        raise HTTPException(
            status_code=422,
            detail="Manuscript too short — provide at least ~100 characters of story text",
        )

    display_title = title.strip() or (file.filename if file and file.filename else "Imported manuscript")

    manuscript = Manuscript(
        project_id=project.id,
        title=display_title,
        raw_text=content,
        status="pending",
    )
    db.add(manuscript)
    db.commit()
    db.refresh(manuscript)

    # Run the AI pipeline after the response is sent.
    background.add_task(
        run_import_pipeline_guarded,
        manuscript.id,
        api_key=x_anthropic_key,
        base_url=x_anthropic_base_url,
    )

    return ImportOut(manuscript_id=manuscript.id, project_id=project.id, status=manuscript.status)


@router.get("/manuscripts/{manuscript_id}/status", response_model=StatusOut)
def manuscript_status(
    manuscript_id: uuid.UUID,
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StatusOut:
    """Poll this while the pipeline runs: {status, chapters_done, chapters_total}."""
    manuscript = db.get(Manuscript, manuscript_id)
    if manuscript is None or manuscript.project_id != project.id:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    return StatusOut(
        manuscript_id=manuscript.id,
        status=manuscript.status,
        chapters_done=manuscript.chapters_done,
        chapters_total=manuscript.chapters_total,
        error_note=manuscript.error_note,
    )


@router.get("/projects/{project_id}/manuscripts", response_model=list[ManuscriptOut])
def list_manuscripts(
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list:
    """List manuscripts uploaded to the project."""
    return (
        db.query(Manuscript)
        .filter(Manuscript.project_id == project.id)
        .order_by(Manuscript.created_at.desc())
        .all()
    )


@router.post("/projects/{project_id}/manuscripts/diff", response_model=ChangeDetectionOut)
def preview_manuscript_diff(
    project_id: uuid.UUID,
    text: str = Form(default=""),
    file: UploadFile | None = File(default=None),
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Detect changed chapters & paragraph diffs against the latest project draft."""
    content = _extract_text(file, text).strip()
    return change_detector.detect_changes(db, project.id, content)


@router.post("/projects/{project_id}/manuscripts/{manuscript_id}/chapters", response_model=StatusOut, status_code=201)
def append_chapter(
    project_id: uuid.UUID,
    manuscript_id: uuid.UUID,
    payload: ChapterAppendIn,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StatusOut:
    """Incrementally append and analyze a single new chapter (`New Chapter Added` trigger)."""
    manuscript = db.get(Manuscript, manuscript_id)
    if manuscript is None or manuscript.project_id != project.id:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    updated = append_chapter_to_manuscript(db, manuscript, payload.text, payload.chapter_title)
    return StatusOut(
        manuscript_id=updated.id,
        status=updated.status,
        chapters_done=updated.chapters_done,
        chapters_total=updated.chapters_total,
        error_note=updated.error_note,
    )


@router.post("/manuscripts/{manuscript_id}/reanalyze", response_model=StatusOut)
def reanalyze_manuscript(
    manuscript_id: uuid.UUID,
    project_id: uuid.UUID,
    chapter_number: int | None = None,  # optional: re-run a single chapter
    x_anthropic_key: str | None = Header(default=None, alias="X-Anthropic-Key"),
    x_anthropic_base_url: str | None = Header(default=None, alias="X-Anthropic-Base-Url"),
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StatusOut:
    """Clear cached chapter extractions and re-run analysis for one chapter or the full manuscript."""
    manuscript = db.get(Manuscript, manuscript_id)
    if manuscript is None or manuscript.project_id != project.id:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    if chapter_number is not None:
        from app.services.pipeline import reanalyze_chapter

        try:
            reanalyze_chapter(
                db,
                manuscript,
                chapter_number,
                api_key=x_anthropic_key,
                base_url=x_anthropic_base_url,
            )
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc))
    else:
        from app.services.pipeline import run_import_pipeline

        run_import_pipeline(
            manuscript.id,
            db,
            api_key=x_anthropic_key,
            base_url=x_anthropic_base_url,
        )

    db.refresh(manuscript)
    return StatusOut(
        manuscript_id=manuscript.id,
        status=manuscript.status,
        chapters_done=manuscript.chapters_done,
        chapters_total=manuscript.chapters_total,
        error_note=manuscript.error_note,
    )


@router.get(
    "/projects/{project_id}/manuscripts/{manuscript_id}/chapters",
    response_model=list[ChapterSummaryOut],
)
def list_manuscript_chapters(
    project_id: uuid.UUID,
    manuscript_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ChapterSummaryOut]:
    """List all parsed chapters for a manuscript with metadata and word counts."""
    manuscript = db.get(Manuscript, manuscript_id)
    if manuscript is None or manuscript.project_id != project.id:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    if not manuscript.raw_text:
        return []

    parsed = splitter.split_chapters(manuscript.raw_text)
    summaries = []
    for c in parsed:
        words = len(c.content.split())
        preview = (c.content[:200] + "...") if len(c.content) > 200 else c.content
        summaries.append(
            ChapterSummaryOut(
                number=c.number,
                title=c.title or f"Chapter {c.number}",
                word_count=words,
                preview=preview.strip(),
            )
        )
    return summaries


@router.get(
    "/projects/{project_id}/manuscripts/{manuscript_id}/chapters/{chapter_number}",
    response_model=ChapterDetailOut,
)
def get_manuscript_chapter(
    project_id: uuid.UUID,
    manuscript_id: uuid.UUID,
    chapter_number: int,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChapterDetailOut:
    """Retrieve full text and metadata for a specific chapter."""
    manuscript = db.get(Manuscript, manuscript_id)
    if manuscript is None or manuscript.project_id != project.id:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    if not manuscript.raw_text:
        raise HTTPException(status_code=404, detail="Manuscript has no content")

    parsed = splitter.split_chapters(manuscript.raw_text)
    for c in parsed:
        if c.number == chapter_number:
            return ChapterDetailOut(
                number=c.number,
                title=c.title or f"Chapter {c.number}",
                content=c.content,
                word_count=len(c.content.split()),
            )

    raise HTTPException(status_code=404, detail=f"Chapter {chapter_number} not found")


@router.put(
    "/projects/{project_id}/manuscripts/{manuscript_id}/chapters/{chapter_number}",
    response_model=ChapterDetailOut,
)
def update_manuscript_chapter(
    project_id: uuid.UUID,
    manuscript_id: uuid.UUID,
    chapter_number: int,
    payload: ChapterUpdateIn,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChapterDetailOut:
    """Update prose content of a chapter in the manuscript."""
    manuscript = db.get(Manuscript, manuscript_id)
    if manuscript is None or manuscript.project_id != project.id:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    if not manuscript.raw_text:
        raise HTTPException(status_code=404, detail="Manuscript has no content")

    parsed = splitter.split_chapters(manuscript.raw_text)
    target_idx = None
    for idx, c in enumerate(parsed):
        if c.number == chapter_number:
            target_idx = idx
            break

    if target_idx is None:
        raise HTTPException(status_code=404, detail=f"Chapter {chapter_number} not found")

    # Reconstruct raw_text with updated chapter
    reconstructed_parts = []
    for idx, c in enumerate(parsed):
        title = payload.title if (idx == target_idx and payload.title) else c.title
        content = payload.content if idx == target_idx else c.content
        reconstructed_parts.append(f"{title}\n\n{content}")

    manuscript.raw_text = "\n\n".join(reconstructed_parts)
    db.commit()
    db.refresh(manuscript)

    return ChapterDetailOut(
        number=chapter_number,
        title=payload.title or parsed[target_idx].title or f"Chapter {chapter_number}",
        content=payload.content,
        word_count=len(payload.content.split()),
    )

