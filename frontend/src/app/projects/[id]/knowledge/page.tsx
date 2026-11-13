"use client";

import React, { use, useMemo, useState } from "react";
import Link from "next/link";
import { useKnowledgeMatrix, useClaims } from "@/hooks/useStoryData";
import type { KnowledgeMatrixCell } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface KnowledgePageProps {
  params: Promise<{ id: string }>;
}

/**
 * This page is about secrets: who holds one, when they learned it, and who is
 * still in the dark. The matrix is a ledger, and the chapter dial rewinds it.
 */
export default function KnowledgePage({ params }: KnowledgePageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [activeTab, setActiveTab] = useState<"matrix" | "claims">("matrix");
  const [chapterScrubber, setChapterScrubber] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<KnowledgeMatrixCell | null>(null);
  const [claimSearch, setClaimSearch] = useState("");
  const [claimSubjectFilter, setClaimSubjectFilter] = useState("all");

  const { data: matrixData, isLoading: matrixLoading } = useKnowledgeMatrix(
    projectId,
    chapterScrubber || undefined
  );
  const { data: claims = [], isLoading: claimsLoading } = useClaims(
    projectId,
    chapterScrubber || undefined
  );

  const characters = matrixData?.characters || [];
  const facts = matrixData?.facts || [];
  const maxChapter = Math.max(matrixData?.max_chapter || 1, 1);

  const cellLookup = useMemo(() => {
    const map = new Map<string, KnowledgeMatrixCell>();
    for (const cell of matrixData?.cells || []) {
      map.set(`${cell.character}::${cell.fact}`, cell);
    }
    return map;
  }, [matrixData]);

  const claimSubjects = useMemo(() => {
    const set = new Set<string>();
    claims.forEach((claim) => {
      if (claim.subject) set.add(claim.subject);
    });
    return Array.from(set).sort();
  }, [claims]);

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      if (claimSubjectFilter !== "all" && claim.subject !== claimSubjectFilter) return false;
      if (!claimSearch) return true;
      const query = claimSearch.toLowerCase();
      return (
        claim.subject?.toLowerCase().includes(query) ||
        claim.attribute?.toLowerCase().includes(query) ||
        claim.value?.toLowerCase().includes(query) ||
        claim.evidence_quote?.toLowerCase().includes(query)
      );
    });
  }, [claims, claimSubjectFilter, claimSearch]);

  const asOfChapter = chapterScrubber ?? maxChapter;

  return (
    <div className="w-full max-w-6xl mx-auto px-6 sm:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Epistemic"
        title="Who knows what"
        line={
          characters.length === 0
            ? "No secrets have been mapped yet. They appear as the cast learns things."
            : `${characters.length} ${
                characters.length === 1 ? "person" : "people"
              }, ${facts.length} ${facts.length === 1 ? "truth" : "truths"} between them. Showing the book as of chapter ${asOfChapter}.`
        }
        actions={
          <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.16em]">
            {(
              [
                { id: "matrix" as const, label: "Matrix" },
                { id: "claims" as const, label: "Claims" },
              ]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={activeTab === tab.id}
                className={cn(
                  "border-b pb-1 transition-colors",
                  activeTab === tab.id
                    ? "border-wine-crimson text-ink-parchment"
                    : "border-transparent text-ink-faint hover:text-ink-ash"
                )}
              >
                {tab.label}
                {tab.id === "claims" ? ` ${claims.length}` : ""}
              </button>
            ))}
          </div>
        }
      />

      {/* The dial */}
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
          {chapterScrubber === null ? "Whole book" : `As of chapter ${chapterScrubber}`}
        </span>
        <input
          type="range"
          min={1}
          max={maxChapter}
          value={chapterScrubber ?? maxChapter}
          onChange={(event) => setChapterScrubber(Number(event.target.value))}
          aria-label="Rewind the book to a chapter"
          className="h-1 max-w-xs flex-1 cursor-pointer appearance-none rounded-full bg-border-quiet accent-wine-crimson"
        />
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
          ch. {String(maxChapter).padStart(2, "0")}
        </span>
        {chapterScrubber !== null && (
          <button
            type="button"
            onClick={() => setChapterScrubber(null)}
            className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-ash underline decoration-border-subtle underline-offset-4 transition-colors hover:text-ink-parchment"
          >
            Whole book
          </button>
        )}
      </div>

      {activeTab === "matrix" ? (
        <section className="mt-8">
          {matrixLoading ? (
            <p className="py-24 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              Reading the secret ledger…
            </p>
          ) : characters.length === 0 || facts.length === 0 ? (
            <div className="border-t border-dashed border-border-subtle py-20 text-center">
              <p className="font-serif text-xl text-ink-parchment">Nobody knows anything yet.</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                The ledger fills as chapters are read
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border-prominent">
                      <th className="sticky left-0 z-10 min-w-[190px] bg-surface-void pb-3 pr-4 font-mono text-[9px] font-normal uppercase tracking-[0.16em] text-ink-faint">
                        Truth
                      </th>
                      {characters.map((character) => (
                        <th
                          key={character}
                          className="min-w-[92px] pb-3 px-2 text-center font-serif text-[12px] font-normal text-ink-bone"
                        >
                          {character}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {facts.map((fact) => (
                      <tr key={fact} className="border-b border-border-quiet last:border-b-0">
                        <td className="sticky left-0 z-10 bg-surface-void py-3 pr-4 font-serif text-[13px] leading-snug text-ink-bone">
                          {fact}
                        </td>
                        {characters.map((character) => {
                          const cell = cellLookup.get(`${character}::${fact}`);
                          const knows = cell?.knows === true;
                          const isSelected =
                            selectedCell?.character === character && selectedCell?.fact === fact;

                          return (
                            <td key={character} className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedCell(
                                    cell ?? {
                                      character,
                                      fact,
                                      knows: false,
                                      propagated: false,
                                    }
                                  )
                                }
                                aria-label={`${character} ${
                                  knows ? "knows" : "does not know"
                                }: ${fact}`}
                                className={cn(
                                  "flex h-8 w-full items-center justify-center gap-1 rounded transition-colors",
                                  isSelected
                                    ? "bg-surface-elevated"
                                    : "hover:bg-surface-subtle/60"
                                )}
                              >
                                {knows ? (
                                  <>
                                    <span className="h-1.5 w-1.5 rounded-full bg-severity-thread" />
                                    <span className="font-mono text-[9px] tabular-nums text-ink-ash">
                                      {cell.since_chapter ?? "?"}
                                    </span>
                                    {cell.propagated && (
                                      <span className="h-1 w-1 rounded-full border border-ink-faint" />
                                    )}
                                  </>
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

                <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                  ● knows, number = chapter learned · ◌ passed on secondhand · — still in the dark
                </p>
              </div>

              {/* The secret's dossier */}
              <aside className="lg:sticky lg:top-6 lg:self-start">
                {selectedCell ? (
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">
                      {selectedCell.knows ? "Known" : "Unknown"}
                    </p>
                    <h2 className="mt-2 font-serif text-xl font-medium leading-snug text-ink-parchment">
                      {selectedCell.character}
                    </h2>
                    <p className="mt-3 border-l-2 border-border-prominent pl-3 font-serif text-[14px] italic leading-relaxed text-ink-bone">
                      &ldquo;{selectedCell.fact}&rdquo;
                    </p>

                    {selectedCell.knows ? (
                      <dl className="mt-5 space-y-2">
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                            learned
                          </dt>
                          <dd className="font-mono text-[11px] text-ink-bone">
                            ch. {selectedCell.since_chapter ?? "?"}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                            how
                          </dt>
                          <dd className="text-right font-serif text-[13px] capitalize text-ink-bone">
                            {(selectedCell.how_learned || "unknown").replace(/_/g, " ")}
                          </dd>
                        </div>
                        {selectedCell.source_character && (
                          <div className="flex items-baseline justify-between gap-3">
                            <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                              from
                            </dt>
                            <dd className="text-right font-serif text-[13px] text-ink-bone">
                              {selectedCell.source_character}
                            </dd>
                          </div>
                        )}
                        {selectedCell.propagated && (
                          <p className="pt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                            passed along the chain, not witnessed
                          </p>
                        )}
                      </dl>
                    ) : (
                      <p className="mt-5 font-serif text-[14px] italic leading-relaxed text-ink-ash">
                        {selectedCell.character} has not been exposed to this as of chapter{" "}
                        {asOfChapter}. A door still closed — dramatic irony, if you want it.
                      </p>
                    )}

                    <Link
                      href={`/projects/${projectId}/reader?chapter=${
                        selectedCell.since_chapter ?? 1
                      }`}
                      className="mt-6 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-ash transition-colors hover:text-ink-parchment"
                    >
                      Read the chapter
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ) : (
                  <p className="font-serif text-[15px] italic leading-relaxed text-ink-ash">
                    Pick any square to see when that person learned it, and whether they learned it
                    firsthand.
                  </p>
                )}
              </aside>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <input
              type="text"
              value={claimSearch}
              onChange={(event) => setClaimSearch(event.target.value)}
              placeholder="Search a claim, a name, a line"
              className="w-64 border-0 border-b border-border-quiet bg-transparent pb-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-parchment placeholder:text-ink-faint focus:border-border-prominent focus:outline-none"
            />
            <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              <select
                value={claimSubjectFilter}
                onChange={(event) => setClaimSubjectFilter(event.target.value)}
                aria-label="Filter claims by subject"
                className="cursor-pointer bg-transparent text-ink-ash focus:outline-none"
              >
                <option value="all" className="bg-surface-elevated">
                  all subjects ({claimSubjects.length})
                </option>
                {claimSubjects.map((subject) => (
                  <option key={subject} value={subject} className="bg-surface-elevated">
                    {subject}
                  </option>
                ))}
              </select>
              <span>{filteredClaims.length} shown</span>
            </div>
          </div>

          {claimsLoading ? (
            <p className="py-24 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              Reading the claims…
            </p>
          ) : filteredClaims.length === 0 ? (
            <p className="py-20 text-center font-serif text-[15px] italic text-ink-ash">
              No claims match that.
            </p>
          ) : (
            <ol className="mt-6">
              {filteredClaims.map((claim) => (
                <li key={claim.id} className="border-b border-border-quiet py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="min-w-0 text-[14px] text-ink-bone">
                      <span className="font-serif text-ink-parchment">{claim.subject}</span>
                      <span className="text-ink-faint"> · {claim.attribute} · </span>
                      <span className="font-mono text-[13px] text-wine-crimson">{claim.value}</span>
                    </p>
                    <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                      ch. {String(claim.chapter).padStart(2, "0")} ·{" "}
                      {Math.round((claim.confidence || 0) * 100)}%
                    </span>
                  </div>

                  {claim.evidence_quote && (
                    <p className="mt-2 max-w-[80ch] border-l border-border-prominent pl-3 font-serif text-[13px] italic leading-relaxed text-ink-ash">
                      &ldquo;{claim.evidence_quote}&rdquo;
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.16em]">
                    <Link
                      href={`/projects/${projectId}/reader?chapter=${claim.chapter}`}
                      className="text-ink-faint transition-colors hover:text-ink-parchment"
                    >
                      Read chapter
                    </Link>
                    {claim.validation_state === "contradicted" && (
                      <span className="text-severity-contradiction">contradicted</span>
                    )}
                    <span className="text-ink-faint">{claim.status || "active"}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
