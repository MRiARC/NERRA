"""Structured chapter extraction using Anthropic tool-use with strict verbatim quote validation."""

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
    temporal_anchor: str | None = None
    is_flashback: bool = False
    is_flashforward: bool = False


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
    source_character: str | None = None


class ExtractedCustodyEvent(BaseModel):
    """Object possession / custody transfer event."""

    object_name: str
    holder_type: str = "character"  # character | location | unknown
    holder_name: str
    action: str = "acquired"  # acquired | lost | moved | locked | destroyed | used
    evidence_quote: str | None = None


class ExtractedWorldRule(BaseModel):
    """Magic, physics, society, or setting rule stated in prose."""

    category: str = "setting"  # magic | physics | society | setting
    rule_text: str


class ExtractionPayload(BaseModel):
    characters: list[ExtractedCharacter] = Field(default_factory=list)
    relationships: list[ExtractedRelationship] = Field(default_factory=list)
    locations: list[ExtractedLocation] = Field(default_factory=list)
    objects: list[ExtractedObject] = Field(default_factory=list)
    events: list[ExtractedEvent] = Field(default_factory=list)
    claims: list[ExtractedClaim] = Field(default_factory=list)
    knowledge: list[ExtractedKnowledge] = Field(default_factory=list)
    custody_events: list[ExtractedCustodyEvent] = Field(default_factory=list)
    world_rules: list[ExtractedWorldRule] = Field(default_factory=list)


EXTRACTION_PROMPT_TEMPLATE = """You are analyzing chapter {chapter_number} of a novel to build a complete, high-precision story-memory graph.

EXISTING STORY WORLD CONTEXT:
{roster}

CHAPTER TEXT:
---
{chapter_text}
---

Extract structured story data thoroughly without omitting subtle narrative details. Rules:
- "claims": factual assertions made by the prose — physical traits (eye_color, hair_color, age, scars), possessions, locations, behavioral constraints, and character knowledge references (use attribute "knows_about", e.g. subject="Park", attribute="knows_about", value="the murder"). Include the EXACT verbatim sentence in evidence_quote.
- "knowledge": facts a character LEARNS in THIS chapter (witnessed | told | deduced | overheard), with source_character if told by someone.
- "events": distinct scenes/beats with participants, location, temporal_anchor (if any time shift/clue appears), and is_flashback / is_flashforward flags.
- "custody_events": physical transfers, acquisition, locking, hiding, loss, destruction, or use of plot-significant objects (ignore generic architecture/scenery like windows or drainpipes).
- "world_rules": ONLY invariant universe-level rules (magic laws, physics constraints, supernatural properties, strict institutional laws) — NOT ordinary single-scene plot events or mystery facts.
- Coreference & Aliases: resolve pronouns ("he", "she", "the captain", titles) back to canonical character names from the story context whenever unambiguous, and record newly discovered aliases/nicknames.
- Never invent facts or quotes absent from the chapter text. If a category has nothing, return an empty list.
"""


def get_roster(db, project_id) -> str:
    """Build a rich cross-chapter Story Context Packet for accurate entity/coreference/world continuity."""
    from app.models import (
        Character,
        Claim,
        Location,
        ObjectCustodyEvent,
        Relationship,
        StoryEvent,
        StoryObject,
        WorldRule,
    )

    characters = (
        db.query(Character)
        .filter(Character.project_id == project_id)
        .order_by(Character.name)
        .all()
    )
    if not characters:
        return "None yet — this is an early chapter."

    char_by_id = {c.id: c.name for c in characters}
    sections: list[str] = ["Characters:"]
    for c in characters:
        traits = ", ".join(f"{k}={v}" for k, v in (c.physical_traits or {}).items())
        alias_part = f" (aliases: {', '.join(c.aliases)})" if c.aliases else ""
        trait_part = f" [traits: {traits}]" if traits else ""
        sections.append(f"- {c.name}{alias_part} ({getattr(c, 'status', 'unknown')}){trait_part}")

    rels = db.query(Relationship).filter(Relationship.project_id == project_id).limit(40).all()
    if rels:
        sections.append("\nActive Relationships:")
        for r in rels:
            ca = char_by_id.get(r.character_a_id, str(r.character_a_id))
            cb = char_by_id.get(r.character_b_id, str(r.character_b_id))
            sections.append(f"- {ca} --[{r.type}, {getattr(r, 'sentiment', 'neutral')}]--> {cb}")

    locs = db.query(Location).filter(Location.project_id == project_id).limit(30).all()
    if locs:
        sections.append("\nLocations: " + ", ".join(l.name for l in locs))

    objs = db.query(StoryObject).filter(StoryObject.project_id == project_id).limit(30).all()
    if objs:
        latest_holder: dict[str, str] = {}
        for ce in db.query(ObjectCustodyEvent).filter(ObjectCustodyEvent.project_id == project_id).order_by(ObjectCustodyEvent.chapter.asc()).all():
            latest_holder[str(ce.object_id)] = f"{ce.action} -> {ce.holder_name} (ch.{ce.chapter})"
        sections.append("\nTracked Objects:")
        for o in objs:
            cust = f" [{latest_holder[str(o.id)]}]" if str(o.id) in latest_holder else ""
            sections.append(f"- {o.name}{cust}")

    rules = db.query(WorldRule).filter(WorldRule.project_id == project_id, WorldRule.status == "active").all()
    if rules:
        sections.append("\nWorld Rules:")
        for wr in rules:
            sections.append(f"- [{wr.category}] {wr.rule_text}")

    recent_events = (
        db.query(StoryEvent)
        .filter(StoryEvent.project_id == project_id)
        .order_by(StoryEvent.chapter_number.desc(), StoryEvent.scene_order.desc())
        .limit(12)
        .all()
    )
    if recent_events:
        sections.append("\nRecent Events:")
        for ev in reversed(recent_events):
            loc_str = f" @ {ev.location}" if ev.location else ""
            sections.append(f"- Ch.{ev.chapter_number}{loc_str}: {ev.summary}")

    recent_claims = (
        db.query(Claim)
        .filter(Claim.project_id == project_id, Claim.status == "active")
        .order_by(Claim.chapter.desc())
        .limit(20)
        .all()
    )
    if recent_claims:
        sections.append("\nEstablished Facts:")
        for cl in reversed(recent_claims):
            sections.append(f"- {cl.subject}.{cl.attribute}={cl.value} (ch.{cl.chapter})")

    return "\n".join(sections)


def get_anthropic_client():
    """Shared Anthropic client with dynamic payload timeout and Retry-After backoff."""
    import random
    import time

    import anthropic

    from app.services import llm_budget

    if not settings.anthropic_api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set — add it to backend/.env (see .env.example)"
        )
    explicit_timeout = getattr(settings, "llm_timeout_seconds", None)
    kwargs = {
        "api_key": settings.anthropic_api_key,
        "timeout": float(explicit_timeout) if explicit_timeout else 300.0,
        "max_retries": 1,
    }
    if getattr(settings, "anthropic_base_url", None):
        kwargs["base_url"] = settings.anthropic_base_url
    raw_client = anthropic.Anthropic(**kwargs)

    class _ResilientMessages:
        def __init__(self, inner):
            self._inner = inner

        def create(self, **call_kwargs):
            if "timeout" not in call_kwargs:
                if explicit_timeout is not None:
                    call_kwargs["timeout"] = float(explicit_timeout)
                else:
                    in_chars = sum(
                        len(str(m.get("content", ""))) for m in (call_kwargs.get("messages") or [])
                    )
                    max_toks = int(call_kwargs.get("max_tokens") or 4096)
                    call_kwargs["timeout"] = llm_budget.compute_dynamic_timeout_seconds(in_chars, max_toks)

            delay = 2.0
            for attempt in range(4):
                try:
                    return self._inner.create(**call_kwargs)
                except Exception as exc:  # noqa: BLE001
                    status = getattr(exc, "status_code", None)
                    msg = str(exc).lower()
                    is_transient = (
                        isinstance(exc, (anthropic.APITimeoutError, anthropic.RateLimitError, anthropic.InternalServerError))
                        or (isinstance(status, int) and (status == 429 or status >= 500))
                        or "quota exhausted" in msg
                        or "timed out" in msg
                    )
                    if not is_transient or attempt == 3:
                        raise
                    retry_after = llm_budget.parse_retry_after_seconds(exc)
                    wait_s = retry_after if retry_after is not None else (delay + random.uniform(0.2, 1.2))
                    time.sleep(wait_s)
                    delay *= 2.0

    class _ResilientClient:
        def __init__(self, inner):
            self._inner = inner
            self.messages = _ResilientMessages(inner.messages)

        def __getattr__(self, name):
            return getattr(self._inner, name)

    return _ResilientClient(raw_client)


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
# Extraction & Validation Entrypoints
# ---------------------------------------------------------------------------


def extract_chapter(
    chapter_number: int, chapter_text: str, roster: str, custom_prompt: str = ""
) -> ExtractionPayload:
    """Call Claude and return a validated ExtractionPayload."""
    client = get_anthropic_client()
    prompt = EXTRACTION_PROMPT_TEMPLATE.format(
        chapter_number=chapter_number,
        roster=roster,
        chapter_text=chapter_text,
    )
    if custom_prompt and custom_prompt.strip():
        prompt += f"\n\nPROJECT CUSTOM EXTRACTION INSTRUCTIONS:\n{custom_prompt.strip()}"
    response = client.messages.create(
        model=settings.extraction_model,
        max_tokens=settings.extraction_max_tokens,
        tools=[{
            "name": "save_extraction",
            "description": "Save the extracted story data",
            "input_schema": ExtractionPayload.model_json_schema(),
        }],
        tool_choice={"type": "tool", "name": "save_extraction"},
        messages=[{"role": "user", "content": prompt}],
    )
    tool_block = next((b for b in response.content if getattr(b, "type", None) == "tool_use"), None)
    if tool_block is not None:
        return ExtractionPayload.model_validate(tool_block.input)
    for b in response.content:
        txt = getattr(b, "text", "")
        if "{" in txt:
            import json
            import re
            m = re.search(r"\{.*\}", txt, re.DOTALL)
            if m:
                try:
                    return ExtractionPayload.model_validate(json.loads(m.group(0)))
                except Exception:
                    pass
    return ExtractionPayload()


def extract_chapter_multipass(
    chapter_number: int, chapter_text: str, story_context: str, custom_prompt: str = ""
) -> ExtractionPayload:
    """Run 3 focused parallel Claude Sonnet passes for high-recall chapter extraction."""
    from concurrent.futures import ThreadPoolExecutor

    class EntitiesPassPayload(BaseModel):
        characters: list[ExtractedCharacter] = Field(default_factory=list)
        relationships: list[ExtractedRelationship] = Field(default_factory=list)
        locations: list[ExtractedLocation] = Field(default_factory=list)
        objects: list[ExtractedObject] = Field(default_factory=list)

    class TimelineCustodyPassPayload(BaseModel):
        events: list[ExtractedEvent] = Field(default_factory=list)
        knowledge: list[ExtractedKnowledge] = Field(default_factory=list)
        custody_events: list[ExtractedCustodyEvent] = Field(default_factory=list)

    class ClaimsRulesPassPayload(BaseModel):
        claims: list[ExtractedClaim] = Field(default_factory=list)
        world_rules: list[ExtractedWorldRule] = Field(default_factory=list)

    def _run_pass(tool_name: str, schema_cls, focus_instructions: str):
        client = get_anthropic_client()
        custom_note = (
            f"\nPROJECT CUSTOM INSTRUCTIONS:\n{custom_prompt.strip()}\n"
            if custom_prompt and custom_prompt.strip()
            else ""
        )
        prompt = (
            f"You are analyzing Chapter {chapter_number} of a novel.\n\n"
            f"EXISTING STORY CONTEXT:\n{story_context}\n\n"
            f"FOCUS FOR THIS PASS:\n{focus_instructions}\n"
            f"{custom_note}\n"
            f"CHAPTER TEXT:\n---\n{chapter_text}\n---"
        )
        res = client.messages.create(
            model=settings.extraction_model,
            max_tokens=settings.extraction_max_tokens,
            tools=[{
                "name": tool_name,
                "description": f"Save structured output for {tool_name}",
                "input_schema": schema_cls.model_json_schema(),
            }],
            tool_choice={"type": "tool", "name": tool_name},
            messages=[{"role": "user", "content": prompt}],
        )
        tool_block = next((block for block in res.content if getattr(block, "type", None) == "tool_use"), None)
        if tool_block is not None:
            raw = tool_block.input
            if isinstance(raw, dict):
                return schema_cls.model_validate(raw)
            if isinstance(raw, str):
                import json
                try:
                    return schema_cls.model_validate(json.loads(raw))
                except Exception:
                    pass
        for block in res.content:
            txt = getattr(block, "text", "")
            if "{" in txt:
                import json
                import re
                m = re.search(r"\{.*\}", txt, re.DOTALL)
                if m:
                    try:
                        return schema_cls.model_validate(json.loads(m.group(0)))
                    except Exception:
                        pass
        return schema_cls()

    from app.services import llm_budget

    low_beats, high_beats = llm_budget.compute_event_beat_range(chapter_text)
    passes = [
        (
            "save_entities",
            EntitiesPassPayload,
            "Extract EVERY character (resolving pronouns/epithets to proper names and recording ONLY true character aliases/titles, NEVER bare pronouns like 'he', 'she', 'her', 'his', 'they'), "
            "relationships (with sentiment and evidence_quote), locations, and plot-significant recurring objects.",
        ),
        (
            "save_timeline_custody",
            TimelineCustodyPassPayload,
            f"Extract SIGNIFICANT narrative scene beats, plot reveals, state transitions, and confrontations "
            f"(group closely connected paragraph actions into ~{low_beats}-{high_beats} key events for this chapter rather than micro-movements; include participants, location, temporal_anchor, "
            "is_flashback/is_flashforward), knowledge acquisition ('witnessed'|'told'|'deduced'|'overheard' with source_character), "
            "and object custody transfers.",
        ),
        (
            "save_claims_rules",
            ClaimsRulesPassPayload,
            "Extract ALL verifiable factual claims with specific attributes where applicable (e.g. 'eye_color', 'hair_color', 'age', 'height', 'status', 'rank', 'profession', rather than generic 'physical_trait'; use 'physical_trait' for scars, build, prosthetics, and general features) with EXACT verbatim evidence_quote substrings from the text, plus any universe-level magic/physics/society World Rules.",
        ),
    ]

    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(lambda p: _run_pass(*p), passes))

    ent_out, tl_out, cl_out = results[0], results[1], results[2]
    return ExtractionPayload(
        characters=ent_out.characters,
        relationships=ent_out.relationships,
        locations=ent_out.locations,
        objects=ent_out.objects,
        events=tl_out.events,
        knowledge=tl_out.knowledge,
        custody_events=tl_out.custody_events,
        claims=cl_out.claims,
        world_rules=cl_out.world_rules,
    )


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
    valid_rules = [
        wr for wr in getattr(payload, "world_rules", [])
        if wr.rule_text and wr.rule_text.strip()
    ]

    return ExtractionPayload(
        characters=valid_characters,
        relationships=payload.relationships,
        locations=valid_locations,
        objects=valid_objects,
        events=payload.events,
        claims=valid_claims,
        knowledge=payload.knowledge,
        custody_events=payload.custody_events,
        world_rules=valid_rules,
    )


def persist_extraction(db, project_id, chapter_number: int, payload: ExtractionPayload) -> None:
    """Write the extraction into the story tables."""
    from app.models import (
        Character,
        Claim,
        KnowledgeUpdate,
        Location,
        ObjectCustodyEvent,
        Relationship,
        StoryEvent,
        StoryObject,
        WorldRule,
    )

    # 1. Characters: dedupe / update or insert
    existing_characters = db.query(Character).filter(Character.project_id == project_id).all()
    char_map: dict[str, Character] = {}

    _PRONOUN_ALIASES = {
        "he", "she", "him", "her", "his", "hers", "they", "them", "their", "theirs",
        "it", "its", "i", "me", "my", "we", "us", "our", "you", "your",
    }

    def _clean_aliases(raw_aliases: list[str], canonical_name: str) -> list[str]:
        canon_low = canonical_name.strip().lower()
        return sorted({
            a.strip()
            for a in (raw_aliases or [])
            if a and a.strip() and a.strip().lower() not in _PRONOUN_ALIASES and a.strip().lower() != canon_low
        })

    def _index_char(ch: Character):
        char_map[ch.name.strip().lower()] = ch
        for a in (ch.aliases or []):
            low = a.strip().lower()
            if low and low not in _PRONOUN_ALIASES:
                char_map[low] = ch

    for ch in existing_characters:
        _index_char(ch)

    for c in payload.characters:
        name_clean = c.name.strip()
        lookup_key = name_clean.lower()
        cleaned_input_aliases = _clean_aliases(c.aliases, name_clean)
        matched = char_map.get(lookup_key)
        if not matched:
            for alias in cleaned_input_aliases:
                if alias.lower() in char_map:
                    matched = char_map[alias.lower()]
                    break

        if matched:
            if not matched.description and c.description:
                matched.description = c.description
            if c.status and c.status != "unknown":
                matched.status = c.status
            matched.aliases = _clean_aliases(list(matched.aliases or []) + cleaned_input_aliases, matched.name)
            matched.last_chapter = max(matched.last_chapter or chapter_number, chapter_number)
            matched.first_chapter = min(matched.first_chapter or chapter_number, chapter_number)
            _index_char(matched)
        else:
            new_char = Character(
                project_id=project_id,
                name=name_clean,
                aliases=cleaned_input_aliases,
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

    # 5. Events (idempotent: avoid duplicate summary or scene_order for this chapter)
    from app.services import timeline

    existing_events = db.query(StoryEvent).filter(
        StoryEvent.project_id == project_id,
        StoryEvent.chapter_number == chapter_number,
    ).all()
    existing_event_summaries = {e.summary.strip().lower() for e in existing_events}
    existing_scene_orders = {e.scene_order for e in existing_events}

    for idx, ev in enumerate(payload.events, start=1):
        clean_sum = ev.summary.strip()
        if clean_sum.lower() in existing_event_summaries or idx in existing_scene_orders:
            continue
        anchor, fb, ff = timeline.detect_temporal_markers(
            ev.summary,
            explicit_anchor=ev.temporal_anchor,
            explicit_flashback=ev.is_flashback,
            explicit_flashforward=ev.is_flashforward,
        )
        new_ev = StoryEvent(
            project_id=project_id,
            chapter_number=chapter_number,
            scene_order=idx,
            story_time_order=chapter_number * 100 + idx,
            temporal_anchor=anchor,
            is_flashback=fb,
            is_flashforward=ff,
            summary=clean_sum,
            participants=ev.participants,
            location=ev.location,
        )
        db.add(new_ev)
        existing_event_summaries.add(clean_sum.lower())
        existing_scene_orders.add(idx)

    # 6. Claims (idempotent: avoid duplicate subject/attribute/value for this chapter)
    existing_claims = db.query(Claim).filter(
        Claim.project_id == project_id,
        Claim.chapter == chapter_number,
    ).all()
    claim_keys = {
        (c.subject.strip().lower(), c.attribute.strip().lower(), c.value.strip().lower())
        for c in existing_claims
    }
    for cl in payload.claims:
        ckey = (cl.subject.strip().lower(), cl.attribute.strip().lower(), cl.value.strip().lower())
        if ckey in claim_keys:
            continue
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
        claim_keys.add(ckey)

    # 7. Knowledge Updates (idempotent)
    existing_kn = db.query(KnowledgeUpdate).filter(
        KnowledgeUpdate.project_id == project_id,
        KnowledgeUpdate.chapter == chapter_number,
    ).all()
    kn_keys = {(k.character.strip().lower(), k.fact.strip().lower()) for k in existing_kn}
    for kn in payload.knowledge:
        kkey = (kn.character.strip().lower(), kn.fact.strip().lower())
        if kkey in kn_keys:
            continue
        new_kn = KnowledgeUpdate(
            project_id=project_id,
            character=kn.character.strip(),
            fact=kn.fact.strip(),
            chapter=chapter_number,
            how_learned=kn.how_learned,
            source_character=kn.source_character.strip() if kn.source_character else None,
        )
        db.add(new_kn)
        kn_keys.add(kkey)

    # 8. Object Custody Events (idempotent)
    existing_custody = db.query(ObjectCustodyEvent).filter(
        ObjectCustodyEvent.project_id == project_id,
        ObjectCustodyEvent.chapter == chapter_number,
    ).all()
    custody_keys = {
        (c.object_id, (c.holder_name or "").strip().lower(), (c.action or "").strip().lower())
        for c in existing_custody
    }
    for ce in payload.custody_events:
        obj_key = ce.object_name.strip().lower()
        matched_obj = obj_map.get(obj_key)
        if not matched_obj:
            matched_obj = StoryObject(
                project_id=project_id,
                name=ce.object_name.strip(),
                first_chapter=chapter_number,
                mention_chapters=[chapter_number],
            )
            db.add(matched_obj)
            db.flush()
            obj_map[obj_key] = matched_obj
        else:
            mentions = set(matched_obj.mention_chapters or [])
            mentions.add(chapter_number)
            matched_obj.mention_chapters = sorted(list(mentions))

        ckey = (matched_obj.id, ce.holder_name.strip().lower(), (ce.action or "").strip().lower())
        if ckey in custody_keys:
            continue
        db.add(
            ObjectCustodyEvent(
                project_id=project_id,
                object_id=matched_obj.id,
                chapter=chapter_number,
                holder_type=ce.holder_type,
                holder_name=ce.holder_name.strip(),
                action=ce.action,
                evidence_quote=ce.evidence_quote,
            )
        )
        custody_keys.add(ckey)

    # 9. Discovered World Rules
    existing_rules = {
        r.rule_text.strip().lower()
        for r in db.query(WorldRule).filter(WorldRule.project_id == project_id).all()
    }
    for wr in getattr(payload, "world_rules", []):
        rtext = wr.rule_text.strip()
        if not rtext or rtext.lower() in existing_rules:
            continue
        existing_rules.add(rtext.lower())
        db.add(
            WorldRule(
                project_id=project_id,
                category=wr.category if wr.category in ("magic", "physics", "society", "setting") else "setting",
                rule_text=rtext,
                source_chapter=chapter_number,
                is_author_defined=False,
            )
        )

    db.commit()
