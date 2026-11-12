"""Password hashing and JWT issuing — pure functions, no database access.

Why hashing matters: we never store passwords. `bcrypt.hashpw` stores a
one-way *hash*; on login we hash the incoming password again and check it
against the stored hash. Even we can't recover the original password.

Why JWT: instead of storing server-side sessions, the server hands the
client a signed token containing the user id + expiry. On every request the
client sends the token; the server verifies the signature (no DB lookup
needed to trust it) and loads the user.
"""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Response

from app.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False  # stored hash was malformed — treat as failed login


def generate_refresh_token() -> str:
    """Generate a high-entropy cryptographically secure refresh token string."""
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    """Hash the refresh token with SHA-256 for safe database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(user_id: uuid.UUID, session_id: uuid.UUID | None = None) -> str:
    """Sign a JWT containing user ID and optional active session ID."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
        "jti": secrets.token_hex(16),
    }
    if session_id is not None:
        payload["sid"] = str(session_id)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> tuple[uuid.UUID, uuid.UUID | None]:
    """Verify the signature + expiry and return (user_id, session_id)."""
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    user_id = uuid.UUID(payload["sub"])
    session_id = uuid.UUID(payload["sid"]) if payload.get("sid") else None
    return user_id, session_id


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str | None = None,
    refresh_expires_at: datetime | None = None,
) -> None:
    """Set secure, HttpOnly cookies for session access and refresh."""
    access_max_age = settings.access_token_expire_minutes * 60
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=access_max_age,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain,
        path="/",
    )
    if refresh_token is not None:
        if refresh_expires_at is not None:
            now = datetime.now(timezone.utc)
            refresh_max_age = max(0, int((refresh_expires_at - now).total_seconds()))
        else:
            refresh_max_age = settings.refresh_token_expire_days * 86400

        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            max_age=refresh_max_age,
            httponly=True,
            secure=settings.cookie_secure,
            samesite=settings.cookie_samesite,
            domain=settings.cookie_domain,
            path="/",
        )


def clear_auth_cookies(response: Response) -> None:
    """Clear access and refresh session cookies."""
    response.delete_cookie(
        key="access_token",
        domain=settings.cookie_domain,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )
    response.delete_cookie(
        key="refresh_token",
        domain=settings.cookie_domain,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )
