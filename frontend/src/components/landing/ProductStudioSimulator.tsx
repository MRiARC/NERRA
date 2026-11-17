"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn, formatWords } from "@/lib/utils";
import {
  BookMarked,
  Feather,
  BookOpen,
  Clock,
  Compass,
  Network,
  GitPullRequest,
  Radio,
  History,
  Activity,
  PanelLeft,
  ArrowRight,
  Plus,
  Layers,
  FolderOpen,
  ChevronDown,
  Folder,
  BookPlus,
  Upload,
  ArrowUpRight,
  Palette,
  Check,
  Sparkles,
  X,
} from "lucide-react";
import {
  OverviewView,
  EditorView,
  ReaderView,
  TimelineView,
  KnowledgeView,
  GraphView,
  PlotThreadsView,
  IngestionView,
  VersionsView,
  TelemetryView,
} from "./simulator";
import {
  HARDCODED_STORIES,
  INITIAL_ISSUES,
  MANUSCRIPT_CHAPTERS,
  DEFAULT_CHAPTER_PROSE_MAP,
  DEFAULT_CHAPTER_4_PROSE,
  RECONCILED_CHAPTER_4_PROSE,
  TWIST_CHAPTER_4_PROSE,
  type MockStory,
} from "./simulator/mockData";
import { SARCASTIC_SHORT_MESSAGES, type AiAction } from "./simulator/aiNotice";
import { THEMES, type ThemeId } from "@/lib/theme";
import type { Issue } from "@/lib/types";

export type SimulatorTab =
  | "shelf"
  | "overview"
  | "editor"
  | "reader"
  | "timeline"
  | "knowledge"
  | "graph"
  | "plot-threads"
  | "ingestion"
  | "versions"
  | "telemetry";

const THEME_STYLES: Record<ThemeId, React.CSSProperties> = {
  "literary-obsidian": {
    "--surface-void": "#0d0e12",
    "--surface-subtle": "#121318",
    "--surface-card": "#181922",
    "--surface-elevated": "#1e202b",
    "--surface-field": "#14151d",
    "--surface-glass": "rgba(24, 25, 34, 0.85)",
    "--border-quiet": "rgba(255, 255, 255, 0.08)",
    "--border-subtle": "rgba(255, 255, 255, 0.12)",
    "--border-prominent": "rgba(255, 255, 255, 0.18)",
    "--border-focus": "rgba(140, 34, 66, 0.65)",
    "--ink-parchment": "#f8fafc",
    "--ink-bone": "#cbd5e1",
    "--ink-ash": "#94a3b8",
    "--ink-faint": "#64748b",
    "--wine-accent": "#8c2242",
    "--wine-crimson": "#a82d54",
    "--color-surface-void": "#0d0e12",
    "--color-surface-subtle": "#121318",
    "--color-surface-card": "#181922",
    "--color-surface-elevated": "#1e202b",
    "--color-surface-field": "#14151d",
    "--color-border-quiet": "rgba(255, 255, 255, 0.08)",
    "--color-border-subtle": "rgba(255, 255, 255, 0.12)",
    "--color-border-prominent": "rgba(255, 255, 255, 0.18)",
    "--color-ink-parchment": "#f8fafc",
    "--color-ink-bone": "#cbd5e1",
    "--color-ink-ash": "#94a3b8",
    "--color-ink-faint": "#64748b",
    "--color-wine-accent": "#8c2242",
    "--color-wine-crimson": "#a82d54",
  } as React.CSSProperties,
  "cypress-void": {
    "--surface-void": "#090e0b",
    "--surface-subtle": "#0e1612",
    "--surface-card": "#131f1a",
    "--surface-elevated": "#1a2a23",
    "--surface-field": "#101915",
    "--surface-glass": "rgba(19, 31, 26, 0.85)",
    "--border-quiet": "rgba(255, 255, 255, 0.08)",
    "--border-subtle": "rgba(255, 255, 255, 0.12)",
    "--border-prominent": "rgba(255, 255, 255, 0.18)",
    "--border-focus": "rgba(34, 83, 63, 0.75)",
    "--ink-parchment": "#f0fdf4",
    "--ink-bone": "#cbd5e1",
    "--ink-ash": "#94a3b8",
    "--ink-faint": "#64748b",
    "--wine-accent": "#1b4d3b",
    "--wine-crimson": "#23654d",
    "--color-surface-void": "#090e0b",
    "--color-surface-subtle": "#0e1612",
    "--color-surface-card": "#131f1a",
    "--color-surface-elevated": "#1a2a23",
    "--color-surface-field": "#101915",
    "--color-border-quiet": "rgba(255, 255, 255, 0.08)",
    "--color-border-subtle": "rgba(255, 255, 255, 0.12)",
    "--color-border-prominent": "rgba(255, 255, 255, 0.18)",
    "--color-ink-parchment": "#f0fdf4",
    "--color-ink-bone": "#cbd5e1",
    "--color-ink-ash": "#94a3b8",
    "--color-ink-faint": "#64748b",
    "--color-wine-accent": "#1b4d3b",
    "--color-wine-crimson": "#23654d",
  } as React.CSSProperties,
  "scholar-slate": {
    "--surface-void": "#090c11",
    "--surface-subtle": "#0e121a",
    "--surface-card": "#141a24",
    "--surface-elevated": "#1b2331",
    "--surface-field": "#10151f",
    "--surface-glass": "rgba(20, 26, 36, 0.85)",
    "--border-quiet": "rgba(255, 255, 255, 0.08)",
    "--border-subtle": "rgba(255, 255, 255, 0.12)",
    "--border-prominent": "rgba(255, 255, 255, 0.18)",
    "--border-focus": "rgba(43, 86, 117, 0.75)",
    "--ink-parchment": "#f8fafc",
    "--ink-bone": "#cbd5e1",
    "--ink-ash": "#94a3b8",
    "--ink-faint": "#64748b",
    "--wine-accent": "#254d6e",
    "--wine-crimson": "#2f618a",
    "--color-surface-void": "#090c11",
    "--color-surface-subtle": "#0e121a",
    "--color-surface-card": "#141a24",
    "--color-surface-elevated": "#1b2331",
    "--color-surface-field": "#10151f",
    "--color-border-quiet": "rgba(255, 255, 255, 0.08)",
    "--color-border-subtle": "rgba(255, 255, 255, 0.12)",
    "--color-border-prominent": "rgba(255, 255, 255, 0.18)",
    "--color-ink-parchment": "#f8fafc",
    "--color-ink-bone": "#cbd5e1",
    "--color-ink-ash": "#94a3b8",
    "--color-ink-faint": "#64748b",
    "--color-wine-accent": "#254d6e",
    "--color-wine-crimson": "#2f618a",
  } as React.CSSProperties,
  "ivory-atelier": {
    "--surface-void": "#f7f5f0",
    "--surface-subtle": "#ede9e0",
    "--surface-card": "#ffffff",
    "--surface-elevated": "#ffffff",
    "--surface-field": "#f3efe6",
    "--surface-glass": "rgba(255, 255, 255, 0.92)",
    "--border-quiet": "rgba(28, 25, 23, 0.08)",
    "--border-subtle": "rgba(28, 25, 23, 0.15)",
    "--border-prominent": "rgba(28, 25, 23, 0.25)",
    "--border-focus": "#8c2242",
    "--ink-parchment": "#1c1917",
    "--ink-bone": "#44403c",
    "--ink-ash": "#78716c",
    "--ink-faint": "#a8a29e",
    "--wine-accent": "#8c2242",
    "--wine-crimson": "#a62a50",
    "--color-surface-void": "#f7f5f0",
    "--color-surface-subtle": "#ede9e0",
    "--color-surface-card": "#ffffff",
    "--color-surface-elevated": "#ffffff",
    "--color-surface-field": "#f3efe6",
    "--color-border-quiet": "rgba(28, 25, 23, 0.08)",
    "--color-border-subtle": "rgba(28, 25, 23, 0.15)",
    "--color-border-prominent": "rgba(28, 25, 23, 0.25)",
    "--color-ink-parchment": "#1c1917",
    "--color-ink-bone": "#44403c",
    "--color-ink-ash": "#78716c",
    "--color-ink-faint": "#a8a29e",
    "--color-wine-accent": "#8c2242",
    "--color-wine-crimson": "#a62a50",
  } as React.CSSProperties,
};

/** Chapter spine hairline ticks matching ShelfRow.tsx */
function MiniChapterSpine({ chapters }: { chapters: number }) {
  const ticks = Math.min(Math.max(chapters, 0), 20);

  return (
    <div aria-hidden className="mt-1 flex w-2 flex-col-reverse gap-[2.5px] shrink-0">
      {Array.from({ length: ticks }).map((_, i) => (
        <span
          key={i}
          className="h-[2.5px] w-full rounded-full bg-border-prominent transition-colors duration-300 group-hover:bg-wine-crimson"
        />
      ))}
    </div>
  );
}

/** Component-scoped Mini Theme Switcher — does NOT mutate documentElement / global theme */
function MiniSimulatorThemePicker({
  theme,
  onSelectTheme,
}: {
  theme: ThemeId;
  onSelectTheme: (t: ThemeId) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const activeConfig = THEMES[theme] || THEMES["literary-obsidian"];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full bg-surface-subtle/80 hover:bg-surface-card border border-border-quiet/90 px-2 py-0.5 text-ink-bone hover:text-ink-parchment transition-all text-[9px] font-mono shadow-xs select-none cursor-pointer"
        title="Change simulator theme"
      >
        <span
          className="h-2 w-2 rounded-full border border-black/40 shrink-0"
          style={{ backgroundColor: activeConfig.accentHex }}
        />
        <span className="hidden sm:inline font-sans">{activeConfig.name}</span>
        <Palette className="h-2.5 w-2.5 text-ink-ash" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-surface-elevated border border-border-subtle shadow-[0_12px_36px_rgba(0,0,0,0.7)] p-1 z-50 text-[10px]">
          <div className="px-2 py-1 text-[8.5px] uppercase tracking-wider font-mono text-ink-faint border-b border-border-quiet/80 mb-0.5">
            Studio Aesthetic
          </div>
          {(Object.keys(THEMES) as ThemeId[]).map((tId) => {
            const cfg = THEMES[tId];
            const isSelected = theme === tId;
            return (
              <button
                key={tId}
                type="button"
                onClick={() => {
                  onSelectTheme(tId);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors font-sans cursor-pointer",
                  isSelected
                    ? "bg-wine-accent/15 text-wine-crimson font-medium"
                    : "text-ink-bone hover:bg-surface-subtle hover:text-ink-parchment"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 border border-black/30"
                    style={{ backgroundColor: cfg.accentHex }}
                  />
                  <span>{cfg.name}</span>
                </div>
                {isSelected && <Check className="h-3 w-3 text-wine-crimson" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ProductStudioSimulator() {
  const [activeStoryId, setActiveStoryId] = useState<string>("story-1");
  const [activeTab, setActiveTab] = useState<SimulatorTab>("overview");
  const [activeChapter, setActiveChapter] = useState<number>(4);
  const [collapsed, setCollapsed] = useState(false);
  const [issues, setIssues] = useState<Issue[]>(INITIAL_ISSUES);
  const [editorResolved, setEditorResolved] = useState<"unresolved" | "reconciled" | "twist">(
    "unresolved"
  );

  // Component-scoped theme isolation (does NOT touch documentElement)
  const [simTheme, setSimTheme] = useState<ThemeId>("literary-obsidian");

  // Persistent chapter text state across tab switches (stored in component memory)
  const [chapterProseMap, setChapterProseMap] = useState<Record<number, string>>(
    DEFAULT_CHAPTER_PROSE_MAP
  );

  // In-Component Sarcastic AI Notice
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAiNotice = (action: AiAction = "ask") => {
    const msg = SARCASTIC_SHORT_MESSAGES[action] || "Unpaid guests don't get AI.";
    setAiNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setAiNotice(null);
    }, 4200);
  };

  useEffect(() => {
    function handlePaywallEvent(e: Event) {
      const customEvent = e as CustomEvent<{ action?: AiAction; message?: string }>;
      const action = customEvent.detail?.action || "ask";
      triggerAiNotice(action);
    }
    window.addEventListener("nerra:paywall", handlePaywallEvent);
    return () => {
      window.removeEventListener("nerra:paywall", handlePaywallEvent);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  // Accordions matching layout.tsx
  const [writingOpen, setWritingOpen] = useState(true);
  const [worldOpen, setWorldOpen] = useState(true);
  const [checksOpen, setChecksOpen] = useState(true);
  const [otherStoriesOpen, setOtherStoriesOpen] = useState(true);

  const currentStory: MockStory =
    HARDCODED_STORIES.find((s) => s.id === activeStoryId) || HARDCODED_STORIES[0];
  const otherStories = HARDCODED_STORIES.filter((s) => s.id !== activeStoryId);

  const openIssues = issues.filter((i) => i.status === "open");

  // Tab switcher with sidebar auto-collapse for editor
  const handleSelectTab = (tab: SimulatorTab) => {
    setActiveTab(tab);
    if (tab === "editor") {
      setCollapsed(true);
    } else if (collapsed) {
      setCollapsed(false);
    }
  };

  const handleOpenStoryWorkspace = (story: MockStory) => {
    setActiveStoryId(story.id);
    setActiveTab("overview");
    setCollapsed(false);
  };

  const handleSaveProse = (newProse: string) => {
    setChapterProseMap((prev) => ({
      ...prev,
      [activeChapter]: newProse,
    }));
  };

  const handleResolveReconcile = () => {
    setEditorResolved("reconciled");
    setChapterProseMap((prev) => ({
      ...prev,
      4: RECONCILED_CHAPTER_4_PROSE,
    }));
    setIssues((prev) =>
      prev.map((i) => (i.id === "issue-1" ? { ...i, status: "resolved" } : i))
    );
  };

  const handleResolveTwist = () => {
    setEditorResolved("twist");
    setChapterProseMap((prev) => ({
      ...prev,
      4: TWIST_CHAPTER_4_PROSE,
    }));
    setIssues((prev) =>
      prev.map((i) => (i.id === "issue-1" ? { ...i, status: "resolved" } : i))
    );
  };

  const handleResetEditor = () => {
    setEditorResolved("unresolved");
    setChapterProseMap((prev) => ({
      ...prev,
      4: DEFAULT_CHAPTER_4_PROSE,
    }));
    setIssues(INITIAL_ISSUES);
  };

  const handleNavigateToEditor = (chapter: number, issueId: string) => {
    setActiveChapter(chapter);
    setActiveTab("editor");
    setCollapsed(true);
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case "shelf":
        return "Library Shelf";
      case "overview":
        return "Overview";
      case "editor":
        return "Editor";
      case "reader":
        return "Reader";
      case "timeline":
        return "Timeline";
      case "knowledge":
        return "Who Knows What";
      case "graph":
        return "World & Cast Network";
      case "plot-threads":
        return "Plot Threads";
      case "ingestion":
        return "Import Radar";
      case "versions":
        return "Version History";
      case "telemetry":
        return "Engine Telemetry";
      default:
        return "Overview";
    }
  };

  // Sidebar Items matching projects/[id]/layout.tsx
  const writingItems = [
    {
      id: "overview" as const,
      name: "Overview",
      icon: BookMarked,
      meta: `${currentStory.chapter_count} ch`,
    },
    {
      id: "editor" as const,
      name: "Editor",
      icon: Feather,
      meta: null,
    },
    {
      id: "reader" as const,
      name: "Reader",
      icon: BookOpen,
      meta: null,
    },
  ];

  const worldItems = [
    {
      id: "graph" as const,
      name: "World & Cast Network",
      icon: Network,
      meta: String(currentStory.character_count),
    },
    {
      id: "timeline" as const,
      name: "Timeline",
      icon: Clock,
      meta: null,
    },
    {
      id: "knowledge" as const,
      name: "Who Knows What",
      icon: Compass,
      meta: null,
    },
    {
      id: "plot-threads" as const,
      name: "Plot Threads",
      icon: GitPullRequest,
      meta: null,
    },
  ];

  const checkItems = [
    {
      id: "ingestion" as const,
      name: "Import Radar",
      icon: Radio,
      meta: "100%",
    },
    {
      id: "versions" as const,
      name: "Version History",
      icon: History,
      meta: null,
    },
    {
      id: "telemetry" as const,
      name: "Engine Telemetry",
      icon: Activity,
      meta: null,
    },
  ];

  // Aggregated totals across all 3 stories for the Shelf Dashboard
  const shelfTotalWords = HARDCODED_STORIES.reduce((acc, s) => acc + s.word_count, 0);
  const shelfTotalChapters = HARDCODED_STORIES.reduce((acc, s) => acc + s.chapter_count, 0);
  const shelfTotalIssues = HARDCODED_STORIES.reduce((acc, s) => acc + s.open_issue_count, 0);

  return (
    <div
      data-theme={simTheme}
      style={THEME_STYLES[simTheme]}
      className={cn(
        "w-full max-w-5xl mx-auto transition-colors duration-200",
        simTheme === "ivory-atelier" ? "light text-ink-parchment" : "dark text-ink-parchment"
      )}
    >
      {/* Outer Application Window Frame */}
      <div className="relative rounded-xl border border-border-subtle bg-surface-void shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85)] overflow-hidden transition-all flex flex-col">
        {/* ===================================================================
            TOP BAR (Mini Desktop Chrome)
            =================================================================== */}
        <header className="flex h-8 shrink-0 items-center justify-between bg-surface-void px-2.5 sm:px-3 z-40 select-none border-b border-border-quiet text-[10px]">
          {/* Left: Traffic Lights + Toggle + Breadcrumbs */}
          <div className="flex items-center gap-2 min-w-0">
            {/* Window Traffic Lights */}
            <div className="flex items-center gap-1.5 mr-0.5">
              <span className="h-2 w-2 rounded-full bg-severity-contradiction/80 border border-severity-contradiction/90 inline-block" />
              <span className="h-2 w-2 rounded-full bg-severity-warning/80 border border-severity-warning/90 inline-block" />
              <span className="h-2 w-2 rounded-full bg-severity-thread/80 border border-severity-thread/90 inline-block" />
            </div>

            {/* If on shelf, show back or study indicator; else sidebar toggle */}
            {activeTab !== "shelf" ? (
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                className="rounded p-1 text-ink-ash hover:bg-white/[0.06] hover:text-ink-parchment transition-colors"
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <PanelLeft className="h-3 w-3" />
              </button>
            ) : null}

            {/* Antigravity Fluid Breadcrumb */}
            <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-ink-faint truncate">
              {activeTab === "shelf" ? (
                <>
                  <span className="text-wine-accent font-semibold">Study</span>
                  <span className="text-border-subtle">/</span>
                  <span className="text-ink-parchment">Library Shelf</span>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleSelectTab("shelf")}
                    className="text-ink-ash hover:text-ink-parchment transition-colors"
                  >
                    Study
                  </button>
                  <span className="text-border-subtle">/</span>
                  <span className="text-ink-ash truncate max-w-[120px] sm:max-w-[180px]">
                    {currentStory.title}
                  </span>
                  <span className="text-border-subtle">/</span>
                  <span className="text-ink-parchment font-semibold">{getPageTitle()}</span>
                </>
              )}
            </div>
          </div>

          {/* Right: Metrics pill + Theme Switcher + Author Avatar */}
          <div className="flex items-center gap-1.5 font-mono text-[8.5px]">
            {activeTab !== "shelf" ? (
              <div className="hidden sm:flex items-center gap-1.5 rounded bg-surface-subtle/40 px-2 py-0.5 border border-border-quiet/80 text-ink-faint">
                <span>{currentStory.chapter_count} ch</span>
                <span className="text-border-quiet">·</span>
                <span>{formatWords(currentStory.word_count)}</span>
                {openIssues.length > 0 && (
                  <>
                    <span className="text-border-quiet">·</span>
                    <span className="text-wine-crimson font-medium">
                      {openIssues.length} open {openIssues.length === 1 ? "thread" : "threads"}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 rounded bg-surface-subtle/40 px-2 py-0.5 border border-border-quiet/80 text-ink-faint">
                <span>3 manuscripts</span>
                <span className="text-border-quiet">·</span>
                <span>{formatWords(shelfTotalWords)}</span>
              </div>
            )}

            {/* Local Theme Picker (Component-Isolated) */}
            <MiniSimulatorThemePicker theme={simTheme} onSelectTheme={setSimTheme} />

            <div className="flex items-center gap-1 rounded bg-white/[0.04] px-1.5 py-0.5 text-ink-bone">
              <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-wine-accent/30 font-serif text-[8px] font-bold text-ink-parchment">
                A
              </div>
              <span className="hidden md:inline text-[9.5px]">Adarsh</span>
            </div>
          </div>
        </header>

        {/* ===================================================================
            BODY:
            When activeTab === "shelf": EXACT FULL-WIDTH STUDY (NO SIDEBAR!)
            When activeTab !== "shelf": WORKSPACE WITH FLUENT LEFT SIDEBAR
            =================================================================== */}
        {activeTab === "shelf" ? (
          /* ===================================================================
              EXACT 1:1 REPLICA OF DASHBOARD / STUDY (frontend/src/app/page.tsx)
              =================================================================== */
          <div className="h-[550px] min-h-[550px] max-h-[550px] overflow-y-auto bg-surface-void px-4 sm:px-8 py-5 sm:py-7 overscroll-contain">
            {/* Study Nameplate matching DashboardPage */}
            <section>
              <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.22em] text-ink-ash">
                <span>Study</span>
                <span aria-hidden className="h-px w-6 bg-border-subtle" />
                <span>MONDAY, 16 NOVEMBER</span>
              </div>

              <h1 className="mt-2.5 font-serif text-2xl sm:text-3xl font-medium leading-[1.05] tracking-tight text-ink-parchment">
                Good evening, Adarsh.
              </h1>

              <p className="mt-1.5 max-w-xl font-serif text-xs italic leading-relaxed text-ink-bone sm:text-sm">
                Three stories on the shelf. {shelfTotalIssues} threads are waiting for you.
              </p>

              {/* Action buttons that trigger funny sarcastic in-component notice */}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => triggerAiNotice("new_story")}
                  className="flex items-center gap-1.5 rounded-lg bg-wine-accent px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-white hover:bg-wine-crimson transition-all shadow-sm cursor-pointer"
                >
                  <BookPlus className="w-3.5 h-3.5" />
                  <span>New story</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerAiNotice("import")}
                  className="group inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-ash transition-colors hover:text-ink-parchment cursor-pointer"
                >
                  <span>Import manuscript</span>
                  <span
                    aria-hidden
                    className="h-px w-5 bg-current transition-all duration-300 group-hover:w-8"
                  />
                </button>
              </div>
            </section>

            {/* Ledger matching DashboardPage */}
            <section className="mt-5 border-y border-border-quiet py-3.5">
              <dl className="grid grid-cols-2 gap-y-3 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-border-quiet">
                <div className="sm:pr-4">
                  <dd className="font-serif text-xl tabular-nums text-ink-parchment">
                    {shelfTotalWords.toLocaleString()}
                  </dd>
                  <dt className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-ink-faint">
                    words
                  </dt>
                </div>
                <div className="sm:px-4">
                  <dd className="font-serif text-xl tabular-nums text-ink-parchment">
                    {shelfTotalChapters}
                  </dd>
                  <dt className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-ink-faint">
                    chapters
                  </dt>
                </div>
                <div className="sm:px-4">
                  <dd className="font-serif text-xl tabular-nums text-severity-contradiction">
                    {shelfTotalIssues}
                  </dd>
                  <dt className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-ink-faint">
                    open threads
                  </dt>
                </div>
                <div className="sm:px-4 sm:pr-0">
                  <dd className="font-serif text-xl tabular-nums text-ink-parchment">
                    {HARDCODED_STORIES.length}
                  </dd>
                  <dt className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-ink-faint">
                    stories
                  </dt>
                </div>
              </dl>
            </section>

            {/* Shelf List matching ShelfRow.tsx */}
            <section className="mt-6">
              <header className="flex items-baseline justify-between gap-4 pb-2 border-b border-border-quiet">
                <h2 className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-ash">
                  Your shelf
                </h2>
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                  3 manuscripts
                </span>
              </header>

              <div className="divide-y divide-border-quiet/60">
                {HARDCODED_STORIES.map((story) => {
                  return (
                    <div
                      key={story.id}
                      onClick={() => handleOpenStoryWorkspace(story)}
                      className="group cursor-pointer py-3.5 flex items-start gap-3.5 sm:gap-4 transition-colors hover:bg-surface-subtle/30 -mx-2 px-2 rounded-lg"
                    >
                      {/* Chapter hairline ticks spine */}
                      <MiniChapterSpine chapters={story.chapter_count} />

                      {/* Story Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                          <h3 className="font-serif text-base sm:text-lg font-medium text-ink-parchment group-hover:text-white transition-colors truncate">
                            {story.title}
                          </h3>
                          <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-ink-faint">
                            {story.genre}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-ink-ash font-serif italic line-clamp-1">
                          {story.description}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[8.5px] uppercase tracking-wider text-ink-faint">
                          <span>{story.chapter_count} chapters</span>
                          <span>·</span>
                          <span>{formatWords(story.word_count)}</span>
                          <span>·</span>
                          <span>{story.character_count} cast</span>
                          {story.open_issue_count > 0 ? (
                            <>
                              <span>·</span>
                              <span className="text-wine-crimson font-medium">
                                {story.open_issue_count} open findings
                              </span>
                            </>
                          ) : (
                            <>
                              <span>·</span>
                              <span className="text-emerald-400">clean canon</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right hover action */}
                      <div className="hidden sm:flex items-center gap-1 font-mono text-[8px] uppercase tracking-wider text-ink-faint group-hover:text-wine-crimson transition-colors pt-1">
                        <span>Open Studio</span>
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ) : (
          /* ===================================================================
              WORKBENCH ATELIER: Left Fluent Sidebar + Main Viewport
              =================================================================== */
          <div className="flex h-[550px] min-h-[550px] max-h-[550px] min-h-0 overflow-hidden">
            {/* Antigravity Fluent Left Sidebar */}
            <aside
              className={cn(
                "flex h-full shrink-0 flex-col overflow-hidden bg-surface-void select-none z-30 transition-[width] duration-150 ease-out border-r border-border-quiet",
                collapsed ? "w-[52px]" : "w-56"
              )}
            >
              {/* Top Quick Actions (New Story & Library Shelf) */}
              <div className="p-2 space-y-1 shrink-0">
                {!collapsed ? (
                  <>
                    <button
                      type="button"
                      onClick={() => triggerAiNotice("new_story")}
                      className="flex items-center gap-2 w-full px-2 py-1 rounded bg-white/[0.04] text-[11px] font-medium text-ink-parchment hover:bg-white/[0.08] transition-all cursor-pointer"
                    >
                      <Plus className="h-3 w-3 text-wine-crimson" />
                      <span>New Novel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectTab("shelf")}
                      className="flex items-center gap-2 w-full px-2 py-1 rounded text-[11px] text-ink-ash hover:text-ink-parchment hover:bg-white/[0.04] transition-colors text-left"
                    >
                      <Layers className="h-3 w-3 text-ink-faint" />
                      <span>Library Shelf</span>
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => triggerAiNotice("new_story")}
                      className="flex h-7 w-7 items-center justify-center rounded bg-white/[0.04] text-wine-crimson hover:bg-white/[0.08] transition-colors cursor-pointer"
                      title="New Novel"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectTab("shelf")}
                      className="flex h-7 w-7 items-center justify-center rounded text-ink-faint hover:bg-white/[0.06] hover:text-ink-parchment transition-colors"
                      title="Library Shelf"
                    >
                      <Layers className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation Tree */}
              <div className="flex-1 overflow-y-auto min-h-0 px-1.5 py-1 space-y-2">
                {!collapsed ? (
                  <div className="space-y-1">
                    {/* Story Folder Header */}
                    <div className="flex items-center gap-1.5 px-2 py-1 text-[11.5px] font-medium text-ink-parchment truncate">
                      <FolderOpen className="h-3 w-3 text-wine-crimson shrink-0" />
                      <span className="truncate">{currentStory.title}</span>
                    </div>

                    {/* Section 1: Writing & Manuscript */}
                    <div className="pl-1.5 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => setWritingOpen(!writingOpen)}
                        className="flex items-center justify-between w-full px-1.5 py-0.5 text-[8.5px] font-mono uppercase tracking-[0.14em] text-ink-faint hover:text-ink-ash transition-colors"
                      >
                        <span>Manuscript</span>
                        <ChevronDown
                          className={cn("h-2.5 w-2.5 transition-transform", !writingOpen && "-rotate-90")}
                        />
                      </button>

                      {writingOpen &&
                        writingItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectTab(item.id)}
                              className={cn(
                                "group flex items-center gap-1.5 w-full px-2 py-1 rounded text-[11px] transition-colors text-left",
                                isActive
                                  ? "bg-white/[0.08] text-white font-medium"
                                  : "text-ink-ash hover:text-ink-parchment hover:bg-white/[0.04]"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-3 w-3 shrink-0",
                                  isActive ? "text-wine-crimson" : "text-ink-faint group-hover:text-ink-ash"
                                )}
                              />
                              <span className="truncate">{item.name}</span>
                              {item.meta && (
                                <span className="ml-auto font-mono text-[8px] text-ink-faint/60">
                                  {item.meta}
                                </span>
                              )}
                              {isActive && !item.meta && (
                                <span className="ml-auto h-1 w-1 rounded-full bg-wine-crimson shadow-[0_0_4px_rgba(168,45,84,0.8)]" />
                              )}
                            </button>
                          );
                        })}
                    </div>

                    {/* Section 2: World, Canon & Graph */}
                    <div className="pl-1.5 space-y-0.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setWorldOpen(!worldOpen)}
                        className="flex items-center justify-between w-full px-1.5 py-0.5 text-[8.5px] font-mono uppercase tracking-[0.14em] text-ink-faint hover:text-ink-ash transition-colors"
                      >
                        <span>World &amp; Canon</span>
                        <ChevronDown
                          className={cn("h-2.5 w-2.5 transition-transform", !worldOpen && "-rotate-90")}
                        />
                      </button>

                      {worldOpen &&
                        worldItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectTab(item.id)}
                              className={cn(
                                "group flex items-center gap-1.5 w-full px-2 py-1 rounded text-[11px] transition-colors text-left",
                                isActive
                                  ? "bg-white/[0.08] text-white font-medium"
                                  : "text-ink-ash hover:text-ink-parchment hover:bg-white/[0.04]"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-3 w-3 shrink-0",
                                  isActive ? "text-wine-crimson" : "text-ink-faint group-hover:text-ink-ash"
                                )}
                              />
                              <span className="truncate">{item.name}</span>
                              {item.meta && (
                                <span className="ml-auto font-mono text-[8px] text-ink-faint/60">
                                  {item.meta}
                                </span>
                              )}
                              {isActive && !item.meta && (
                                <span className="ml-auto h-1 w-1 rounded-full bg-wine-crimson shadow-[0_0_4px_rgba(168,45,84,0.8)]" />
                              )}
                            </button>
                          );
                        })}
                    </div>

                    {/* Section 3: Checks & Engine */}
                    <div className="pl-1.5 space-y-0.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setChecksOpen(!checksOpen)}
                        className="flex items-center justify-between w-full px-1.5 py-0.5 text-[8.5px] font-mono uppercase tracking-[0.14em] text-ink-faint hover:text-ink-ash transition-colors"
                      >
                        <span>Checks &amp; Tools</span>
                        <ChevronDown
                          className={cn("h-2.5 w-2.5 transition-transform", !checksOpen && "-rotate-90")}
                        />
                      </button>

                      {checksOpen &&
                        checkItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectTab(item.id)}
                              className={cn(
                                "group flex items-center gap-1.5 w-full px-2 py-1 rounded text-[11px] transition-colors text-left",
                                isActive
                                  ? "bg-white/[0.08] text-white font-medium"
                                  : "text-ink-ash hover:text-ink-parchment hover:bg-white/[0.04]"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-3 w-3 shrink-0",
                                  isActive ? "text-wine-crimson" : "text-ink-faint group-hover:text-ink-ash"
                                )}
                              />
                              <span className="truncate">{item.name}</span>
                              {item.meta && (
                                <span className="ml-auto font-mono text-[8px] text-ink-faint/60">
                                  {item.meta}
                                </span>
                              )}
                              {isActive && !item.meta && (
                                <span className="ml-auto h-1 w-1 rounded-full bg-wine-crimson shadow-[0_0_4px_rgba(168,45,84,0.8)]" />
                              )}
                            </button>
                          );
                        })}
                    </div>

                    {/* Section 4: Other Stories on Shelf */}
                    <div className="pl-1.5 pt-2 border-t border-border-quiet/50">
                      <button
                        type="button"
                        onClick={() => setOtherStoriesOpen(!otherStoriesOpen)}
                        className="flex items-center justify-between w-full px-1.5 py-0.5 text-[8.5px] font-mono uppercase tracking-[0.14em] text-ink-faint hover:text-ink-ash transition-colors"
                      >
                        <span>Other Novels ({otherStories.length})</span>
                        <ChevronDown
                          className={cn(
                            "h-2.5 w-2.5 transition-transform",
                            !otherStoriesOpen && "-rotate-90"
                          )}
                        />
                      </button>

                      {otherStoriesOpen && (
                        <div className="space-y-0.5 pt-0.5">
                          {otherStories.map((story) => (
                            <button
                              key={story.id}
                              type="button"
                              onClick={() => handleOpenStoryWorkspace(story)}
                              className="flex items-center gap-1.5 w-full px-2 py-1 rounded text-[10.5px] text-ink-faint hover:text-ink-parchment hover:bg-white/[0.04] transition-colors text-left"
                            >
                              <Folder className="h-3 w-3 shrink-0 text-ink-faint" />
                              <span className="truncate">{story.title}</span>
                              <span className="ml-auto font-mono text-[7.5px] text-ink-faint/50">
                                {story.chapter_count}ch
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Collapsed Icon Strip Mode */
                  <div className="flex flex-col items-center gap-1">
                    {[...writingItems, ...worldItems, ...checkItems].map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTab(item.id)}
                          className={cn(
                            "relative flex h-6 w-6 items-center justify-center rounded transition-colors",
                            isActive
                              ? "bg-white/[0.1] text-wine-crimson"
                              : "text-ink-faint hover:bg-white/[0.04] hover:text-ink-ash"
                          )}
                          title={item.name}
                        >
                          <Icon className="h-3 w-3" />
                          {isActive && (
                            <span className="absolute right-0.5 top-0.5 h-1 w-1 rounded-full bg-wine-crimson" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sidebar Footer */}
              {!collapsed && (
                <div className="p-2 border-t border-border-quiet font-mono text-[7.5px] uppercase tracking-wider text-ink-faint flex items-center justify-between">
                  <span>Nerra Scribe</span>
                  <span className="text-emerald-400">v2.4</span>
                </div>
              )}
            </aside>

            {/* Main Workspace Atelier Views - WITH NATURAL SCROLLING & MIN-H-0 */}
            <main className="flex-1 min-w-0 h-full min-h-0 overflow-y-auto flex flex-col bg-surface-void">
              {activeTab === "overview" && (
                <OverviewView
                  issues={issues}
                  onNavigateToEditor={handleNavigateToEditor}
                  onNavigateToCharacters={() => handleSelectTab("graph")}
                  onNavigateToReader={(ch) => {
                    setActiveChapter(ch);
                    handleSelectTab("reader");
                  }}
                  onNavigateToIngestion={() => handleSelectTab("ingestion")}
                />
              )}

              {activeTab === "editor" && (
                <EditorView
                  activeChapter={activeChapter}
                  onSelectChapter={setActiveChapter}
                  prose={chapterProseMap[activeChapter] ?? DEFAULT_CHAPTER_4_PROSE}
                  onSaveProse={handleSaveProse}
                  editorResolved={editorResolved}
                  onResolveReconcile={handleResolveReconcile}
                  onResolveTwist={handleResolveTwist}
                  onReset={handleResetEditor}
                  onSwitchToReader={() => handleSelectTab("reader")}
                  onBackToOverview={() => handleSelectTab("overview")}
                  onTriggerAiNotice={triggerAiNotice}
                />
              )}

              {activeTab === "reader" && (
                <ReaderView
                  activeChapter={activeChapter}
                  onSelectChapter={setActiveChapter}
                  prose={chapterProseMap[activeChapter]}
                  onBackToOverview={() => handleSelectTab("overview")}
                  onBackToEditor={() => {
                    setActiveTab("editor");
                    setCollapsed(true);
                  }}
                  onTriggerAiNotice={triggerAiNotice}
                />
              )}

              {activeTab === "graph" && <GraphView />}

              {activeTab === "timeline" && <TimelineView />}

              {activeTab === "knowledge" && <KnowledgeView />}

              {activeTab === "plot-threads" && <PlotThreadsView />}

              {activeTab === "ingestion" && <IngestionView />}

              {activeTab === "versions" && <VersionsView />}

              {activeTab === "telemetry" && <TelemetryView />}
            </main>
          </div>
        )}

        {/* ===================================================================
            IN-COMPONENT SARCASTIC AI NOTICE (Floats inside simulator window)
            =================================================================== */}
        {aiNotice && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-2 rounded-full border border-wine-crimson/50 bg-surface-elevated/95 px-3.5 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.8)] backdrop-blur-md text-[11px]">
              <Sparkles className="h-3.5 w-3.5 text-wine-crimson shrink-0" />
              <span className="font-serif font-medium text-ink-parchment">
                {aiNotice}
              </span>
              <a
                href="/login"
                className="rounded-full bg-wine-accent px-2.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-white transition-colors hover:bg-wine-crimson ml-1"
              >
                Sign up &rarr;
              </a>
              <button
                type="button"
                onClick={() => setAiNotice(null)}
                className="ml-0.5 text-ink-faint hover:text-ink-parchment transition-colors p-0.5"
                title="Dismiss notice"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
