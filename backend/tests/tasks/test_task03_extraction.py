"""Task 03 tests — extraction: validation, the Claude call, and persistence.

No real LLM is contacted: the Claude client is replaced with a fake that
records how it was called and returns a canned tool_use response.
"""

import types
import uuid

import pytest

from app.config import settings
from app.models import (
    Character,
    Claim,
    KnowledgeUpdate,
    Project,
    Relationship,
    StoryEvent,
    StoryObject,
    User,
)
from app.services import extractor
from app.services.extractor import (
    ExtractedCharacter,
    ExtractedClaim,
    ExtractedEvent,
    ExtractedKnowledge,
    ExtractedLocation,
    ExtractedObject,
    ExtractedRelationship,
    ExtractionPayload,
    quote_in_text,
)
from tests.utils import run_or_hint

TASK = "03-extraction"

CHAPTER_TEXT = (
    "Sarah stepped off the train. Her green eyes scanned the empty platform. "
    "John waited by the brass compass stall."
)


def _payload(**overrides) -> ExtractionPayload:
    data = dict(
        characters=[ExtractedCharacter(name="Sarah", aliases=["Sally"], description="Detective", status="alive")],
        relationships=[ExtractedRelationship(character_a="Sarah", character_b="John", type="friend")],
        locations=[ExtractedLocation(name="the train station")],
        objects=[ExtractedObject(name="brass compass")],
        events=[ExtractedEvent(summary="Sarah arrives by train", participants=["Sarah"], location="the train station")],
        claims=[
            ExtractedClaim(
                subject="Sarah",
                attribute="eye_color",
                value="green",
                evidence_quote="Her green eyes scanned the empty platform.",
            )
        ],
        knowledge=[ExtractedKnowledge(character="John", fact="Sarah is arriving", how_learned="told")],
    )
    data.update(overrides)
    return ExtractionPayload(**data)


# ---------------------------------------------------------------------------
# The evidence-check helper (built for you) — sanity checks it works
# ---------------------------------------------------------------------------


def test_quote_helper_tolerates_formatting():
    assert quote_in_text("her GREEN   eyes", CHAPTER_TEXT)
    assert quote_in_text("JOHN waited by the brass compass stall", CHAPTER_TEXT)
    assert not quote_in_text("Sarah's red hat", CHAPTER_TEXT)


# ---------------------------------------------------------------------------
# validate_payload — the hallucination guard
# ---------------------------------------------------------------------------


def test_validate_payload_drops_invented_quotes():
    payload = _payload(
        claims=[
            ExtractedClaim(
                subject="Sarah",
                attribute="eye_color",
                value="green",
                evidence_quote="Her green eyes scanned the empty platform.",  # real
            ),
            ExtractedClaim(
                subject="Sarah",
                attribute="eye_color",
                value="blue",
                evidence_quote="Sarah's blue eyes sparkled in the sun.",  # INVENTED
            ),
            ExtractedClaim(subject="   ", attribute="age", value="30", evidence_quote="green eyes"),  # empty subject
        ],
        characters=[
            ExtractedCharacter(name="Sarah"),
            ExtractedCharacter(name="   "),  # empty name
        ],
    )
    cleaned = run_or_hint(TASK, lambda: extractor.validate_payload(payload, CHAPTER_TEXT))
    assert isinstance(cleaned, ExtractionPayload)
    assert len(cleaned.claims) == 1, f"[{TASK}] invented/empty claims must be dropped, kept {len(cleaned.claims)}"
    assert cleaned.claims[0].value == "green"
    assert len(cleaned.characters) == 1, f"[{TASK}] empty-named characters must be dropped"
    assert len(cleaned.objects) == 1  # untouched categories pass through


# ---------------------------------------------------------------------------
# extract_chapter — with a fake Claude (asserts the tool-use pattern)
# ---------------------------------------------------------------------------


class _FakeBlock:
    def __init__(self, payload):
        self.type = "tool_use"
        self.input = payload


class _FakeMessages:
    def __init__(self, payload):
        self._payload = payload
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return types.SimpleNamespace(content=[_FakeBlock(self._payload)])


class _FakeClient:
    def __init__(self, payload):
        self.messages = _FakeMessages(payload)


def test_extract_chapter_uses_tool_use_and_returns_payload(monkeypatch):
    canned = {
        "characters": [{"name": "Sarah", "aliases": ["Sally"]}],
        "claims": [
            {"subject": "Sarah", "attribute": "eye_color", "value": "green", "evidence_quote": "green eyes"}
        ],
    }
    fake = _FakeClient(canned)
    monkeypatch.setattr(extractor, "get_anthropic_client", lambda: fake)

    payload = run_or_hint(
        TASK, lambda: extractor.extract_chapter(1, CHAPTER_TEXT, "Roster line about Sarah")
    )
    assert isinstance(payload, ExtractionPayload)
    assert payload.characters[0].name == "Sarah"
    assert payload.claims[0].value == "green"

    kwargs = fake.messages.calls[0]
    assert kwargs["tools"][0]["name"] == "save_extraction", (
        f"[{TASK}] the tool must be named 'save_extraction' with the ExtractionPayload schema"
    )
    assert kwargs["tool_choice"] == {"type": "tool", "name": "save_extraction"}, (
        f"[{TASK}] force the tool with tool_choice so the model always returns structured data"
    )
    assert kwargs["model"] == settings.extraction_model
    prompt = kwargs["messages"][0]["content"]
    assert "CHAPTER TEXT" in prompt
    assert "Roster line about Sarah" in prompt, f"[{TASK}] the roster must be part of the prompt"


# ---------------------------------------------------------------------------
# persist_extraction — writing to the story tables
# ---------------------------------------------------------------------------


@pytest.fixture()
def project(db_session):
    user = User(email=f"{uuid.uuid4().hex[:8]}@nerra.dev", password_hash="x")
    db_session.add(user)
    db_session.commit()
    project = Project(owner_id=user.id, title="Persist Tests")
    db_session.add(project)
    db_session.commit()
    return project


def test_persist_extraction_writes_all_tables(db_session, project):
    run_or_hint(TASK, lambda: extractor.persist_extraction(db_session, project.id, 1, _payload()))

    sarah = db_session.query(Character).filter_by(project_id=project.id).one()
    assert "Sally" in sarah.aliases
    assert sarah.first_chapter == 1 and sarah.last_chapter == 1

    rel = db_session.query(Relationship).filter_by(project_id=project.id).one()
    assert rel.character_a_id == sarah.id, "relationship endpoints must resolve to Character ids"

    obj = db_session.query(StoryObject).filter_by(project_id=project.id).one()
    assert obj.mention_chapters == [1]

    assert db_session.query(Claim).filter_by(project_id=project.id).count() == 1
    assert db_session.query(StoryEvent).filter_by(project_id=project.id).count() == 1
    assert db_session.query(KnowledgeUpdate).filter_by(project_id=project.id).count() == 1


def test_persist_extraction_dedupes_and_accumulates(db_session, project):
    run_or_hint(TASK, lambda: extractor.persist_extraction(db_session, project.id, 1, _payload()))
    # Sarah re-appears in chapter 2; the compass is mentioned again; the
    # same relationship is reported again.
    run_or_hint(TASK, lambda: extractor.persist_extraction(db_session, project.id, 2, _payload()))

    characters = db_session.query(Character).filter_by(project_id=project.id).all()
    assert len(characters) == 1, f"[{TASK}] re-mentioning Sarah must UPDATE her row, not duplicate it"
    assert characters[0].last_chapter == 2

    obj = db_session.query(StoryObject).filter_by(project_id=project.id).one()
    assert obj.mention_chapters == [1, 2], f"[{TASK}] object mentions must accumulate per chapter"

    rel_count = db_session.query(Relationship).filter_by(project_id=project.id).count()
    assert rel_count == 1, f"[{TASK}] duplicate relationship (same pair + type) must be skipped"
