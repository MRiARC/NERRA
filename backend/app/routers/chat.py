"""Story chat router wrapping the LangGraph Graph RAG agent."""

import uuid

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.agents.story_chat import run_story_chat
from app.auth.dependencies import get_current_user, get_owned_project
from app.database import get_db
from app.models import User
from app.schemas import ChatIn, ChatOut

router = APIRouter(tags=["chat"])


@router.post("/projects/{project_id}/chat", response_model=ChatOut)
def chat(
    project_id: uuid.UUID,
    payload: ChatIn,
    x_anthropic_key: str | None = Header(default=None, alias="X-Anthropic-Key"),
    x_anthropic_base_url: str | None = Header(default=None, alias="X-Anthropic-Base-Url"),
    x_primary_model: str | None = Header(default=None, alias="X-Primary-Model"),
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChatOut:
    """Answer a question about the story strictly grounded in passages, facts, and graph memory."""
    result = run_story_chat(
        project_id=project.id,
        question=payload.question,
        api_key=x_anthropic_key,
        base_url=x_anthropic_base_url,
        model=x_primary_model,
        user_id=user.id,
    )
    return ChatOut(**result)
