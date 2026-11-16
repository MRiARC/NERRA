"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Issue } from "@/lib/types";
import { cn, getErrorMessage } from "@/lib/utils";
import { SEVERITY_WORD, evidenceChapters, statusSentence, typeLabel } from "./findings";

const DECISIONS = [
  {
    id: "accepted" as const,
    label: "A mistake to fix",
    hint: "An accident of drafting. It stays on the list until the page changes.",
  },
  {
    id: "intentional" as const,
    label: "Intentional",
    hint: "A twist, a lie, an unreliable memory. Recorded as yours, not an error.",
  },
  {
    id: "rejected" as const,
    label: "Not an issue",
    hint: "The checker misread the page. Dismiss it from the queue.",
  },
];

type DecisionId = (typeof DECISIONS)[number]["id"];

export interface FindingCaseProps {
  projectId: string;
  issue: Issue;
  position?: { index: number; total: number };
  onPrev?: () => void;
  onNext?: () => void;
  /** Jump the page to one side of the case. */
  onOpenChapter: (issue: Issue, chapter: number) => void;
  onClose?: () => void;
  /** Board only: leave the board and open this case beside the prose. */
  onOpenInPage?: () => void;
  variant?: "panel" | "board";
}

/**
 * One finding, read in full: the two passages that disagree, the checker's
 * reading, and the decision. The passages sit side by side when there is room,
 * joined by a rule, because the whole point is seeing both at once.
 */
export function FindingCase({
  projectId,
  issue,
  position,
  onPrev,
  onNext,
  onOpenChapter,
  onClose,
  onOpenInPage,
  variant = "panel",
}: FindingCaseProps) {
  const queryClient = useQueryClient();
  const [isPatching, setIsPatching] = useState(false);
  const [isReasoning, setIsReasoning] = useState(false);
  const [readingOpen, setReadingOpen] = useState(false);

  const current = issue.status === "open" ? null : issue.status;
  const activeDecision = DECISIONS.find((decision) => decision.id === current);
  const chapters = evidenceChapters(issue);
  const reading = issue.ai_reasoning?.trim() ?? "";
  const canCollapse = reading.length > 130;

  const decide = async (next: DecisionId | "open") => {
    setIsPatching(true);
    try {
      await api.story.patchIssue(projectId, issue.id, next);
      await queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });

      const labels: Record<string, string> = {
        accepted: "Marked as a slip to fix.",
        intentional: "Kept as intentional.",
        rejected: "Dismissed.",
        open: "Back in the queue.",
      };
      toast.success(labels[next]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not update that finding."));
    } finally {
      setIsPatching(false);
    }
  };

  const explain = async () => {
    setIsReasoning(true);
    try {
      await api.story.reasonIssue(projectId, issue.id);
      await queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
      toast.success("The checker has written its reading.");
      setReadingOpen(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not read that finding again."));
    } finally {
      setIsReasoning(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border-quiet/40 px-4 py-2.5">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-ink-parchment"
          >
            <ArrowLeft className="h-3 w-3" />
            Writing
          </button>
        ) : (
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
            Case
          </span>
        )}

        <div className="flex items-center gap-1">
          {onOpenInPage && (
            <button
              type="button"
              onClick={onOpenInPage}
              className="mr-2 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-ash transition-colors hover:text-ink-parchment"
            >
              Open in page
              <ExternalLink className="h-2.5 w-2.5" />
            </button>
          )}

          {position && (
            <span className="mr-1 font-mono text-[9px] tabular-nums text-ink-faint">
              {position.index + 1} / {position.total}
            </span>
          )}

          <button
            type="button"
            onClick={onPrev}
            disabled={!onPrev}
            aria-label="Previous finding"
            className="rounded p-1 text-ink-faint transition-colors hover:text-ink-parchment disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!onNext}
            aria-label="Next finding"
            className="rounded p-1 text-ink-faint transition-colors hover:text-ink-parchment disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {variant === "board" && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close findings"
              className="ml-1 rounded p-1 text-ink-faint transition-colors hover:text-ink-parchment"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
          <span>{typeLabel(issue)}</span>
          <span aria-hidden className="text-ink-faint/40">
            ·
          </span>
          <span>{SEVERITY_WORD[issue.severity] ?? "recorded"}</span>
          {chapters.length > 0 && (
            <>
              <span aria-hidden className="text-ink-faint/40">
                ·
              </span>
              <span className="tabular-nums">
                ch. {chapters[0]}
                {chapters.length > 1 ? ` ↔ ${chapters[chapters.length - 1]}` : ""}
              </span>
            </>
          )}
          {issue.status && issue.status !== "open" && (
            <span className="ml-auto rounded-full border border-border-quiet px-2 py-0.5 text-[8px] tracking-[0.12em] text-ink-ash">
              {statusSentence(issue)}
            </span>
          )}
        </div>

        <h2 className="mt-2.5 font-serif text-[19px] leading-snug text-ink-parchment">
          {issue.description}
        </h2>

        {(issue.related_entities?.length ?? 0) > 0 && (
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-ash/80">
            {issue.related_entities?.join(" · ")}
          </p>
        )}

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-border-quiet">
          {[0, 1].map((slot) => {
            const evidence = issue.evidence?.[slot];
            const chapter = evidence?.chapter;
            return (
              <div
                key={slot}
                className={cn("min-w-0 border-t border-border-quiet pt-3", slot === 0 ? "sm:pr-5" : "sm:border-t-0 sm:pl-5")}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-faint">
                    {slot === 0 ? "As it was first said" : "As it is said later"}
                  </p>
                  {chapter ? (
                    <button
                      type="button"
                      onClick={() => onOpenChapter(issue, chapter)}
                      className="inline-flex shrink-0 items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-ash transition-colors hover:text-ink-parchment"
                    >
                      <span className="tabular-nums">ch. {chapter}</span>
                      <ArrowRight className="h-2.5 w-2.5" />
                    </button>
                  ) : (
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-faint/70">
                      unrecorded
                    </span>
                  )}
                </div>

                <blockquote
                  className={cn(
                    "mt-2 font-serif text-[13.5px] italic leading-relaxed",
                    slot === 1 ? "text-ink-parchment" : "text-ink-bone"
                  )}
                >
                  {evidence?.quote
                    ? `“${evidence.quote}”`
                    : "No quote was recorded for this side."}
                </blockquote>
              </div>
            );
          })}
        </div>

        <div className="mt-5 border-t border-border-quiet/60 pt-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-ink-faint">
              The checker&apos;s reading
            </p>
            <button
              type="button"
              onClick={explain}
              disabled={isReasoning}
              className="inline-flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-ash transition-colors hover:text-ink-parchment disabled:opacity-50"
            >
              {isReasoning ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              ) : (
                <RefreshCw className="h-2.5 w-2.5" />
              )}
              {reading ? "read again" : "explain"}
            </button>
          </div>

          <p
            className={cn(
              "mt-2 max-w-[62ch] font-serif text-[13px] leading-relaxed text-ink-bone",
              !readingOpen && canCollapse && "line-clamp-2"
            )}
          >
            {reading ||
              "The checker hasn't explained this one yet. Ask it to read both passages against the story bible."}
          </p>

          {canCollapse && (
            <button
              type="button"
              onClick={() => setReadingOpen((open) => !open)}
              className="mt-1.5 font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-ink-ash"
            >
              {readingOpen ? "show less" : "read in full"}
            </button>
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-border-quiet/50 bg-surface-subtle/40 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-ink-faint">
            Your call
          </p>
          {issue.status && issue.status !== "open" && (
            <button
              type="button"
              onClick={() => decide("open")}
              disabled={isPatching}
              className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-faint underline decoration-border-subtle underline-offset-4 transition-colors hover:text-ink-parchment disabled:opacity-50"
            >
              put it back
            </button>
          )}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-surface-elevated/70 p-1">
          {DECISIONS.map((decision) => {
            const isActive = issue.status === decision.id;
            return (
              <button
                key={decision.id}
                type="button"
                onClick={() => decide(decision.id)}
                disabled={isPatching}
                aria-pressed={isActive}
                className={cn(
                  "rounded-md px-2 py-1.5 text-center font-serif text-[12px] leading-tight transition-colors disabled:opacity-50",
                  isActive
                    ? "bg-surface-card text-ink-parchment shadow-sm"
                    : "text-ink-ash hover:text-ink-bone"
                )}
              >
                {decision.label}
              </button>
            );
          })}
        </div>

        <p className="mt-1.5 min-h-[14px] font-serif text-[11px] italic leading-snug text-ink-faint">
          {activeDecision?.hint ?? "Pick what this is, and the queue learns."}
        </p>
      </footer>
    </div>
  );
}
