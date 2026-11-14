"""Cross-Chapter Plot Thread Tracker & Project Customization Hooks — Milestone 3.4."""

import logging
import uuid
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def _as_uuid(value) -> uuid.UUID:
    return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


# ---------------------------------------------------------------------------
# Feature Customization Hooks (5 Extension Points)
# ---------------------------------------------------------------------------


def get_customization(db: Session, project_id) -> dict[str, Any]:
    """Return the project's customization hooks or safe defaults."""
    from app.models import ProjectCustomization

    pid = _as_uuid(project_id)
    row = db.query(ProjectCustomization).filter(ProjectCustomization.project_id == pid).first()
    if row is None:
        return {
            "project_id": pid,
            "custom_context": None,
            "custom_prompt": None,
            "custom_validation": {},
            "custom_graph_write": {},
            "custom_ui_config": {},
            "updated_at": None,
        }
    return {
        "project_id": row.project_id,
        "custom_context": row.custom_context,
        "custom_prompt": row.custom_prompt,
        "custom_validation": dict(row.custom_validation or {}),
        "custom_graph_write": dict(row.custom_graph_write or {}),
        "custom_ui_config": dict(row.custom_ui_config or {}),
        "updated_at": row.updated_at,
    }


def upsert_customization(db: Session, project_id, payload: dict[str, Any]):
    """Create or update the 5 Feature Customization hooks for a project."""
    from app.models import ProjectCustomization

    pid = _as_uuid(project_id)
    row = db.query(ProjectCustomization).filter(ProjectCustomization.project_id == pid).first()
    if row is None:
        row = ProjectCustomization(project_id=pid)
        db.add(row)

    row.custom_context = payload.get("custom_context")
    row.custom_prompt = payload.get("custom_prompt")
    row.custom_validation = dict(payload.get("custom_validation") or {})
    row.custom_graph_write = dict(payload.get("custom_graph_write") or {})
    row.custom_ui_config = dict(payload.get("custom_ui_config") or {})
    db.commit()
    db.refresh(row)
    return row


# ---------------------------------------------------------------------------
# Cross-Chapter LLM Plot Thread Tracker
# ---------------------------------------------------------------------------


def _upsert_thread(
    db: Session,
    project_id: uuid.UUID,
    *,
    title: str,
    description: str,
    setup_chapter: int,
    payoff_chapter: int | None,
    status: str,
    related_entities: list[str],
    evidence_quote: str | None,
):
    from app.models import PlotThread

    cleaned_title = title.strip()
    if not cleaned_title:
        return None
    existing = (
        db.query(PlotThread)
        .filter(PlotThread.project_id == project_id)
        .all()
    )
    match = next(
        (t for t in existing if t.title.strip().lower() == cleaned_title.lower()),
        None,
    )
    valid_status = status if status in {"open", "resolved", "abandoned", "red_herring"} else "open"

    if match is not None:
        if description:
            match.description = description
        match.status = valid_status
        if payoff_chapter is not None:
            match.payoff_chapter = payoff_chapter
        elif valid_status == "resolved" and match.payoff_chapter is None:
            match.payoff_chapter = setup_chapter
        if related_entities:
            merged = list(dict.fromkeys([*(match.related_entities or []), *related_entities]))
            match.related_entities = merged
        if evidence_quote:
            match.evidence_quote = evidence_quote
        return match

    row = PlotThread(
        project_id=project_id,
        title=cleaned_title,
        description=description or cleaned_title,
        setup_chapter=max(1, int(setup_chapter or 1)),
        payoff_chapter=payoff_chapter,
        status=valid_status,
        related_entities=list(dict.fromkeys([e.strip() for e in related_entities if e and e.strip()])),
        evidence_quote=evidence_quote,
    )
    db.add(row)
    return row


def extract_and_update_plot_threads_llm(
    db: Session,
    project_id,
    chapter_number: int,
    chapter_text: str,
    use_llm: bool = True,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> list:
    """Use Claude Sonnet to detect new setups/mysteries and resolve existing open threads."""
    from app.config import settings
    from app.models import PlotThread
    from app.services import extractor, llm_budget

    pid = _as_uuid(project_id)
    active_key = api_key or settings.anthropic_api_key
    if not use_llm or not active_key or not (chapter_text or "").strip():
        return db.query(PlotThread).filter(PlotThread.project_id == pid).order_by(PlotThread.setup_chapter.asc()).all()

    class ThreadUpdateItem(BaseModel):
        title: str
        description: str
        setup_chapter: int = Field(default=chapter_number)
        payoff_chapter: int | None = None
        status: str = Field(default="open", description="open | resolved | abandoned | red_herring")
        related_entities: list[str] = Field(default_factory=list)
        evidence_quote: str | None = None

    class PlotThreadBatch(BaseModel):
        threads: list[ThreadUpdateItem] = Field(default_factory=list)

    active_model = model or settings.chat_model
    budget = llm_budget.compute_input_char_budget(
        active_model, max_output_tokens=2048, overhead_tokens=4000
    )
    windows = llm_budget.split_text_windows(chapter_text, budget)

    try:
        try:
            client = extractor.get_anthropic_client(api_key=active_key, base_url=base_url)
        except TypeError:
            client = extractor.get_anthropic_client()
        for win in windows:
            prior = db.query(PlotThread).filter(PlotThread.project_id == pid).all()
            prior_summary = (
                "\n".join(
                    f"- [{t.status}] Ch.{t.setup_chapter} '{t.title}': {t.description}"
                    for t in prior
                )
                or "None yet"
            )
            prompt = (
                f"Analyze Chapter {chapter_number} for narrative Plot Threads (mysteries, promises, setups, clues, and payoffs).\n"
                "- Introduce NEW threads when a setup, unanswered question, prophecy, secret object, or goal opens.\n"
                "- Update EXISTING open threads to `resolved` (with `payoff_chapter`), `abandoned`, or `red_herring` when this chapter resolves or subverts them.\n\n"
                f"EXISTING PLOT THREADS:\n{prior_summary}\n\n"
                f"CHAPTER {chapter_number} TEXT:\n{win}"
            )
            resp = client.messages.create(
                model=active_model,
                max_tokens=2048,
                tools=[
                    {
                        "name": "save_plot_threads",
                        "description": "Save new and updated narrative plot threads",
                        "input_schema": PlotThreadBatch.model_json_schema(),
                    }
                ],
                tool_choice={"type": "tool", "name": "save_plot_threads"},
                messages=[{"role": "user", "content": prompt}],
            )
            for block in resp.content:
                if getattr(block, "type", None) == "tool_use" and block.name == "save_plot_threads":
                    parsed = PlotThreadBatch.model_validate(block.input)
                    for item in parsed.threads:
                        _upsert_thread(
                            db,
                            pid,
                            title=item.title,
                            description=item.description,
                            setup_chapter=item.setup_chapter or chapter_number,
                            payoff_chapter=item.payoff_chapter,
                            status=item.status,
                            related_entities=item.related_entities,
                            evidence_quote=item.evidence_quote,
                        )
                    db.commit()
                    break
    except Exception as exc:  # noqa: BLE001
        logger.debug("Plot thread LLM extraction skipped/fallback: %s", exc)

    return (
        db.query(PlotThread)
        .filter(PlotThread.project_id == pid)
        .order_by(PlotThread.setup_chapter.asc(), PlotThread.title.asc())
        .all()
    )


def synthesize_all_plot_threads_llm(
    db: Session,
    project_id,
    use_llm: bool = True,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> list:
    """Synthesize plot threads across all stored chapter chunks for a project."""
    from app.models import Chunk, Manuscript
    from app.services import extractor, graph

    pid = _as_uuid(project_id)
    creds = extractor.resolve_ai_credentials(
        db=db,
        project_id=pid,
        explicit_api_key=api_key,
        explicit_base_url=base_url,
        explicit_model=model,
    )
    chunks = (
        db.query(Chunk)
        .join(Manuscript, Chunk.manuscript_id == Manuscript.id)
        .filter(Manuscript.project_id == pid)
        .order_by(Chunk.chapter_number.asc())
        .all()
    )
    rows = []
    for ch in chunks:
        rows = extract_and_update_plot_threads_llm(
            db,
            pid,
            ch.chapter_number,
            ch.content,
            use_llm=use_llm,
            api_key=creds["api_key"],
            base_url=creds["base_url"],
            model=creds["model"],
        )
    try:
        graph.sync_project_graph(db, pid)
    except Exception:  # noqa: BLE001
        pass
    return rows


def list_plot_threads(db: Session, project_id) -> list:
    from app.models import PlotThread

    pid = _as_uuid(project_id)
    return (
        db.query(PlotThread)
        .filter(PlotThread.project_id == pid)
        .order_by(PlotThread.setup_chapter.asc(), PlotThread.title.asc())
        .all()
    )


def create_plot_thread(db: Session, project_id, data: dict[str, Any]):
    from app.services import graph

    pid = _as_uuid(project_id)
    row = _upsert_thread(
        db,
        pid,
        title=data["title"],
        description=data["description"],
        setup_chapter=data.get("setup_chapter", 1),
        payoff_chapter=data.get("payoff_chapter"),
        status=data.get("status", "open"),
        related_entities=data.get("related_entities") or [],
        evidence_quote=data.get("evidence_quote"),
    )
    db.commit()
    if row is not None:
        db.refresh(row)
    try:
        graph.sync_project_graph(db, pid)
    except Exception:  # noqa: BLE001
        pass
    return row


def patch_plot_thread(db: Session, project_id, thread_id, data: dict[str, Any]):
    from app.models import PlotThread
    from app.services import graph

    pid = _as_uuid(project_id)
    tid = _as_uuid(thread_id)
    row = db.get(PlotThread, tid)
    if row is None or row.project_id != pid:
        raise ValueError("Plot thread not found")

    if data.get("title") is not None:
        row.title = data["title"].strip()
    if data.get("description") is not None:
        row.description = data["description"]
    if data.get("payoff_chapter") is not None:
        row.payoff_chapter = data["payoff_chapter"]
    if data.get("status") is not None:
        row.status = data["status"]
    if data.get("related_entities") is not None:
        row.related_entities = list(data["related_entities"])

    db.commit()
    db.refresh(row)
    try:
        graph.sync_project_graph(db, pid)
    except Exception:  # noqa: BLE001
        pass
    return row
