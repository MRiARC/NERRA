"""Milestone 2.4 tests — LangGraph Contradiction Intent Reasoner & World Rules Engine."""

import uuid

import pytest

from app.agents import contradiction_reasoner
from app.models import Claim, Issue, Project, User, WorldRule
from app.services import consistency


@pytest.fixture()
def project(db_session):
    user = User(email=f"{uuid.uuid4().hex[:8]}@nerra.dev", password_hash="x")
    db_session.add(user)
    db_session.commit()
    proj = Project(owner_id=user.id, title="M2.4 Rules & Reasoner")
    db_session.add(proj)
    db_session.commit()
    return proj


def test_intent_reasoner_distinguishes_intentional_vs_error():
    intentional = contradiction_reasoner.analyze_issue_intent(
        project_id=uuid.uuid4(),
        issue_type="contradiction",
        description='Sarah: "Clara" (ch 1) vs "Sarah" (ch 2) for name',
        evidence=[{"chapter": 1, "quote": "She checked in under a false name."}],
        surrounding_context="She checked in under a false name to hide from Park.",
        use_llm=False,
    )
    assert intentional["intent_classification"] == "intentional"
    assert intentional["severity"] == "blue"

    err = contradiction_reasoner.analyze_issue_intent(
        project_id=uuid.uuid4(),
        issue_type="contradiction",
        description='Sarah: "green" (ch 1) vs "blue" (ch 3) for eye_color',
        evidence=[{"chapter": 1, "quote": "Her green eyes"}, {"chapter": 3, "quote": "Her blue eyes"}],
        surrounding_context="Normal morning scene.",
        use_llm=False,
    )
    assert err["intent_classification"] == "error"
    assert err["severity"] == "red"
    assert err["confidence"] >= 0.85


def test_world_rule_violation_detector(db_session, project):
    rule = WorldRule(
        project_id=project.id,
        category="magic",
        rule_text="Magic cannot revive the dead",
        is_author_defined=True,
    )
    violating_claim = Claim(
        id=uuid.uuid4(),
        project_id=project.id,
        subject="Sarah",
        attribute="magic_action",
        value="used magic to revive the dead",
        chapter=4,
        evidence_quote="Sarah cast dark magic to revive the dead knight.",
    )
    confirming_claim = Claim(
        id=uuid.uuid4(),
        project_id=project.id,
        subject="Elder",
        attribute="lore",
        value="magic cannot revive the dead",
        chapter=1,
        evidence_quote="The Elder warned that magic cannot revive the dead.",
    )

    drafts = consistency.detect_world_rule_violations([violating_claim, confirming_claim], [rule])
    assert len(drafts) == 1
    assert drafts[0].type == "world_rule_violation"
    assert drafts[0].severity == "yellow"


def test_world_rules_and_issue_reason_endpoints(client, auth_headers, db_session, monkeypatch):
    proj_res = client.post("/projects", json={"title": "M2.4 API"}, headers=auth_headers)
    pid = proj_res.json()["id"]

    # Create world rule
    r_res = client.post(
        f"/projects/{pid}/world-rules",
        json={"category": "magic", "rule_text": "No iron weapons inside Ashford"},
        headers=auth_headers,
    )
    assert r_res.status_code == 201
    rule_id = r_res.json()["id"]

    list_res = client.get(f"/projects/{pid}/world-rules", headers=auth_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # Add an issue and run reasoner (with offline heuristic forced via monkeypatch)
    monkeypatch.setattr(
        contradiction_reasoner,
        "evaluate_issue_in_db",
        lambda db, issue, use_llm=True: contradiction_reasoner.evaluate_issue_in_db.__wrapped__(
            db, issue, use_llm=False
        )
        if hasattr(contradiction_reasoner.evaluate_issue_in_db, "__wrapped__")
        else None,
    )
    # Restore clean function & disable LLM via settings
    monkeypatch.undo()
    from app.config import settings

    monkeypatch.setattr(settings, "anthropic_api_key", "")

    issue = Issue(
        project_id=uuid.UUID(pid),
        type="contradiction",
        severity="yellow",
        description="Sarah eye color green vs blue",
        evidence=[{"chapter": 1, "quote": "green eyes"}],
    )
    db_session.add(issue)
    db_session.commit()

    reason_res = client.post(f"/projects/{pid}/issues/{issue.id}/reason", headers=auth_headers)
    assert reason_res.status_code == 200
    body = reason_res.json()
    assert body["intent_classification"] == "error"
    assert body["ai_reasoning"]

    del_res = client.delete(f"/projects/{pid}/world-rules/{rule_id}", headers=auth_headers)
    assert del_res.status_code == 204
