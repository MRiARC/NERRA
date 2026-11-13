"use client";

import React, { useState, use, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useProject,
  useManuscripts,
  useChapters,
  useChapter,
  useIssues,
  useManuscriptStatus,
} from "@/hooks/useStoryData";
import { Button } from "@/components/ui/Button";
import { formatWords, getErrorMessage } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Save,
  RefreshCw,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

/**
 * The editor is the desk. One page of prose, one measure of text, and the
 * continuity notes sitting in the margin where an editor would write them.
 */
export default function EditorPage({ params }: EditorPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const searchParams = useSearchParams();

  const chapterFromQuery = Number(searchParams.get("chapter")) || 1;
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number>(chapterFromQuery);
  // The draft is keyed by chapter so switching chapters never leaks stale prose.
  const [draft, setDraft] = useState<{ chapter: number; content: string; title: string } | null>(
    null
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTriggeringReanalysis, setIsReanalyzing] = useState<boolean>(false);
  const [showMargin, setShowMargin] = useState<boolean>(true);

  const { data: project } = useProject(projectId);
  const { data: manuscripts = [] } = useManuscripts(projectId);
  const activeManuscript = manuscripts[0];
  const manuscriptId = activeManuscript?.id;

  const { data: chapters = [], refetch: refetchChapters } = useChapters(projectId, manuscriptId);
  const {
    data: currentChapter,
    isLoading: chapterLoading,
    refetch: refetchCurrentChapter,
  } = useChapter(projectId, manuscriptId, selectedChapterNumber);
  const { data: allIssues = [], refetch: refetchIssues } = useIssues(projectId);
  const { data: manuscriptStatus } = useManuscriptStatus(projectId, manuscriptId);

  const baseContent = currentChapter?.content ?? "";
  const baseTitle = currentChapter?.title || `Chapter ${selectedChapterNumber}`;
  const content = draft && draft.chapter === selectedChapterNumber ? draft.content : baseContent;
  const chapterTitle = draft && draft.chapter === selectedChapterNumber ? draft.title : baseTitle;
  const isDirty = Boolean(
    draft &&
      draft.chapter === selectedChapterNumber &&
      (draft.content !== baseContent || draft.title !== baseTitle)
  );

  const setContent = (value: string) =>
    setDraft((prev) => ({
      chapter: selectedChapterNumber,
      content: value,
      title: prev && prev.chapter === selectedChapterNumber ? prev.title : baseTitle,
    }));

  const setChapterTitle = (value: string) =>
    setDraft((prev) => ({
      chapter: selectedChapterNumber,
      content: prev && prev.chapter === selectedChapterNumber ? prev.content : baseContent,
      title: value,
    }));

  const engineRunning =
    manuscriptStatus?.status === "processing" || manuscriptStatus?.status === "pending";
  const isReanalyzing = isTriggeringReanalysis || engineRunning;

  const previousStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    const nextStatus = manuscriptStatus?.status;
    if (previousStatus.current === "processing" && nextStatus === "ready") {
      refetchIssues();
      refetchChapters();
      refetchCurrentChapter();
    }
    previousStatus.current = nextStatus;
  }, [manuscriptStatus?.status, refetchIssues, refetchChapters, refetchCurrentChapter]);

  const wordCount = useMemo(() => {
    const trimmed = content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [content]);
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 225));

  const chapterIssues = useMemo(() => {
    return allIssues.filter((issue) => issue.evidence?.some((e) => e.chapter === selectedChapterNumber));
  }, [allIssues, selectedChapterNumber]);

  const handleSave = async () => {
    if (!manuscriptId) {
      toast.error("No active manuscript found");
      return;
    }
    setIsSaving(true);
    try {
      await api.projects.updateChapter(projectId, manuscriptId, selectedChapterNumber, {
        content,
        title: chapterTitle,
      });
      setDraft(null);
      toast.success(`Chapter ${selectedChapterNumber} saved.`);
      refetchChapters();
      refetchCurrentChapter();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Could not save this chapter"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReanalyze = async () => {
    if (!manuscriptId) return;
    setIsReanalyzing(true);
    try {
      await api.projects.reanalyzeChapter(projectId, manuscriptId, selectedChapterNumber);
      toast.info(`Chapter ${selectedChapterNumber} queued for re-reading.`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Could not queue the re-analysis"));
    } finally {
      setIsReanalyzing(false);
    }
  };

  const goToChapter = (next: number) => {
    if (isDirty && !window.confirm("You have unsaved changes. Switch chapter anyway?")) return;
    setSelectedChapterNumber(Math.max(1, next));
  };

  return (
    <div className="min-h-full bg-surface-void text-ink-parchment">
      {/* Desk bar */}
      <div className="sticky top-0 z-30 border-b border-border-quiet bg-surface-void/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/projects/${projectId}`}
              className="text-ink-ash transition-colors hover:text-ink-parchment"
              title="Back to the dossier"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="hidden truncate font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint sm:inline">
              {project?.title || "Manuscript"}
            </span>
            <span aria-hidden className="hidden h-3 w-px bg-border-subtle sm:block" />
            <select
              value={selectedChapterNumber}
              onChange={(e) => goToChapter(Number(e.target.value))}
              aria-label="Chapter"
              className="max-w-[240px] cursor-pointer truncate bg-transparent font-mono text-[10px] uppercase tracking-[0.16em] text-ink-bone focus:outline-none"
            >
              {chapters.length > 0 ? (
                chapters.map((chapter) => (
                  <option key={chapter.number} value={chapter.number} className="bg-surface-elevated">
                    Ch. {String(chapter.number).padStart(2, "0")} · {chapter.title}
                  </option>
                ))
              ) : (
                <option value={1}>Chapter 1</option>
              )}
            </select>
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.16em] ${
                isDirty ? "text-severity-warning" : "text-ink-faint"
              }`}
            >
              {isDirty ? "unsaved" : "saved"}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint md:inline">
              {formatWords(wordCount)} · {readingTimeMin} min
            </span>

            <button
              type="button"
              onClick={() => setShowMargin((open) => !open)}
              aria-pressed={showMargin}
              className={`hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors sm:inline-flex ${
                chapterIssues.length > 0
                  ? "text-severity-contradiction"
                  : "text-ink-faint hover:text-ink-ash"
              }`}
              title="Toggle continuity notes"
            >
              <AlertTriangle className="h-3 w-3" />
              {chapterIssues.length} notes
            </button>

            <button
              type="button"
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-ink-parchment disabled:opacity-40 sm:inline-flex sm:items-center sm:gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${isReanalyzing ? "animate-spin" : ""}`} />
              Re-read
            </button>

            <Link
              href={`/projects/${projectId}/reader?chapter=${selectedChapterNumber}`}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-ash transition-colors hover:text-ink-parchment"
            >
              <BookOpen className="h-3 w-3" />
              <span className="hidden sm:inline">Reader</span>
            </Link>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="gap-1.5"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Save</span>
            </Button>
          </div>
        </div>
      </div>

      {/* The page */}
      <div
        className={`mx-auto grid w-full gap-14 px-5 pb-24 pt-12 sm:px-8 ${
          showMargin ? "max-w-[1240px] xl:grid-cols-[minmax(0,1fr)_280px]" : "max-w-[760px]"
        }`}
      >
        <article className="mx-auto w-full max-w-[720px]">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
            Chapter {String(selectedChapterNumber).padStart(2, "0")}
            {chapters.length > 0 ? ` of ${String(chapters.length).padStart(2, "0")}` : ""}
          </p>

          <input
            type="text"
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            placeholder="Chapter title"
            aria-label="Chapter title"
            className="mt-3 w-full border-0 bg-transparent font-serif text-3xl font-medium tracking-tight text-ink-parchment placeholder:text-ink-faint focus:outline-none sm:text-4xl"
          />

          <div aria-hidden className="mt-6 h-px w-16 bg-wine-crimson/60" />

          {chapterLoading ? (
            <div className="mt-10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              <Loader2 className="h-3 w-3 animate-spin" />
              Opening the chapter…
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Begin here. The page is yours."
              aria-label="Chapter text"
              spellCheck={false}
              className="mt-8 min-h-[62vh] w-full resize-none border-0 bg-transparent font-prose text-[18px] leading-[1.9] text-ink-bone placeholder:text-ink-faint/60 focus:outline-none"
            />
          )}

          <div className="mt-8 flex items-center justify-between border-t border-border-quiet pt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            <span>
              {wordCount.toLocaleString()} words · {content.length.toLocaleString()} characters
            </span>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => goToChapter(selectedChapterNumber - 1)}
                disabled={selectedChapterNumber <= 1}
                className="inline-flex items-center gap-1 transition-colors hover:text-ink-parchment disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-3 w-3" /> Prev
              </button>
              <button
                type="button"
                onClick={() => goToChapter(selectedChapterNumber + 1)}
                disabled={selectedChapterNumber >= (chapters.length || 1)}
                className="inline-flex items-center gap-1 transition-colors hover:text-ink-parchment disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </article>

        {/* Margin notes */}
        {showMargin && (
          <aside className="xl:pt-9">
            <div className="flex items-baseline justify-between border-b border-border-quiet pb-2">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-ash">
                Chapter notes
              </h2>
              <span className="font-mono text-[10px] tabular-nums text-ink-faint">
                {chapterIssues.length}
              </span>
            </div>

            {chapterIssues.length === 0 ? (
              <p className="mt-5 font-serif text-[14px] italic leading-relaxed text-ink-ash">
                {isReanalyzing
                  ? "The re-reading is in progress. Notes will appear here."
                  : "Nothing in this chapter contradicts the rest of the book."}
              </p>
            ) : (
              <ol className="mt-1 divide-y divide-border-quiet">
                {chapterIssues.map((issue) => (
                  <li key={issue.id} className="py-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                      {issue.type.replace(/_/g, " ")}
                    </p>
                    {issue.evidence?.[0]?.quote && (
                      <blockquote className="mt-2 border-l-2 border-wine-crimson/50 pl-2.5 font-serif text-[13px] italic leading-relaxed text-ink-bone">
                        &ldquo;{issue.evidence[0].quote}&rdquo;
                      </blockquote>
                    )}
                    <p className="mt-1.5 text-[12px] leading-relaxed text-ink-ash">
                      {issue.description}
                    </p>
                  </li>
                ))}
              </ol>
            )}

            <Link
              href={`/projects/${projectId}/issues`}
              className="mt-5 inline-flex font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-ink-parchment"
            >
              All findings →
            </Link>
          </aside>
        )}
      </div>
    </div>
  );
}
