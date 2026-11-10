"""Milestone 3.2 tests: Pre-Graph Validation Gate, Quarantine, Resolve Actions & LLM Judge."""

import types
import uuid

from app.models import Character, Claim
from app.services import extractor, validator


def test_junk_entity_quarantined_and_ambiguous_title_split_merge_approve(db_session, client, auth_headers):
    pid = uuid.UUID(client.post("/projects", json={"title": "Validation Gate Test"}, headers=auth_headers).json()["id"])

    existing = Character(project_id=pid, name="Sarah Mitchell", aliases=[], status="active")
    db_session.add(existing)
    db_session.commit()
    db_session.refresh(existing)

    payload = extractor.ExtractionPayload(
        characters=[
            extractor.ExtractedCharacter(name="Monday", status="active"),
            extractor.ExtractedCharacter(name="Miss Mitchell", status="active"),
            extractor.ExtractedCharacter(name="Detective Park", status="active"),
        ],
        claims=[
            extractor.ExtractedClaim(
                subject="Detective Park",
                attribute="role",
                value="investigator",
                evidence_quote="Detective Park checked his notes.",
            )
        ],
    )

    approved, staged = validator.gate_and_commit_extraction(
        db_session,
        pid,
        None,
        1,
        "Detective Park checked his notes while Miss Mitchell waited on Monday.",
        payload,
        use_llm=False,
    )

    assert [c.name for c in approved.characters] == ["Detective Park"]
    routes = {row.payload.get("name"): row.route for row in staged}
    assert routes["Monday"] == "reject_hold"
    assert routes["Miss Mitchell"] == "human_review"

    char_names = {c.name for c in db_session.query(Character).filter(Character.project_id == pid).all()}
    assert "Monday" not in char_names
    assert "Miss Mitchell" not in char_names
    assert "Detective Park" in char_names

    # List candidates via API
    res_list = client.get(f"/projects/{pid}/candidates?status=pending", headers=auth_headers)
    assert res_list.status_code == 200
    items = {item["payload"]["name"]: item for item in res_list.json()}
    assert items["Monday"]["route"] == "reject_hold"
    assert items["Miss Mitchell"]["route"] == "human_review"

    # Reject Monday
    res_rej = client.post(
        f"/projects/{pid}/candidates/{items['Monday']['id']}/resolve",
        headers=auth_headers,
        json={"action": "reject"},
    )
    assert res_rej.status_code == 200
    assert res_rej.json()["status"] == "rejected"

    # Split Miss Mitchell into distinct character Clara Mitchell
    res_split = client.post(
        f"/projects/{pid}/candidates/{items['Miss Mitchell']['id']}/resolve",
        headers=auth_headers,
        json={"action": "split", "split_name": "Clara Mitchell"},
    )
    assert res_split.status_code == 200
    assert res_split.json()["status"] == "split"
    db_session.expire_all()
    after_names = {c.name for c in db_session.query(Character).filter(Character.project_id == pid).all()}
    assert "Clara Mitchell" in after_names

    # Stage another ambiguous relative and test merge onto Sarah Mitchell
    _, staged2 = validator.gate_and_commit_extraction(
        db_session,
        pid,
        None,
        2,
        "Mrs. Mitchell opened the door.",
        extractor.ExtractionPayload(characters=[extractor.ExtractedCharacter(name="Mrs. Mitchell")]),
        use_llm=False,
    )
    mrs_row = staged2[0]
    res_merge = client.post(
        f"/projects/{pid}/candidates/{mrs_row.id}/resolve",
        headers=auth_headers,
        json={"action": "merge", "target_character_id": str(existing.id)},
    )
    assert res_merge.status_code == 200
    assert res_merge.json()["status"] == "merged"
    db_session.refresh(existing)
    assert "Mrs. Mitchell" in (existing.aliases or [])


def test_llm_judge_pronoun_resolution_and_unreliable_narrator_downgrade(db_session, client, auth_headers, monkeypatch):
    pid = uuid.UUID(client.post("/projects", json={"title": "LLM Judge Test"}, headers=auth_headers).json()["id"])
    monkeypatch.setattr("app.config.settings.anthropic_api_key", "test-key")

    # 1) Pronoun resolution resolves "she" -> "Sarah" and commits
    pronoun_judgments = {
        "entity_judgments": [{"name": "Sarah", "confidence": 0.98}],
        "claim_judgments": [
            {
                "subject": "she",
                "attribute": "eye_color",
                "value": "green",
                "confidence": 0.95,
                "resolved_subject": "Sarah",
            }
        ],
        "narrator_unreliable": False,
    }
    monkeypatch.setattr(
        extractor,
        "get_anthropic_client",
        lambda: types.SimpleNamespace(
            messages=types.SimpleNamespace(
                create=lambda **_kw: types.SimpleNamespace(
                    content=[types.SimpleNamespace(type="tool_use", name="save_validation_judgments", input=pronoun_judgments)]
                )
            )
        ),
    )

    p1 = extractor.ExtractionPayload(
        characters=[extractor.ExtractedCharacter(name="Sarah")],
        claims=[
            extractor.ExtractedClaim(
                subject="she",
                attribute="eye_color",
                value="green",
                evidence_quote="She stared with green eyes.",
            )
        ],
    )
    approved1, staged1 = validator.gate_and_commit_extraction(
        db_session, pid, None, 1, "Sarah arrived. She stared with green eyes.", p1, use_llm=True
    )
    assert staged1 == []
    assert len(approved1.claims) == 1
    assert approved1.claims[0].subject == "Sarah"
    saved_claims = db_session.query(Claim).filter(Claim.project_id == pid).all()
    assert len(saved_claims) == 1 and saved_claims[0].subject == "Sarah"

    # 2) Unreliable narrator holds high-confidence claim for human_review, then approve commits it
    unreliable_judgments = {
        "entity_judgments": [],
        "claim_judgments": [
            {
                "subject": "Sarah",
                "attribute": "alibi",
                "value": "in Paris",
                "confidence": 0.94,
            }
        ],
        "narrator_unreliable": True,
    }
    monkeypatch.setattr(
        extractor,
        "get_anthropic_client",
        lambda: types.SimpleNamespace(
            messages=types.SimpleNamespace(
                create=lambda **_kw: types.SimpleNamespace(
                    content=[types.SimpleNamespace(type="tool_use", name="save_validation_judgments", input=unreliable_judgments)]
                )
            )
        ),
    )

    p2 = extractor.ExtractionPayload(
        claims=[
            extractor.ExtractedClaim(
                subject="Sarah",
                attribute="alibi",
                value="in Paris",
                evidence_quote="I swore to the police she was in Paris, though I knew I lied.",
            )
        ]
    )
    approved2, staged2 = validator.gate_and_commit_extraction(
        db_session, pid, None, 2, "I swore to the police she was in Paris, though I knew I lied.", p2, use_llm=True
    )
    assert approved2.claims == []
    assert len(staged2) == 1
    assert staged2[0].route == "human_review"
    assert staged2[0].confidence == 0.72

    res_app = client.post(
        f"/projects/{pid}/candidates/{staged2[0].id}/resolve",
        headers=auth_headers,
        json={"action": "approve"},
    )
    assert res_app.status_code == 200
    assert res_app.json()["status"] == "approved"
    assert db_session.query(Claim).filter(Claim.project_id == pid, Claim.attribute == "alibi").count() == 1
