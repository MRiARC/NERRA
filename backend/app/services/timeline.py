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
    re.compile(r"\b(\d+|one|two|three|four|five|ten|twenty)\s+years?\s+(earlier|ago|before)\b", re.I),
    re.compile(r"\b(\d+|one|two|three|four|five)\s+(months?|weeks?|days?)\s+(earlier|ago|before)\b", re.I),
    re.compile(r"\b(the\s+year\s+before|remembered\s+when|flashback|in\s+his\s+youth|in\s+her\s+childhood|back\s+then)\b", re.I),
]

_FLASHFORWARD_PATTERNS = [
    re.compile(r"\b(\d+|one|two|three|four|five|ten)\s+years?\s+(later|hence|afterward)\b", re.I),
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


def compute_story_chronology(db: Session, project_id) -> list:
    """Assign normalized `story_time_order` across all StoryEvents in a project.

    Ordering rule:
      1. Flashback events come earliest (ordered among themselves by narrative order).
      2. Main-present events follow sequentially by (chapter_number, scene_order).
      3. Flash-forward events come last.
    """
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
