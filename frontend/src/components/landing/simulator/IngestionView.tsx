"use client";

import React, { useState } from "react";
import { RotateCw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_CHARACTERS, MOCK_CLAIMS } from "./mockData";
import { triggerAiPaywall } from "./aiNotice";

export function IngestionView() {
  const [done, setDone] = useState(true);

  const handleRetry = () => {
    triggerAiPaywall("reread");
  };

  const chaptersTotal = 4;
  const chaptersDone = done ? 4 : 2;
  const progressPercent = Math.round((chaptersDone / chaptersTotal) * 100);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-surface-void select-none px-3 py-3 sm:px-6 sm:py-4 text-ink-parchment">
      {/* ===================================================================
          PAGE HEADER matching ingestion/page.tsx
          =================================================================== */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border-quiet/80 pb-2.5">
        <div>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-wine-accent">
            Ingestion
          </span>
          <h2 className="font-serif text-lg sm:text-xl font-medium tracking-tight text-ink-parchment mt-0.5">
            The Brass Alchemist of Prague
          </h2>
          <p className="mt-0.5 font-serif text-[11px] italic text-ink-bone">
            {done
              ? `Read to the end: 4 chapters, ${MOCK_CHARACTERS.length} characters, 28 asserted facts.`
              : "Reading chapter 03 of 04 with sovereign AI..."}
          </p>
        </div>

        <button
          type="button"
          onClick={handleRetry}
          className="flex items-center gap-1.5 rounded bg-surface-elevated/70 border border-border-quiet px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-ink-ash hover:text-ink-parchment transition-colors"
        >
          <RotateCw className="h-2.5 w-2.5 text-wine-accent" />
          <span>Re-read</span>
        </button>
      </div>

      {/* ===================================================================
          READING TRACK: Segmented Chapter Bars matching ingestion/page.tsx
          =================================================================== */}
      <section className="mt-4 rounded-lg bg-surface-card/30 border border-border-quiet/60 p-3">
        <div className="flex items-end justify-between gap-4 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
          <span>12,480 words</span>
          <span className="text-ink-ash font-semibold">
            {chaptersDone} / {chaptersTotal} read
          </span>
        </div>

        {/* Segmented Ticks Bar */}
        <div className="mt-2 flex gap-1" aria-hidden>
          {Array.from({ length: chaptersTotal }).map((_, idx) => {
            const isRead = idx < chaptersDone;
            const isCurrent = !isRead && idx === chaptersDone;

            return (
              <span
                key={idx}
                className={cn(
                  "h-5 flex-1 rounded-[2px] transition-all duration-300",
                  isRead
                    ? "bg-wine-crimson/70"
                    : isCurrent
                    ? "bg-severity-warning/60 animate-pulse"
                    : "bg-surface-subtle"
                )}
              />
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.16em] text-ink-faint">
          <span>Ch. 01</span>
          <span className="text-ink-bone font-semibold">{progressPercent}% complete</span>
          <span>Ch. 04</span>
        </div>
      </section>

      {/* ===================================================================
          TWO COLUMN GRID: Who has appeared + What the text asserts
          =================================================================== */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left Column: Who has appeared */}
        <div className="rounded border border-border-quiet/60 bg-surface-card/20 p-3">
          <div className="flex items-center justify-between border-b border-border-quiet/60 pb-1.5">
            <span className="font-mono text-[8.5px] uppercase tracking-wider text-wine-accent">
              Who has appeared
            </span>
            <span className="font-mono text-[8px] text-ink-faint">
              {MOCK_CHARACTERS.length}
            </span>
          </div>

          <ul className="divide-y divide-border-quiet/30 mt-1">
            {MOCK_CHARACTERS.map((char) => (
              <li key={char.id} className="py-2 flex items-baseline justify-between gap-3 text-[10px]">
                <div className="min-w-0">
                  <p className="font-serif text-ink-parchment font-medium truncate">{char.name}</p>
                  {char.aliases.length > 0 && (
                    <p className="font-mono text-[7.5px] uppercase tracking-wider text-ink-faint truncate mt-0.5">
                      also {char.aliases.join(", ")}
                    </p>
                  )}
                </div>
                <span className="font-mono text-[8px] uppercase tracking-wider text-ink-faint shrink-0">
                  Ch. 0{char.first_chapter}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Column: What the text asserts */}
        <div className="rounded border border-border-quiet/60 bg-surface-card/20 p-3">
          <div className="flex items-center justify-between border-b border-border-quiet/60 pb-1.5">
            <span className="font-mono text-[8.5px] uppercase tracking-wider text-wine-accent">
              What the text asserts
            </span>
            <span className="font-mono text-[8px] text-ink-faint">
              {MOCK_CLAIMS.length}
            </span>
          </div>

          <ul className="divide-y divide-border-quiet/30 mt-1">
            {MOCK_CLAIMS.slice(0, 5).map((claim) => (
              <li key={claim.id} className="py-2 text-[10px]">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate font-serif text-ink-bone">
                    <span className="text-ink-ash">{claim.subject}</span>
                    <span className="text-ink-faint"> · {claim.attribute} · </span>
                    <span className="font-mono text-wine-crimson">{claim.value}</span>
                  </p>
                  <span className="font-mono text-[8px] uppercase tracking-wider text-ink-faint shrink-0">
                    Ch. 0{claim.chapter}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 border-l border-border-quiet/70 pl-2 font-serif text-[9px] italic text-ink-ash">
                  &ldquo;{claim.evidence_quote}&rdquo;
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
