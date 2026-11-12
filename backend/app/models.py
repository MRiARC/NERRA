"""The NERRA data model — 13 tables.

Read this file like a map: it defines every piece of information the product
stores, and in what shape. When you implement a task, this file tells you
which rows to create or query.

Three groups:

  1. IDENTITY     users, projects
  2. MANUSCRIPTS  manuscripts, chapter_analyses, chunks
  3. STORY WORLD  characters, relationships, locations, objects, events,
                  claims, knowledge_updates, issues

Conventions used throughout (SQLAlchemy 2.0 typed style):

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

- `Mapped[X]` is the Python type; SQLAlchemy derives the column type from it.
- `default=...` runs in Python when a row is created.
- `server_default=func.now()` lets Postgres stamp timestamps.
- JSONB columns (`aliases`, `participants`, ...) hold small lists/dicts —
  perfect for data whose shape varies, without extra tables.
- `chunks.embedding` uses the pgvector `Vector` type — a 384-dimension float
  array that Postgres can search by similarity.
"""

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.config import settings
from app.database import Base

# ---------------------------------------------------------------------------
# 1. IDENTITY
# ---------------------------------------------------------------------------


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str]  # bcrypt hash — never store plain passwords
    display_name: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    refresh_token_hash: Mapped[str] = mapped_column(String(128), index=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_revoked: Mapped[bool] = mapped_column(default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    last_active_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    expires_at: Mapped[datetime] = mapped_column(index=True)


class UserSettings(Base):
    """User-level sovereign AI engine settings & API key overrides."""

    __tablename__ = "user_settings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    anthropic_api_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    anthropic_base_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    primary_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    embedding_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    max_hop_depth: Mapped[int | None] = mapped_column(default=2)
    extra_config: Mapped[dict] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str]
    genre: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


# ---------------------------------------------------------------------------
# 2. MANUSCRIPTS
# ---------------------------------------------------------------------------


class Manuscript(Base):
    __tablename__ = "manuscripts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(default="Untitled manuscript")

    # The full imported text. Object storage (S3) would replace this at scale.
    raw_text: Mapped[str]

    # Pipeline state, consumed by the status endpoint the UI polls:
    #   pending -> processing -> ready   (or failed, with error_note filled)
    status: Mapped[str] = mapped_column(default="pending")
    chapters_done: Mapped[int] = mapped_column(default=0)
    chapters_total: Mapped[int] = mapped_column(default=0)
    error_note: Mapped[str | None] = None

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class ChapterAnalysis(Base):
    """Extraction cache + audit trail (one row per analysed chapter).

    Keyed by `content_hash`: if a chapter's hash is unchanged we skip the
    (paid) LLM extraction entirely. This is the MVP's cost-control mechanism.
    """

    __tablename__ = "chapter_analyses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    manuscript_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("manuscripts.id", ondelete="CASCADE"), index=True
    )
    chapter_number: Mapped[int]
    content_hash: Mapped[str]
    result: Mapped[dict] = mapped_column(JSONB)  # the raw extraction payload
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class Chunk(Base):
    """A chapter's text + its embedding vector (for semantic search)."""

    __tablename__ = "chunks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    manuscript_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("manuscripts.id", ondelete="CASCADE"), index=True
    )
    chapter_number: Mapped[int]
    content: Mapped[str]
    content_hash: Mapped[str]
    paragraph_hashes: Mapped[list[str]] = mapped_column(JSONB, default=list)
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(settings.embedding_dim), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


# ---------------------------------------------------------------------------
# 3. STORY WORLD — everything here is extracted from the manuscript,
#    and every row keeps its chapter citation (provenance).
# ---------------------------------------------------------------------------


class Character(Base):
    __tablename__ = "characters"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)

    name: Mapped[str]
    aliases: Mapped[list[str]] = mapped_column(JSONB, default=list)
    description: Mapped[str | None] = None
    status: Mapped[str] = mapped_column(default="unknown")  # alive | dead | unknown
    physical_traits: Mapped[dict] = mapped_column(JSONB, default=dict)

    first_chapter: Mapped[int | None] = None
    last_chapter: Mapped[int | None] = None
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class Relationship(Base):
    __tablename__ = "relationships"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)

    character_a_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("characters.id", ondelete="CASCADE"))
    character_b_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("characters.id", ondelete="CASCADE"))

    # family | friend | enemy | romantic | professional | mentor | unknown
    type: Mapped[str] = mapped_column(default="unknown")
    # positive | neutral | hostile | complex
    sentiment: Mapped[str] = mapped_column(default="neutral")
    description: Mapped[str | None] = None
    evidence_quote: Mapped[str | None] = None
    chapter: Mapped[int | None] = None  # where this relationship state started
    until_chapter: Mapped[int | None] = None  # populated if superseded by evolution


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)

    name: Mapped[str]
    description: Mapped[str | None] = None
    first_chapter: Mapped[int | None] = None


class StoryObject(Base):
    """An object/artifact in the story (a diary, a key, a ring...).

    `mention_chapters` lists every chapter where the object appears — the
    dangling-object consistency rule reads it (an object mentioned once and
    never again is a possible unresolved thread).
    """

    __tablename__ = "objects"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)

    name: Mapped[str]
    description: Mapped[str | None] = None
    first_chapter: Mapped[int | None] = None
    mention_chapters: Mapped[list[int]] = mapped_column(JSONB, default=list)


class ObjectCustodyEvent(Base):
    """Tracks who holds an object and how custody changes across chapters."""

    __tablename__ = "object_custody_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    object_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("objects.id", ondelete="CASCADE"), index=True)

    chapter: Mapped[int]
    holder_type: Mapped[str] = mapped_column(default="character")  # character | location | unknown
    holder_name: Mapped[str]
    action: Mapped[str] = mapped_column(default="acquired")  # acquired | lost | moved | locked | destroyed | used
    evidence_quote: Mapped[str | None] = None
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class StoryEvent(Base):
    """One plot event — the rows the timeline view is built from."""

    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)

    chapter_number: Mapped[int]
    scene_order: Mapped[int] = mapped_column(default=1)
    story_time_order: Mapped[int] = mapped_column(default=1)
    temporal_anchor: Mapped[str | None] = None
    is_flashback: Mapped[bool] = mapped_column(default=False)
    is_flashforward: Mapped[bool] = mapped_column(default=False)
    summary: Mapped[str]
    participants: Mapped[list[str]] = mapped_column(JSONB, default=list)  # character names
    location: Mapped[str | None] = None
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class Claim(Base):
    """A factual claim the manuscript makes, e.g.
    subject="Sarah", attribute="eye_color", value="green", chapter=1.

    The consistency engine cross-references claims: same subject + attribute
    with a different value in another chapter => contradiction.
    """

    __tablename__ = "claims"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)

    subject: Mapped[str]
    attribute: Mapped[str]
    value: Mapped[str]
    chapter: Mapped[int]
    evidence_quote: Mapped[str]  # exact sentence from the manuscript
    source_paragraph_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    extraction_version: Mapped[int] = mapped_column(default=1)
    confidence: Mapped[float] = mapped_column(default=1.0)
    validation_state: Mapped[str] = mapped_column(default="AUTO_ACCEPTED")  # AUTO_ACCEPTED | PENDING_REVIEW | DISMISSED
    # active | superseded | intentional
    status: Mapped[str] = mapped_column(default="active")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class KnowledgeUpdate(Base):
    """'Character X learned fact Y in chapter N, by witnessing / being told / deducing.'

    Powers the knowledge-state tracker: if the story shows a character using
    a fact before the chapter they learned it, that's a knowledge violation.
    """

    __tablename__ = "knowledge_updates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)

    character: Mapped[str]
    fact: Mapped[str]
    chapter: Mapped[int]
    how_learned: Mapped[str] = mapped_column(default="witnessed")  # witnessed | told | deduced | overheard
    source_character: Mapped[str | None] = None


class ManuscriptVersion(Base):
    """Immutable draft snapshot + structural diff summary (Milestone 2.5)."""

    __tablename__ = "manuscript_versions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    manuscript_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("manuscripts.id", ondelete="CASCADE"), index=True)

    version_number: Mapped[int] = mapped_column(default=1)
    content_hash: Mapped[str]
    raw_text: Mapped[str]
    diff_summary: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class ValidationCandidate(Base):
    """Pre-graph validation gate staging table (Milestone 3.2).

    Enforces `LLM proposes -> Validator decides`:
      - auto_accepted (0.90-1.00): written straight into Story Graph
      - human_review  (0.40-0.89): awaits author confirmation/merge/split
      - reject_hold   (0.00-0.39): quarantined without polluting canon
    """

    __tablename__ = "validation_candidates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    manuscript_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("manuscripts.id", ondelete="CASCADE"), nullable=True
    )

    chapter: Mapped[int]
    candidate_type: Mapped[str]  # character | alias | claim | relationship | location
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    confidence: Mapped[float] = mapped_column(default=0.7)
    route: Mapped[str] = mapped_column(default="human_review", index=True)  # auto_accepted | human_review | reject_hold
    ambiguity_reason: Mapped[str | None] = None
    source_paragraph_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    evidence_quote: Mapped[str | None] = None
    status: Mapped[str] = mapped_column(default="pending", index=True)  # pending | approved | rejected | merged | split
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class WorldRule(Base):
    """Author-defined or extracted world-building rules (magic, physics, setting)."""

    __tablename__ = "world_rules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)

    category: Mapped[str] = mapped_column(default="setting")  # magic | physics | society | setting
    rule_text: Mapped[str]
    source_chapter: Mapped[int | None] = None
    is_author_defined: Mapped[bool] = mapped_column(default=True)
    status: Mapped[str] = mapped_column(default="active")  # active | deprecated
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class Issue(Base):
    """Output of the consistency engine — the author's to-do list.

    type:     contradiction | knowledge_violation | unresolved_thread | continuity_note |
              spatiotemporal_conflict | custody_paradox | world_rule_violation
    severity: red | yellow | green | blue
    status:   open | accepted | rejected | intentional
    """

    __tablename__ = "issues"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)

    type: Mapped[str]
    severity: Mapped[str] = mapped_column(default="yellow")
    status: Mapped[str] = mapped_column(default="open", index=True)
    description: Mapped[str]
    evidence: Mapped[list[dict]] = mapped_column(JSONB, default=list)  # [{chapter, quote}, ...]
    confidence: Mapped[float] = mapped_column(default=0.9)
    ai_reasoning: Mapped[str | None] = None
    intent_classification: Mapped[str] = mapped_column(default="error")  # error | intentional | ambiguous
    related_entities: Mapped[list[str]] = mapped_column(JSONB, default=list)
    claim_a_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("claims.id", ondelete="SET NULL"), nullable=True)
    claim_b_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("claims.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class CorrectionRule(Base):
    """Author feedback directives (Milestone 3.3).

    Captures claim overrides, character renames, alias merges, and entity splits
    so ContextBuilder, Extractor, and Validator respect author corrections.
    """

    __tablename__ = "correction_rules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)

    rule_type: Mapped[str] = mapped_column(index=True)  # alias_merge | entity_split | character_rename | fact_override | plot_status
    target_entity: Mapped[str]
    instruction_text: Mapped[str]
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    active: Mapped[bool] = mapped_column(default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class PlotThread(Base):
    """Cross-chapter narrative setup, promise, mystery, and payoff tracker (Milestone 3.4)."""

    __tablename__ = "plot_threads"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)

    title: Mapped[str]
    description: Mapped[str]
    setup_chapter: Mapped[int] = mapped_column(default=1)
    payoff_chapter: Mapped[int | None] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(default="open", index=True)  # open | resolved | abandoned | red_herring
    related_entities: Mapped[list[str]] = mapped_column(JSONB, default=list)
    evidence_quote: Mapped[str | None] = None
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class ProjectCustomization(Base):
    """Per-project extension hooks for context, prompts, validation, graph writes & UI (Milestone 3.4)."""

    __tablename__ = "project_customizations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), unique=True, index=True)

    custom_context: Mapped[str | None] = None
    custom_prompt: Mapped[str | None] = None
    custom_validation: Mapped[dict] = mapped_column(JSONB, default=dict)
    custom_graph_write: Mapped[dict] = mapped_column(JSONB, default=dict)
    custom_ui_config: Mapped[dict] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
