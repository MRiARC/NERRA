"""Regression tests for Issue #34: 8K-word chapter scaling & token efficiency fixes."""

import types
import uuid

import anthropic

from app.agents import contradiction_reasoner
from app.config import settings
from app.models import Character, Chunk, Claim, CorrectionRule, Manuscript, ValidationCandidate
from app.services import (
    consistency,
    context_builder,
    extractor,
    llm_budget,
    pipeline,
    plot_threads,
    signal_scanner,
    validator,
)


def test_timeout_config_and_transient_backoff_retry(monkeypatch):
    assert settings.llm_timeout_seconds is None
    assert llm_budget.compute_dynamic_timeout_seconds(1000, 1024) < llm_budget.compute_dynamic_timeout_seconds(90000, 16384)
    monkeypatch.setattr("app.config.settings.anthropic_api_key", "test-key")

    attempts = {"n": 0}
    seen_timeouts: list[float | None] = []
    slept: list[float] = []

    class _FakeMsgs:
        @staticmethod
        def create(**kwargs):
            attempts["n"] += 1
            seen_timeouts.append(kwargs.get("timeout"))
            if attempts["n"] == 1:
                raise anthropic.APITimeoutError(request=None)
            if attempts["n"] == 2:
                exc = anthropic.APITimeoutError(request=None)
                exc.response = types.SimpleNamespace(headers={"Retry-After": "3.5"})
                raise exc
            return types.SimpleNamespace(content=[types.SimpleNamespace(type="text", text="ok")])

    class _FakeAnthropic:
        def __init__(self, **_kw):
            self.messages = _FakeMsgs()

    monkeypatch.setattr(anthropic, "Anthropic", _FakeAnthropic)
    monkeypatch.setattr("time.sleep", lambda s: slept.append(s))

    client = extractor.get_anthropic_client()
    res = client.messages.create(model="claude-sonnet-4.5", max_tokens=16384, messages=[{"role": "user", "content": "x" * 60000}])
    assert attempts["n"] == 3
    assert res.content[0].text == "ok"
    assert seen_timeouts[0] is not None and seen_timeouts[0] > 300.0
    assert 3.5 in slept


def test_dynamic_llm_budget_models_and_windowing():
    assert llm_budget.get_model_limits("deepseek-3.2") == (164_000, 64_000)
    assert llm_budget.get_model_limits("qwen3-coder-next") == (256_000, 64_000)
    assert llm_budget.get_model_limits("simple-task") == (200_000, 4_000)
    assert llm_budget.compute_input_char_budget("deepseek-3.2", 4096) < llm_budget.compute_input_char_budget("qwen3-coder-next", 4096)

    assert llm_budget.compute_context_char_budget("claude-sonnet-4.5", 50_000) == 64_000
    assert llm_budget.compute_event_beat_range("word " * 600) < llm_budget.compute_event_beat_range("word " * 8000)
    assert 4 <= llm_budget.compute_intent_batch_size(2048) <= 16

    # Paragraph window splitting retains every piece cleanly without clipping
    para_text = "\n\n".join(f"Paragraph {i} content with important lore detail." for i in range(12))
    windows = llm_budget.split_text_windows(para_text, max_chars=140, overlap_paragraphs=1)
    assert len(windows) > 1
    assert "Paragraph 0" in windows[0]
    assert "Paragraph 11" in windows[-1]


def test_multivalue_has_feature_skip_and_batched_intent_classification(db_session, client, auth_headers, monkeypatch):
    pid = uuid.UUID(client.post("/projects", json={"title": "Batch Intent Test"}, headers=auth_headers).json()["id"])
    monkeypatch.setattr("app.config.settings.anthropic_api_key", "test-key")

    # Non-exclusive attributes must NOT trigger O(k^2) contradictions
    claims = [
        Claim(project_id=pid, subject="Ashford Harbor", attribute="has_feature", value="slate rooftops", chapter=1, evidence_quote="slate rooftops"),
        Claim(project_id=pid, subject="Ashford Harbor", attribute="has_feature", value="stone perimeter", chapter=1, evidence_quote="stone perimeter"),
        Claim(project_id=pid, subject="Ashford Harbor", attribute="has_feature", value="wet granite steps", chapter=1, evidence_quote="wet granite steps"),
        # Genuine contradiction should still fire
        Claim(project_id=pid, subject="Sarah", attribute="eye_color", value="green", chapter=1, evidence_quote="green eyes"),
        Claim(project_id=pid, subject="Sarah", attribute="eye_color", value="blue", chapter=2, evidence_quote="blue eyes"),
        Claim(project_id=pid, subject="Park", attribute="coat_color", value="grey", chapter=1, evidence_quote="grey coat"),
        Claim(project_id=pid, subject="Park", attribute="coat_color", value="black", chapter=2, evidence_quote="black coat"),
    ]
    db_session.add_all(claims)
    db_session.commit()

    drafts = consistency.detect_contradictions(claims)
    assert len(drafts) == 2

    llm_calls = {"n": 0}

    def _fake_create(**kwargs):
        llm_calls["n"] += 1
        assert kwargs["tool_choice"]["name"] == "classify_intent_batch"
        return types.SimpleNamespace(
            content=[
                types.SimpleNamespace(
                    type="tool_use",
                    name="classify_intent_batch",
                    input={
                        "items": [
                            {"index": 0, "intent_classification": "error", "confidence": 0.93, "reasoning": "Eye color slip"},
                            {"index": 1, "intent_classification": "intentional", "confidence": 0.88, "reasoning": "Changed coat intentionally"},
                        ]
                    },
                )
            ]
        )

    monkeypatch.setattr(
        extractor,
        "get_anthropic_client",
        lambda: types.SimpleNamespace(messages=types.SimpleNamespace(create=_fake_create)),
    )

    batch_out = contradiction_reasoner.analyze_issues_batch_intent(pid, drafts, use_llm=True)
    assert llm_calls["n"] == 1
    assert batch_out[0]["intent_classification"] == "error"
    assert batch_out[1]["intent_classification"] == "intentional"


def test_long_chapter_not_clipped_before_50k_chars(db_session, client, auth_headers, monkeypatch):
    pid = uuid.UUID(client.post("/projects", json={"title": "Full 50K Visibility"}, headers=auth_headers).json()["id"])
    monkeypatch.setattr("app.config.settings.anthropic_api_key", "test-key")

    marker = "TAIL_MARKER_SARAH_UNLOCKS_VAULT"
    long_text = ("Rain drummed over Ashford stones while detectives reviewed logs. " * 600) + marker
    assert len(long_text) > 35000

    seen_prompts: list[str] = []

    def _fake_create(**kwargs):
        seen_prompts.append(kwargs["messages"][0]["content"])
        tool = kwargs["tool_choice"]["name"]
        return types.SimpleNamespace(content=[types.SimpleNamespace(type="tool_use", name=tool, input={})])

    monkeypatch.setattr(
        extractor,
        "get_anthropic_client",
        lambda: types.SimpleNamespace(messages=types.SimpleNamespace(create=_fake_create)),
    )

    signal_scanner.scan_chapter_signals(long_text, use_llm=True)
    validator.gate_and_commit_extraction(
        db_session,
        pid,
        None,
        1,
        long_text,
        extractor.ExtractionPayload(characters=[extractor.ExtractedCharacter(name="Sarah")]),
        use_llm=True,
    )
    plot_threads.extract_and_update_plot_threads_llm(db_session, pid, 1, long_text, use_llm=True)

    assert len(seen_prompts) == 3
    assert all(marker in p for p in seen_prompts)


def test_idempotent_chunk_upsert_candidate_dedupe_and_pronoun_alias_strip(db_session, client, auth_headers):
    pid = uuid.UUID(client.post("/projects", json={"title": "Idempotency & Alias"}, headers=auth_headers).json()["id"])

    ms = Manuscript(project_id=pid, title="Draft", raw_text="Chapter 1\nSarah waited.", chapters_total=1, chapters_done=0, status="ready")
    db_session.add(ms)
    db_session.commit()
    db_session.refresh(ms)

    # Chunk upsert preserves 1 row per chapter
    pipeline._embed_and_store_chunk(db_session, ms, 1, "Sarah waited.")
    pipeline._embed_and_store_chunk(db_session, ms, 1, "Sarah waited calmly.")
    assert db_session.query(Chunk).filter(Chunk.manuscript_id == ms.id, Chunk.chapter_number == 1).count() == 1

    # ValidationCandidate pending dedupe on repeated chapter commit
    payload = extractor.ExtractionPayload(characters=[extractor.ExtractedCharacter(name="Monday")])
    validator.gate_and_commit_extraction(db_session, pid, ms.id, 1, "Monday arrived.", payload, use_llm=False)
    validator.gate_and_commit_extraction(db_session, pid, ms.id, 1, "Monday arrived.", payload, use_llm=False)
    assert db_session.query(ValidationCandidate).filter(ValidationCandidate.manuscript_id == ms.id).count() == 1

    # Pronoun aliases stripped cleanly on persist_extraction
    extractor.persist_extraction(
        db_session,
        pid,
        1,
        extractor.ExtractionPayload(
            characters=[extractor.ExtractedCharacter(name="Sarah Mitchell", aliases=["she", "her", "Miss Mitchell"])]
        ),
    )
    sarah = db_session.query(Character).filter(Character.project_id == pid, Character.name == "Sarah Mitchell").first()
    assert sarah.aliases == ["Miss Mitchell"]

    # ContextBuilder caps oversized output while keeping CorrectionRules
    db_session.add(
        CorrectionRule(
            project_id=pid,
            rule_type="fact_override",
            target_entity="Sarah Mitchell",
            instruction_text="Always preserve green eyes for Sarah.",
            payload={},
            active=True,
        )
    )
    db_session.commit()
    packet = context_builder.build_story_context_packet(db_session, pid, 2, "Sarah entered chapter 2.")
    dyn_budget = llm_budget.compute_context_char_budget(settings.extraction_model, len("Sarah entered chapter 2."), settings.extraction_max_tokens)
    assert len(packet["prompt_text"]) <= dyn_budget
    assert "Always preserve green eyes for Sarah." in packet["prompt_text"]
