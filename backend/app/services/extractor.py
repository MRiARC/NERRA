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
    description: str | None = None


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
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


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
    """Call Claude and return a validated ExtractionPayload.

    The exact tool-use pattern (the SDK's structured-output idiom):

        client = get_anthropic_client()
        response = client.messages.create(
            model=settings.extraction_model,
            max_tokens=4096,
            tools=[{
                "name": "save_extraction",
                "description": "Save the extracted story data",
                "input_schema": ExtractionPayload.model_json_schema(),
            }],
            tool_choice={"type": "tool", "name": "save_extraction"},
            messages=[{"role": "user", "content": EXTRACTION_PROMPT_TEMPLATE.format(...)}],
        )
        raw = next(block.input for block in response.content if block.type == "tool_use")
        return ExtractionPayload.model_validate(raw)

    Fill in the prompt via EXTRACTION_PROMPT_TEMPLATE.format(
        chapter_number=..., roster=..., chapter_text=...).
    """
    # ========== YOUR CODE HERE (Task 03) ==========
    raise NotImplementedError(
        "Task 03 — implement extract_chapter. See docs/tasks/03-extraction.md"
    )


def validate_payload(payload: ExtractionPayload, chapter_text: str) -> ExtractionPayload:
    """The hallucination guard — filter the payload against the real text.

    Requirements:
      1. Keep only claims whose evidence_quote passes quote_in_text().
      2. Drop claims with an empty subject/value after .strip().
      3. Drop empty-named characters/locations/objects.
      4. Return a new ExtractionPayload with the survivors (do not mutate).
    """
    # ========== YOUR CODE HERE (Task 03) ==========
    raise NotImplementedError(
        "Task 03 — implement validate_payload. See docs/tasks/03-extraction.md"
    )


def persist_extraction(db, project_id, chapter_number: int, payload: ExtractionPayload) -> None:
    """Write the extraction into the story tables (models.py is your map).

    Steps (docs/tasks/03-extraction.md walks through each):
      1. Characters: match existing rows by case-insensitive name OR alias;
         if new -> insert. Update description if it was empty, refresh
         status, widen first_chapter/last_chapter.
      2. Relationships: resolve character_a/b to Character ids by name
         (skip the row if either name is unknown). Skip exact duplicates
         (same pair + type).
      3. Locations / objects: dedupe by case-insensitive name. For objects,
         append chapter_number to mention_chapters (no duplicates).
      4. Events, claims, knowledge_updates: plain inserts with chapter_number.
      5. Commit ONCE at the end.
    """
    # ========== YOUR CODE HERE (Task 03) ==========
    raise NotImplementedError(
        "Task 03 — implement persist_extraction. See docs/tasks/03-extraction.md"
    )
