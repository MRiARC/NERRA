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


def split_chapters(text: str) -> list[Chapter]:
    """Split raw manuscript text into a list of chapters.

    Requirements (docs/tasks/02-import-and-chapters.md has the full walkthrough):

    1. Scan the text line by line; a line matching ANY pattern in
       HEADING_PATTERNS (case-insensitive) starts a new chapter.
    2. Chapter title = the heading line itself (stripped).
    3. Chapter content = everything from that heading to the next heading.
       Text BEFORE the first heading is never lost — it is prepended to
       chapter 1's content.
    4. Chapters are numbered 1..N in order of appearance.
    5. Fallback: if NO heading matches anywhere, return the whole text as a
       single Chapter(number=1, title="Full text", ...). Never return [].
    6. Record start/end character offsets of each chapter's content.

    Returns:
        list[Chapter], in manuscript order.
    """
    # ========== YOUR CODE HERE (Task 02) ==========
    raise NotImplementedError(
        "Task 02 — implement split_chapters. See docs/tasks/02-import-and-chapters.md"
    )
