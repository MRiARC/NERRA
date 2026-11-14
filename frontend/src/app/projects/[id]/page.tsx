"use client";

import React, { useEffect, useMemo, useRef, useState, use } from "react";
import Link from "next/link";
import {
  useProject,
  useIssues,
  useCharacters,
  useManuscripts,
  useChapters,
} from "@/hooks/useStoryData";
import { ManuscriptRuler } from "@/components/project/ManuscriptRuler";
import { FindingRow } from "@/components/project/FindingRow";
import { Button } from "@/components/ui/Button";
import { ImportManuscriptModal } from "@/components/dashboard/ImportManuscriptModal";
import { api } from "@/lib/api";
import { formatWords, getErrorMessage } from "@/lib/utils";
import { ArrowRight, Download, Loader2, MoreHorizontal, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";

interface ProjectHubPageProps {
  params: Promise<{ id: string }>;
}

type FindingFilter = "major" | "minor" | "all";

export default function ProjectHubPage({ params }: ProjectHubPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { data: project, refetch: refetchProject } = useProject(projectId);
  const { data: issues = [], refetch: refetchIssues } = useIssues(projectId);
  const { data: characters = [] } = useCharacters(projectId);
  const { data: manuscripts = [] } = useManuscripts(projectId);

  const activeManuscript = manuscripts[0];
  const { data: chapters = [] } = useChapters(projectId, activeManuscript?.id);

  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState<FindingFilter>("major");
  const [isAuditing, setIsAuditing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const totalWords = project?.word_count ?? chapters.reduce((acc, c) => acc + (c.word_count || 0), 0);
  const totalChapters = project?.chapter_count ?? activeManuscript?.chapters_total ?? chapters.length;
  const graphNodes =
    (project?.character_count ?? characters.length) +
    (project?.location_count ?? 0) +
    (project?.object_count ?? 0);

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
    if (chapters.length === 0) return null;
    return chapters.find((c) => c.number === selectedChapterNumber) || chapters[0];
  }, [chapters, selectedChapterNumber]);

  const selectedChapterFindings = useMemo(() => {
    if (!activeSelectedChapter) return 0;
    return openIssues.filter((issue) =>
      issue.evidence?.some((e) => e.chapter === activeSelectedChapter.number)
    ).length;
  }, [openIssues, activeSelectedChapter]);

  const filteredFindings = useMemo(() => {
    const list =
      filter === "major" ? criticalIssues : filter === "minor" ? minorIssues : openIssues;
    return [...list].sort(
      (a, b) => (a.evidence?.[0]?.chapter ?? 999) - (b.evidence?.[0]?.chapter ?? 999)
    );
  }, [filter, criticalIssues, minorIssues, openIssues]);

  const stateLine = useMemo(() => {
    if (totalChapters === 0) {
      return "No chapters on file yet. Import a draft and I will map the cast, the timeline, and every contradiction in it.";
    }
    const volume = `${totalChapters} ${totalChapters === 1 ? "chapter" : "chapters"}. ${formatWords(
      totalWords
    )}.`;
    if (criticalIssues.length > 0) {
      return `${volume} ${criticalIssues.length} ${
        criticalIssues.length === 1 ? "contradiction" : "contradictions"
      } in ${affectedChapterCount} of them.`;
    }
    if (minorIssues.length > 0) {
      return `${volume} ${minorIssues.length} minor ${
        minorIssues.length === 1 ? "finding" : "findings"
      } across ${affectedChapterCount} chapters.`;
    }
    return `${volume} Nothing contradicts itself today.`;
  }, [totalChapters, totalWords, criticalIssues.length, minorIssues.length, affectedChapterCount]);

  const handleExportBible = async () => {
    setMenuOpen(false);
    try {
      const bible = await api.story.exportBible(projectId);
      const blob = new Blob([bible.markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${project?.title || "Story"}_Bible.md`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Story Bible compiled and downloaded.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to compile Story Bible"));
    }
  };

  const handleTriggerAudit = async () => {
    setMenuOpen(false);
    setIsAuditing(true);
    try {
      const result = await api.story.audit(projectId);
      await Promise.all([refetchIssues(), refetchProject()]);
      toast.success(
        `Audit complete: ${result.issues_open} open of ${result.issues_total} recorded.`
      );
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to run consistency audit"));
    } finally {
      setIsAuditing(false);
    }
  };

  const status = activeManuscript?.status || "ready";
  const filterOptions: Array<{ id: FindingFilter; label: string; count: number }> = [
    { id: "major", label: "Major", count: criticalIssues.length },
    { id: "minor", label: "Minor", count: minorIssues.length },
    { id: "all", label: "All", count: openIssues.length },
  ];

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-6 sm:px-8 py-10 sm:py-14">
      {/* Masthead */}
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-ash">
          <span>Story overview</span>
          {project?.genre && (
            <>
              <span aria-hidden className="h-px w-6 bg-border-subtle" />
              <span className="text-ink-faint">{project.genre}</span>
            </>
          )}
        </div>

        <h1 className="mt-5 font-serif text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.1] tracking-tight text-ink-parchment">
          {project?.title || "Untitled manuscript"}
        </h1>

        <p className="mt-4 max-w-2xl font-serif text-base italic leading-relaxed text-ink-bone sm:text-lg">
          {stateLine}
        </p>

        <div className="mt-7 flex items-center gap-3">
          <Link href={`/projects/${projectId}/editor`}>
            <Button variant="primary" size="md" className="gap-2">
              <span>Continue writing</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Manuscript actions"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-ink-ash transition-colors hover:border-border-prominent hover:bg-surface-card hover:text-ink-parchment focus:outline-none focus-visible:border-border-focus"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute left-0 z-30 mt-2 w-60 rounded-xl border border-border-subtle bg-surface-elevated p-1.5 text-xs text-ink-bone shadow-[0_12px_36px_rgba(0,0,0,0.6)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleTriggerAudit}
                  disabled={isAuditing}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-card hover:text-ink-parchment disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-wine-crimson" />
                  <span>{isAuditing ? "Auditing…" : "Re-run consistency audit"}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleExportBible}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-card hover:text-ink-parchment"
                >
                  <Download className="w-3.5 h-3.5 text-ink-ash" />
                  <span>Export story bible</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setImportModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-card hover:text-ink-parchment"
                >
                  <Upload className="w-3.5 h-3.5 text-ink-ash" />
                  <span>Import a new draft</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Continuity Audit state banner */}
      {isAuditing && (
        <div className="mt-9 border-l-2 border-wine-accent py-2 pl-4 bg-surface-elevated/40 rounded-r-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-wine-accent shrink-0" />
            <p className="text-[13px] leading-relaxed text-ink-bone">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-wine-accent font-semibold">
                Auditing Canon ·{" "}
              </span>
              Checking cross-chapter continuity, world rules consistency, and timeline chronology with sovereign AI…
            </p>
          </div>
        </div>
      )}

      {/* Pipeline state — one line, only when it matters */}
      {status === "failed" && (
        <div className="mt-9 border-l-2 border-wine-crimson py-1 pl-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-[13px] leading-relaxed text-ink-bone">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-wine-crimson">
                Extraction interrupted ·{" "}
              </span>
              {activeManuscript?.error_note || "The analysis pipeline stopped unexpectedly."}
            </p>
            <div className="flex shrink-0 items-center gap-4 font-mono text-[10px] uppercase tracking-[0.16em]">
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="text-wine-crimson transition-colors hover:text-ink-parchment"
              >
                Recover
              </button>
              <Link
                href={`/projects/${projectId}/ingestion`}
                className="text-ink-ash transition-colors hover:text-ink-parchment"
              >
                Radar →
              </Link>
            </div>
          </div>
        </div>
      )}

      {status === "processing" && (
        <div className="mt-9 border-l-2 border-severity-warning py-1 pl-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] leading-relaxed text-ink-bone">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-severity-warning">
                Reading ·{" "}
              </span>
              Chapter {activeManuscript?.chapters_done || 0} of{" "}
              {activeManuscript?.chapters_total || chapters.length || 0} processed. Entities,
              chronology, and contradictions are being mapped.
            </p>
            <Link
              href={`/projects/${projectId}/ingestion`}
              className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-ash transition-colors hover:text-ink-parchment"
            >
              Live radar →
            </Link>
          </div>
        </div>
      )}

      {/* Manuscript ruler */}
      {chapters.length > 0 ? (
        <section className="mt-12">
          <ManuscriptRuler
            chapters={chapters}
            issues={openIssues}
            selectedChapter={activeSelectedChapter?.number ?? null}
            onSelect={(chapterNumber) => setSelectedChapterNumber(chapterNumber)}
          />

          {activeSelectedChapter && (
            <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <p className="min-w-0">
                <span className="font-serif text-lg text-ink-parchment">
                  {activeSelectedChapter.title}
                </span>
                <span className="ml-2 text-[13px] text-ink-ash">
                  {formatWords(activeSelectedChapter.word_count)} ·{" "}
                  {selectedChapterFindings}{" "}
                  {selectedChapterFindings === 1 ? "finding" : "findings"}
                </span>
              </p>

              <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.16em]">
                <Link
                  href={`/projects/${projectId}/reader?chapter=${activeSelectedChapter.number}`}
                  className="text-ink-ash transition-colors hover:text-ink-parchment"
                >
                  Read
                </Link>
                <Link
                  href={`/projects/${projectId}/editor?chapter=${activeSelectedChapter.number}`}
                  className="text-ink-ash transition-colors hover:text-ink-parchment"
                >
                  Write
                </Link>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-12 border-t border-dashed border-border-subtle py-16 text-center">
          <p className="font-serif text-2xl text-ink-parchment">No chapters yet.</p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
            Import a draft to draw the manuscript ruler
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportModalOpen(true)}
              className="gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import manuscript</span>
            </Button>
          </div>
        </section>
      )}

      {/* Findings */}
      <section className="mt-16">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 border-b border-border-prominent pb-3">
          <h2 className="font-serif text-xl font-medium text-ink-parchment">Findings</h2>

          <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.16em]">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={filter === option.id}
                onClick={() => setFilter(option.id)}
                className={`transition-colors ${
                  filter === option.id
                    ? "text-ink-parchment"
                    : "text-ink-faint hover:text-ink-ash"
                }`}
              >
                {option.label}
                <span className="ml-1 tabular-nums text-ink-faint">{option.count}</span>
              </button>
            ))}
          </div>
        </div>

        {filteredFindings.length === 0 ? (
          <p className="py-10 font-serif text-[15px] italic text-ink-ash">
            Nothing outstanding in this category. The manuscript holds.
          </p>
        ) : (
          <div>
            {filteredFindings.slice(0, 4).map((issue, index) => (
              <FindingRow key={issue.id} issue={issue} index={index} projectId={projectId} />
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em]">
          <Link
            href={`/projects/${projectId}/editor?scope=book`}
            className="inline-flex items-center gap-1.5 text-ink-ash transition-colors hover:text-ink-parchment"
          >
            <span>All {openIssues.length} findings</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <span className="text-ink-faint">
            {openIssues.length > 4 ? `Showing 4 of ${filteredFindings.length}` : ""}
          </span>
        </div>
      </section>

      {/* Cast */}
      <section className="mt-16">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-xl font-medium text-ink-parchment">Cast</h2>
          <Link
            href={`/projects/${projectId}/characters`}
            className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-ink-parchment"
          >
            All {characters.length} →
          </Link>
        </div>

        {characters.length === 0 ? (
          <p className="mt-4 font-serif text-[15px] italic text-ink-ash">
            No one has walked onto the page yet.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-x-7 gap-y-3">
            {characters.slice(0, 12).map((character) => (
              <Link
                key={character.id}
                href={`/projects/${projectId}/characters`}
                className="group inline-flex items-baseline gap-2"
              >
                <span className="font-serif text-base text-ink-bone transition-colors group-hover:text-ink-parchment">
                  {character.name}
                </span>
                {character.first_chapter ? (
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                    Ch. {String(character.first_chapter).padStart(2, "0")}
                  </span>
                ) : null}
              </Link>
            ))}
            {characters.length > 12 && (
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                +{characters.length - 12} more
              </span>
            )}
          </div>
        )}
      </section>

      {/* State line */}
      <footer className="mt-16 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border-quiet pt-5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
        <span>
          {activeManuscript?.chapters_done ?? 0}/{activeManuscript?.chapters_total ?? totalChapters}{" "}
          ingested
        </span>
        <span aria-hidden>·</span>
        <span>{graphNodes} graph nodes</span>
        <span aria-hidden>·</span>
        <span>{openIssues.length} findings logged</span>
        <span className="ml-auto flex items-center gap-2">
          <span
            className={`h-1 w-1 rounded-full ${
              status === "failed"
                ? "bg-severity-contradiction"
                : status === "processing"
                ? "bg-severity-warning animate-pulse"
                : "bg-severity-thread"
            }`}
          />
          {status}
        </span>
      </footer>

      <ImportManuscriptModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        project={project || null}
        initialManuscriptId={activeManuscript?.id}
        initialStep={
          activeManuscript?.status === "failed"
            ? "failed"
            : activeManuscript?.status === "processing"
            ? "processing"
            : "select"
        }
        onImportComplete={() => {
          setImportModalOpen(false);
          refetchProject();
        }}
      />
    </div>
  );
}
