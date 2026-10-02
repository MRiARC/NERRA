# Nerra — Complete Feature Requirements

> **Product:** AI Story Continuity and Intelligence Engine  
> **One-liner:** Drop your manuscript in. Get a living, intelligent map of every character, event, relationship, location, and contradiction in your story — automatically.

---

## Table of Contents

1. [Manuscript Input and Ingestion](#1-manuscript-input-and-ingestion)
2. [Character Intelligence](#2-character-intelligence)
3. [Relationship Mapping](#3-relationship-mapping)
4. [Event and Plot Mapping](#4-event-and-plot-mapping)
5. [World Building Database](#5-world-building-database)
6. [Timeline Engine](#6-timeline-engine)
7. [Consistency Checker and Contradiction Engine](#7-consistency-checker-and-contradiction-engine)
8. [Knowledge State Tracker](#8-knowledge-state-tracker)
9. [Story Query Interface (Chat)](#9-story-query-interface-chat)
10. [Live Writing Mode](#10-live-writing-mode)
11. [AI Pipeline and Analysis Engine](#11-ai-pipeline-and-analysis-engine)
12. [Validation and Confidence Routing](#12-validation-and-confidence-routing)
13. [Story Graph and Data Model](#13-story-graph-and-data-model)
14. [User Feedback and Correction Loop](#14-user-feedback-and-correction-loop)
15. [Version and Snapshot Management](#15-version-and-snapshot-management)
16. [User Interface and Views](#16-user-interface-and-views)
17. [Series and Multi-Book Support](#17-series-and-multi-book-support)
18. [Collaboration Features](#18-collaboration-features)
19. [Auth, User Management, and Settings](#19-auth-user-management-and-settings)
20. [Monetization and Billing](#20-monetization-and-billing)
21. [Privacy, Security, and Data Policy](#21-privacy-security-and-data-policy)
22. [LLM Cost Management and Performance](#22-llm-cost-management-and-performance)
23. [Future and Optional Extensions](#23-future-and-optional-extensions)

---

## 1. Manuscript Input and Ingestion

This is the entry point of the entire product. Every analysis capability depends on correctly getting the manuscript into the system.

### 1.1 File Import
- Accept `.docx` (Microsoft Word), `.pdf`, `.txt`, and `.md` file formats
- Bulk import: upload an entire book or multiple chapters at once
- Paste mode: paste raw text directly into the editor for quick analysis
- Chapter-by-chapter incremental import (author can add chapters one by one)

### 1.2 Manuscript Parser
- Automatically detect and segment the manuscript into: **Books → Chapters → Scenes → Paragraphs → Sentences**
- Detect dialogue vs. narration vs. internal monologue vs. action description
- Detect chapter headings, scene breaks, POV headers (e.g., "Chapter 12 — Sarah's Perspective")
- Handle non-standard formatting (no explicit chapter markers, stream-of-consciousness)
- Preserve original formatting metadata: paragraph indices, page numbers, line numbers

### 1.3 Change Manager (Incremental Processing)
- Track every change to the manuscript with a unique **event ID** and **document version**
- Compute exactly which spans (paragraphs/scenes) changed between versions
- Prevent full re-analysis on every keystroke — only re-process changed regions
- Debounce rapid-fire edits (e.g., wait 2–5 seconds after the author stops typing before triggering analysis)
- Distinguish event types: `IMPORT`, `CHAPTER_ADDED`, `PARAGRAPH_EDITED`, `LARGE_REWRITE`, `USER_CORRECTION`
- Prioritize events: a contradiction correction takes priority over a minor word-level edit

### 1.4 Chunking and Entity Pre-Processing
- Split manuscript into semantically coherent chunks (target: ~300–500 tokens each, respecting scene/paragraph boundaries)
- Associate each chunk with its exact location metadata: book, chapter, scene, paragraph range
- Run first-pass entity spotting: detect names, places, objects, dates, time references
- Generate semantic embeddings for each chunk and store in the vector store

---

## 2. Character Intelligence

Auto-generate and maintain a complete, living profile for every character in the manuscript.

### 2.1 Character Auto-Detection
- Automatically identify all named characters from the text using NLP (spaCy) + LLM hybrid
- Resolve aliases and nicknames to a canonical identity (e.g., "Detective Park", "Park", "the detective", and "he" in context → same entity)
- Handle pronouns in context (pronoun resolution)
- Detect minor/background characters vs. major characters and tag accordingly
- Allow the author to merge, split, rename, or delete auto-detected characters

### 2.2 Character Profile Cards
Auto-generated profile card for each character, populated from all mentions across the manuscript:

- **Basic Info:** Full name, aliases, nicknames, titles (e.g., Dr., Captain)
- **Physical Description:** Collected from all textual mentions (hair color, eye color, height, age, distinctive features) — multiple mentions listed with chapter citations
- **Personality Traits:** Derived from actions, dialogue, and narrative description
- **Background:** Occupation, backstory, origin — as revealed in the text
- **Status:** Alive / Dead / Unknown / Undisclosed — with chapter of death or disappearance if applicable
- **First Appearance:** Chapter, scene, and paragraph
- **Last Appearance:** Chapter, scene, and paragraph
- **Author Notes:** Free-form notes the author can attach to any character card

### 2.3 Character Timeline
- Scene-by-scene record of everything a character did, said, or experienced
- Location of the character at each scene they appear in
- Show events in both **story-chronological** order and **narrative** (chapter) order

---

## 3. Relationship Mapping

Track the web of connections between characters across the entire story.

### 3.1 Relationship Graph
- Auto-extract all character-to-character relationships from the text
- Classify relationship types: `FAMILY`, `FRIEND`, `ENEMY`, `ROMANTIC`, `PROFESSIONAL`, `MENTOR`, `UNKNOWN`
- Track relationship state at each point in the story (relationships evolve)
- Record **when** a relationship changed and **why** (with chapter citation): e.g., "Friends → Enemies in Ch. 12 after the betrayal"

### 3.2 Relationship Visualization
- Interactive graph view (using Cytoscape.js): nodes = characters, edges = relationships
- Color-code edges by relationship type
- Timeline scrubber: drag through the story and watch the graph update to reflect relationship states at that point
- Click any character node to jump to their profile card
- Click any edge to see the history of that relationship with chapter citations

### 3.3 Relationship Flags
- Flag characters who are mentioned together frequently but have no defined relationship (possible missed connection)
- Flag when a relationship appears to reset without explanation (e.g., enemies become allies with no bridging scene)

---

## 4. Event and Plot Mapping

Automatically extract and structure every plot event, scene, and causal chain.

### 4.1 Scene-by-Scene Breakdown
- Auto-extract a structured record for every scene:
  - **What happened** (summary)
  - **Who was present** (characters involved)
  - **Where it happened** (location)
  - **When it happened** (story-time timestamp or relative time reference)
  - **Narrative position** (chapter, scene number)
- Allow the author to edit, annotate, or override any auto-extracted scene summary

### 4.2 Event Chain / Causality Graph
- Identify cause-and-effect relationships between events: "Event A caused Event B which led to Event C"
- Build a directed causal graph (supporting cycles for complex narratives)
- Visualize the causal chain as a flow diagram
- Highlight causal chains that are broken or missing a link

### 4.3 Plot Thread Tracker
- Identify and track all subplots and narrative threads
- Classify each thread as: `OPEN`, `RESOLVED`, `ABANDONED`, `FORESHADOWED`
- Flag **dangling plot threads**: "You introduced a mysterious letter in Ch. 4 but never resolved it"
- Show which chapters each thread appears in and a summary of its progression
- Allow the author to manually mark a thread as intentionally open or abandoned

### 4.4 Tension and Pacing Graph
- Compute an emotional intensity / tension score for each chapter or scene
- Visualize as a line graph across the full manuscript
- Highlight flat sections (e.g., "Chapters 8–14 have no tension peaks")
- Score based on: conflict events, dialogue intensity, stakes mentioned, pacing of prose

---

## 5. World Building Database

A structured encyclopedia of everything that exists in the story's world, auto-built from the manuscript.

### 5.1 Location Registry
- Auto-detect every place mentioned in the manuscript
- Build a profile for each location: name, aliases, description (from all mentions), location type (`CITY`, `BUILDING`, `ROOM`, `FICTIONAL_REALM`, etc.)
- Track which scenes occurred at each location with chapter citations
- Allow the author to add location notes, relationships between locations
- Map of which characters have visited each location and when

### 5.2 Objects and Artifacts Tracker
- Auto-detect important objects mentioned in the manuscript (weapons, jewelry, documents, vehicles, etc.)
- Build a profile for each object: name, description, significance
- Track the **chain of custody**: who had the object, when they got it, when they gave/lost it, where it is at any point in the story
- Flag object continuity errors: "The key was in John's pocket in Ch. 5 but Sarah uses it in Ch. 4"

### 5.3 World Rules Registry (Fantasy / Sci-Fi Support)
- Detect stated rules of the fictional world: magic systems, laws of physics, political rules, technology constraints
- Log each rule with its source citation (chapter/paragraph where it was stated)
- Auto-flag rule violations: "You stated teleportation requires a full moon (Ch. 3), but characters teleport on a Tuesday in Ch. 22"
- Allow the author to define world rules manually (pre-writing or to correct an AI extraction)
- Genre-aware profiles: fantasy, sci-fi, historical fiction, contemporary templates

---

## 6. Timeline Engine

Manage the often-complex relationship between *when events happen* in the story world vs. *when the reader learns about them*.

### 6.1 Dual Timeline Model
- **Story Time (Diegetic):** Chronological order of events as they occur in the fictional world
- **Narrative Time:** The order in which the reader experiences events (chapter order)
- Automatically map every scene to both timelines
- Handle non-linear narratives: flashbacks, flash-forwards, parallel timelines, unreliable time-jumps

### 6.2 Timeline Visualization
- Interactive timeline UI: horizontal axis = time, characters/threads shown as parallel lanes
- Drag the playhead to any point in story-time and see: what's happening, who's where, what each character knows
- See parallel storylines side by side
- Zoom in/out: from a full-book overview to a single-day view
- Highlight scenes out of narrative order with a distinct visual style

### 6.3 Time Gap Detection and Age Consistency
- Flag unexplained time gaps: "3 months pass between Ch. 8 and Ch. 9 but no character acknowledges it"
- Detect age inconsistencies: if a character is stated to be 30 in year X and 25 in year X+2
- Detect travel time inconsistencies: "Character travels from New York to Tokyo in 2 hours with no explanation"
- Allow the author to annotate time gaps as intentional

### 6.4 Flashback Detection
- Automatically detect flashback and flash-forward scenes from linguistic cues
- Correctly place flashback events in story-time even if they appear late in narrative-time
- Flag flashbacks that contradict established story-time facts

---

## 7. Consistency Checker and Contradiction Engine

The core killer feature. A persistent, cross-referenced memory of every stated fact in the manuscript.

### 7.1 Fact Memory
- Every stated fact is extracted and logged as a structured claim:
  - **Claim:** e.g., "Sarah has green eyes"
  - **Source:** Chapter 2, Paragraph 4
  - **Evidence:** The exact sentence(s) supporting the claim
  - **Confidence:** How certain the AI is about this extraction
  - **Status:** `ACTIVE` / `SUPERSEDED` / `INTENTIONAL` / `DISPUTED`
- All claims are cross-referenced against each other continuously

### 7.2 Contradiction Types and Flags
- 🔴 **Contradiction:** Two claims directly conflict. e.g., "Sarah has green eyes (Ch. 2)" vs. "Sarah's blue eyes sparkled (Ch. 17)"
- 🟡 **Possible Inconsistency:** Claims that are suspicious but could be intentional
- 🟢 **Unresolved Thread:** Something introduced but not concluded
- 🔵 **Continuity Note:** Informational reminder: "At this point in Ch. 10, Character A does not yet know about the murder"

### 7.3 Intentional Override
- Author can mark any flag as **"intentional"** with a free-form explanatory note
- Once marked intentional, the flag is suppressed and will not re-fire for the same claim pair
- Intentional marks are stored in the Canon Graph as author-confirmed metadata

### 7.4 Confidence-Based Routing
- AI assigns a confidence score to each detected issue (0.0–1.0)
- **High confidence (>0.85):** Auto-propose to user with explanation
- **Medium confidence (0.5–0.85):** Surface for human review
- **Low confidence (<0.5):** Hold or discard — do not surface noise to the author

### 7.5 Contradiction Engine (LangGraph Agent)
- Iterative reasoning loop: gather relevant facts → reason about intent → flag or resolve → update graph
- Distinguishes between: factual contradiction, unreliable narrator choice, intentional narrative tension, author error

---

## 8. Knowledge State Tracker

Track what each character knows at every point in the story — one of the most unique and powerful features.

### 8.1 Knowledge Matrix
- For every significant piece of information in the story, track:
  - **Which characters know it**
  - **Since which chapter/scene** they knew it
  - **How they learned it** (witnessed, told by X, deduced, overheard)
- Queryable: "What does Detective Park know at the end of Chapter 15?"

### 8.2 Knowledge State Violations
- Flag when a character reacts to or uses information they should not yet know
- e.g., "Character A references the murder in Ch. 8, but they don't learn about it until Ch. 10"
- Critical for mystery, thriller, and suspense genres

### 8.3 POV Filtering
- In first-person or limited-third POV narratives, track what the narrator knows vs. what they reveal to the reader
- Flag when the narrator reveals information they couldn't plausibly know given their POV position

---

## 9. Story Query Interface (Chat)

A natural language interface where the author can interrogate their own story.

### 9.1 Natural Language Questions
Support author queries such as:
- *"When did John first visit the hospital?"*
- *"What color is Maria's car?"*
- *"List all scenes where both Alex and Sam are present"*
- *"What does Detective Park know about the crime at Chapter 15?"*
- *"Show me all unresolved subplots"*
- *"What happened on Day 3 of the story?"*
- *"When did the relationship between Alex and Maria change?"*

### 9.2 Query Engine Architecture
- Multi-step retrieval: parse query → identify entities/intent → retrieve from graph + vector store → synthesize answer
- Return answers with citations: every answer includes exact chapter/paragraph evidence
- Support follow-up questions within a conversation context
- Route by query type: factual (graph lookup), semantic (vector search), reasoning (LangGraph agent)

### 9.3 Story Bible Export
- Export the auto-generated story bible as a structured document
- Formats: PDF, DOCX, Markdown, Notion import
- Author can customize which sections to include

---

## 10. Live Writing Mode

Write directly inside the tool and get real-time intelligence as you type.

### 10.1 Rich Text Editor
- Integrated rich text editor (ProseMirror / TipTap) with basic formatting
- Chapter/scene organization in a sidebar binder
- Auto-save with version history
- Word count, chapter count, scene count in the status bar

### 10.2 Real-Time Analysis
- Analysis triggered after debounce period (~2–3 seconds after typing pauses)
- Inline annotations in the editor margin: contradiction warnings, continuity notes, knowledge state alerts
- Highlight text with issues — click to see full issue details in the side panel
- "AI is thinking..." indicator while analysis is running

### 10.3 Manuscript View + Map View Split
- Side-by-side layout: manuscript on the left, live map on the right
- Click any paragraph → the map zooms to that timeline point and highlights relevant characters/events
- Highlight a character name → their profile card appears in the side panel

### 10.4 Contextual Writing Sidebar (Non-Intrusive)
- When writing a scene, show: characters present so far, what they each know, recent events in the same location
- Toggle on/off by the author
- Does NOT generate story content — purely intelligence and reference

---

## 11. AI Pipeline and Analysis Engine

The core intelligence layer. All AI processing flows through this structured pipeline.

### 11.1 Event Router
- Receives all editor events and applies debouncing, diffing, and prioritization
- Publishes events to Redis Streams for async consumption by downstream workers

### 11.2 Ingestion Pipeline (Async Python)
Straight data pipeline — fast, parallelizable, no LangGraph overhead:
1. Manuscript Parser → structural segmentation
2. Chunker → token-aware chunking with location metadata
3. Entity Extractor → spaCy NER + LLM hybrid
4. Embedding Generator → semantic embeddings (cached)
5. Graph Writer → write entities and relationships to Postgres + Apache AGE
6. Vector Writer → upsert embeddings into pgvector

### 11.3 Context Construction
Before each AI analysis call:
1. Targeted Retrieval: pull changed scene + all mentioned entities + their graph neighborhoods
2. Vector Search: retrieve top-K semantically similar passages from elsewhere in the manuscript
3. Context Builder: assemble structured context packet: `{passages, graph_facts, timeline_position, world_rules, author_notes}`
4. Analysis Planner: decide which analysis modules to run based on what changed
5. Custom Context Rules: respect author-defined context overrides

### 11.4 Parallel AI Analysis Modules (LangGraph DAG)

| Module | Analyzes |
|--------|----------|
| **Character & Relationship Analysis** | Character mentions, description changes, relationship updates |
| **World, Object & Location Analysis** | Location facts, object chain-of-custody, world rule compliance |
| **Timeline & Knowledge-State Analysis** | Event time, character whereabouts, knowledge state updates |
| **Plot Thread & Continuity Analysis** | Open/closed threads, pacing, causal chain integrity |

Each module returns: extracted claims + detected issues + confidence scores.

### 11.5 LLM Provider Strategy
- **Claude (Anthropic):** Deep reasoning — contradiction analysis, knowledge state inference, complex story Q&A
- **GPT-4o (OpenAI):** Fast entity extraction, classification, embedding generation
- Tiered routing: small/fast model for extraction; large model only for reasoning
- All calls wrapped in retry logic, timeout handling, and cost tracking

---

## 12. Validation and Confidence Routing

Every AI output passes through validation before being committed to the graph or shown to the user.

### 12.1 Validation Layer
Four checks on every AI output:
1. **Schema Check:** Output conforms to expected structured format
2. **Evidence Check:** Every claim is grounded in actual manuscript text evidence
3. **Consistency Check:** New claim does not conflict with existing canon in the graph
4. **Policy Check:** Output complies with author-defined rules and overrides

### 12.2 Confidence and Risk Scoring
- Composite score = `confidence × impact × reversibility`

### 12.3 Routing Tiers

| Score | Route | Action |
|-------|-------|--------|
| **High (>0.85)** | Auto-Propose | Commit to graph, surface to user |
| **Medium (0.5–0.85)** | Human Review | Surface as "we think this might be an issue — confirm?" |
| **Low (<0.5)** | Reject / Hold | Discard or queue for batch re-evaluation |

### 12.4 Human Review Interface
- Dedicated Review Queue in the UI for medium-confidence findings
- Author actions: **Accept**, **Reject**, **Edit**, **Mark as Intentional**
- Accepted → Canon Graph; Rejected → negative learning signal; Intentional → suppression override

---

## 13. Story Graph and Data Model

### 13.1 Three Logical Subgraphs (Postgres + Apache AGE)

**Story Graph (Raw Facts):** All extracted entities, relationships, events, and claims with manuscript provenance. Versioned on every update.

**Canon Graph (Confirmed Facts):** Author-validated subset of the Story Graph. Ground truth for consistency checking. Stores intentional override metadata.

**Belief / Perspective Layer:** What specific characters or narrators *believe* to be true (may differ from canon). Supports unreliable narrator narratives and information asymmetry tracking.

### 13.2 Vector Store (pgvector)
- Semantic embeddings for every text chunk
- Metadata per embedding: chapter, scene, characters mentioned, location, timeline position
- Used for: semantic search, context retrieval, "find similar passages", story Q&A

### 13.3 Relational Data (Postgres)
- Users, auth, sessions, billing
- Projects and manuscript metadata (genre settings, analysis toggles)
- Manuscript versions and file uploads
- Audit log of all AI actions and author corrections
- Review queue items and notification preferences

---

## 14. User Feedback and Correction Loop

### 14.1 AI Correction Interface
- Author can correct any AI-extracted fact directly from the UI
- Corrections applied to both Canon Graph and Story Graph (with provenance)
- System re-evaluates all downstream claims that depended on the corrected fact

### 14.2 Learning Signals
- **Accepted finding** → positive signal for that extraction pattern
- **Rejected finding** → negative signal; similar outputs get lower confidence
- **Edited output** → preference signal (remembered for future analysis)
- **Marked intentional** → suppression signal for that contradiction pattern

### 14.3 Preference Memory
- Author preferences persist across sessions: warning tone, verbosity, module priorities
- Per-project settings: genre, world rules, custom aliases, analysis module toggles

### 14.4 Correction-Triggered Re-Analysis
- Author correction → re-analyzed through targeted Context Builder → re-analysis of all affected graph regions

---

## 15. Version and Snapshot Management

### 15.1 Manuscript Versioning
- Automatic snapshot on every meaningful writing pause
- Named snapshots (author-defined labels)
- Full version history timeline in the UI
- Diff viewer: compare any two versions side by side
- Restore any previous version

### 15.2 Story Graph Versioning
- Graph versioned in lockstep with manuscript versions
- Every update records: what changed, which manuscript edit triggered it, which AI module produced it
- Roll back the graph to any previous snapshot

### 15.3 Rewrite Mode
- Author declares a "large rewrite" for a section
- System batches all changes and analyzes them as a complete unit
- After rewrite: full consistency check against the rest of the manuscript
- Shows a diff of what changed in the intelligence layer as a result of the rewrite

---

## 16. User Interface and Views

### 16.1 Dashboard / Home
- Project list with progress indicators
- Recent issues and warnings summary
- Quick actions: Import manuscript, New project, Continue writing

### 16.2 Manuscript View (Editor / Reader)
- Full-screen reading and editing experience
- Left panel: chapter/scene binder navigation
- Main panel: rich text manuscript with inline annotations
- Right panel: contextual intelligence (character card, issue list, timeline position)
- Filterable "Issues" sidebar

### 16.3 Character View
- Grid of character profile cards
- Search and filter by status, chapter range, relationship type
- Full character profile: timeline, relationships, all mentions with citations

### 16.4 Timeline View
- Full interactive timeline
- Horizontal axis = story time, parallel lanes = characters / plot threads
- Playhead scrubber: drag to any point and inspect state
- Toggle between story-time and narrative-time views

### 16.5 Graph View
- Interactive relationship graph (Cytoscape.js)
- Node types: characters, locations, objects, events
- Edge types: relationships, interactions, object transfers, causal links
- Filterable by entity type, chapter range, or specific character
- Timeline-aware: graph updates as timeline scrubber moves

### 16.6 Issues View (Consistency Dashboard)
- Filterable issue list: by type, severity, status, chapter
- Bulk actions: accept all high-confidence, dismiss all notes
- Review queue for medium-confidence items

### 16.7 World View
- Tabbed: Locations | Objects | World Rules
- Searchable registry for each
- Timeline-aware: shows object/location state at any selected story point

### 16.8 Query / Chat View
- Full-screen chat interface for story questions
- Conversation history
- Answers include clickable source citations (jump to chapter/paragraph)
- Export query results to Story Bible

---

## 17. Series and Multi-Book Support

### 17.1 Series Project Structure
- Group multiple books under a single Series project
- Shared **Series Canon Graph** at the top level
- Characters, locations, world rules designated as series-wide vs. book-local

### 17.2 Cross-Book Consistency
- Consistency checks across books: "In Book 1 you established X; in Book 3 you contradicted it"
- Character evolution tracking across books: age, status, relationships

### 17.3 Series Timeline
- Unified timeline spanning all books
- Each book's events placed in relation to each other

---

## 18. Collaboration Features

> **Note: Future scope — Post-MVP. Not required for v1.**

### 18.1 Co-Author Mode
- Multiple users per project with roles: `OWNER`, `CO_AUTHOR`, `EDITOR`, `VIEWER`
- Real-time collaborative editing with conflict resolution
- Per-user change tracking in version history

### 18.2 Editor Mode
- Editors annotate the manuscript with flags linked to the story map
- Author receives editor annotations as a separate review layer

### 18.3 Ghost Character Alerts
- Flag characters mentioned only once and never developed: "John Doe was mentioned in Ch. 2 and never appears again — intentional?"

---

## 19. Auth, User Management, and Settings

### 19.1 Authentication
- Email/password registration and login
- OAuth: Google, Apple
- Magic link (passwordless login)
- JWT-based session management with refresh tokens
- Rate limiting per user (Redis-backed)

### 19.2 User Profile and Settings
- Display name, avatar, timezone
- Notification preferences: email, in-app, webhook
- Analysis verbosity: minimal / standard / detailed
- Default genre for new projects

### 19.3 Project Settings (Per-Manuscript)
- Genre selection (affects analysis profiles and templates)
- Custom character aliases pre-defined by author
- Custom world rules (manual entry)
- Analysis module toggles (disable irrelevant modules)
- Privacy: processing mode setting

---

## 20. Monetization and Billing

### 20.1 Free Tier
- 1 project, up to 20,000 words
- Character intelligence, basic consistency checker
- No live writing mode
- Markdown export only

### 20.2 Pro Tier
- Unlimited projects and manuscript length
- All analysis modules (timeline, knowledge state, plot threads, world rules)
- Live writing mode
- Series support (up to 3 books)
- Full export (PDF, DOCX, Notion)
- **Monthly subscription OR one-time purchase option** (authors prefer ownership)

### 20.3 Studio Tier
- Everything in Pro
- Collaboration (up to 5 members)
- Unlimited series books
- API access
- White-label story bible export
- Dedicated support

### 20.4 Token Budget and Usage Controls
- Daily LLM token budget per user (varies by tier)
- Usage dashboard: token consumption by action and month
- Graceful degradation: near cap → switch to lighter models
- Upgrade prompts at natural limit-hit moments

---

## 21. Privacy, Security, and Data Policy

> **Non-negotiable.** Authors will not use a tool they don't trust with unpublished work.

### 21.1 Data Handling
- We do not train on user manuscripts — stated explicitly and verifiably
- Encryption at rest (AES-256) and in transit (TLS 1.3)
- Logical multi-tenancy: each user's data is fully isolated
- Full audit log: author can see every AI action taken on their manuscript

### 21.2 Data Deletion
- Delete any project and all associated data at any time
- Deletion is permanent and irreversible (explicit confirmation required)
- GDPR-compliant: export all data as JSON archive before deletion

### 21.3 LLM API Data Policy
- All LLM API calls configured with no-training / opt-out flags (Anthropic and OpenAI both support this)
- Minimal context principle: don't send more manuscript text than necessary per API call
- Cache API responses to avoid re-sending the same text

### 21.4 Local Processing Mode (Future)
- Offline analysis using open-source models (Llama 3, Mistral)
- Manuscript never leaves the user's machine
- Lower accuracy trade-off for maximum privacy

---

## 22. LLM Cost Management and Performance

A **unit economics problem** that must be built in from day one.

### 22.1 Semantic Caching
- Reuse cached analysis results if a passage hasn't changed
- Cache key: content hash + analysis module + model version
- Redis cache with TTL, invalidated on chunk change

### 22.2 Tiered Model Routing
- Small/fast model: first-pass extraction, classification, simple lookups
- Large model: contradiction reasoning, knowledge state inference, complex Q&A
- Route each task to the cheapest model that handles it reliably

### 22.3 Batching
- Batch pending edits on writing pause rather than analyzing every character-level change
- Batch embedding generation (100-chunk batches to embedding API)

### 22.4 Per-User Budget Enforcement
- Track token consumption per user per day
- Hard cap at tier limits with graceful notification before hitting the cap
- No rollover of unused tokens

### 22.5 Performance Targets

| Action | Target Latency (p95) |
|--------|----------------------|
| Paragraph edit → inline annotation | < 5 seconds |
| Chapter import → full analysis | < 60 seconds per chapter |
| Story Q&A response | < 8 seconds |
| 100K-word initial import | < 15 minutes |

---

## 23. Future and Optional Extensions

Architecturally planned, explicitly out of scope for v1.

| Extension | Description |
|-----------|-------------|
| **Pronoun Resolution** | Advanced co-reference: "he/she/they" correctly mapped to characters across long passages |
| **Unreliable Narrator Model** | Distinguish what the narrator says from what is actually true in story-world |
| **World Rule Auto-Extraction** | Infer world rules from patterns (e.g., "every time magic is used, the character is tired") |
| **Plot Thread Resolution Suggester** | Suggest how to resolve open threads based on established story patterns |
| **Large Rewrite Batch Processor** | Handle 50K+ word rewrites as a unified batch job |
| **Custom Validation Rules** | Author-defined rules: "Never let a scene end with Character X alone" — system flags violations |
| **VS Code Extension** | Native integration for authors who write in VS Code |
| **Obsidian Plugin** | Integration for the Obsidian writing community |
| **Standalone Desktop App (Tauri)** | Local-first desktop experience with embedded AI |
| **Public API** | Let third-party tools integrate (Scrivener plugin, Atticus, etc.) |
| **Fine-Tuned Extraction Models** | Train custom models on accepted/rejected correction signals |
| **Genre AI Profiles** | Specialized analysis for romance, mystery, epic fantasy, sci-fi, literary fiction |

---

*Last updated: 2026-08-21 | Version: 0.1 — Pre-Engineering Review*
