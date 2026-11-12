"""User-level sovereign AI engine settings & API key overrides."""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models import User, UserSettings
from app.schemas import UserSettingsIn, UserSettingsOut

router = APIRouter(prefix="/settings", tags=["settings"])


def _mask_key(key: str | None) -> str | None:
    if not key:
        return None
    s = key.strip()
    if len(s) <= 8:
        return "sk-***"
    return s[:6] + "..." + s[-4:]


@router.get("/ai", response_model=UserSettingsOut)
def get_user_ai_settings(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserSettingsOut:
    """Get the authenticated author's sovereign AI keys and engine configuration."""
    row = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not row:
        return UserSettingsOut(
            anthropic_api_key_masked=None,
            has_api_key=False,
            anthropic_base_url=None,
            primary_model="claude-3-7-sonnet",
            embedding_model="text-embedding-3-large",
            max_hop_depth=2,
            extra_config={},
            updated_at=None,
        )

    return UserSettingsOut(
        anthropic_api_key_masked=_mask_key(row.anthropic_api_key),
        has_api_key=bool(row.anthropic_api_key and row.anthropic_api_key.strip()),
        anthropic_base_url=row.anthropic_base_url,
        primary_model=row.primary_model or "claude-3-7-sonnet",
        embedding_model=row.embedding_model or "text-embedding-3-large",
        max_hop_depth=row.max_hop_depth or 2,
        extra_config=row.extra_config or {},
        updated_at=row.updated_at,
    )


@router.put("/ai", response_model=UserSettingsOut)
def update_user_ai_settings(
    payload: UserSettingsIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserSettingsOut:
    """Save or update the author's sovereign API key and base URL."""
    row = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not row:
        row = UserSettings(user_id=user.id)
        db.add(row)

    # Only update the API key if a real unmasked key was provided
    if payload.anthropic_api_key is not None:
        raw_key = payload.anthropic_api_key.strip()
        if raw_key and "..." not in raw_key and "***" not in raw_key:
            row.anthropic_api_key = raw_key
        elif not raw_key:
            row.anthropic_api_key = None

    if payload.anthropic_base_url is not None:
        row.anthropic_base_url = payload.anthropic_base_url.strip() or None

    if payload.primary_model is not None:
        row.primary_model = payload.primary_model.strip() or None

    if payload.embedding_model is not None:
        row.embedding_model = payload.embedding_model.strip() or None

    if payload.max_hop_depth is not None:
        row.max_hop_depth = payload.max_hop_depth

    if payload.extra_config:
        row.extra_config = payload.extra_config

    db.commit()
    db.refresh(row)

    return UserSettingsOut(
        anthropic_api_key_masked=_mask_key(row.anthropic_api_key),
        has_api_key=bool(row.anthropic_api_key and row.anthropic_api_key.strip()),
        anthropic_base_url=row.anthropic_base_url,
        primary_model=row.primary_model or "claude-3-7-sonnet",
        embedding_model=row.embedding_model or "text-embedding-3-large",
        max_hop_depth=row.max_hop_depth or 2,
        extra_config=row.extra_config or {},
        updated_at=row.updated_at,
    )


@router.post("/ai/test")
def test_ai_connection(
    payload: UserSettingsIn | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Test Claude Sonnet connection with the author's resolved API key."""
    from app.services.extractor import get_anthropic_client, resolve_ai_credentials

    explicit_key = None
    explicit_base_url = None
    explicit_model = None

    if payload:
        if payload.anthropic_api_key and "..." not in payload.anthropic_api_key and "***" not in payload.anthropic_api_key:
            explicit_key = payload.anthropic_api_key.strip()
        if payload.anthropic_base_url:
            explicit_base_url = payload.anthropic_base_url.strip()
        if payload.primary_model:
            explicit_model = payload.primary_model.strip()

    creds = resolve_ai_credentials(
        db=db,
        user_id=user.id,
        explicit_api_key=explicit_key,
        explicit_base_url=explicit_base_url,
        explicit_model=explicit_model,
    )
    if not creds.get("api_key"):
        return {
            "status": "error",
            "message": "No Anthropic API key found. Please enter a key in Settings or backend/.env.",
        }

    try:
        client = get_anthropic_client(
            api_key=creds["api_key"],
            base_url=creds.get("base_url"),
        )
        # Fast lightweight ping message
        res = client.messages.create(
            model=creds.get("model") or "claude-3-5-sonnet-20241022",
            max_tokens=10,
            messages=[{"role": "user", "content": "ping"}],
        )
        return {
            "status": "ok",
            "message": f"Successfully authenticated with {creds.get('model') or 'Claude Sonnet'}!",
        }
    except Exception as exc:
        msg = str(exc)
        if "temporarily suspended" in msg.lower() or "kiro" in msg.lower():
            clean_msg = "Upstream AWS/Kiro proxy error: Your User ID is temporarily suspended by AWS security."
        elif "401" in msg or "unauthorized" in msg.lower():
            clean_msg = "Authentication failed (HTTP 401: Unauthorized): Endpoint or proxy rejected key."
        else:
            clean_msg = f"Connection failed: {msg[:180]}"
        return {
            "status": "error",
            "message": clean_msg,
            "raw_error": msg,
        }
