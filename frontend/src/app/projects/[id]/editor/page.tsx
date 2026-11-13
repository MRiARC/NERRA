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
  Loader2,
  Quote,
  X,
  PanelLeft,
  PanelRight,
} from "lucide-react";

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

/**
 * A galley proof on a desk: the contents on the left, one leaf of prose under
 * the light, and the checker's marks in the margin beside the paragraph they
 * belong to. Nothing is boxed; the page is the only thing that is lit.
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
  const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });

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
    () =>
      allIssues.filter((issue) =>
        issue.evidence?.some((item) => item.chapter === selectedChapterNumber)
      ),
    [allIssues, selectedChapterNumber]
  );

  const draftKey = `nerra:draft:${projectId}:${selectedChapterNumber}`;

  // localStorage only exists after mount, so the stored draft is read after
  // paint rather than during render.
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
    setSelectionMenu(null);
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
    setSelectionMenu(null);
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
    setSelectionMenu(null);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + text.length, start + text.length);
      updateCursor();
    });
  };

  const showSelectionMenu = (
    element: HTMLTextAreaElement,
    point: { x: number; y: number }
  ) => {
    if (element.selectionStart === element.selectionEnd) {
      setSelectionMenu(null);
      return;
    }
    setSelectionMenu({
      x: Math.min(Math.max(point.x, 120), window.innerWidth - 160),
      y: Math.max(point.y - 8, 72),
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

  /** Finds the paragraph a quote came from, so a margin note can point at it. */
  const paragraphOfQuote = useCallback(
    (quote?: string | null) => {
      if (!quote || !content) return null;
      const needle = quote.slice(0, 48).toLowerCase();
      const index = content.toLowerCase().indexOf(needle);
      if (index < 0) return null;
      return content.slice(0, index).split(/\n\s*\n/).length;
    },
    [content]
  );

  const focusQuote = (quote?: string | null) => {
    const element = textareaRef.current;
    if (!element || !quote) return;
    const needle = quote.slice(0, 48).toLowerCase();
    const index = content.toLowerCase().indexOf(needle);
    if (index < 0) return;
    const start = content.lastIndexOf("\n\n", index) + 2;
    const closing = content.indexOf("\n\n", index);
    const end = closing < 0 ? content.length : closing;
    element.focus();
    element.setSelectionRange(start, end);
    updateCursor();
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
    if (event.key === "Escape") {
      setFindOpen(false);
      setSelectionMenu(null);
    }
  };

  const totalWords = useMemo(
    () => sortedChapters.reduce((total, chapter) => total + (chapter.word_count || 0), 0),
    [sortedChapters]
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-surface-void">
      {/* Desk bar — almost nothing */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            href={`/projects/${projectId}`}
            className="text-ink-faint transition-colors hover:text-ink-parchment"
            title="Back to the dossier"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="hidden truncate font-serif text-[12px] italic text-ink-faint sm:inline">
            {project?.title || "Manuscript"}
          </span>
          <span aria-hidden className="hidden text-ink-faint/40 sm:inline">
            /
          </span>
          <span className="truncate font-serif text-[13px] text-ink-ash">{chapterTitle}</span>
          <span
            aria-hidden
            className={cn(
              "h-1 w-1 shrink-0 rounded-full transition-colors",
              isDirty ? "bg-severity-warning" : "bg-ink-faint/40"
            )}
          />
        </div>

        <div className="flex shrink-0 items-center gap-4 font-mono text-[9px] uppercase tracking-[0.14em]">
          <button
            type="button"
            onClick={() => setFindOpen((open) => !open)}
            className="hidden text-ink-faint transition-colors hover:text-ink-parchment sm:inline-flex"
          >
            find
          </button>
          <button
            type="button"
            onClick={handleReanalyze}
            disabled={isReanalyzingNow}
            className="hidden items-center gap-1.5 text-ink-faint transition-colors hover:text-ink-parchment disabled:opacity-40 sm:inline-flex"
          >
            <RefreshCw className={cn("h-3 w-3", isReanalyzingNow && "animate-spin")} />
            re-read
          </button>
          <Link
            href={`/projects/${projectId}/reader?chapter=${selectedChapterNumber}`}
            className="inline-flex items-center gap-1.5 text-ink-faint transition-colors hover:text-ink-parchment"
          >
            <BookOpen className="h-3 w-3" />
            <span className="hidden sm:inline">read</span>
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className={cn(
              "inline-flex items-center gap-1.5 border-b pb-0.5 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors",
              isDirty
                ? "border-wine-crimson/70 text-ink-parchment hover:text-wine-crimson"
                : "border-transparent text-ink-faint/60"
            )}
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            save
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Contents */}
        {showRail && (
          <nav className="hidden w-[252px] shrink-0 flex-col md:flex">
            <div className="px-6 pb-5 pt-6">
              <p className="font-serif text-[14px] leading-snug text-ink-bone">
                {manuscripts[0]?.title || "Untitled"}
              </p>
              <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-faint">
                {sortedChapters.length} chapters · {formatWords(totalWords)}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-12">
              <ol>
                {sortedChapters.map((chapter) => {
                  const isActive = chapter.number === selectedChapterNumber;
                  const notes = issueCountByChapter.get(chapter.number) || 0;
                  return (
                    <li key={chapter.number}>
                      <button
                        type="button"
                        onClick={() => goToChapter(chapter.number)}
                        title={chapter.title || "Untitled"}
                        className={cn(
                          "group flex w-full items-baseline gap-2.5 rounded-sm px-3 py-[5px] text-left transition-colors",
                          isActive ? "bg-surface-card" : "hover:bg-surface-subtle/70"
                        )}
                      >
                        <span
                          className={cn(
                            "w-5 shrink-0 font-mono text-[9px] tabular-nums",
                            isActive ? "text-wine-crimson" : "text-ink-faint/70"
                          )}
                        >
                          {String(chapter.number).padStart(2, "0")}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate font-serif text-[12.5px]",
                            isActive
                              ? "text-ink-parchment italic"
                              : "text-ink-ash group-hover:text-ink-bone"
                          )}
                        >
                          {chapter.title || "Untitled"}
                        </span>
                        {notes > 0 && (
                          <span
                            aria-hidden
                            className={cn(
                              "mb-[3px] h-[3px] w-[3px] shrink-0 self-center rounded-full",
                              isActive ? "bg-wine-crimson" : "bg-wine-crimson/50"
                            )}
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>

              {sortedChapters.length === 0 && (
                <p className="px-3 py-4 font-serif text-[12px] italic leading-relaxed text-ink-ash">
                  No chapters yet. Import a manuscript to begin.
                </p>
              )}
            </div>
          </nav>
        )}

        {/* The leaf */}
        <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[780px] px-3 py-6 sm:px-8 sm:py-10">
            {storedDraft && (
              <div className="mb-4 flex items-center justify-between gap-4 px-2">
                <p className="font-serif text-[12px] italic text-ink-ash">
                  An unsaved draft of this chapter was kept on this device.
                </p>
                <div className="flex shrink-0 items-center gap-3 font-mono text-[9px] uppercase tracking-[0.14em]">
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
                    }}
                    className="text-ink-faint transition-colors hover:text-ink-ash"
                  >
                    discard
                  </button>
                </div>
              </div>
            )}

            <article className="mx-auto w-full max-w-[680px] bg-surface-card px-7 pb-10 pt-10 shadow-lg sm:px-14 sm:pb-12 sm:pt-14">
              <div className="flex items-baseline justify-between">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-wine-crimson/70">
                  {String(selectedChapterNumber).padStart(2, "0")}
                  {sortedChapters.length > 0
                    ? ` / ${String(sortedChapters.length).padStart(2, "0")}`
                    : ""}
                </p>
                <p className="font-serif text-[11px] italic text-ink-faint/70">a working draft</p>
              </div>

              <textarea
                value={chapterTitle}
                onChange={(event) => setChapterTitle(event.target.value)}
                rows={1}
                placeholder="Chapter title"
                aria-label="Chapter title"
                className="mt-3 w-full resize-none overflow-hidden border-0 bg-transparent font-serif text-[26px] font-normal leading-tight tracking-tight text-ink-parchment placeholder:text-ink-faint focus:outline-none [field-sizing:content] sm:text-[30px]"
              />

              <div aria-hidden className="mt-6 h-px w-10 bg-wine-crimson/50" />

              {chapterLoading ? (
                <div className="mt-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
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
                    setSelectionMenu(null);
                  }}
                  onSelect={(event) => {
                    const point = pointerRef.current;
                    showSelectionMenu(event.currentTarget, point);
                    updateCursor();
                  }}
                  onMouseUp={(event) => {
                    pointerRef.current = { x: event.clientX, y: event.clientY };
                    const target = event.currentTarget;
                    requestAnimationFrame(() => showSelectionMenu(target, pointerRef.current));
                  }}
                  onBlur={() => setSelectionMenu(null)}
                  onKeyDown={handleKeyDown}
                  placeholder="Begin here. The page is yours."
                  aria-label="Chapter text"
                  spellCheck
                  className="mt-8 min-h-[58vh] w-full resize-none border-0 bg-transparent font-prose text-[18.5px] leading-[1.95] text-ink-bone selection:bg-wine-crimson/30 placeholder:text-ink-faint/50 focus:outline-none sm:text-[19px]"
                />
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border-quiet pt-3 font-serif text-[11px] italic text-ink-faint/80">
                <span>
                  {formatWords(wordCount)} · {content.length.toLocaleString()} characters ·{" "}
                  {readingTimeMin} min
                </span>
                <span className="font-mono text-[8.5px] uppercase not-italic tracking-[0.14em] text-ink-faint/70">
                  {isDirty ? "unsaved" : "saved"} · ln {cursor.line}, col {cursor.column}
                </span>
              </div>

              {/* Notes below the leaf on narrow screens */}
              {chapterIssues.length > 0 && (
                <section className="mt-8 border-t border-border-quiet pt-5 xl:hidden">
                  <p className="font-serif text-[12px] italic text-ink-faint">Marginalia</p>
                  <ol className="mt-3 space-y-4">
                    {chapterIssues.map((issue, index) => (
                      <li key={issue.id} className="flex gap-3">
                        <span className="font-serif text-[10px] text-wine-crimson/70">
                          {index + 1}
                        </span>
                        <div>
                          <button
                            type="button"
                            onClick={() => focusQuote(issue.evidence?.[0]?.quote)}
                            className="text-left font-serif text-[13px] italic leading-relaxed text-ink-bone"
                          >
                            {issue.description}
                          </button>
                          {paragraphOfQuote(issue.evidence?.[0]?.quote) && (
                            <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-faint">
                              ¶ {paragraphOfQuote(issue.evidence?.[0]?.quote)}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </article>

            <div className="mx-auto flex max-w-[680px] items-center justify-between px-3 py-5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint/70">
              <button
                type="button"
                onClick={() => goToChapter(selectedChapterNumber - 1)}
                disabled={selectedChapterNumber <= 1}
                className="inline-flex items-center gap-1 transition-colors hover:text-ink-parchment disabled:opacity-30"
              >
                <ChevronLeft className="h-3 w-3" /> previous
              </button>
              <button
                type="button"
                onClick={() => goToChapter(selectedChapterNumber + 1)}
                disabled={
                  selectedChapterNumber >= (sortedChapters.length || selectedChapterNumber)
                }
                className="inline-flex items-center gap-1 transition-colors hover:text-ink-parchment disabled:opacity-30"
              >
                next <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </main>

        {/* Marginalia */}
        {showNotes && (
          <aside className="hidden w-[300px] shrink-0 flex-col xl:flex">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-7 pb-12 pt-6">
              <div className="flex items-baseline justify-between">
                <p className="font-serif text-[12px] italic text-ink-faint">Marginalia</p>
                <span className="font-serif text-[10px] text-ink-faint/60">
                  {chapterIssues.length || ""}
                </span>
              </div>

              {chapterIssues.length === 0 ? (
                <p className="mt-5 font-serif text-[13px] italic leading-relaxed text-ink-ash/80">
                  {isReanalyzingNow
                    ? "The re-reading is in progress. Marks will appear here."
                    : "Nothing in this chapter contradicts the rest of the book."}
                </p>
              ) : (
                <ol className="mt-6 space-y-7">
                  {chapterIssues.map((issue, index) => {
                    const paragraph = paragraphOfQuote(issue.evidence?.[0]?.quote);
                    return (
                      <li key={issue.id} className="relative">
                        <span className="absolute -left-5 top-[2px] font-serif text-[10px] text-wine-crimson/70">
                          {index + 1}
                        </span>
                        {issue.evidence?.[0]?.quote && (
                          <blockquote className="border-l border-wine-crimson/30 pl-3 font-serif text-[13px] italic leading-relaxed text-ink-bone/90">
                            &ldquo;{issue.evidence[0].quote}&rdquo;
                          </blockquote>
                        )}
                        <p className="mt-2 font-serif text-[12.5px] leading-relaxed text-ink-ash">
                          {issue.description}
                        </p>
                        <div className="mt-1.5 flex items-center gap-3 font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-faint/70">
                          {paragraph && (
                            <button
                              type="button"
                              onClick={() => focusQuote(issue.evidence?.[0]?.quote)}
                              className="transition-colors hover:text-ink-parchment"
                            >
                              ¶ {paragraph}
                            </button>
                          )}
                          <span className="truncate">{issue.type.replace(/_/g, " ")}</span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              <Link
                href={`/projects/${projectId}/issues`}
                className="mt-8 font-serif text-[12px] italic text-ink-faint transition-colors hover:text-ink-parchment"
              >
                All findings →
              </Link>
            </div>
          </aside>
        )}
      </div>

      {/* Floating formatting, only over a selection */}
      {selectionMenu && (
        <div
          className="fixed z-50 flex items-center gap-0.5 border border-border-quiet bg-surface-elevated px-1.5 py-1 shadow-xl backdrop-blur"
          style={{
            left: selectionMenu.x,
            top: selectionMenu.y,
            transform: "translate(-50%, -120%)",
          }}
        >
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => wrapSelection("**", "**", "bold words")}
            aria-label="Bold"
            className="flex h-7 w-7 items-center justify-center font-serif text-[13px] font-bold text-ink-ash transition-colors hover:text-ink-parchment"
          >
            B
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => wrapSelection("*", "*", "italic words")}
            aria-label="Italic"
            className="flex h-7 w-7 items-center justify-center font-serif text-[13px] italic text-ink-ash transition-colors hover:text-ink-parchment"
          >
            I
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => prefixLines("## ")}
            aria-label="Heading"
            className="flex h-7 w-7 items-center justify-center font-serif text-[11px] uppercase tracking-wide text-ink-ash transition-colors hover:text-ink-parchment"
          >
            H
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => prefixLines("> ")}
            aria-label="Quote"
            className="flex h-7 w-7 items-center justify-center text-ink-ash transition-colors hover:text-ink-parchment"
          >
            <Quote className="h-3 w-3" />
          </button>
          <span aria-hidden className="mx-0.5 h-4 w-px bg-border-quiet" />
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insertBlock("\n\n***\n\n")}
            aria-label="Scene break"
            className="flex h-7 w-7 items-center justify-center font-serif text-[12px] text-ink-ash transition-colors hover:text-ink-parchment"
          >
            ⁂
          </button>
        </div>
      )}

      {/* Find, when called for */}
      {findOpen && (
        <div className="absolute right-6 top-14 z-40 w-[320px] border border-border-quiet bg-surface-elevated px-4 py-3 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="font-serif text-[11px] italic text-ink-faint">Find in this chapter</p>
            <button
              type="button"
              onClick={() => setFindOpen(false)}
              aria-label="Close find"
              className="text-ink-faint transition-colors hover:text-ink-parchment"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
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
            placeholder="a word, a name"
            className="mt-2 w-full border-0 border-b border-border-quiet bg-transparent pb-1 font-serif text-[13px] text-ink-parchment placeholder:text-ink-faint/60 focus:border-border-focus focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-faint">
              {matches.length} {matches.length === 1 ? "match" : "matches"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => jumpToMatch(-1)}
                aria-label="Previous match"
                className="text-ink-faint transition-colors hover:text-ink-parchment"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => jumpToMatch(1)}
                aria-label="Next match"
                className="text-ink-faint transition-colors hover:text-ink-parchment"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={replaceQuery}
              onChange={(event) => setReplaceQuery(event.target.value)}
              placeholder="replace with"
              className="w-full border-0 border-b border-border-quiet bg-transparent pb-1 font-serif text-[12px] text-ink-ash placeholder:text-ink-faint/50 focus:border-border-focus focus:outline-none"
            />
            <button
              type="button"
              onClick={replaceCurrent}
              className="shrink-0 font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-ink-parchment"
            >
              one
            </button>
            <button
              type="button"
              onClick={replaceAll}
              className="shrink-0 font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-ink-parchment"
            >
              all
            </button>
          </div>
        </div>
      )}

      {/* Panel toggles, kept out of the way */}
      <div className="absolute bottom-4 right-5 z-30 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowRail((open) => !open)}
          aria-pressed={showRail}
          aria-label="Toggle contents"
          className={cn(
            "hidden transition-colors md:inline-flex",
            showRail ? "text-ink-faint/50" : "text-ink-faint/25 hover:text-ink-faint"
          )}
        >
          <PanelLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setShowNotes((open) => !open)}
          aria-pressed={showNotes}
          aria-label="Toggle marginalia"
          className={cn(
            "hidden transition-colors xl:inline-flex",
            showNotes ? "text-ink-faint/50" : "text-ink-faint/25 hover:text-ink-faint"
          )}
        >
          <PanelRight className="h-3.5 w-3.5" />
        </button>
      </div>

    </div>
  );
}
