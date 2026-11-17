"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BookOpen,
  Save,
  PanelLeft,
  PanelRight,
  X,
  Search,
  Check,
  Sparkles,
  Bold,
  Italic,
  Heading2,
  Quote,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MANUSCRIPT_CHAPTERS,
  DEFAULT_CHAPTER_4_PROSE,
} from "./mockData";
import { triggerAiPaywall, type AiAction } from "./aiNotice";

export interface EditorViewProps {
  activeChapter: number;
  onSelectChapter: (ch: number) => void;
  prose: string;
  onSaveProse: (newProse: string) => void;
  editorResolved: "unresolved" | "reconciled" | "twist";
  onResolveReconcile: () => void;
  onResolveTwist: () => void;
  onReset: () => void;
  onSwitchToReader?: () => void;
  onBackToOverview?: () => void;
  onTriggerAiNotice?: (action: AiAction) => void;
}

function FormatButton({
  label,
  onClick,
  children,
  active = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-md transition-colors cursor-pointer",
        active
          ? "bg-wine-accent/20 text-wine-crimson"
          : "text-ink-faint hover:bg-surface-elevated hover:text-ink-parchment"
      )}
    >
      {children}
    </button>
  );
}

export function EditorView({
  activeChapter,
  onSelectChapter,
  prose,
  onSaveProse,
  editorResolved,
  onResolveReconcile,
  onResolveTwist,
  onReset,
  onSwitchToReader,
  onBackToOverview,
  onTriggerAiNotice,
}: EditorViewProps) {
  // Show rail defaults to false for distraction-free space matching real editor focus mode
  const [showRail, setShowRail] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [posture, setPosture] = useState<"write" | "review">("write");
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [title, setTitle] = useState(
    MANUSCRIPT_CHAPTERS.find((c) => c.number === activeChapter)?.title || "The Clockwork Heart"
  );

  const [localProse, setLocalProse] = useState<string>(prose || DEFAULT_CHAPTER_4_PROSE);
  const [savedProse, setSavedProse] = useState<string>(prose || DEFAULT_CHAPTER_4_PROSE);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);

  // Sync external prose updates (e.g. tab switches, chapter changes, resolve reconcile/twist)
  useEffect(() => {
    setLocalProse(prose);
    setSavedProse(prose);
  }, [prose, activeChapter]);

  // Sync title when chapter changes and reset scroll position to top
  useEffect(() => {
    const ch = MANUSCRIPT_CHAPTERS.find((c) => c.number === activeChapter);
    if (ch) {
      setTitle(ch.title);
    }
    mainScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [activeChapter]);

  // Auto-resize the textarea to its scrollHeight so it NEVER gets internal scrollbars
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localProse, activeChapter]);

  const isDirty = localProse !== savedProse;
  const wordCount = useMemo(() => localProse.trim().split(/\s+/).filter(Boolean).length, [localProse]);
  const charCount = localProse.length;
  const readingTimeMin = Math.max(1, Math.round(wordCount / 240));

  const handleSave = () => {
    setSavedProse(localProse);
    onSaveProse(localProse);
    toast.success("Draft saved to study storage.", { duration: 2500 });
  };

  const handleReanalyze = () => {
    if (onTriggerAiNotice) {
      onTriggerAiNotice("reread");
    } else {
      triggerAiPaywall("reread");
    }
  };

  const applyFormat = (type: "bold" | "italic" | "heading" | "quote" | "scene") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = localProse.slice(start, end);

    let replacement = "";
    if (type === "bold") {
      replacement = selected ? `**${selected}**` : `**bold text**`;
    } else if (type === "italic") {
      replacement = selected ? `*${selected}*` : `*italic text*`;
    } else if (type === "heading") {
      replacement = selected ? `\n\n## ${selected}\n\n` : `\n\n## Section Heading\n\n`;
    } else if (type === "quote") {
      replacement = selected ? `\n\n> ${selected}\n\n` : `\n\n> Quoted observation\n\n`;
    } else if (type === "scene") {
      replacement = `\n\n***\n\n`;
    }

    const nextProse = localProse.slice(0, start) + replacement + localProse.slice(end);
    setLocalProse(nextProse);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }, 10);
  };

  const hasContradictionInProse =
    localProse.includes("obsidian compass") &&
    !localProse.includes("counterfeit cast in dark resin") &&
    editorResolved === "unresolved";

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-surface-void select-none">
      {/* ===================================================================
          DOC CHROME: Focused document controls matching editor/page.tsx
          =================================================================== */}
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border-quiet/80 bg-surface-subtle/25 px-2.5 sm:px-3 text-[10px]">
        {/* Left: Back + Stepper + Title + Saved Dot */}
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onBackToOverview}
            className="rounded p-0.5 text-ink-faint hover:text-ink-parchment transition-colors cursor-pointer"
            title="Back to Overview"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>

          {/* Quick chapter stepper */}
          <div className="flex items-center gap-0.5 rounded bg-surface-subtle px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-ash border border-border-quiet/60">
            <button
              type="button"
              onClick={() => onSelectChapter(Math.max(1, activeChapter - 1))}
              disabled={activeChapter <= 1}
              className="p-0.5 text-ink-faint hover:text-ink-parchment disabled:opacity-30 disabled:hover:text-ink-faint cursor-pointer"
            >
              <ChevronLeft className="h-2.5 w-2.5" />
            </button>
            <span className="tabular-nums font-semibold text-ink-parchment px-0.5">
              Ch {String(activeChapter).padStart(2, "0")}
            </span>
            <span className="text-ink-faint/60">/ {MANUSCRIPT_CHAPTERS.length}</span>
            <button
              type="button"
              onClick={() => onSelectChapter(Math.min(MANUSCRIPT_CHAPTERS.length, activeChapter + 1))}
              disabled={activeChapter >= MANUSCRIPT_CHAPTERS.length}
              className="p-0.5 text-ink-faint hover:text-ink-parchment disabled:opacity-30 disabled:hover:text-ink-faint cursor-pointer"
            >
              <ChevronRight className="h-2.5 w-2.5" />
            </button>
          </div>

          <span aria-hidden className="text-ink-faint/40 hidden sm:inline">·</span>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="truncate font-serif text-[11px] text-ink-parchment bg-transparent focus:outline-none focus:bg-surface-elevated/40 px-1 rounded max-w-[150px] hidden sm:inline"
            title="Edit chapter title"
          />

          <span
            aria-hidden
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
              isDirty ? "bg-severity-warning" : "bg-emerald-500/80"
            )}
            title={isDirty ? "Unsaved edits" : "Saved"}
          />
        </div>

        {/* Right: Findings pill + Re-read + Read + Find + Save + Panel Toggles */}
        <div className="flex items-center gap-1 font-mono text-[9px]">
          <button
            type="button"
            onClick={() => setPosture(posture === "review" ? "write" : "review")}
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5 uppercase tracking-wider transition-colors cursor-pointer",
              hasContradictionInProse
                ? "bg-wine-crimson/20 text-wine-crimson border border-wine-crimson/40"
                : "bg-surface-elevated/60 text-ink-ash"
            )}
            title="Findings on this chapter"
          >
            <span className="tabular-nums font-semibold">
              {hasContradictionInProse ? "1" : "0"}
            </span>
            <span className="hidden md:inline">finding</span>
          </button>

          <button
            type="button"
            onClick={handleReanalyze}
            className="hidden sm:inline-flex items-center gap-1 rounded bg-surface-elevated/60 px-1.5 py-0.5 uppercase tracking-wider text-ink-ash hover:text-ink-parchment transition-colors cursor-pointer"
            title="Summon Sovereign LLM"
          >
            <RefreshCw className="h-2.5 w-2.5 text-wine-accent" />
            <span>Re-read</span>
          </button>

          {onSwitchToReader && (
            <button
              type="button"
              onClick={onSwitchToReader}
              className="hidden sm:inline-flex items-center gap-1 rounded bg-surface-elevated/60 px-1.5 py-0.5 uppercase tracking-wider text-ink-ash hover:text-ink-parchment transition-colors cursor-pointer"
            >
              <BookOpen className="h-2.5 w-2.5" />
              <span>Read</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setFindOpen((open) => !open)}
            className={cn(
              "rounded px-1.5 py-0.5 uppercase tracking-wider transition-colors cursor-pointer",
              findOpen
                ? "bg-surface-elevated text-ink-parchment border border-border-subtle"
                : "bg-surface-elevated/60 text-ink-ash hover:text-ink-parchment"
            )}
          >
            Find
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty}
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5 uppercase tracking-wider transition-colors",
              isDirty
                ? "bg-wine-accent text-white hover:bg-wine-crimson shadow-xs cursor-pointer"
                : "bg-surface-elevated/40 text-ink-faint/60 cursor-default"
            )}
          >
            <Save className="h-2.5 w-2.5" />
            <span>Save</span>
          </button>

          <span aria-hidden className="text-ink-faint/30 hidden sm:inline">·</span>

          {/* Panel toggles */}
          <button
            type="button"
            onClick={() => setShowRail((v) => !v)}
            title={showRail ? "Hide contents" : "Show contents"}
            className={cn(
              "p-1 rounded transition-colors cursor-pointer",
              showRail ? "bg-surface-elevated text-ink-parchment" : "text-ink-faint hover:text-ink-ash"
            )}
          >
            <PanelLeft className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            title={showNotes ? "Hide notes" : "Show notes"}
            className={cn(
              "p-1 rounded transition-colors cursor-pointer",
              showNotes ? "bg-surface-elevated text-ink-parchment" : "text-ink-faint hover:text-ink-ash"
            )}
          >
            <PanelRight className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {/* ===================================================================
          WORKSPACE BODY: Contents Rail + Editable Prose Galley + Case Desk
          =================================================================== */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Contents Rail */}
        {showRail && (
          <nav className="w-40 shrink-0 border-r border-border-quiet/80 bg-surface-subtle/10 p-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-border-quiet/60">
                <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-wine-crimson font-medium">
                  Contents
                </span>
                <span className="font-mono text-[8px] text-ink-faint">
                  {MANUSCRIPT_CHAPTERS.length} Ch
                </span>
              </div>

              <ol className="mt-1.5 space-y-0.5">
                {MANUSCRIPT_CHAPTERS.map((ch) => {
                  const isActive = ch.number === activeChapter;
                  const hasFlag = ch.number === 4 && hasContradictionInProse;

                  return (
                    <li key={ch.number}>
                      <button
                        type="button"
                        onClick={() => onSelectChapter(ch.number)}
                        className={cn(
                          "group relative flex w-full items-start gap-1.5 rounded px-1.5 py-1 text-left transition-colors cursor-pointer",
                          isActive
                            ? "bg-surface-elevated/70 text-ink-parchment font-medium"
                            : "text-ink-ash hover:bg-surface-subtle hover:text-ink-bone"
                        )}
                      >
                        {isActive && (
                          <span className="absolute inset-y-1 left-0 w-0.5 rounded-r bg-wine-crimson" />
                        )}
                        <span
                          className={cn(
                            "w-3 shrink-0 font-mono text-[9px] tabular-nums",
                            isActive ? "font-semibold text-wine-crimson" : "text-ink-faint"
                          )}
                        >
                          {String(ch.number).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-serif text-[10.5px] leading-tight">
                          {ch.title.replace(/^Chapter\s+\d+[:\s-]*/i, "")}
                        </span>
                        {hasFlag && (
                          <span
                            className="mt-1 h-1 w-1 shrink-0 rounded-full bg-wine-crimson shadow-[0_0_4px_rgba(168,45,84,0.8)]"
                            title="1 open issue"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="pt-2 border-t border-border-quiet/60 font-mono text-[8px] text-ink-faint">
              12,480 words total
            </div>
          </nav>
        )}

        {/* Center: REAL EDITABLE Prose Galley Leaf (Naturally Scrollable without internal clipping) */}
        <main
          ref={mainScrollRef}
          className="relative min-h-0 min-w-0 flex-1 overflow-y-auto bg-surface-void px-3 py-3 sm:px-6 sm:py-5 overscroll-contain"
        >
          {/* Find docked bar */}
          {findOpen && (
            <div className="mb-3 flex items-center gap-2 rounded bg-surface-card border border-border-quiet px-2 py-1 text-[10px]">
              <Search className="h-3 w-3 text-ink-faint" />
              <input
                type="text"
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                placeholder="Find in chapter..."
                className="bg-transparent text-ink-parchment placeholder:text-ink-faint focus:outline-none flex-1 font-serif text-[11px]"
              />
              <span className="font-mono text-[8.5px] text-ink-faint uppercase">
                {findQuery
                  ? localProse.toLowerCase().includes(findQuery.toLowerCase())
                    ? "Matches found"
                    : "0 matches"
                  : "0 matches"}
              </span>
              <button
                type="button"
                onClick={() => setFindOpen(false)}
                className="text-ink-faint hover:text-ink-parchment cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Prose Sheet Leaf */}
          <article className="mx-auto max-w-[640px] rounded-lg bg-surface-card/30 border border-border-quiet/60 p-5 sm:p-7 text-ink-parchment shadow-sm">
            {/* Format bar — attached as a sleek subheading deck spanning edge-to-edge of the editor box (Matching real product MarkdownEditor) */}
            <div className="sticky top-0 z-20 -mx-5 -mt-5 mb-4 sm:-mx-7 sm:-mt-7 flex items-center justify-between border-b border-border-quiet/60 bg-surface-card/95 backdrop-blur-md px-3.5 py-1.5 rounded-t-lg transition-all select-none">
              <div className="flex items-center gap-1">
                <FormatButton label="Heading" onClick={() => applyFormat("heading")}>
                  <Heading2 className="h-3.5 w-3.5" />
                </FormatButton>
                <FormatButton label="Bold" onClick={() => applyFormat("bold")}>
                  <Bold className="h-3.5 w-3.5" />
                </FormatButton>
                <FormatButton label="Italic" onClick={() => applyFormat("italic")}>
                  <Italic className="h-3.5 w-3.5" />
                </FormatButton>
                <span aria-hidden className="mx-1 h-3.5 w-px bg-border-quiet/60" />
                <FormatButton label="Quote" onClick={() => applyFormat("quote")}>
                  <Quote className="h-3.5 w-3.5" />
                </FormatButton>
                <FormatButton label="Scene break" onClick={() => applyFormat("scene")}>
                  <Minus className="h-3.5 w-3.5" />
                </FormatButton>
              </div>
              <span className="hidden font-mono text-[8.5px] uppercase tracking-[0.16em] text-ink-faint/70 sm:inline">
                ⌘B bold · ⌘I italic
              </span>
            </div>

            <div className="flex items-baseline justify-between pb-2 border-b border-border-quiet/30">
              <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-wine-accent">
                Ch. {String(activeChapter).padStart(2, "0")} / 04
              </span>
              <span className="font-serif text-[10px] italic text-ink-faint">
                interactive live editor · click to type
              </span>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-3 w-full bg-transparent font-serif text-xl sm:text-2xl font-normal tracking-tight text-ink-parchment focus:outline-none border-b border-transparent focus:border-border-quiet pb-1"
            />

            <div aria-hidden className="mt-2.5 h-px w-8 bg-wine-crimson/50" />

            {/* Editable Prose Textarea — dynamic auto-expanding height so whole page scrolls naturally */}
            <div className="mt-4 space-y-3">
              <textarea
                ref={textareaRef}
                value={localProse}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
                    e.preventDefault();
                    applyFormat("bold");
                  } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
                    e.preventDefault();
                    applyFormat("italic");
                  }
                }}
                onChange={(e) => {
                  setLocalProse(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                className="w-full resize-none overflow-hidden bg-transparent font-serif text-[13px] leading-[1.8] text-ink-bone focus:outline-none selection:bg-wine-accent selection:text-white"
                placeholder="Write your chapter prose here..."
              />

              {/* Contradiction Visual Helper Bar */}
              {hasContradictionInProse && (
                <div
                  onClick={() => setPosture("review")}
                  className="cursor-pointer flex items-center justify-between rounded border border-wine-crimson/40 bg-wine-crimson/10 px-2.5 py-1.5 text-[10px] text-wine-crimson hover:bg-wine-crimson/20 transition-colors"
                >
                  <span className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-wider font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-wine-crimson animate-pulse" />
                    Contradiction Detected: &ldquo;withdrew the obsidian compass&rdquo;
                  </span>
                  <span className="font-mono text-[8px] uppercase underline">Review Case &rarr;</span>
                </div>
              )}
            </div>

            {/* Bottom Proof Metrics */}
            <div className="mt-5 flex items-center justify-between border-t border-border-quiet/40 pt-2.5 font-mono text-[8px] uppercase tracking-wider text-ink-faint">
              <span>{wordCount.toLocaleString()} words · {charCount} chars · {readingTimeMin} min</span>
              <span className={isDirty ? "text-severity-warning font-semibold" : "text-ink-ash"}>
                {isDirty ? "unsaved changes" : "saved · draft leaf"}
              </span>
            </div>
          </article>
        </main>

        {/* Right Margin: FindingNotes OR FindingCase */}
        {showNotes && (
          <aside className="w-56 sm:w-64 shrink-0 border-l border-border-quiet/80 bg-surface-subtle/20 flex flex-col justify-between p-2.5 overflow-y-auto">
            {posture === "write" ? (
              /* Writing Posture Margin Notes */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-border-quiet/60">
                  <span className="font-serif text-[11px] italic text-ink-parchment">
                    Notes
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider",
                      hasContradictionInProse
                        ? "bg-wine-crimson/20 text-wine-crimson font-semibold"
                        : "bg-surface-elevated text-ink-faint"
                    )}
                  >
                    {hasContradictionInProse ? "1 open" : "0 open"}
                  </span>
                </div>

                {hasContradictionInProse ? (
                  <div
                    onClick={() => setPosture("review")}
                    className="cursor-pointer group rounded-lg border border-wine-crimson/50 bg-wine-crimson/10 p-2.5 transition-all hover:bg-wine-crimson/15 hover:border-wine-crimson"
                  >
                    <div className="flex items-center justify-between text-[8.5px] font-mono uppercase tracking-wider text-wine-crimson">
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-wine-crimson animate-pulse" />
                        Custody Paradox
                      </span>
                      <span>¶ 3</span>
                    </div>

                    <p className="mt-1 font-serif text-[11px] leading-snug text-ink-parchment">
                      Marcus possesses the Obsidian Compass in Ch. 4
                    </p>

                    <p className="mt-1 text-[9.5px] leading-relaxed text-ink-ash line-clamp-2">
                      Relic was impounded in Vault #409 in Ch. 3. Zero custody transfers recorded.
                    </p>

                    <div className="mt-2 flex items-center justify-between font-mono text-[8px] text-wine-crimson group-hover:underline">
                      <span>Inspect Case</span>
                      <ChevronRight className="h-2.5 w-2.5" />
                    </div>
                  </div>
                ) : (
                  <div className="rounded border border-dashed border-border-quiet p-3 text-center">
                    <p className="font-serif text-[11px] italic text-ink-ash">
                      {editorResolved !== "unresolved" ? "Finding reconciled." : "No open findings here."}
                    </p>
                    <p className="mt-0.5 font-mono text-[8px] uppercase tracking-wider text-ink-faint">
                      Canon continuity verified
                    </p>
                    {editorResolved !== "unresolved" && (
                      <button
                        type="button"
                        onClick={onReset}
                        className="mt-2 rounded bg-surface-elevated px-2 py-0.5 font-mono text-[8px] text-ink-ash hover:text-ink-parchment uppercase cursor-pointer"
                      >
                        Reset Demo
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Review Posture: FindingCase Desk */
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-border-quiet/60">
                  <div className="flex items-center gap-1 text-[8.5px] font-mono uppercase tracking-wider text-wine-crimson">
                    <span className="h-1.5 w-1.5 rounded-full bg-wine-crimson" />
                    <span>Case Review</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPosture("write")}
                    className="rounded p-0.5 text-ink-faint hover:text-ink-parchment cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                <div className="space-y-1.5 text-[9px] font-mono">
                  <span className="text-[8px] uppercase tracking-wider text-ink-faint block">
                    Two Disagreeing Passages:
                  </span>

                  {/* Conflicting Passages */}
                  <div className="space-y-1.5">
                    <div className="rounded bg-surface-card border border-border-quiet p-2 text-ink-bone font-serif text-[10px] leading-relaxed">
                      <span className="block font-mono text-[7.5px] uppercase tracking-wider text-ink-faint pb-0.5">
                        Ch. 03 · Citadel Vault
                      </span>
                      &ldquo;Lysander logged the obsidian compass into vault register #409, sealing the iron latch.&rdquo;
                    </div>

                    <div className="rounded bg-wine-crimson/15 border border-wine-crimson/40 p-2 text-ink-parchment font-serif text-[10px] leading-relaxed">
                      <span className="block font-mono text-[7.5px] uppercase tracking-wider text-wine-crimson pb-0.5">
                        Ch. 04 · Current Draft
                      </span>
                      &ldquo;Marcus slipped his fingers into his inner coat pocket and withdrew the obsidian compass...&rdquo;
                    </div>
                  </div>
                </div>

                {/* Scribe Reasoning */}
                <div className="rounded bg-surface-card/60 p-2 border border-border-quiet/60">
                  <span className="font-mono text-[7.5px] uppercase tracking-wider text-ink-faint block mb-0.5">
                    Scribe Engine Finding:
                  </span>
                  <p className="font-serif text-[10px] italic text-ink-bone leading-snug">
                    Broken custody chain. Relic moved from locked vault to Marcus's pocket without transfer or burglary.
                  </p>
                </div>

                {/* Actions that directly mutate the prose in real time */}
                <div className="space-y-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onResolveReconcile();
                      setPosture("write");
                      toast.success("Mutated prose: Reconciled with Canon.", { duration: 2500 });
                    }}
                    className="flex w-full items-center justify-between rounded bg-wine-accent px-2 py-1.5 text-left text-white shadow-xs hover:bg-wine-crimson transition-all font-mono text-[8.5px] uppercase tracking-wider cursor-pointer"
                  >
                    <span>1. Reconcile with Canon</span>
                    <Check className="h-2.5 w-2.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onResolveTwist();
                      setPosture("write");
                      toast.success("Mutated prose: Recorded as syndicate counterfeit twist.", { duration: 2500 });
                    }}
                    className="flex w-full items-center justify-between rounded bg-surface-elevated border border-border-quiet px-2 py-1.5 text-left text-ink-parchment hover:bg-surface-card transition-all font-mono text-[8.5px] uppercase tracking-wider cursor-pointer"
                  >
                    <span>2. Intentional Twist</span>
                    <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-border-quiet/60 font-mono text-[8px] text-ink-faint">
              Deterministic Canon Guard
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
