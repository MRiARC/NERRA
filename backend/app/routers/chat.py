"""Story chat router wrapping the LangGraph Graph RAG agent."""

import uuid

from fastapi import APIRouter, Depends
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
    project=Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChatOut:
    """Answer a question about the story strictly grounded in passages, facts, and graph memory."""
    result = run_story_chat(project_id=project.id, question=payload.question)
    return ChatOut(**result)
