"""Task 05 tests — the consistency engine (pure logic + one DB pass).

No LLM, no mocking needed: the detectors take plain model rows, which we
construct directly. `id=uuid.uuid4()` is passed explicitly because SQLAlchemy
assigns ids at flush time and the detectors reference them.
"""

import uuid

import pytest

from app.models import Claim, Issue, KnowledgeUpdate, Project, StoryObject, User
from app.services import consistency
from app.services.consistency import IssueDraft
from tests.utils import run_or_hint

TASK = "05-consistency-checker"


def _claim(subject, attribute, value, chapter, quote="...") -> Claim:
    return Claim(
        id=uuid.uuid4(),
        subject=subject,
        attribute=attribute,
        value=value,
        chapter=chapter,
        evidence_quote=quote,
    )


def test_detect_contradictions():
    claims = [
        _claim("Sarah", "eye_color", "green", 1, "Her green eyes scanned the platform."),
        _claim("Park", "rank", "Detective", 1),
        _claim("Sarah", "eye_color", "blue", 3, "Sarah's blue eyes sparkled."),
        _claim("Sarah", "eye_color", "green", 7),  # same value as ch.1 -> no new pair
    ]
    drafts = run_or_hint(TASK, lambda: consistency.detect_contradictions(claims))
    assert len(drafts) == 1, f"[{TASK}] expected exactly 1 contradiction pair, got {len(drafts)}"
    draft = drafts[0]
    assert draft.type == "contradiction" and draft.severity == "red"
    assert len(draft.evidence) == 2
    assert {e["chapter"] for e in draft.evidence} == {1, 3}
    assert draft.claim_a_id and draft.claim_b_id


def test_no_contradiction_when_values_match():
    claims = [
        _claim("Sarah", "eye_color", "green", 1),
        _claim("Sarah", "eye_color", "green", 5),
    ]
    drafts = run_or_hint(TASK, lambda: consistency.detect_contradictions(claims))
    assert drafts == [], f"[{TASK}] identical values must NOT be flagged, got {drafts}"


def test_detect_knowledge_violations():
    claims = [_claim("Park", "knows_about", "the murder", 2, "Park asked who committed the murder.")]
    learned_late = KnowledgeUpdate(character="Park", fact="the murder in the library", chapter=3)
    learned_early = KnowledgeUpdate(character="Park", fact="the murder", chapter=1)

    drafts = run_or_hint(
        TASK, lambda: consistency.detect_knowledge_violations(claims, [learned_late, learned_early])
    )
    assert len(drafts) == 1, (
        f"[{TASK}] referencing 'the murder' in ch.2 but learning it in ch.3 is ONE violation; got {len(drafts)}"
    )
    assert drafts[0].type == "knowledge_violation" and drafts[0].severity == "blue"


def test_detect_knowledge_violations_normalizes_eventless_chapter_chronology():
    """Regression test for PR #21: eventless chapter 1 learning must not be inverted by chapter 9 slot 3."""
    from types import SimpleNamespace

    # Chapter 1 is eventless: Park learns "the silver key"
    learned_early = KnowledgeUpdate(character="Park", fact="the silver key opens the vault", chapter=1)
    # Chapter 9 has events: Park references "the silver key"
    claims = [_claim("Park", "knows_about", "the silver key opens the vault", 9, "Park used the silver key.")]
    # Chapter 9 has explicit story_time_order=3 from timeline analysis
    events = [
        SimpleNamespace(chapter_number=9, story_time_order=3, location="Vault", participants=["Park"], summary="Park entered vault")
    ]

    drafts = consistency.detect_knowledge_violations(claims, [learned_early], events=events)
    assert drafts == [], f"Learning in eventless Ch.1 before using in Ch.9 (slot 3) must NOT be flagged: {drafts}"


def test_knowledge_violation_requires_reference_claim():
    """A plain attribute claim ('eye_color') is not a knowledge reference."""
    claims = [_claim("Park", "eye_color", "green", 2)]
    knowledge = [KnowledgeUpdate(character="Park", fact="green eyes", chapter=3)]
    drafts = run_or_hint(TASK, lambda: consistency.detect_knowledge_violations(claims, knowledge))
    assert drafts == []


def test_detect_dangling_objects():
    objects = [
        StoryObject(name="brass compass", mention_chapters=[1]),
        StoryObject(name="red notebook", mention_chapters=[1, 2, 4]),
        StoryObject(name="silver key", mention_chapters=[]),
    ]
    drafts = run_or_hint(TASK, lambda: consistency.detect_dangling_objects(objects))
    assert len(drafts) == 1, f"[{TASK}] only the single-mention object should be flagged, got {len(drafts)}"
    assert drafts[0].type == "unresolved_thread" and drafts[0].severity == "green"
    assert "compass" in drafts[0].description


def test_detect_continuity_notes():
    claims = [
        _claim("Sarah", "eye_color", "green", 1, "green eyes"),
        _claim("Sarah", "eye_color", "green", 4, "still green eyes"),
        _claim("Sarah", "eye_color", "green", 4, "same-chapter repeat doesn't count"),
        _claim("Park", "rank", "Detective", 2),  # stated in one chapter only
    ]
    drafts = run_or_hint(TASK, lambda: consistency.detect_continuity_notes(claims))
    assert len(drafts) == 1, (
        f"[{TASK}] expected 1 continuity note for green@{{1,4}} (same-chapter repeats and "
        f"single-chapter facts don't count), got {len(drafts)}"
    )
    draft = drafts[0]
    assert draft.type == "continuity_note" and draft.severity == "blue"
    assert {e["chapter"] for e in draft.evidence} == {1, 4}


def test_continuity_notes_do_not_fire_on_changed_values():
    claims = [
        _claim("Sarah", "eye_color", "green", 1),
        _claim("Sarah", "eye_color", "blue", 3),
    ]
    drafts = run_or_hint(TASK, lambda: consistency.detect_continuity_notes(claims))
    assert drafts == [], (
        f"[{TASK}] differing values across chapters are detect_contradictions' job, got {drafts}"
    )


@pytest.fixture()
def project(db_session):
    user = User(email=f"{uuid.uuid4().hex[:8]}@nerra.dev", password_hash="x")
    db_session.add(user)
    db_session.commit()
    project = Project(owner_id=user.id, title="Consistency Tests")
    db_session.add(project)
    db_session.commit()
    return project


def test_run_consistency_pass_persists_and_dedupes(db_session, project):
    claims = [
        _claim("Sarah", "eye_color", "green", 1, "green eyes"),
        _claim("Sarah", "eye_color", "blue", 3, "blue eyes"),
    ]
    for claim in claims:
        claim.project_id = project.id
    db_session.add_all(claims)
    db_session.add(StoryObject(project_id=project.id, name="brass compass", mention_chapters=[1]))
    db_session.commit()

    created = run_or_hint(TASK, lambda: consistency.run_consistency_pass(db_session, project.id))
    assert created >= 2, f"[{TASK}] expected at least contradiction + dangling object, created {created}"
    assert db_session.query(Issue).filter_by(project_id=project.id).count() == created

    # Running again must not duplicate open issues.
    created_again = run_or_hint(TASK, lambda: consistency.run_consistency_pass(db_session, project.id))
    assert created_again == 0, f"[{TASK}] identical open issues must not be re-created (got {created_again})"
