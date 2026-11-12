# NERRA Frontend Architecture & Implementation Roadmap

> **Design Aesthetic:** *"Obsidian Velvet & Forest Noir"* — An opulent, dark academia literary studio blending volcanic obsidian, blackened oxblood burgundy, and deep noir cypress with warm antique bone typography.

---

## 1. Visual Identity & Design Tokens

### The *"Obsidian Velvet & Forest Noir"* Palette

| Token | Hex | Role / Application |
|---|---|---|
| `--color-bg-void` | `#08090B` | Deepest canvas background (Obsidian Void) |
| `--color-surface-burgundy` | `#130D12` | Primary studio surface & cards (90% black, 10% dark oxblood) |
| `--color-surface-forest` | `--color-surface-forest` | Secondary drawers & world inspection panels (90% black, 10% deep pine) |
| `--color-surface-elevated` | `#191218` | Floating modals, popovers, dropdowns |
| `--color-border-subtle` | `rgba(255, 255, 255, 0.07)` | Hairline translucent separation borders |
| `--color-text-prose` | `#EDE6D6` | Antique Bone Ivory for zero-fatigue novel reading & editing |
| `--color-text-ui` | `#B5ACA0` | Muted Warm Linen for interface labels and captions |
| `--color-text-dim` | `#7D756C` | Monospace timestamps, offsets, and IDs |
| `--color-accent-wine` | `#9B2242` / `#C43D65` | Cabernet wine for primary CTAs, active selections, and contradiction squiggles |
| `--color-accent-emerald` | `#1B8A5A` / `#2DD4BF` | Forest glow for verified facts, active custody, and positive timeline tracks |
| `--color-accent-brass` | `#C5A059` | Burnished antique gold for insignia, world rules, and epistemic warnings |

### Typography Pairing
* **Novel Prose & Chapter Titles:** `Newsreader` (optical-sized editorial serif) or `Cormorant Garamond`.
* **Interface, Navigation & Controls:** `Geist Sans` (crisp, modern contrast on dark surfaces).
* **Timelines, Claim Offsets & Identifiers:** `Geist Mono` or `JetBrains Mono`.

---

## 2. State Management Architecture: TanStack Query + Zustand

NERRA uses a strictly decoupled, zero-redundancy state architecture:

```
┌────────────────────────────────────────────────────────┐
│               SERVER STATE (TanStack Query v5)         │
│  • Caches API data across 12 pages with auto-dedupe    │
│  • Keys: ['projects'], ['chapters'], ['issues'], ...   │
│  • Handles optimistic updates on author feedback       │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                 CLIENT UI STATE (Zustand)              │
│  • useAuthStore: active user, session info, tokens     │
│  • useProjectStore: activeProjectId, activeChapter     │
│  • useEditorStore: draft prose, dirty flag, squiggles  │
│  • useInspectorStore: active rail tab, selected entity │
│  • useWorldStore: graph filter nodes, layout mode      │
└────────────────────────────────────────────────────────┘
```

---

## 3. The 12 Dedicated Pages

| # | Route | Page Name | Core Responsibilities |
|---|---|---|---|
| **1** | `/` | **Projects Dashboard** | Library shelf, novel cards, word counters, multi-format (.txt, .md, .pdf) ingestion modal with live progress. |
| **2** | `/projects/:id/editor` | **The Prose Studio (Phase 4)** | TipTap rich-text writing environment, real-time debounced consistency linter, inline squiggles, quick-fix hover popovers, floating AI copilot. |
| **3** | `/projects/:id/reader` | **Manuscript Reader** | Clean reading view with synchronized right-rail inspector showing active entities, claims, and scene metadata per paragraph. |
| **4** | `/projects/:id/issues` | **Consistency Triage Hub** | Contradictions, knowledge violations, and plot holes triage. Grouped by severity, side-by-side evidence diffs, intent classification, and re-audit trigger. |
| **5** | `/projects/:id/timeline` | **Dual Timeline Matrix** | Narrative Order vs Chronological Order switcher, flashback tracks, scene order cards, and spatiotemporal conflict warnings. |
| **6** | `/projects/:id/plot-threads` | **Subplot & Arc Tracker** | Subplot lifecycle cards (Introduced → Developing → Climactic → Resolved), chapter appearance heatmaps, and dangling thread alerts. |
| **7** | `/projects/:id/world` | **Story Graph & Knowledge Matrix** | 2D/3D interactive entity graph, character-to-character relationship matrix, and epistemic matrix (*who knows what, since when, and how*). |
| **8** | `/projects/:id/custody` | **Object Custody Chains** | Timeline tracking for critical artifacts/relics, custody transition history, and object paradox alerts. |
| **9** | `/projects/:id/bible` | **Story Bible & Lore Wiki** | Active magic rules & physics rulebook, character dossiers, location gazetteer, and Bible export (PDF/Markdown/JSON). |
| **10** | `/projects/:id/versions` | **Version History & Diffing** | Manuscript snapshots, visual roster diffs between revisions, rollback actions. |
| **11** | `/projects/:id/audit` | **Pipeline & Token Telemetry** | Input/output token breakdown, extraction timing, cache hit rates, LLM budget logs. |
| **12** | `/settings` | **Settings & Sessions** | LLM model configuration, pipeline sensitivity sliders, and multi-device session management with instant remote revocation. |

---

## 4. Phased Implementation Plan

### Phase 1: Foundation, Design System & The Projects Dashboard
- [ ] Initialize clean Next.js 15 App Router setup with Tailwind CSS and font loaders.
- [ ] Implement design tokens: Obsidian Void, Noir Burgundy, Noir Forest, Bone Ivory, Wine and Emerald accents.
- [ ] Build Central API Client (`lib/api.ts`) with cookie credentials and automatic token refresh handling.
- [ ] Setup Zustand stores (`useAuthStore`, `useProjectStore`) and TanStack Query provider.
- [ ] Build primitive UI library: `Button`, `Badge`, `Modal`, `Tabs`, `Card`, `Drawer`, `Tooltip`, and Sonner toasts.
- [ ] Build **Projects Dashboard (`/`)**:
  - Novel cards with live word count, chapter counts, issue counter badges.
  - Multi-format ingestion wizard (.txt, .md, .pdf) with live pipeline status.
  - Auth modal and active session security panel.

### Phase 2: The Studio Suite (Phase 4 Live Editor & Reader)
- [ ] Implement Shared Project Layout Shell (`/projects/[id]/layout.tsx`) with chapter rail and search.
- [ ] Build **Manuscript Reader & Inspector (`/projects/[id]/reader`)**:
  - Distraction-free reader layout.
  - Synchronized right-rail inspector drawer (character mentions, claims asserted, scene metadata).
- [ ] Build **Phase 4 Prose Studio (`/projects/[id]/editor`)**:
  - TipTap rich text engine with chapter autosave.
  - Real-time debounced consistency linter emitting inline squiggles.
  - Quick-fix hover popovers (*"Mark as intentional twist"*, *"Update canon"*).
  - Slide-over Graph RAG AI Copilot with novel citations.

### Phase 3: Continuity, Temporal & Arc Intelligence
- [ ] Build **Consistency Triage Hub (`/projects/[id]/issues`)**:
  - Severity filtering (Red/Yellow/Blue) and category tabs.
  - Side-by-side evidence diff viewer.
  - Intent classification badges and author feedback override modals.
  - "Run Full Re-Audit" trigger.
- [ ] Build **Dual Timeline Matrix (`/projects/[id]/timeline`)**:
  - Narrative Order vs In-Universe Chronological Order interactive switcher.
  - Flashback swimlanes with temporal markers.
  - Spatiotemporal collision alerts.
- [ ] Build **Plot Threads & Arc Tracker (`/projects/[id]/plot-threads`)**:
  - Lifecycle status cards, chapter heatmap, and unresolved promise alerts.

### Phase 4: Story World, Lore Wiki, Versioning & Operations
- [ ] Build **Interactive Story Graph & Knowledge Matrix (`/projects/[id]/world`)**:
  - Force-directed interactive canvas of characters, places, and objects.
  - Dynamic character relationship evolution over chapters.
  - Epistemic knowledge grid (*who knows what, since when, and how*).
- [ ] Build **Object Custody Tracker (`/projects/[id]/custody`)**:
  - Artifact possession timelines and paradox alerts.
- [ ] Build **Story Bible & Lore Wiki (`/projects/[id]/bible`)**:
  - Active world rules engine, character dossiers, location gazetteer, and Bible export.
- [ ] Build **Version History & Diffing (`/projects/[id]/versions`)**.
- [ ] Build **Pipeline Telemetry & Token Analytics (`/projects/[id]/audit`)**.
- [ ] Build **Settings & Device Security (`/settings`)**.
