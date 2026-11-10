"""LLM + Regex Hybrid Signal & Coreference Pre-Scanner — Milestone 3.1.

Extracts candidate entity mentions, lowercase epithets ("the innkeeper",
"her grandfather"), dialogue speakers, temporal anchors, locations, and objects
before ContextBuilder fetches graph & vector memory.
"""

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

_CAP_TERM_RE = re.compile(r"\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*)\b")
_DIALOGUE_ATTR_RE = re.compile(
    r'([A-Z][a-z]{2,}|\bthe\s+[a-z]{3,})\s+(?:said|asked|replied|whispered|muttered|called|answered)\b',
    re.I,
)
_TEMPORAL_RE = re.compile(
    r"\b(\d+\s+(?:years?|months?|weeks?|days?)\s+(?:earlier|ago|before|later|after)|that\s+(?:morning|evening|night)|the\s+next\s+day|years\s+prior)\b",
    re.I,
)


def scan_chapter_signals(chapter_text: str, use_llm: bool | None = None) -> dict[str, Any]:
    """Run deterministic regex anchors + fast LLM signal & epithet discovery."""
    text = chapter_text or ""
    cap_terms = sorted({m.group(1).strip() for m in _CAP_TERM_RE.finditer(text)})
    speakers = sorted({m.group(1).strip() for m in _DIALOGUE_ATTR_RE.finditer(text)})
    temporal_cues = sorted({m.group(0).strip() for m in _TEMPORAL_RE.finditer(text)})

    signals: dict[str, Any] = {
        "capitalized_terms": cap_terms[:40],
        "dialogue_speakers": speakers[:20],
        "temporal_cues": temporal_cues[:15],
        "epithets": [],
        "coreference_hints": [],
        "objects_mentioned": [],
        "locations_mentioned": [],
        "llm_enhanced": False,
    }

    if use_llm is None:
        from app.config import settings

        use_llm = bool(settings.anthropic_api_key)

    if not use_llm or not text.strip():
        return signals

    try:
        from pydantic import BaseModel, Field

        from app.config import settings
        from app.services.extractor import get_anthropic_client

        if not settings.anthropic_api_key:
            return signals

        class SignalReport(BaseModel):
            characters_and_epithets: list[str] = Field(default_factory=list)
            dialogue_speakers: list[str] = Field(default_factory=list)
            coreference_hints: list[str] = Field(default_factory=list)
            locations: list[str] = Field(default_factory=list)
            objects: list[str] = Field(default_factory=list)
            temporal_cues: list[str] = Field(default_factory=list)

        client = get_anthropic_client()
        response = client.messages.create(
            model=settings.fast_model,
            max_tokens=1024,
            tools=[
                {
                    "name": "save_signals",
                    "description": "Record extracted pre-scan story signals and coreference hints",
                    "input_schema": SignalReport.model_json_schema(),
                }
            ],
            tool_choice={"type": "tool", "name": "save_signals"},
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Scan this chapter text and extract ALL retrieval signals so our graph ContextBuilder "
                        "doesn't miss lowercase roles/epithets (e.g. 'the innkeeper', 'his young deputy'), "
                        "dialogue speakers, coreference hints ('she -> Sarah'), locations, objects, and time shifts.\n\n"
                        + text[:120000]
                    ),
                }
            ],
        )
        for block in response.content:
            if getattr(block, "type", None) == "tool_use" and block.name == "save_signals":
                parsed = SignalReport.model_validate(block.input)
                signals["epithets"] = parsed.characters_and_epithets
                signals["dialogue_speakers"] = sorted(
                    set(signals["dialogue_speakers"]) | set(parsed.dialogue_speakers)
                )
                signals["coreference_hints"] = parsed.coreference_hints
                signals["locations_mentioned"] = parsed.locations
                signals["objects_mentioned"] = parsed.objects
                signals["temporal_cues"] = sorted(
                    set(signals["temporal_cues"]) | set(parsed.temporal_cues)
                )
                signals["llm_enhanced"] = True
                break
    except Exception as exc:  # noqa: BLE001
        logger.debug("LLM signal pre-scan fallback to regex anchors: %s", exc)

    return signals
