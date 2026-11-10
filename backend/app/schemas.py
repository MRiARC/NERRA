"""Pydantic schemas — the shape of API requests and responses.

Two jobs:
1. **Validate incoming data** — a request that doesn't match an `*In` schema
   is rejected with a 422 before your code ever runs.
2. **Guarantee outgoing shape** — an `*Out` schema filters exactly which
   fields leave the API (e.g. we never expose `password_hash`).
"""

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="At least 8 characters")
    display_name: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    display_name: str | None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------


class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    genre: str | None = None


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    genre: str | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    genre: str | None
    created_at: object  # datetime — loosely typed to keep the schema simple


# ---------------------------------------------------------------------------
# Manuscripts (import / pipeline status)
# ---------------------------------------------------------------------------


class ImportOut(BaseModel):
    manuscript_id: uuid.UUID
    project_id: uuid.UUID
    status: str


class StatusOut(BaseModel):
    manuscript_id: uuid.UUID
    status: str
    chapters_done: int
    chapters_total: int
    error_note: str | None


# ---------------------------------------------------------------------------
# Story world (read views)
# ---------------------------------------------------------------------------


class CharacterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    aliases: list[str]
    description: str | None
    status: str
    physical_traits: dict = Field(default_factory=dict)
    first_chapter: int | None
    last_chapter: int | None


class CharacterMergeIn(BaseModel):
    target_character_id: uuid.UUID
    duplicate_character_id: uuid.UUID


class RelationshipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    character_a_id: uuid.UUID
    character_b_id: uuid.UUID
    type: str
    sentiment: str = "neutral"
    description: str | None
    evidence_quote: str | None = None
    chapter: int | None
    until_chapter: int | None = None


class GraphNodeOut(BaseModel):
    id: str
    label: str
    kind: str  # character | location | object | event
    chapter: int | None = None
    metadata: dict = Field(default_factory=dict)


class GraphEdgeOut(BaseModel):
    id: str
    source: str
    target: str
    relation: str
    sentiment: str = "neutral"
    since_chapter: int | None = None
    until_chapter: int | None = None
    description: str | None = None


class StoryGraphOut(BaseModel):
    nodes: list[GraphNodeOut]
    edges: list[GraphEdgeOut]
    neo4j_connected: bool
    max_chapter: int = 1


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chapter_number: int
    summary: str
    participants: list[str]
    location: str | None


class LocationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    first_chapter: int | None


class ObjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    first_chapter: int | None
    mention_chapters: list[int]


class WorldOut(BaseModel):
    locations: list[LocationOut]
    objects: list[ObjectOut]


class KnowledgeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    character: str
    fact: str
    chapter: int
    how_learned: str


class ClaimOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    subject: str
    attribute: str
    value: str
    chapter: int
    evidence_quote: str
    confidence: float
    validation_state: str
    status: str


class IssueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    severity: str
    status: str
    description: str
    evidence: list[dict]
    claim_a_id: uuid.UUID | None
    claim_b_id: uuid.UUID | None


IssueStatus = Literal["open", "accepted", "rejected", "intentional"]


class IssuePatchIn(BaseModel):
    status: IssueStatus


# ---------------------------------------------------------------------------
# Story chat
# ---------------------------------------------------------------------------


class ChatIn(BaseModel):
    question: str = Field(min_length=3, max_length=2000)


class Citation(BaseModel):
    chapter: int
    excerpt: str


class ChatOut(BaseModel):
    answer: str
    citations: list[Citation]
