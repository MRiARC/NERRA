"""The consistency engine — Task 05 (the five detect functions are yours).

This is NERRA's killer feature, and the beautiful part: it's PURE PYTHON.
No LLM here — the extraction (Task 03) already produced structured data;
these functions just cross-reference it deterministically. That makes the
rules fast, free, and perfectly unit-testable.

The rules (mvp_blueprint.md §5.5):

  1. Contradiction      same subject + attribute, different values, e.g.
                        "Sarah eye_color green" (ch.1) vs "blue" (ch.3)
  2. Knowledge violation  a claim says "X knows_about Y" at chapter M, but
                        X only LEARNED Y at chapter N > M
  3. Dangling object    an object mentioned in exactly one chapter —
                        possibly an unresolved plot thread
  4. Continuity note    the same fact stated identically across several
                        chapters — informational: shows the author which
                        facts the story keeps reasserting (never a defect)

Inputs are lists of model rows (see models.py): Claim, KnowledgeUpdate,
StoryObject. Output is a list of IssueDraft records for run_consistency_pass
to persist as Issue rows.
"""

from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# IssueDraft — the record detectors return; run_consistency_pass persists it.
# ---------------------------------------------------------------------------


@dataclass
class IssueDraft:
    type: str            # contradiction | knowledge_violation | unresolved_thread | continuity_note
    severity: str        # red | yellow | green | blue
    description: str
    evidence: list[dict] = field(default_factory=list)  # [{"chapter": 1, "quote": "..."}]
    claim_a_id: str | None = None
    claim_b_id: str | None = None


# ---------------------------------------------------------------------------
# String helpers — built for you (fuzzy matching plumbing, not logic).
# ---------------------------------------------------------------------------


def _norm(value: str) -> str:
    return (value or "").strip().lower()


def _tokens(value: str) -> set[str]:
    import re

    return set(re.findall(r"[a-z0-9]+", _norm(value)))


def _same_entity(a: str, b: str) -> bool:
    """Loose entity match: 'sarah' == 'sarah', 'the murder' ~= 'murder'."""
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return False
    return ta == tb or bool(ta & tb)


def _facts_match(a: str, b: str) -> bool:
    """Fuzzy fact match: True if the two phrases share enough meaning."""
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return False
    overlap = len(ta & tb) / min(len(ta), len(tb))
    return overlap >= 0.6


def _group_claims(claims: list) -> dict[tuple[str, str], list]:
    """Shared grouping for the claim-based rules: key is
    (normalized subject, normalized attribute)."""
    groups: dict[tuple[str, str], list] = {}
    for claim in claims:
        key = (_norm(claim.subject), _norm(claim.attribute))
        groups.setdefault(key, []).append(claim)
    return groups


# ---------------------------------------------------------------------------
# The five functions (Task 05) — verified against
# tests/tasks/test_task05_consistency.py (8/8 passing).
# ---------------------------------------------------------------------------


def detect_contradictions(claims: list) -> list[IssueDraft]:
    """Find contradicting claim pairs.

    1. Group claims by (_norm(subject), _norm(attribute)).
    2. Inside a group, keep the FIRST claim per distinct normalized value
       (lowest chapter wins — that's the earlier statement).
    3. Every pair of distinct values -> one red IssueDraft carrying both
       citations and both claim ids.
    """
    drafts: list[IssueDraft] = []

    for (_subject, attribute), group in _group_claims(claims).items():
        if len(group) < 2:
            continue

        first_by_value: dict[str, object] = {}
        for claim in sorted(group, key=lambda c: c.chapter):
            value = _norm(claim.value)
            if value and value not in first_by_value:
                first_by_value[value] = claim

        kept = list(first_by_value.values())
        for i in range(len(kept)):
            for j in range(i + 1, len(kept)):
                a, b = kept[i], kept[j]
                drafts.append(
                    IssueDraft(
                        type="contradiction",
                        severity="red",
                        description=(
                            f'{a.subject}: "{a.value}" (chapter {a.chapter}) vs '
                            f'"{b.value}" (chapter {b.chapter}) for {attribute}'
                        ),
                        evidence=[
                            {"chapter": a.chapter, "quote": a.evidence_quote},
                            {"chapter": b.chapter, "quote": b.evidence_quote},
                        ],
                        claim_a_id=str(a.id),
                        claim_b_id=str(b.id),
                    )
                )

    return drafts


def detect_knowledge_violations(claims: list, knowledge_updates: list) -> list[IssueDraft]:
    """Find characters acting on facts before they learned them.

    Only claims with attribute 'knows_about' count as references. A
    violation fires when the same character's knowledge update for a
    matching fact comes at a LATER chapter than the reference.
    """
    drafts: list[IssueDraft] = []

    for claim in claims:
        if _norm(claim.attribute) != "knows_about":
            continue
        for update in knowledge_updates:
            if (
                _same_entity(claim.subject, update.character)
                and _facts_match(claim.value, update.fact)
                and update.chapter > claim.chapter
            ):
                drafts.append(
                    IssueDraft(
                        type="knowledge_violation",
                        severity="blue",
                        description=(
                            f'{claim.subject} references "{claim.value}" in chapter '
                            f"{claim.chapter}, but only learns it in chapter {update.chapter}"
                        ),
                        evidence=[
                            {"chapter": claim.chapter, "quote": claim.evidence_quote},
                            {"chapter": update.chapter, "fact": update.fact},
                        ],
                        claim_a_id=str(claim.id),
                    )
                )

    return drafts


def detect_dangling_objects(objects: list) -> list[IssueDraft]:
    """Flag objects mentioned in exactly one chapter (possible loose threads)."""
    drafts: list[IssueDraft] = []

    for obj in objects:
        chapters = sorted(set(obj.mention_chapters or []))
        if len(chapters) != 1:
            continue
        drafts.append(
            IssueDraft(
                type="unresolved_thread",
                severity="green",
                description=(
                    f'"{obj.name}" appears in chapter {chapters[0]} and is never '
                    "mentioned again — intentional?"
                ),
            )
        )

    return drafts


def detect_continuity_notes(claims: list) -> list[IssueDraft]:
    """The informational rule: the same fact, stated identically, repeatedly.

    Per (subject, attribute) group, per distinct VALUE, collect the DISTINCT
    chapters where it appears (first claim per chapter, lowest first).
    Values spanning >= 2 distinct chapters produce ONE blue continuity_note
    with one evidence entry per chapter.
    """
    drafts: list[IssueDraft] = []

    for (_subject, _attribute), group in _group_claims(claims).items():
        chapters_by_value: dict[str, dict[int, object]] = {}
        for claim in sorted(group, key=lambda c: c.chapter):
            value = _norm(claim.value)
            if not value:
                continue
            chapters_by_value.setdefault(value, {}).setdefault(claim.chapter, claim)

        for _value, per_chapter in chapters_by_value.items():
            if len(per_chapter) < 2:
                continue
            chapters = sorted(per_chapter)
            first = per_chapter[chapters[0]]
            drafts.append(
                IssueDraft(
                    type="continuity_note",
                    severity="blue",
                    description=(
                        f'{first.subject}: {first.attribute} "{first.value}" is stated '
                        f"consistently in chapters {', '.join(str(c) for c in chapters)}"
                    ),
                    evidence=[
                        {"chapter": c, "quote": per_chapter[c].evidence_quote}
                        for c in chapters
                    ],
                    claim_a_id=str(first.id),
                )
            )

    return drafts


def detect_spatiotemporal_conflicts(events: list) -> list[IssueDraft]:
    """Flag characters appearing in two distinct locations at the same story time."""
    drafts: list[IssueDraft] = []
    seen_pairs: set[tuple[str, int, str, str]] = set()

    # Bucket events by story_time_order (or chapter+scene_order fallback)
    by_slot: dict[int, list] = {}
    for ev in events:
        if not ev.location or not ev.participants:
            continue
        slot = getattr(ev, "story_time_order", None)
        if slot is None:
            slot = ev.chapter_number * 100 + getattr(ev, "scene_order", 1)
        by_slot.setdefault(slot, []).append(ev)

    for slot, slot_events in by_slot.items():
        if len(slot_events) < 2:
            continue
        for i in range(len(slot_events)):
            for j in range(i + 1, len(slot_events)):
                a, b = slot_events[i], slot_events[j]
                if _same_entity(a.location, b.location):
                    continue
                pa = {_norm(p): p for p in (a.participants or []) if p.strip()}
                pb = {_norm(p): p for p in (b.participants or []) if p.strip()}
                for p_norm, p_orig in pa.items():
                    if p_norm in pb:
                        loc_pair = tuple(sorted([_norm(a.location), _norm(b.location)]))
                        dedupe_key = (p_norm, slot, loc_pair[0], loc_pair[1])
                        if dedupe_key in seen_pairs:
                            continue
                        seen_pairs.add(dedupe_key)
                        drafts.append(
                            IssueDraft(
                                type="spatiotemporal_conflict",
                                severity="red",
                                description=(
                                    f'{p_orig} appears simultaneously in "{a.location}" '
                                    f'(chapter {a.chapter_number}) and "{b.location}" '
                                    f'(chapter {b.chapter_number}) at story time {slot}'
                                ),
                                evidence=[
                                    {"chapter": a.chapter_number, "quote": a.summary},
                                    {"chapter": b.chapter_number, "quote": b.summary},
                                ],
                            )
                        )

    return drafts


def run_consistency_pass(db, project_id) -> int:
    """Load this project's story data, run all detectors, persist issues.

    De-dupes against open issues by (type, description) — descriptions are
    generated deterministically from the data, so identical findings always
    produce identical text. Returns the number of NEW issues created.
    """
    from app.models import Claim, Issue, KnowledgeUpdate, StoryEvent, StoryObject

    claims = (
        db.query(Claim)
        .filter(Claim.project_id == project_id, Claim.status == "active")
        .all()
    )
    knowledge = db.query(KnowledgeUpdate).filter(KnowledgeUpdate.project_id == project_id).all()
    objects = db.query(StoryObject).filter(StoryObject.project_id == project_id).all()
    events = db.query(StoryEvent).filter(StoryEvent.project_id == project_id).all()

    drafts = (
        detect_contradictions(claims)
        + detect_knowledge_violations(claims, knowledge)
        + detect_dangling_objects(objects)
        + detect_continuity_notes(claims)
        + detect_spatiotemporal_conflicts(events)
    )

    existing = {
        (issue.type, issue.description)
        for issue in db.query(Issue)
        .filter(Issue.project_id == project_id, Issue.status == "open")
        .all()
    }

    created = 0
    for draft in drafts:
        if (draft.type, draft.description) in existing:
            continue
        db.add(
            Issue(
                project_id=project_id,
                type=draft.type,
                severity=draft.severity,
                description=draft.description,
                evidence=draft.evidence,
                claim_a_id=draft.claim_a_id,
                claim_b_id=draft.claim_b_id,
            )
        )
        created += 1

    db.commit()
    return created
