"""Project CRUD routes.

Ownership rule: users only ever see and touch their own projects via
`Depends(get_owned_project)`, which returns the Project or raises 404.
"""

import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_owned_project
from app.database import get_db
from app.models import Project, User
from app.schemas import ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Project:
    """Create a new story project owned by the current user."""
    project = Project(
        owner_id=user.id,
        title=payload.title,
        genre=payload.genre,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("", response_model=list[ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Project]:
    """List all projects owned by the current user (newest first)."""
    return (
        db.query(Project)
        .filter(Project.owner_id == user.id)
        .order_by(Project.created_at.desc())
        .all()
    )


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project: Project = Depends(get_owned_project),
) -> Project:
    """Fetch one project. Ownership is already checked by the dependency."""
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    payload: ProjectUpdate,
    project: Project = Depends(get_owned_project),
    db: Session = Depends(get_db),
) -> Project:
    """Update title and/or genre."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project: Project = Depends(get_owned_project),
    db: Session = Depends(get_db),
) -> Response:
    """Delete the project and all cascaded children."""
    db.delete(project)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
