"""Draft Versioning & Story Bible Export — Milestone 2.5."""

import difflib
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session


def summarize_semantic_diff_llm(prior_text: str, new_text: str, prior_summary: dict, new_counts: dict) -> str | None:
    """Summarize narrative and continuity changes between two manuscript drafts."""
    if not prior_text or prior_text == new_text:
        return None
    try:
        from app.config import settings
        from app.services.extractor import get_anthropic_client

        if not settings.anthropic_api_key:
            return None

        diff_lines = list(
            difflib.unified_diff(
                prior_text.splitlines(),
                new_text.splitlines(),
                lineterm="",
                n=2,
            )
        )[:120]
        client = get_anthropic_client()
        resp = client.messages.create(
            model=settings.chat_model,
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Summarize in 2-4 crisp bullet points what changed narratively or structurally "
                        "between Draft A and Draft B (plot additions, altered facts, resolved/new issues).\n\n"
                        f"Metrics before: {prior_summary}\nMetrics now: {new_counts}\n\n"
                        "Diff snippet:\n" + "\n".join(diff_lines)
                    ),
                }
            ],
        )
        return resp.content[0].text.strip()
    except Exception:  # noqa: BLE001
        return None


def record_manuscript_version(db: Session, manuscript) -> Any:
    """Create a ManuscriptVersion snapshot and compute structural + semantic diff vs prior draft."""
    from app.models import Character, Claim, Issue, ManuscriptVersion

    content_hash = hashlib.sha256((manuscript.raw_text or "").encode("utf-8")).hexdigest()
    prior = (
        db.query(ManuscriptVersion)
        .filter(ManuscriptVersion.project_id == manuscript.project_id)
        .order_by(ManuscriptVersion.version_number.desc())
        .first()
    )

    if prior and prior.content_hash == content_hash and prior.manuscript_id == manuscript.id:
        return prior

    next_version = (prior.version_number + 1) if prior else 1
    lines_added = 0
    lines_removed = 0
    if prior:
        diff = list(
            difflib.unified_diff(
                (prior.raw_text or "").splitlines(),
                (manuscript.raw_text or "").splitlines(),
                lineterm="",
            )
        )
        for line in diff:
            if line.startswith("+") and not line.startswith("+++"):
                lines_added += 1
            elif line.startswith("-") and not line.startswith("---"):
                lines_removed += 1
    else:
        lines_added = len((manuscript.raw_text or "").splitlines())

    chars_count = db.query(Character).filter(Character.project_id == manuscript.project_id).count()
    claims_count = db.query(Claim).filter(Claim.project_id == manuscript.project_id, Claim.status == "active").count()
    open_issues_count = (
        db.query(Issue).filter(Issue.project_id == manuscript.project_id, Issue.status == "open").count()
    )

    new_metrics = {
        "title": manuscript.title,
        "chapters_total": manuscript.chapters_total,
        "characters_count": chars_count,
        "claims_count": claims_count,
        "open_issues_count": open_issues_count,
        "lines_added": lines_added,
        "lines_removed": lines_removed,
    }
    if prior:
        sem_diff = summarize_semantic_diff_llm(
            prior.raw_text or "",
            manuscript.raw_text or "",
            prior.diff_summary or {},
            new_metrics,
        )
        if sem_diff:
            new_metrics["semantic_diff"] = sem_diff

    version = ManuscriptVersion(
        project_id=manuscript.project_id,
        manuscript_id=manuscript.id,
        version_number=next_version,
        content_hash=content_hash,
        raw_text=manuscript.raw_text,
        diff_summary=new_metrics,
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


def export_story_bible_markdown(db: Session, project_id) -> dict[str, str]:
    """Compile the entire project knowledge graph into a structured Markdown Story Bible."""
    from app.models import (
        Character,
        Claim,
        Issue,
        Location,
        ObjectCustodyEvent,
        PlotThread,
        Project,
        Relationship,
        StoryEvent,
        StoryObject,
        WorldRule,
    )

    pid = uuid.UUID(str(project_id)) if not isinstance(project_id, uuid.UUID) else project_id
    project = db.get(Project, pid)
    title = project.title if project else "NERRA Story Project"

    chars = db.query(Character).filter(Character.project_id == pid).order_by(Character.first_chapter.asc().nulls_last()).all()
    char_by_id = {c.id: c.name for c in chars}
    rels = db.query(Relationship).filter(Relationship.project_id == pid).order_by(Relationship.chapter.asc().nulls_last()).all()
    locs = db.query(Location).filter(Location.project_id == pid).order_by(Location.first_chapter.asc().nulls_last()).all()
    objs = db.query(StoryObject).filter(StoryObject.project_id == pid).order_by(StoryObject.first_chapter.asc().nulls_last()).all()
    custody = db.query(ObjectCustodyEvent).filter(ObjectCustodyEvent.project_id == pid).order_by(ObjectCustodyEvent.chapter.asc()).all()
    events = (
        db.query(StoryEvent)
        .filter(StoryEvent.project_id == pid)
        .order_by(StoryEvent.story_time_order.asc(), StoryEvent.chapter_number.asc())
        .all()
    )
    rules = db.query(WorldRule).filter(WorldRule.project_id == pid, WorldRule.status == "active").all()
    claims = db.query(Claim).filter(Claim.project_id == pid, Claim.status == "active").order_by(Claim.chapter.asc()).all()
    issues = db.query(Issue).filter(Issue.project_id == pid).order_by(Issue.severity.asc()).all()
    threads = db.query(PlotThread).filter(PlotThread.project_id == pid).order_by(PlotThread.setup_chapter.asc()).all()

    now_iso = datetime.now(timezone.utc).isoformat()
    lines: list[str] = [
        f"# {title} — Living Story Bible",
        f"*Generated by NERRA Story Intelligence Engine on {now_iso}*",
        "",
        "## Summary",
        f"- **Characters:** {len(chars)}",
        f"- **Relationships:** {len(rels)}",
        f"- **Locations:** {len(locs)}",
        f"- **Tracked Objects:** {len(objs)}",
        f"- **Timeline Events:** {len(events)}",
        f"- **World Rules:** {len(rules)}",
        f"- **Open Issues:** {sum(1 for i in issues if i.status == 'open')}",
        "",
        "---",
        "",
        "## 1. Characters",
    ]
    if not chars:
        lines.append("_No characters recorded._")
    for c in chars:
        alias_str = f" (Aliases: {', '.join(c.aliases)})" if c.aliases else ""
        ch_span = f"Ch. {c.first_chapter or 1}–{c.last_chapter or 1}"
        lines.append(f"### {c.name}{alias_str}")
        lines.append(f"- **Status:** {c.status} | **Appearances:** {ch_span}")
        if c.description:
            lines.append(f"- **Description:** {c.description}")
        if c.physical_traits:
            traits_fmt = ", ".join(f"{k}: {v}" for k, v in c.physical_traits.items())
            lines.append(f"- **Physical Traits:** {traits_fmt}")
        lines.append("")

    lines.extend(["## 2. Relationships"])
    if not rels:
        lines.append("_No relationships recorded._")
    for r in rels:
        ca = char_by_id.get(r.character_a_id, str(r.character_a_id))
        cb = char_by_id.get(r.character_b_id, str(r.character_b_id))
        span = f"Ch. {r.chapter or '?'}" + (f"–{r.until_chapter}" if getattr(r, "until_chapter", None) else "+")
        sent = getattr(r, "sentiment", "neutral")
        lines.append(f"- **{ca} ↔ {cb}** — `{r.type}` ({sent}, {span}): {r.description or ''}")
    lines.append("")

    lines.extend(["## 3. World Locations & Objects"])
    for loc in locs:
        lines.append(f"- **Location — {loc.name}** (Ch. {loc.first_chapter or 1}): {loc.description or '—'}")
    for obj in objs:
        mentions = ", ".join(str(m) for m in (obj.mention_chapters or []))
        lines.append(f"- **Object — {obj.name}** (Mentioned in Ch. {mentions or obj.first_chapter or 1}): {obj.description or '—'}")
        obj_cust = [ce for ce in custody if ce.object_id == obj.id]
        for ce in obj_cust:
            lines.append(f"  - Ch. {ce.chapter}: *{ce.action}* → {ce.holder_name}")
    lines.append("")

    lines.extend(["## 4. Chronological Story Timeline"])
    if not events:
        lines.append("_No events recorded._")
    for idx, ev in enumerate(events, start=1):
        tag = " [FLASHBACK]" if ev.is_flashback else (" [FLASHFORWARD]" if ev.is_flashforward else "")
        loc_note = f" @ {ev.location}" if ev.location else ""
        lines.append(f"{idx}. **Ch. {ev.chapter_number}{tag}{loc_note}:** {ev.summary}")
    lines.append("")

    lines.extend(["## 5. World Rules & Canon Laws"])
    if not rules:
        lines.append("_No active world rules defined._")
    for wr in rules:
        lines.append(f"- **[{wr.category.upper()}]** {wr.rule_text}")
    lines.append("")

    lines.extend(["## 6. Continuity Issues & Review Queue"])
    if not issues:
        lines.append("_No issues detected._")
    for iss in issues:
        lines.append(
            f"- **[{iss.severity.upper()} · {iss.status}] ({iss.type}):** {iss.description}"
        )
        if getattr(iss, "ai_reasoning", None):
            lines.append(f"  - *AI Reasoning ({getattr(iss, 'intent_classification', 'error')}):* {iss.ai_reasoning}")
    lines.append("")

    lines.extend(["## 7. Verified Factual Claims"])
    for cl in claims[:50]:
        lines.append(f"- Ch. {cl.chapter}: **{cl.subject}** `{cl.attribute}` = `{cl.value}` — *\"{cl.evidence_quote}\"*")
    lines.append("")

    lines.extend(["## 8. Plot Threads & Foreshadowing"])
    if not threads:
        lines.append("_No plot threads tracked._")
    for th in threads:
        payoff = f" → resolved Ch. {th.payoff_chapter}" if th.payoff_chapter else ""
        ents = f" ({', '.join(th.related_entities)})" if th.related_entities else ""
        lines.append(f"- **[{th.status.upper()}] {th.title}** (Setup Ch. {th.setup_chapter}{payoff}){ents}: {th.description}")

    return {
        "project_title": title,
        "markdown": "\n".join(lines),
        "generated_at": now_iso,
    }
