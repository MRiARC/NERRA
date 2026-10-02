"""Projects CRUD — YOUR first feature (Task 01).

Read app/auth/router.py first: this file follows the exact same pattern, but
the bodies are yours to write. Every endpoint is already declared — path,
validation, auth dependency, and response schema are done. You fill in the
function bodies, roughly 3–6 lines each.

Ownership rule (applies to every endpoint below): users only ever see and
touch their OWN projects. `Depends(get_owned_project)` handles that for the
/{project_id} routes — it returns the Project or raises 404.
"""

import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_owned_project
from app.database import get_db
from app.errors import not_implemented
from app.models import Project, User
from app.schemas import ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Project:
    """Create a new story project owned by the current user.

    Steps:
      1. Build a Project(owner_id=user.id, title=..., genre=...).
      2. db.add(project) -> db.commit() -> db.refresh(project).
      3. Return it (FastAPI serializes it with ProjectOut).
    """
    # ========== YOUR CODE HERE (Task 01) ==========
    raise not_implemented("01-projects-crud")


@router.get("", response_model=list[ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Project]:
    """List all projects owned by the current user (newest first).

    Hint: db.query(Project).filter(Project.owner_id == user.id)
          .order_by(Project.created_at.desc()).all()
    """
    # ========== YOUR CODE HERE (Task 01) ==========
    raise not_implemented("01-projects-crud")


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project: Project = Depends(get_owned_project),
) -> Project:
    """Fetch one project. Ownership is already checked by the dependency —
    if you got here, the project exists and is yours."""
    # ========== YOUR CODE HERE (Task 01) ==========
    raise not_implemented("01-projects-crud")


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    payload: ProjectUpdate,
    project: Project = Depends(get_owned_project),
    db: Session = Depends(get_db),
) -> Project:
    """Update title and/or genre. Only set the fields the client sent —
    `payload.model_dump(exclude_unset=True)` gives you exactly those."""
    # ========== YOUR CODE HERE (Task 01) ==========
    raise not_implemented("01-projects-crud")


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project: Project = Depends(get_owned_project),
    db: Session = Depends(get_db),
) -> Response:
    """Delete the project (and, thanks to ON DELETE CASCADE, all its
    manuscripts, characters, issues... — check the ForeignKeys in models.py).
    Return an empty body with status 204."""
    # ========== YOUR CODE HERE (Task 01) ==========
    raise not_implemented("01-projects-crud")
