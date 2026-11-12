"""Author Feedback Loop & Cross-Chapter Re-Audit — Milestone 3.3.

Persists explicit author corrections (`CorrectionRule`) for inline claim edits,
UUID-preserving character renames, and entity alias splits, then runs Claude Sonnet
downstream impact tracing + `consistency.run_consistency_pass` across affected chapters.
"""

import logging
import uuid
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def _as_uuid(value) -> uuid.UUID:
    return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


def re_audit_downstream_chapters_llm(
    db: Session,
    project_id,
    from_chapter: int,
    correction,
    use_llm: bool = True,
) -> dict[str, Any]:
    """Trace downstream chapter impact of an author correction rule and re-run consistency."""
    from app.config import settings
    from app.models import Chunk, Claim, Manuscript
    from app.services import consistency, extractor

    pid = _as_uuid(project_id)
    chunks = (
        db.query(Chunk)
        .join(Manuscript, Chunk.manuscript_id == Manuscript.id)
        .filter(Manuscript.project_id == pid, Chunk.chapter_number >= from_chapter)
        .order_by(Chunk.chapter_number.asc())
        .all()
    )
    downstream_chapters = sorted({c.chapter_number for c in chunks})
    impact_notes: list[str] = []

    if use_llm and settings.anthropic_api_key and chunks:
        try:
            class DownstreamImpact(BaseModel):
                impacted_chapters: list[int] = Field(default_factory=list)
                impact_notes: list[str] = Field(default_factory=list)
                supersede_claim_ids: list[str] = Field(default_factory=list)

            claims = (
                db.query(Claim)
                .filter(Claim.project_id == pid, Claim.chapter >= from_chapter, Claim.status == "active")
                .all()
            )
            claims_text = "\n".join(
                f"- [{cl.id}] Ch.{cl.chapter}: {cl.subject}.{cl.attribute}={cl.value}"
                for cl in claims[:60]
            ) or "None"
            excerpt_text = "\n\n".join(
                f"[Ch.{c.chapter_number}]\n{c.content[:1500]}" for c in chunks[:8]
            )
            prompt = (
                "An author issued a canonical correction rule in NERRA. "
                "Identify which downstream chapters or claims are impacted and whether any "
                "downstream claim IDs are directly invalidated and should be superseded.\n\n"
                f"CORRECTION RULE ({correction.rule_type}): {correction.instruction_text}\n"
                f"FROM CHAPTER: {from_chapter}\n\n"
                f"ACTIVE DOWNSTREAM CLAIMS:\n{claims_text}\n\n"
                f"DOWNSTREAM EXCERPTS:\n{excerpt_text}"
            )
            client = extractor.get_anthropic_client()
            resp = client.messages.create(
                model=settings.chat_model,
                max_tokens=1536,
                tools=[
                    {
                        "name": "save_downstream_impact",
                        "description": "Report impacted chapters, notes, and invalidated downstream claim IDs",
                        "input_schema": DownstreamImpact.model_json_schema(),
                    }
                ],
                tool_choice={"type": "tool", "name": "save_downstream_impact"},
                messages=[{"role": "user", "content": prompt}],
            )
            for block in resp.content:
                if getattr(block, "type", None) == "tool_use" and block.name == "save_downstream_impact":
                    parsed = DownstreamImpact.model_validate(block.input)
                    if parsed.impacted_chapters:
                        downstream_chapters = sorted(set(parsed.impacted_chapters))
                    impact_notes = parsed.impact_notes[:10]
                    for raw_id in parsed.supersede_claim_ids:
                        try:
                            cid = _as_uuid(raw_id)
                            cl = db.get(Claim, cid)
                            if cl is not None and cl.project_id == pid:
                                cl.status = "superseded"
                        except ValueError:
                            continue
                    db.commit()
                    break
        except Exception as exc:  # noqa: BLE001
            logger.debug("Downstream LLM impact trace skipped/fallback: %s", exc)

    issues_created = consistency.run_consistency_pass(db, pid)
    return {
        "re_audit_chapters": downstream_chapters,
        "issues_created": issues_created,
        "impact_notes": impact_notes,
    }


def override_claim(
    db: Session,
    project_id,
    claim_id,
    *,
    value: str | None = None,
    attribute: str | None = None,
    subject: str | None = None,
    status: str | None = None,
    reason: str | None = None,
    re_audit: bool = True,
    use_llm: bool = True,
) -> dict[str, Any]:
    """Update a Claim inline, persist a CorrectionRule, and trigger downstream re-audit."""
    from app.models import Claim, CorrectionRule
    from app.services import graph

    pid = _as_uuid(project_id)
    cid = _as_uuid(claim_id)
    claim = db.get(Claim, cid)
    if claim is None or claim.project_id != pid:
        raise ValueError("Claim not found")

    old_snapshot = {
        "subject": claim.subject,
        "attribute": claim.attribute,
        "value": claim.value,
        "status": claim.status,
    }

    if subject is not None and subject.strip():
        claim.subject = subject.strip()
    if attribute is not None and attribute.strip():
        claim.attribute = attribute.strip()
    if value is not None and value.strip():
        claim.value = value.strip()
    if status is not None:
        claim.status = status

    instruction = (
        f"For '{claim.subject}', attribute '{claim.attribute}' is overridden to '{claim.value}' "
        f"(was '{old_snapshot['value']}', ch.{claim.chapter})."
    )
    if reason and reason.strip():
        instruction += f" Reason: {reason.strip()}"

    rule = CorrectionRule(
        project_id=pid,
        rule_type="fact_override",
        target_entity=claim.subject,
        instruction_text=instruction,
        payload={
            "claim_id": str(claim.id),
            "chapter": claim.chapter,
            "before": old_snapshot,
            "after": {
                "subject": claim.subject,
                "attribute": claim.attribute,
                "value": claim.value,
                "status": claim.status,
            },
        },
        active=True,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    try:
        graph.sync_project_graph(db, pid)
    except Exception:  # noqa: BLE001
        pass

    audit = (
        re_audit_downstream_chapters_llm(db, pid, claim.chapter, rule, use_llm=use_llm)
        if re_audit
        else {"re_audit_chapters": [], "issues_created": 0, "impact_notes": []}
    )
    return {
        "updated_id": claim.id,
        "correction_rule": rule,
        **audit,
    }


def rename_character_with_feedback(
    db: Session,
    project_id,
    character_id,
    new_name: str,
    *,
    re_audit: bool = True,
    use_llm: bool = True,
) -> dict[str, Any]:
    """Rename a character preserving UUID, save a CorrectionRule, and re-audit downstream."""
    from app.models import Character, CorrectionRule
    from app.services import change_detector

    pid = _as_uuid(project_id)
    cid = _as_uuid(character_id)
    char = db.get(Character, cid)
    if char is None or char.project_id != pid:
        raise ValueError("Character not found")
    old_name = char.name
    from_chapter = char.first_chapter or 1

    updated = change_detector.rename_character_preserving_id(db, pid, cid, new_name)
    rule = CorrectionRule(
        project_id=pid,
        rule_type="character_rename",
        target_entity=updated.name,
        instruction_text=(
            f"Character '{old_name}' has been renamed to '{updated.name}' (UUID {updated.id}); "
            "resolve mentions of both to this canonical identity."
        ),
        payload={"character_id": str(updated.id), "old_name": old_name, "new_name": updated.name},
        active=True,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    audit = (
        re_audit_downstream_chapters_llm(db, pid, from_chapter, rule, use_llm=use_llm)
        if re_audit
        else {"re_audit_chapters": [], "issues_created": 0, "impact_notes": []}
    )
    return {
        "updated_id": updated.id,
        "correction_rule": rule,
        **audit,
    }


def split_character_alias(
    db: Session,
    project_id,
    character_id,
    alias_to_split: str,
    *,
    new_character_name: str | None = None,
    re_audit: bool = True,
    use_llm: bool = True,
) -> dict[str, Any]:
    """Split a conflated alias off an existing Character into its own canonical Character."""
    from app.models import Character, CorrectionRule
    from app.services import graph

    pid = _as_uuid(project_id)
    cid = _as_uuid(character_id)
    source = db.get(Character, cid)
    if source is None or source.project_id != pid:
        raise ValueError("Character not found")

    alias_clean = alias_to_split.strip()
    new_name = (new_character_name or alias_clean).strip()
    if not new_name:
        raise ValueError("New character name cannot be empty")

    source_aliases = list(source.aliases or [])
    remaining = [a for a in source_aliases if a.strip().lower() != alias_clean.lower()]
    source.aliases = remaining

    split_char = Character(
        project_id=pid,
        name=new_name,
        aliases=[alias_clean] if alias_clean.lower() != new_name.lower() else [],
        status="active",
        first_chapter=source.first_chapter,
        last_chapter=source.last_chapter,
    )
    db.add(split_char)
    db.flush()

    rule = CorrectionRule(
        project_id=pid,
        rule_type="entity_split",
        target_entity=new_name,
        instruction_text=(
            f"Keep '{new_name}' (alias '{alias_clean}') strictly separate from '{source.name}'; "
            "do not auto-merge these identities."
        ),
        payload={
            "source_character_id": str(source.id),
            "source_character_name": source.name,
            "new_character_id": str(split_char.id),
            "new_character_name": new_name,
            "alias_split": alias_clean,
        },
        active=True,
    )
    db.add(rule)
    db.commit()
    db.refresh(split_char)
    db.refresh(rule)

    try:
        graph.sync_project_graph(db, pid)
    except Exception:  # noqa: BLE001
        pass

    from_chapter = source.first_chapter or 1
    audit = (
        re_audit_downstream_chapters_llm(db, pid, from_chapter, rule, use_llm=use_llm)
        if re_audit
        else {"re_audit_chapters": [], "issues_created": 0, "impact_notes": []}
    )
    return {
        "updated_id": split_char.id,
        "correction_rule": rule,
        **audit,
    }


def list_corrections(db: Session, project_id) -> list:
    from app.models import CorrectionRule

    pid = _as_uuid(project_id)
    return (
        db.query(CorrectionRule)
        .filter(CorrectionRule.project_id == pid, CorrectionRule.active.is_(True))
        .order_by(CorrectionRule.created_at.desc())
        .all()
    )


def deactivate_correction(db: Session, project_id, correction_id) -> None:
    from app.models import CorrectionRule

    pid = _as_uuid(project_id)
    cid = _as_uuid(correction_id)
    rule = db.get(CorrectionRule, cid)
    if rule is None or rule.project_id != pid:
        raise ValueError("Correction rule not found")
    rule.active = False
    db.commit()
