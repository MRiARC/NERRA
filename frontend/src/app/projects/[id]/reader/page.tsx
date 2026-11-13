"use client";

import React, { use, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  useProject,
  useManuscripts,
  useChapters,
  useChapter,
  useIssues,
  useCharacters,
  usePlotThreads,
} from "@/hooks/useStoryData";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowRight, ChevronLeft, Minus, Plus } from "lucide-react";

interface ReaderPageProps {
  params: Promise<{ id: string }>;
}

type InspectorTab = "context" | "slips" | "ask";

/**
 * The reader is the only page that should feel like a book: one measure of
 * text, quiet furniture, and the story's notes kept in the margin beside it.
 */
export default function ReaderPage({ params }: ReaderPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const searchParams = useSearchParams();

  const chapterFromQuery = Number(searchParams.get("chapter")) || 1;
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number>(chapterFromQuery);
  const [fontSize, setFontSize] = useState<number>(17);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("context");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{
      role: "user" | "assistant";
      content: string;
      citations?: Array<{ chapter: number; excerpt: string }>;
    }>
  >([
    {
      role: "assistant",
      content: "Ask about this chapter — who is in it, what it sets up, what it contradicts.",
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isReasoning, setIsReasoning] = useState(false);

  const queryClient = useQueryClient();

  const { data: project } = useProject(projectId);
  const { data: manuscripts = [] } = useManuscripts(projectId);
  const manuscriptId = manuscripts[0]?.id;

  const { data: chapters = [], isLoading: chaptersLoading } = useChapters(projectId, manuscriptId);
  const { data: currentChapter, isLoading: chapterLoading } = useChapter(
    projectId,
    manuscriptId,
    selectedChapterNumber
  );
  const { data: allIssues = [] } = useIssues(projectId);
  const { data: characters = [] } = useCharacters(projectId);
  const { data: plotThreads = [] } = usePlotThreads(projectId);

  const chapterIssues = useMemo(
    () => allIssues.filter((issue) => issue.evidence?.some((item) => item.chapter === selectedChapterNumber)),
    [allIssues, selectedChapterNumber]
  );

  const activeIssue = useMemo(
    () => allIssues.find((issue) => issue.id === selectedIssueId) || chapterIssues[0] || null,
    [allIssues, selectedIssueId, chapterIssues]
  );

  const activeCharacters = useMemo(
    () =>
      characters.filter((character) => {
        const first = character.first_chapter ?? 1;
        const last = character.last_chapter ?? 999;
        return selectedChapterNumber >= first && selectedChapterNumber <= last;
      }),
    [characters, selectedChapterNumber]
  );

  const activeThreads = useMemo(
    () =>
      plotThreads.filter((thread) => {
        const setup = thread.setup_chapter ?? 1;
        const payoff = thread.payoff_chapter ?? 999;
        return selectedChapterNumber >= setup && selectedChapterNumber <= payoff;
      }),
    [plotThreads, selectedChapterNumber]
  );

  const paragraphs = useMemo(() => {
    const content = currentChapter?.content ?? "";
    if (!content) return [];
    return content
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0);
  }, [currentChapter?.content]);

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.number - b.number),
    [chapters]
  );
  const currentIndex = sortedChapters.findIndex((chapter) => chapter.number === selectedChapterNumber);
  const previousChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < sortedChapters.length - 1
      ? sortedChapters[currentIndex + 1]
      : null;

  const handleResolveIssue = async (issueId: string, resolution: "resolved" | "ignored") => {
    try {
      await api.story.patchIssue(projectId, issueId, resolution);
      toast.success(resolution === "resolved" ? "Marked as resolved." : "Dismissed for this draft.");
      await queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not update that issue."));
    }
  };

  const handleReasonIssue = async (issueId: string) => {
    setIsReasoning(true);
    try {
      await api.story.reasonIssue(projectId, issueId);
      await queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
      toast.success("The checker has explained it.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not analyze that issue."));
    } finally {
      setIsReasoning(false);
    }
  };

  const handleSendChat = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const question = chatInput.trim();
    setChatInput("");
    setChatMessages((previous) => [...previous, { role: "user", content: question }]);
    setIsChatLoading(true);

    try {
      const response = await api.story.chat(projectId, question);
      setChatMessages((previous) => [
        ...previous,
        { role: "assistant", content: response.answer, citations: response.citations },
      ]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not reach the story archive."));
      setChatMessages((previous) => [
        ...previous,
        { role: "assistant", content: "I couldn't reach the archive just now." },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-surface-void text-ink-parchment selection:bg-wine-crimson/30">
      {/* Reading furniture */}
      <header className="sticky top-0 z-30 border-b border-border-quiet bg-surface-void/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/projects/${projectId}`}
              className="text-ink-ash transition-colors hover:text-ink-parchment"
              aria-label="Back to the project"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              {project?.title || "Manuscript"}
            </span>
            <span className="hidden text-ink-faint sm:inline">·</span>
            <select
              value={selectedChapterNumber}
              onChange={(event) => {
                setSelectedChapterNumber(Number(event.target.value));
                setSelectedIssueId(null);
              }}
              aria-label="Chapter"
              className="max-w-[220px] cursor-pointer truncate bg-transparent font-mono text-[10px] uppercase tracking-[0.16em] text-ink-ash focus:outline-none"
            >
              {chaptersLoading && <option className="bg-surface-elevated">loading…</option>}
              {sortedChapters.map((chapter) => (
                <option key={chapter.number} value={chapter.number} className="bg-surface-elevated">
                  ch. {String(chapter.number).padStart(2, "0")} — {chapter.title || "untitled"}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.14em]">
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => setFontSize((size) => Math.max(14, size - 1))}
                className="text-ink-faint transition-colors hover:text-ink-parchment"
                aria-label="Smaller text"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="tabular-nums text-ink-faint">{fontSize}</span>
              <button
                type="button"
                onClick={() => setFontSize((size) => Math.min(24, size + 1))}
                className="text-ink-faint transition-colors hover:text-ink-parchment"
                aria-label="Larger text"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsFocusMode((focus) => !focus)}
              aria-pressed={isFocusMode}
              className={cn(
                "border-b pb-0.5 transition-colors",
                isFocusMode
                  ? "border-wine-crimson text-ink-parchment"
                  : "border-transparent text-ink-faint hover:text-ink-ash"
              )}
            >
              Just the page
            </button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "mx-auto grid gap-12 px-5 py-12 sm:px-8 lg:py-16",
          isFocusMode ? "max-w-[46rem]" : "max-w-[1400px] lg:grid-cols-[minmax(0,1fr)_320px]"
        )}
      >
        {/* The page itself */}
        <article className="mx-auto w-full max-w-[42rem]">
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-ink-faint">
            Chapter {String(selectedChapterNumber).padStart(2, "0")}
          </p>
          <h1 className="mt-3 font-serif text-3xl font-normal leading-tight text-ink-parchment sm:text-4xl">
            {currentChapter?.title || "Untitled chapter"}
          </h1>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
            {(currentChapter?.word_count ?? 0).toLocaleString()} words
            {activeIssue ? " · one note in the margin" : ""}
          </p>

          <div className="mt-8 border-t border-border-quiet pt-8">
            {chapterLoading || chaptersLoading ? (
              <p className="py-20 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                Opening the chapter…
              </p>
            ) : paragraphs.length === 0 ? (
              <p className="py-12 font-serif text-[17px] italic text-ink-ash">
                This chapter is still blank. Write it in the editor, or import a manuscript.
              </p>
            ) : (
              <div style={{ fontSize }} className="space-y-[1.4em] leading-[1.85] text-ink-bone">
                {paragraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    className={cn(
                      "font-serif",
                      index === 0 &&
                        "first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-serif first-letter:text-[3.2em] first-letter:leading-[0.8] first-letter:text-wine-crimson"
                    )}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </div>

          {(previousChapter || nextChapter) && (
            <nav className="mt-14 flex items-start justify-between gap-6 border-t border-border-quiet pt-6">
              {previousChapter ? (
                <Link
                  href={`/projects/${projectId}/reader?chapter=${previousChapter.number}`}
                  onClick={() => {
                    setSelectedChapterNumber(previousChapter.number);
                    setSelectedIssueId(null);
                  }}
                  className="group max-w-[45%]"
                >
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                    ← earlier
                  </span>
                  <span className="mt-1 block font-serif text-[15px] text-ink-ash transition-colors group-hover:text-ink-parchment">
                    {previousChapter.title || `Chapter ${previousChapter.number}`}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {nextChapter && (
                <Link
                  href={`/projects/${projectId}/reader?chapter=${nextChapter.number}`}
                  onClick={() => {
                    setSelectedChapterNumber(nextChapter.number);
                    setSelectedIssueId(null);
                  }}
                  className="group max-w-[45%] text-right"
                >
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                    later →
                  </span>
                  <span className="mt-1 block font-serif text-[15px] text-ink-ash transition-colors group-hover:text-ink-parchment">
                    {nextChapter.title || `Chapter ${nextChapter.number}`}
                  </span>
                </Link>
              )}
            </nav>
          )}
        </article>

        {/* Marginalia */}
        {!isFocusMode && (
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="flex items-center gap-4 border-b border-border-quiet pb-3 font-mono text-[9px] uppercase tracking-[0.16em]">
              {(
                [
                  { id: "context" as const, label: "Here" },
                  { id: "slips" as const, label: `Slips ${chapterIssues.length}` },
                  { id: "ask" as const, label: "Ask" },
                ]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInspectorTab(tab.id)}
                  aria-pressed={inspectorTab === tab.id}
                  className={cn(
                    "border-b pb-2 transition-colors",
                    inspectorTab === tab.id
                      ? "border-wine-crimson text-ink-parchment"
                      : "border-transparent text-ink-faint hover:text-ink-ash"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {inspectorTab === "context" && (
              <div className="mt-5 space-y-7">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">
                    On the page
                  </p>
                  {activeCharacters.length === 0 ? (
                    <p className="mt-2 font-serif text-[13px] italic text-ink-ash">
                      No cast recorded for this chapter.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {activeCharacters.map((character) => (
                        <li key={character.id} className="font-serif text-[14px] text-ink-bone">
                          {character.name}
                          <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                            {character.status || "active"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">
                    Threads alive here
                  </p>
                  {activeThreads.length === 0 ? (
                    <p className="mt-2 font-serif text-[13px] italic text-ink-ash">
                      Nothing is left hanging in this chapter.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {activeThreads.map((thread) => (
                        <li key={thread.id}>
                          <p className="font-serif text-[14px] leading-snug text-ink-bone">
                            {thread.title || "Untitled thread"}
                          </p>
                          {thread.status && (
                            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                              {thread.status}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {inspectorTab === "slips" && (
              <div className="mt-5">
                {chapterIssues.length === 0 ? (
                  <p className="font-serif text-[13px] italic leading-relaxed text-ink-ash">
                    Nothing in this chapter contradicts the book. Read on.
                  </p>
                ) : (
                  <>
                    <ul className="divide-y divide-border-quiet">
                      {chapterIssues.map((issue) => (
                        <li key={issue.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedIssueId(issue.id)}
                            className={cn(
                              "w-full py-3 text-left font-serif text-[13px] leading-snug transition-colors",
                              activeIssue?.id === issue.id
                                ? "text-ink-parchment"
                                : "text-ink-bone hover:text-ink-parchment"
                            )}
                          >
                            {issue.description}
                          </button>
                        </li>
                      ))}
                    </ul>

                    {activeIssue && (
                      <div className="mt-5 border-t border-border-quiet pt-4">
                        <p className="font-serif text-[13px] italic leading-relaxed text-ink-ash">
                          {activeIssue.ai_reasoning ||
                            "The checker has not read this passage yet."}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[9px] uppercase tracking-[0.14em]">
                          <button
                            type="button"
                            onClick={() => handleReasonIssue(activeIssue.id)}
                            disabled={isReasoning}
                            className="text-ink-faint transition-colors hover:text-ink-parchment disabled:opacity-50"
                          >
                            {isReasoning ? "reading…" : "explain it"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveIssue(activeIssue.id, "resolved")}
                            className="text-ink-faint transition-colors hover:text-ink-parchment"
                          >
                            resolved
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveIssue(activeIssue.id, "ignored")}
                            className="text-ink-faint transition-colors hover:text-ink-parchment"
                          >
                            dismiss
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {inspectorTab === "ask" && (
              <div className="mt-5 flex flex-col">
                <div className="max-h-[26rem] space-y-4 overflow-y-auto pr-1">
                  {chatMessages.map((message, index) => (
                    <div key={index}>
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                        {message.role === "user" ? "you" : "archive"}
                      </p>
                      <p
                        className={cn(
                          "mt-1 whitespace-pre-wrap font-serif text-[13px] leading-relaxed",
                          message.role === "user" ? "text-ink-bone" : "text-ink-ash"
                        )}
                      >
                        {message.content}
                      </p>
                      {message.citations?.map((citation, citationIndex) => (
                        <p
                          key={citationIndex}
                          className="mt-1.5 border-l border-border-quiet pl-2 font-serif text-[11px] italic text-ink-faint"
                        >
                          ch. {citation.chapter} — {citation.excerpt}
                        </p>
                      ))}
                    </div>
                  ))}
                  {isChatLoading && (
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                      searching…
                    </p>
                  )}
                </div>

                <form onSubmit={handleSendChat} className="mt-4 border-t border-border-quiet pt-3">
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Ask about this chapter"
                    className="w-full border-0 border-b border-border-quiet bg-transparent pb-1.5 font-serif text-[13px] text-ink-parchment placeholder:text-ink-faint focus:border-border-prominent focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isChatLoading || !chatInput.trim()}
                    className="mt-2 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-ink-parchment disabled:opacity-40"
                  >
                    ask
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </form>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
