"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  MOCK_CHARACTERS,
  MOCK_CLAIMS,
  MOCK_KNOWLEDGE_FACTS,
  MOCK_KNOWLEDGE_MATRIX,
  type MockClaim,
} from "./mockData";

export function KnowledgeView() {
  const [activeTab, setActiveTab] = useState<"matrix" | "claims">("matrix");
  const [chapterScrubber, setChapterScrubber] = useState<number | null>(4);
  const [selectedCell, setSelectedCell] = useState<{
    character: string;
    fact: string;
    knows: boolean;
    since_chapter?: number;
    rule: string;
    propagated?: boolean;
  }>({
    character: "Sarah Coyle",
    fact: "The Magistrate was poisoned with Belladonna Nightshade",
    knows: false,
    rule: "HAZARD: Sarah was stationed at the north portcullis. Accusing Vane of poison before Chapter 7 is an epistemic leak.",
  });
  const [claimSearch, setClaimSearch] = useState("");

  const characters = MOCK_CHARACTERS.map((c) => c.name);
  const maxChapter = 4;
  const asOfChapter = chapterScrubber ?? maxChapter;

  const filteredClaims = MOCK_CLAIMS.filter((c) => {
    if (!claimSearch) return true;
    const q = claimSearch.toLowerCase();
    return (
      c.subject.toLowerCase().includes(q) ||
      c.attribute.toLowerCase().includes(q) ||
      c.value.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-surface-void select-none px-3 py-3 sm:px-6 sm:py-4 text-ink-parchment">
      {/* ===================================================================
          PAGE HEADER matching knowledge/page.tsx
          =================================================================== */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border-quiet/80 pb-2.5">
        <div>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-wine-accent">
            Epistemic
          </span>
          <h2 className="font-serif text-lg sm:text-xl font-medium tracking-tight text-ink-parchment mt-0.5">
            Who knows what
          </h2>
          <p className="mt-0.5 font-serif text-[11px] italic text-ink-bone">
            {characters.length} people, {MOCK_KNOWLEDGE_FACTS.length} truths between them. Showing the book as of chapter {asOfChapter}.
          </p>
        </div>

        {/* Tab Switcher: Matrix | Claims */}
        <div className="flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.16em]">
          <button
            type="button"
            onClick={() => setActiveTab("matrix")}
            className={cn(
              "border-b pb-1 transition-colors",
              activeTab === "matrix"
                ? "border-wine-crimson text-ink-parchment font-semibold"
                : "border-transparent text-ink-faint hover:text-ink-ash"
            )}
          >
            Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("claims")}
            className={cn(
              "border-b pb-1 transition-colors",
              activeTab === "claims"
                ? "border-wine-crimson text-ink-parchment font-semibold"
                : "border-transparent text-ink-faint hover:text-ink-ash"
            )}
          >
            Claims {MOCK_CLAIMS.length}
          </button>
        </div>
      </div>

      {/* The Dial (Chapter Scrubber) matching knowledge/page.tsx */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-mono">
        <span className="uppercase tracking-wider text-ink-faint">
          {chapterScrubber === null ? "Whole book" : `As of chapter ${chapterScrubber}`}
        </span>
        <input
          type="range"
          min={1}
          max={maxChapter}
          value={chapterScrubber ?? maxChapter}
          onChange={(e) => setChapterScrubber(Number(e.target.value))}
          className="h-1 w-28 sm:w-40 cursor-pointer appearance-none rounded-full bg-border-quiet accent-wine-crimson"
        />
        <span className="uppercase tracking-wider text-ink-faint">
          ch. 0{maxChapter}
        </span>
        {chapterScrubber !== null && (
          <button
            type="button"
            onClick={() => setChapterScrubber(null)}
            className="text-ink-ash underline underline-offset-2 hover:text-ink-parchment transition-colors"
          >
            Whole book
          </button>
        )}
      </div>

      {/* ===================================================================
          BODY CONTENT: Matrix Grid OR Claims Ledger
          =================================================================== */}
      {activeTab === "matrix" ? (
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          {/* 2D Table */}
          <div className="overflow-x-auto rounded border border-border-quiet/60 bg-surface-card/20 p-2">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border-quiet/80">
                  <th className="sticky left-0 z-10 min-w-[140px] bg-surface-void pb-2 pr-2 font-mono text-[8.5px] font-normal uppercase tracking-wider text-ink-faint">
                    Truth
                  </th>
                  {characters.map((char) => (
                    <th
                      key={char}
                      className="min-w-[70px] pb-2 px-1 text-center font-serif text-[10.5px] font-normal text-ink-bone"
                    >
                      {char.split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_KNOWLEDGE_FACTS.map((fact) => (
                  <tr key={fact} className="border-b border-border-quiet/40 last:border-b-0">
                    <td className="sticky left-0 z-10 bg-surface-void py-2 pr-2 font-serif text-[11px] leading-snug text-ink-bone">
                      {fact}
                    </td>
                    {characters.map((char) => {
                      const charData = MOCK_KNOWLEDGE_MATRIX[char] || {};
                      const cell = charData[fact] || { knows: false, rule: "No record." };
                      const isKnownAsOfChapter =
                        cell.knows && (!cell.since_chapter || asOfChapter >= cell.since_chapter);
                      const isSelected =
                        selectedCell.character === char && selectedCell.fact === fact;

                      return (
                        <td key={char} className="px-1 py-1 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCell({
                                character: char,
                                fact,
                                knows: isKnownAsOfChapter,
                                since_chapter: cell.since_chapter,
                                rule: cell.rule,
                                propagated: cell.propagated,
                              })
                            }
                            className={cn(
                              "flex h-6 w-full items-center justify-center gap-1 rounded transition-colors",
                              isSelected
                                ? "bg-surface-elevated ring-1 ring-wine-accent"
                                : "hover:bg-surface-subtle"
                            )}
                          >
                            {isKnownAsOfChapter ? (
                              <div className="flex items-center gap-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                <span className="font-mono text-[8px] tabular-nums text-ink-ash">
                                  {cell.since_chapter ?? "?"}
                                </span>
                                {cell.propagated && (
                                  <span className="h-1 w-1 rounded-full border border-ink-faint" />
                                )}
                              </div>
                            ) : (
                              <span className="h-px w-2 bg-border-prominent" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Authentic Legend matching knowledge/page.tsx */}
            <p className="mt-2.5 font-mono text-[8px] uppercase tracking-wider text-ink-faint">
              ● knows, number = chapter learned · ◌ passed on secondhand · — still in the dark
            </p>
          </div>

          {/* The Secret's Dossier Side Panel matching knowledge/page.tsx */}
          <aside className="rounded border border-border-quiet/80 bg-surface-card/40 p-3 text-[10px] space-y-2.5">
            <div className="pb-2 border-b border-border-quiet/60">
              <span className="font-mono text-[8px] uppercase tracking-wider text-wine-accent block">
                Secret Dossier
              </span>
              <h4 className="font-serif text-sm font-medium text-ink-parchment mt-0.5">
                {selectedCell.character}
              </h4>
              <p className="font-serif italic text-ink-ash text-[10.5px] mt-0.5 leading-snug">
                &ldquo;{selectedCell.fact}&rdquo;
              </p>
            </div>

            <div className="space-y-1 font-mono text-[8.5px]">
              <span className="uppercase tracking-wider text-ink-faint block">Epistemic Status:</span>
              {selectedCell.knows ? (
                <div className="flex items-center gap-1.5 rounded bg-emerald-950/30 border border-emerald-500/30 p-1.5 text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    Knows since Ch. {selectedCell.since_chapter}
                    {selectedCell.propagated ? " (secondhand)" : " (firsthand)"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded bg-amber-950/30 border border-amber-500/30 p-1.5 text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>Still in the dark as of Ch. {asOfChapter}</span>
                </div>
              )}
            </div>

            <div className="rounded bg-surface-void/70 p-2 border border-border-quiet/60">
              <span className="font-mono text-[7.5px] uppercase tracking-wider text-ink-faint block mb-0.5">
                Scribe Continuity Rule:
              </span>
              <p className="font-serif text-[10px] italic text-ink-bone leading-relaxed">
                {selectedCell.rule}
              </p>
            </div>
          </aside>
        </div>
      ) : (
        /* Claims Ledger Tab */
        <div className="mt-3 space-y-3">
          <input
            type="text"
            value={claimSearch}
            onChange={(e) => setClaimSearch(e.target.value)}
            placeholder="Search asserted facts..."
            className="w-full max-w-sm rounded bg-surface-card border border-border-quiet px-2.5 py-1 text-[10px] text-ink-parchment placeholder:text-ink-faint focus:outline-none font-mono"
          />

          <div className="divide-y divide-border-quiet/40 rounded border border-border-quiet/60 bg-surface-card/20">
            {filteredClaims.map((claim) => (
              <div key={claim.id} className="p-2 sm:p-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 text-[10px]">
                <div>
                  <p className="font-serif text-ink-parchment font-medium">
                    <span className="text-ink-ash">{claim.subject}</span>
                    <span className="text-ink-faint"> · {claim.attribute} · </span>
                    <span className="font-mono text-wine-crimson">{claim.value}</span>
                  </p>
                  <p className="mt-0.5 font-serif italic text-ink-faint text-[9.5px]">
                    &ldquo;{claim.evidence_quote}&rdquo;
                  </p>
                </div>
                <span className="font-mono text-[8px] uppercase tracking-wider text-ink-faint shrink-0">
                  Ch. 0{claim.chapter}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
