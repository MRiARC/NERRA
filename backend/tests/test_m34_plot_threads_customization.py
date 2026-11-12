"""Milestone 3.4 tests: Cross-Chapter Plot Thread Tracker & 5 Feature Customization Hooks."""

import types
import uuid

from app.agents import story_chat
from app.models import Character, Chunk, Manuscript
from app.services import context_builder, exporter, extractor, graph, plot_threads, validator


def test_plot_threads_cross_chapter_lifecycle_graph_chat_and_bible(db_session, client, auth_headers, monkeypatch):
    pid = uuid.UUID(client.post("/projects", json={"title": "Plot Thread Novel"}, headers=auth_headers).json()["id"])

    ms = Manuscript(
        project_id=pid,
        title="Book 1",
        raw_text="Chapter 1\nSarah found the brass keyhole.\n\nChapter 3\nSarah unlocked the vault.",
        chapters_total=3,
        chapters_done=3,
        status="ready",
    )
    db_session.add(ms)
    db_session.flush()
    db_session.add_all(
        [
            Chunk(manuscript_id=ms.id, chapter_number=1, content="Sarah found the brass keyhole in the cellar.", content_hash="pt1", paragraph_hashes=[]),
            Chunk(manuscript_id=ms.id, chapter_number=3, content="Sarah turned the key and opened the hidden vault.", content_hash="pt3", paragraph_hashes=[]),
        ]
    )
    db_session.add(Character(project_id=pid, name="Sarah", status="active", first_chapter=1, last_chapter=3))
    db_session.commit()

    monkeypatch.setattr("app.config.settings.anthropic_api_key", "test-key")
    responses = [
        {
            "threads": [
                {
                    "title": "The Locked Cellar Vault",
                    "description": "Sarah discovers a hidden keyhole requiring a brass key.",
                    "setup_chapter": 1,
                    "status": "open",
                    "related_entities": ["Sarah"],
                    "evidence_quote": "Sarah found the brass keyhole in the cellar.",
                }
            ]
        },
        {
            "threads": [
                {
                    "title": "The Locked Cellar Vault",
                    "description": "Sarah opens the hidden vault with the brass key.",
                    "setup_chapter": 1,
                    "payoff_chapter": 3,
                    "status": "resolved",
                    "related_entities": ["Sarah"],
                    "evidence_quote": "Sarah turned the key and opened the hidden vault.",
                }
            ]
        },
    ]
    call_idx = {"i": 0}

    def _fake_create(**_kw):
        idx = min(call_idx["i"], len(responses) - 1)
        call_idx["i"] += 1
        return types.SimpleNamespace(
            content=[types.SimpleNamespace(type="tool_use", name="save_plot_threads", input=responses[idx])]
        )

    monkeypatch.setattr(
        extractor,
        "get_anthropic_client",
        lambda: types.SimpleNamespace(messages=types.SimpleNamespace(create=_fake_create)),
    )

    res_sync = client.post(f"/projects/{pid}/plot-threads/sync", headers=auth_headers)
    assert res_sync.status_code == 200
    threads = res_sync.json()
    assert len(threads) == 1
    assert threads[0]["title"] == "The Locked Cellar Vault"
    assert threads[0]["status"] == "resolved"
    assert threads[0]["payoff_chapter"] == 3

    # Manual create + patch endpoints
    res_create = client.post(
        f"/projects/{pid}/plot-threads",
        headers=auth_headers,
        json={"title": "Who Betrayed Park?", "description": "Anonymous leak at station", "setup_chapter": 2, "status": "open", "related_entities": ["Sarah"]},
    )
    assert res_create.status_code == 201
    new_tid = res_create.json()["id"]

    res_patch = client.patch(
        f"/projects/{pid}/plot-threads/{new_tid}",
        headers=auth_headers,
        json={"status": "red_herring"},
    )
    assert res_patch.status_code == 200 and res_patch.json()["status"] == "red_herring"

    # Graph projection & Neo4j sync include plot_thread nodes & THREAD_INVOLVES edges
    nodes, edges, _ = graph._build_projection_from_sql(db_session, pid)
    pt_nodes = [n for n in nodes if n["kind"] == "plot_thread"]
    pt_edges = [e for e in edges if e["relation"] == "THREAD_INVOLVES"]
    assert len(pt_nodes) == 2
    assert len(pt_edges) >= 2
    sync_res = graph.sync_project_graph(db_session, pid)
    assert sync_res["synced"] is True

    # Bible export includes Plot Threads section
    bible = exporter.export_story_bible_markdown(db_session, pid)
    assert "## 8. Plot Threads & Foreshadowing" in bible["markdown"]
    assert "The Locked Cellar Vault" in bible["markdown"]

    # Story Chat RAG retrieve_node surfaces Plot Threads & Mysteries
    rag = story_chat.retrieve_node({"project_id": pid, "question": "What happened to the Locked Cellar Vault?"})
    assert any("Plot Threads & Mysteries:" in c.get("content", "") for c in rag["contexts"])


def test_five_feature_customization_hooks_applied_across_pipeline(db_session, client, auth_headers, monkeypatch):
    pid = uuid.UUID(client.post("/projects", json={"title": "Customization Hooks"}, headers=auth_headers).json()["id"])

    payload = {
        "custom_context": "Victorian gaslamp detective noir with strict magic scarcity.",
        "custom_prompt": "Always track poison clues meticulously.",
        "custom_validation": {
            "auto_accept_threshold": 0.90,
            "extra_ignored_tokens": ["stranger"],
        },
        "custom_graph_write": {
            "include_plot_threads": True,
            "project_tag": "victorian-noir",
        },
        "custom_ui_config": {
            "banner": "Detective Edition",
            "default_tab": "plot_threads",
        },
    }
    res_put = client.put(f"/projects/{pid}/customization", headers=auth_headers, json=payload)
    assert res_put.status_code == 200
    assert res_put.json()["custom_ui_config"]["banner"] == "Detective Edition"

    # Hook 1: custom_context inside ContextBuilder
    packet = context_builder.build_story_context_packet(db_session, pid, 1, "Gaslamps flickered.")
    assert "Victorian gaslamp detective noir" in packet["prompt_text"]

    # Hook 2: custom_prompt forwarded to extractor
    captured_prompts: list[str] = []

    def _fake_extract_create(**kwargs):
        captured_prompts.append(kwargs["messages"][0]["content"])
        tool = kwargs["tool_choice"]["name"]
        return types.SimpleNamespace(content=[types.SimpleNamespace(type="tool_use", name=tool, input={})])

    monkeypatch.setattr(
        extractor,
        "get_anthropic_client",
        lambda: types.SimpleNamespace(messages=types.SimpleNamespace(create=_fake_extract_create)),
    )
    extractor.extract_chapter_multipass(1, "Fog rolled in.", "Roster: Sarah", custom_prompt=payload["custom_prompt"])
    assert captured_prompts and "Always track poison clues meticulously." in captured_prompts[0]

    # Hook 3: custom_validation extra_ignored_tokens quarantines "Stranger"
    _, staged = validator.gate_and_commit_extraction(
        db_session,
        pid,
        None,
        1,
        "A Stranger entered.",
        extractor.ExtractionPayload(characters=[extractor.ExtractedCharacter(name="Stranger")]),
        use_llm=False,
    )
    assert len(staged) == 1 and staged[0].route == "reject_hold"

    # Hook 4: custom_graph_write tags projected nodes
    plot_threads.create_plot_thread(
        db_session,
        pid,
        {"title": "Gaslamp Sabotage", "description": "Streetlamps poisoned", "setup_chapter": 1},
    )
    nodes, _, _ = graph._build_projection_from_sql(db_session, pid)
    assert any(n["metadata"].get("project_tag") == "victorian-noir" for n in nodes)

    # Hook 5: custom_ui_config returned on GET
    res_get = client.get(f"/projects/{pid}/customization", headers=auth_headers)
    assert res_get.status_code == 200
    assert res_get.json()["custom_ui_config"]["default_tab"] == "plot_threads"
