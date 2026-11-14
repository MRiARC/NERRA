"use client";

import React, { use, useMemo, useState, useEffect, useRef } from "react";
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
import { formatWords, getErrorMessage, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Save,
  RefreshCw,
  Loader2,
  X,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import {
  MarkdownEditor,
  type EditorMark,
  type MarkdownEditorHandle,
} from "@/components/editor/MarkdownEditor";
import { FindingNotes } from "@/components/editor/FindingNotes";
import { FindingCase } from "@/components/editor/FindingCase";
import { FindingBoard } from "@/components/editor/FindingBoard";
import {
  chapterFor,
  isOpen,
  orderByParagraph,
  quoteForChapter,
} from "@/components/editor/findings";
import type { Issue } from "@/lib/types";

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

/** The prose without its markdown punctuation, so counts describe the chapter
 *  and not the storage format. */
function stripMarkdown(markdown: string) {
  return markdown
    .replace(/^\s*(\*\s*){3}$/gm, "")
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\*\*|`|\*/g, "");
}

/**
 * A galley proof on a desk: the contents on the left, one leaf of prose in the
 * middle with its formatting rendered as formatting, and the checker's marks in
 * the margin beside the paragraph they belong to.
 */
export default function EditorPage({ params }: EditorPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const searchParams = useSearchParams();

  const chapterFromQuery = Number(searchParams.get("chapter")) || 1;
  const initialIssue = searchParams.get("issue");
  const initialScope = searchParams.get("scope");
  const initialFindings = searchParams.get("findings");

  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number>(chapterFromQuery);
  const [draft, setDraft] = useState<{ chapter: number; content: string; title: string } | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [showRail, setShowRail] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [paragraph, setParagraph] = useState(1);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [storedDraft, setStoredDraft] = useState<{ content: string; title: string } | null>(null);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(initialIssue);
  const [posture, setPosture] = useState<"write" | "review">(
    initialIssue ? "review" : "write"
  );
  const [boardOpen, setBoardOpen] = useState(
    initialFindings === "1" || (initialScope === "book" && !initialIssue)
  );
  const [pendingFocus, setPendingFocus] = useState<{
    issueId: string;
    quote?: string;
    chapter: number;
  } | null>(null);

  // Sync chapter when URL ?chapter= changes
  useEffect(() => {
    const ch = Number(searchParams.get("chapter"));
    if (ch && ch > 0 && ch !== selectedChapterNumber) {
      setSelectedChapterNumber(ch);
    }
  }, [searchParams, selectedChapterNumber]);

  // Sync boardOpen when ?scope=book or ?findings=1 changes without an issue
  useEffect(() => {
    const scope = searchParams.get("scope");
    const findings = searchParams.get("findings");
    const issue = searchParams.get("issue");
    if (findings === "1" || (scope === "book" && !issue)) {
      setBoardOpen(true);
    }
  }, [searchParams]);

  const editorRef = useRef<MarkdownEditorHandle>(null);

  const { data: project } = useProject(projectId);
  const { data: manuscripts = [] } = useManuscripts(projectId);
  const manuscriptId = manuscripts[0]?.id;

  const { data: chapters = [], refetch: refetchChapters } = useChapters(projectId, manuscriptId);
  const {
    data: currentChapter,
    isLoading: chapterLoading,
    isError: chapterError,
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
    setDraft((previous) => ({
      chapter: selectedChapterNumber,
      content: value,
      title:
        previous && previous.chapter === selectedChapterNumber ? previous.title : baseTitle,
    }));

  const setChapterTitle = (value: string) =>
    setDraft((previous) => ({
      chapter: selectedChapterNumber,
      content:
        previous && previous.chapter === selectedChapterNumber ? previous.content : baseContent,
      title: value,
    }));

  const engineRunning =
    manuscriptStatus?.status === "processing" || manuscriptStatus?.status === "pending";
  const isReanalyzingNow = isReanalyzing || engineRunning;

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

  const plainText = useMemo(() => stripMarkdown(content), [content]);

  const wordCount = useMemo(() => {
    const trimmed = plainText.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [plainText]);
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 225));

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.number - b.number),
    [chapters]
  );

  const chapterIndex = useMemo(
    () => sortedChapters.findIndex((chapter) => chapter.number === selectedChapterNumber),
    [sortedChapters, selectedChapterNumber]
  );
  const previousChapter = chapterIndex > 0 ? sortedChapters[chapterIndex - 1] : null;
  const nextChapter =
    chapterIndex >= 0 && chapterIndex < sortedChapters.length - 1
      ? sortedChapters[chapterIndex + 1]
      : null;

  const issueCountByChapter = useMemo(() => {
    const map = new Map<number, number>();
    for (const issue of allIssues) {
      if (issue.status && issue.status !== "open") continue;
      for (const evidence of issue.evidence || []) {
        map.set(evidence.chapter, (map.get(evidence.chapter) || 0) + 1);
      }
    }
    return map;
  }, [allIssues]);

  const chapterIssues = useMemo(
    () =>
      allIssues.filter((issue) =>
        issue.evidence?.some((item) => item.chapter === selectedChapterNumber)
      ),
    [allIssues, selectedChapterNumber]
  );

  const draftKey = `nerra:draft:${projectId}:${selectedChapterNumber}`;

  // stored draft read after paint (localStorage only exists after mount)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) {
        setStoredDraft(null);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as { content: string; title: string };
        setStoredDraft(
          parsed.content === baseContent && parsed.title === baseTitle ? null : parsed
        );
      } catch {
        setStoredDraft(null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [draftKey, baseContent, baseTitle]);

  // autosave the in-progress draft to this device
  useEffect(() => {
    if (!isDirty || typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({ content, title: chapterTitle, at: Date.now() })
      );
    }, 700);
    return () => window.clearTimeout(timer);
  }, [content, chapterTitle, isDirty, draftKey]);

  const handleSave = async () => {
    if (!manuscriptId) {
      toast.error("No active manuscript found.");
      return;
    }
    setIsSaving(true);
    try {
      await api.projects.updateChapter(projectId, manuscriptId, selectedChapterNumber, {
        content,
        title: chapterTitle,
      });
      // The draft is deliberately kept: it is what the page is showing, and the
      // chapter cache still holds the pre-save text until the refetch lands.
      setStoredDraft(null);
      if (typeof window !== "undefined") window.localStorage.removeItem(draftKey);
      toast.success(`Chapter ${selectedChapterNumber} saved.`);
      refetchChapters();
      refetchCurrentChapter();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not save this chapter."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReanalyze = async () => {
    if (!manuscriptId) return;
    setIsReanalyzing(true);
    try {
      await api.projects.reanalyzeChapter(projectId, manuscriptId, selectedChapterNumber);
      toast.success(`Chapter ${selectedChapterNumber} re-analyzed.`);
      await Promise.all([
        refetchIssues(),
        refetchChapters(),
        refetchCurrentChapter(),
      ]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not complete the re-analysis."));
    } finally {
      setIsReanalyzing(false);
    }
  };

  const goToChapter = (next: number) => {
    if (next === selectedChapterNumber) return;
    if (isDirty && !window.confirm("You have unsaved changes. Switch chapter anyway?")) return;
    setSelectedChapterNumber(Math.max(1, next));
    setFindOpen(false);
    setParagraph(1);
    setStoredDraft(null);
    setPosture("write");
  };

  const totalWords = useMemo(
    () => sortedChapters.reduce((total, chapter) => total + (chapter.word_count || 0), 0),
    [sortedChapters]
  );

  const matches = useMemo(() => {
    if (!findQuery) return 0;
    const haystack = plainText.toLowerCase();
    const needle = findQuery.toLowerCase();
    let count = 0;
    let index = haystack.indexOf(needle);
    while (index !== -1) {
      count += 1;
      index = haystack.indexOf(needle, index + needle.length);
    }
    return count;
  }, [plainText, findQuery]);

  const jumpToMatch = (direction: 1 | -1) => {
    if (!findQuery) return;
    editorRef.current?.find(findQuery, direction);
  };

  const replaceCurrent = () => {
    if (!findQuery) return;
    editorRef.current?.replaceCurrent(findQuery, replaceQuery);
  };

  const replaceAll = () => {
    if (!findQuery) return;
    const pattern = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    setContent(content.replace(pattern, replaceQuery));
    toast.success("Replaced every match in this chapter.");
  };

  // The quotation that belongs to the chapter on screen, not just the first one
  // the checker recorded.
  const marks = useMemo<EditorMark[]>(() => {
    return chapterIssues
      .filter((issue) => !issue.status || issue.status === "open")
      .map((issue) => ({
        id: issue.id,
        quote: quoteForChapter(issue, selectedChapterNumber),
        severity: issue.severity || "red",
      }))
      .filter((mark) => mark.quote.trim().length > 0);
  }, [chapterIssues, selectedChapterNumber]);

  /** Opens a finding in the review desk, switching chapters when its passage
   *  belongs to another one. */
  const goToFinding = (issue: Issue, chapter: number) => {
    const quote = quoteForChapter(issue, chapter);

    if (chapter !== selectedChapterNumber) {
      if (
        isDirty &&
        !window.confirm("You have unsaved changes. Switch chapter anyway?")
      ) {
        return;
      }
      setPendingFocus({ issueId: issue.id, quote, chapter });
      setSelectedChapterNumber(Math.max(1, chapter));
      setFindOpen(false);
      setParagraph(1);
      setStoredDraft(null);
    } else {
      editorRef.current?.focusMark(issue.id, quote);
    }

    setActiveIssueId(issue.id);
    setPosture("review");
  };

  const activeIssue = useMemo(
    () => allIssues.find((issue) => issue.id === activeIssueId) ?? null,
    [allIssues, activeIssueId]
  );

  /** The review queue follows the page, so next/prev move through the chapter. */
  const reviewQueue = useMemo(
    () => orderByParagraph(chapterIssues, content, selectedChapterNumber),
    [chapterIssues, content, selectedChapterNumber]
  );
  const reviewIndex = activeIssue
    ? reviewQueue.findIndex((issue) => issue.id === activeIssue.id)
    : -1;

  const stepReview = (step: 1 | -1) => {
    const next = reviewQueue[reviewIndex + step];
    if (next) goToFinding(next, selectedChapterNumber);
  };

  // Esc leaves the desk; the board handles its own.
  useEffect(() => {
    if (posture !== "review") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !boardOpen) setPosture("write");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [posture, boardOpen]);

  // A link from the overview or a bookmark lands on the case itself: open its
  // chapter and bring the passage into view.
  const requestedIssueId = searchParams.get("issue");
  const lastHandledIssueId = useRef<string | null>(null);
  useEffect(() => {
    if (!requestedIssueId || allIssues.length === 0) return;
    if (lastHandledIssueId.current === requestedIssueId) return;
    const issue = allIssues.find((item) => item.id === requestedIssueId);
    if (!issue) return;
    lastHandledIssueId.current = requestedIssueId;

    const timer = window.setTimeout(() => {
      const chapter =
        issue.evidence?.find((item) => item.chapter === selectedChapterNumber)?.chapter ??
        issue.evidence?.[0]?.chapter ??
        selectedChapterNumber;
      setActiveIssueId(issue.id);
      setPosture("review");
      setPendingFocus({
        issueId: issue.id,
        quote: quoteForChapter(issue, chapter),
        chapter,
      });
      if (chapter !== selectedChapterNumber) setSelectedChapterNumber(chapter);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [allIssues, requestedIssueId, selectedChapterNumber]);

  // A finding in another chapter is only focused once that leaf has rendered.
  useEffect(() => {
    if (!pendingFocus) return;
    if (pendingFocus.chapter !== selectedChapterNumber || chapterLoading) return;
    const timer = window.setTimeout(() => {
      editorRef.current?.focusMark(pendingFocus.issueId, pendingFocus.quote);
      setPendingFocus(null);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [pendingFocus, selectedChapterNumber, chapterLoading, content]);

  const handleTitleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const modifier = event.metaKey || event.ctrlKey;
    if (!modifier) return;
    if (event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (isDirty) handleSave();
    }
    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      setFindOpen(true);
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-surface-void">
      {/* Doc chrome — focused document controls */}
      <div className="flex h-13 shrink-0 items-center justify-between gap-3 bg-surface-subtle/20 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            href={`/projects/${projectId}`}
            className="rounded p-1 text-ink-faint transition-colors hover:text-ink-parchment"
            title="Back to the dossier"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>

          {/* Quick chapter stepper */}
          <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-ash">
            <button
              type="button"
              onClick={() => previousChapter && goToChapter(previousChapter.number)}
              disabled={!previousChapter}
              title="Previous chapter"
              className="rounded p-0.5 text-ink-faint transition-colors hover:text-ink-parchment disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <span className="tabular-nums font-semibold text-ink-parchment px-1">
              Ch {String(selectedChapterNumber).padStart(2, "0")}
            </span>
            <span className="text-ink-faint/60">/ {sortedChapters.length || 1}</span>
            <button
              type="button"
              onClick={() => nextChapter && goToChapter(nextChapter.number)}
              disabled={!nextChapter}
              title="Next chapter"
              className="rounded p-0.5 text-ink-faint transition-colors hover:text-ink-parchment disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <span aria-hidden className="hidden mx-1 text-ink-faint/30 md:inline">·</span>

          <span className="hidden truncate font-serif text-[13px] text-ink-parchment md:inline max-w-[280px]">
            {chapterTitle.replace(/^Chapter\s+\d+[:\s-]*/i, "").trim() || chapterTitle}
          </span>
          <span
            aria-hidden
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
              isDirty ? "bg-severity-warning" : "bg-ink-faint/40"
            )}
            title={isDirty ? "Unsaved changes" : "All changes saved"}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setBoardOpen(true)}
            title="Every finding in the book"
            className="items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint transition-colors hover:bg-surface-elevated/60 hover:text-ink-parchment inline-flex"
          >
            <span className="tabular-nums font-semibold text-ink-parchment">
              {allIssues.filter(isOpen).length}
            </span>
            <span className="hidden sm:inline">findings</span>
          </button>

          <button
            type="button"
            onClick={handleReanalyze}
            disabled={isReanalyzingNow}
            className="hidden items-center gap-1.5 rounded-lg bg-surface-elevated/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-ash transition-colors hover:text-ink-parchment disabled:opacity-60 sm:inline-flex"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isReanalyzingNow && "animate-spin text-wine-accent")} />
            {isReanalyzingNow ? "Analyzing…" : "Re-read"}
          </button>

          <Link
            href={`/projects/${projectId}/reader?chapter=${selectedChapterNumber}`}
            className="hidden items-center gap-1.5 rounded-lg bg-surface-elevated/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-ash transition-colors hover:text-ink-parchment sm:inline-flex"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Read
          </Link>

          <button
            type="button"
            onClick={() => setFindOpen((open) => !open)}
            aria-pressed={findOpen}
            className={cn(
              "items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors sm:rounded-lg",
              findOpen
                ? "bg-surface-elevated text-ink-parchment shadow-sm"
                : "bg-surface-elevated/60 text-ink-ash hover:text-ink-parchment"
            )}
          >
            Find
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isDirty || chapterError}
            className={cn(
              "items-center gap-1.5 rounded-md px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors sm:rounded-lg",
              isDirty && !chapterError
                ? "bg-wine-accent text-ink-parchment shadow-sm hover:bg-wine-crimson disabled:opacity-50"
                : "bg-surface-elevated/60 text-ink-faint/60"
            )}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </button>

          <span aria-hidden className="mx-1 text-ink-faint/30">·</span>

          {/* Rail & Notes Toggles — always accessible */}
          <button
            type="button"
            onClick={() => setShowRail((open) => !open)}
            aria-pressed={showRail}
            aria-label="Toggle contents rail"
            title={showRail ? "Hide contents" : "Show contents"}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              showRail
                ? "bg-surface-elevated text-ink-parchment"
                : "text-ink-faint hover:bg-surface-elevated/60 hover:text-ink-parchment"
            )}
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowNotes((open) => !open)}
            aria-pressed={showNotes}
            aria-label="Toggle notes margin"
            title={showNotes ? "Hide notes" : "Show notes"}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              showNotes
                ? "bg-surface-elevated text-ink-parchment"
                : "text-ink-faint hover:bg-surface-elevated/60 hover:text-ink-parchment"
            )}
          >
            <PanelRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Contents rail — clean chapter list */}
        {posture === "write" && showRail && (
          <nav className="w-[264px] shrink-0 flex-col bg-surface-subtle/10 p-4 flex">
            <div className="pb-3 pt-0.5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] font-medium text-wine-crimson">
                  Contents
                </p>
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                  {sortedChapters.length} Ch
                </span>
              </div>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                {formatWords(totalWords)}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-1 pt-2 pb-2">
              <ol className="space-y-1">
                {sortedChapters.map((chapter) => {
                  const isActive = chapter.number === selectedChapterNumber;
                  const notes = issueCountByChapter.get(chapter.number) || 0;
                  const cleanTitle =
                    chapter.title?.replace(/^Chapter\s+\d+[:\s-]*/i, "").trim() ||
                    `Chapter ${chapter.number}`;

                  return (
                    <li key={chapter.number}>
                      <button
                        type="button"
                        onClick={() => goToChapter(chapter.number)}
                        title={chapter.title || `Chapter ${chapter.number}`}
                        className={cn(
                          "group relative flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all",
                          isActive
                            ? "bg-white/[0.07] text-ink-parchment shadow-sm"
                            : "hover:bg-white/[0.03] hover:text-ink-bone text-ink-ash"
                        )}
                      >
                        {isActive && (
                          <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r bg-wine-crimson" />
                        )}
                        <span
                          className={cn(
                            "w-5 shrink-0 pt-0.5 font-mono text-[10px] tabular-nums",
                            isActive ? "font-semibold text-wine-crimson" : "text-ink-faint/70 group-hover:text-ink-ash"
                          )}
                        >
                          {String(chapter.number).padStart(2, "0")}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 flex-1 font-serif text-[12.5px] leading-snug line-clamp-2",
                            isActive
                              ? "font-medium text-ink-parchment"
                              : "text-ink-ash group-hover:text-ink-bone"
                          )}
                        >
                          {cleanTitle}
                        </span>
                        {notes > 0 && (
                          <span
                            aria-hidden
                            className={cn(
                              "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                              isActive
                                ? "bg-wine-crimson shadow-[0_0_6px_rgba(168,45,84,0.6)]"
                                : "bg-wine-crimson/50"
                            )}
                            title={`${notes} open findings`}
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>

              {sortedChapters.length === 0 && (
                <p className="px-2 py-4 font-serif text-[12px] italic leading-relaxed text-ink-ash">
                  No chapters yet. Import a manuscript to begin.
                </p>
              )}
            </div>
          </nav>
        )}

        {/* Review collapses the contents to a spine of chapter numbers. */}
        {posture === "review" && (
          <nav className="w-[52px] shrink-0 flex-col items-center bg-surface-subtle/20 py-4 flex">
            <span className="mb-2 font-mono text-[8px] uppercase tracking-[0.12em] text-ink-faint">
              ch
            </span>
            <div className="min-h-0 w-full flex-1 overflow-y-auto px-1">
              {sortedChapters.map((chapter) => {
                const isActive = chapter.number === selectedChapterNumber;
                const notes = issueCountByChapter.get(chapter.number) || 0;
                return (
                  <button
                    key={chapter.number}
                    type="button"
                    onClick={() => goToChapter(chapter.number)}
                    title={chapter.title || `Chapter ${chapter.number}`}
                    className={cn(
                      "relative flex h-8 w-full items-center justify-center rounded-md font-mono text-[10px] tabular-nums transition-colors",
                      isActive
                        ? "bg-surface-elevated text-ink-parchment font-medium"
                        : "text-ink-faint hover:bg-surface-elevated/60 hover:text-ink-ash"
                    )}
                  >
                    {String(chapter.number).padStart(2, "0")}
                    {notes > 0 && (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute right-1 top-1 h-[3px] w-[3px] rounded-full",
                          isActive ? "bg-wine-crimson" : "bg-wine-crimson/50"
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {/* The leaf — softened */}
        <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto bg-surface-void">
          {/* Re-analysis in-flight banner */}
          {isReanalyzingNow && (
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border-subtle bg-surface-elevated/95 px-6 py-2.5 backdrop-blur">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-wine-accent" />
                <span className="font-mono text-xs text-ink-parchment">
                  Re-analyzing Chapter {selectedChapterNumber} with sovereign AI…
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-ash">
                Multi-pass Entity &amp; Rule Extraction
              </span>
            </div>
          )}
          {/* Find — docked neatly above the prose without displacing sidebars */}
          {findOpen && (
            <div className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 bg-surface-card/95 px-5 py-2.5 shadow-md backdrop-blur sm:px-8">
              <span className="font-serif text-[12px] italic text-ink-faint">Find</span>
              <input
                autoFocus
                value={findQuery}
                onChange={(event) => setFindQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    jumpToMatch(event.shiftKey ? -1 : 1);
                  }
                  if (event.key === "Escape") setFindOpen(false);
                }}
                placeholder="Find in this chapter..."
                className="w-[200px] border-0 border-b border-border-quiet bg-transparent pb-1 font-serif text-[13px] text-ink-parchment placeholder:text-ink-faint/60 focus:border-border-focus focus:outline-none"
              />
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                {matches} {matches === 1 ? "match" : "matches"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => jumpToMatch(-1)}
                  aria-label="Previous match"
                  title="Previous match"
                  className="rounded p-1 text-ink-faint transition-colors hover:text-ink-parchment"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => jumpToMatch(1)}
                  aria-label="Next match"
                  title="Next match"
                  className="rounded p-1 text-ink-faint transition-colors hover:text-ink-parchment"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <span aria-hidden className="mx-1 text-ink-faint/30">·</span>

              <input
                value={replaceQuery}
                onChange={(event) => setReplaceQuery(event.target.value)}
                placeholder="Replace with..."
                className="w-[180px] border-0 border-b border-border-quiet bg-transparent pb-1 font-serif text-[12px] text-ink-ash placeholder:text-ink-faint/50 focus:border-border-focus focus:outline-none"
              />
              <button
                type="button"
                onClick={replaceCurrent}
                className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-ink-parchment"
              >
                this one
              </button>
              <button
                type="button"
                onClick={replaceAll}
                className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-ink-parchment"
              >
                all
              </button>

              <button
                type="button"
                onClick={() => setFindOpen(false)}
                aria-label="Close find"
                className="ml-auto rounded p-1 text-ink-faint transition-colors hover:text-ink-parchment"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="mx-auto w-full max-w-[820px] px-4 py-6 sm:px-8 sm:py-10">
            {storedDraft && (
              <div className="mb-3 flex items-center justify-between gap-4 rounded-lg bg-surface-elevated/70 px-4 py-2.5 text-left shadow-sm">
                <p className="font-serif text-[12px] italic text-ink-ash">
                  An unsaved draft of this chapter was kept on this device.
                </p>
                <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft({
                        chapter: selectedChapterNumber,
                        content: storedDraft.content,
                        title: storedDraft.title,
                      });
                      setStoredDraft(null);
                      toast.success("Restored the unsaved draft.");
                    }}
                    className="text-ink-parchment underline decoration-border-prominent underline-offset-4"
                  >
                    restore
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined")
                        window.localStorage.removeItem(draftKey);
                      setStoredDraft(null);
                      setDraft(null);
                      setParagraph(1);
                      toast.success("Draft discarded — the saved chapter is back.");
                    }}
                    className="text-ink-faint transition-colors hover:text-ink-ash"
                  >
                    discard
                  </button>
                </div>
              </div>
            )}

            <article className={cn(
              "mx-auto w-full max-w-[700px] rounded-2xl bg-surface-card/60 pb-10 pt-9 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.85)] sm:pb-14 sm:pt-11",
              posture === "review" ? "px-5 sm:px-10" : "px-7 sm:px-14"
            )}>
              <div className="flex items-baseline justify-between pb-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-wine-accent">
                  {String(selectedChapterNumber).padStart(2, "0")}
                  {sortedChapters.length > 0
                    ? ` / ${String(sortedChapters.length).padStart(2, "0")}`
                    : ""}
                </p>
                <p className="font-serif text-[11px] italic text-ink-faint/70">a working draft</p>
              </div>

              <textarea
                ref={(el) => {
                  if (el) {
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                  }
                }}
                value={chapterTitle}
                onChange={(event) => {
                  setChapterTitle(event.target.value);
                  event.currentTarget.style.height = "auto";
                  event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
                }}
                onKeyDown={handleTitleKeyDown}
                rows={1}
                placeholder="Chapter title"
                aria-label="Chapter title"
                className="mt-3 w-full resize-none overflow-hidden border-0 bg-transparent font-serif text-[26px] font-normal leading-tight tracking-tight text-ink-parchment placeholder:text-ink-faint focus:outline-none sm:text-[30px]"
              />

              <div aria-hidden className="mt-5 h-px w-10 bg-wine-crimson/50" />

              {chapterError ? (
                <div className="mt-7 rounded-lg bg-surface-elevated/50 px-4 py-4">
                  <p className="font-serif text-[13px] italic text-ink-ash">
                    This chapter could not be opened, so it is not safe to edit yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => refetchCurrentChapter()}
                    className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-parchment underline decoration-border-prominent underline-offset-4"
                  >
                    try again
                  </button>
                </div>
              ) : chapterLoading ? (
                <div className="mt-7 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Opening the chapter…
                </div>
              ) : (
                <MarkdownEditor
                  ref={editorRef}
                  value={content}
                  onChange={setContent}
                  marks={marks}
                  activeMarkId={activeIssueId}
                  posture={posture}
                  isFindOpen={findOpen}
                  onMarkClick={(id) => {
                    const issue = allIssues.find((item) => item.id === id);
                    if (issue) goToFinding(issue, chapterFor(issue, selectedChapterNumber));
                  }}
                  onParagraphChange={setParagraph}
                  onRequestSave={() => {
                    if (isDirty) handleSave();
                  }}
                  onRequestFind={() => setFindOpen(true)}
                />
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-3">
                <span className="font-serif text-[12px] italic text-ink-ash">
                  {formatWords(wordCount)} · {plainText.length.toLocaleString()} characters ·{" "}
                  {readingTimeMin} min
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint/70">
                  {isDirty ? "unsaved" : "saved"} · ¶ {paragraph}
                </span>
              </div>

            </article>

            <div className="mx-auto mt-4 flex max-w-[680px] items-center justify-between gap-3 px-3 py-3">
              <button
                type="button"
                onClick={() => previousChapter && goToChapter(previousChapter.number)}
                disabled={!previousChapter}
                className="inline-flex items-center gap-1.5 rounded-lg bg-surface-elevated/60 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-ash transition-colors hover:text-ink-parchment disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint/60">
                {chapterIndex >= 0 ? chapterIndex + 1 : 1} / {sortedChapters.length || 1}
              </span>
              <button
                type="button"
                onClick={() => nextChapter && goToChapter(nextChapter.number)}
                disabled={!nextChapter}
                className="inline-flex items-center gap-1.5 rounded-lg bg-surface-elevated/60 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-ash transition-colors hover:text-ink-parchment disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </main>

        {/* Writing posture: the margin is an index, ordered like the page. */}
        {posture === "write" && showNotes && (
          <aside className="hidden w-[288px] shrink-0 bg-surface-subtle/20 xl:flex">
            <div className="flex min-h-0 w-full flex-col">
              <FindingNotes
                chapterNumber={selectedChapterNumber}
                issues={allIssues}
                content={content}
                activeIssueId={activeIssueId}
                isProcessing={isReanalyzingNow}
                onOpen={(issue) =>
                  goToFinding(issue, chapterFor(issue, selectedChapterNumber))
                }
                onOpenBoard={() => setBoardOpen(true)}
              />
            </div>
          </aside>
        )}

        {/* Review posture: the case gets real width, beside the page. */}
        {posture === "review" && activeIssue && (
          <aside className="flex min-h-0 w-[44%] min-w-[520px] max-w-[720px] shrink-0 flex-col bg-surface-subtle/30 shadow-2xl max-xl:fixed max-xl:inset-0 max-xl:z-40 max-xl:w-full max-xl:min-w-0 max-xl:max-w-none">
            <FindingCase
              projectId={projectId}
              issue={activeIssue}
              position={
                reviewIndex >= 0
                  ? { index: reviewIndex, total: reviewQueue.length }
                  : undefined
              }
              onPrev={reviewIndex > 0 ? () => stepReview(-1) : undefined}
              onNext={
                reviewIndex >= 0 && reviewIndex < reviewQueue.length - 1
                  ? () => stepReview(1)
                  : undefined
              }
              onOpenChapter={(issue, chapter) => goToFinding(issue, chapter)}
              onClose={() => setPosture("write")}
            />
          </aside>
        )}
      </div>

      <FindingBoard
        open={boardOpen}
        onClose={() => setBoardOpen(false)}
        projectId={projectId}
        issues={allIssues}
        chapterNumber={selectedChapterNumber}
        onOpenInPage={(issue, chapter) => {
          setBoardOpen(false);
          goToFinding(issue, chapter);
        }}
      />
    </div>
  );
}
