"""Deep 200K-Aware Story Context Builder — Milestone 3.1.

Pulls relevant Neo4j multi-hop neighborhoods (up to 3 hops), prior chapter chunks
from pgvector, full active world rules, tracked objects/custody, timeline events,
and any active author correction rules to assemble a high-signal memory packet.
"""

import logging
import uuid
from typing import Any

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def build_story_context_packet(
    db: Session,
    project_id,
    chapter_number: int,
    chapter_text: str,
    signals: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a complete Story Memory Context Packet for extraction & reasoning."""
    from app.models import Chunk, CorrectionRule, Manuscript, PlotThread
    from app.services import embedder, extractor, graph, plot_threads

    pid = uuid.UUID(str(project_id)) if not isinstance(project_id, uuid.UUID) else project_id
    base_roster = extractor.get_roster(db, pid)

    sig = signals or {}
    candidate_terms: list[str] = []
    for key in ("epithets", "capitalized_terms", "dialogue_speakers", "locations_mentioned"):
        for term in sig.get(key) or []:
            t = str(term).strip()
            if len(t) >= 2 and t not in candidate_terms:
                candidate_terms.append(t)

    # Multi-hop Neo4j/SQL neighborhood lookup (up to 3 hops) for signaled entities
    neighborhood_lines: list[str] = []
    seen_nbrs: set[str] = set()
    for term in candidate_terms[:12]:
        try:
            nbrs = graph.get_entity_neighborhood(db, pid, term, hops=3)
            for nbr in nbrs[:10]:
                label = f"{nbr.get('name')} ({', '.join(nbr.get('labels') or ['Entity'])}, ch.{nbr.get('chapter') or '?'})"
                if label not in seen_nbrs:
                    seen_nbrs.add(label)
                    neighborhood_lines.append(f"- Near '{term}': {label}")
        except Exception as exc:  # noqa: BLE001
            logger.debug("ContextBuilder neighborhood skipped for %s: %s", term, exc)

    # Cross-chapter semantic chunk recall via pgvector
    similar_passages: list[str] = []
    try:
        vec = embedder.embed_one((chapter_text or "")[:2000])
        rows = (
            db.query(Chunk)
            .join(Manuscript, Chunk.manuscript_id == Manuscript.id)
            .filter(Manuscript.project_id == pid, Chunk.chapter_number != chapter_number)
            .filter(Chunk.embedding.isnot(None))
            .order_by(Chunk.embedding.cosine_distance(vec))
            .limit(6)
            .all()
        )
        for ch_row in rows:
            similar_passages.append(f"- [Ch.{ch_row.chapter_number}] {ch_row.content[:400]}")
    except Exception as exc:  # noqa: BLE001
        logger.debug("ContextBuilder vector recall skipped: %s", exc)

    corrections = (
        db.query(CorrectionRule)
        .filter(CorrectionRule.project_id == pid, CorrectionRule.active.is_(True))
        .order_by(CorrectionRule.created_at.asc())
        .all()
    )
    open_threads = (
        db.query(PlotThread)
        .filter(PlotThread.project_id == pid)
        .order_by(PlotThread.setup_chapter.asc())
        .all()
    )
    customization = plot_threads.get_customization(db, pid)

    parts = [base_roster]
    if customization.get("custom_context"):
        parts.append("\nCustom Project Context:\n" + str(customization["custom_context"]).strip())
    if open_threads:
        parts.append(
            "\nActive Plot Threads:\n"
            + "\n".join(f"- [{t.status}] Ch.{t.setup_chapter} {t.title}: {t.description}" for t in open_threads[:15])
        )
    if corrections:
        parts.append(
            "\nActive Author Correction Rules:\n"
            + "\n".join(f"- [{r.rule_type}] {r.instruction_text}" for r in corrections)
        )
    if sig.get("coreference_hints"):
        parts.append("\nSignal Coreference Hints:\n" + "\n".join(f"- {h}" for h in sig["coreference_hints"][:15]))
    if sig.get("temporal_cues"):
        parts.append("\nDetected Temporal Cues: " + ", ".join(sig["temporal_cues"][:12]))
    if neighborhood_lines:
        parts.append("\n3-Hop Graph Neighborhood:\n" + "\n".join(neighborhood_lines[:20]))
    if similar_passages:
        parts.append("\nSemantically Related Prior Passages:\n" + "\n".join(similar_passages))

    prompt_text = "\n".join(parts)
    from app.config import settings
    from app.services import llm_budget

    explicit_max = getattr(settings, "max_context_chars", None)
    max_chars = (
        int(explicit_max)
        if explicit_max
        else llm_budget.compute_context_char_budget(
            settings.extraction_model,
            chapter_chars=len(chapter_text or ""),
            max_output_tokens=settings.extraction_max_tokens,
        )
    )
    if len(prompt_text) > max_chars:
        # Preserve critical roster/custom/threads/corrections prefix; trim long semantic passages tail cleanly
        core_parts = [p for p in parts if not p.startswith("\nSemantically Related Prior Passages:")]
        core_text = "\n".join(core_parts)
        remaining = max(0, max_chars - len(core_text) - 64)
        if similar_passages and remaining > 200:
            passages_block = "\nSemantically Related Prior Passages:\n" + "\n".join(similar_passages)
            prompt_text = core_text + "\n" + passages_block[:remaining]
        else:
            prompt_text = core_text[:max_chars]

    return {
        "prompt_text": prompt_text,
        "signals": sig,
        "neighborhood_count": len(neighborhood_lines),
        "similar_passages_count": len(similar_passages),
    }
