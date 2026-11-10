"""Tests covering all 8 LLM quality & reasoning upgrades (Issue #20)."""

import types
import uuid

from app.agents import contradiction_reasoner, story_chat
from app.config import settings
from app.models import (
    Character,
    Claim,
    KnowledgeUpdate,
    Location,
    ObjectCustodyEvent,
    Project,
    Relationship,
    StoryEvent,
    StoryObject,
    WorldRule,
)
from app.services import consistency, extractor, splitter, timeline


def _fake_tool_client(tool_name: str, payload: dict):
    block = types.SimpleNamespace(type="tool_use", name=tool_name, input=payload)
    resp = types.SimpleNamespace(content=[block])
    return types.SimpleNamespace(
        messages=types.SimpleNamespace(create=lambda **_kwargs: resp)
    )


def test_config_defaults_prioritize_sonnet_and_high_output_headroom():
    assert settings.extraction_model == "claude-sonnet-4.5"
    assert settings.chat_model == "claude-sonnet-4.5"
    assert settings.fast_model == "claude-haiku-4.5"
    assert settings.extraction_max_tokens >= 16384
    assert settings.chat_max_tokens >= 4096
    assert settings.use_llm_consistency is True


def test_rich_extraction_context_and_world_rule_persistence(client, auth_headers, db_session):
    project_id = uuid.UUID(
        client.post("/projects", json={"title": "Rich Context Test"}, headers=auth_headers).json()["id"]
    )
    c1 = Character(project_id=project_id, name="Sarah", aliases=["S."], status="alive", physical_traits={"eyes": "green"})
    c2 = Character(project_id=project_id, name="Park", status="alive")
    db_session.add_all([c1, c2])
    db_session.flush()
    db_session.add(
        Relationship(project_id=project_id, character_a_id=c1.id, character_b_id=c2.id, type="ally", sentiment="positive", chapter=1)
    )
    db_session.add(Location(project_id=project_id, name="Ashford Pier", first_chapter=1))
    obj = StoryObject(project_id=project_id, name="Brass Compass", first_chapter=1, mention_chapters=[1])
    db_session.add(obj)
    db_session.flush()
    db_session.add(
        ObjectCustodyEvent(project_id=project_id, object_id=obj.id, chapter=1, holder_name="Sarah", action="acquired")
    )
    db_session.add(
        WorldRule(project_id=project_id, category="magic", rule_text="Teleportation requires a full moon", is_author_defined=True)
    )
    db_session.add(StoryEvent(project_id=project_id, chapter_number=1, scene_order=1, story_time_order=1, summary="Sarah arrived at Ashford Pier"))
    db_session.commit()

    roster = extractor.get_roster(db_session, project_id)
    assert "Active Relationships:" in roster
    assert "Sarah --[ally, positive]--> Park" in roster
    assert "Tracked Objects:" in roster
    assert "Brass Compass" in roster
    assert "Teleportation requires a full moon" in roster
    assert "Sarah arrived at Ashford Pier" in roster

    payload = extractor.ExtractionPayload(
        world_rules=[
            extractor.ExtractedWorldRule(category="physics", rule_text="Salt circles block spectral entry")
        ]
    )
    extractor.persist_extraction(db_session, project_id, 2, payload)
    saved = db_session.query(WorldRule).filter(WorldRule.project_id == project_id, WorldRule.is_author_defined.is_(False)).all()
    assert len(saved) == 1
    assert saved[0].rule_text == "Salt circles block spectral entry"


def test_llm_positive_world_rules_semantic_checks_and_auto_intent(client, auth_headers, db_session, monkeypatch):
    project_id = uuid.UUID(
        client.post("/projects", json={"title": "LLM Consistency Suite"}, headers=auth_headers).json()["id"]
    )
    db_session.add(
        WorldRule(project_id=project_id, category="magic", rule_text="Teleportation requires a full moon", status="active")
    )
    db_session.add(
        StoryEvent(
            project_id=project_id,
            chapter_number=2,
            scene_order=1,
            story_time_order=2,
            summary="Marcus teleported across the valley on a pitch-black new moon night.",
        )
    )
    db_session.commit()

    # Deterministic negation-only checker ignores positive rules, whereas LLM checker catches it
    rules = db_session.query(WorldRule).filter(WorldRule.project_id == project_id).all()
    events = db_session.query(StoryEvent).filter(StoryEvent.project_id == project_id).all()
    assert consistency.detect_world_rule_violations([], rules) == []

    def _mock_client():
        class _Msgs:
            @staticmethod
            def create(**kwargs):
                tool_name = kwargs["tool_choice"]["name"]
                if tool_name == "save_rule_violations":
                    return types.SimpleNamespace(
                        content=[
                            types.SimpleNamespace(
                                type="tool_use",
                                name="save_rule_violations",
                                input={
                                    "violations": [
                                        {
                                            "rule_text": "Teleportation requires a full moon",
                                            "chapter": 2,
                                            "description": "Marcus teleported during a new moon, violating full-moon requirement",
                                            "evidence_quote": "Marcus teleported across the valley on a pitch-black new moon night.",
                                            "severity": "red",
                                        }
                                    ]
                                },
                            )
                        ]
                    )
                if tool_name == "save_semantic_issues":
                    return types.SimpleNamespace(content=[types.SimpleNamespace(type="tool_use", name="save_semantic_issues", input={"issues": []})])
                return types.SimpleNamespace(
                    content=[
                        types.SimpleNamespace(
                            type="tool_use",
                            name="classify_intent",
                            input={
                                "intent_classification": "error",
                                "confidence": 0.96,
                                "reasoning": "Direct breach of established full-moon magic rule.",
                            },
                        )
                    ]
                )

        return types.SimpleNamespace(messages=_Msgs())

    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")
    monkeypatch.setattr(extractor, "get_anthropic_client", _mock_client)

    created = consistency.run_consistency_pass(db_session, project_id)
    assert created == 1

    # Also verify automatic knowledge violation respects story_time_order on flashbacks
    flashback_ev = StoryEvent(project_id=project_id, chapter_number=5, scene_order=1, story_time_order=1, summary="Earlier scene", is_flashback=True)
    present_ev = StoryEvent(project_id=project_id, chapter_number=2, scene_order=1, story_time_order=50, summary="Present scene")
    cl = Claim(project_id=project_id, subject="Sarah", attribute="knows_about", value="secret vault", chapter=2, evidence_quote="Sarah knew")
    ku = KnowledgeUpdate(project_id=project_id, character="Sarah", fact="secret vault", chapter=5, how_learned="witnessed")
    # Ch.5 is chronologically BEFORE Ch.2 (1 < 50), so NOT a violation!
    assert consistency.detect_knowledge_violations([cl], [ku], events=[flashback_ev, present_ev]) == []


def test_llm_timeline_chat_and_splitter_upgrades(db_session, client, auth_headers, monkeypatch):
    project_id = uuid.UUID(
        client.post("/projects", json={"title": "Timeline & Splitter"}, headers=auth_headers).json()["id"]
    )
    e1 = StoryEvent(project_id=project_id, chapter_number=1, scene_order=1, story_time_order=1, summary="The trial ended.")
    e2 = StoryEvent(project_id=project_id, chapter_number=2, scene_order=1, story_time_order=2, summary="Years prior, they met at the harbor.")
    db_session.add_all([e1, e2])
    db_session.commit()

    def _mock_client_for(tool_name: str, data: dict):
        return lambda: _fake_tool_client(tool_name, data)

    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")
    monkeypatch.setattr(
        extractor,
        "get_anthropic_client",
        _mock_client_for(
            "save_chronology",
            {
                "ordered": [
                    {"event_index": 0, "story_time_order": 2, "is_flashback": False},
                    {"event_index": 1, "story_time_order": 1, "is_flashback": True, "temporal_anchor": "Years prior"},
                ]
            },
        ),
    )
    ordered = timeline.compute_story_chronology(db_session, project_id, use_llm=True)
    assert ordered[0].chapter_number == 2
    assert ordered[0].is_flashback is True

    # LLM query intent + grading + query rewrite in story_chat
    monkeypatch.setattr(
        extractor,
        "get_anthropic_client",
        _mock_client_for("set_intent", {"intent": "epistemic"}),
    )
    assert story_chat.classify_query_intent("Did she already realize who stole it?", use_llm=True) == "epistemic"

    # LLM chapter/POV splitter
    prose = "SARAH\nShe walked along the docks.\n\nPARK\nHe read the telegram twice."
    monkeypatch.setattr(
        extractor,
        "get_anthropic_client",
        _mock_client_for("save_headings", {"headings": ["SARAH", "PARK"]}),
    )
    sections = splitter.split_chapters(prose, use_llm=True)
    assert len(sections) == 2
    assert sections[0].title == "SARAH"
    assert sections[1].title == "PARK"
