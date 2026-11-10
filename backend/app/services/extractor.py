"""Chapter extraction with Claude — Task 03 (mostly yours to implement).

This is where NERRA's core value happens: one chapter of raw prose goes in,
one structured `ExtractionPayload` comes out — characters, relationships,
locations, objects, events, factual claims, and knowledge updates.

The data contracts (Pydantic models) and the prompt are ALREADY DEFINED
below — study them first. Your job is the three functions at the bottom:
extract_chapter, validate_payload, persist_extraction.

Design rules encoded here (from mvp_blueprint.md §5):

- ONE Claude call per chapter, using the cheap/fast model — cost control.
- LLM output is UNTRUSTED: schema-validated, then evidence-checked (a claim
  whose quote doesn't appear in the chapter is dropped — the hallucination
  guard) before anything touches the database.
- Every persisted row keeps its chapter number as provenance.
"""

import re

from pydantic import BaseModel, Field

from app.config import settings

# ---------------------------------------------------------------------------
# The extraction contract — defined for you. The LLM must produce JSON that
# matches ExtractionPayload; Pydantic validates it for us.
# ---------------------------------------------------------------------------


class ExtractedCharacter(BaseModel):
    name: str
    aliases: list[str] = Field(default_factory=list)
    description: str | None = None
    status: str = "unknown"  # alive | dead | unknown


class ExtractedRelationship(BaseModel):
    character_a: str
    character_b: str
    type: str = "unknown"  # family | friend | enemy | romantic | professional | mentor | unknown
    sentiment: str = "neutral"  # positive | neutral | hostile | complex
    description: str | None = None
    evidence_quote: str | None = None


class ExtractedLocation(BaseModel):
    name: str
    description: str | None = None


class ExtractedObject(BaseModel):
    name: str
    description: str | None = None


class ExtractedEvent(BaseModel):
    summary: str
    participants: list[str] = Field(default_factory=list)
    location: str | None = None


class ExtractedClaim(BaseModel):
    """One factual assertion, e.g. subject='Sarah', attribute='eye_color',
    value='green'. Quotes MUST be verbatim from the chapter text."""

    subject: str
    attribute: str  # eye_color | hair_color | age | knows_about | possession | ...
    value: str
    evidence_quote: str


class ExtractedKnowledge(BaseModel):
    """'Character learned fact in this chapter' — feeds the knowledge tracker."""

    character: str
    fact: str
    how_learned: str = "witnessed"  # witnessed | told | deduced | overheard


class ExtractionPayload(BaseModel):
    characters: list[ExtractedCharacter] = Field(default_factory=list)
    relationships: list[ExtractedRelationship] = Field(default_factory=list)
    locations: list[ExtractedLocation] = Field(default_factory=list)
    objects: list[ExtractedObject] = Field(default_factory=list)
    events: list[ExtractedEvent] = Field(default_factory=list)
    claims: list[ExtractedClaim] = Field(default_factory=list)
    knowledge: list[ExtractedKnowledge] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# The prompt — defined for you. Keep context SMALL (mvp_blueprint.md §5.2):
# chapter text + character roster only, never the whole manuscript.
# ---------------------------------------------------------------------------

EXTRACTION_PROMPT_TEMPLATE = """You are analyzing chapter {chapter_number} of a novel to build a story-memory database.

Known characters so far (name — aliases): {roster}

CHAPTER TEXT:
---
{chapter_text}
---

Extract structured data. Rules:
- "claims": factual assertions the text makes about the world — physical traits
  (eye_color, hair_color, age), possessions, and who-knows-what (use the
  attribute "knows_about", e.g. subject="Park", attribute="knows_about",
  value="the murder"). Quote the EXACT sentence in evidence_quote.
- "knowledge": facts a character LEARNS in THIS chapter (not earlier).
- Use character names from the roster where possible.
- Do not invent anything not present in the text. If a category has nothing,
  return an empty list.
"""


def get_roster(db, project_id) -> str:
    """One-line-per-character summary for the prompt (built for you).

    After Task 03, this reads real Character rows; it returns 'None yet' for
    a fresh project. Kept trivial so the pipeline stays readable.
    """
    from app.models import Character

    characters = (
        db.query(Character)
        .filter(Character.project_id == project_id)
        .order_by(Character.name)
        .all()
    )
    if not characters:
        return "None yet — this is an early chapter."
    return "\n".join(
        f"- {c.name}" + (f" (aliases: {', '.join(c.aliases)})" if c.aliases else "")
        for c in characters
    )


def get_anthropic_client():
    """Shared Anthropic client with a helpful error when the key is missing."""
    import anthropic

    if not settings.anthropic_api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set — add it to backend/.env (see .env.example)"
        )
    kwargs = {"api_key": settings.anthropic_api_key}
    if getattr(settings, "anthropic_base_url", None):
        kwargs["base_url"] = settings.anthropic_base_url
    return anthropic.Anthropic(**kwargs)


# ---------------------------------------------------------------------------
# String helpers for the evidence check — built for you (boring plumbing).
# ---------------------------------------------------------------------------


def _normalize(text: str) -> str:
    """Lowercase, collapse whitespace, straighten quotes — so a quote still
    matches when punctuation/spacing differs slightly."""
    text = text.lower().replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    return re.sub(r"\s+", " ", text).strip()


def quote_in_text(quote: str, chapter_text: str) -> bool:
    """True if the (normalized) quote appears in the (normalized) chapter."""
    return _normalize(quote) in _normalize(chapter_text)


# ---------------------------------------------------------------------------
# YOUR THREE FUNCTIONS (Task 03)
# ---------------------------------------------------------------------------


def extract_chapter(chapter_number: int, chapter_text: str, roster: str) -> ExtractionPayload:
    """Call Claude and return a validated ExtractionPayload."""
    client = get_anthropic_client()
    prompt = EXTRACTION_PROMPT_TEMPLATE.format(
        chapter_number=chapter_number,
        roster=roster,
        chapter_text=chapter_text,
    )
    response = client.messages.create(
        model=settings.extraction_model,
        max_tokens=4096,
        tools=[{
            "name": "save_extraction",
            "description": "Save the extracted story data",
            "input_schema": ExtractionPayload.model_json_schema(),
        }],
        tool_choice={"type": "tool", "name": "save_extraction"},
        messages=[{"role": "user", "content": prompt}],
    )
    raw = next(block.input for block in response.content if getattr(block, "type", None) == "tool_use")
    return ExtractionPayload.model_validate(raw)


def validate_payload(payload: ExtractionPayload, chapter_text: str) -> ExtractionPayload:
    """The hallucination guard — filter the payload against the real text."""
    valid_claims = [
        c for c in payload.claims
        if c.subject and c.subject.strip()
        and c.value and c.value.strip()
        and quote_in_text(c.evidence_quote, chapter_text)
    ]
    valid_characters = [
        c for c in payload.characters
        if c.name and c.name.strip()
    ]
    valid_locations = [
        loc for loc in payload.locations
        if loc.name and loc.name.strip()
    ]
    valid_objects = [
        obj for obj in payload.objects
        if obj.name and obj.name.strip()
    ]

    return ExtractionPayload(
        characters=valid_characters,
        relationships=payload.relationships,
        locations=valid_locations,
        objects=valid_objects,
        events=payload.events,
        claims=valid_claims,
        knowledge=payload.knowledge,
    )


def persist_extraction(db, project_id, chapter_number: int, payload: ExtractionPayload) -> None:
    """Write the extraction into the story tables."""
    from app.models import (
        Character,
        Claim,
        KnowledgeUpdate,
        Location,
        Relationship,
        StoryEvent,
        StoryObject,
    )

    # 1. Characters: dedupe / update or insert
    existing_characters = db.query(Character).filter(Character.project_id == project_id).all()
    char_map: dict[str, Character] = {}

    def _index_char(ch: Character):
        char_map[ch.name.strip().lower()] = ch
        for a in (ch.aliases or []):
            char_map[a.strip().lower()] = ch

    for ch in existing_characters:
        _index_char(ch)

    for c in payload.characters:
        name_clean = c.name.strip()
        lookup_key = name_clean.lower()
        matched = char_map.get(lookup_key)
        if not matched:
            for alias in c.aliases:
                if alias.strip().lower() in char_map:
                    matched = char_map[alias.strip().lower()]
                    break

        if matched:
            if not matched.description and c.description:
                matched.description = c.description
            if c.status and c.status != "unknown":
                matched.status = c.status
            new_aliases = set(matched.aliases or []) | set(c.aliases)
            matched.aliases = sorted(list(new_aliases))
            matched.last_chapter = max(matched.last_chapter or chapter_number, chapter_number)
            matched.first_chapter = min(matched.first_chapter or chapter_number, chapter_number)
            _index_char(matched)
        else:
            new_char = Character(
                project_id=project_id,
                name=name_clean,
                aliases=c.aliases,
                description=c.description,
                status=c.status,
                first_chapter=chapter_number,
                last_chapter=chapter_number,
            )
            db.add(new_char)
            db.flush()
            _index_char(new_char)

    # 2. Relationships (with evolution tracking across chapters)
    existing_rels = db.query(Relationship).filter(Relationship.project_id == project_id).all()
    rel_set = {
        (r.character_a_id, r.character_b_id, r.type, r.sentiment)
        for r in existing_rels
    }

    for r in payload.relationships:
        ca = char_map.get(r.character_a.strip().lower())
        cb = char_map.get(r.character_b.strip().lower())
        if not ca and not cb:
            continue
        ca_id = ca.id if ca else cb.id
        cb_id = cb.id if cb else ca.id
        sentiment = (r.sentiment or "neutral").strip().lower()
        rel_key = (ca_id, cb_id, r.type, sentiment)
        if rel_key in rel_set:
            continue

        # Close any earlier open relationship state for this same character pair if evolved
        for prev in existing_rels:
            same_pair = (
                (prev.character_a_id == ca_id and prev.character_b_id == cb_id)
                or (prev.character_a_id == cb_id and prev.character_b_id == ca_id)
            )
            if (
                same_pair
                and prev.until_chapter is None
                and prev.chapter is not None
                and chapter_number > prev.chapter
                and (prev.type != r.type or prev.sentiment != sentiment)
            ):
                prev.until_chapter = chapter_number

        rel_set.add(rel_key)
        new_rel = Relationship(
            project_id=project_id,
            character_a_id=ca_id,
            character_b_id=cb_id,
            type=r.type,
            sentiment=sentiment,
            description=r.description,
            evidence_quote=r.evidence_quote,
            chapter=chapter_number,
        )
        db.add(new_rel)
        existing_rels.append(new_rel)

    # 3. Locations
    existing_locs = db.query(Location).filter(Location.project_id == project_id).all()
    loc_names = {l.name.strip().lower(): l for l in existing_locs}
    for loc in payload.locations:
        loc_key = loc.name.strip().lower()
        if loc_key not in loc_names:
            new_loc = Location(
                project_id=project_id,
                name=loc.name.strip(),
                description=loc.description,
                first_chapter=chapter_number,
            )
            db.add(new_loc)
            db.flush()
            loc_names[loc_key] = new_loc

    # 4. Objects
    existing_objs = db.query(StoryObject).filter(StoryObject.project_id == project_id).all()
    obj_map = {o.name.strip().lower(): o for o in existing_objs}
    for obj in payload.objects:
        obj_key = obj.name.strip().lower()
        if obj_key in obj_map:
            matched_obj = obj_map[obj_key]
            mentions = set(matched_obj.mention_chapters or [])
            mentions.add(chapter_number)
            matched_obj.mention_chapters = sorted(list(mentions))
        else:
            new_obj = StoryObject(
                project_id=project_id,
                name=obj.name.strip(),
                description=obj.description,
                first_chapter=chapter_number,
                mention_chapters=[chapter_number],
            )
            db.add(new_obj)
            db.flush()
            obj_map[obj_key] = new_obj

    # 5. Events
    for ev in payload.events:
        new_ev = StoryEvent(
            project_id=project_id,
            chapter_number=chapter_number,
            summary=ev.summary,
            participants=ev.participants,
            location=ev.location,
        )
        db.add(new_ev)

    # 6. Claims
    for cl in payload.claims:
        new_claim = Claim(
            project_id=project_id,
            subject=cl.subject.strip(),
            attribute=cl.attribute.strip(),
            value=cl.value.strip(),
            chapter=chapter_number,
            evidence_quote=cl.evidence_quote.strip(),
            confidence=1.0,
            validation_state="AUTO_ACCEPTED",
        )
        db.add(new_claim)

    # 7. Knowledge Updates
    for kn in payload.knowledge:
        new_kn = KnowledgeUpdate(
            project_id=project_id,
            character=kn.character.strip(),
            fact=kn.fact.strip(),
            chapter=chapter_number,
            how_learned=kn.how_learned,
        )
        db.add(new_kn)

    db.commit()
