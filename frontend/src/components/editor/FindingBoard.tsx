"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Issue } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FindingCase } from "./FindingCase";
import {
  SEVERITY_DOT,
  chapterFor,
  evidenceChapters,
  isOpen,
  statusSentence,
  typeLabel,
} from "./findings";

export interface FindingBoardProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  issues: Issue[];
  chapterNumber: number;
  /** Leave the board and open this case beside the prose. */
  onOpenInPage: (issue: Issue, chapter: number) => void;
}

/**
 * The whole book, at full width: a queue for triage and one case open beside it.
 * This is a board you visit, not a column you live in.
 */
export function FindingBoard({
  open,
  onClose,
  projectId,
  issues,
  chapterNumber,
  onOpenInPage,
}: FindingBoardProps) {
  const [status, setStatus] = useState<"open" | "all">("open");
  const [severity, setSeverity] = useState<"all" | "red" | "yellow" | "blue">("all");
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const types = useMemo(
    () => Array.from(new Set(issues.map((issue) => issue.type).filter(Boolean))),
    [issues]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return issues.filter((issue) => {
      if (status === "open" && !isOpen(issue)) return false;
      if (severity !== "all" && issue.severity !== severity) return false;
      if (type !== "all" && issue.type !== type) return false;
      if (!needle) return true;
      return (
        issue.description.toLowerCase().includes(needle) ||
        issue.evidence?.some((item) => item.quote?.toLowerCase().includes(needle)) ||
        issue.related_entities?.some((entity) => entity.toLowerCase().includes(needle))
      );
    });
  }, [issues, status, severity, type, query]);

  const activeIssue =
    filtered.find((issue) => issue.id === selectedId) ?? filtered[0] ?? null;
  const activeIndex = activeIssue
    ? filtered.findIndex((issue) => issue.id === activeIssue.id)
    : -1;

  const openCount = issues.filter(isOpen).length;
  const settledCount = issues.length - openCount;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-void/[0.98] backdrop-blur-sm">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border-quiet/50 px-5 py-3.5 sm:px-10">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">
            Whole book
          </p>
          <h2 className="mt-0.5 font-serif text-[24px] leading-tight text-ink-parchment">
            Findings
          </h2>
        </div>

        <div className="flex items-center gap-5">
          <p className="hidden font-serif text-[13px] italic text-ink-ash sm:block">
            {openCount} open · {settledCount} settled
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close findings"
            className="rounded-md p-2 text-ink-faint transition-colors hover:bg-surface-elevated hover:text-ink-parchment"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-b border-border-quiet/40 px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.14em] sm:px-10">
        <div className="flex items-center gap-4">
          {[
            { id: "open" as const, label: `open ${openCount}` },
            { id: "all" as const, label: `every finding ${issues.length}` },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatus(filter.id)}
              aria-pressed={status === filter.id}
              className={cn(
                "border-b pb-1 transition-colors",
                status === filter.id
                  ? "border-wine-crimson text-ink-parchment"
                  : "border-transparent text-ink-faint hover:text-ink-ash"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-ink-faint">
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value as typeof severity)}
            aria-label="Filter by weight"
            className="cursor-pointer bg-transparent uppercase tracking-[0.12em] text-ink-ash focus:outline-none"
          >
            <option value="all" className="bg-surface-elevated">
              any weight
            </option>
            <option value="red" className="bg-surface-elevated">
              pulls apart
            </option>
            <option value="yellow" className="bg-surface-elevated">
              worth a look
            </option>
            <option value="blue" className="bg-surface-elevated">
              style
            </option>
          </select>

          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label="Filter by kind"
            className="max-w-[180px] cursor-pointer bg-transparent uppercase tracking-[0.12em] text-ink-ash focus:outline-none"
          >
            <option value="all" className="bg-surface-elevated">
              every kind
            </option>
            {types.map((option) => (
              <option key={option} value={option} className="bg-surface-elevated">
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 border-b border-border-quiet pb-1 focus-within:border-border-prominent">
            <Search className="h-3 w-3 text-ink-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="search the pages"
              className="w-44 border-0 bg-transparent font-mono text-[9px] uppercase tracking-[0.12em] text-ink-parchment placeholder:text-ink-faint/70 focus:outline-none"
            />
          </label>

          <span className="tabular-nums text-ink-faint/70">{filtered.length}</span>
        </div>
      </div>

      {issues.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="font-serif text-xl text-ink-parchment">
            Nothing has been flagged yet.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-10">
          <div className="mx-auto grid h-full max-w-[1440px] grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-10">
            <ol className="min-h-0 lg:overflow-y-auto lg:border-r lg:border-border-quiet/40 lg:pr-7">
              {filtered.map((issue) => {
                const isActive = issue.id === activeIssue?.id;
                const chapters = evidenceChapters(issue);
                return (
                  <li key={issue.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(issue.id)}
                      aria-pressed={isActive}
                      className={cn(
                        "flex w-full items-start gap-2.5 border-b border-border-quiet/40 px-2 py-2.5 text-left transition-colors",
                        isActive ? "bg-surface-elevated/70" : "hover:bg-surface-elevated/40"
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full",
                          isOpen(issue)
                            ? SEVERITY_DOT[issue.severity] ?? "bg-ink-faint"
                            : "bg-ink-faint/40"
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block line-clamp-2 font-serif text-[13px] leading-snug",
                            isActive ? "text-ink-parchment" : "text-ink-bone"
                          )}
                        >
                          {issue.description}
                        </span>
                        <span className="mt-1 block truncate font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-faint">
                          {typeLabel(issue)}
                          {chapters.length > 0
                            ? ` · ch. ${chapters[0]}${
                                chapters.length > 1 ? ` ↔ ${chapters[chapters.length - 1]}` : ""
                              }`
                            : ""}
                          {!isOpen(issue) ? ` · ${statusSentence(issue)}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}

              {filtered.length === 0 && (
                <p className="px-2 py-10 font-serif text-[13px] italic text-ink-ash">
                  Nothing matches those filters.
                </p>
              )}
            </ol>

            <div className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-xl border border-border-quiet/40 bg-surface-card/30">
              {activeIssue ? (
                <FindingCase
                  variant="board"
                  projectId={projectId}
                  issue={activeIssue}
                  position={{ index: activeIndex, total: filtered.length }}
                  onPrev={
                    activeIndex > 0
                      ? () => setSelectedId(filtered[activeIndex - 1].id)
                      : undefined
                  }
                  onNext={
                    activeIndex >= 0 && activeIndex < filtered.length - 1
                      ? () => setSelectedId(filtered[activeIndex + 1].id)
                      : undefined
                  }
                  onOpenChapter={(issue, chapter) =>
                    onOpenInPage(issue, chapter || chapterFor(issue, chapterNumber))
                  }
                  onOpenInPage={() =>
                    onOpenInPage(activeIssue, chapterFor(activeIssue, chapterNumber))
                  }
                />
              ) : (
                <p className="px-6 py-16 font-serif text-[14px] italic text-ink-ash">
                  Pick a finding to read both sides of it.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
