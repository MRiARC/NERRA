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
    scene_order: int = 1
    story_time_order: int = 1
    temporal_anchor: str | None = None
    is_flashback: bool = False
    is_flashforward: bool = False
    summary: str
    participants: list[str]
    location: str | None


class TimelineOut(BaseModel):
    order: str
    events: list[EventOut]
    characters: list[str]
    flashback_count: int
    flashforward_count: int
    spatiotemporal_conflict_chapters: list[int] = Field(default_factory=list)


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


class ObjectCustodyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    object_id: uuid.UUID
    chapter: int
    holder_type: str
    holder_name: str
    action: str
    evidence_quote: str | None = None


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
    source_character: str | None = None


class KnowledgeMatrixCellOut(BaseModel):
    character: str
    fact: str
    knows: bool
    since_chapter: int | None = None
    how_learned: str | None = None
    source_character: str | None = None
    propagated: bool = False


class KnowledgeMatrixOut(BaseModel):
    characters: list[str]
    facts: list[str]
    cells: list[KnowledgeMatrixCellOut]
    max_chapter: int = 1


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


class WorldRuleCreate(BaseModel):
    category: Literal["magic", "physics", "society", "setting"] = "setting"
    rule_text: str = Field(min_length=3, max_length=1000)
    source_chapter: int | None = None


class WorldRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category: str
    rule_text: str
    source_chapter: int | None
    is_author_defined: bool
    status: str


class IssueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    severity: str
    status: str
    description: str
    evidence: list[dict]
    confidence: float = 0.9
    ai_reasoning: str | None = None
    intent_classification: str = "error"
    related_entities: list[str] = Field(default_factory=list)
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
    intent: str = "general"
    graph_entities: list[str] = Field(default_factory=list)


class ManuscriptVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    manuscript_id: uuid.UUID
    version_number: int
    content_hash: str
    diff_summary: dict = Field(default_factory=dict)
    created_at: object


class BibleExportOut(BaseModel):
    project_title: str
    markdown: str
    generated_at: str
