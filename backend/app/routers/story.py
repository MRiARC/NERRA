"""Story-world read views — also part of Task 01.

These endpoints read what the AI pipeline (Tasks 03–05) will have written
into the story tables: characters, relationships, events (timeline), world
(locations + objects), knowledge states, and issues.

They are all the SAME exercise: filter rows by project_id, return them.
Do them right after the projects CRUD — the repetition is how the pattern
sticks. One new idea per endpoint is marked in its docstring.
"""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_owned_project
from app.database import get_db
from app.errors import not_implemented
from app.models import User
from app.schemas import (
    CharacterOut,
    EventOut,
    IssueOut,
    IssuePatchIn,
    IssueStatus,
    KnowledgeOut,
    RelationshipOut,
    WorldOut,
)

router = APIRouter(tags=["story"])


@router.get("/projects/{project_id}/characters", response_model=list[CharacterOut])
def list_characters(
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list:
    """All characters in the project, ordered by first appearance.

    New idea: ordering by a nullable column — put NULLs last with
    .order_by(Character.first_chapter.asc().nulls_last()).
    """
    # ========== YOUR CODE HERE (Task 01) ==========
    raise not_implemented("01-projects-crud")


@router.get("/projects/{project_id}/characters/{character_id}", response_model=CharacterOut)
def get_character(
    project_id: uuid.UUID,
    character_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> object:
    """One character. New idea: check BOTH conditions — the character must
    exist AND belong to this project (db.get(Character, character_id),
    then verify .project_id == project.id, else 404)."""
    # ========== YOUR CODE HERE (Task 01) ==========
    raise not_implemented("01-projects-crud")


@router.get("/projects/{project_id}/relationships", response_model=list[RelationshipOut])
def list_relationships(
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list:
    """All relationships. Same pattern as characters — just a filtered query."""
    # ========== YOUR CODE HERE (Task 01) ==========
    raise not_implemented("01-projects-crud")


@router.get("/projects/{project_id}/events", response_model=list[EventOut])
def list_events(
    project_id: uuid.UUID,
    character: str | None = None,  # optional query param: ?character=Sarah
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list:
    """The timeline: events ordered by chapter. Optional ?character= filter
    keeps only events where `character` appears in `participants` (a JSONB
    list) — filtering the rows in Python after the query is fine at MVP scale."""
    # ========== YOUR CODE HERE (Task 01) ==========
    raise not_implemented("01-projects-crud")


@router.get("/projects/{project_id}/world", response_model=WorldOut)
def get_world(
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> WorldOut:
    """Locations + objects in one response. New idea: build a response that
    is NOT a single table — query two tables and wrap them in WorldOut."""
    # ========== YOUR CODE HERE (Task 01) ==========
    raise not_implemented("01-projects-crud")


@router.get("/projects/{project_id}/knowledge", response_model=list[KnowledgeOut])
def list_knowledge(
    project_id: uuid.UUID,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list:
    """Knowledge updates, ordered by chapter — 'who learned what, when'."""
    # ========== YOUR CODE HERE (Task 01) ==========
    raise not_implemented("01-projects-crud")


@router.get("/projects/{project_id}/issues", response_model=list[IssueOut])
def list_issues(
    project_id: uuid.UUID,
    status_filter: IssueStatus | None = None,  # ?status_filter=open
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list:
    """The consistency checker's output (produced in Task 05). Optional
    ?status_filter= to see only open issues. Ordered: red first — try
    ordering in Python by severity, or keep DB order for the MVP."""
    # ========== YOUR CODE HERE (Task 01) ==========
    raise not_implemented("01-projects-crud")


@router.patch("/projects/{project_id}/issues/{issue_id}", response_model=IssueOut)
def update_issue(
    project_id: uuid.UUID,
    issue_id: uuid.UUID,
    payload: IssuePatchIn,
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> object:
    """Accept / reject / mark an issue intentional — the author is the final
    authority (a core NERRA design principle). New idea: update one field
    from the payload, commit, return the refreshed row."""
    # ========== YOUR CODE HERE (Task 01) ==========
    raise not_implemented("01-projects-crud")
