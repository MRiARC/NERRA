"""Epistemic Knowledge Matrix & Multi-Hop Propagation — Milestone 2.3.

Tracks "Who knows what, and since when?" across characters and key story facts,
including multi-hop propagation when characters share secrets (`told`).
"""

import re
import uuid
from typing import Any

from sqlalchemy.orm import Session


def _norm(val: str | None) -> str:
    return (val or "").strip().lower()


def _fact_tokens(val: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", _norm(val)))


def _facts_similar(a: str, b: str) -> bool:
    ta, tb = _fact_tokens(a), _fact_tokens(b)
    if not ta or not tb:
        return False
    return len(ta & tb) / min(len(ta), len(tb)) >= 0.6


def build_knowledge_matrix(
    db: Session, project_id, up_to_chapter: int | None = None
) -> dict[str, Any]:
    """Assemble Characters x Key Facts epistemic matrix with multi-hop propagation."""
    from app.models import Character, Claim, KnowledgeUpdate

    pid = uuid.UUID(str(project_id)) if not isinstance(project_id, uuid.UUID) else project_id
    characters = db.query(Character).filter(Character.project_id == pid).order_by(Character.name.asc()).all()
    updates = (
        db.query(KnowledgeUpdate)
        .filter(KnowledgeUpdate.project_id == pid)
        .order_by(KnowledgeUpdate.chapter.asc())
        .all()
    )
    claims = db.query(Claim).filter(Claim.project_id == pid, Claim.status == "active").all()

    char_names: list[str] = [c.name for c in characters]
    char_seen = {_norm(c.name) for c in characters}
    for u in updates:
        if _norm(u.character) not in char_seen and u.character.strip():
            char_seen.add(_norm(u.character))
            char_names.append(u.character.strip())

    # Canonicalize facts list
    canonical_facts: list[str] = []
    for u in updates:
        f = u.fact.strip()
        if not f:
            continue
        if not any(_facts_similar(f, existing) for existing in canonical_facts):
            canonical_facts.append(f)
    for cl in claims:
        if _norm(cl.attribute) == "knows_about":
            f = cl.value.strip()
            if f and not any(_facts_similar(f, existing) for existing in canonical_facts):
                canonical_facts.append(f)

    max_chapter = 1
    for u in updates:
        max_chapter = max(max_chapter, u.chapter)
    for c in characters:
        if c.last_chapter:
            max_chapter = max(max_chapter, c.last_chapter)

    # Map (char_norm, fact_canonical) -> earliest learning record
    learned: dict[tuple[str, str], dict[str, Any]] = {}

    def _canonical_for(raw_fact: str) -> str:
        for cf in canonical_facts:
            if _facts_similar(raw_fact, cf):
                return cf
        return raw_fact.strip()

    for u in updates:
        if up_to_chapter is not None and u.chapter > up_to_chapter:
            continue
        cf = _canonical_for(u.fact)
        key = (_norm(u.character), cf)
        prev = learned.get(key)
        if prev is None or u.chapter < prev["since_chapter"]:
            learned[key] = {
                "since_chapter": u.chapter,
                "how_learned": u.how_learned,
                "source_character": getattr(u, "source_character", None),
                "propagated": False,
            }

    # Multi-hop propagation: if X told Y fact F at chapter C, and X wasn't yet recorded
    # as knowing F by chapter C, ensure source character X is also flagged as knowing F,
    # and propagate transitive `told` chains up to 3 hops.
    for _hop in range(3):
        changed = False
        for u in updates:
            if up_to_chapter is not None and u.chapter > up_to_chapter:
                continue
            src = getattr(u, "source_character", None)
            if not src:
                continue
            cf = _canonical_for(u.fact)
            src_key = (_norm(src), cf)
            dst_key = (_norm(u.character), cf)
            # If destination knows via source at chapter C, source must know by chapter C
            if dst_key in learned and src_key not in learned:
                if _norm(src) not in char_seen and src.strip():
                    char_seen.add(_norm(src))
                    char_names.append(src.strip())
                learned[src_key] = {
                    "since_chapter": learned[dst_key]["since_chapter"],
                    "how_learned": "source_of_disclosure",
                    "source_character": None,
                    "propagated": True,
                }
                changed = True
        if not changed:
            break

    cells: list[dict[str, Any]] = []
    for cname in char_names:
        cnorm = _norm(cname)
        for fact in canonical_facts:
            rec = learned.get((cnorm, fact))
            if rec:
                cells.append(
                    {
                        "character": cname,
                        "fact": fact,
                        "knows": True,
                        "since_chapter": rec["since_chapter"],
                        "how_learned": rec["how_learned"],
                        "source_character": rec["source_character"],
                        "propagated": rec["propagated"],
                    }
                )
            else:
                cells.append(
                    {
                        "character": cname,
                        "fact": fact,
                        "knows": False,
                        "since_chapter": None,
                        "how_learned": None,
                        "source_character": None,
                        "propagated": False,
                    }
                )

    return {
        "characters": char_names,
        "facts": canonical_facts,
        "cells": cells,
        "max_chapter": max_chapter,
    }
