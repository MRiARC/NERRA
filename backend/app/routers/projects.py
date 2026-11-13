"""Project CRUD routes.

Ownership rule: users only ever see and touch their own projects via
`Depends(get_owned_project)`, which returns the Project or raises 404.
"""

import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_owned_project
from app.database import get_db
from app.models import (
    Character,
    Claim,
    Issue,
    Location,
    Manuscript,
    Project,
    StoryEvent,
    StoryObject,
    User,
)
from app.schemas import ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


def _enrich_project(project: Project, db: Session) -> ProjectOut:
    """Enrich a project with live calculated story telemetry in one shot."""
    latest_m = (
        db.query(Manuscript)
        .filter(Manuscript.project_id == project.id)
        .order_by(Manuscript.created_at.desc())
        .first()
    )
    word_count = len(latest_m.raw_text.split()) if (latest_m and latest_m.raw_text) else 0
    chapter_count = latest_m.chapters_total if latest_m else 0
    status_str = latest_m.status if latest_m else "draft"
    open_issues = (
        db.query(Issue)
        .filter(Issue.project_id == project.id, Issue.status == "open")
        .count()
    )
    char_count = db.query(Character).filter(Character.project_id == project.id).count()
    loc_count = db.query(Location).filter(Location.project_id == project.id).count()
    obj_count = db.query(StoryObject).filter(StoryObject.project_id == project.id).count()
    event_count = db.query(StoryEvent).filter(StoryEvent.project_id == project.id).count()
    claim_count = db.query(Claim).filter(Claim.project_id == project.id).count()

    return ProjectOut(
        id=project.id,
        owner_id=project.owner_id,
        title=project.title,
        genre=project.genre,
        created_at=project.created_at,
        word_count=word_count,
        chapter_count=chapter_count,
        open_issue_count=open_issues,
        status=status_str,
        character_count=char_count,
        location_count=loc_count,
        object_count=obj_count,
        event_count=event_count,
        claim_count=claim_count,
    )


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectOut:
    """Create a new story project owned by the current user."""
    project = Project(
        owner_id=user.id,
        title=payload.title,
        genre=payload.genre,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _enrich_project(project, db)


@router.get("", response_model=list[ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ProjectOut]:
    """List all projects owned by the current user with live story telemetry."""
    projects = (
        db.query(Project)
        .filter(Project.owner_id == user.id)
        .order_by(Project.created_at.desc())
        .all()
    )
    return [_enrich_project(p, db) for p in projects]


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project: Project = Depends(get_owned_project),
    db: Session = Depends(get_db),
) -> ProjectOut:
    """Fetch one project with complete live telemetry."""
    return _enrich_project(project, db)


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    payload: ProjectUpdate,
    project: Project = Depends(get_owned_project),
    db: Session = Depends(get_db),
) -> ProjectOut:
    """Update title and/or genre."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return _enrich_project(project, db)



@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project: Project = Depends(get_owned_project),
    db: Session = Depends(get_db),
) -> Response:
    """Delete the project and all cascaded children."""
    db.delete(project)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
