"use client";

import React, { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import type { Issue } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  SEVERITY_DOT,
  isOpen,
  orderByParagraph,
  paragraphOfQuote,
  quoteForChapter,
  statusSentence,
  typeLabel,
} from "./findings";

export interface FindingNotesProps {
  chapterNumber: number;
  issues: Issue[];
  content: string;
  activeIssueId: string | null;
  isProcessing?: boolean;
  /** Enter review on this finding. */
  onOpen: (issue: Issue) => void;
  onOpenBoard: () => void;
}

/**
 * The margin in writing posture: an index, not a case file. Notes are ordered
 * the way the chapter reads, and nothing here asks for a decision — opening one
 * widens the desk.
 */
export function FindingNotes({
  chapterNumber,
  issues,
  content,
  activeIssueId,
  isProcessing = false,
  onOpen,
  onOpenBoard,
}: FindingNotesProps) {
  const chapterIssues = useMemo(
    () =>
      issues.filter((issue) =>
        issue.evidence?.some((item) => item.chapter === chapterNumber)
      ),
    [issues, chapterNumber]
  );

  const ordered = useMemo(
    () => orderByParagraph(chapterIssues, content, chapterNumber),
    [chapterIssues, content, chapterNumber]
  );

  const open = chapterIssues.filter(isOpen).length;
  const settled = chapterIssues.length - open;
  const bookOpen = issues.filter(isOpen).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-serif text-[13px] italic text-ink-parchment">Notes</p>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-wine-crimson font-medium">
            {open} open
          </span>
        </div>
        <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-faint">
          {chapterIssues.length === 0
            ? "nothing flagged here"
            : `${settled} of ${chapterIssues.length} settled`}
        </p>
      </div>

      <ol className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2.5 pb-3">
        {ordered.map((issue) => {
          const paragraph = paragraphOfQuote(content, quoteForChapter(issue, chapterNumber));
          const isActive = issue.id === activeIssueId;
          const settledIssue = !isOpen(issue);

          return (
            <li key={issue.id}>
              <button
                type="button"
                data-finding={issue.id}
                onClick={() => onOpen(issue)}
                aria-pressed={isActive}
                title="Open this finding"
                className={cn(
                  "group flex w-full flex-col gap-1.5 rounded-lg p-2.5 text-left transition-all",
                  isActive
                    ? "bg-white/[0.08] shadow-sm"
                    : "bg-white/[0.02] hover:bg-white/[0.05]"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        settledIssue
                          ? "bg-ink-faint/40"
                          : SEVERITY_DOT[issue.severity] ?? "bg-ink-faint",
                        issue.severity === "red" && !settledIssue && "shadow-[0_0_6px_rgba(244,63,94,0.6)]"
                      )}
                    />
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-faint font-medium">
                      {typeLabel(issue)}
                    </span>
                  </div>
                  <span className="rounded bg-surface-void/70 px-1.5 py-0.5 font-mono text-[8.5px] tabular-nums text-ink-ash">
                    {paragraph ? `¶${paragraph}` : "—"}
                  </span>
                </div>

                <span
                  className={cn(
                    "line-clamp-2 font-serif text-[12px] leading-snug",
                    settledIssue
                      ? "text-ink-ash/60 line-through"
                      : isActive
                      ? "text-ink-parchment font-medium"
                      : "text-ink-bone group-hover:text-ink-parchment"
                  )}
                >
                  {issue.description}
                </span>

                {settledIssue && (
                  <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-ink-faint/70">
                    {statusSentence(issue)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {ordered.length === 0 && (
        <p className="px-4 pb-4 font-serif text-[12px] italic leading-relaxed text-ink-ash/80">
          {isProcessing
            ? "The re-reading is in progress. Findings will appear here."
            : "The checker found nothing here that argues with the book."}
        </p>
      )}

      <button
        type="button"
        onClick={onOpenBoard}
        className="mt-auto flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-left font-serif text-[12px] italic text-ink-ash transition-colors hover:bg-surface-subtle/60 hover:text-ink-parchment"
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-wine-crimson" />
          <span>Whole book · {bookOpen} open</span>
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-ink-faint transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}
