"""Deterministic story consistency checks (contradictions, knowledge violations, timeline & custody paradoxes, world rules)."""

from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# IssueDraft — the record detectors return; run_consistency_pass persists it.
# ---------------------------------------------------------------------------


@dataclass
class IssueDraft:
    type: str            # contradiction | knowledge_violation | unresolved_thread | continuity_note
    severity: str        # red | yellow | green | blue
    description: str
    evidence: list[dict] = field(default_factory=list)  # [{"chapter": 1, "quote": "..."}]
    claim_a_id: str | None = None
    claim_b_id: str | None = None


# ---------------------------------------------------------------------------
# String helpers — built for you (fuzzy matching plumbing, not logic).
# ---------------------------------------------------------------------------


def _norm(value: str) -> str:
    return (value or "").strip().lower()


def _tokens(value: str) -> set[str]:
    import re

    return set(re.findall(r"[a-z0-9]+", _norm(value)))


def _same_entity(a: str, b: str) -> bool:
    """Loose entity match: 'sarah' == 'sarah', 'the murder' ~= 'murder'."""
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return False
    return ta == tb or bool(ta & tb)


def _facts_match(a: str, b: str) -> bool:
    """Fuzzy fact match: True if the two phrases share enough meaning."""
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return False
    overlap = len(ta & tb) / min(len(ta), len(tb))
    return overlap >= 0.6


def _group_claims(claims: list) -> dict[tuple[str, str], list]:
    """Shared grouping for the claim-based rules: key is
    (normalized subject, normalized attribute)."""
    groups: dict[tuple[str, str], list] = {}
    for claim in claims:
        key = (_norm(claim.subject), _norm(claim.attribute))
        groups.setdefault(key, []).append(claim)
    return groups


# ---------------------------------------------------------------------------
# The five functions (Task 05) — verified against
# tests/tasks/test_task05_consistency.py (8/8 passing).
# ---------------------------------------------------------------------------


_MULTI_VALUE_ATTRIBUTES = {
    "knows_about",
    "possession",
    "possesses",
    "owns",
    "has",
    "carries",
    "holds",
    "skill",
    "ability",
    "language",
    "ally",
    "behavior",
    "action",
    "action_performed",
    "has_feature",
    "feature",
    "appearance_note",
    "observation",
    "trait",
    "role",
    "activity",
    "detail",
    "characteristic",
    "attribute",
    "physical_trait",
    "physical_feature",
    "physical_description",
    "clothing",
    "attire",
    "garment",
    "injury",
    "wound",
    "equipment",
    "item",
    "accessory",
    "habit",
    "mannerism",
}


def detect_contradictions(claims: list) -> list[IssueDraft]:
    """Find contradicting claim pairs.

    1. Skip multi-valued accumulative attributes (`knows_about`, `possession`, etc.).
    2. Group claims by (_norm(subject), _norm(attribute)).
    3. Inside a group, keep the FIRST claim per distinct normalized value
       (lowest chapter wins — that's the earlier statement).
    4. Every pair of distinct values -> one red IssueDraft carrying both
       citations and both claim ids.
    """
    drafts: list[IssueDraft] = []

    for (_subject, attribute), group in _group_claims(claims).items():
        if attribute in _MULTI_VALUE_ATTRIBUTES or len(group) < 2:
            continue

        first_by_value: dict[str, object] = {}
        for claim in sorted(group, key=lambda c: c.chapter):
            value = _norm(claim.value)
            if value and value not in first_by_value:
                first_by_value[value] = claim

        kept = list(first_by_value.values())
        for i in range(len(kept)):
            for j in range(i + 1, len(kept)):
                a, b = kept[i], kept[j]
                drafts.append(
                    IssueDraft(
                        type="contradiction",
                        severity="red",
                        description=(
                            f'{a.subject}: "{a.value}" (chapter {a.chapter}) vs '
                            f'"{b.value}" (chapter {b.chapter}) for {attribute}'
                        ),
                        evidence=[
                            {"chapter": a.chapter, "quote": a.evidence_quote},
                            {"chapter": b.chapter, "quote": b.evidence_quote},
                        ],
                        claim_a_id=str(a.id),
                        claim_b_id=str(b.id),
                    )
                )

    return drafts


def _build_chapter_chronology(
    events: list | None, claims: list, knowledge_updates: list
) -> dict[int, float]:
    """Build a unified, monotonic chronology mapping across chapters.

    Normalizes explicit `story_time_order` slots and interpolates positions
    for eventless chapters to avoid scale mismatches (e.g. eventless Ch.1 at 100
    vs explicit Ch.9 at slot 3).
    """
    anchors: dict[int, float] = {}
    for ev in (events or []):
        slot = getattr(ev, "story_time_order", None)
        ch = getattr(ev, "chapter_number", None)
        if isinstance(slot, (int, float)) and isinstance(ch, int):
            prev = anchors.get(ch)
            if prev is None or slot < prev:
                anchors[ch] = float(slot)

    all_chapters: set[int] = set(anchors.keys())
    for c in claims:
        ch = getattr(c, "chapter", None)
        if isinstance(ch, int):
            all_chapters.add(ch)
    for u in knowledge_updates:
        ch = getattr(u, "chapter", None)
        if isinstance(ch, int):
            all_chapters.add(ch)

    if not anchors:
        return {ch: float(ch) for ch in all_chapters}

    sorted_anchors = sorted(anchors.items(), key=lambda x: x[0])
    first_ch, first_time = sorted_anchors[0]
    last_ch, last_time = sorted_anchors[-1]

    mapping: dict[int, float] = dict(anchors)
    for ch in sorted(all_chapters):
        if ch in mapping:
            continue
        if ch < first_ch:
            mapping[ch] = first_time - (first_ch - ch) * 0.1
        elif ch > last_ch:
            mapping[ch] = last_time + (ch - last_ch) * 0.1
        else:
            prev_ch, prev_time = max((c, t) for c, t in sorted_anchors if c < ch)
            next_ch, next_time = min((c, t) for c, t in sorted_anchors if c > ch)
            ratio = (ch - prev_ch) / max(1, next_ch - prev_ch)
            mapping[ch] = prev_time + ratio * (next_time - prev_time)

    return mapping


def detect_knowledge_violations(
    claims: list, knowledge_updates: list, events: list | None = None
) -> list[IssueDraft]:
    """Find characters acting on facts before they learned them.

    Uses story-chronological ordering (`story_time_order`) when StoryEvents are
    supplied so flashbacks do not cause false positives or missed leaks; falls
    back to narrative chapter order otherwise.
    """
    drafts: list[IssueDraft] = []
    chrono = _build_chapter_chronology(events, claims, knowledge_updates)

    for claim in claims:
        if _norm(claim.attribute) != "knows_about":
            continue
        for update in knowledge_updates:
            learned_later = chrono.get(update.chapter, float(update.chapter)) > chrono.get(claim.chapter, float(claim.chapter))
            if (
                _same_entity(claim.subject, update.character)
                and _facts_match(claim.value, update.fact)
                and learned_later
            ):
                drafts.append(
                    IssueDraft(
                        type="knowledge_violation",
                        severity="blue",
                        description=(
                            f'{claim.subject} references "{claim.value}" in chapter '
                            f"{claim.chapter}, but only learns it in chapter {update.chapter}"
                        ),
                        evidence=[
                            {"chapter": claim.chapter, "quote": claim.evidence_quote},
                            {"chapter": update.chapter, "fact": update.fact},
                        ],
                        claim_a_id=str(claim.id),
                    )
                )

    return drafts


def detect_dangling_objects(objects: list) -> list[IssueDraft]:
    """Flag objects mentioned in exactly one chapter (possible loose threads)."""
    drafts: list[IssueDraft] = []

    for obj in objects:
        chapters = sorted(set(obj.mention_chapters or []))
        if len(chapters) != 1:
            continue
        drafts.append(
            IssueDraft(
                type="unresolved_thread",
                severity="green",
                description=(
                    f'"{obj.name}" appears in chapter {chapters[0]} and is never '
                    "mentioned again — intentional?"
                ),
            )
        )

    return drafts


def detect_continuity_notes(claims: list) -> list[IssueDraft]:
    """The informational rule: the same fact, stated identically, repeatedly.

    Per (subject, attribute) group, per distinct VALUE, collect the DISTINCT
    chapters where it appears (first claim per chapter, lowest first).
    Values spanning >= 2 distinct chapters produce ONE blue continuity_note
    with one evidence entry per chapter.
    """
    drafts: list[IssueDraft] = []

    for (_subject, _attribute), group in _group_claims(claims).items():
        chapters_by_value: dict[str, dict[int, object]] = {}
        for claim in sorted(group, key=lambda c: c.chapter):
            value = _norm(claim.value)
            if not value:
                continue
            chapters_by_value.setdefault(value, {}).setdefault(claim.chapter, claim)

        for _value, per_chapter in chapters_by_value.items():
            if len(per_chapter) < 2:
                continue
            chapters = sorted(per_chapter)
            first = per_chapter[chapters[0]]
            drafts.append(
                IssueDraft(
                    type="continuity_note",
                    severity="blue",
                    description=(
                        f'{first.subject}: {first.attribute} "{first.value}" is stated '
                        f"consistently in chapters {', '.join(str(c) for c in chapters)}"
                    ),
                    evidence=[
                        {"chapter": c, "quote": per_chapter[c].evidence_quote}
                        for c in chapters
                    ],
                    claim_a_id=str(first.id),
                )
            )

    return drafts


def detect_spatiotemporal_conflicts(events: list) -> list[IssueDraft]:
    """Flag characters appearing in two distinct locations at the same story time."""
    drafts: list[IssueDraft] = []
    seen_pairs: set[tuple[str, int, str, str]] = set()

    # Bucket events by story_time_order (or distinct chapter+scene fallback)
    by_slot: dict[str, list] = {}
    for ev in events:
        if not ev.location or not ev.participants:
            continue
        slot = getattr(ev, "story_time_order", None)
        if slot is not None:
            slot_key = f"time:{slot}"
        else:
            slot_key = f"ch:{ev.chapter_number}:scene:{getattr(ev, 'scene_order', 1)}"
        by_slot.setdefault(slot_key, []).append(ev)

    for slot_key, slot_events in by_slot.items():
        if len(slot_events) < 2:
            continue
        for i in range(len(slot_events)):
            for j in range(i + 1, len(slot_events)):
                a, b = slot_events[i], slot_events[j]
                if _same_entity(a.location, b.location):
                    continue
                pa = {_norm(p): p for p in (a.participants or []) if p.strip()}
                pb = {_norm(p): p for p in (b.participants or []) if p.strip()}
                for p_norm, p_orig in pa.items():
                    if p_norm in pb:
                        loc_pair = tuple(sorted([_norm(a.location), _norm(b.location)]))
                        dedupe_key = (p_norm, slot_key, loc_pair[0], loc_pair[1])
                        if dedupe_key in seen_pairs:
                            continue
                        seen_pairs.add(dedupe_key)
                        slot_display = (
                            f"story time {getattr(a, 'story_time_order', '')}".strip()
                            if slot_key.startswith("time:")
                            else f"ch.{a.chapter_number} scene {getattr(a, 'scene_order', 1)}"
                        )
                        drafts.append(
                            IssueDraft(
                                type="spatiotemporal_conflict",
                                severity="red",
                                description=(
                                    f'{p_orig} appears simultaneously in "{a.location}" '
                                    f'(chapter {a.chapter_number}) and "{b.location}" '
                                    f'(chapter {b.chapter_number}) at {slot_display}'
                                ),
                                evidence=[
                                    {"chapter": a.chapter_number, "quote": a.summary},
                                    {"chapter": b.chapter_number, "quote": b.summary},
                                ],
                            )
                        )

    return drafts


def detect_custody_paradoxes(custody_events: list, objects_by_id: dict) -> list[IssueDraft]:
    """Detect broken object chain-of-custody transitions.

    Flags:
      1. Object marked `destroyed`, `lost`, or `locked` in an earlier chapter
         and then `used` in a later chapter without an intervening `acquired` or `moved` event.
      2. Object simultaneously `used` or `acquired` by two different characters in the same chapter
         without an intervening transfer.
    """
    drafts: list[IssueDraft] = []
    by_obj: dict[str, list] = {}
    for ev in custody_events:
        by_obj.setdefault(str(ev.object_id), []).append(ev)

    for obj_id, evs in by_obj.items():
        obj = objects_by_id.get(obj_id)
        obj_name = obj.name if obj else "object"
        sorted_evs = sorted(evs, key=lambda e: (e.chapter, str(e.id)))

        locked_or_destroyed = None
        for idx, ev in enumerate(sorted_evs):
            action = _norm(ev.action)
            if action in ("destroyed", "lost", "locked"):
                locked_or_destroyed = ev
            elif action == "used" and locked_or_destroyed is not None:
                if ev.chapter > locked_or_destroyed.chapter:
                    drafts.append(
                        IssueDraft(
                            type="custody_paradox",
                            severity="red",
                            description=(
                                f'"{obj_name}" was {locked_or_destroyed.action} in chapter '
                                f"{locked_or_destroyed.chapter} ({locked_or_destroyed.holder_name}), "
                                f"yet used by {ev.holder_name} in chapter {ev.chapter} without retrieval"
                            ),
                            evidence=[
                                {
                                    "chapter": locked_or_destroyed.chapter,
                                    "quote": locked_or_destroyed.evidence_quote or f"{locked_or_destroyed.action} by {locked_or_destroyed.holder_name}",
                                },
                                {
                                    "chapter": ev.chapter,
                                    "quote": ev.evidence_quote or f"used by {ev.holder_name}",
                                },
                            ],
                        )
                    )
            elif action in ("acquired", "moved"):
                locked_or_destroyed = None

    return drafts


_RULE_NEGATIONS = {"cannot", "never", "no", "forbidden", "prohibited", "impossible", "not", "without"}
_STOPWORDS = {"the", "a", "an", "in", "on", "at", "to", "of", "and", "or", "is", "are", "was", "were", "by", "must"}


def detect_world_rule_violations(claims: list, rules: list) -> list[IssueDraft]:
    """Check active WorldRules against extracted claims for potential violations."""
    drafts: list[IssueDraft] = []
    for rule in rules:
        if (getattr(rule, "status", None) or "active") != "active":
            continue
        rule_tokens = _tokens(rule.rule_text)
        has_prohibition = bool(rule_tokens & _RULE_NEGATIONS)
        if not has_prohibition:
            continue
        # Meaningful content tokens (drop negation words and stopwords)
        subject_tokens = {
            t[:-1] if len(t) > 4 and t.endswith(("d", "s")) else t
            for t in (rule_tokens - _RULE_NEGATIONS - _STOPWORDS)
            if len(t) >= 3
        }
        if len(subject_tokens) < 2:
            continue

        for claim in claims:
            claim_text = f"{claim.subject} {claim.attribute} {claim.value} {claim.evidence_quote}"
            raw_claim_tokens = _tokens(claim_text)
            # If the claim itself reiterates the prohibition (e.g. "cannot revive"), it's confirming the rule, not violating it
            if raw_claim_tokens & _RULE_NEGATIONS:
                continue
            norm_claim_tokens = {
                t[:-1] if len(t) > 4 and t.endswith(("d", "s")) else t
                for t in raw_claim_tokens
            }
            overlap = subject_tokens & norm_claim_tokens
            if len(overlap) >= 2:
                drafts.append(
                    IssueDraft(
                        type="world_rule_violation",
                        severity="yellow",
                        description=(
                            f'Possible world rule violation in chapter {claim.chapter}: '
                            f'"{claim.value}" vs rule "{rule.rule_text}"'
                        ),
                        evidence=[{"chapter": claim.chapter, "quote": claim.evidence_quote}],
                        claim_a_id=str(claim.id),
                    )
                )
    return drafts


def detect_world_rule_violations_llm(
    rules: list,
    claims: list,
    events: list,
    use_llm: bool = True,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> list[IssueDraft]:
    """Semantically audit ALL active world rules (positive + negative) against events & claims."""
    active_rules = [r for r in rules if (getattr(r, "status", None) or "active") == "active"]
    if not use_llm or not active_rules or (not claims and not events):
        return []

    try:
        from pydantic import BaseModel, Field

        from app.config import settings
        from app.services.extractor import get_anthropic_client

        active_key = api_key or settings.anthropic_api_key
        if not active_key:
            return []

        class RuleViolationItem(BaseModel):
            rule_text: str
            chapter: int
            description: str
            evidence_quote: str
            severity: str = "yellow"

        class RuleViolationBatch(BaseModel):
            violations: list[RuleViolationItem] = Field(default_factory=list)

        rules_txt = "\n".join(f"- [{r.category}] {r.rule_text}" for r in active_rules)
        events_txt = "\n".join(
            f"- Ch.{ev.chapter_number} (story_order={getattr(ev, 'story_time_order', ev.chapter_number)}): {ev.summary}"
            for ev in events[:60]
        )
        claims_txt = "\n".join(
            f"- Ch.{c.chapter}: {c.subject}.{c.attribute}={c.value} (\"{c.evidence_quote}\")"
            for c in claims[:60]
        )

        prompt = f"""Audit these fictional World Rules against the extracted events and claims.
Check BOTH positive requirements (e.g. "requires a full moon", "only bloodline X can Y") and prohibitions ("cannot teleport").

WORLD RULES:
{rules_txt}

EVENTS:
{events_txt}

CLAIMS:
{claims_txt}

Return ONLY real, concrete violations supported by the evidence. If none violate the rules, return an empty list."""

        try:
            client = get_anthropic_client(api_key=api_key, base_url=base_url)
        except TypeError:
            client = get_anthropic_client()
        active_model = model or settings.chat_model
        response = client.messages.create(
            model=active_model,
            max_tokens=2048,
            tools=[
                {
                    "name": "save_rule_violations",
                    "description": "Save detected semantic world rule violations",
                    "input_schema": RuleViolationBatch.model_json_schema(),
                }
            ],
            tool_choice={"type": "tool", "name": "save_rule_violations"},
            messages=[{"role": "user", "content": prompt}],
        )
        for block in response.content:
            if getattr(block, "type", None) == "tool_use" and block.name == "save_rule_violations":
                parsed = RuleViolationBatch.model_validate(block.input)
                return [
                    IssueDraft(
                        type="world_rule_violation",
                        severity=v.severity if v.severity in ("red", "yellow") else "yellow",
                        description=v.description,
                        evidence=[{"chapter": v.chapter, "quote": v.evidence_quote, "rule": v.rule_text}],
                    )
                    for v in parsed.violations
                ]
    except Exception as exc:  # noqa: BLE001
        import logging

        logging.getLogger(__name__).warning("LLM world rule audit fallback/skipped: %s", exc)
    return []


def detect_semantic_inconsistencies_llm(
    claims: list,
    events: list,
    knowledge_matrix: dict | None = None,
    use_llm: bool = True,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> list[IssueDraft]:
    """Detect paraphrased contradictions and story-chronological epistemic leaks via Claude."""
    if not use_llm or (not claims and not events):
        return []

    try:
        from pydantic import BaseModel, Field

        from app.config import settings
        from app.services.extractor import get_anthropic_client

        active_key = api_key or settings.anthropic_api_key
        if not active_key:
            return []

        class SemanticIssueItem(BaseModel):
            type: str = "contradiction"  # contradiction | knowledge_violation
            severity: str = "red"
            description: str
            chapter_a: int
            quote_a: str
            chapter_b: int | None = None
            quote_b: str | None = None

        class SemanticIssueBatch(BaseModel):
            issues: list[SemanticIssueItem] = Field(default_factory=list)

        claims_txt = "\n".join(
            f"- Ch.{c.chapter}: {c.subject} {c.attribute}={c.value} (\"{c.evidence_quote}\")"
            for c in claims[:80]
        )
        events_txt = "\n".join(
            f"- Ch.{ev.chapter_number} (story_order={getattr(ev, 'story_time_order', ev.chapter_number)}, "
            f"flashback={getattr(ev, 'is_flashback', False)}): {ev.summary} [loc={ev.location}]"
            for ev in events[:60]
        )
        km_cells = [
            f"- {cell['character']} knows '{cell['fact']}' since Ch.{cell['since_chapter']} ({cell['how_learned']})"
            for cell in (knowledge_matrix or {}).get("cells", [])
            if cell.get("knows")
        ][:60]
        km_txt = "\n".join(km_cells)

        prompt = f"""Review these story facts, chronological events, and character knowledge states for IMPLICIT or PARAPHRASED continuity issues that exact string matching misses:
1. Paraphrased/behavioral contradictions (e.g. "terrified of heights" vs "casually perched on the cathedral spire").
2. Chronology-aware epistemic leaks (using `story_order`, NOT raw chapter number alone, when flashbacks exist).

CLAIMS:
{claims_txt}

CHRONOLOGICAL EVENTS:
{events_txt}

EPISTEMIC KNOWLEDGE MATRIX:
{km_txt}

Return ONLY high-confidence genuine contradictions or knowledge violations."""

        try:
            client = get_anthropic_client(api_key=api_key, base_url=base_url)
        except TypeError:
            client = get_anthropic_client()
        active_model = model or settings.chat_model
        response = client.messages.create(
            model=active_model,
            max_tokens=2048,
            tools=[
                {
                    "name": "save_semantic_issues",
                    "description": "Save implicit semantic contradictions and epistemic leaks",
                    "input_schema": SemanticIssueBatch.model_json_schema(),
                }
            ],
            tool_choice={"type": "tool", "name": "save_semantic_issues"},
            messages=[{"role": "user", "content": prompt}],
        )
        for block in response.content:
            if getattr(block, "type", None) == "tool_use" and block.name == "save_semantic_issues":
                parsed = SemanticIssueBatch.model_validate(block.input)
                out: list[IssueDraft] = []
                for item in parsed.issues:
                    ev_list = [{"chapter": item.chapter_a, "quote": item.quote_a}]
                    if item.chapter_b is not None and item.quote_b:
                        ev_list.append({"chapter": item.chapter_b, "quote": item.quote_b})
                    out.append(
                        IssueDraft(
                            type=item.type if item.type in ("contradiction", "knowledge_violation") else "contradiction",
                            severity=item.severity if item.severity in ("red", "yellow", "blue") else "yellow",
                            description=item.description,
                            evidence=ev_list,
                        )
                    )
                return out
    except Exception as exc:  # noqa: BLE001
        import logging

        logging.getLogger(__name__).warning("LLM semantic inconsistency audit skipped: %s", exc)
    return []


def run_consistency_pass(
    db,
    project_id,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> int:
    """Load this project's story data, run deterministic + LLM semantic detectors, and persist issues."""
    from app.agents import contradiction_reasoner
    from app.config import settings
    from app.models import Claim, Issue, KnowledgeUpdate, ObjectCustodyEvent, StoryEvent, StoryObject, WorldRule
    from app.services import extractor, knowledge as knowledge_svc

    creds = extractor.resolve_ai_credentials(
        db=db,
        project_id=project_id,
        explicit_api_key=api_key,
        explicit_base_url=base_url,
        explicit_model=model,
    )
    resolved_key = creds.get("api_key")
    resolved_base_url = creds.get("base_url")
    resolved_model = creds.get("model")

    claims = (
        db.query(Claim)
        .filter(Claim.project_id == project_id, Claim.status == "active")
        .all()
    )
    knowledge = db.query(KnowledgeUpdate).filter(KnowledgeUpdate.project_id == project_id).all()
    objects = db.query(StoryObject).filter(StoryObject.project_id == project_id).all()
    events = db.query(StoryEvent).filter(StoryEvent.project_id == project_id).all()
    custody_events = (
        db.query(ObjectCustodyEvent)
        .filter(ObjectCustodyEvent.project_id == project_id)
        .all()
    )
    rules = db.query(WorldRule).filter(WorldRule.project_id == project_id, WorldRule.status == "active").all()
    objects_by_id = {str(o.id): o for o in objects}
    llm_enabled = bool(getattr(settings, "use_llm_consistency", True) and resolved_key)

    drafts = (
        detect_contradictions(claims)
        + detect_knowledge_violations(claims, knowledge, events=events)
        + detect_dangling_objects(objects)
        + detect_continuity_notes(claims)
        + detect_spatiotemporal_conflicts(events)
        + detect_custody_paradoxes(custody_events, objects_by_id)
    )
    if llm_enabled:
        km = knowledge_svc.build_knowledge_matrix(db, project_id)
        drafts.extend(
            detect_world_rule_violations_llm(
                rules,
                claims,
                events,
                use_llm=True,
                api_key=resolved_key,
                base_url=resolved_base_url,
                model=resolved_model,
            )
        )
        drafts.extend(
            detect_semantic_inconsistencies_llm(
                claims,
                events,
                km,
                use_llm=True,
                api_key=resolved_key,
                base_url=resolved_base_url,
                model=resolved_model,
            )
        )
    else:
        drafts.extend(detect_world_rule_violations(claims, rules))

    existing_issues = (
        db.query(Issue)
        .filter(Issue.project_id == project_id, Issue.status == "open")
        .all()
    )
    existing_desc = {(issue.type, issue.description) for issue in existing_issues}
    existing_claims: set[tuple[str, str]] = set()
    for issue in existing_issues:
        if issue.claim_a_id and issue.claim_b_id:
            existing_claims.add((str(issue.claim_a_id), str(issue.claim_b_id)))
            existing_claims.add((str(issue.claim_b_id), str(issue.claim_a_id)))

    existing_evidence = {
        (
            issue.type,
            frozenset(
                (e.get("chapter"), (e.get("quote") or "").strip().lower())
                for e in (issue.evidence or [])
                if isinstance(e, dict)
            ),
        )
        for issue in existing_issues
        if issue.evidence
    }

    to_persist: list[IssueDraft] = []
    for draft in drafts:
        if (draft.type, draft.description) in existing_desc:
            continue
        if draft.claim_a_id and draft.claim_b_id:
            pair = (str(draft.claim_a_id), str(draft.claim_b_id))
            if pair in existing_claims:
                continue
        if draft.evidence:
            ev_sig = (
                draft.type,
                frozenset(
                    (e.get("chapter"), (e.get("quote") or "").strip().lower())
                    for e in draft.evidence
                    if isinstance(e, dict)
                ),
            )
            if len(ev_sig[1]) >= 2 and ev_sig in existing_evidence:
                continue
            existing_evidence.add(ev_sig)

        existing_desc.add((draft.type, draft.description))
        if draft.claim_a_id and draft.claim_b_id:
            existing_claims.add((str(draft.claim_a_id), str(draft.claim_b_id)))
            existing_claims.add((str(draft.claim_b_id), str(draft.claim_a_id)))
        to_persist.append(draft)

    _CONFLICT_TYPES = {
        "contradiction",
        "knowledge_violation",
        "spatiotemporal_conflict",
        "custody_paradox",
        "world_rule_violation",
    }

    reasons_by_idx: dict[int, dict] = {}
    if to_persist:
        batch_reasons = contradiction_reasoner.analyze_issues_batch_intent(
            project_id=project_id,
            drafts=to_persist,
            conflict_types=_CONFLICT_TYPES,
            use_llm=llm_enabled,
        )
        for idx, res in enumerate(batch_reasons):
            reasons_by_idx[idx] = res

    created = 0
    for idx, draft in enumerate(to_persist):
        reason = reasons_by_idx[idx]
        db.add(
            Issue(
                project_id=project_id,
                type=draft.type,
                severity=draft.severity,
                description=draft.description,
                evidence=draft.evidence,
                confidence=reason["confidence"],
                ai_reasoning=reason["ai_reasoning"],
                intent_classification=reason["intent_classification"],
                claim_a_id=draft.claim_a_id,
                claim_b_id=draft.claim_b_id,
            )
        )
        created += 1

    db.commit()
    return created
