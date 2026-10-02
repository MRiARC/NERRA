"""Story chat — a thin HTTP wrapper around the LangGraph agent (Task 06).

The router's only jobs: validate ownership, call the agent, translate the
agent's structured result into a response. All intelligence lives in
app/agents/story_chat.py.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
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
    """Ask a question about the story: 'What color are Sarah's eyes?'
    'Where was the diary at the end of chapter 3?'

    Answers always include chapter citations. The agent (Task 06) is
    retrieval-grounded: it may only use passages and facts from this project.
    """
    try:
        result = run_story_chat(project_id=project.id, question=payload.question)
    except NotImplementedError as exc:
        raise HTTPException(status_code=501, detail=str(exc))
    return ChatOut(**result)
