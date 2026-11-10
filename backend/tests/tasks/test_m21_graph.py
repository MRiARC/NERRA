"""Milestone 2.1 tests — Neo4j Graph DB sync, SQL fallback, and relationship evolution."""

import uuid

import pytest

from app.config import settings
from app.models import Character, Location, Project, Relationship, StoryEvent, User
from app.services import extractor, graph
from app.services.extractor import (
    ExtractedCharacter,
    ExtractedEvent,
    ExtractedLocation,
    ExtractedRelationship,
    ExtractionPayload,
)


@pytest.fixture()
def project(db_session):
    user = User(email=f"{uuid.uuid4().hex[:8]}@nerra.dev", password_hash="x")
    db_session.add(user)
    db_session.commit()
    proj = Project(owner_id=user.id, title="M2.1 Graph Tests")
    db_session.add(proj)
    db_session.commit()
    return proj


def test_relationship_evolution_closes_previous_state(db_session, project):
    p1 = ExtractionPayload(
        characters=[ExtractedCharacter(name="Sarah"), ExtractedCharacter(name="Park")],
        relationships=[
            ExtractedRelationship(
                character_a="Sarah",
                character_b="Park",
                type="professional",
                sentiment="neutral",
                description="Met at the station",
            )
        ],
    )
    extractor.persist_extraction(db_session, project.id, 1, p1)

    # Evolve relationship in chapter 3
    p3 = ExtractionPayload(
        characters=[ExtractedCharacter(name="Sarah"), ExtractedCharacter(name="Park")],
        relationships=[
            ExtractedRelationship(
                character_a="Sarah",
                character_b="Park",
                type="enemy",
                sentiment="hostile",
                description="Park accuses Sarah",
            )
        ],
    )
    extractor.persist_extraction(db_session, project.id, 3, p3)

    rels = (
        db_session.query(Relationship)
        .filter(Relationship.project_id == project.id)
        .order_by(Relationship.chapter.asc())
        .all()
    )
    assert len(rels) == 2
    assert rels[0].type == "professional"
    assert rels[0].sentiment == "neutral"
    assert rels[0].chapter == 1
    assert rels[0].until_chapter == 3
    assert rels[1].type == "enemy"
    assert rels[1].sentiment == "hostile"
    assert rels[1].chapter == 3
    assert rels[1].until_chapter is None


def test_graph_projection_and_chapter_filtering_fallback(monkeypatch, db_session, project):
    monkeypatch.setattr(settings, "neo4j_enabled", False)

    p1 = ExtractionPayload(
        characters=[ExtractedCharacter(name="Sarah"), ExtractedCharacter(name="Park")],
        locations=[ExtractedLocation(name="Ashford Square")],
        events=[
            ExtractedEvent(
                summary="Sarah arrived at Ashford Square",
                participants=["Sarah"],
                location="Ashford Square",
            )
        ],
        relationships=[
            ExtractedRelationship(
                character_a="Sarah", character_b="Park", type="friend", sentiment="positive"
            )
        ],
    )
    extractor.persist_extraction(db_session, project.id, 1, p1)

    p3 = ExtractionPayload(
        characters=[ExtractedCharacter(name="Curator")],
        locations=[ExtractedLocation(name="Hollis Museum")],
        events=[
            ExtractedEvent(
                summary="Curator found at Hollis Museum",
                participants=["Curator", "Park"],
                location="Hollis Museum",
            )
        ],
    )
    extractor.persist_extraction(db_session, project.id, 3, p3)

    # Full graph
    full_graph = graph.get_project_graph(db_session, project.id)
    assert full_graph["neo4j_connected"] is False
    assert full_graph["max_chapter"] == 3
    labels = {n["label"] for n in full_graph["nodes"]}
    assert {"Sarah", "Park", "Ashford Square", "Curator", "Hollis Museum"}.issubset(labels)

    # Filtered up to chapter 1
    ch1_graph = graph.get_project_graph(db_session, project.id, max_chapter=1)
    ch1_labels = {n["label"] for n in ch1_graph["nodes"]}
    assert "Sarah" in ch1_labels
    assert "Curator" not in ch1_labels
    assert "Hollis Museum" not in ch1_labels

    # Multi-hop neighborhood around Sarah
    nbrs = graph.get_entity_neighborhood(db_session, project.id, "Sarah", hops=2)
    nbr_names = {n["name"] for n in nbrs}
    assert "Park" in nbr_names
    assert "Ashford Square" in nbr_names


def test_neo4j_live_sync_and_query_when_available(db_session, project):
    if not graph.is_neo4j_connected():
        pytest.skip("Neo4j Docker container is not running")

    p1 = ExtractionPayload(
        characters=[ExtractedCharacter(name="Alice"), ExtractedCharacter(name="Bob")],
        locations=[ExtractedLocation(name="Harbor")],
        events=[
            ExtractedEvent(summary="Alice met Bob at Harbor", participants=["Alice", "Bob"], location="Harbor")
        ],
        relationships=[
            ExtractedRelationship(
                character_a="Alice", character_b="Bob", type="ally", sentiment="positive"
            )
        ],
    )
    extractor.persist_extraction(db_session, project.id, 1, p1)

    sync_res = graph.sync_project_graph(db_session, project.id)
    assert sync_res["neo4j_connected"] is True
    assert sync_res["nodes"] >= 4
    assert sync_res["edges"] >= 3

    fetched = graph.get_project_graph(db_session, project.id)
    assert fetched["neo4j_connected"] is True
    assert {n["label"] for n in fetched["nodes"]} >= {"Alice", "Bob", "Harbor"}

    nbrs = graph.get_entity_neighborhood(db_session, project.id, "Alice", hops=2)
    assert any(n["name"] == "Harbor" for n in nbrs)


def test_graph_endpoint_returns_story_graph_shape(client, auth_headers):
    proj_res = client.post("/projects", json={"title": "Graph API Test"}, headers=auth_headers)
    assert proj_res.status_code == 201
    pid = proj_res.json()["id"]

    res = client.get(f"/projects/{pid}/graph", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert "nodes" in body and "edges" in body and "neo4j_connected" in body
