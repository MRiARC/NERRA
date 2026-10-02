"""Dependencies — how routes say 'only authenticated users may enter'.

`Depends(get_current_user)` in a route signature does three things:
1. Extract the `Authorization: Bearer <token>` header (oauth2_scheme).
2. Verify/decode the JWT.
3. Load the User row and hand it to your route — or answer 401 first.

Routes never see tokens or passwords; they just receive a `User`.

`get_owned_project` is the same idea for projects: it returns the project
only if it belongs to the current user, else 404 (we say 'not found' rather
than 403 so we don't leak that someone else's project exists).
"""

import uuid

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.auth.security import decode_access_token
from app.database import get_db
from app.models import Project, User

# tokenUrl points at the login route so Swagger's 'Authorize' button works.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        user_id = decode_access_token(token)
    except jwt.PyJWTError:
        raise credentials_error
    user = db.get(User, user_id)
    if user is None:
        raise credentials_error
    return user


def get_owned_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
