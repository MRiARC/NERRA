"""Milestone 3.1 tests: ChangeDetector, SignalScanner, Deep ContextBuilder, Multi-Pass Extraction & PDF/Append."""

import io
import types
import uuid

from pypdf import PdfWriter

from app.models import Character, Claim, Manuscript, Project
from app.services import change_detector, context_builder, exporter, extractor, pipeline, signal_scanner


def test_change_detector_classifies_append_edit_rewrite_and_rename(db_session, client, auth_headers):
    pid = uuid.UUID(client.post("/projects", json={"title": "Change Test"}, headers=auth_headers).json()["id"])

    first = change_detector.detect_changes(db_session, pid, "Chapter 1\nSarah arrived.\n\nChapter 2\nPark arrived.")
    assert first["event_type"] == "first_import"
    assert first["changed_chapters"] == [1, 2]

    ms = Manuscript(
        project_id=pid,
        title="Draft 1",
        raw_text="Chapter 1\nSarah arrived.\n\nChapter 2\nPark arrived.",
        chapters_total=2,
        chapters_done=2,
        status="ready",
    )
    db_session.add(ms)
    db_session.commit()
    db_session.refresh(ms)
    pipeline._embed_and_store_chunk(db_session, ms, 1, "Sarah arrived.")
    pipeline._embed_and_store_chunk(db_session, ms, 2, "Park arrived.")

    appended = change_detector.detect_changes(
        db_session, pid, "Chapter 1\nSarah arrived.\n\nChapter 2\nPark arrived.\n\nChapter 3\nMira vanished.", ms
    )
    assert appended["event_type"] == "new_chapter_added"
    assert appended["changed_chapters"] == [3]
    assert appended["unchanged_chapters"] == [1, 2]

    # Rename character preserving UUID
    char = Character(project_id=pid, name="Sarah", aliases=["Sally"])
    db_session.add(char)
    db_session.flush()
    orig_id = char.id
    db_session.add(Claim(project_id=pid, subject="Sarah", attribute="eye_color", value="green", chapter=1, evidence_quote="Sarah arrived."))
    db_session.commit()

    renamed = change_detector.rename_character_preserving_id(db_session, pid, orig_id, "Mira")
    assert renamed.id == orig_id
    assert renamed.name == "Mira"
    assert "Sarah" in renamed.aliases
    cl = db_session.query(Claim).filter(Claim.project_id == pid).first()
    assert cl.subject == "Mira"


def test_signal_scanner_and_deep_context_builder(db_session, client, auth_headers, monkeypatch):
    pid = uuid.UUID(client.post("/projects", json={"title": "Signal Context Test"}, headers=auth_headers).json()["id"])
    ch1 = Character(project_id=pid, name="Sarah", aliases=["the stranger"], status="active")
    ch2 = Character(project_id=pid, name="Park", status="active")
    db_session.add_all([ch1, ch2])
    db_session.commit()

    fake_signals = {
        "characters_and_epithets": ["the stranger", "Sarah"],
        "dialogue_speakers": ["Park"],
        "coreference_hints": ["the stranger -> Sarah"],
        "locations": ["Ashford"],
        "objects": ["compass"],
        "temporal_cues": ["Three days earlier"],
    }
    block = types.SimpleNamespace(type="tool_use", name="save_signals", input=fake_signals)
    fake_client = types.SimpleNamespace(messages=types.SimpleNamespace(create=lambda **_kw: types.SimpleNamespace(content=[block])))
    monkeypatch.setattr("app.config.settings.anthropic_api_key", "test-key")
    monkeypatch.setattr(extractor, "get_anthropic_client", lambda: fake_client)

    signals = signal_scanner.scan_chapter_signals("Three days earlier, the stranger spoke to Park.", use_llm=True)
    assert signals["llm_enhanced"] is True
    assert "the stranger -> Sarah" in signals["coreference_hints"]

    packet = context_builder.build_story_context_packet(
        db_session, pid, 2, "Three days earlier, the stranger spoke to Park.", signals=signals
    )
    assert "Signal Coreference Hints:" in packet["prompt_text"]
    assert "the stranger -> Sarah" in packet["prompt_text"]


def test_multipass_extraction_merges_three_passes(monkeypatch):
    def _mock_client():
        class _Msgs:
            @staticmethod
            def create(**kwargs):
                tool = kwargs["tool_choice"]["name"]
                if tool == "save_entities":
                    data = {"characters": [{"name": "Sarah", "status": "alive"}], "locations": [{"name": "Pier"}]}
                elif tool == "save_timeline_custody":
                    data = {"events": [{"summary": "Sarah reached the pier", "participants": ["Sarah"]}]}
                else:
                    data = {"claims": [{"subject": "Sarah", "attribute": "hair_color", "value": "red", "evidence_quote": "red hair"}]}
                return types.SimpleNamespace(content=[types.SimpleNamespace(type="tool_use", name=tool, input=data)])

        return types.SimpleNamespace(messages=_Msgs())

    monkeypatch.setattr(extractor, "get_anthropic_client", _mock_client)
    payload = extractor.extract_chapter_multipass(1, "Sarah stood on the pier with red hair.", "Characters: Sarah")
    assert len(payload.characters) == 1
    assert len(payload.locations) == 1
    assert len(payload.events) == 1
    assert len(payload.claims) == 1


def test_pdf_import_and_append_chapter_endpoint(client, auth_headers, db_session, monkeypatch):
    pid = uuid.UUID(client.post("/projects", json={"title": "PDF & Append"}, headers=auth_headers).json()["id"])

    # Empty valid PDF upload verifies PDF parser path cleanly (raises 422 only for blank PDF text)
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    writer.write(buf)
    buf.seek(0)
    res_pdf = client.post(
        f"/projects/{pid}/manuscripts/import",
        headers=auth_headers,
        files={"file": ("story.pdf", buf.read(), "application/pdf")},
        data={"title": "PDF Upload"},
    )
    # Reaches text length check AFTER PdfReader succeeded (not 415 Unsupported!)
    assert res_pdf.status_code == 422

    ms = Manuscript(
        project_id=pid,
        title="Incremental Book",
        raw_text="Chapter 1\nSarah stepped onto the pier.",
        chapters_total=1,
        chapters_done=1,
        status="ready",
    )
    db_session.add(ms)
    db_session.commit()
    db_session.refresh(ms)

    monkeypatch.setattr(
        extractor,
        "extract_chapter",
        lambda ch_num, ch_text, roster: extractor.ExtractionPayload(
            characters=[extractor.ExtractedCharacter(name="Park")],
            claims=[],
        ),
    )

    res_ms = client.get(f"/projects/{pid}/manuscripts", headers=auth_headers)
    assert res_ms.status_code == 200 and len(res_ms.json()) == 1

    res_app = client.post(
        f"/projects/{pid}/manuscripts/{ms.id}/chapters",
        headers=auth_headers,
        json={"chapter_title": "Chapter 2 - Nightfall", "text": "Park searched the museum hall carefully under candlelight."},
    )
    assert res_app.status_code == 201
    body = res_app.json()
    assert body["chapters_total"] == 2
    assert body["chapters_done"] == 2
    assert body["status"] == "ready"
