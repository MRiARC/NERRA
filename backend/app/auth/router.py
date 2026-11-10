"""Auth routes: POST /auth/register, POST /auth/login, GET /auth/me."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.security import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models import User
from app.schemas import RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: Session = Depends(get_db)) -> User:
    email_taken = db.query(User).filter(
        func.lower(User.email) == payload.email.lower()
    ).first()
    if email_taken is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        display_name=payload.display_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)  # pull server-generated fields (id, created_at)
    return user


@router.post("/login", response_model=TokenOut)
def login(
    form: OAuth2PasswordRequestForm = Depends(),  # username field = email
    db: Session = Depends(get_db),
) -> TokenOut:
    user = db.query(User).filter(func.lower(User.email) == form.username.lower()).first()
    if user is None or not verify_password(form.password, user.password_hash):
        # Same message for both cases — don't reveal which emails exist.
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    return TokenOut(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    """A protected route: works only with a valid Bearer token."""
    return user
