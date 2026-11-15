"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ChapterSummary, Issue } from "@/lib/types";

interface ManuscriptRulerProps {
  chapters: ChapterSummary[];
  issues: Issue[];
  selectedChapter: number | null;
  onSelect: (chapterNumber: number | null) => void;
}

type ChapterFindings = { critical: number; minor: number };

/**
 * One segment per chapter, width proportional to its word count, coloured by
 * the worst finding recorded in it. This replaces both the scorecards and the
 * chapter tile matrix: volume, integrity, and navigation in a single shape.
 */
export function ManuscriptRuler({
  chapters,
  issues,
  selectedChapter,
  onSelect,
}: ManuscriptRulerProps) {
  const findingsByChapter = useMemo(() => {
    const map = new Map<number, ChapterFindings>();
    for (const issue of issues) {
      if (issue.status !== "open") continue;
      const chaptersInIssue = new Set((issue.evidence || []).map((e) => e.chapter));
      for (const chapterNumber of chaptersInIssue) {
        const entry = map.get(chapterNumber) ?? { critical: 0, minor: 0 };
        if (issue.severity === "red") entry.critical += 1;
        else entry.minor += 1;
        map.set(chapterNumber, entry);
      }
    }
    return map;
  }, [issues]);

  const affectedChapters = findingsByChapter.size;

  if (chapters.length === 0) return null;

  return (
    <div className="select-none">
      <div className="flex items-end gap-[2px] pt-10 pb-2">
        {chapters.map((chapter) => {
          const findings = findingsByChapter.get(chapter.number);
          const critical = findings?.critical ?? 0;
          const minor = findings?.minor ?? 0;
          const total = critical + minor;
          const isActive = selectedChapter !== null && chapter.number === selectedChapter;

          return (
            <button
              key={chapter.number}
              type="button"
              onClick={() => onSelect(isActive ? null : chapter.number)}
              aria-label={`Chapter ${chapter.number}: ${chapter.title}, ${
                total > 0 ? `${total} open findings` : "no open findings"
              }`}
              aria-current={isActive ? "true" : undefined}
              style={{ flexGrow: Math.max(chapter.word_count || 1, 1), flexBasis: 0 }}
              className={cn(
                "group relative min-w-[8px] focus:outline-none transition-all duration-200",
                isActive ? "z-20 -translate-y-1" : "z-10 opacity-70 hover:opacity-100"
              )}
            >
              {/* Active floating indicator pill above the box */}
              {isActive && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 whitespace-nowrap rounded-md bg-surface-elevated px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-parchment border border-border-prominent shadow-[0_4px_16px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in-95 duration-150"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-wine-crimson shadow-[0_0_6px_rgba(244,63,94,0.9)]" />
                  <span>Ch. {String(chapter.number).padStart(2, "0")}</span>
                </span>
              )}

              {/* Hover label (when not active) */}
              {!isActive && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-md border border-border-subtle bg-surface-elevated px-2.5 py-1.5 text-left opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                    Ch. {String(chapter.number).padStart(2, "0")}
                  </span>
                  <span className="mt-0.5 block truncate font-serif text-xs text-ink-parchment">
                    {chapter.title}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[9px] uppercase tracking-[0.12em] text-ink-ash">
                    {total > 0
                      ? `${critical} major · ${minor} minor`
                      : chapter.word_count.toLocaleString() + " words"}
                  </span>
                </span>
              )}

              <span
                className={cn(
                  "block w-full rounded-[2px] transition-all duration-200",
                  isActive ? "h-11" : "h-10",
                  critical > 0
                    ? "bg-wine-crimson/80 group-hover:bg-wine-crimson"
                    : minor > 0
                    ? "bg-severity-warning/70 group-hover:bg-severity-warning"
                    : "bg-border-prominent group-hover:bg-ink-faint",
                  isActive &&
                    "brightness-125 ring-2 ring-ink-parchment ring-offset-2 ring-offset-surface-void shadow-[0_0_16px_rgba(245,245,240,0.45)]"
                )}
              />

              {/* Active downward pointing caret */}
              {isActive && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center"
                >
                  <span className="h-0 w-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-ink-parchment drop-shadow-sm" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Scale + legend */}
      <div className="mt-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
        <span>Ch. 01</span>
        <span className="hidden sm:inline">
          {affectedChapters > 0
            ? `${affectedChapters} of ${chapters.length} chapters carry findings`
            : `${chapters.length} chapters · nothing contradicts itself`}
        </span>
        <span>Ch. {String(chapters[chapters.length - 1].number).padStart(2, "0")}</span>
      </div>
    </div>
  );
}
