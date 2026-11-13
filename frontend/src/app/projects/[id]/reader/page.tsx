"use client";

import React, { useState, use, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useProject,
  useManuscripts,
  useChapters,
  useChapter,
  useIssues,
  useCharacters,
  usePlotThreads,
} from "@/hooks/useStoryData";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { formatWords } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  BookOpen,
  PenTool,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Sliders,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  Send,
  Loader2,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
  Clock,
  Layers,
  Search,
  Check,
  Brain,
  Quote,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ReaderPageProps {
  params: Promise<{ id: string }>;
}

export default function ReaderPage({ params }: ReaderPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const searchParams = useSearchParams();

  const chapterFromQuery = Number(searchParams.get("chapter")) || 1;
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number>(chapterFromQuery);
  const [fontSize, setFontSize] = useState<number>(17); // 15, 17, 19, 21
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [inspectorTab, setInspectorTab] = useState<"context" | "continuity" | "chat">("context");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{
    role: "user" | "assistant";
    content: string;
    citations?: Array<{ chapter: number; excerpt: string }>;
  }>>([
    {
      role: "assistant",
      content: "I am your story intelligence copilot. Ask me anything about character consistency, timeline chronology, or foreshadowing in this chapter.",
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Queries
  const { data: project } = useProject(projectId);
  const { data: manuscripts = [] } = useManuscripts(projectId);
  const activeManuscript = manuscripts[0];
  const manuscriptId = activeManuscript?.id;

  const { data: chapters = [], isLoading: chaptersLoading } = useChapters(projectId, manuscriptId);
  const { data: currentChapter, isLoading: chapterLoading } = useChapter(
    projectId,
    manuscriptId,
    selectedChapterNumber
  );
  const { data: allIssues = [], refetch: refetchIssues } = useIssues(projectId);
  const { data: characters = [] } = useCharacters(projectId);
  const { data: plotThreads = [] } = usePlotThreads(projectId);

  // Filter issues for current chapter
  const chapterIssues = useMemo(() => {
    return allIssues.filter((iss) =>
      iss.evidence?.some((e) => e.chapter === selectedChapterNumber)
    );
  }, [allIssues, selectedChapterNumber]);

  // Set active issue when chapter changes or when user clicks one
  useEffect(() => {
    if (chapterIssues.length > 0 && !selectedIssueId) {
      setSelectedIssueId(chapterIssues[0].id);
    }
  }, [chapterIssues, selectedIssueId]);

  const activeIssue = useMemo(() => {
    return allIssues.find((i) => i.id === selectedIssueId) || chapterIssues[0] || null;
  }, [allIssues, selectedIssueId, chapterIssues]);

  // Characters appearing in this chapter
  const activeCharacters = useMemo(() => {
    return characters.filter((c) => {
      const first = c.first_chapter ?? 1;
      const last = c.last_chapter ?? 999;
      return selectedChapterNumber >= first && selectedChapterNumber <= last;
    });
  }, [characters, selectedChapterNumber]);

  // Plot threads active in this chapter
  const activeThreads = useMemo(() => {
    return plotThreads.filter((t) => {
      const setup = t.setup_chapter ?? 1;
      const payoff = t.payoff_chapter ?? 999;
      return selectedChapterNumber >= setup && selectedChapterNumber <= payoff;
    });
  }, [plotThreads, selectedChapterNumber]);

  // Split chapter text into paragraphs
  const paragraphs = useMemo(() => {
    if (!currentChapter?.content) return [];
    return currentChapter.content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }, [currentChapter?.content]);

  // Handle font size stepping
  const stepFontSize = (delta: number) => {
    setFontSize((prev) => Math.max(14, Math.min(24, prev + delta)));
  };

  // Handle issue resolution
  const handleResolveIssue = async (issueId: string, resolution: "resolved" | "ignored") => {
    try {
      await api.story.patchIssue(projectId, issueId, resolution);
      toast.success(
        resolution === "resolved"
          ? "Issue marked as acknowledged/resolved in canon."
          : "Issue dismissed for this draft."
      );
      refetchIssues();
    } catch (err: any) {
      toast.error(err.message || "Failed to update issue status");
    }
  };

  // Handle AI reasoning about issue
  const [isReasoning, setIsReasoning] = useState(false);
  const handleReasonIssue = async (issueId: string) => {
    setIsReasoning(true);
    try {
      const updated = await api.story.reasonIssue(projectId, issueId);
      toast.success("AI reasoning generated new canon context.");
      refetchIssues();
    } catch (err: any) {
      toast.error(err.message || "AI reasoning failed");
    } finally {
      setIsReasoning(false);
    }
  };

  // Handle chat submission
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userQ = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userQ }]);
    setIsChatLoading(true);

    try {
      const res = await api.story.chat(projectId, userQ);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer,
          citations: res.citations,
        },
      ]);
    } catch (err: any) {
      toast.error(err.message || "Chat failed");
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Apologies, I encountered an error consulting the story archive. Please ensure the backend is running.",
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-obsidian text-ink-parchment pb-24 selection:bg-wine-crimson/40">
      {/* Top Floating Reading Telemetry & Controls Bar */}
      <header className="sticky top-0 z-30 w-full bg-surface-obsidian/90 backdrop-blur-md border-b border-white/[0.04] transition-all">
        <div className="max-w-[1720px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Breadcrumbs & Chapter Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/projects/${projectId}`}
              className="text-ink-ash hover:text-ink-parchment transition-colors p-1.5 rounded-lg hover:bg-white/[0.03]"
              title="Return to Hub"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="h-4 w-px bg-white/[0.06] shrink-0" />
            <div className="flex items-center gap-2 text-ui-body-sm font-label-md truncate">
              <span className="text-ink-ash">{project?.title || "Manuscript"}</span>
              <span className="text-ink-faint">/</span>
              <select
                value={selectedChapterNumber}
                onChange={(e) => setSelectedChapterNumber(Number(e.target.value))}
                aria-label="Select chapter to read"
                className="bg-surface-container-lowest border border-white/[0.06] text-ink-parchment rounded-lg px-2.5 py-1 text-ui-body-sm focus:outline-none focus:border-primary/40 cursor-pointer"
              >
                {chapters.length > 0 ? (
                  chapters.map((ch) => (
                    <option key={ch.number} value={ch.number}>
                      {ch.title} ({formatWords(ch.word_count)} words)
                    </option>
                  ))
                ) : (
                  <option value={1}>Chapter 1</option>
                )}
              </select>
            </div>
            {chapterIssues.length > 0 && (
              <Badge variant="contradiction" size="sm" pulse>
                {chapterIssues.length} Continuity {chapterIssues.length === 1 ? "Alert" : "Alerts"}
              </Badge>
            )}
          </div>

          {/* Reading Atelier Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Font Size Adjusters */}
            <div className="flex items-center bg-surface-container-lowest rounded-xl p-1 border border-white/[0.04]">
              <button
                onClick={() => stepFontSize(-1)}
                className="p-1.5 text-ink-ash hover:text-ink-parchment transition-colors rounded-lg hover:bg-white/[0.04]"
                title="Decrease font size"
              >
                <span className="text-xs font-mono font-medium">A-</span>
              </button>
              <span className="font-mono text-[11px] text-ink-bone px-2 select-none">
                {fontSize}px
              </span>
              <button
                onClick={() => stepFontSize(1)}
                className="p-1.5 text-ink-ash hover:text-ink-parchment transition-colors rounded-lg hover:bg-white/[0.04]"
                title="Increase font size"
              >
                <span className="text-xs font-mono font-medium">A+</span>
              </button>
            </div>

            {/* Word Telemetry */}
            <div className="hidden md:flex items-center gap-2 text-ink-ash text-ui-body-sm bg-surface-container-lowest/70 px-3 py-1.5 rounded-xl border border-white/[0.04]">
              <span className="font-mono text-ink-bone text-xs">
                {formatWords(currentChapter?.word_count || 0)} words
              </span>
              <span className="text-ink-faint">•</span>
              <span className="text-xs text-ink-ash">{paragraphs.length} paragraphs</span>
            </div>

            {/* Switch to Editor */}
            <Link
              href={`/projects/${projectId}/editor?chapter=${selectedChapterNumber}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-white/[0.04] text-ink-bone hover:text-ink-parchment text-ui-body-sm transition-all"
              title="Open in Manuscript Editor"
            >
              <PenTool className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Editor Studio</span>
            </Link>

            {/* Focus Zen Sanctuary Toggle */}
            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={`p-2 rounded-xl transition-all border ${
                isFocusMode
                  ? "bg-wine-dark text-primary border-primary/30"
                  : "bg-surface-container-lowest text-ink-ash hover:text-ink-parchment border-white/[0.04]"
              }`}
              title={isFocusMode ? "Exit Focus Mode" : "Focus Zen Mode"}
            >
              {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Dual-Column Canvas: Reading Folio + Inspector Panel */}
      <main className="max-w-[1720px] mx-auto px-6 pt-8">
        <div className={`grid grid-cols-1 ${isFocusMode ? "max-w-[820px] mx-auto" : "xl:grid-cols-12"} gap-8 items-start`}>
          {/* LEFT / CENTER COLUMN: Flagship Editorial Manuscript Canvas (Max-width 760px) */}
          <div className={`${isFocusMode ? "w-full" : "xl:col-span-7 2xl:col-span-8"} flex flex-col items-center transition-all duration-300`}>
            <article className="w-full max-w-[760px] bg-[#160D13]/70 rounded-2xl p-8 sm:p-14 lg:p-16 shadow-2xl relative border border-white/[0.04]">
              {/* Folio Running Header & Motif Watermark */}
              <div className="flex items-center justify-between pb-8 mb-8 border-b border-white/[0.04]">
                <div className="flex flex-col">
                  <span className="font-headline italic text-ink-ash text-sm tracking-wider">
                    {project?.title || "Chapter"} {currentChapter?.word_count ? `• ${formatWords(currentChapter.word_count)} words` : ""}
                  </span>
                  <h1 className="font-headline text-2xl sm:text-3xl font-medium text-ink-parchment mt-1">
                    {currentChapter?.title || `Chapter ${selectedChapterNumber}`}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={chapterIssues.length > 0 ? "contradiction" : "pine"} size="sm">
                    {chapterIssues.length > 0 ? `${chapterIssues.length} Flags` : "Canon Verified"}
                  </Badge>
                </div>
              </div>

              {/* Chapter Prose Stream */}
              {chapterLoading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4 text-ink-ash">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="font-headline italic text-sm">Translating folio parchment from the archive...</p>
                </div>
              ) : paragraphs.length === 0 ? (
                <div className="py-24 text-center text-ink-ash">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-40" />
                  <p className="font-headline text-lg text-ink-bone">No manuscript text found for this chapter.</p>
                  <Link
                    href={`/projects/${projectId}/editor?chapter=${selectedChapterNumber}`}
                    className="inline-flex items-center gap-2 mt-4 text-primary hover:underline text-sm"
                  >
                    <PenTool className="w-4 h-4" /> Open Editor to write or paste text
                  </Link>
                </div>
              ) : (
                <div
                  className="space-y-7 text-ink-parchment font-serif leading-[2.1] tracking-normal selection:bg-wine-crimson/40"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {paragraphs.map((p, idx) => {
                    const paraNum = idx + 1;
                    // Check if any issue's evidence quote matches this paragraph
                    const matchedIssue = chapterIssues.find((iss) =>
                      iss.evidence?.some((ev) =>
                        ev.quote && p.toLowerCase().includes(ev.quote.toLowerCase().slice(0, 30))
                      )
                    );
                    const isParaSelected = activeIssue && matchedIssue?.id === activeIssue.id;

                    return (
                      <div
                        key={idx}
                        id={`para-${paraNum}`}
                        className={`group relative flex items-start gap-4 transition-all duration-200 rounded-xl p-2 -mx-2 ${
                          matchedIssue
                            ? isParaSelected
                              ? "bg-wine-dark/30 border-l-2 border-primary shadow-[inset_0_0_16px_rgba(148,27,46,0.2)]"
                              : "bg-surface-container-lowest/50 border-l-2 border-primary/50"
                            : "hover:bg-white/[0.01]"
                        }`}
                      >
                        {/* Paragraph Number & Anchor */}
                        <div className="flex flex-col items-center pt-1.5 w-6 shrink-0 select-none">
                          <span
                            className={`font-mono text-[11px] ${
                              matchedIssue ? "text-primary font-bold" : "text-ink-faint/60 group-hover:text-ink-ash"
                            } transition-colors`}
                          >
                            {paraNum}
                          </span>
                          {matchedIssue && (
                            <button
                              onClick={() => {
                                setSelectedIssueId(matchedIssue.id);
                                setInspectorTab("context");
                              }}
                              className="mt-1 text-primary hover:scale-110 transition-transform"
                              title={`Continuity Alert: ${matchedIssue.type}`}
                            >
                              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                            </button>
                          )}
                        </div>

                        {/* Paragraph Body with Dropcap on first paragraph */}
                        <div className="flex-1">
                          {idx === 0 ? (
                            <p>
                              <span className="float-left font-headline text-[56px] leading-[0.8] pr-3 pt-1 text-primary font-normal drop-shadow-[0_2px_12px_rgba(255,177,191,0.25)]">
                                {p.charAt(0)}
                              </span>
                              {p.slice(1)}
                            </p>
                          ) : matchedIssue ? (
                            <div>
                              <p>
                                <span
                                  onClick={() => {
                                    setSelectedIssueId(matchedIssue.id);
                                    setInspectorTab("context");
                                  }}
                                  className="cursor-pointer bg-wine-dark/40 text-primary-fixed border-b border-primary shadow-[inset_0_0_12px_rgba(148,27,46,0.25)] rounded px-1 py-0.5 hover:bg-wine-dark/60 transition-all inline"
                                >
                                  {p}
                                </span>
                              </p>
                              {/* Inset Micro-Action Bar under highlighted contradiction */}
                              <div className="mt-3 pt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.04] text-xs">
                                <div className="flex items-center gap-2">
                                  <Badge variant="contradiction" size="sm">
                                    {matchedIssue.type.toUpperCase()}
                                  </Badge>
                                  <span className="text-ink-bone text-[12px] line-clamp-1">
                                    {matchedIssue.description}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleResolveIssue(matchedIssue.id, "resolved")}
                                    className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-bright text-ink-bone hover:text-ink-parchment text-[11px] font-medium transition-all"
                                  >
                                    Acknowledge
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedIssueId(matchedIssue.id);
                                      setInspectorTab("context");
                                      handleReasonIssue(matchedIssue.id);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-wine-dark hover:bg-wine-accent text-ink-parchment text-[11px] font-medium transition-all shadow-sm flex items-center gap-1"
                                  >
                                    <Brain className="w-3 h-3 text-primary" />
                                    Reason
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p>{p}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Folio Vignette / Pagination Stamp */}
              <div className="mt-14 pt-8 border-t border-white/[0.04] flex items-center justify-between text-ink-faint text-ui-body-sm">
                <span>
                  Chapter {selectedChapterNumber} of {chapters.length || 1}
                </span>
                <div className="flex items-center gap-4">
                  <button
                    disabled={selectedChapterNumber <= 1}
                    onClick={() => setSelectedChapterNumber((prev) => Math.max(1, prev - 1))}
                    className="hover:text-ink-bone disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous Chapter
                  </button>
                  <span className="font-mono text-ink-ash text-xs">
                    CH {selectedChapterNumber} / {chapters.length || 1}
                  </span>
                  <button
                    disabled={selectedChapterNumber >= (chapters.length || 1)}
                    onClick={() => setSelectedChapterNumber((prev) => prev + 1)}
                    className="hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed text-ink-bone transition-colors flex items-center gap-1"
                  >
                    Next Chapter <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </article>

            {/* Fast Prose Scratchpad Below Reading Slate */}
            <div className="w-full max-w-[760px] mt-6 p-4 rounded-xl bg-surface-container-lowest/70 border border-white/[0.03] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <PenTool className="w-4 h-4 text-ink-faint shrink-0" />
                <span className="text-ui-body-sm text-ink-ash truncate">
                  Need to revise this chapter? Open the manuscript studio editor with real-time squiggles.
                </span>
              </div>
              <Link
                href={`/projects/${projectId}/editor?chapter=${selectedChapterNumber}`}
                className="text-xs font-mono text-primary hover:text-ink-parchment uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1"
              >
                Open Studio <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: Collapsible Intelligence & Chronology Inspector (~420px) */}
          {!isFocusMode && (
            <aside className="xl:col-span-5 2xl:col-span-4 flex flex-col gap-6 sticky top-24">
              <Surface depth={2} className="p-5 flex flex-col gap-5">
                {/* Segmented Intelligence Tabs */}
                <div className="flex items-center p-1 bg-surface-container-lowest rounded-xl">
                  <button
                    onClick={() => setInspectorTab("context")}
                    className={`flex-1 py-1.5 text-center text-xs font-medium rounded-lg transition-all ${
                      inspectorTab === "context"
                        ? "bg-surface-container text-ink-parchment shadow-sm"
                        : "text-ink-ash hover:text-ink-parchment"
                    }`}
                  >
                    Scene Context
                  </button>
                  <button
                    onClick={() => setInspectorTab("continuity")}
                    className={`flex-1 py-1.5 text-center text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      inspectorTab === "continuity"
                        ? "bg-surface-container text-ink-parchment shadow-sm"
                        : "text-ink-ash hover:text-ink-parchment"
                    }`}
                  >
                    <span>Continuity</span>
                    {chapterIssues.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-wine-dark text-primary-fixed">
                        {chapterIssues.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setInspectorTab("chat")}
                    className={`flex-1 py-1.5 text-center text-xs font-medium rounded-lg transition-all ${
                      inspectorTab === "chat"
                        ? "bg-surface-container text-ink-parchment shadow-sm"
                        : "text-ink-ash hover:text-ink-parchment"
                    }`}
                  >
                    Story Chat
                  </button>
                </div>

                {/* TAB 1: SCENE CONTEXT */}
                {inspectorTab === "context" && (
                  <div className="flex flex-col gap-5">
                    {/* Focused Issue Card */}
                    {activeIssue ? (
                      <div className="p-4 rounded-xl bg-gradient-to-br from-wine-dark/30 to-surface-container-lowest border border-wine-accent/30 shadow-md">
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-primary" />
                            <span className="font-headline text-sm text-ink-parchment font-medium">
                              {activeIssue.type.replace(/_/g, " ").toUpperCase()}
                            </span>
                          </div>
                          <Badge variant={activeIssue.severity === "red" ? "contradiction" : "warning"} size="sm">
                            {activeIssue.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-ui-body-sm text-[12px] text-ink-bone leading-relaxed">
                          {activeIssue.description}
                        </p>

                        {/* Evidence quote */}
                        {activeIssue.evidence && activeIssue.evidence.length > 0 && (
                          <div className="mt-3 p-2.5 rounded-lg bg-surface-obsidian/70 border border-white/[0.04] flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-[10px] font-mono text-ink-faint uppercase">
                              <span>Canon Anchor</span>
                              {activeIssue.evidence[0].chapter && (
                                <button
                                  onClick={() => setSelectedChapterNumber(activeIssue.evidence![0].chapter!)}
                                  className="text-primary hover:underline"
                                >
                                  Jump to Chapter {activeIssue.evidence[0].chapter}
                                </button>
                              )}
                            </div>
                            <blockquote className="text-[12px] italic text-ink-ash border-l-2 border-wine-accent pl-2 leading-relaxed">
                              &ldquo;{activeIssue.evidence[0].quote || activeIssue.description}&rdquo;
                            </blockquote>
                          </div>
                        )}

                        {/* Resolution Dispatch Buttons */}
                        <div className="mt-4 flex items-center gap-2">
                          <button
                            disabled={isReasoning}
                            onClick={() => handleReasonIssue(activeIssue.id)}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-wine-dark hover:bg-wine-accent text-ink-parchment text-ui-body-sm font-medium transition-colors text-center shadow-sm flex items-center justify-center gap-1.5"
                          >
                            {isReasoning ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Brain className="w-3.5 h-3.5 text-primary" />
                            )}
                            Reason with Claude
                          </button>
                          <button
                            onClick={() => handleResolveIssue(activeIssue.id, "resolved")}
                            className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-bright text-ink-ash hover:text-ink-parchment transition-colors"
                            title="Mark as Acknowledged / Intentional Arc"
                          >
                            <Check className="w-4 h-4 text-secondary" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-surface-container-lowest border border-white/[0.03] text-center text-ink-ash text-xs">
                        No active contradiction selected for this chapter. Click any highlighted quote in the text.
                      </div>
                    )}

                    {/* Entities Present in Chapter */}
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono uppercase tracking-wider text-ink-ash text-[10px]">
                          Characters Present ({activeCharacters.length})
                        </span>
                        <span className="font-mono text-ink-faint text-[10px]">
                          Chapter {selectedChapterNumber}
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {activeCharacters.map((c) => (
                          <div
                            key={c.id}
                            className="p-2.5 rounded-xl bg-surface-container-lowest/80 border border-white/[0.02] flex items-center justify-between hover:bg-surface-container-lowest transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-wine-dark/40 flex items-center justify-center text-primary font-headline text-xs shrink-0">
                                {c.name.charAt(0)}
                              </div>
                              <div className="flex flex-col truncate">
                                <span className="text-ink-parchment font-medium text-xs truncate">
                                  {c.name}
                                </span>
                                <span className="text-[10px] text-ink-ash truncate">
                                  {c.status || "Active in scene"}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-ink-faint shrink-0">
                              Ch {c.first_chapter ?? 1}
                              {c.last_chapter ? `–${c.last_chapter}` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Active Plot Threads */}
                    {activeThreads.length > 0 && (
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono uppercase tracking-wider text-ink-ash text-[10px]">
                            Active Plot Threads ({activeThreads.length})
                          </span>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {activeThreads.slice(0, 3).map((t) => (
                            <div
                              key={t.id}
                              className="p-2.5 rounded-xl bg-pine-deep/20 border border-pine-accent/30 flex flex-col gap-1"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-secondary font-medium truncate">{t.title}</span>
                                <span className="font-mono text-[9px] text-ink-faint uppercase">{t.status}</span>
                              </div>
                              <p className="text-[11px] text-ink-bone line-clamp-2 leading-relaxed">
                                {t.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: CONTINUITY ISSUES LIST */}
                {inspectorTab === "continuity" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-ash font-medium">
                        {chapterIssues.length} issues detected in Chapter {selectedChapterNumber}
                      </span>
                      <button
                        onClick={() => refetchIssues()}
                        className="text-[10px] font-mono text-primary hover:underline"
                      >
                        Re-scan
                      </button>
                    </div>

                    {chapterIssues.length === 0 ? (
                      <div className="py-8 text-center text-ink-ash text-xs">
                        <CheckCircle2 className="w-8 h-8 text-secondary mx-auto mb-2 opacity-80" />
                        No open continuity issues recorded for this chapter.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                        {chapterIssues.map((iss) => (
                          <div
                            key={iss.id}
                            onClick={() => setSelectedIssueId(iss.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                              selectedIssueId === iss.id
                                ? "bg-wine-dark/30 border-primary shadow-sm"
                                : "bg-surface-container-lowest border-white/[0.03] hover:border-white/[0.08]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <Badge
                                variant={iss.severity === "red" ? "contradiction" : "warning"}
                                size="sm"
                              >
                                {iss.type.toUpperCase()}
                              </Badge>
                              <span className="font-mono text-[10px] text-ink-faint">
                                {iss.status}
                              </span>
                            </div>
                            <p className="text-xs text-ink-bone line-clamp-3 leading-relaxed">
                              {iss.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: STORY CHAT RAG */}
                {inspectorTab === "chat" && (
                  <div className="flex flex-col h-[520px]">
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                      {chatMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-xl leading-relaxed ${
                            msg.role === "user"
                              ? "bg-wine-dark/40 text-ink-parchment border border-wine-accent/30 ml-4"
                              : "bg-surface-container-lowest text-ink-bone border border-white/[0.03] mr-4"
                          }`}
                        >
                          <div className="font-mono text-[9px] uppercase tracking-wider mb-1 text-ink-faint">
                            {msg.role === "user" ? "You" : "Story Copilot"}
                          </div>
                          <p>{msg.content}</p>
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/[0.04] space-y-1">
                              <span className="font-mono text-[9px] text-primary uppercase">Citations:</span>
                              {msg.citations.map((c, ci) => (
                                <div key={ci} className="text-[10px] text-ink-ash italic pl-2 border-l border-primary/30">
                                  Ch. {c.chapter}: &ldquo;{c.excerpt}&rdquo;
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="p-3 rounded-xl bg-surface-container-lowest text-ink-ash flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          <span>Searching story graph & canon vectors...</span>
                        </div>
                      )}
                    </div>

                    {/* Chat Input */}
                    <form onSubmit={handleSendChat} className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask about this chapter's canon..."
                        className="flex-1 bg-surface-container-lowest border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-ink-parchment placeholder-ink-faint focus:outline-none focus:border-primary/40"
                      />
                      <Button
                        type="submit"
                        variant="wine"
                        size="sm"
                        disabled={!chatInput.trim() || isChatLoading}
                        className="px-3 py-2 shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </form>
                  </div>
                )}
              </Surface>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
