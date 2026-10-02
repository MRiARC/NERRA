"""Password hashing and JWT issuing — pure functions, no database access.

Why hashing matters: we never store passwords. `bcrypt.hashpw` stores a
one-way *hash*; on login we hash the incoming password again and check it
against the stored hash. Even we can't recover the original password.

Why JWT: instead of storing server-side sessions, the server hands the
client a signed token containing the user id + expiry. On every request the
client sends the token; the server verifies the signature (no DB lookup
needed to trust it) and loads the user.
"""

import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False  # stored hash was malformed — treat as failed login


def create_access_token(user_id: uuid.UUID) -> str:
    """Sign a JWT that says 'this is user X' and expires after N minutes."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),  # 'subject' — who the token belongs to
        "iat": now,           # issued at
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> uuid.UUID:
    """Verify the signature + expiry and return the user id.

    Raises jwt.PyJWTError subclasses on tampered/expired tokens — callers
    turn those into 401s (see dependencies.py).
    """
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    return uuid.UUID(payload["sub"])
