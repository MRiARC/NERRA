"""Unit and integration tests for multi-format manuscript imports.

Covers:
- In-memory ZIP unpacking & macOS artefact skipping (__MACOSX, .DS_Store, ._*)
- Natural ordering (chapter_2 precedes chapter_10)
- Heading detection in chapter text vs. filename fallback
- Word count and chapter file safety ceilings
- Inspection endpoint POST /projects/{project_id}/manuscripts/inspect
- Multi-file / folder import POST /projects/{project_id}/manuscripts/import
"""

import io
import uuid
import zipfile
import pytest
from fastapi import HTTPException, UploadFile

from app.models import Manuscript, Project, User
from app.services import archive_extractor
from app.services.archive_extractor import (
    MAX_TOTAL_FILES,
    MAX_TOTAL_WORDS,
    extract_text_from_bytes,
    is_ignored_file,
    natural_sort_key,
    parse_chapter_heading,
)
from tests.utils import expect_status


def test_natural_sort_order():
    """Verify natural sorting orders chapter numbers numerically rather than lexicographically."""
    raw_names = [
        "chapter_10.txt",
        "chapter_2.txt",
        "chapter_1.txt",
        "chapter_20.txt",
        "chapter_03.txt",
        "intro.txt",
    ]
    sorted_names = sorted(raw_names, key=natural_sort_key)
    assert sorted_names == [
        "chapter_1.txt",
        "chapter_2.txt",
        "chapter_03.txt",
        "chapter_10.txt",
        "chapter_20.txt",
        "intro.txt",
    ]


def test_ignored_files_and_artefacts():
    """Verify macOS metadata, hidden dotfiles, and non-manuscript formats are excluded."""
    assert is_ignored_file("__MACOSX/._chapter_01.txt") is True
    assert is_ignored_file(".DS_Store") is True
    assert is_ignored_file("subfolder/.DS_Store") is True
    assert is_ignored_file("desktop.ini") is True
    assert is_ignored_file("thumbs.db") is True
    assert is_ignored_file(".git/config") is True
    assert is_ignored_file("cover.jpg") is True
    assert is_ignored_file("illustration.png") is True

    # Valid supported files
    assert is_ignored_file("chapter_1.txt") is False
    assert is_ignored_file("folder/chapter_2.md") is False
    assert is_ignored_file("manuscript.docx") is False
    assert is_ignored_file("archive/story.pdf") is False
    assert is_ignored_file("web/chapter_1.html") is False


def test_parse_chapter_heading_preserves_internal_heading():
    """Text with an explicit internal heading retains that title."""
    content = "Chapter 4: The Midnight Duel\n\nThe cold wind whipped against the tower."
    heading, body = parse_chapter_heading(content, "ch_04.txt", fallback_index=4)
    assert heading == "Chapter 4: The Midnight Duel"
    assert body == "The cold wind whipped against the tower."


def test_parse_chapter_heading_infers_from_filename_when_absent():
    """Text without a heading gets a canonical chapter header derived from the filename."""
    content = "A carriage arrived at the wrought iron gates in absolute silence."
    heading, body = parse_chapter_heading(content, "chapter_07_the_arrival.txt", fallback_index=7)
    assert heading == "CHAPTER 7: The Arrival"
    assert body == content


def test_parse_chapter_heading_handles_numeric_filenames():
    """Numeric filenames like '08.txt' derive standard canonical headers."""
    content = "The lanterns flickered as dusk fell across the city."
    heading, body = parse_chapter_heading(content, "08.txt", fallback_index=8)
    assert heading == "CHAPTER 8"
    assert body == content


def test_collect_from_zip_and_skips_artefacts():
    """Unpacking a ZIP archive naturally orders chapters and filters out __MACOSX artefacts."""
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # Add out of order
        zf.writestr("book/chapter_10.txt", "Chapter 10\nTenth chapter contents.")
        zf.writestr("book/chapter_1.txt", "Chapter 1\nFirst chapter contents.")
        zf.writestr("book/chapter_2.txt", "Chapter 2\nSecond chapter contents.")
        zf.writestr("__MACOSX/._chapter_1.txt", "Mac resource fork binary junk")
        zf.writestr("book/.DS_Store", "DS_Store binary")
        zf.writestr("book/cover.png", "fake png data")

    zip_bytes = zip_buf.getvalue()
    chapters, ignored = archive_extractor.collect_from_zip(zip_bytes)

    assert len(chapters) == 3
    assert [c.filename for c in chapters] == ["chapter_1.txt", "chapter_2.txt", "chapter_10.txt"]
    assert any("__MACOSX" in item for item in ignored)
    assert any(".DS_Store" in item for item in ignored)


def test_zip_limits_enforced():
    """Archive exceeding safety limit of chapters or words raises HTTP 422."""
    # Exceeding chapter count (> MAX_TOTAL_FILES)
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for i in range(MAX_TOTAL_FILES + 5):
            zf.writestr(f"ch_{i:03d}.txt", f"Chapter {i}\nSome words for testing.")

    with pytest.raises(HTTPException) as exc_info:
        archive_extractor.collect_from_zip(zip_buf.getvalue())
    assert exc_info.value.status_code == 422
    assert "exceeding safety limit" in exc_info.value.detail


def test_corrupt_zip_raises_422():
    """Corrupt or invalid zip data raises HTTP 422."""
    with pytest.raises(HTTPException) as exc_info:
        archive_extractor.collect_from_zip(b"not a valid zip file content")
    assert exc_info.value.status_code == 422
    assert "Invalid or corrupt ZIP" in exc_info.value.detail


def test_inspect_manuscript_endpoint_with_zip(client, auth_headers):
    """POST /projects/{project_id}/manuscripts/inspect returns pre-flight metadata for ZIP."""
    # Create project
    proj_resp = client.post("/projects", json={"title": "Zip Test Novel"}, headers=auth_headers)
    pid = proj_resp.json()["id"]

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("chapter_01.txt", "Chapter 1: Dawn\nThe sun rose gently over the misty hills.")
        zf.writestr("chapter_02.txt", "Chapter 2: The Journey\nThey packed their provisions and departed.")

    zip_buf.seek(0)
    resp = client.post(
        f"/projects/{pid}/manuscripts/inspect",
        headers=auth_headers,
        files={"file": ("novel.zip", zip_buf.read(), "application/zip")},
    )
    expect_status(resp, 200, "inspect-zip", "POST /projects/{id}/manuscripts/inspect")
    data = resp.json()

    assert data["source_mode"] == "zip_archive"
    assert data["total_chapters"] == 2
    assert data["total_files"] == 2
    assert len(data["chapters"]) == 2
    assert data["chapters"][0]["title"] == "Chapter 1: Dawn"
    assert data["chapters"][0]["sequence_confirmed"] is True
    assert data["chapters"][1]["title"] == "Chapter 2: The Journey"


def test_import_manuscript_with_zip_creates_manuscript(client, auth_headers, db_session):
    """POST /projects/{project_id}/manuscripts/import unpacks ZIP and stores consolidated text."""
    proj_resp = client.post("/projects", json={"title": "Import Zip Test"}, headers=auth_headers)
    pid = proj_resp.json()["id"]

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("chapter_01.txt", "Chapter 1: The Port\n" + "Sarah watched the ships arrive in silence. " * 5)
        zf.writestr("chapter_02.txt", "Chapter 2: The Harbor\n" + "The sea breeze carried the smell of brine and iron. " * 5)

    zip_buf.seek(0)
    resp = client.post(
        f"/projects/{pid}/manuscripts/import",
        headers=auth_headers,
        files={"file": ("full_manuscript.zip", zip_buf.read(), "application/zip")},
        data={"title": "Full Manuscript Book"},
    )
    expect_status(resp, 201, "import-zip", "POST /projects/{id}/manuscripts/import")
    data = resp.json()

    assert data["status"] == "pending"
    assert data["chapters_total"] == 2
    assert data["source_mode"] == "zip_archive"

    ms = db_session.get(Manuscript, uuid.UUID(data["manuscript_id"]))
    assert ms is not None
    assert ms.title == "Full Manuscript Book"
    assert "Chapter 1: The Port" in ms.raw_text
    assert "Chapter 2: The Harbor" in ms.raw_text
    assert ms.chapters_total == 2


def test_import_manuscript_with_multiple_files(client, auth_headers, db_session):
    """POST /projects/{project_id}/manuscripts/import accepts batch file uploads."""
    proj_resp = client.post("/projects", json={"title": "Multi-file Test"}, headers=auth_headers)
    pid = proj_resp.json()["id"]

    file1 = ("files", ("chapter_02.txt", io.BytesIO(b"Chapter 2\nSecond chapter text with enough content for validation. " * 3), "text/plain"))
    file2 = ("files", ("chapter_01.txt", io.BytesIO(b"Chapter 1\nFirst chapter text with enough content for validation. " * 3), "text/plain"))

    resp = client.post(
        f"/projects/{pid}/manuscripts/import",
        headers=auth_headers,
        files=[file1, file2],
        data={"title": "Batch Story"},
    )
    expect_status(resp, 201, "import-multi", "POST /projects/{id}/manuscripts/import")
    data = resp.json()

    assert data["chapters_total"] == 2
    assert data["source_mode"] == "multi_file"

    ms = db_session.get(Manuscript, uuid.UUID(data["manuscript_id"]))
    assert ms is not None
    # Verify natural order puts chapter 1 before chapter 2
    ch1_idx = ms.raw_text.find("Chapter 1")
    ch2_idx = ms.raw_text.find("Chapter 2")
    assert 0 <= ch1_idx < ch2_idx
