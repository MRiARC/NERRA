"use client";

import React, { useState } from "react";
import { MOCK_PLOT_THREADS } from "./mockData";
import { GitPullRequest, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const GROUPS = [
  { id: "all", label: "All (5)" },
  { id: "open", label: "Still Running" },
  { id: "resolved", label: "Paid Off" },
  { id: "abandoned", label: "Dropped" },
  { id: "red_herring", label: "Red Herrings" },
];

export function PlotThreadsView() {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const filtered = MOCK_PLOT_THREADS.filter((t) =>
    selectedStatus === "all" ? true : t.status === selectedStatus
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-surface-void select-none px-3 py-3 sm:px-6 sm:py-4 text-ink-parchment">
      {/* Header matching plot-threads/page.tsx */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border-quiet/80 pb-2.5">
        <div>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-wine-accent">
            Narrative Arcs
          </span>
          <h2 className="font-serif text-lg sm:text-xl font-medium tracking-tight text-ink-parchment mt-0.5">
            Plot Threads &amp; Chekhov's Guns
          </h2>
          <p className="mt-0.5 font-serif text-[11px] italic text-ink-bone">
            Something planted, something paid. Drawn as chapter spans across the novel.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 rounded bg-surface-card p-0.5 border border-border-quiet font-mono text-[8.5px]">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedStatus(g.id)}
              className={cn(
                "px-2 py-0.5 rounded transition-all",
                selectedStatus === g.id
                  ? "bg-surface-elevated text-ink-parchment font-semibold border border-border-subtle"
                  : "text-ink-ash hover:text-ink-parchment"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Threads List */}
      <div className="mt-3.5 space-y-2.5">
        {filtered.map((t) => {
          const isResolved = t.status === "resolved";
          const isDropped = t.status === "abandoned";
          const isRedHerring = t.status === "red_herring";

          return (
            <div
              key={t.id}
              className="rounded-lg border border-border-quiet/80 bg-surface-card/30 p-2.5 hover:bg-surface-card/60 transition-colors text-[10px]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[7.5px] uppercase tracking-wider font-semibold",
                      isResolved
                        ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30"
                        : isDropped
                        ? "bg-zinc-800 text-zinc-400"
                        : isRedHerring
                        ? "bg-purple-950/40 text-purple-300 border border-purple-500/30"
                        : "bg-wine-crimson/20 text-wine-crimson border border-wine-crimson/30"
                    )}
                  >
                    {t.status.replace(/_/g, " ")}
                  </span>
                  <h4 className="font-serif text-xs font-medium text-ink-parchment">
                    {t.title}
                  </h4>
                </div>

                {/* Chapter Span */}
                <div className="flex items-center gap-1 font-mono text-[8.5px] text-ink-faint">
                  <span>Ch. 0{t.setup_chapter}</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                  <span>{t.payoff_chapter ? `Ch. 0${t.payoff_chapter}` : "Unresolved"}</span>
                </div>
              </div>

              <p className="mt-1 font-sans text-[9.5px] text-ink-ash leading-relaxed">
                {t.description}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-1 font-mono text-[7.5px] uppercase tracking-wider text-ink-faint">
                <span className="text-ink-ash">Related:</span>
                {t.related_entities.map((e) => (
                  <span key={e} className="rounded bg-surface-subtle px-1.5 py-0.5 text-ink-bone">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
