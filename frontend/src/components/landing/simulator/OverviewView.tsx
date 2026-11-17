"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { ManuscriptRuler } from "@/components/project/ManuscriptRuler";
import { Button } from "@/components/ui/Button";
import { MANUSCRIPT_CHAPTERS, MOCK_CHARACTERS } from "./mockData";
import type { Issue } from "@/lib/types";
import {
  ArrowRight,
  MoreHorizontal,
  Sparkles,
  Download,
  Loader2,
} from "lucide-react";
import { cn, formatWords } from "@/lib/utils";
import { triggerAiPaywall } from "./aiNotice";

interface OverviewViewProps {
  issues: Issue[];
  onNavigateToEditor: (chapter: number, issueId: string) => void;
  onNavigateToCharacters: () => void;
  onNavigateToReader: (chapter: number) => void;
  onNavigateToIngestion: () => void;
}

type FindingFilter = "major" | "minor" | "all";

export function OverviewView({
  issues,
  onNavigateToEditor,
  onNavigateToCharacters,
  onNavigateToReader,
  onNavigateToIngestion,
}: OverviewViewProps) {
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number | null>(4);
  const [filter, setFilter] = useState<FindingFilter>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalWords = useMemo(
    () => MANUSCRIPT_CHAPTERS.reduce((acc, c) => acc + (c.word_count || 0), 0),
    []
  );
  const totalChapters = MANUSCRIPT_CHAPTERS.length;
  const graphNodes = MOCK_CHARACTERS.length + 8 + 4; // Characters + Relics + Locations

  const openIssues = useMemo(() => issues.filter((i) => i.status === "open"), [issues]);
  const criticalIssues = useMemo(
    () => openIssues.filter((i) => i.severity === "red"),
    [openIssues]
  );
  const minorIssues = useMemo(
    () => openIssues.filter((i) => i.severity !== "red"),
    [openIssues]
  );
  const affectedChapterCount = useMemo(
    () => new Set(openIssues.flatMap((i) => (i.evidence || []).map((e) => e.chapter))).size,
    [openIssues]
  );

  const activeSelectedChapter = useMemo(() => {
    if (MANUSCRIPT_CHAPTERS.length === 0 || selectedChapterNumber === null) return null;
    return MANUSCRIPT_CHAPTERS.find((c) => c.number === selectedChapterNumber) || null;
  }, [selectedChapterNumber]);

  const selectedChapterFindings = useMemo(() => {
    if (!activeSelectedChapter) return 0;
    return openIssues.filter((issue) =>
      issue.evidence?.some((e) => e.chapter === activeSelectedChapter.number)
    ).length;
  }, [openIssues, activeSelectedChapter]);

  const scopedIssues = useMemo(() => {
    if (selectedChapterNumber === null) return openIssues;
    return openIssues.filter((issue) =>
      issue.evidence?.some((e) => e.chapter === selectedChapterNumber)
    );
  }, [openIssues, selectedChapterNumber]);

  const filteredFindings = useMemo(() => {
    if (filter === "major") return scopedIssues.filter((i) => i.severity === "red");
    if (filter === "minor") return scopedIssues.filter((i) => i.severity !== "red");
    return scopedIssues;
  }, [scopedIssues, filter]);

  const stateLine =
    openIssues.length === 0
      ? `${totalChapters} chapters on the shelf. The canon holds cleanly today.`
      : `${totalChapters} chapters on the shelf. ${openIssues.length} ${
          openIssues.length === 1 ? "finding needs" : "findings need"
        } your review across ${affectedChapterCount} ${
          affectedChapterCount === 1 ? "chapter" : "chapters"
        }.`;

  const handleTriggerAudit = () => {
    setMenuOpen(false);
    triggerAiPaywall("audit");
  };

  const filterOptions = [
    { id: "all" as const, label: "All", count: scopedIssues.length },
    {
      id: "major" as const,
      label: "Major",
      count: scopedIssues.filter((i) => i.severity === "red").length,
    },
    {
      id: "minor" as const,
      label: "Minor",
      count: scopedIssues.filter((i) => i.severity !== "red").length,
    },
  ];

  return (
    <div className="w-full flex-1 overflow-y-auto bg-surface-void select-none px-3 py-3 sm:px-6 sm:py-4 text-ink-parchment">
      {/* Editorial Masthead matching projects/[id]/page.tsx */}
      <header className="border-b border-border-quiet/80 pb-3">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 font-mono text-[8.5px] uppercase tracking-[0.2em] text-ink-ash">
              <span className="text-wine-accent">The Dossier</span>
              <span aria-hidden className="h-px w-6 bg-border-subtle" />
              <span>THE BRASS ALCHEMIST OF PRAGUE</span>
            </div>

            <h1 className="mt-1 font-serif text-xl sm:text-2xl font-medium tracking-tight text-ink-parchment leading-tight">
              The Brass Alchemist of Prague
            </h1>

            <p className="mt-1 font-serif text-xs italic leading-relaxed text-ink-bone max-w-xl">
              {stateLine}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[9px]">
              <button
                type="button"
                onClick={() => onNavigateToEditor(selectedChapterNumber || 4, "issue-1")}
                className="flex items-center gap-1 rounded bg-wine-accent px-2 py-1 text-white hover:bg-wine-crimson transition-colors uppercase tracking-wider font-semibold"
              >
                <span>Write</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateToReader(selectedChapterNumber || 4)}
                className="rounded bg-surface-elevated/70 border border-border-quiet px-2 py-1 text-ink-bone hover:text-ink-parchment transition-colors uppercase tracking-wider"
              >
                Read
              </button>

              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex h-6 w-6 items-center justify-center rounded border border-border-subtle text-ink-ash hover:text-ink-parchment transition-colors"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 z-30 mt-1 w-52 rounded-lg border border-border-subtle bg-surface-elevated p-1 text-[10px] text-ink-bone shadow-xl"
                  >
                    <button
                      type="button"
                      onClick={handleTriggerAudit}
                      disabled={isAuditing}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left hover:bg-surface-card hover:text-ink-parchment"
                    >
                      <Sparkles className="w-3 h-3 text-wine-crimson" />
                      <span>{isAuditing ? "Auditing…" : "Re-run consistency audit"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left hover:bg-surface-card hover:text-ink-parchment"
                    >
                      <Download className="w-3 h-3 text-ink-ash" />
                      <span>Export story bible</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dossier Record Tile */}
          <div className="flex items-center gap-4 rounded-lg border border-border-quiet/80 bg-surface-card/40 p-2.5 text-[9px] font-mono shrink-0">
            <div>
              <span className="block font-serif text-sm tabular-nums text-ink-parchment font-semibold">
                {formatWords(totalWords)}
              </span>
              <span className="text-[7.5px] uppercase tracking-wider text-ink-faint">Words</span>
            </div>
            <div className="h-6 w-px bg-border-quiet" />
            <div>
              <span className="block font-serif text-sm tabular-nums text-ink-parchment font-semibold">
                {totalChapters}
              </span>
              <span className="text-[7.5px] uppercase tracking-wider text-ink-faint">Chapters</span>
            </div>
            <div className="h-6 w-px bg-border-quiet" />
            <div>
              <span
                className={cn(
                  "block font-serif text-sm tabular-nums font-semibold",
                  openIssues.length > 0 ? "text-severity-contradiction" : "text-ink-parchment"
                )}
              >
                {openIssues.length}
              </span>
              <span className="text-[7.5px] uppercase tracking-wider text-ink-faint">Findings</span>
            </div>
            <div className="h-6 w-px bg-border-quiet" />
            <div>
              <span className="block font-serif text-sm tabular-nums text-ink-parchment font-semibold">
                {graphNodes}
              </span>
              <span className="text-[7.5px] uppercase tracking-wider text-ink-faint">Entities</span>
            </div>
          </div>
        </div>
      </header>

      {/* Audit banner */}
      {isAuditing && (
        <div className="mt-3 border-l-2 border-wine-accent py-1.5 pl-3 bg-surface-elevated/40 rounded-r text-[10px]">
          <div className="flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin text-wine-accent shrink-0" />
            <p className="text-ink-bone">
              <span className="font-mono uppercase text-wine-accent font-semibold">
                Auditing Canon ·{" "}
              </span>
              Checking cross-chapter continuity with sovereign AI…
            </p>
          </div>
        </div>
      )}

      {/* Manuscript Ruler */}
      <section className="mt-3">
        <ManuscriptRuler
          chapters={MANUSCRIPT_CHAPTERS}
          issues={openIssues}
          selectedChapter={selectedChapterNumber}
          onSelect={(chapterNumber) =>
            setSelectedChapterNumber(selectedChapterNumber === chapterNumber ? null : chapterNumber)
          }
        />

        {activeSelectedChapter ? (
          <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="min-w-0">
              <span className="font-serif text-xs font-semibold text-ink-parchment">
                {activeSelectedChapter.title}
              </span>
              <span className="ml-2 text-[10px] text-ink-ash font-mono">
                {formatWords(activeSelectedChapter.word_count)} ·{" "}
                {selectedChapterFindings} findings
              </span>
            </p>

            <div className="flex items-center gap-3 font-mono text-[8.5px] uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setSelectedChapterNumber(null)}
                className="text-wine-crimson hover:text-ink-parchment transition-colors"
              >
                All chapters
              </button>
              <button
                type="button"
                onClick={() => onNavigateToReader(activeSelectedChapter.number)}
                className="text-ink-ash hover:text-ink-parchment transition-colors"
              >
                Read
              </button>
              <button
                type="button"
                onClick={() => onNavigateToEditor(activeSelectedChapter.number, "issue-1")}
                className="text-ink-ash hover:text-ink-parchment transition-colors"
              >
                Write
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[10px]">
            <p className="min-w-0 font-serif text-ink-parchment">
              <span>Whole Manuscript</span>
              <span className="ml-2 font-mono text-ink-ash text-[9px]">
                {totalChapters} chapters · {openIssues.length} total findings
              </span>
            </p>
            <span className="font-mono text-[8.5px] uppercase tracking-wider text-ink-faint">
              Click any chapter to filter
            </span>
          </div>
        )}
      </section>

      {/* Findings Section */}
      <section className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-border-quiet pb-1.5">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-sm font-semibold text-ink-parchment">Findings</h2>
            {selectedChapterNumber !== null ? (
              <span className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-ink-parchment flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-wine-crimson shadow-[0_0_4px_rgba(244,63,94,0.8)]" />
                <span>Ch. 0{selectedChapterNumber} only</span>
              </span>
            ) : (
              <span className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-ink-faint">
                All Chapters
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 font-mono text-[8.5px] uppercase tracking-wider">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={cn(
                  "transition-colors",
                  filter === option.id
                    ? "text-ink-parchment font-semibold underline underline-offset-4 decoration-wine-crimson"
                    : "text-ink-faint hover:text-ink-ash"
                )}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>
        </div>

        {filteredFindings.length === 0 ? (
          <p className="py-4 font-serif text-[11px] italic text-ink-ash">
            Nothing outstanding under this filter. The canon holds.
          </p>
        ) : (
          <div className="divide-y divide-border-quiet/40">
            {filteredFindings.map((issue, idx) => {
              const firstEvidence = issue.evidence?.[0];
              const chapter = firstEvidence?.chapter;
              const isCritical = issue.severity === "red";
              const typeLabel =
                issue.type === "custody_paradox"
                  ? "Custody paradox"
                  : issue.type === "spatiotemporal_conflict"
                  ? "Timeline conflict"
                  : issue.type === "knowledge_violation"
                  ? "Knowledge violation"
                  : issue.type.replace(/_/g, " ");

              return (
                <div key={issue.id} className="py-2.5 flex items-start gap-2.5 text-[10px]">
                  <div className="pt-0.5 flex flex-col items-center">
                    <span className="font-mono text-[8px] text-ink-faint tabular-nums">
                      0{idx + 1}
                    </span>
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 rounded-full",
                        isCritical ? "bg-severity-contradiction shadow-[0_0_4px_rgba(239,68,68,0.8)]" : "bg-severity-warning"
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-wider">
                      <span className="text-wine-accent font-semibold">Ch. 0{chapter}</span>
                      <span className="text-ink-faint">·</span>
                      <span className="text-ink-ash">{typeLabel}</span>
                    </div>

                    <p className="mt-0.5 font-serif text-[11px] text-ink-parchment leading-snug">
                      {issue.description}
                    </p>

                    {firstEvidence?.quote && (
                      <p className="mt-1 font-serif italic text-ink-faint text-[9.5px] line-clamp-1 border-l border-border-quiet pl-1.5">
                        &ldquo;{firstEvidence.quote}&rdquo;
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigateToEditor(chapter || 4, issue.id)}
                    className="self-center rounded bg-surface-elevated px-2 py-1 font-mono text-[8px] uppercase tracking-wider text-ink-bone hover:text-white hover:bg-wine-crimson transition-colors shrink-0 flex items-center gap-1"
                  >
                    <span>Fix</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Cast Strip */}
      <section className="mt-4 pt-3 border-t border-border-quiet/60">
        <div className="flex items-center justify-between pb-1.5">
          <span className="font-mono text-[8.5px] uppercase tracking-wider text-ink-faint">
            Cast ({MOCK_CHARACTERS.length})
          </span>
          <button
            type="button"
            onClick={onNavigateToCharacters}
            className="font-mono text-[8px] uppercase tracking-wider text-wine-crimson hover:underline"
          >
            Open World &amp; Cast Network &rarr;
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {MOCK_CHARACTERS.map((char) => (
            <div
              key={char.id}
              onClick={onNavigateToCharacters}
              className="cursor-pointer flex items-center gap-1.5 rounded bg-surface-card/60 border border-border-quiet/80 px-2 py-1 hover:bg-surface-elevated transition-colors text-[9.5px]"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-wine-accent/30 font-serif text-[8.5px] font-bold text-ink-parchment">
                {char.name[0]}
              </span>
              <span className="font-serif text-ink-parchment truncate max-w-[100px]">{char.name}</span>
              <span className="font-mono text-[7.5px] uppercase text-ink-faint">Ch. 0{char.first_chapter}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
