"""Milestone 2.5 tests: Graph RAG Chat, Draft Versioning/Diffs, Story Bible Export."""

import uuid

from app.agents import story_chat
from app.models import Character, Chunk, Claim, Issue, Manuscript, Project, Relationship, StoryEvent
from app.services import exporter


def test_classify_query_intent():
    assert story_chat.classify_query_intent("Did Park know about the murder?") == "epistemic"
    assert story_chat.classify_query_intent("What is the relationship between Sarah and Park?") == "relational"
    assert story_chat.classify_query_intent("What happened before the museum break-in timeline?") == "chronological"
    assert story_chat.classify_query_intent("What color are Sarah's eyes?") == "factual"


def test_graph_rag_retrieve_node_includes_entities_and_neighborhood(client, auth_headers, db_session, monkeypatch):
    project_id = uuid.UUID(
        client.post("/projects", json={"title": "RAG Novel"}, headers=auth_headers).json()["id"]
    )

    ms = Manuscript(
        project_id=project_id,
        title="Draft 1",
        raw_text="Chapter 1\nSarah and Park met at the pier.",
        chapters_total=1,
        chapters_done=1,
        status="ready",
    )
    db_session.add(ms)
    db_session.commit()
    db_session.refresh(ms)

    db_session.add(
        Chunk(
            manuscript_id=ms.id,
            chapter_number=1,
            content="Sarah handed Park the encrypted logbook beneath the harbor lantern.",
            content_hash="abc123",
        )
    )
    c1 = Character(project_id=project_id, name="Sarah", first_chapter=1, last_chapter=1)
    c2 = Character(project_id=project_id, name="Park", first_chapter=1, last_chapter=1)
    db_session.add_all([c1, c2])
    db_session.flush()
    db_session.add(
        Relationship(
            project_id=project_id,
            character_a_id=c1.id,
            character_b_id=c2.id,
            type="ally",
            sentiment="positive",
            chapter=1,
            description="Shared the logbook at the harbor",
        )
    )
    db_session.commit()

    monkeypatch.setattr(story_chat, "_compiled", None)
    monkeypatch.setattr("app.database.SessionLocal", lambda: db_session)
    # Prevent db.close() in retrieve_node from closing fixture session prematurely
    monkeypatch.setattr(db_session, "close", lambda: None)

    out = story_chat.retrieve_node(
        {
            "project_id": str(project_id),
            "question": "What is the relationship between Sarah and Park?",
        }
    )
    assert out["intent"] == "relational"
    assert "Sarah" in out["graph_entities"]
    assert "Park" in out["graph_entities"]
    joined = "\n".join(ctx["content"] for ctx in out["contexts"])
    assert "Sarah --[ally" in joined
    assert "logbook" in joined


def test_version_snapshot_and_bible_export_endpoints(client, auth_headers, db_session):
    project_id = uuid.UUID(
        client.post("/projects", json={"title": "The Ashford Bible"}, headers=auth_headers).json()["id"]
    )

    ms1 = Manuscript(
        project_id=project_id,
        title="Draft 1",
        raw_text="Line one\nLine two",
        chapters_total=1,
        chapters_done=1,
        status="ready",
    )
    db_session.add(ms1)
    db_session.commit()
    db_session.refresh(ms1)

    ch = Character(project_id=project_id, name="Sarah", aliases=["S."], first_chapter=1, last_chapter=2)
    db_session.add(ch)
    db_session.add(
        Claim(
            project_id=project_id,
            subject="Sarah",
            attribute="eye_color",
            value="green",
            chapter=1,
            evidence_quote="her green eyes",
        )
    )
    db_session.add(
        StoryEvent(
            project_id=project_id,
            chapter_number=1,
            scene_order=0,
            story_time_order=0.0,
            summary="Arrives in Ashford",
        )
    )
    db_session.add(
        Issue(
            project_id=project_id,
            type="contradiction",
            severity="red",
            evidence=[{"chapter": 1, "quote": "green eyes"}, {"chapter": 2, "quote": "blue eyes"}],
            description="Eye color changed from green to blue",
        )
    )
    db_session.commit()

    v1 = exporter.record_manuscript_version(db_session, ms1)
    assert v1.version_number == 1
    assert v1.diff_summary["lines_added"] == 2

    ms2 = Manuscript(
        project_id=project_id,
        title="Draft 2",
        raw_text="Line one\nLine two adjusted\nLine three",
        chapters_total=2,
        chapters_done=2,
        status="ready",
    )
    db_session.add(ms2)
    db_session.commit()
    db_session.refresh(ms2)

    v2 = exporter.record_manuscript_version(db_session, ms2)
    assert v2.version_number == 2
    assert v2.diff_summary["lines_added"] == 2
    assert v2.diff_summary["lines_removed"] == 1

    res_v = client.get(f"/projects/{project_id}/versions", headers=auth_headers)
    assert res_v.status_code == 200
    versions = res_v.json()
    assert len(versions) == 2
    assert versions[0]["version_number"] == 2

    res_b = client.get(f"/projects/{project_id}/export/bible", headers=auth_headers)
    assert res_b.status_code == 200
    body = res_b.json()
    assert body["project_title"] == "The Ashford Bible"
    assert "# The Ashford Bible — Living Story Bible" in body["markdown"]
    assert "### Sarah (Aliases: S.)" in body["markdown"]
    assert "Eye color changed from green to blue" in body["markdown"]
