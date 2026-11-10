"""Manuscript import, chapter re-analysis, and pipeline status routes."""

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_owned_project
from app.database import get_db
from app.models import Manuscript, User
from app.schemas import ImportOut, StatusOut
from app.services.pipeline import run_import_pipeline_guarded

router = APIRouter(tags=["manuscripts"])

MAX_IMPORT_BYTES = 5 * 1024 * 1024  # 5 MB is plenty for demo manuscripts


def _extract_text(file: UploadFile | None, pasted_text: str) -> str:
    """Get plain text from an uploaded file (.txt/.md/.docx) or pasted text."""
    if file is not None:
        data = file.file.read(MAX_IMPORT_BYTES + 1)
        if len(data) > MAX_IMPORT_BYTES:
            raise HTTPException(status_code=413, detail="File too large (max 5 MB)")

        filename = (file.filename or "").lower()
        if filename.endswith(".docx"):
            import io

            from docx import Document  # python-docx

            document = Document(io.BytesIO(data))
            return "\n".join(p.text for p in document.paragraphs)

        if filename.endswith((".txt", ".md")) or file.content_type == "text/plain":
            return data.decode("utf-8", errors="replace")

        raise HTTPException(status_code=415, detail="Unsupported file type — use .txt, .md or .docx")

    return pasted_text


@router.post("/projects/{project_id}/manuscripts/import", response_model=ImportOut, status_code=201)
def import_manuscript(
    project_id: uuid.UUID,
    background: BackgroundTasks,
    title: str = Form(default=""),
    text: str = Form(default=""),
    file: UploadFile | None = File(default=None),
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
    background.add_task(run_import_pipeline_guarded, manuscript.id)

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


@router.post("/manuscripts/{manuscript_id}/reanalyze", response_model=StatusOut)
def reanalyze_manuscript(
    manuscript_id: uuid.UUID,
    project_id: uuid.UUID,
    chapter_number: int | None = None,  # optional: re-run a single chapter
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
            reanalyze_chapter(db, manuscript, chapter_number)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc))
    else:
        from app.services.pipeline import run_import_pipeline

        run_import_pipeline(manuscript.id, db)

    db.refresh(manuscript)
    return StatusOut(
        manuscript_id=manuscript.id,
        status=manuscript.status,
        chapters_done=manuscript.chapters_done,
        chapters_total=manuscript.chapters_total,
        error_note=manuscript.error_note,
    )
