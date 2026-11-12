"""Dual Timeline Engine — Milestone 2.2.

Distinguishes Narrative Order (chapter & scene sequence) from Story-Chronological
Order (actual in-universe time), detecting flashbacks, flash-forwards, and
temporal anchor phrases.
"""

import re
import uuid
from typing import Any

from sqlalchemy.orm import Session

_FLASHBACK_PATTERNS = [
    re.compile(r"\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s+years?\s+before\s+the\s+[\w-]+\b", re.I),
    re.compile(r"\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|hundred|several|a\s+few)\s+years?\s+(earlier|ago|before|prior)\b", re.I),
    re.compile(r"\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|several|a\s+few)\s+(months?|weeks?|days?|decades?)\s+(earlier|ago|before|prior)\b", re.I),
    re.compile(r"\b(the\s+year\s+before|remembered\s+when|flashback|in\s+his\s+youth|in\s+her\s+childhood|back\s+then|prior\s+to\s+the\s+deluge|before\s+the\s+deluge)\b", re.I),
]

_FLASHFORWARD_PATTERNS = [
    re.compile(r"\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty)\s+years?\s+(later|hence|afterward)\b", re.I),
    re.compile(r"\b(years\s+from\s+now|flashforward|in\s+the\s+future|epilogue)\b", re.I),
]


def detect_temporal_markers(
    text: str,
    explicit_anchor: str | None = None,
    explicit_flashback: bool = False,
    explicit_flashforward: bool = False,
) -> tuple[str | None, bool, bool]:
    """Detect temporal anchor phrase and whether an event is a flashback or flash-forward."""
    anchor = explicit_anchor.strip() if explicit_anchor and explicit_anchor.strip() else None
    is_flashback = bool(explicit_flashback)
    is_flashforward = bool(explicit_flashforward)

    combined = f"{anchor or ''} {text or ''}"

    for pat in _FLASHBACK_PATTERNS:
        m = pat.search(combined)
        if m:
            is_flashback = True
            if not anchor:
                anchor = m.group(0)
            break

    if not is_flashback:
        for pat in _FLASHFORWARD_PATTERNS:
            m = pat.search(combined)
            if m:
                is_flashforward = True
                if not anchor:
                    anchor = m.group(0)
                break

    return anchor, is_flashback, is_flashforward


def order_events_chronologically_llm(events: list, use_llm: bool = True) -> list | None:
    """Use Claude to infer relative chronological ordering, unmarked flashbacks, and parallel time slots."""
    if not use_llm or len(events) < 2:
        return None
    try:
        from pydantic import BaseModel, Field

        from app.config import settings
        from app.services.extractor import get_anthropic_client

        if not settings.anthropic_api_key:
            return None

        class OrderedEventItem(BaseModel):
            event_index: int
            story_time_order: int
            is_flashback: bool = False
            is_flashforward: bool = False
            temporal_anchor: str | None = None

        class ChronologyPlan(BaseModel):
            ordered: list[OrderedEventItem] = Field(default_factory=list)

        event_lines = "\n".join(
            f"{idx}: [Ch.{ev.chapter_number}.{ev.scene_order}] {ev.summary} "
            f"(anchor={ev.temporal_anchor}, loc={ev.location})"
            for idx, ev in enumerate(events)
        )
        prompt = f"""Order these story events in true IN-UNIVERSE CHRONOLOGICAL ORDER (`story_time_order` starting at 1).
Use identical `story_time_order` integers for events happening SIMULTANEOUSLY in parallel locations.
Identify flashbacks (`is_flashback=true`) and flashforwards (`is_flashforward=true`) even without explicit keywords.

CRITICAL TIMELINE GUIDELINES:
- For historical flashbacks: calculate elapsed time from story present (e.g. an event 27 years ago occurred BEFORE an event 12 years ago, which occurred BEFORE present day).
- Order from OLDEST / EARLIEST in history (order=1) to LATEST / MOST RECENT.
- Assign an ordered entry for EVERY event_index from 0 to {len(events) - 1}.

EVENTS:
{event_lines}"""

        client = get_anthropic_client()
        dynamic_max_tokens = min(8192, max(2048, len(events) * 45))
        response = client.messages.create(
            model=settings.chat_model,
            max_tokens=dynamic_max_tokens,
            tools=[
                {
                    "name": "save_chronology",
                    "description": "Save true story-chronological order for events",
                    "input_schema": ChronologyPlan.model_json_schema(),
                }
            ],
            tool_choice={"type": "tool", "name": "save_chronology"},
            messages=[{"role": "user", "content": prompt}],
        )
        for block in response.content:
            if getattr(block, "type", None) == "tool_use" and block.name == "save_chronology":
                parsed = ChronologyPlan.model_validate(block.input)
                by_idx = {item.event_index: item for item in parsed.ordered}
                if len(by_idx) >= int(len(events) * 0.7):
                    for idx, ev in enumerate(events):
                        plan_item = by_idx.get(idx)
                        if plan_item is not None:
                            ev.story_time_order = plan_item.story_time_order
                            ev.is_flashback = plan_item.is_flashback
                            ev.is_flashforward = plan_item.is_flashforward
                            if plan_item.temporal_anchor:
                                ev.temporal_anchor = plan_item.temporal_anchor
                        else:
                            ev.story_time_order = max(1, ev.chapter_number * 10 + ev.scene_order)
                    return sorted(events, key=lambda e: (e.story_time_order, e.chapter_number, e.scene_order))
    except Exception as exc:  # noqa: BLE001
        import logging

        logging.getLogger(__name__).warning("LLM timeline chronology fallback to deterministic markers: %s", exc)
    return None


def compute_story_chronology(db: Session, project_id, use_llm: bool = True) -> list:
    """Assign normalized `story_time_order` across all StoryEvents in a project."""
    from app.models import StoryEvent

    pid = uuid.UUID(str(project_id)) if not isinstance(project_id, uuid.UUID) else project_id
    events = (
        db.query(StoryEvent)
        .filter(StoryEvent.project_id == pid)
        .order_by(StoryEvent.chapter_number.asc(), StoryEvent.scene_order.asc(), StoryEvent.created_at.asc())
        .all()
    )

    if not events:
        return []

    flashbacks = []
    present = []
    flashforwards = []

    for ev in events:
        anchor, fb, ff = detect_temporal_markers(
            ev.summary,
            explicit_anchor=ev.temporal_anchor,
            explicit_flashback=ev.is_flashback,
            explicit_flashforward=ev.is_flashforward,
        )
        if anchor and not ev.temporal_anchor:
            ev.temporal_anchor = anchor
        ev.is_flashback = fb
        ev.is_flashforward = ff

        if fb:
            flashbacks.append(ev)
        elif ff:
            flashforwards.append(ev)
        else:
            present.append(ev)

    llm_ordered = order_events_chronologically_llm(events, use_llm=use_llm)
    if llm_ordered is not None:
        db.commit()
        return llm_ordered

    ordered = flashbacks + present + flashforwards
    for idx, ev in enumerate(ordered, start=1):
        ev.story_time_order = idx

    db.commit()
    return ordered


def get_project_timeline(
    db: Session,
    project_id,
    order: str = "chronological",
    character: str | None = None,
) -> dict[str, Any]:
    """Return dual-timeline data for the project, optionally filtered by character."""
    from app.models import Issue, StoryEvent

    pid = uuid.UUID(str(project_id)) if not isinstance(project_id, uuid.UUID) else project_id

    query = db.query(StoryEvent).filter(StoryEvent.project_id == pid)
    if order == "narrative":
        events = query.order_by(StoryEvent.chapter_number.asc(), StoryEvent.scene_order.asc()).all()
    else:
        events = query.order_by(
            StoryEvent.story_time_order.asc(),
            StoryEvent.chapter_number.asc(),
            StoryEvent.scene_order.asc(),
        ).all()

    if character:
        target = character.strip().lower()
        events = [
            e
            for e in events
            if any(target == p.strip().lower() for p in (e.participants or []))
        ]

    characters_seen: list[str] = []
    seen_lower: set[str] = set()
    for ev in events:
        for p in ev.participants or []:
            low = p.strip().lower()
            if low and low not in seen_lower:
                seen_lower.add(low)
                characters_seen.append(p.strip())

    conflict_issues = (
        db.query(Issue)
        .filter(
            Issue.project_id == pid,
            Issue.type == "spatiotemporal_conflict",
            Issue.status == "open",
        )
        .all()
    )
    conflict_chapters: set[int] = set()
    for iss in conflict_issues:
        for ev in iss.evidence or []:
            ch = ev.get("chapter")
            if isinstance(ch, int):
                conflict_chapters.add(ch)

    return {
        "order": order,
        "events": events,
        "characters": sorted(characters_seen),
        "flashback_count": sum(1 for e in events if e.is_flashback),
        "flashforward_count": sum(1 for e in events if e.is_flashforward),
        "spatiotemporal_conflict_chapters": sorted(conflict_chapters),
    }
