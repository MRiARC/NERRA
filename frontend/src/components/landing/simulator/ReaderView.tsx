"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  Minus,
  Plus,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MANUSCRIPT_CHAPTERS,
  DEFAULT_CHAPTER_PROSE_MAP,
  DEFAULT_CHAPTER_4_PROSE,
} from "./mockData";
import { triggerAiPaywall, type AiAction } from "./aiNotice";

export interface ReaderViewProps {
  activeChapter: number;
  onSelectChapter: (ch: number) => void;
  prose?: string;
  onBackToOverview?: () => void;
  onBackToEditor?: () => void;
  onTriggerAiNotice?: (action: AiAction) => void;
}

export function ReaderView({
  activeChapter,
  onSelectChapter,
  prose,
  onBackToOverview,
  onBackToEditor,
  onTriggerAiNotice,
}: ReaderViewProps) {
  const [fontSize, setFontSize] = useState(14);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"context" | "slips" | "ask">("context");
  const [chatInput, setChatInput] = useState("");
  const [chatLog] = useState<Array<{ role: "user" | "scribe"; text: string }>>([
    {
      role: "scribe",
      text: "Ask about this chapter—who is in it, what it sets up, or what it contradicts.",
    },
  ]);

  const currentCh =
    MANUSCRIPT_CHAPTERS.find((c) => c.number === activeChapter) || MANUSCRIPT_CHAPTERS[3];

  const paragraphs = useMemo(() => {
    const raw = prose || DEFAULT_CHAPTER_PROSE_MAP[activeChapter] || DEFAULT_CHAPTER_4_PROSE;
    return raw.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  }, [prose, activeChapter]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatInput("");
    if (onTriggerAiNotice) {
      onTriggerAiNotice("ask");
    } else {
      triggerAiPaywall("ask");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-void select-none text-ink-parchment">
      {/* ===================================================================
          READING FURNITURE: Header bar matching reader/page.tsx
          =================================================================== */}
      <header className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-border-quiet/80 bg-surface-void/95 px-3 sm:px-4 text-[10px]">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onBackToOverview}
            className="text-ink-ash hover:text-ink-parchment transition-colors"
            title="Back to Overview"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>

          <span className="truncate font-mono text-[9px] uppercase tracking-wider text-ink-faint hidden sm:inline">
            The Brass Alchemist of Prague
          </span>
          <span className="hidden text-ink-faint/40 sm:inline">·</span>

          <select
            value={activeChapter}
            onChange={(e) => onSelectChapter(Number(e.target.value))}
            className="cursor-pointer truncate bg-transparent font-mono text-[9.5px] uppercase tracking-wider text-ink-ash focus:outline-none"
          >
            {MANUSCRIPT_CHAPTERS.map((ch) => (
              <option key={ch.number} value={ch.number} className="bg-surface-elevated text-ink-parchment">
                ch. {String(ch.number).padStart(2, "0")} — {ch.title}
              </option>
            ))}
          </select>
        </div>

        {/* Controls: Font stepper + Focus Mode */}
        <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-wider">
          <div className="flex items-center gap-1.5 rounded bg-surface-card px-1.5 py-0.5 border border-border-quiet/60">
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.max(12, s - 1))}
              className="text-ink-faint hover:text-ink-parchment"
              title="Smaller font"
            >
              <Minus className="h-2.5 w-2.5" />
            </button>
            <span className="tabular-nums text-ink-bone px-0.5">{fontSize}px</span>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.min(18, s + 1))}
              className="text-ink-faint hover:text-ink-parchment"
              title="Larger font"
            >
              <Plus className="h-2.5 w-2.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsFocusMode((f) => !f)}
            className={cn(
              "border-b pb-0.5 transition-colors",
              isFocusMode ? "border-wine-crimson text-ink-parchment" : "border-transparent text-ink-faint hover:text-ink-ash"
            )}
          >
            Just the page
          </button>
        </div>
      </header>

      {/* ===================================================================
          READER CANVAS: Book Measure + Synchronized Margin Notes
          =================================================================== */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Book Reading Measure — Smooth full scrollability */}
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6 overscroll-contain">
          <article className="mx-auto max-w-[520px]">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-wine-accent">
              Chapter {String(activeChapter).padStart(2, "0")}
            </p>

            <h1 className="mt-1.5 font-serif text-xl sm:text-2xl font-normal leading-tight text-ink-parchment">
              {currentCh.title}
            </h1>

            <p className="mt-1 font-mono text-[8.5px] uppercase tracking-wider text-ink-faint">
              {currentCh.word_count.toLocaleString()} words · synchronized canon margins
            </p>

            <div className="mt-3.5 border-t border-border-quiet/50 pt-4">
              <div style={{ fontSize: `${fontSize}px` }} className="space-y-[1.35em] leading-[1.8] text-ink-bone font-serif">
                {paragraphs.map((para, idx) => (
                  <p
                    key={idx}
                    className={
                      idx === 0
                        ? "first-letter:float-left first-letter:mr-2.5 first-letter:mt-0.5 first-letter:font-serif first-letter:text-[2.6em] first-letter:leading-[0.8] first-letter:text-wine-crimson"
                        : undefined
                    }
                  >
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </article>
        </main>

        {/* Right Margin Inspector */}
        {!isFocusMode && (
          <aside className="w-60 sm:w-64 shrink-0 border-l border-border-quiet/80 bg-surface-subtle/15 p-2.5 flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Tab Selector */}
              <div className="flex items-center gap-1 border-b border-border-quiet/60 pb-1.5 font-mono text-[8.5px] uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setInspectorTab("context")}
                  className={cn(
                    "flex-1 py-0.5 text-center rounded transition-colors",
                    inspectorTab === "context"
                      ? "bg-surface-elevated text-ink-parchment font-medium"
                      : "text-ink-faint hover:text-ink-ash"
                  )}
                >
                  Context
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab("slips")}
                  className={cn(
                    "flex-1 py-0.5 text-center rounded transition-colors",
                    inspectorTab === "slips"
                      ? "bg-wine-crimson/20 text-wine-crimson font-medium"
                      : "text-ink-faint hover:text-ink-ash"
                  )}
                >
                  Slips (1)
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab("ask")}
                  className={cn(
                    "flex-1 py-0.5 text-center rounded transition-colors",
                    inspectorTab === "ask"
                      ? "bg-surface-elevated text-ink-parchment font-medium"
                      : "text-ink-faint hover:text-ink-ash"
                  )}
                >
                  Ask Scribe
                </button>
              </div>

              {/* Tab 1: Context */}
              {inspectorTab === "context" && (
                <div className="mt-2.5 space-y-3">
                  <div>
                    <span className="font-mono text-[8px] uppercase tracking-wider text-ink-faint block mb-1">
                      Present In Chapter:
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between rounded bg-surface-card px-2 py-1 text-[10px]">
                        <span className="font-serif text-ink-parchment">Marcus Vance</span>
                        <span className="font-mono text-[7.5px] uppercase text-emerald-400">Protagonist</span>
                      </div>
                      <div className="flex items-center justify-between rounded bg-surface-card px-2 py-1 text-[10px]">
                        <span className="font-serif text-ink-parchment">Captain Lysander</span>
                        <span className="font-mono text-[7.5px] uppercase text-sky-400">Commander</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="font-mono text-[8px] uppercase tracking-wider text-ink-faint block mb-1">
                      Active Plot Thread:
                    </span>
                    <div className="rounded bg-surface-card p-2 border border-border-quiet text-[9.5px]">
                      <p className="font-serif text-ink-parchment">Lodestone Compass Calibration</p>
                      <p className="mt-0.5 text-ink-ash text-[8.5px]">Master Aldous tuned needle to subterranean silver lode.</p>
                      <span className="mt-1 inline-block font-mono text-[7.5px] text-wine-crimson uppercase">
                        Spans Ch. 1 &rarr; Ch. 4
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Slips */}
              {inspectorTab === "slips" && (
                <div className="mt-2.5 space-y-2">
                  <div className="rounded border border-wine-crimson/50 bg-wine-crimson/10 p-2 text-[9.5px]">
                    <div className="flex items-center gap-1 font-mono text-[8px] uppercase text-wine-crimson font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-wine-crimson" />
                      <span>Custody Paradox</span>
                    </div>
                    <p className="mt-1 font-serif text-[10.5px] text-ink-parchment leading-snug">
                      Compass drawn while locked in Vault #409
                    </p>
                    <p className="mt-1 font-serif italic text-ink-ash text-[9px]">
                      &ldquo;Marcus withdrew the obsidian compass from his inner coat pocket...&rdquo;
                    </p>
                    {onBackToEditor && (
                      <button
                        type="button"
                        onClick={onBackToEditor}
                        className="mt-2 w-full rounded bg-wine-crimson/30 hover:bg-wine-crimson/50 py-1 text-center font-mono text-[8px] uppercase tracking-wider text-white transition-colors"
                      >
                        Open In Editor
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Ask Scribe */}
              {inspectorTab === "ask" && (
                <div className="mt-2 flex flex-col h-[280px] justify-between">
                  <div className="space-y-1.5 overflow-y-auto pr-1">
                    {chatLog.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          "rounded p-1.5 text-[9.5px] leading-relaxed",
                          msg.role === "user"
                            ? "bg-wine-accent/20 text-ink-parchment text-right ml-4 font-sans"
                            : "bg-surface-card text-ink-bone mr-4 font-serif italic"
                        )}
                      >
                        {msg.text}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendChat} className="mt-2 flex items-center gap-1">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask Scribe..."
                      className="flex-1 rounded bg-surface-card border border-border-quiet px-2 py-1 text-[9.5px] text-ink-parchment placeholder:text-ink-faint focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded bg-wine-crimson p-1 text-white hover:bg-wine-accent transition-colors"
                    >
                      <Send className="h-2.5 w-2.5" />
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border-quiet/60 font-mono text-[8px] text-ink-faint">
              Synchronized Margin Notes
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
