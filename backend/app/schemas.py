"""Pydantic schemas — the shape of API requests and responses.

Two jobs:
1. **Validate incoming data** — a request that doesn't match an `*In` schema
   is rejected with a 422 before your code ever runs.
2. **Guarantee outgoing shape** — an `*Out` schema filters exactly which
   fields leave the API (e.g. we never expose `password_hash`).
"""

import uuid
from datetime import datetime
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
    refresh_token: str | None = None
    session_id: str | None = None
    expires_in: int | None = None


class RefreshIn(BaseModel):
    refresh_token: str | None = None


class SessionOut(BaseModel):
    id: uuid.UUID
    created_at: datetime
    last_active_at: datetime
    user_agent: str | None = None
    ip_address: str | None = None
    is_current: bool = False


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
    genre: str | None = None
    created_at: object  # datetime — loosely typed to keep the schema simple
    word_count: int = 0
    chapter_count: int = 0
    open_issue_count: int = 0
    status: str = "draft"
    character_count: int = 0
    location_count: int = 0
    object_count: int = 0
    event_count: int = 0
    claim_count: int = 0



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


class ManuscriptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    status: str
    chapters_done: int
    chapters_total: int
    created_at: datetime


class ChapterAppendIn(BaseModel):
    chapter_title: str = Field(default="")
    text: str = Field(min_length=20)


class ChangeDetectionOut(BaseModel):
    event_type: str
    changed_chapters: list[int] = Field(default_factory=list)
    unchanged_chapters: list[int] = Field(default_factory=list)
    stale_claim_chapters: list[int] = Field(default_factory=list)
    paragraph_diffs: dict = Field(default_factory=dict)


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


class ValidationCandidateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    manuscript_id: uuid.UUID | None
    chapter: int
    candidate_type: str
    payload: dict
    confidence: float
    route: str
    ambiguity_reason: str | None = None
    evidence_quote: str | None = None
    status: str
    created_at: datetime


class CandidateResolveIn(BaseModel):
    action: Literal["approve", "reject", "merge", "split"]
    target_character_id: uuid.UUID | None = None
    split_name: str | None = None


class ClaimPatchIn(BaseModel):
    value: str | None = None
    attribute: str | None = None
    subject: str | None = None
    status: Literal["active", "superseded"] | None = None
    reason: str | None = None
    re_audit: bool = True


class CharacterRenameIn(BaseModel):
    new_name: str
    re_audit: bool = True


class CharacterSplitIn(BaseModel):
    alias_to_split: str
    new_character_name: str | None = None
    re_audit: bool = True


class CorrectionRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    rule_type: str
    target_entity: str
    instruction_text: str
    payload: dict
    active: bool
    created_at: datetime


class FeedbackActionOut(BaseModel):
    updated_id: uuid.UUID
    correction_rule: CorrectionRuleOut | None = None
    re_audit_chapters: list[int] = Field(default_factory=list)
    issues_created: int = 0
    impact_notes: list[str] = Field(default_factory=list)


PlotThreadStatus = Literal["open", "resolved", "abandoned", "red_herring"]


class PlotThreadCreate(BaseModel):
    title: str
    description: str
    setup_chapter: int = 1
    payoff_chapter: int | None = None
    status: PlotThreadStatus = "open"
    related_entities: list[str] = Field(default_factory=list)
    evidence_quote: str | None = None


class PlotThreadPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    payoff_chapter: int | None = None
    status: PlotThreadStatus | None = None
    related_entities: list[str] | None = None


class PlotThreadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    description: str
    setup_chapter: int
    payoff_chapter: int | None = None
    status: str
    related_entities: list[str] = Field(default_factory=list)
    evidence_quote: str | None = None
    updated_at: datetime


class ProjectCustomizationIn(BaseModel):
    custom_context: str | None = None
    custom_prompt: str | None = None
    custom_validation: dict = Field(default_factory=dict)
    custom_graph_write: dict = Field(default_factory=dict)
    custom_ui_config: dict = Field(default_factory=dict)


class ProjectCustomizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: uuid.UUID
    custom_context: str | None = None
    custom_prompt: str | None = None
    custom_validation: dict = Field(default_factory=dict)
    custom_graph_write: dict = Field(default_factory=dict)
    custom_ui_config: dict = Field(default_factory=dict)
    updated_at: datetime | None = None


# ---------------------------------------------------------------------------
# Manuscript Chapters
# ---------------------------------------------------------------------------


class ChapterSummaryOut(BaseModel):
    number: int
    title: str
    word_count: int
    preview: str


class ChapterDetailOut(BaseModel):
    number: int
    title: str
    content: str
    word_count: int


class ChapterUpdateIn(BaseModel):
    content: str = Field(min_length=1)
    title: str | None = None

