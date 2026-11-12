"""Milestone 3.3 tests: Author Feedback Loop, CorrectionRules & Downstream Re-Audit."""

import types
import uuid

from app.models import Character, Chunk, Claim, CorrectionRule, Manuscript
from app.services import context_builder, extractor


def test_claim_override_rename_split_and_downstream_reaudit(db_session, client, auth_headers, monkeypatch):
    pid = uuid.UUID(client.post("/projects", json={"title": "Feedback Loop Test"}, headers=auth_headers).json()["id"])

    ms = Manuscript(
        project_id=pid,
        title="Draft 1",
        raw_text="Chapter 1\nSarah has blue eyes.\n\nChapter 2\nSarah blinked.",
        chapters_total=2,
        chapters_done=2,
        status="ready",
    )
    db_session.add(ms)
    db_session.flush()

    db_session.add_all(
        [
            Chunk(manuscript_id=ms.id, chapter_number=1, content="Sarah has blue eyes.", content_hash="h1", paragraph_hashes=[]),
            Chunk(manuscript_id=ms.id, chapter_number=2, content="Sarah blinked at the museum.", content_hash="h2", paragraph_hashes=[]),
        ]
    )

    char = Character(project_id=pid, name="Sarah", aliases=["Miss Mitchell", "Sally"], status="active", first_chapter=1)
    c1 = Claim(project_id=pid, subject="Sarah", attribute="eye_color", value="blue", chapter=1, evidence_quote="Sarah has blue eyes.")
    c2 = Claim(project_id=pid, subject="Sarah", attribute="eye_color", value="green", chapter=2, evidence_quote="Sarah blinked.")
    db_session.add_all([char, c1, c2])
    db_session.commit()
    db_session.refresh(char)
    db_session.refresh(c1)

    # Mock LLM downstream impact tool response cleanly
    monkeypatch.setattr("app.config.settings.anthropic_api_key", "test-key")
    monkeypatch.setattr(
        extractor,
        "get_anthropic_client",
        lambda: types.SimpleNamespace(
            messages=types.SimpleNamespace(
                create=lambda **_kw: types.SimpleNamespace(
                    content=[
                        types.SimpleNamespace(
                            type="tool_use",
                            name="save_downstream_impact",
                            input={
                                "impacted_chapters": [1, 2],
                                "impact_notes": ["Eye color harmonized to green across Ch.1-2."],
                                "supersede_claim_ids": [],
                            },
                        )
                    ]
                )
            )
        ),
    )

    # 1) Inline Claim override
    res_patch = client.patch(
        f"/projects/{pid}/claims/{c1.id}",
        headers=auth_headers,
        json={"value": "green", "reason": "Author fixed Ch.1 typo", "re_audit": True},
    )
    assert res_patch.status_code == 200
    body = res_patch.json()
    assert body["updated_id"] == str(c1.id)
    assert body["correction_rule"]["rule_type"] == "fact_override"
    assert body["re_audit_chapters"] == [1, 2]
    assert body["impact_notes"] == ["Eye color harmonized to green across Ch.1-2."]

    # Verify ContextBuilder injects active CorrectionRule
    packet = context_builder.build_story_context_packet(db_session, pid, 3, "Sarah entered chapter 3.")
    assert "Active Author Correction Rules:" in packet["prompt_text"]
    assert "overridden to 'green'" in packet["prompt_text"]

    # 2) UUID-preserving character rename
    orig_char_id = char.id
    res_rename = client.post(
        f"/projects/{pid}/characters/{orig_char_id}/rename",
        headers=auth_headers,
        json={"new_name": "Elena", "re_audit": True},
    )
    assert res_rename.status_code == 200
    assert res_rename.json()["correction_rule"]["rule_type"] == "character_rename"
    db_session.expire_all()
    renamed = db_session.get(Character, orig_char_id)
    assert renamed.name == "Elena"
    assert "Sarah" in (renamed.aliases or [])

    # 3) Alias split into distinct canonical Character
    res_split = client.post(
        f"/projects/{pid}/characters/{orig_char_id}/split",
        headers=auth_headers,
        json={"alias_to_split": "Miss Mitchell", "new_character_name": "Clara Mitchell", "re_audit": False},
    )
    assert res_split.status_code == 200
    split_body = res_split.json()
    assert split_body["correction_rule"]["rule_type"] == "entity_split"
    new_char = db_session.get(Character, uuid.UUID(split_body["updated_id"]))
    assert new_char is not None and new_char.name == "Clara Mitchell"

    db_session.expire_all()
    renamed_after_split = db_session.get(Character, orig_char_id)
    assert "Miss Mitchell" not in (renamed_after_split.aliases or [])

    # 4) List & deactivate correction rules
    res_rules = client.get(f"/projects/{pid}/corrections", headers=auth_headers)
    assert res_rules.status_code == 200
    rules = res_rules.json()
    assert len(rules) == 3

    res_del = client.delete(f"/projects/{pid}/corrections/{rules[0]['id']}", headers=auth_headers)
    assert res_del.status_code == 204
    assert db_session.query(CorrectionRule).filter(CorrectionRule.project_id == pid, CorrectionRule.active.is_(True)).count() == 2
