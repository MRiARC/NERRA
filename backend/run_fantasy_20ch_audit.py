import json
import os
import sys
import time
import uuid
from pathlib import Path

# Ensure backend app in python path
sys.path.insert(0, os.path.abspath("."))

from app.database import SessionLocal
from app.models import (
    Character,
    Claim,
    Issue,
    KnowledgeUpdate,
    Location,
    Manuscript,
    ObjectCustodyEvent,
    PlotThread,
    Project,
    Relationship,
    StoryEvent,
    StoryObject,
    User,
    ValidationCandidate,
)
from app.services import (
    consistency,
    context_builder,
    extractor,
    llm_budget,
    pipeline,
    plot_threads,
    signal_scanner,
    splitter,
    timeline,
    validator,
)
from app.config import settings

novel_path = Path("/Users/adarshchauhan/.gemini/antigravity/brain/012e1cd2-69c1-4855-8e56-5caa1d1ef280/scratch/the_obsidian_archive_20ch.txt")
results_json_path = Path("/Users/adarshchauhan/.gemini/antigravity/brain/012e1cd2-69c1-4855-8e56-5caa1d1ef280/scratch/fantasy_20ch_audit_results.json")

print("=== STARTING 20-CHAPTER FANTASY AUDIT PIPELINE ===")
print("Novel path:", novel_path)
raw_text = novel_path.read_text(encoding="utf-8")
chapters = splitter.split_chapters(raw_text)
total_words = len(raw_text.split())
print(f"Total novel words: {total_words} across {len(chapters)} chapters.\n")

# Token tracking interceptor
call_telemetry = []

orig_get_client = extractor.get_anthropic_client

def instrumented_get_client(*args, **kwargs):
    client = orig_get_client(*args, **kwargs)
    raw_create = client.messages.create
    
    def tracked_create(**call_kwargs):
        t0 = time.time()
        res = raw_create(**call_kwargs)
        elapsed = time.time() - t0
        usage = getattr(res, "usage", None)
        in_toks = getattr(usage, "input_tokens", 0) if usage else 0
        out_toks = getattr(usage, "output_tokens", 0) if usage else 0
        tool_name = "text"
        tools = call_kwargs.get("tools") or []
        if tools:
            tool_name = tools[0].get("name", "unknown_tool")
        call_telemetry.append({
            "model": call_kwargs.get("model", settings.extraction_model),
            "tool": tool_name,
            "input_tokens": in_toks,
            "output_tokens": out_toks,
            "total_tokens": in_toks + out_toks,
            "latency_s": round(elapsed, 2),
            "time": time.time(),
        })
        return res
    
    client.messages.create = tracked_create
    return client

extractor.get_anthropic_client = instrumented_get_client

db = SessionLocal()

# Setup test user and project
user = db.query(User).filter(User.email == "audit_author@nerra.ai").first()
if not user:
    user = User(email="audit_author@nerra.ai", password_hash="dev_password_hash")
    db.add(user)
    db.commit()
    db.refresh(user)

project = db.query(Project).filter(Project.owner_id == user.id, Project.title == "The Obsidian Archive of Aethelgard").first()
if not project:
    project = Project(
        owner_id=user.id,
        title="The Obsidian Archive of Aethelgard",
        genre="Fantasy Thriller / Psychological Mystery",
    )
    db.add(project)
    db.commit()
    db.refresh(project)

manuscript = db.query(Manuscript).filter(Manuscript.project_id == project.id, Manuscript.title == "The Obsidian Archive").first()
if not manuscript:
    manuscript = Manuscript(
        project_id=project.id,
        title="The Obsidian Archive",
        raw_text=raw_text,
        chapters_total=len(chapters),
        chapters_done=0,
        status="processing",
    )
    db.add(manuscript)
    db.commit()
    db.refresh(manuscript)

print(f"Using Project {project.id} and Manuscript {manuscript.id} (completed chapters: {manuscript.chapters_done})\n")

checkpoint_file = "/Users/adarshchauhan/.gemini/antigravity/brain/012e1cd2-69c1-4855-8e56-5caa1d1ef280/scratch/fantasy_20ch_audit_results_checkpoint.json"
initial_metrics = []
if os.path.exists(checkpoint_file):
    try:
        with open(checkpoint_file) as f:
            cp = json.load(f)
        if cp.get("manuscript_id") == str(manuscript.id):
            initial_metrics = cp.get("chapters_metrics", [])
            for c in cp.get("call_telemetry", []):
                call_telemetry.append(c)
            print(f"Loaded {len(initial_metrics)} completed chapter metrics and {len(call_telemetry)} telemetry records from checkpoint!\n")
    except Exception as e:
        print(f"Error loading checkpoint: {e}")

audit_data = {
    "project_id": str(project.id),
    "manuscript_id": str(manuscript.id),
    "total_words": total_words,
    "chapters_count": len(chapters),
    "chapters_metrics": initial_metrics,
    "call_telemetry": call_telemetry,
}

total_start_time = time.time()

for idx, ch in enumerate(chapters, start=1):
    if idx <= manuscript.chapters_done:
        print(f"Skipping already completed Chapter {idx}/{len(chapters)}: '{ch.title}'")
        continue
    ch_words = len(ch.content.split())
    ch_chars = len(ch.content)
    print(f"--------------------------------------------------------------------------------")
    print(f"Processing Chapter {idx}/{len(chapters)}: '{ch.title}' ({ch_words} words, {ch_chars} chars)...")
    t_ch_start = time.time()
    telemetry_start_idx = len(call_telemetry)

    # 1. Build Deep Context Packet
    signals = signal_scanner.scan_chapter_signals(ch.content, use_llm=False)
    context_packet = context_builder.build_story_context_packet(
        db, project.id, ch.number, ch.content, signals=signals
    )

    # 2. Extract with 3-Pass Multi-pass Extraction
    story_context_str = context_packet.get("prompt_text", "Beginning of story.")
    payload = extractor.extract_chapter_multipass(ch.number, ch.content, story_context_str)

    # 3. Hallucination Guard Validation
    cleaned_payload = extractor.validate_payload(payload, ch.content)

    # 4. Pre-graph Staging Gate (Validation Gate)
    approved_payload, staged_candidates = validator.gate_and_commit_extraction(
        db, project.id, manuscript.id, ch.number, ch.content, cleaned_payload, use_llm=True
    )

    # 5. Extraction persistence is handled inside gate_and_commit_extraction above.

    # 6. Embed and store chunk
    pipeline._embed_and_store_chunk(db, manuscript, ch.number, ch.content)

    # 7. Incremental Consistency & Plot Threads
    ch_claims = db.query(Claim).filter(Claim.project_id == project.id).all()
    ch_k_updates = db.query(KnowledgeUpdate).filter(KnowledgeUpdate.project_id == project.id).all()
    ch_events = db.query(StoryEvent).filter(StoryEvent.project_id == project.id).all()
    ch_objects = db.query(StoryObject).filter(StoryObject.project_id == project.id).all()

    k_issues = consistency.detect_knowledge_violations(ch_claims, ch_k_updates, events=ch_events)
    c_issues = consistency.detect_contradictions(ch_claims)
    st_issues = consistency.detect_spatiotemporal_conflicts(ch_events)
    d_issues = consistency.detect_dangling_objects(ch_objects)

    active_threads = plot_threads.extract_and_update_plot_threads_llm(
        db, project.id, ch.number, ch.content, use_llm=True
    )

    ch_elapsed = round(time.time() - t_ch_start, 2)
    ch_telemetry = call_telemetry[telemetry_start_idx:]
    ch_in_toks = sum(c["input_tokens"] for c in ch_telemetry)
    ch_out_toks = sum(c["output_tokens"] for c in ch_telemetry)

    ch_metric = {
        "chapter_number": ch.number,
        "title": ch.title,
        "words": ch_words,
        "chars": ch_chars,
        "latency_s": ch_elapsed,
        "api_calls": len(ch_telemetry),
        "input_tokens": ch_in_toks,
        "output_tokens": ch_out_toks,
        "total_tokens": ch_in_toks + ch_out_toks,
        "characters_extracted": len(cleaned_payload.characters),
        "locations_extracted": len(cleaned_payload.locations),
        "objects_extracted": len(cleaned_payload.objects),
        "events_extracted": len(cleaned_payload.events),
        "claims_extracted": len(cleaned_payload.claims),
        "knowledge_extracted": len(cleaned_payload.knowledge),
        "custody_extracted": len(cleaned_payload.custody_events),
        "quarantined_candidates": len(staged_candidates),
        "auto_approved_candidates": len(approved_payload.characters) + len(approved_payload.claims),
        "issues_snapshot": {
            "contradictions": len(c_issues),
            "spatiotemporal": len(st_issues),
            "knowledge_violations": len(k_issues),
            "dangling_objects": len(d_issues),
        },
        "active_threads_count": len(active_threads),
    }
    audit_data["chapters_metrics"].append(ch_metric)

    manuscript.chapters_done = idx
    db.commit()

    try:
        with open("/Users/adarshchauhan/.gemini/antigravity/brain/012e1cd2-69c1-4855-8e56-5caa1d1ef280/scratch/fantasy_20ch_audit_results_checkpoint.json", "w") as f:
            json.dump(audit_data, f, indent=2, default=str)
    except Exception as exc:
        print(f"Warning saving checkpoint: {exc}")

    print(f"  Done in {ch_elapsed}s | Tokens: in={ch_in_toks}, out={ch_out_toks} ({ch_in_toks + ch_out_toks} total)")
    print(f"  Extracted: {len(cleaned_payload.characters)} chars, {len(cleaned_payload.locations)} locs, {len(cleaned_payload.objects)} objs, {len(cleaned_payload.events)} events, {len(cleaned_payload.claims)} claims")
    print(f"  Validation Gate: {len(approved_payload.characters)} chars / {len(approved_payload.claims)} claims approved, {len(staged_candidates)} quarantined")
    print(f"  Current Issues: {len(c_issues)} contradictions, {len(st_issues)} spatiotemporal, {len(k_issues)} knowledge violations, {len(d_issues)} dangling")
    print(f"  Active Plot Threads: {len(active_threads)}")

# Post-processing Global Passes
print("\n================================================================================")
print("Running Global Narrative Timeline Ordering & Consistency Audit...")
ordered_events = timeline.compute_story_chronology(db, project.id, use_llm=True)
db.commit()

final_issues_created = consistency.run_consistency_pass(db, project.id)
plot_threads.synthesize_all_plot_threads_llm(db, project.id, use_llm=True)

manuscript.status = "ready"
db.commit()

total_elapsed = round(time.time() - total_start_time, 2)
total_input_tokens = sum(c["input_tokens"] for c in call_telemetry)
total_output_tokens = sum(c["output_tokens"] for c in call_telemetry)
grand_total_tokens = total_input_tokens + total_output_tokens

# Capture Final Knowledge Graph State for Ground-Truth Audit
final_chars = db.query(Character).filter(Character.project_id == project.id).all()
final_locs = db.query(Location).filter(Location.project_id == project.id).all()
final_objs = db.query(StoryObject).filter(StoryObject.project_id == project.id).all()
final_evs = db.query(StoryEvent).filter(StoryEvent.project_id == project.id).order_by(StoryEvent.story_time_order.asc()).all()
final_claims = db.query(Claim).filter(Claim.project_id == project.id).all()
final_issues = db.query(Issue).filter(Issue.project_id == project.id).all()
final_threads = db.query(PlotThread).filter(PlotThread.project_id == project.id).all()
final_custody = db.query(ObjectCustodyEvent).filter(ObjectCustodyEvent.project_id == project.id).order_by(ObjectCustodyEvent.chapter.asc()).all()
final_quarantine = db.query(ValidationCandidate).filter(
    ValidationCandidate.project_id == project.id,
    ValidationCandidate.route.in_(["reject_hold", "human_review", "quarantine"]),
).all()

audit_data["summary"] = {
    "total_elapsed_s": total_elapsed,
    "total_api_calls": len(call_telemetry),
    "total_input_tokens": total_input_tokens,
    "total_output_tokens": total_output_tokens,
    "grand_total_tokens": grand_total_tokens,
    "avg_tokens_per_chapter": grand_total_tokens // len(chapters),
    "avg_seconds_per_chapter": round(total_elapsed / len(chapters), 2),
    "total_characters": len(final_chars),
    "total_locations": len(final_locs),
    "total_objects": len(final_objs),
    "total_events": len(final_evs),
    "total_claims": len(final_claims),
    "total_issues_persisted": len(final_issues),
    "total_plot_threads": len(final_threads),
    "total_custody_events": len(final_custody),
    "total_quarantined": len(final_quarantine),
}

audit_data["database_dump"] = {
    "characters": [{"name": c.name, "aliases": c.aliases, "first_chapter": c.first_chapter, "last_chapter": c.last_chapter, "status": c.status} for c in final_chars],
    "locations": [{"name": l.name, "first_chapter": l.first_chapter, "description": l.description} for l in final_locs],
    "objects": [{"name": o.name, "first_chapter": o.first_chapter, "mention_chapters": o.mention_chapters} for o in final_objs],
    "timeline_events_ordered": [
        {"chapter": e.chapter_number, "order": e.story_time_order, "is_flashback": e.is_flashback, "summary": e.summary, "location": e.location}
        for e in final_evs
    ],
    "custody_transitions": [
        {"chapter": c.chapter, "object_id": str(c.object_id), "holder": c.holder_name, "action": c.action, "evidence": c.evidence_quote}
        for c in final_custody
    ],
    "issues": [
        {"type": i.type, "severity": i.severity, "description": i.description, "status": i.status, "intent_classification": i.intent_classification}
        for i in final_issues
    ],
    "plot_threads": [
        {"title": t.title, "status": t.status, "setup_chapter": t.setup_chapter, "payoff_chapter": t.payoff_chapter, "description": t.description}
        for t in final_threads
    ],
    "quarantined_items": [
        {"type": q.candidate_type, "chapter": q.chapter, "route": q.route, "confidence": q.confidence, "reason": q.ambiguity_reason, "payload": q.payload}
        for q in final_quarantine
    ]
}

results_json_path.write_text(json.dumps(audit_data, indent=2), encoding="utf-8")

print("\n================================================================================")
print("AUDIT EXECUTION COMPLETE!")
print(f"Total Time: {total_elapsed}s ({round(total_elapsed/60, 2)} min)")
print(f"Total API Calls: {len(call_telemetry)}")
print(f"Total Tokens: {grand_total_tokens:,} (Input: {total_input_tokens:,}, Output: {total_output_tokens:,})")
print(f"Average Tokens/Chapter: {grand_total_tokens // len(chapters):,}")
print(f"Knowledge Graph: {len(final_chars)} chars, {len(final_locs)} locs, {len(final_objs)} objs, {len(final_evs)} events, {len(final_claims)} claims")
print(f"Custody Transitions: {len(final_custody)}, Plot Threads: {len(final_threads)}, Issues: {len(final_issues)}")
print(f"Saved complete audit output to: {results_json_path}")
print("================================================================================")

db.close()
