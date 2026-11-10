"""Story-world read views — also part of Task 01.

These endpoints read what the AI pipeline (Tasks 03–05) will have written
into the story tables: characters, relationships, events (timeline), world
(locations + objects), knowledge states, and issues.

They are all the SAME exercise: filter rows by project_id, return them.
Do them right after the projects CRUD — the repetition is how the pattern
sticks. One new idea per endpoint is marked in its docstring.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_owned_project
from app.database import get_db
from app.models import (
    Character,
    Claim,
    Issue,
    KnowledgeUpdate,
    Location,
    ObjectCustodyEvent,
    Relationship,
    StoryEvent,
    StoryObject,
    User,
)
from app.schemas import (
    CharacterMergeIn,
    CharacterOut,
    ClaimOut,
    EventOut,
    IssueOut,
    IssuePatchIn,
    IssueStatus,
    KnowledgeMatrixOut,
    KnowledgeOut,
    ObjectCustodyOut,
    RelationshipOut,
    StoryGraphOut,
    TimelineOut,
    WorldOut,
)
from app.services import graph, knowledge, timeline

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
