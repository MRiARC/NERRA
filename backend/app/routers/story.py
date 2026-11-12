"""Story-world read & analysis views (characters, graph, timeline, knowledge, world rules, issues, export)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_owned_project
from app.database import get_db
from app.models import (
    Character,
    Claim,
    Issue,
    KnowledgeUpdate,
    Location,
    ManuscriptVersion,
    ObjectCustodyEvent,
    Relationship,
    StoryEvent,
    StoryObject,
    User,
    ValidationCandidate,
    WorldRule,
)
from app.schemas import (
    BibleExportOut,
    CandidateResolveIn,
    CharacterMergeIn,
    CharacterOut,
    CharacterRenameIn,
    CharacterSplitIn,
    ClaimOut,
    ClaimPatchIn,
    CorrectionRuleOut,
    EventOut,
    FeedbackActionOut,
    IssueOut,
    IssuePatchIn,
    IssueStatus,
    KnowledgeMatrixOut,
    KnowledgeOut,
    ManuscriptVersionOut,
    ObjectCustodyOut,
    PlotThreadCreate,
    PlotThreadOut,
    PlotThreadPatch,
    ProjectCustomizationIn,
    ProjectCustomizationOut,
    RelationshipOut,
    StoryGraphOut,
    TimelineOut,
    ValidationCandidateOut,
    WorldOut,
    WorldRuleCreate,
    WorldRuleOut,
)
from app.services import consistency, exporter, feedback, graph, knowledge, plot_threads, timeline, validator

router = APIRouter(tags=["story"])


@router.get("/projects/{project_id}/characters", response_model=list[CharacterOut])
def list_characters(
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list:
    """All characters in the project, ordered by first appearance."""
    return (
        db.query(Character)
        .filter(Character.project_id == project.id)
        .order_by(Character.first_chapter.asc().nulls_last())
        .all()
    )


@router.get("/projects/{project_id}/characters/{character_id}", response_model=CharacterOut)
def get_character(
    project_id: uuid.UUID,
    character_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> object:
    """One character verified to belong to this project."""
    character = db.get(Character, character_id)
    if character is None or character.project_id != project.id:
        raise HTTPException(status_code=404, detail="Character not found")
    return character


@router.post("/projects/{project_id}/characters/merge", response_model=CharacterOut)
def merge_characters(
    project_id: uuid.UUID,
    payload: CharacterMergeIn,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Character:
    """Human-in-the-loop: Merge duplicate character into target character.

    Combines aliases, traits, re-links claims & relationships, and removes the duplicate.
    """
    target = db.get(Character, payload.target_character_id)
    dup = db.get(Character, payload.duplicate_character_id)
    if not target or target.project_id != project.id:
        raise HTTPException(status_code=404, detail="Target character not found")
    if not dup or dup.project_id != project.id:
        raise HTTPException(status_code=404, detail="Duplicate character not found")
    if target.id == dup.id:
        return target

    # Merge aliases (include duplicate's canonical name as an alias if distinct)
    all_aliases = set(target.aliases or []) | set(dup.aliases or [])
    if dup.name.lower() != target.name.lower():
        all_aliases.add(dup.name)
    target.aliases = sorted(list(all_aliases))

    # Merge physical traits
    traits = dict(target.physical_traits or {})
    for k, v in (dup.physical_traits or {}).items():
        if k not in traits:
            traits[k] = v
    target.physical_traits = traits

    # Widen chapter appearances
    if dup.first_chapter is not None:
        if target.first_chapter is None or dup.first_chapter < target.first_chapter:
            target.first_chapter = dup.first_chapter
    if dup.last_chapter is not None:
        if target.last_chapter is None or dup.last_chapter > target.last_chapter:
            target.last_chapter = dup.last_chapter

    # Re-link claims referencing dup.name
    claims = db.query(Claim).filter(
        Claim.project_id == project.id,
        Claim.subject.ilike(dup.name),
    ).all()
    for c in claims:
        c.subject = target.name

    # Re-link relationships
    db.query(Relationship).filter(Relationship.character_a_id == dup.id).update({"character_a_id": target.id})
    db.query(Relationship).filter(Relationship.character_b_id == dup.id).update({"character_b_id": target.id})

    # Delete duplicate
    db.delete(dup)
    db.commit()
    db.refresh(target)
    try:
        graph.sync_project_graph(db, project.id)
    except Exception:  # noqa: BLE001
        pass
    return target


@router.get("/projects/{project_id}/graph", response_model=StoryGraphOut)
def get_project_story_graph(
    project_id: uuid.UUID,
    chapter: int | None = None,
    refresh: bool = False,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StoryGraphOut:
    """Return the project's Story Knowledge Graph (Neo4j Cypher backed with SQL fallback)."""
    data = graph.get_project_graph(db, project.id, max_chapter=chapter, force_sync=refresh)
    return StoryGraphOut(**data)


@router.get("/projects/{project_id}/relationships", response_model=list[RelationshipOut])
def list_relationships(
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list:
    """All relationships in the project."""
    return db.query(Relationship).filter(Relationship.project_id == project.id).all()


@router.get("/projects/{project_id}/events", response_model=list[EventOut])
def list_events(
    project_id: uuid.UUID,
    character: str | None = None,  # optional query param: ?character=Sarah
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list:
    """The timeline: events ordered by chapter. Optional ?character= filter."""
    events = (
        db.query(StoryEvent)
        .filter(StoryEvent.project_id == project.id)
        .order_by(StoryEvent.chapter_number.asc())
        .all()
    )
    if character is not None:
        target = character.strip().lower()
        events = [
            e for e in events
            if any(target == p.strip().lower() for p in (e.participants or []))
        ]
    return events


@router.get("/projects/{project_id}/timeline", response_model=TimelineOut)
def get_project_timeline(
    project_id: uuid.UUID,
    order: str = "chronological",
    character: str | None = None,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TimelineOut:
    """Dual Timeline Engine (Milestone 2.2): chronological vs narrative order."""
    timeline.compute_story_chronology(db, project.id)
    data = timeline.get_project_timeline(db, project.id, order=order, character=character)
    return TimelineOut(**data)


@router.get("/projects/{project_id}/world", response_model=WorldOut)
def get_world(
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> WorldOut:
    """Locations + objects in one response."""
    locations = db.query(Location).filter(Location.project_id == project.id).all()
    objects = db.query(StoryObject).filter(StoryObject.project_id == project.id).all()
    return WorldOut(locations=locations, objects=objects)


@router.get("/projects/{project_id}/objects/{object_id}/custody", response_model=list[ObjectCustodyOut])
def get_object_custody(
    project_id: uuid.UUID,
    object_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list:
    """Chain-of-custody transfers for a specific story object."""
    obj = db.get(StoryObject, object_id)
    if obj is None or obj.project_id != project.id:
        raise HTTPException(status_code=404, detail="Object not found")
    return (
        db.query(ObjectCustodyEvent)
        .filter(
            ObjectCustodyEvent.project_id == project.id,
            ObjectCustodyEvent.object_id == object_id,
        )
        .order_by(ObjectCustodyEvent.chapter.asc(), ObjectCustodyEvent.created_at.asc())
        .all()
    )


@router.get("/projects/{project_id}/knowledge-matrix", response_model=KnowledgeMatrixOut)
def get_knowledge_matrix(
    project_id: uuid.UUID,
    chapter: int | None = None,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> KnowledgeMatrixOut:
    """Epistemic Knowledge Matrix (Characters x Key Facts, with multi-hop propagation)."""
    data = knowledge.build_knowledge_matrix(db, project.id, up_to_chapter=chapter)
    return KnowledgeMatrixOut(**data)


@router.get("/projects/{project_id}/knowledge", response_model=list[KnowledgeOut])
def list_knowledge(
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list:
    """Knowledge updates, ordered by chapter."""
    return (
        db.query(KnowledgeUpdate)
        .filter(KnowledgeUpdate.project_id == project.id)
        .order_by(KnowledgeUpdate.chapter.asc())
        .all()
    )


@router.get("/projects/{project_id}/claims", response_model=list[ClaimOut])
def list_claims(
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list:
    """All extracted claims with verbatim quote provenance, ordered by chapter."""
    return (
        db.query(Claim)
        .filter(Claim.project_id == project.id)
        .order_by(Claim.chapter.asc())
        .all()
    )


@router.get("/projects/{project_id}/issues", response_model=list[IssueOut])
def list_issues(
    project_id: uuid.UUID,
    status_filter: IssueStatus | None = None,  # ?status_filter=open
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list:
    """The consistency checker's output. Optional ?status_filter= filter. Ordered red first."""
    query = db.query(Issue).filter(Issue.project_id == project.id)
    if status_filter is not None:
        query = query.filter(Issue.status == status_filter)
    issues = query.all()
    severity_order = {"red": 0, "yellow": 1, "green": 2, "blue": 3}
    return sorted(issues, key=lambda i: severity_order.get(i.severity, 99))


@router.patch("/projects/{project_id}/issues/{issue_id}", response_model=IssueOut)
def update_issue(
    project_id: uuid.UUID,
    issue_id: uuid.UUID,
    payload: IssuePatchIn,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> object:
    """Accept / reject / mark an issue intentional — author is the final authority."""
    issue = db.get(Issue, issue_id)
    if issue is None or issue.project_id != project.id:
        raise HTTPException(status_code=404, detail="Issue not found")
    issue.status = payload.status
    db.commit()
    db.refresh(issue)
    return issue


@router.post("/projects/{project_id}/issues/{issue_id}/reason", response_model=IssueOut)
def reason_about_issue(
    project_id: uuid.UUID,
    issue_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Issue:
    """Run the LangGraph Contradiction Intent Reasoner on an open issue."""
    from app.agents import contradiction_reasoner

    issue = db.get(Issue, issue_id)
    if issue is None or issue.project_id != project.id:
        raise HTTPException(status_code=404, detail="Issue not found")
    return contradiction_reasoner.evaluate_issue_in_db(db, issue, use_llm=True)


@router.get("/projects/{project_id}/world-rules", response_model=list[WorldRuleOut])
def list_world_rules(
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list:
    """List all active/deprecated world rules for a project."""
    return (
        db.query(WorldRule)
        .filter(WorldRule.project_id == project.id)
        .order_by(WorldRule.created_at.desc())
        .all()
    )


@router.post("/projects/{project_id}/world-rules", response_model=WorldRuleOut, status_code=201)
def create_world_rule(
    project_id: uuid.UUID,
    payload: WorldRuleCreate,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> WorldRule:
    """Add an author-defined world constraint and re-evaluate consistency rules."""
    rule = WorldRule(
        project_id=project.id,
        category=payload.category,
        rule_text=payload.rule_text.strip(),
        source_chapter=payload.source_chapter,
        is_author_defined=True,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    consistency.run_consistency_pass(db, project.id)
    return rule


@router.delete("/projects/{project_id}/world-rules/{rule_id}", status_code=204)
def delete_world_rule(
    project_id: uuid.UUID,
    rule_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    """Delete a world rule."""
    rule = db.get(WorldRule, rule_id)
    if rule is None or rule.project_id != project.id:
        raise HTTPException(status_code=404, detail="World rule not found")
    db.delete(rule)
    db.commit()


@router.get("/projects/{project_id}/versions", response_model=list[ManuscriptVersionOut])
def list_versions(
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list:
    """Draft snapshots and diff summaries across manuscript uploads."""
    return (
        db.query(ManuscriptVersion)
        .filter(ManuscriptVersion.project_id == project.id)
        .order_by(ManuscriptVersion.version_number.desc())
        .all()
    )


@router.get("/projects/{project_id}/export/bible", response_model=BibleExportOut)
def export_story_bible(
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Compile and return the full project Story Bible in Markdown."""
    return exporter.export_story_bible_markdown(db, project.id)


@router.get("/projects/{project_id}/candidates", response_model=list[ValidationCandidateOut])
def list_candidates(
    project_id: uuid.UUID,
    status: str | None = None,
    route: str | None = None,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list:
    """List pre-graph staged validation candidates (human_review and reject_hold)."""
    query = db.query(ValidationCandidate).filter(ValidationCandidate.project_id == project.id)
    if status:
        query = query.filter(ValidationCandidate.status == status)
    if route:
        query = query.filter(ValidationCandidate.route == route)
    return query.order_by(ValidationCandidate.chapter.asc(), ValidationCandidate.created_at.desc()).all()


@router.post("/projects/{project_id}/candidates/{candidate_id}/resolve", response_model=ValidationCandidateOut)
def resolve_validation_candidate(
    project_id: uuid.UUID,
    candidate_id: uuid.UUID,
    payload: CandidateResolveIn,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Approve, reject, merge, or split a staged pre-graph validation candidate."""
    try:
        return validator.resolve_candidate(
            db,
            project.id,
            candidate_id,
            action=payload.action,
            target_character_id=payload.target_character_id,
            split_name=payload.split_name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.patch("/projects/{project_id}/claims/{claim_id}", response_model=FeedbackActionOut)
def patch_claim_feedback(
    project_id: uuid.UUID,
    claim_id: uuid.UUID,
    payload: ClaimPatchIn,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Inline-edit a Claim and record an Author CorrectionRule + downstream re-audit."""
    try:
        return feedback.override_claim(
            db,
            project.id,
            claim_id,
            value=payload.value,
            attribute=payload.attribute,
            subject=payload.subject,
            status=payload.status,
            reason=payload.reason,
            re_audit=payload.re_audit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/projects/{project_id}/characters/{character_id}/rename", response_model=FeedbackActionOut)
def rename_character_feedback(
    project_id: uuid.UUID,
    character_id: uuid.UUID,
    payload: CharacterRenameIn,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Rename a character preserving UUID, record a CorrectionRule, and re-audit downstream."""
    try:
        return feedback.rename_character_with_feedback(
            db,
            project.id,
            character_id,
            payload.new_name,
            re_audit=payload.re_audit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/projects/{project_id}/characters/{character_id}/split", response_model=FeedbackActionOut)
def split_character_feedback(
    project_id: uuid.UUID,
    character_id: uuid.UUID,
    payload: CharacterSplitIn,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Split a conflated alias off a character into its own canonical Character + CorrectionRule."""
    try:
        return feedback.split_character_alias(
            db,
            project.id,
            character_id,
            payload.alias_to_split,
            new_character_name=payload.new_character_name,
            re_audit=payload.re_audit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/projects/{project_id}/corrections", response_model=list[CorrectionRuleOut])
def get_correction_rules(
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List active author correction directives for this project."""
    return feedback.list_corrections(db, project.id)


@router.delete(
    "/projects/{project_id}/corrections/{correction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_correction_rule(
    project_id: uuid.UUID,
    correction_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Deactivate an author correction rule."""
    try:
        feedback.deactivate_correction(db, project.id, correction_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/projects/{project_id}/plot-threads", response_model=list[PlotThreadOut])
def get_plot_threads(
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List tracked cross-chapter plot threads, mysteries, and payoffs."""
    return plot_threads.list_plot_threads(db, project.id)


@router.post(
    "/projects/{project_id}/plot-threads",
    response_model=PlotThreadOut,
    status_code=status.HTTP_201_CREATED,
)
def create_plot_thread_endpoint(
    project_id: uuid.UUID,
    payload: PlotThreadCreate,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create or update a plot thread manually."""
    return plot_threads.create_plot_thread(db, project.id, payload.model_dump())


@router.patch("/projects/{project_id}/plot-threads/{thread_id}", response_model=PlotThreadOut)
def patch_plot_thread_endpoint(
    project_id: uuid.UUID,
    thread_id: uuid.UUID,
    payload: PlotThreadPatch,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a plot thread status, payoff chapter, description, or entities."""
    try:
        return plot_threads.patch_plot_thread(
            db, project.id, thread_id, payload.model_dump(exclude_unset=True)
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/projects/{project_id}/plot-threads/sync", response_model=list[PlotThreadOut])
def sync_plot_threads_endpoint(
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Run Claude Sonnet cross-chapter synthesis to refresh all plot threads."""
    return plot_threads.synthesize_all_plot_threads_llm(db, project.id, use_llm=True)


@router.get("/projects/{project_id}/customization", response_model=ProjectCustomizationOut)
def get_project_customization(
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return the project's 5 Feature Customization hooks."""
    return plot_threads.get_customization(db, project.id)


@router.put("/projects/{project_id}/customization", response_model=ProjectCustomizationOut)
def put_project_customization(
    project_id: uuid.UUID,
    payload: ProjectCustomizationIn,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update the project's 5 Feature Customization hooks."""
    return plot_threads.upsert_customization(db, project.id, payload.model_dump())
