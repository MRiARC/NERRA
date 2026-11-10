# NERRA — Story Intelligence Engine

> **Your story has a memory. NERRA makes it intelligent.**

NERRA is a **Story Intelligence Engine** designed for authors writing long-form fiction such as novels, screenplays, and series.

As stories grow, keeping track of characters, events, relationships, locations, timelines, and facts becomes increasingly difficult. NERRA turns the manuscript into a **living, queryable representation of the story world**, helping authors detect inconsistencies and reason about their story without manually maintaining a complex wiki.

---

## ✦ The Problem

Long-form stories accumulate information faster than authors can reliably remember it.

* Did I describe her eyes as green or blue?
* When did these two characters first meet?
* Did this character know about the murder at this point?
* Was the cafe on Oak Street or Elm Street?
* What happened before this flashback?
* Which plot threads are still unresolved?

Traditional writing tools rely heavily on **manual organization**.

NERRA aims to make the manuscript itself the source of structured story memory.

---

## ✦ The Vision

> **Drop in your manuscript and get a living intelligence layer over your fictional world.**

NERRA continuously builds and updates a representation of:

* Characters
* Events
* Relationships
* Locations
* Objects
* Facts
* Timelines
* Knowledge states
* Contradictions
* Plot threads

The goal is not simply to search the manuscript, but to **understand how information changes throughout the story**.

---

## ✦ Core Architecture

```text
                         ┌──────────────────────┐
                         │   Manuscript /       │
                         │   Live Writing       │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Change Detector    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Cheap Scanner      │
                         │  Signals & Candidates │
                         └──────────┬───────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │ Story Memory Context Builder │
                    │                              │
                    │ Relevant graph + semantic    │
                    │ context + timeline memory    │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                         ┌──────────────────────┐
                         │   LLM Extraction     │
                         │                      │
                         │ Entities • Events    │
                         │ Facts • Relations    │
                         │ Knowledge • Threads  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Validation Layer   │
                         │                      │
                         │ Graph consistency    │
                         │ AI validation        │
                         │ Human confirmation   │
                         └──────────┬───────────┘
                                    │
                       ┌────────────┴────────────┐
                       ▼                         ▼
              ┌─────────────────┐       ┌─────────────────┐
              │  Story Knowledge │       │  Semantic       │
              │      Graph       │       │  Memory         │
              └────────┬────────┘       └────────┬────────┘
                       │                         │
                       └────────────┬────────────┘
                                    ▼
                         ┌──────────────────────┐
                         │  Reasoning Services  │
                         │                      │
                         │ Contradictions      │
                         │ Timeline             │
                         │ Knowledge States     │
                         │ Relationships        │
                         │ Plot Threads         │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │     Author UI        │
                         │                      │
                         │ Story Chat • Graph   │
                         │ Timeline • Issues    │
                         │ Characters • Threads │
                         └──────────────────────┘
```

---

## ✦ How It Works

NERRA follows an **incremental, graph-first approach**.

### 1. Read

A manuscript or newly written section enters the system.

### 2. Detect

Only changed or relevant sections are identified for processing.

### 3. Extract

The system extracts structured story information such as characters, events, relationships, facts, and timeline information.

### 4. Validate

Extracted information is checked against existing story memory to reduce incorrect or conflicting information.

### 5. Remember

Validated information becomes part of the evolving **Story Knowledge Graph**.

### 6. Reason

The system can reason over the accumulated story structure to identify contradictions, track knowledge, reconstruct timelines, and discover unresolved plot threads.

---

## ✦ Example

Suppose the manuscript contains:

> **Chapter 4:** Sarah discovers a mysterious diary.

Later:

> **Chapter 8:** John steals the diary.

And:

> **Chapter 12:** Sarah searches for the diary, unaware that John has it.

NERRA can represent this as:

```text
Sarah
  │
  ├── DISCOVERS ──► Diary ──► Chapter 4
  │
  └── SEARCHES_FOR ──► Diary ──► Chapter 12

John
  │
  └── STEALS ──► Diary ──► Chapter 8
```

The system can then answer questions such as:

> **Who had the diary at Chapter 12?**

or identify potentially important continuity information such as:

> **Sarah does not know that John has the diary.**

This goes beyond keyword search by tracking **entities, events, relationships, and knowledge states over time**.

---

## ✦ Design Principles

### Incremental

The entire manuscript should not need to be processed whenever a paragraph changes.

### Graph-First

The manuscript is the source material.
The knowledge graph becomes the structured memory of the story.

### LLM-Assisted, Not LLM-Only

LLMs interpret narrative meaning, while deterministic logic and validation mechanisms maintain structural consistency.

### Human-Correctable

The author remains the final authority.

When the system is uncertain, the author should be able to correct the interpretation and improve future processing.

### Privacy-Aware

Unpublished manuscripts are highly sensitive intellectual property.

Privacy, ownership, secure storage, and potentially local processing are fundamental considerations of the system.

---

## ✦ What Makes NERRA Different?

NERRA is not intended to be:

* A generic writing assistant
* A chatbot
* A notes application
* A manually maintained wiki
* A simple RAG wrapper
* A character database

Instead:

> **NERRA is an intelligence layer over a fictional world.**

The manuscript provides the raw narrative.

The system constructs the memory.

The graph represents the world.

Reasoning services operate over that world.

The author remains the final authority.

---

## ✦ Long-Term Vision

NERRA aims to become a **persistent memory and reasoning system for fiction**.

Authors should eventually be able to ask:

```text
"When did John first meet Sarah?"

"Which characters know about the murder by Chapter 15?"

"Show every scene where Alex and Sam appear together."

"What happened on Day 3?"

"Are there any contradictions involving Maria's car?"

"Which plot threads remain unresolved?"

"Where was Sarah when the diary disappeared?"
```

The goal is to make the entire story **queryable, explainable, and structurally understandable**.

---

## 📚 Documentation (Sources of Truth)

All repository architecture, pipeline, validation, and roadmap specs live in `docs/`:

- **[System Architecture](docs/ARCHITECTURE.md)** & **[Architecture Diagram (draw.io XML)](docs/architecture.drawio.xml)**
- **[Processing Pipeline, Incremental Rules & Validation Layer](docs/PIPELINE_AND_VALIDATION.md)**
- **[Product Vision, Feature Universe & Open Research Problems](docs/FEATURES_AND_VISION.md)**
- **[Roadmap & Current Implementation Status](docs/ROADMAP.md)**

---

## 🚧 Project Status

- **Phase 1 (Core MVP):** Complete (`PR #1` merged into `main`)
- **Phase 2 (Graph DB, Dual Timeline, Knowledge Matrix, Custody, Intent Reasoner, Graph RAG & Export):** Implemented across stacked PRs `#12`–`#16`
- **Phases 3–5 (Incremental `Change Detector`/`Cheap Scanner`, Pre-Graph Confidence Validation & `Feedback Loop`, Full `Plot Thread Tracker`, `Live Writing Mode`, `Series Support`):** Tracked in [`docs/ROADMAP.md`](docs/ROADMAP.md)

---

## ✦ Vision

> **Writers remember the story.
> NERRA remembers everything else.**
