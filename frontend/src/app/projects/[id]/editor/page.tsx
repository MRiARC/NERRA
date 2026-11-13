"use client";

import React, { use, useMemo, useState, useEffect, useRef, useCallback } from "react";
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
  AlertTriangle,
  Loader2,
  Quote,
  Search,
  X,
  PanelLeft,
  PanelRight,
} from "lucide-react";

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

/**
 * The editor is a workspace, not a form: the manuscript on the left, the page
 * in the middle, the checker's notes on the right. Each pane owns its scroll,
 * so nothing drifts away from you while you work.
 */
export default function EditorPage({ params }: EditorPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const searchParams = useSearchParams();

  const chapterFromQuery = Number(searchParams.get("chapter")) || 1;
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number>(chapterFromQuery);
  const [draft, setDraft] = useState<{ chapter: number; content: string; title: string } | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [showRail, setShowRail] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [storedDraft, setStoredDraft] = useState<{ content: string; title: string } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: project } = useProject(projectId);
  const { data: manuscripts = [] } = useManuscripts(projectId);
  const manuscriptId = manuscripts[0]?.id;

  const { data: chapters = [], refetch: refetchChapters } = useChapters(projectId, manuscriptId);
  const { data: currentChapter, isLoading: chapterLoading, refetch: refetchCurrentChapter } =
    useChapter(projectId, manuscriptId, selectedChapterNumber);
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

  const wordCount = useMemo(() => {
    const trimmed = content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [content]);
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 225));

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.number - b.number),
    [chapters]
  );

  const issueCountByChapter = useMemo(() => {
    const map = new Map<number, number>();
    for (const issue of allIssues) {
      for (const evidence of issue.evidence || []) {
        map.set(evidence.chapter, (map.get(evidence.chapter) || 0) + 1);
      }
    }
    return map;
  }, [allIssues]);

  const chapterIssues = useMemo(
    () => allIssues.filter((issue) => issue.evidence?.some((item) => item.chapter === selectedChapterNumber)),
    [allIssues, selectedChapterNumber]
  );

  const draftKey = `nerra:draft:${projectId}:${selectedChapterNumber}`;

  // localStorage only exists after mount, so the stored draft is read once the
  // chapter is on screen, after paint rather than during render.
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

  const updateCursor = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    const upto = element.value.slice(0, element.selectionStart);
    const lines = upto.split("\n");
    setCursor({ line: lines.length, column: (lines[lines.length - 1]?.length || 0) + 1 });
  }, []);

  const wrapSelection = (before: string, after: string, placeholder: string) => {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const next = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + before.length, start + before.length + selected.length);
      updateCursor();
    });
  };

  const prefixLines = (prefix: string) => {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    const block = content.slice(lineStart, end);
    const next =
      content.slice(0, lineStart) +
      block
        .split("\n")
        .map((line) => (line.startsWith(prefix) ? line.slice(prefix.length) : prefix + line))
        .join("\n") +
      content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(lineStart, lineStart + block.length + prefix.length);
      updateCursor();
    });
  };

  const insertBlock = (text: string) => {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const next = `${content.slice(0, start)}${text}${content.slice(element.selectionEnd)}`;
    setContent(next);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + text.length, start + text.length);
      updateCursor();
    });
  };

  const matches = useMemo(() => {
    if (!findQuery) return [] as number[];
    const haystack = content.toLowerCase();
    const needle = findQuery.toLowerCase();
    const result: number[] = [];
    let index = haystack.indexOf(needle);
    while (index !== -1) {
      result.push(index);
      index = haystack.indexOf(needle, index + needle.length);
    }
    return result;
  }, [content, findQuery]);

  const jumpToMatch = (direction: 1 | -1) => {
    const element = textareaRef.current;
    if (!element || matches.length === 0) return;
    const current = element.selectionStart;
    const next =
      direction === 1
        ? matches.find((match) => match > current) ?? matches[0]
        : [...matches].reverse().find((match) => match < current) ?? matches[matches.length - 1];
    element.focus();
    element.setSelectionRange(next, next + findQuery.length);
    updateCursor();
  };

  const replaceCurrent = () => {
    const element = textareaRef.current;
    if (!element || !findQuery) return;
    const start = element.selectionStart;
    const selected = content.slice(start, element.selectionEnd);
    if (selected.toLowerCase() !== findQuery.toLowerCase()) {
      jumpToMatch(1);
      return;
    }
    const next = content.slice(0, start) + replaceQuery + content.slice(element.selectionEnd);
    setContent(next);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + replaceQuery.length, start + replaceQuery.length);
    });
  };

  const replaceAll = () => {
    if (!findQuery) return;
    const pattern = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    setContent(content.replace(pattern, replaceQuery));
    toast.success("Replaced every match in this chapter.");
  };

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
      setDraft(null);
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
      toast.info(`Chapter ${selectedChapterNumber} queued for re-reading.`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not queue the re-analysis."));
    } finally {
      setIsReanalyzing(false);
    }
  };

  const goToChapter = (next: number) => {
    if (next === selectedChapterNumber) return;
    if (isDirty && !window.confirm("You have unsaved changes. Switch chapter anyway?")) return;
    setSelectedChapterNumber(Math.max(1, next));
    setFindOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const modifier = event.metaKey || event.ctrlKey;
    if (modifier && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (isDirty) handleSave();
      return;
    }
    if (modifier && event.key.toLowerCase() === "b") {
      event.preventDefault();
      wrapSelection("**", "**", "bold words");
      return;
    }
    if (modifier && event.key.toLowerCase() === "i") {
      event.preventDefault();
      wrapSelection("*", "*", "italic words");
      return;
    }
    if (modifier && event.key.toLowerCase() === "f") {
      event.preventDefault();
      setFindOpen(true);
      return;
    }
    if (event.key === "Escape" && findOpen) setFindOpen(false);
  };

  const restoreStoredDraft = () => {
    if (!storedDraft) return;
    setDraft({
      chapter: selectedChapterNumber,
      content: storedDraft.content,
      title: storedDraft.title,
    });
    setStoredDraft(null);
    toast.success("Restored the unsaved draft.");
  };

  const notesBody = (
    <>
      <div className="flex items-baseline justify-between border-b border-border-quiet px-5 py-3">
        <h2 className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-ash">
          Chapter notes
        </h2>
        <span className="font-mono text-[9px] tabular-nums text-ink-faint">
          {chapterIssues.length}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {chapterIssues.length === 0 ? (
          <p className="font-serif text-[13px] italic leading-relaxed text-ink-ash">
            {isReanalyzingNow
              ? "The re-reading is in progress. Notes will appear here."
              : "Nothing in this chapter contradicts the rest of the book."}
          </p>
        ) : (
          <ol className="divide-y divide-border-quiet">
            {chapterIssues.map((issue) => (
              <li key={issue.id} className="py-3.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                  {issue.type.replace(/_/g, " ")}
                </p>
                {issue.evidence?.[0]?.quote && (
                  <blockquote className="mt-2 border-l border-wine-crimson/50 pl-2.5 font-serif text-[12.5px] italic leading-relaxed text-ink-bone">
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
          className="mt-4 inline-flex font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-ink-parchment"
        >
          All findings →
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-void text-ink-parchment">
      {/* Command bar */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border-quiet px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/projects/${projectId}`}
            className="text-ink-ash transition-colors hover:text-ink-parchment"
            title="Back to the dossier"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="hidden truncate font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint sm:inline">
            {project?.title || "Manuscript"}
          </span>
          <span aria-hidden className="hidden h-3 w-px bg-border-subtle sm:block" />
          <p className="truncate font-serif text-[14px] text-ink-bone">
            {chapterTitle}
          </p>
          <span
            className={cn(
              "shrink-0 font-mono text-[9px] uppercase tracking-[0.14em]",
              isDirty ? "text-severity-warning" : "text-ink-faint"
            )}
          >
            {isDirty ? "unsaved" : "saved"}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3 font-mono text-[9px] uppercase tracking-[0.14em]">
          <button
            type="button"
            onClick={() => setShowRail((open) => !open)}
            aria-pressed={showRail}
            aria-label="Toggle the chapter list"
            className="hidden text-ink-faint transition-colors hover:text-ink-parchment md:inline-flex"
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowNotes((open) => !open)}
            aria-pressed={showNotes}
            aria-label="Toggle the chapter notes"
            className="hidden text-ink-faint transition-colors hover:text-ink-parchment xl:inline-flex"
          >
            <PanelRight className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleReanalyze}
            disabled={isReanalyzingNow}
            className="hidden text-ink-faint transition-colors hover:text-ink-parchment disabled:opacity-40 sm:inline-flex sm:items-center sm:gap-1.5"
          >
            <RefreshCw className={cn("h-3 w-3", isReanalyzingNow && "animate-spin")} />
            Re-read
          </button>

          <Link
            href={`/projects/${projectId}/reader?chapter=${selectedChapterNumber}`}
            className="inline-flex items-center gap-1.5 text-ink-ash transition-colors hover:text-ink-parchment"
          >
            <BookOpen className="h-3 w-3" />
            <span className="hidden sm:inline">Read</span>
          </Link>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="inline-flex items-center gap-1.5 border-b border-wine-crimson pb-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-parchment transition-colors hover:text-wine-crimson disabled:border-transparent disabled:text-ink-faint disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Save
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex min-h-0 flex-1">
        {/* Manuscript rail */}
        {showRail && (
          <aside className="hidden w-60 shrink-0 flex-col border-r border-border-quiet md:flex">
            <div className="border-b border-border-quiet px-4 py-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">
                Manuscript
              </p>
              <p className="mt-1 truncate font-serif text-[14px] text-ink-bone">
                {manuscripts[0]?.title || "Untitled"}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              <ol>
                {sortedChapters.map((chapter) => {
                  const isActive = chapter.number === selectedChapterNumber;
                  const notes = issueCountByChapter.get(chapter.number) || 0;
                  return (
                    <li key={chapter.number}>
                      <button
                        type="button"
                        onClick={() => goToChapter(chapter.number)}
                        className={cn(
                          "group flex w-full items-baseline gap-2.5 border-l py-2 pl-3.5 pr-3 text-left transition-colors",
                          isActive
                            ? "border-wine-crimson bg-surface-subtle/60"
                            : "border-transparent hover:border-border-prominent"
                        )}
                      >
                        <span className="w-5 shrink-0 font-mono text-[9px] tabular-nums text-ink-faint">
                          {String(chapter.number).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate font-serif text-[13px]",
                              isActive ? "text-ink-parchment" : "text-ink-bone"
                            )}
                          >
                            {chapter.title || "Untitled"}
                          </span>
                          <span className="mt-0.5 block font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-faint">
                            {formatWords(chapter.word_count)}
                            {notes > 0 ? ` · ${notes} notes` : ""}
                          </span>
                        </span>
                        {notes > 0 && (
                          <span
                            aria-hidden
                            className="mt-1 h-1 w-1 shrink-0 rounded-full bg-wine-crimson/70"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>

              {sortedChapters.length === 0 && (
                <p className="px-4 py-4 font-serif text-[12px] italic leading-relaxed text-ink-ash">
                  No chapters yet. Import a manuscript to begin.
                </p>
              )}
            </div>

            <div className="border-t border-border-quiet px-4 py-3">
              <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-faint">
                {sortedChapters.length} chapters ·{" "}
                {formatWords(
                  sortedChapters.reduce((total, chapter) => total + (chapter.word_count || 0), 0)
                )}
              </p>
            </div>
          </aside>
        )}

        {/* The page */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Writing tools */}
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border-quiet px-4 py-1.5 sm:px-6">
            <button
              type="button"
              onClick={() => prefixLines("## ")}
              title="Heading"
              aria-label="Heading"
              className="flex h-7 min-w-7 shrink-0 items-center justify-center px-1.5 font-serif text-[13px] text-ink-ash transition-colors hover:text-ink-parchment"
            >
              H
            </button>
            <button
              type="button"
              onClick={() => wrapSelection("**", "**", "bold words")}
              title="Bold"
              aria-label="Bold"
              className="flex h-7 min-w-7 shrink-0 items-center justify-center px-1.5 font-serif text-[13px] font-bold text-ink-ash transition-colors hover:text-ink-parchment"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => wrapSelection("*", "*", "italic words")}
              title="Italic"
              aria-label="Italic"
              className="flex h-7 min-w-7 shrink-0 items-center justify-center px-1.5 font-serif text-[13px] italic text-ink-ash transition-colors hover:text-ink-parchment"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => prefixLines("> ")}
              title="Block quote"
              aria-label="Block quote"
              className="flex h-7 min-w-7 shrink-0 items-center justify-center px-1.5 text-ink-ash transition-colors hover:text-ink-parchment"
            >
              <Quote className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertBlock("\n\n***\n\n")}
              title="Scene break"
              aria-label="Scene break"
              className="flex h-7 min-w-7 shrink-0 items-center justify-center px-1.5 font-serif text-[13px] text-ink-ash transition-colors hover:text-ink-parchment"
            >
              ⁂
            </button>

            <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border-quiet" />

            <button
              type="button"
              onClick={() => setFindOpen((open) => !open)}
              aria-pressed={findOpen}
              className={cn(
                "flex h-7 shrink-0 items-center gap-1.5 px-1.5 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors",
                findOpen ? "text-ink-parchment" : "text-ink-ash hover:text-ink-parchment"
              )}
            >
              <Search className="h-3.5 w-3.5" />
              Find
            </button>

          </div>

          {findOpen && (
            <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border-quiet bg-surface-subtle/40 px-4 py-2 sm:px-6">
              <input
                autoFocus
                value={findQuery}
                onChange={(event) => setFindQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    jumpToMatch(event.shiftKey ? -1 : 1);
                  }
                }}
                placeholder="Find in this chapter"
                className="w-44 border-0 border-b border-border-quiet bg-transparent pb-1 font-serif text-[13px] text-ink-parchment placeholder:text-ink-faint focus:border-border-prominent focus:outline-none"
              />
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                {matches.length} {matches.length === 1 ? "match" : "matches"}
              </span>
              <input
                value={replaceQuery}
                onChange={(event) => setReplaceQuery(event.target.value)}
                placeholder="Replace with"
                className="w-44 border-0 border-b border-border-quiet bg-transparent pb-1 font-serif text-[13px] text-ink-parchment placeholder:text-ink-faint focus:border-border-prominent focus:outline-none"
              />
              <button
                type="button"
                onClick={replaceCurrent}
                className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-ash transition-colors hover:text-ink-parchment"
              >
                replace
              </button>
              <button
                type="button"
                onClick={replaceAll}
                className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-ink-parchment"
              >
                all
              </button>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => jumpToMatch(-1)}
                  className="text-ink-faint transition-colors hover:text-ink-parchment"
                  aria-label="Previous match"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => jumpToMatch(1)}
                  className="text-ink-faint transition-colors hover:text-ink-parchment"
                  aria-label="Next match"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setFindOpen(false)}
                  className="text-ink-faint transition-colors hover:text-ink-parchment"
                  aria-label="Close find"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {storedDraft && (
              <div className="mx-auto mt-4 flex max-w-[720px] items-center justify-between gap-4 border-y border-border-quiet px-2 py-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-ash">
                  An unsaved draft of this chapter was kept on this device.
                </p>
                <div className="flex shrink-0 items-center gap-3 font-mono text-[9px] uppercase tracking-[0.14em]">
                  <button
                    type="button"
                    onClick={restoreStoredDraft}
                    className="text-ink-parchment underline decoration-border-prominent underline-offset-4"
                  >
                    restore
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") window.localStorage.removeItem(draftKey);
                      setStoredDraft(null);
                    }}
                    className="text-ink-faint transition-colors hover:text-ink-ash"
                  >
                    discard
                  </button>
                </div>
              </div>
            )}

            <article className="mx-auto w-full max-w-[720px] px-5 pb-24 pt-10 sm:px-8">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-faint">
                  Chapter {String(selectedChapterNumber).padStart(2, "0")}
                  {sortedChapters.length > 0 ? ` of ${String(sortedChapters.length).padStart(2, "0")}` : ""}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                  markdown
                </p>
              </div>

              <textarea
                value={chapterTitle}
                onChange={(event) => setChapterTitle(event.target.value)}
                rows={1}
                placeholder="Chapter title"
                aria-label="Chapter title"
                className="mt-2 w-full resize-none overflow-hidden border-0 bg-transparent font-serif text-2xl font-medium leading-tight tracking-tight text-ink-parchment placeholder:text-ink-faint focus:outline-none [field-sizing:content] sm:text-3xl"
              />

              <div aria-hidden className="mt-5 h-px w-14 bg-wine-crimson/60" />

              {chapterLoading ? (
                <div className="mt-10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Opening the chapter…
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(event) => {
                    setContent(event.target.value);
                    updateCursor();
                  }}
                  onSelect={updateCursor}
                  onClick={updateCursor}
                  onKeyUp={updateCursor}
                  onKeyDown={handleKeyDown}
                  placeholder="Begin here. The page is yours."
                  aria-label="Chapter text"
                  spellCheck
                  className="mt-7 min-h-[60vh] w-full resize-none border-0 bg-transparent font-prose text-[18px] leading-[1.9] text-ink-bone placeholder:text-ink-faint/60 focus:outline-none"
                />
              )}

              <div className="mt-8 flex items-center justify-between border-t border-border-quiet pt-4 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                <span>{formatWords(wordCount)}</span>
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
                    disabled={
                      selectedChapterNumber >=
                      (sortedChapters.length || selectedChapterNumber)
                    }
                    className="inline-flex items-center gap-1 transition-colors hover:text-ink-parchment disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Next <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Notes below the page on narrow screens */}
              <section className="mt-10 border-t border-border-quiet pt-2 xl:hidden">
                {notesBody}
              </section>
            </article>
          </div>
        </main>

        {/* Margin notes */}
        {showNotes && (
          <aside className="hidden w-80 shrink-0 flex-col border-l border-border-quiet xl:flex">
            {notesBody}
          </aside>
        )}
      </div>

      {/* Status bar */}
      <div className="flex h-7 shrink-0 items-center justify-between gap-4 border-t border-border-quiet px-4 font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-faint sm:px-6">
        <div className="flex items-center gap-4">
          <span>{formatWords(wordCount)}</span>
          <span className="hidden sm:inline">{content.length.toLocaleString()} chars</span>
          <span className="hidden sm:inline">Ln {cursor.line}, Col {cursor.column}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">{readingTimeMin} min read</span>
          <span className={cn(isDirty ? "text-severity-warning" : "text-ink-faint")}>
            {isDirty ? "unsaved" : "saved"}
          </span>
          {chapterIssues.length > 0 && (
            <span className="inline-flex items-center gap-1 text-wine-crimson/80">
              <AlertTriangle className="h-3 w-3" />
              {chapterIssues.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
