"use client";

import React from "react";
import { GitCommit, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const SNAPSHOTS = [
  {
    version: "v1.2",
    tag: "Current Live",
    time: "2 minutes ago",
    commit: "2eee607",
    title: "Act II Revisions & Compass Custody Alignment",
    diff: "+320 words · 0 lost characters · 1 custody paradox identified",
    isCurrent: true,
  },
  {
    version: "v1.1",
    tag: "Archived",
    time: "1 hour ago",
    commit: "a8af068",
    title: "Chapter 3 Banquet Splitter Normalization",
    diff: "+140 words · 4 characters updated · 0 lost characters",
    isCurrent: false,
  },
  {
    version: "v1.0",
    tag: "Archived",
    time: "Yesterday at 18:30",
    commit: "fc7fd6f",
    title: "Initial Manuscript Import: The Brass Alchemist of Prague",
    diff: "12,160 words · 4 chapters · Ingestion baseline established",
    isCurrent: false,
  },
];

export function VersionsView() {
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-surface-void select-none px-3 py-3 sm:px-6 sm:py-4 text-ink-parchment">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border-quiet/80 pb-2.5">
        <div>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-wine-accent">
            Archival
          </span>
          <h2 className="font-serif text-lg sm:text-xl font-medium tracking-tight text-ink-parchment mt-0.5">
            Version History &amp; Snapshots
          </h2>
          <p className="mt-0.5 font-serif text-[11px] italic text-ink-bone">
            Manuscript snapshots, word count diffs, and lossless rollback checkpoints.
          </p>
        </div>
      </div>

      <div className="mt-3.5 space-y-2.5">
        {SNAPSHOTS.map((snap) => (
          <div
            key={snap.version}
            className="p-2.5 rounded-lg border border-border-quiet/80 bg-surface-card/30 hover:bg-surface-card/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px]"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-wider">
                <span className="font-bold text-wine-accent">{snap.version}</span>
                <span className="text-ink-faint">·</span>
                <span className="flex items-center gap-1 text-ink-ash">
                  <GitCommit className="w-2.5 h-2.5" />
                  <span>{snap.commit}</span>
                </span>
                <span className="text-ink-faint">·</span>
                <span className="text-ink-faint">{snap.time}</span>
              </div>

              <h4 className="mt-1 font-serif text-xs font-medium text-ink-parchment">
                {snap.title}
              </h4>

              <p className="mt-0.5 font-mono text-[8.5px] text-ink-ash">
                {snap.diff}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {snap.isCurrent ? (
                <span className="rounded bg-wine-crimson/20 border border-wine-crimson/40 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-wine-crimson font-semibold">
                  Live Active
                </span>
              ) : (
                <button
                  type="button"
                  className="flex items-center gap-1 rounded bg-surface-elevated px-2 py-1 font-mono text-[8px] uppercase tracking-wider text-ink-ash hover:text-ink-parchment transition-colors"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Rollback</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
