"""Incremental Change Detector — Milestone 3.1.

Classifies incoming text changes (`first_import`, `new_chapter_added`,
`paragraph_edited`, `large_rewrite`, `unchanged`), computes paragraph-level
hashes/diffs, safely marks rewritten chapter claims stale, and supports
UUID-preserving character renames.
"""

import difflib
import hashlib
import uuid
from typing import Any

from sqlalchemy.orm import Session


def _hash_text(text: str) -> str:
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()


def compute_paragraph_hashes(chapter_text: str) -> list[str]:
    """Return SHA-256 hashes for each non-empty paragraph in a chapter."""
    paragraphs = [p.strip() for p in (chapter_text or "").split("\n\n") if p.strip()]
    return [_hash_text(p) for p in paragraphs]


def detect_changes(
    db: Session,
    project_id,
    new_text: str,
    existing_manuscript=None,
) -> dict[str, Any]:
    """Compare split chapters & paragraph hashes against prior stored chapters."""
    from app.models import ChapterAnalysis, Chunk, Manuscript
    from app.services import splitter

    pid = uuid.UUID(str(project_id)) if not isinstance(project_id, uuid.UUID) else project_id
    chapters = splitter.split_chapters(new_text)

    if existing_manuscript is None:
        existing_manuscript = (
            db.query(Manuscript)
            .filter(Manuscript.project_id == pid)
            .order_by(Manuscript.created_at.desc())
            .first()
        )

    if existing_manuscript is None:
        return {
            "event_type": "first_import",
            "changed_chapters": [c.number for c in chapters],
            "unchanged_chapters": [],
            "stale_claim_chapters": [],
            "paragraph_diffs": {
                c.number: {"lines_added": len(c.content.splitlines()), "lines_removed": 0, "changed_paragraphs": len(compute_paragraph_hashes(c.content))}
                for c in chapters
            },
        }

    prior_analyses = {
        ca.chapter_number: ca.content_hash
        for ca in db.query(ChapterAnalysis)
        .filter(ChapterAnalysis.manuscript_id == existing_manuscript.id)
        .all()
    }
    prior_chunks = {
        ch.chapter_number: ch
        for ch in db.query(Chunk)
        .filter(Chunk.manuscript_id == existing_manuscript.id)
        .all()
    }

    changed: list[int] = []
    unchanged: list[int] = []
    stale_claim_chapters: list[int] = []
    paragraph_diffs: dict[int, dict[str, Any]] = {}
    appended_new = False
    edited_small = False
    rewritten_large = False

    for ch in chapters:
        ch_hash = _hash_text(ch.content)
        old_hash = prior_analyses.get(ch.number)
        old_chunk = prior_chunks.get(ch.number)
        if old_hash is None and old_chunk is None:
            changed.append(ch.number)
            appended_new = True
            paragraph_diffs[ch.number] = {
                "lines_added": len(ch.content.splitlines()),
                "lines_removed": 0,
                "changed_paragraphs": len(compute_paragraph_hashes(ch.content)),
            }
            continue

        effective_old_hash = old_hash or (old_chunk.content_hash if old_chunk else None)
        if effective_old_hash == ch_hash:
            unchanged.append(ch.number)
            continue

        changed.append(ch.number)
        stale_claim_chapters.append(ch.number)
        old_text = old_chunk.content if old_chunk else ""
        old_lines = old_text.splitlines()
        new_lines = ch.content.splitlines()
        diff = list(difflib.unified_diff(old_lines, new_lines, lineterm=""))
        added = sum(1 for ln in diff if ln.startswith("+") and not ln.startswith("+++"))
        removed = sum(1 for ln in diff if ln.startswith("-") and not ln.startswith("---"))

        old_p = set(old_chunk.paragraph_hashes or []) if old_chunk and getattr(old_chunk, "paragraph_hashes", None) else set(compute_paragraph_hashes(old_text))
        new_p = compute_paragraph_hashes(ch.content)
        changed_paras = sum(1 for h in new_p if h not in old_p)

        paragraph_diffs[ch.number] = {
            "lines_added": added,
            "lines_removed": removed,
            "changed_paragraphs": changed_paras,
        }
        change_ratio = (added + removed) / max(len(old_lines), 1)
        if change_ratio >= 0.4 or changed_paras >= 3:
            rewritten_large = True
        else:
            edited_small = True

    if not changed:
        event_type = "unchanged"
    elif rewritten_large:
        event_type = "large_rewrite"
    elif edited_small:
        event_type = "paragraph_edited"
    elif appended_new:
        event_type = "new_chapter_added"
    else:
        event_type = "first_import"

    return {
        "event_type": event_type,
        "changed_chapters": changed,
        "unchanged_chapters": unchanged,
        "stale_claim_chapters": stale_claim_chapters,
        "paragraph_diffs": paragraph_diffs,
    }


def mark_chapter_claims_stale(db: Session, project_id, chapter_number: int) -> int:
    """Mark previously extracted active claims in a rewritten chapter as superseded."""
    from app.models import Claim

    pid = uuid.UUID(str(project_id)) if not isinstance(project_id, uuid.UUID) else project_id
    rows = (
        db.query(Claim)
        .filter(
            Claim.project_id == pid,
            Claim.chapter == chapter_number,
            Claim.status == "active",
        )
        .all()
    )
    for r in rows:
        r.status = "superseded"
    db.commit()
    return len(rows)


def rename_character_preserving_id(
    db: Session, project_id, character_id, new_name: str
):
    """Rename a character while preserving its UUID, moving the old name into aliases."""
    from app.models import Character, Claim, KnowledgeUpdate
    from app.services import graph

    pid = uuid.UUID(str(project_id)) if not isinstance(project_id, uuid.UUID) else project_id
    cid = uuid.UUID(str(character_id)) if not isinstance(character_id, uuid.UUID) else character_id
    char = db.get(Character, cid)
    if char is None or char.project_id != pid:
        raise ValueError("Character not found")

    cleaned = new_name.strip()
    if not cleaned:
        raise ValueError("New name cannot be empty")
    old_name = char.name
    if old_name.strip().lower() == cleaned.lower():
        return char

    aliases = list(char.aliases or [])
    if old_name not in aliases:
        aliases.append(old_name)
    aliases = [a for a in aliases if a.strip().lower() != cleaned.lower()]
    char.name = cleaned
    char.aliases = aliases

    for cl in db.query(Claim).filter(Claim.project_id == pid).all():
        if cl.subject.strip().lower() == old_name.strip().lower():
            cl.subject = cleaned
    for ku in db.query(KnowledgeUpdate).filter(KnowledgeUpdate.project_id == pid).all():
        if ku.character.strip().lower() == old_name.strip().lower():
            ku.character = cleaned
        if ku.source_character and ku.source_character.strip().lower() == old_name.strip().lower():
            ku.source_character = cleaned

    db.commit()
    db.refresh(char)
    try:
        graph.sync_project_graph(db, pid)
    except Exception:  # noqa: BLE001
        pass
    return char
