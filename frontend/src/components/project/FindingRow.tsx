"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Issue } from "@/lib/types";

interface FindingRowProps {
  issue: Issue;
  index: number;
  projectId: string;
}

const TYPE_LABELS: Record<string, string> = {
  contradiction: "Contradiction",
  knowledge_violation: "Knowledge violation",
  dangling_object: "Dangling object",
  spatiotemporal_conflict: "Timeline conflict",
  custody_paradox: "Custody paradox",
  world_rule_violation: "World-rule violation",
  continuity_note: "Continuity note",
};

/**
 * A finding as an editor's margin note: number, chapter, the quoted line, and
 * a plain sentence. No IDs, no severity badges — the number leads.
 */
export function FindingRow({ issue, index, projectId }: FindingRowProps) {
  const firstEvidence = issue.evidence?.[0];
  const chapter = firstEvidence?.chapter;
  const quote = firstEvidence?.quote?.trim();
  const isCritical = issue.severity === "red";
  const typeLabel = TYPE_LABELS[issue.type] ?? issue.type.replace(/_/g, " ");

  return (
    <div className="group grid grid-cols-[auto_1fr] gap-x-4 border-b border-border-quiet py-5 sm:gap-x-6">
      <div className="flex flex-col items-start gap-1 pt-0.5">
        <span className="font-mono text-[10px] tabular-nums text-ink-faint">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full ${
            isCritical ? "bg-severity-contradiction" : "bg-severity-warning"
          }`}
        />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {chapter ? (
            <Link
              href={`/projects/${projectId}/reader?chapter=${chapter}`}
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-ash transition-colors hover:text-ink-parchment"
            >
              Ch. {String(chapter).padStart(2, "0")}
            </Link>
          ) : null}
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            {typeLabel}
          </span>
        </div>

        {quote ? (
          <blockquote className="mt-2 max-w-[68ch] border-l-2 border-border-prominent pl-3 font-serif text-[15px] italic leading-relaxed text-ink-bone">
            &ldquo;{quote.length > 180 ? `${quote.slice(0, 180)}…` : quote}&rdquo;
          </blockquote>
        ) : null}

        <p className="mt-2 max-w-[72ch] text-[13px] leading-relaxed text-ink-bone">
          {issue.description}
        </p>

        <Link
          href={`/projects/${projectId}/editor?scope=book&issue=${issue.id}`}
          className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint transition-colors duration-200 hover:text-ink-parchment group-hover:text-ink-ash"
        >
          <span>Review</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
