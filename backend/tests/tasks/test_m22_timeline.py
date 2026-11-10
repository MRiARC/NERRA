"""Milestone 2.2 tests — Dual Timeline Engine & Spatiotemporal Conflict Checker."""

import uuid

import pytest

from app.models import Issue, Project, StoryEvent, User
from app.services import consistency, extractor, timeline
from app.services.extractor import ExtractedEvent, ExtractionPayload


@pytest.fixture()
def project(db_session):
    user = User(email=f"{uuid.uuid4().hex[:8]}@nerra.dev", password_hash="x")
    db_session.add(user)
    db_session.commit()
    proj = Project(owner_id=user.id, title="M2.2 Timeline Tests")
    db_session.add(proj)
    db_session.commit()
    return proj


def test_flashback_chronology_reorders_before_present(db_session, project):
    extractor.persist_extraction(
        db_session,
        project.id,
        1,
        ExtractionPayload(
            events=[
                ExtractedEvent(
                    summary="Sarah arrived at Ashford station in the rain.",
                    participants=["Sarah"],
                    location="Ashford Station",
                )
            ]
        ),
    )
    extractor.persist_extraction(
        db_session,
        project.id,
        3,
        ExtractionPayload(
            events=[
                ExtractedEvent(
                    summary="Three years earlier, Sarah received the brass compass from her grandfather.",
                    participants=["Sarah"],
                    location="London",
                )
            ]
        ),
    )

    ordered = timeline.compute_story_chronology(db_session, project.id)
    assert len(ordered) == 2
    assert ordered[0].chapter_number == 3
    assert ordered[0].is_flashback is True
    assert "three years earlier" in (ordered[0].temporal_anchor or "").lower()
    assert ordered[0].story_time_order == 1
    assert ordered[1].chapter_number == 1
    assert ordered[1].story_time_order == 2


def test_spatiotemporal_conflict_detected_on_simultaneous_locations(db_session, project):
    ev_london = StoryEvent(
        id=uuid.uuid4(),
        project_id=project.id,
        chapter_number=5,
        scene_order=1,
        story_time_order=501,
        summary="Marcus meets the informant in London.",
        participants=["Marcus"],
        location="London",
    )
    ev_tokyo = StoryEvent(
        id=uuid.uuid4(),
        project_id=project.id,
        chapter_number=5,
        scene_order=1,
        story_time_order=501,
        summary="Marcus boards the bullet train in Tokyo.",
        participants=["Marcus"],
        location="Tokyo",
    )
    ev_later = StoryEvent(
        id=uuid.uuid4(),
        project_id=project.id,
        chapter_number=6,
        scene_order=1,
        story_time_order=601,
        summary="Marcus sleeps at a Paris hotel.",
        participants=["Marcus"],
        location="Paris",
    )
    db_session.add_all([ev_london, ev_tokyo, ev_later])
    db_session.commit()

    drafts = consistency.detect_spatiotemporal_conflicts([ev_london, ev_tokyo, ev_later])
    assert len(drafts) == 1
    assert drafts[0].type == "spatiotemporal_conflict"
    assert drafts[0].severity == "red"
    assert "Marcus" in drafts[0].description

    created = consistency.run_consistency_pass(db_session, project.id)
    assert created >= 1
    assert db_session.query(Issue).filter_by(project_id=project.id, type="spatiotemporal_conflict").count() == 1


def test_timeline_endpoint_orders_chronological_vs_narrative(client, auth_headers, db_session):
    proj_res = client.post("/projects", json={"title": "Timeline API Test"}, headers=auth_headers)
    assert proj_res.status_code == 201
    pid = proj_res.json()["id"]

    db_session.add_all(
        [
            StoryEvent(
                project_id=uuid.UUID(pid),
                chapter_number=1,
                scene_order=1,
                summary="Present-day investigation begins.",
                participants=["Sarah"],
                location="Ashford",
            ),
            StoryEvent(
                project_id=uuid.UUID(pid),
                chapter_number=2,
                scene_order=1,
                summary="Five years ago, the fire destroyed the archive.",
                participants=["Sarah", "Arthur"],
                location="Archive",
            ),
        ]
    )
    db_session.commit()

    chrono = client.get(f"/projects/{pid}/timeline?order=chronological", headers=auth_headers).json()
    assert chrono["flashback_count"] == 1
    assert chrono["events"][0]["chapter_number"] == 2  # flashback comes first chronologically

    narr = client.get(f"/projects/{pid}/timeline?order=narrative", headers=auth_headers).json()
    assert narr["events"][0]["chapter_number"] == 1  # chapter 1 comes first in narrative order
