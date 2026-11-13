"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ChapterSummary, Issue } from "@/lib/types";

interface ManuscriptRulerProps {
  chapters: ChapterSummary[];
  issues: Issue[];
  selectedChapter: number | null;
  onSelect: (chapterNumber: number) => void;
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
  const activeChapter = selectedChapter ?? chapters[0]?.number ?? null;

  if (chapters.length === 0) return null;

  return (
    <div className="select-none">
      <div className="flex items-end gap-[2px] pt-11">
        {chapters.map((chapter) => {
          const findings = findingsByChapter.get(chapter.number);
          const critical = findings?.critical ?? 0;
          const minor = findings?.minor ?? 0;
          const total = critical + minor;
          const isActive = chapter.number === activeChapter;

          return (
            <button
              key={chapter.number}
              type="button"
              onClick={() => onSelect(chapter.number)}
              aria-label={`Chapter ${chapter.number}: ${chapter.title}, ${
                total > 0 ? `${total} open findings` : "no open findings"
              }`}
              aria-current={isActive ? "true" : undefined}
              style={{ flexGrow: Math.max(chapter.word_count || 1, 1), flexBasis: 0 }}
              className="group relative min-w-[6px] focus:outline-none"
            >
              {/* Hover label */}
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

              <span
                className={cn(
                  "block h-10 w-full rounded-[2px] transition-all duration-200",
                  critical > 0
                    ? "bg-wine-crimson/65 group-hover:bg-wine-crimson"
                    : minor > 0
                    ? "bg-severity-warning/55 group-hover:bg-severity-warning/80"
                    : "bg-border-prominent group-hover:bg-ink-faint",
                  isActive && "ring-2 ring-wine-crimson/50 ring-offset-2 ring-offset-surface-void"
                )}
              />
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
