"""Auth routes: register, login, refresh (with recycling token rotation), logout, and session management."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_session_id, get_current_user
from app.auth.security import (
    clear_auth_cookies,
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    set_auth_cookies,
    verify_password,
)
from app.config import settings
from app.database import get_db
from app.models import User, UserSession
from app.schemas import RefreshIn, RegisterIn, SessionOut, TokenOut, UserOut

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
    request: Request,
    response: Response,
    form: OAuth2PasswordRequestForm = Depends(),  # username field = email
    db: Session = Depends(get_db),
) -> TokenOut:
    user = db.query(User).filter(func.lower(User.email) == form.username.lower()).first()
    if user is None or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    # Generate fresh cryptographically secure refresh token
    raw_refresh_token = generate_refresh_token()
    refresh_hash = hash_refresh_token(raw_refresh_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)

    user_agent = request.headers.get("user-agent")
    ip_addr = request.client.host if request.client else None

    # Create server-side session
    user_session = UserSession(
        user_id=user.id,
        refresh_token_hash=refresh_hash,
        user_agent=user_agent[:512] if user_agent else None,
        ip_address=ip_addr[:64] if ip_addr else None,
        expires_at=expires_at,
    )
    db.add(user_session)
    db.commit()
    db.refresh(user_session)

    # Issue short-lived access token bound to this session
    access_token = create_access_token(user.id, session_id=user_session.id)

    # Set secure HttpOnly cookies
    set_auth_cookies(response, access_token, raw_refresh_token, expires_at)

    return TokenOut(
        access_token=access_token,
        token_type="bearer",
        refresh_token=raw_refresh_token,
        session_id=str(user_session.id),
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/refresh", response_model=TokenOut)
def refresh(
    request: Request,
    response: Response,
    payload: RefreshIn | None = None,
    db: Session = Depends(get_db),
) -> TokenOut:
    """Recycle / rotate refresh token and issue a fresh short-lived access token."""
    raw_refresh = None
    if payload and payload.refresh_token:
        raw_refresh = payload.refresh_token.strip()
    if not raw_refresh:
        raw_refresh = request.cookies.get("refresh_token")

    if not raw_refresh:
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Missing refresh token")

    refresh_hash = hash_refresh_token(raw_refresh)
    user_session = db.query(UserSession).filter(
        UserSession.refresh_token_hash == refresh_hash
    ).first()

    now = datetime.now(timezone.utc)
    if not user_session or user_session.is_revoked:
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Session expired or revoked")

    sess_exp = user_session.expires_at
    if sess_exp.tzinfo is None:
        sess_exp = sess_exp.replace(tzinfo=timezone.utc)

    if sess_exp <= now:
        user_session.is_revoked = True
        db.commit()
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Session expired")

    # TOKEN ROTATION / RECYCLING:
    # 1. Invalidate old refresh token by rotating to a new secret token
    new_raw_refresh = generate_refresh_token()
    user_session.refresh_token_hash = hash_refresh_token(new_raw_refresh)
    user_session.last_active_at = now
    db.commit()

    # 2. Issue new access token
    new_access_token = create_access_token(user_session.user_id, session_id=user_session.id)

    # 3. Set updated cookies
    set_auth_cookies(response, new_access_token, new_raw_refresh, sess_exp)

    return TokenOut(
        access_token=new_access_token,
        token_type="bearer",
        refresh_token=new_raw_refresh,
        session_id=str(user_session.id),
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> dict:
    """Revoke current active session and clear authentication cookies."""
    sid = get_current_session_id(request)
    if sid is not None:
        user_session = db.get(UserSession, sid)
        if user_session is not None:
            user_session.is_revoked = True
            db.commit()
    else:
        # Fallback: check refresh_token cookie
        cookie_refresh = request.cookies.get("refresh_token")
        if cookie_refresh:
            tok_hash = hash_refresh_token(cookie_refresh)
            sess = db.query(UserSession).filter(UserSession.refresh_token_hash == tok_hash).first()
            if sess is not None:
                sess.is_revoked = True
                db.commit()

    clear_auth_cookies(response)
    return {"message": "Logged out successfully"}


@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SessionOut]:
    """List all active non-revoked sessions for the current authenticated user."""
    active_sid = get_current_session_id(request)
    now = datetime.now(timezone.utc)
    sessions = (
        db.query(UserSession)
        .filter(
            UserSession.user_id == user.id,
            UserSession.is_revoked == False,  # noqa: E712
            UserSession.expires_at > now,
        )
        .order_by(UserSession.last_active_at.desc())
        .all()
    )
    return [
        SessionOut(
            id=s.id,
            created_at=s.created_at,
            last_active_at=s.last_active_at,
            user_agent=s.user_agent,
            ip_address=s.ip_address,
            is_current=(active_sid is not None and s.id == active_sid),
        )
        for s in sessions
    ]


@router.post("/sessions/{session_id}/revoke")
def revoke_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Revoke a specific session belonging to the current user."""
    user_session = db.get(UserSession, session_id)
    if not user_session or user_session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    user_session.is_revoked = True
    db.commit()
    return {"message": f"Session {session_id} revoked"}


@router.post("/sessions/revoke-all")
def revoke_all_sessions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Revoke all sessions for the current user across all devices."""
    db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_revoked == False,  # noqa: E712
    ).update({"is_revoked": True})
    db.commit()
    return {"message": "All sessions revoked"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    """A protected route: works with Bearer token header or access_token cookie."""
    return user
