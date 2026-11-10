"""Chapter splitter — cuts a raw manuscript into chapter segments with character offsets."""

from dataclasses import dataclass, field

# Known heading shapes, e.g.:
#   "Chapter 12", "CHAPTER 3 - The Storm", "Chapter XII", "12. The Letter"
HEADING_PATTERNS = [
    r"^chapter\s+\d+",
    r"^chapter\s+[IVXLCDM]+",
    r"^\d{1,3}\.\s+\S",
]


@dataclass
class Chapter:
    number: int
    title: str
    content: str
    # chapters this splitter produces also carry their character offsets in
    # the original text — handy for tests and debugging:
    start: int = field(default=0)
    end: int = field(default=0)


import re
from dataclasses import dataclass, field

# Known heading shapes, e.g.:
#   "Chapter 12", "CHAPTER 3 - The Storm", "Chapter XII", "12. The Letter"
HEADING_PATTERNS = [
    r"^chapter\s+\d+",
    r"^chapter\s+[IVXLCDM]+",
    r"^\d{1,3}\.\s+\S",
]

_COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in HEADING_PATTERNS]


@dataclass
class Chapter:
    number: int
    title: str
    content: str
    start: int = field(default=0)
    end: int = field(default=0)


def _is_heading(line: str) -> bool:
    line_clean = line.strip()
    return any(p.match(line_clean) for p in _COMPILED_PATTERNS)


def _detect_headings_llm(text: str) -> list[str]:
    """Ask Claude to identify literal chapter/scene heading lines in prose lacking standard headings."""
    try:
        from pydantic import BaseModel, Field

        from app.config import settings
        from app.services.extractor import get_anthropic_client

        if not settings.anthropic_api_key:
            return []

        class SectionSplitPlan(BaseModel):
            headings: list[str] = Field(default_factory=list)

        client = get_anthropic_client()
        response = client.messages.create(
            model=settings.fast_model,
            max_tokens=1024,
            tools=[
                {
                    "name": "save_headings",
                    "description": "Save exact verbatim section/chapter boundary lines",
                    "input_schema": SectionSplitPlan.model_json_schema(),
                }
            ],
            tool_choice={"type": "tool", "name": "save_headings"},
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Identify exact verbatim heading/separator lines (such as unnumbered chapter titles, "
                        "POV names like 'SARAH', 'Prologue', 'Epilogue', or '***') that divide sections in this text. "
                        "Return ONLY lines appearing verbatim in the manuscript.\n\n"
                        + text[:30000]
                    ),
                }
            ],
        )
        for block in response.content:
            if getattr(block, "type", None) == "tool_use" and block.name == "save_headings":
                return [h.strip() for h in SectionSplitPlan.model_validate(block.input).headings if h.strip()]
    except Exception:  # noqa: BLE001
        return []
    return []


def split_chapters(text: str, use_llm: bool | None = None) -> list[Chapter]:
    """Split raw manuscript text into chapters, using LLM boundary fallback when multiple lines lack headings."""
    if not text or not text.strip():
        return [Chapter(number=1, title="Full text", content=text, start=0, end=len(text))]

    lines_with_offsets = []
    curr = 0
    for line in text.splitlines(keepends=True):
        line_start = curr
        line_end = curr + len(line)
        lines_with_offsets.append((line_start, line_end, line))
        curr = line_end

    headings = []
    for line_start, line_end, line_str in lines_with_offsets:
        if _is_heading(line_str):
            headings.append((line_start, line_end, line_str.strip()))

    if use_llm is None:
        from app.config import settings

        non_empty_lines = sum(1 for _, _, ln in lines_with_offsets if ln.strip())
        use_llm = bool(settings.anthropic_api_key) and non_empty_lines >= 2

    if not headings and use_llm:
        llm_heading_set = set(_detect_headings_llm(text))
        if llm_heading_set:
            for line_start, line_end, line_str in lines_with_offsets:
                if line_str.strip() in llm_heading_set:
                    headings.append((line_start, line_end, line_str.strip()))

    if not headings:
        return [Chapter(number=1, title="Full text", content=text, start=0, end=len(text))]

    chapters: list[Chapter] = []

    for i, (h_start, h_end, h_title) in enumerate(headings):
        next_h_start = headings[i + 1][0] if i + 1 < len(headings) else len(text)

        if i == 0:
            preamble = text[:h_start]
            body = text[h_end:next_h_start]
            if preamble.strip():
                content = (preamble.rstrip("\n") + "\n\n" + body.lstrip("\n")).strip()
                ch_start = 0
            else:
                content = body.strip()
                ch_start = h_end
            ch_end = next_h_start
        else:
            body = text[h_end:next_h_start]
            content = body.strip()
            ch_start = h_end
            ch_end = next_h_start

        chapters.append(
            Chapter(
                number=i + 1,
                title=h_title,
                content=content,
                start=ch_start,
                end=ch_end,
            )
        )

    return chapters
