"""Chapter splitter — Task 02 (yours to implement).

A manuscript arrives as one big string. This module cuts it into chapters,
which become the unit of analysis for everything downstream (extraction,
embeddings, citations).

Pure Python — no database, no LLM. That makes it the perfect second task:
small, self-contained, and fully verifiable with pytest.
"""

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


def split_chapters(text: str) -> list[Chapter]:
    """Split raw manuscript text into a list of chapters."""
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
