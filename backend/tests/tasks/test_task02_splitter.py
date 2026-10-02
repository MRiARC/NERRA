"""Task 02 tests — the chapter splitter (pure Python, no database)."""

from tests.utils import run_or_hint

TASK = "02-import-and-chapters"

from app.services.splitter import split_chapters  # noqa: E402

NOVEL = """Once upon a time in a small town, nothing had happened yet.

Chapter 1 - The Arrival
Sarah stepped off the train with a leather suitcase. The station clock read midnight.

Chapter 2 - The Diary
The diary was waiting under the floorboard, exactly where grandfather said it would be.
"""


def test_splits_on_chapter_headings():
    chapters = run_or_hint(TASK, lambda: split_chapters(NOVEL))
    assert len(chapters) == 2, (
        f"[{TASK}] expected 2 chapters, got {len(chapters)} — check your heading detection"
    )
    first, second = chapters
    assert first.number == 1 and second.number == 2
    assert "Arrival" in first.title
    assert "stepped" in first.content
    # the preamble line before Chapter 1 must survive inside chapter 1
    assert "nothing had happened yet" in first.content
    assert "floorboard" in second.content
    # headings themselves shouldn't be inside content (they are the title)
    assert "Chapter 1" not in first.content


def test_offsets_slice_back_to_original():
    chapters = run_or_hint(TASK, lambda: split_chapters(NOVEL))
    for chapter in chapters:
        assert NOVEL[chapter.start:chapter.end].strip() == chapter.content.strip(), (
            f"[{TASK}] start/end offsets of chapter {chapter.number} don't slice the original text"
        )


def test_fallback_without_headings():
    plain = "Just one continuous scene with no chapter markers at all. " * 5
    chapters = run_or_hint(TASK, lambda: split_chapters(plain))
    assert len(chapters) == 1, f"[{TASK}] text without headings must become ONE chapter"
    assert chapters[0].number == 1
    assert "continuous scene" in chapters[0].content


def test_never_returns_empty():
    chapters = run_or_hint(TASK, lambda: split_chapters("   \n\n  "))
    assert len(chapters) == 1, f"[{TASK}] even blank-ish text must produce one chapter, not []"


def test_roman_and_numbered_headings():
    mixed = """Prologue text here.

CHAPTER I - The Beginning
It began, as these things do, quietly.

12. The Turn
Then everything changed at once.
"""
    chapters = run_or_hint(TASK, lambda: split_chapters(mixed))
    assert len(chapters) == 2, (
        f"[{TASK}] expected the ROMAN 'CHAPTER I' and '12.' headings to both split; got {len(chapters)}"
    )
