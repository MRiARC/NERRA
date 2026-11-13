"use client";

import React, { useState, use, useMemo } from "react";
import Link from "next/link";
import { useKnowledgeMatrix, useClaims } from "@/hooks/useStoryData";
import type { KnowledgeMatrixCell } from "@/lib/types";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Compass,
  Eye,
  EyeOff,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Search,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Layers,
  ChevronRight,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface KnowledgePageProps {
  params: Promise<{ id: string }>;
}

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

  // Fast cell lookup
  const cellLookup = useMemo(() => {
    const map = new Map<string, KnowledgeMatrixCell>();
    for (const cell of matrixData?.cells || []) {
      map.set(`${cell.character}::${cell.fact}`, cell);
    }
    return map;
  }, [matrixData]);

  // Unique subjects for claims filter
  const claimSubjects = useMemo(() => {
    const set = new Set<string>();
    claims.forEach((c) => {
      if (c.subject) set.add(c.subject);
    });
    return Array.from(set).sort();
  }, [claims]);

  // Filtered claims
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      if (claimSubjectFilter !== "all" && c.subject !== claimSubjectFilter) {
        return false;
      }
      if (claimSearch) {
        const q = claimSearch.toLowerCase();
        return (
          c.subject?.toLowerCase().includes(q) ||
          c.attribute?.toLowerCase().includes(q) ||
          c.value?.toLowerCase().includes(q) ||
          c.evidence_quote?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [claims, claimSubjectFilter, claimSearch]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
      {/* Header & Mission Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border-subtle pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-ink-ash font-medium">
              Epistemic Verification Engine
            </span>
            <span className="text-border-subtle">•</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-severity-thread">
              <span className="w-1.5 h-1.5 rounded-full bg-severity-thread" />
              Dramatic Irony Sentinel Active
            </span>
          </div>
          <h1 className="text-3xl font-serif font-normal tracking-tight text-ink-parchment flex items-center gap-3">
            <Compass className="w-7 h-7 text-wine-accent" />
            Who Knows What
          </h1>
          <p className="text-sm text-ink-ash max-w-2xl leading-relaxed">
            Audit epistemic horizons across your cast. Pinpoint which character learned which secret,
            detect dramatic irony opportunities, and prevent characters from acting on knowledge they could not possess.
          </p>
        </div>

        {/* Tab & Scrubber Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center p-1 bg-surface-card border border-border-quiet rounded-xl shadow-inner shrink-0">
            <button
              onClick={() => setActiveTab("matrix")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                activeTab === "matrix"
                  ? "bg-surface-elevated text-ink-parchment shadow-sm border border-border-subtle"
                  : "text-ink-ash hover:text-ink-parchment"
              )}
            >
              <Eye className="w-3.5 h-3.5 text-wine-accent" />
              Epistemic Matrix
            </button>
            <button
              onClick={() => setActiveTab("claims")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                activeTab === "claims"
                  ? "bg-surface-elevated text-ink-parchment shadow-sm border border-border-subtle"
                  : "text-ink-ash hover:text-ink-parchment"
              )}
            >
              <Layers className="w-3.5 h-3.5 text-wine-accent" />
              Factual Claims ({claims.length})
            </button>
          </div>
        </div>
      </div>

      {/* Chapter Scrubber Bar */}
      <Surface depth={2} border="subtle" className="p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <SlidersHorizontal className="w-4 h-4 text-wine-accent shrink-0" />
          <div className="space-y-0.5">
            <p className="text-xs font-mono font-medium text-ink-parchment">
              Temporal Epistemic Horizon
            </p>
            <p className="text-[11px] font-mono text-ink-ash">
              {chapterScrubber === null
                ? `Showing accumulated knowledge through Chapter ${maxChapter}`
                : `Simulating cast awareness strictly as of Chapter ${chapterScrubber}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          <input
            type="range"
            min={1}
            max={maxChapter}
            value={chapterScrubber ?? maxChapter}
            onChange={(e) => setChapterScrubber(Number(e.target.value))}
            className="w-full md:w-64 accent-wine-accent cursor-pointer"
          />
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-surface-subtle border border-border-quiet text-ink-parchment shrink-0">
              {chapterScrubber === null ? "Full Book" : `Ch. ${chapterScrubber}`}
            </span>
            {chapterScrubber !== null && (
              <button
                onClick={() => setChapterScrubber(null)}
                className="text-[11px] font-mono text-ink-ash hover:text-ink-parchment underline transition-colors shrink-0"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </Surface>

      {/* TAB 1: 2D Epistemic Matrix */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          {matrixLoading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-wine-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono text-ink-ash">Mapping epistemic belief vectors...</p>
            </div>
          ) : characters.length === 0 || facts.length === 0 ? (
            <Surface depth={2} border="subtle" className="p-12 text-center rounded-2xl max-w-xl mx-auto space-y-4">
              <Compass className="w-10 h-10 text-ink-ash mx-auto opacity-50" />
              <h3 className="font-serif text-lg text-ink-parchment">No Epistemic Matrix Data</h3>
              <p className="text-xs text-ink-ash leading-relaxed">
                As chapters are parsed, the engine tracks which facts are spoken or overheard by characters.
              </p>
            </Surface>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Matrix Table */}
              <div className="lg:col-span-2 overflow-x-auto rounded-xl border border-border-subtle bg-surface-card">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-subtle bg-surface-subtle">
                      <th className="p-3.5 text-xs font-mono text-ink-ash font-medium uppercase tracking-wider sticky left-0 bg-surface-subtle z-10 min-w-[180px]">
                        Story Secret / Fact
                      </th>
                      {characters.map((char) => (
                        <th
                          key={char}
                          className="p-3.5 text-xs font-mono text-ink-parchment font-medium text-center min-w-[120px]"
                        >
                          {char}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-quiet text-xs font-sans">
                    {facts.map((fact, idx) => (
                      <tr key={idx} className="hover:bg-surface-elevated/40 transition-colors">
                        <td className="p-3.5 font-medium text-ink-parchment sticky left-0 bg-surface-card z-10 border-r border-border-quiet">
                          {fact}
                        </td>
                        {characters.map((char) => {
                          const cell = cellLookup.get(`${char}::${fact}`);
                          const knows = cell?.knows === true;
                          const isSelected =
                            selectedCell?.character === char && selectedCell?.fact === fact;

                          return (
                            <td
                              key={char}
                              onClick={() => {
                                setSelectedCell(
                                  cell ?? {
                                    character: char,
                                    fact: fact,
                                    knows: false,
                                    propagated: false,
                                  }
                                );
                              }}
                              className={cn(
                                "p-3.5 text-center cursor-pointer transition-all duration-150 border-r border-border-quiet last:border-r-0",
                                isSelected
                                  ? "bg-wine-accent/15 ring-1 ring-border-focus"
                                  : "hover:bg-surface-elevated"
                              )}
                            >
                              {knows ? (
                                <div className="inline-flex items-center justify-center gap-1 text-severity-thread">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span className="font-mono text-[10px] text-ink-ash">
                                    Ch.{cell.since_chapter ?? "?"}
                                  </span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-center text-ink-faint">
                                  <EyeOff className="w-3.5 h-3.5 opacity-40" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cell Inspection Detail Drawer */}
              <div className="lg:col-span-1">
                <Surface depth={2} border="subtle" className="p-5 rounded-xl space-y-5 sticky top-6">
                  <div className="flex items-center justify-between border-b border-border-quiet pb-3">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-wine-accent" />
                      <h3 className="font-serif text-sm font-medium text-ink-parchment">
                        Epistemic Audit Dossier
                      </h3>
                    </div>
                    {selectedCell && (
                      <span className="font-mono text-[11px] text-ink-ash">
                        {selectedCell.knows ? (
                          <span className="text-severity-thread font-semibold">● Confirmed Aware</span>
                        ) : (
                          <span className="text-ink-ash">○ Unaware in Canon</span>
                        )}
                      </span>
                    )}
                  </div>

                  {selectedCell ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash">Character</p>
                        <p className="text-sm font-serif text-ink-parchment mt-0.5 font-medium">
                          {selectedCell.character}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash">Fact / Secret</p>
                        <p className="text-xs font-sans text-ink-bone mt-0.5 leading-relaxed bg-surface-subtle p-3 rounded-lg border border-border-quiet">
                          &ldquo;{selectedCell.fact}&rdquo;
                        </p>
                      </div>

                      {selectedCell.knows ? (
                        <>
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-ink-ash">Learned in Chapter:</span>
                            <span className="text-ink-parchment px-2 py-0.5 bg-surface-subtle border border-border-quiet rounded">
                              Ch. {selectedCell.since_chapter ?? "?"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-ink-ash">How Learned:</span>
                            <span className="text-ink-parchment capitalize">
                              {(selectedCell.how_learned || "unknown").replace(/_/g, " ")}
                            </span>
                          </div>

                          {selectedCell.source_character && (
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-ink-ash">Source:</span>
                              <span className="text-ink-parchment">{selectedCell.source_character}</span>
                            </div>
                          )}

                          {selectedCell.propagated && (
                            <div className="p-3 rounded-lg bg-surface-subtle border border-border-quiet text-[11px] font-mono text-ink-bone flex items-center gap-2">
                              <ChevronRight className="w-3 h-3 text-wine-accent" />
                              Inferred through secret propagation
                            </div>
                          )}

                          <div className="pt-2">
                            <Link
                              href={`/projects/${projectId}/reader?chapter=${selectedCell.since_chapter ?? 1}`}
                              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-subtle hover:bg-surface-elevated border border-border-quiet text-xs font-mono text-ink-parchment transition-colors"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-wine-accent" />
                              Open Chapter in Reader
                            </Link>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 rounded-lg bg-surface-subtle border border-border-quiet text-center space-y-2">
                          <EyeOff className="w-6 h-6 text-ink-faint mx-auto opacity-50" />
                          <p className="text-xs font-sans text-ink-ash">
                            {selectedCell.character} has not been exposed to this fact as of Chapter{" "}
                            {chapterScrubber ?? maxChapter}.
                          </p>
                          <p className="text-[11px] font-mono text-severity-thread">
                            ✓ Dramatic irony opportunity available
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 text-center space-y-2 text-ink-ash">
                      <Compass className="w-8 h-8 mx-auto opacity-40 text-ink-faint" />
                      <p className="text-xs">Click any cell in the matrix to inspect textual proof and propagation history.</p>
                    </div>
                  )}
                </Surface>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Factual Claims Grid */}
      {activeTab === "claims" && (
        <div className="space-y-6">
          {/* Claims Filter Bar */}
          <Surface depth={1} border="quiet" className="p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-ink-ash absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search claims, subjects, quotes..."
                  value={claimSearch}
                  onChange={(e) => setClaimSearch(e.target.value)}
                  className="bg-surface-card border border-border-subtle rounded-lg pl-8 pr-3 py-1.5 text-xs text-ink-parchment placeholder:text-ink-faint outline-none focus:border-wine-accent w-64"
                />
              </div>

              <span className="text-border-subtle font-mono text-xs hidden sm:inline">|</span>

              <div className="flex items-center gap-2 text-xs font-mono text-ink-ash">
                <Filter className="w-3.5 h-3.5" />
                <span>Subject:</span>
              </div>
              <select
                value={claimSubjectFilter}
                onChange={(e) => setClaimSubjectFilter(e.target.value)}
                className="bg-surface-card border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-ink-parchment outline-none focus:border-wine-accent cursor-pointer"
              >
                <option value="all">All Subjects ({claimSubjects.length})</option>
                {claimSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-mono text-ink-faint">
              Showing <span className="text-ink-parchment font-medium">{filteredClaims.length}</span> of {claims.length} claims
            </div>
          </Surface>

          {claimsLoading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-wine-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono text-ink-ash">Loading extracted claims corpus...</p>
            </div>
          ) : filteredClaims.length === 0 ? (
            <Surface depth={2} border="subtle" className="p-12 text-center rounded-2xl max-w-xl mx-auto space-y-4">
              <Layers className="w-10 h-10 text-ink-ash mx-auto opacity-50" />
              <h3 className="font-serif text-lg text-ink-parchment">No Claims Match Filter</h3>
              <p className="text-xs text-ink-ash leading-relaxed">
                Try widening your search terms or clearing the subject filter.
              </p>
            </Surface>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClaims.map((claim) => (
                <Surface
                  key={claim.id}
                  depth={2}
                  border={claim.validation_state === "contradicted" ? "contradiction" : "subtle"}
                  className="p-5 rounded-xl space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-subtle text-ink-parchment border border-border-quiet">
                        Ch. {claim.chapter}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-ink-ash">
                          {Math.round((claim.confidence || 0) * 100)}% conf
                        </span>
                        {claim.validation_state === "contradicted" ? (
                          <span className="w-2 h-2 rounded-full bg-wine-crimson" title="Contradicted" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-severity-thread" title="Verified" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-ink-parchment font-medium">
                        <span className="text-wine-accent">{claim.subject}</span>
                        <span className="text-ink-ash">→</span>
                        <span className="text-ink-bone">{claim.attribute}</span>
                      </div>
                      <p className="text-sm font-sans font-medium text-ink-parchment">
                        {claim.value}
                      </p>
                    </div>

                    {claim.evidence_quote && (
                      <p className="text-xs font-serif italic text-ink-ash bg-surface-subtle p-2.5 rounded-lg border-l border-border-prominent">
                        &ldquo;{claim.evidence_quote}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border-quiet flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-ink-faint">
                      Status: {claim.status || "active"}
                    </span>
                    <Link
                      href={`/projects/${projectId}/reader?chapter=${claim.chapter}`}
                      className="text-[11px] font-mono text-wine-accent hover:text-ink-parchment flex items-center gap-1 transition-colors"
                    >
                      Read Folio <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </Surface>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
