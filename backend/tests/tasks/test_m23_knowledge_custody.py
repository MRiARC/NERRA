"""Milestone 2.3 tests — Epistemic Knowledge Matrix & Object Chain-of-Custody."""

import uuid

import pytest

from app.models import Issue, ObjectCustodyEvent, Project, StoryObject, User
from app.services import consistency, extractor, knowledge
from app.services.extractor import (
    ExtractedCharacter,
    ExtractedCustodyEvent,
    ExtractedKnowledge,
    ExtractionPayload,
)


@pytest.fixture()
def project(db_session):
    user = User(email=f"{uuid.uuid4().hex[:8]}@nerra.dev", password_hash="x")
    db_session.add(user)
    db_session.commit()
    proj = Project(owner_id=user.id, title="M2.3 Knowledge & Custody")
    db_session.add(proj)
    db_session.commit()
    return proj


def test_knowledge_matrix_and_source_propagation(db_session, project):
    extractor.persist_extraction(
        db_session,
        project.id,
        1,
        ExtractionPayload(
            characters=[ExtractedCharacter(name="Sarah"), ExtractedCharacter(name="Park")],
            knowledge=[],
        ),
    )
    extractor.persist_extraction(
        db_session,
        project.id,
        2,
        ExtractionPayload(
            knowledge=[
                ExtractedKnowledge(
                    character="Park",
                    fact="the curator was poisoned",
                    how_learned="told",
                    source_character="Dr. Evans",
                )
            ]
        ),
    )

    matrix_ch1 = knowledge.build_knowledge_matrix(db_session, project.id, up_to_chapter=1)
    assert all(not cell["knows"] for cell in matrix_ch1["cells"])

    matrix_ch2 = knowledge.build_knowledge_matrix(db_session, project.id, up_to_chapter=2)
    cell_map = {(c["character"], c["fact"]): c for c in matrix_ch2["cells"]}
    assert cell_map[("Park", "the curator was poisoned")]["knows"] is True
    assert cell_map[("Dr. Evans", "the curator was poisoned")]["knows"] is True
    assert cell_map[("Dr. Evans", "the curator was poisoned")]["propagated"] is True
    assert cell_map[("Sarah", "the curator was poisoned")]["knows"] is False


def test_object_custody_paradox_flagged_and_cleared_on_retrieval(db_session, project):
    extractor.persist_extraction(
        db_session,
        project.id,
        2,
        ExtractionPayload(
            custody_events=[
                ExtractedCustodyEvent(
                    object_name="brass compass",
                    holder_type="location",
                    holder_name="Bellweather Safe",
                    action="locked",
                    evidence_quote="She locked the brass compass inside the Bellweather safe.",
                )
            ]
        ),
    )
    extractor.persist_extraction(
        db_session,
        project.id,
        4,
        ExtractionPayload(
            custody_events=[
                ExtractedCustodyEvent(
                    object_name="brass compass",
                    holder_type="character",
                    holder_name="Sarah",
                    action="used",
                    evidence_quote="Sarah checked the brass compass in the tunnel.",
                )
            ]
        ),
    )

    created = consistency.run_consistency_pass(db_session, project.id)
    assert created >= 1
    paradoxes = db_session.query(Issue).filter_by(project_id=project.id, type="custody_paradox").all()
    assert len(paradoxes) == 1
    assert paradoxes[0].severity == "red"
    assert "brass compass" in paradoxes[0].description

    # Test retrieval clears paradox when tested directly
    obj = db_session.query(StoryObject).filter_by(project_id=project.id, name="brass compass").one()
    e1 = ObjectCustodyEvent(
        id=uuid.uuid4(),
        project_id=project.id,
        object_id=obj.id,
        chapter=1,
        holder_type="location",
        holder_name="Safe",
        action="locked",
    )
    e2 = ObjectCustodyEvent(
        id=uuid.uuid4(),
        project_id=project.id,
        object_id=obj.id,
        chapter=2,
        holder_type="character",
        holder_name="Sarah",
        action="acquired",
    )
    e3 = ObjectCustodyEvent(
        id=uuid.uuid4(),
        project_id=project.id,
        object_id=obj.id,
        chapter=3,
        holder_type="character",
        holder_name="Sarah",
        action="used",
    )
    assert consistency.detect_custody_paradoxes([e1, e2, e3], {str(obj.id): obj}) == []


def test_knowledge_matrix_and_custody_endpoints(client, auth_headers, db_session):
    proj_res = client.post("/projects", json={"title": "M2.3 API"}, headers=auth_headers)
    pid = proj_res.json()["id"]

    extractor.persist_extraction(
        db_session,
        uuid.UUID(pid),
        1,
        ExtractionPayload(
            characters=[ExtractedCharacter(name="Alice")],
            custody_events=[
                ExtractedCustodyEvent(
                    object_name="silver key",
                    holder_type="character",
                    holder_name="Alice",
                    action="acquired",
                )
            ],
            knowledge=[ExtractedKnowledge(character="Alice", fact="secret vault code", how_learned="witnessed")],
        ),
    )

    km_res = client.get(f"/projects/{pid}/knowledge-matrix", headers=auth_headers)
    assert km_res.status_code == 200
    assert "Alice" in km_res.json()["characters"]

    world_res = client.get(f"/projects/{pid}/world", headers=auth_headers).json()
    obj_id = world_res["objects"][0]["id"]
    cust_res = client.get(f"/projects/{pid}/objects/{obj_id}/custody", headers=auth_headers)
    assert cust_res.status_code == 200
    assert cust_res.json()[0]["action"] == "acquired"
