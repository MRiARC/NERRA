"""Archive unpacking, multi-file chapter collection, natural sorting, and inspection."""

import io
import os
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import HTTPException, UploadFile

# Safety thresholds
MAX_TOTAL_FILES = 100
MAX_TOTAL_WORDS = 500_000
MAX_IMPORT_BYTES = 25 * 1024 * 1024  # 25 MB max uncompressed / upload

SUPPORTED_EXTENSIONS = {".txt", ".md", ".markdown", ".docx", ".pdf", ".html", ".htm"}
IGNORED_PATTERNS = {
    "__macosx",
    ".ds_store",
    "thumbs.db",
    "desktop.ini",
    ".git",
    ".gitignore",
}

# Heading patterns mirroring splitter.py
HEADING_REGEX = re.compile(
    r"^(?:#{1,6}\s+)?(?:chapter\s+(\d+|[ivxlcdm]+)|(\d{1,3})\.\s+\S|chapter\b)",
    re.IGNORECASE,
)


def natural_sort_key(s: str) -> list[int | str]:
    """Tokenise string into integer and lower-case text chunks for natural sorting."""
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r"(\d+)", s)]


def is_ignored_file(filepath: str) -> bool:
    """Return True if path is an OS artefact, hidden file, or unsupported resource."""
    parts = filepath.replace("\\", "/").split("/")
    for part in parts:
        clean = part.strip().lower()
        if not clean:
            continue
        if clean in IGNORED_PATTERNS or clean.startswith("._") or (clean.startswith(".") and clean not in {".", ".."}):
            return True
    ext = Path(filepath).suffix.lower()
    return ext not in SUPPORTED_EXTENSIONS


def extract_text_from_bytes(data: bytes, filename: str) -> str:
    """Extract plain text from bytes based on file extension."""
    ext = Path(filename).suffix.lower()

    if ext == ".docx":
        from docx import Document

        doc = Document(io.BytesIO(data))
        return "\n".join(p.text for p in doc.paragraphs if p.text is not None)

    if ext == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(data))
        return "\n\n".join((page.extract_text() or "") for page in reader.pages)

    if ext in {".html", ".htm"}:
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(data.decode("utf-8", errors="replace"), "html.parser")
        for tag in soup(["script", "style", "iframe", "noscript"]):
            tag.decompose()
        # Prefer content container if present, otherwise body
        body = soup.find("div", id="content") or soup.body or soup
        paras = [p.get_text(strip=True) for p in body.find_all("p") if p.get_text(strip=True)]
        if paras:
            return "\n\n".join(paras)
        return body.get_text(separator="\n", strip=True)

    # Standard .txt, .md, .markdown
    return data.decode("utf-8", errors="replace")


@dataclass
class CollectedChapter:
    index: int
    filename: str
    title: str
    content: str
    word_count: int
    char_count: int
    preview: str
    sequence_confirmed: bool = True


def parse_chapter_heading(content: str, filename: str, fallback_index: int) -> tuple[str, str]:
    """Inspect text for an existing chapter heading or infer from filename.

    Returns:
        (canonical_header, clean_body)
    """
    lines = content.splitlines()
    # Find first non-empty line
    first_non_empty_idx = -1
    for i, line in enumerate(lines[:6]):
        if line.strip():
            first_non_empty_idx = i
            break

    if first_non_empty_idx != -1:
        first_line = lines[first_non_empty_idx].strip()
        if HEADING_REGEX.match(first_line):
            # First line is already a clean chapter heading
            clean_heading = first_line.lstrip("#").strip()
            # Standardise to "CHAPTER ..." if starts with chapter
            remaining_lines = lines[first_non_empty_idx + 1 :]
            clean_body = "\n".join(remaining_lines).strip()
            return clean_heading, clean_body

    # Extract number from filename if available, e.g. chapter_03.txt, 03-intro.md
    stem = Path(filename).stem
    num_match = re.search(r"(?:chapter|ch)[-_ ]*(\d+)", stem, re.IGNORECASE) or re.search(r"^(\d+)", stem)
    inferred_num = int(num_match.group(1)) if num_match else fallback_index

    # Clean title from stem
    clean_stem = re.sub(r"^(\d+)[-_ ]*", "", stem)
    clean_stem = re.sub(r"^(?:chapter|ch)[-_ ]*(\d+)[-_ ]*", "", clean_stem, flags=re.IGNORECASE)
    clean_stem = clean_stem.replace("_", " ").replace("-", " ").strip()

    if clean_stem and not clean_stem.isdigit():
        canonical_heading = f"CHAPTER {inferred_num}: {clean_stem.title()}"
    else:
        canonical_heading = f"CHAPTER {inferred_num}"

    return canonical_heading, content.strip()


def collect_from_zip(zip_bytes: bytes) -> tuple[list[CollectedChapter], list[str]]:
    """Unpack in-memory ZIP archive, natural sort chapters, and collect metadata."""
    if len(zip_bytes) > MAX_IMPORT_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Archive too large — maximum compressed size is {MAX_IMPORT_BYTES // (1024 * 1024)} MB",
        )

    try:
        zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    except zipfile.BadZipFile as exc:
        raise HTTPException(status_code=422, detail="Invalid or corrupt ZIP archive") from exc

    file_list = zf.namelist()
    valid_entries: list[str] = []
    ignored_entries: list[str] = []

    for name in file_list:
        if name.endswith("/"):
            continue  # directory entry
        if is_ignored_file(name):
            ignored_entries.append(name)
        else:
            valid_entries.append(name)

    if not valid_entries:
        raise HTTPException(
            status_code=422,
            detail="No readable manuscript chapters (.txt, .md, .docx, .pdf, .html) found in ZIP archive",
        )

    if len(valid_entries) > MAX_TOTAL_FILES:
        raise HTTPException(
            status_code=422,
            detail=f"Archive contains {len(valid_entries)} chapters, exceeding safety limit of {MAX_TOTAL_FILES}",
        )

    # Sort naturally so chapter_2 comes before chapter_10
    valid_entries.sort(key=natural_sort_key)

    collected: list[CollectedChapter] = []
    total_words = 0

    for idx, entry_name in enumerate(valid_entries, start=1):
        raw_bytes = zf.read(entry_name)
        text = extract_text_from_bytes(raw_bytes, entry_name)
        heading, body = parse_chapter_heading(text, os.path.basename(entry_name), fallback_index=idx)
        full_chapter = f"{heading}\n\n{body}" if body else heading

        words = len(full_chapter.split())
        chars = len(full_chapter)
        total_words += words

        if total_words > MAX_TOTAL_WORDS:
            raise HTTPException(
                status_code=422,
                detail=f"Cumulative manuscript words ({total_words:,}) exceeds safety ceiling of {MAX_TOTAL_WORDS:,} words",
            )

        preview = " ".join(body.split()[:30]) if body else heading
        collected.append(
            CollectedChapter(
                index=idx,
                filename=os.path.basename(entry_name),
                title=heading,
                content=full_chapter,
                word_count=words,
                char_count=chars,
                preview=preview,
            )
        )

    return collected, ignored_entries


def collect_from_upload_files(files: list[UploadFile]) -> tuple[list[CollectedChapter], list[str]]:
    """Collect from multiple uploaded files (e.g. folder or batch selection)."""
    valid_files: list[UploadFile] = []
    ignored_entries: list[str] = []

    for f in files:
        fname = f.filename or ""
        if not fname.strip():
            continue
        if is_ignored_file(fname):
            ignored_entries.append(fname)
        else:
            valid_files.append(f)

    if not valid_files:
        raise HTTPException(
            status_code=422,
            detail="No valid story files (.txt, .md, .docx, .pdf, .html) provided in selection",
        )

    if len(valid_files) > MAX_TOTAL_FILES:
        raise HTTPException(
            status_code=422,
            detail=f"Selection contains {len(valid_files)} files, exceeding safety limit of {MAX_TOTAL_FILES}",
        )

    valid_files.sort(key=lambda item: natural_sort_key(item.filename or ""))

    collected: list[CollectedChapter] = []
    total_words = 0

    for idx, uf in enumerate(valid_files, start=1):
        try:
            uf.file.seek(0)
        except Exception:
            pass
        data = uf.file.read(MAX_IMPORT_BYTES + 1)
        if len(data) > MAX_IMPORT_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File '{uf.filename}' exceeds {MAX_IMPORT_BYTES // (1024 * 1024)} MB limit",
            )
        text = extract_text_from_bytes(data, uf.filename or f"chapter_{idx}.txt")
        heading, body = parse_chapter_heading(text, uf.filename or f"chapter_{idx}.txt", fallback_index=idx)
        full_chapter = f"{heading}\n\n{body}" if body else heading

        words = len(full_chapter.split())
        chars = len(full_chapter)
        total_words += words

        if total_words > MAX_TOTAL_WORDS:
            raise HTTPException(
                status_code=422,
                detail=f"Cumulative manuscript words ({total_words:,}) exceeds safety ceiling of {MAX_TOTAL_WORDS:,} words",
            )

        preview = " ".join(body.split()[:30]) if body else heading
        collected.append(
            CollectedChapter(
                index=idx,
                filename=uf.filename or f"chapter_{idx}.txt",
                title=heading,
                content=full_chapter,
                word_count=words,
                char_count=chars,
                preview=preview,
            )
        )

    return collected, ignored_entries


def inspect_manuscript_source(
    file: UploadFile | None = None,
    files: list[UploadFile] | None = None,
    pasted_text: str = "",
) -> dict[str, Any]:
    """Inspect and preview manuscript source files before committing ingestion."""
    # Filter files that actually have a filename
    active_files = [f for f in (files or []) if (f.filename or "").strip()]

    # 1. Multi-file list
    if active_files and len(active_files) > 1:
        chapters, ignored = collect_from_upload_files(active_files)
        mode = "folder" if any("/" in (f.filename or "") for f in active_files) else "multi_file"
        total_words = sum(c.word_count for c in chapters)
        total_chars = sum(c.char_count for c in chapters)
        return {
            "source_mode": mode,
            "total_files": len(active_files),
            "total_chapters": len(chapters),
            "total_words": total_words,
            "total_characters": total_chars,
            "chapters": [c.__dict__ for c in chapters],
            "ignored_files": ignored,
            "warning": None,
        }

    # 2. Check if single file is ZIP or individual document
    target_file = None
    if file is not None and (file.filename or "").strip():
        target_file = file
    elif active_files and len(active_files) == 1:
        target_file = active_files[0]

    if target_file is not None:
        try:
            target_file.file.seek(0)
        except Exception:
            pass

        fname = (target_file.filename or "").lower()
        if fname.endswith(".zip") or target_file.content_type in {
            "application/zip",
            "application/x-zip-compressed",
        }:
            data = target_file.file.read()
            chapters, ignored = collect_from_zip(data)
            total_words = sum(c.word_count for c in chapters)
            total_chars = sum(c.char_count for c in chapters)
            return {
                "source_mode": "zip_archive",
                "total_files": len(chapters) + len(ignored),
                "total_chapters": len(chapters),
                "total_words": total_words,
                "total_characters": total_chars,
                "chapters": [c.__dict__ for c in chapters],
                "ignored_files": ignored,
                "warning": None,
            }

        # Single text / docx / pdf file
        data = target_file.file.read()
        text = extract_text_from_bytes(data, target_file.filename or "manuscript.txt")
        words = len(text.split())
        chars = len(text)
        preview = " ".join(text.split()[:40])
        return {
            "source_mode": "single_file",
            "total_files": 1,
            "total_chapters": 1,
            "total_words": words,
            "total_characters": chars,
            "chapters": [
                {
                    "index": 1,
                    "filename": target_file.filename or "manuscript",
                    "title": target_file.filename or "Manuscript",
                    "content": text,
                    "word_count": words,
                    "char_count": chars,
                    "preview": preview,
                    "sequence_confirmed": True,
                }
            ],
            "ignored_files": [],
            "warning": None,
        }

    # 3. Pasted text
    clean_text = pasted_text.strip()
    words = len(clean_text.split())
    chars = len(clean_text)
    preview = " ".join(clean_text.split()[:40])
    return {
        "source_mode": "pasted_text",
        "total_files": 1,
        "total_chapters": 1,
        "total_words": words,
        "total_characters": chars,
        "chapters": [
            {
                "index": 1,
                "filename": "pasted_text.txt",
                "title": "Pasted Manuscript",
                "content": clean_text,
                "word_count": words,
                "char_count": chars,
                "preview": preview,
                "sequence_confirmed": True,
            }
        ],
        "ignored_files": [],
        "warning": None,
    }


def consolidate_manuscript(
    file: UploadFile | None = None,
    files: list[UploadFile] | None = None,
    pasted_text: str = "",
    title: str = "",
) -> tuple[str, str, int, dict[str, Any]]:
    """Consolidate input files/zip/folder into a unified raw_text for the pipeline.

    Returns:
        (raw_text, display_title, chapters_total, metadata)
    """
    inspection = inspect_manuscript_source(file=file, files=files, pasted_text=pasted_text)
    chapters = inspection["chapters"]

    if not chapters:
        raise HTTPException(
            status_code=422,
            detail="Manuscript content is empty — provide valid chapter files",
        )

    # Stitch chapters together with clean dual newlines
    stitched_blocks = [c["content"] for c in chapters]
    raw_text = "\n\n".join(stitched_blocks).strip()

    if len(raw_text) < 100:
        raise HTTPException(
            status_code=422,
            detail="Manuscript too short — provide at least ~100 characters of story text",
        )

    display_title = title.strip()
    if not display_title:
        if inspection["source_mode"] == "zip_archive" and file and file.filename:
            display_title = Path(file.filename).stem
        elif inspection["source_mode"] in {"folder", "multi_file"} and chapters:
            display_title = "Multi-chapter Collection"
        elif file and file.filename:
            display_title = Path(file.filename).stem
        else:
            display_title = "Imported Manuscript"

    metadata = {
        "source_mode": inspection["source_mode"],
        "total_files": inspection["total_files"],
        "total_chapters": len(chapters),
        "total_words": inspection["total_words"],
        "chapter_filenames": [c["filename"] for c in chapters],
    }

    return raw_text, display_title, len(chapters), metadata
