"use client";

import React, { useState, use, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useProject,
  useManuscripts,
  useChapters,
  useChapter,
  useIssues,
} from "@/hooks/useStoryData";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { formatWords } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  PenTool,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Sparkles,
  Loader2,
  Clock,
  ArrowRight,
  FileText,
} from "lucide-react";

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export default function EditorPage({ params }: EditorPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const searchParams = useSearchParams();

  const chapterFromQuery = Number(searchParams.get("chapter")) || 1;
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number>(chapterFromQuery);
  const [content, setContent] = useState<string>("");
  const [chapterTitle, setChapterTitle] = useState<string>("");
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);
  const [showIssuesPanel, setShowIssuesPanel] = useState<boolean>(true);

  // Queries
  const { data: project } = useProject(projectId);
  const { data: manuscripts = [] } = useManuscripts(projectId);
  const activeManuscript = manuscripts[0];
  const manuscriptId = activeManuscript?.id;

  const { data: chapters = [], refetch: refetchChapters } = useChapters(projectId, manuscriptId);
  const { data: currentChapter, isLoading: chapterLoading, refetch: refetchCurrentChapter } = useChapter(
    projectId,
    manuscriptId,
    selectedChapterNumber
  );
  const { data: allIssues = [], refetch: refetchIssues } = useIssues(projectId);

  // Sync state when chapter changes or loads
  useEffect(() => {
    if (currentChapter) {
      setContent(currentChapter.content || "");
      setChapterTitle(currentChapter.title || `Chapter ${selectedChapterNumber}`);
      setIsDirty(false);
    }
  }, [currentChapter, selectedChapterNumber]);

  // Compute metrics
  const wordCount = useMemo(() => {
    const trimmed = content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [content]);

  const readingTimeMin = Math.ceil(wordCount / 225);

  // Filter issues for current chapter
  const chapterIssues = useMemo(() => {
    return allIssues.filter((iss) =>
      iss.evidence?.some((e) => e.chapter === selectedChapterNumber)
    );
  }, [allIssues, selectedChapterNumber]);

  // Handle Save
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
      setIsDirty(false);
      toast.success(`Chapter ${selectedChapterNumber} saved to archive.`);
      refetchChapters();
      refetchCurrentChapter();
    } catch (err: any) {
      toast.error(err.message || "Failed to save chapter draft");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Re-analyze
  const handleReanalyze = async () => {
    if (!manuscriptId) return;
    setIsReanalyzing(true);
    try {
      await api.projects.reanalyzeChapter(projectId, manuscriptId, selectedChapterNumber);
      toast.info(`Sent Chapter ${selectedChapterNumber} to AI consistency engine for re-analysis.`);
      setTimeout(() => {
        refetchIssues();
        setIsReanalyzing(false);
        toast.success("Re-analysis complete. Continuity checks refreshed.");
      }, 2500);
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger re-analysis");
      setIsReanalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-obsidian text-ink-parchment pb-24 selection:bg-wine-crimson/40">
      {/* Top Floating Editor Command Bar */}
      <header className="sticky top-0 z-30 w-full bg-surface-obsidian/90 backdrop-blur-md border-b border-white/[0.04]">
        <div className="max-w-[1720px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Breadcrumbs & Chapter Switcher */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/projects/${projectId}`}
              className="text-ink-ash hover:text-ink-parchment transition-colors p-1.5 rounded-lg hover:bg-white/[0.03]"
              title="Return to Hub"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="h-4 w-px bg-white/[0.06] shrink-0" />
            <div className="flex items-center gap-2 text-ui-body-sm truncate">
              <span className="text-ink-ash">{project?.title || "Manuscript"}</span>
              <span className="text-ink-faint">/</span>
              <select
                value={selectedChapterNumber}
                onChange={(e) => {
                  if (isDirty && !window.confirm("You have unsaved changes. Switch chapter anyway?")) {
                    return;
                  }
                  setSelectedChapterNumber(Number(e.target.value));
                }}
                aria-label="Select chapter to edit"
                className="bg-surface-container-lowest border border-white/[0.06] text-ink-parchment rounded-lg px-2.5 py-1 text-ui-body-sm focus:outline-none focus:border-primary/40 cursor-pointer"
              >
                {chapters.length > 0 ? (
                  chapters.map((ch) => (
                    <option key={ch.number} value={ch.number}>
                      {ch.title} ({formatWords(ch.word_count)} w)
                    </option>
                  ))
                ) : (
                  <option value={1}>Chapter 1</option>
                )}
              </select>
            </div>
            {isDirty ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-warning/20 text-warning border border-warning/30">
                Unsaved changes
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-secondary/10 text-secondary">
                <CheckCircle2 className="w-3 h-3" /> Saved
              </span>
            )}
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Telemetry info */}
            <div className="hidden md:flex items-center gap-2 text-ink-ash text-xs bg-surface-container-lowest px-3 py-1.5 rounded-xl border border-white/[0.04]">
              <span className="font-mono text-ink-bone font-medium">{formatWords(wordCount)} words</span>
              <span className="text-ink-faint">•</span>
              <span className="text-ink-ash">~{readingTimeMin} min read</span>
            </div>

            {/* Re-analyze Chapter */}
            <Button
              variant="outline"
              size="sm"
              disabled={isReanalyzing}
              onClick={handleReanalyze}
              className="hidden sm:inline-flex"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isReanalyzing ? "animate-spin text-primary" : ""}`} />
              Re-scan Chapter
            </Button>

            {/* Save Button */}
            <Button
              variant="wine"
              size="sm"
              disabled={isSaving || !isDirty}
              onClick={handleSave}
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              Save Chapter
            </Button>

            {/* Switch to Reader */}
            <Link
              href={`/projects/${projectId}/reader?chapter=${selectedChapterNumber}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-white/[0.04] text-ink-bone hover:text-ink-parchment text-xs transition-all"
              title="Open in Deep Reader"
            >
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Reader</span>
            </Link>

            {/* Toggle Continuity Flags Panel */}
            <button
              onClick={() => setShowIssuesPanel(!showIssuesPanel)}
              className={`p-2 rounded-xl transition-all border ${
                showIssuesPanel
                  ? "bg-wine-dark text-primary border-primary/30"
                  : "bg-surface-container-lowest text-ink-ash hover:text-ink-parchment border-white/[0.04]"
              }`}
              title="Toggle Continuity Issues Panel"
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Split Canvas */}
      <main className="max-w-[1720px] mx-auto px-6 pt-8">
        <div className={`grid grid-cols-1 ${showIssuesPanel ? "xl:grid-cols-12" : "max-w-[900px] mx-auto"} gap-8 items-start`}>
          {/* Main Prose Text Studio */}
          <div className={`${showIssuesPanel ? "xl:col-span-8 2xl:col-span-9" : "w-full"} flex flex-col gap-4`}>
            {/* Chapter Title Input Header */}
            <div className="bg-[#160D13]/60 rounded-2xl p-6 border border-white/[0.04] flex flex-col gap-3 shadow-lg">
              <span className="font-mono uppercase tracking-widest text-[10px] text-ink-faint">
                Chapter {selectedChapterNumber} {chapters.length > 0 ? `of ${chapters.length}` : ""}
              </span>
              <input
                type="text"
                value={chapterTitle}
                onChange={(e) => {
                  setChapterTitle(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Chapter Title..."
                className="bg-transparent border-0 font-headline text-2xl sm:text-3xl text-ink-parchment focus:outline-none placeholder-ink-faint"
              />
            </div>

            {/* Drafting Canvas */}
            <div className="bg-[#160D13]/60 rounded-2xl p-6 sm:p-10 border border-white/[0.04] shadow-2xl relative min-h-[640px] flex flex-col">
              {chapterLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ink-ash">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="font-headline italic text-sm">Loading chapter manuscript draft...</p>
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Begin drafting or paste chapter prose here..."
                  className="w-full flex-1 min-h-[580px] bg-transparent border-0 resize-y font-serif text-[17px] leading-[2.1] text-ink-parchment placeholder-ink-faint/40 focus:outline-none"
                  spellCheck={false}
                />
              )}

              {/* Bottom Folio Status & Fast Switch */}
              <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center justify-between text-xs text-ink-faint">
                <div className="flex items-center gap-3">
                  <span>Lines: {content.split("\n").length}</span>
                  <span>•</span>
                  <span>Characters: {content.length}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    disabled={selectedChapterNumber <= 1}
                    onClick={() => {
                      if (isDirty && !window.confirm("Unsaved changes. Switch anyway?")) return;
                      setSelectedChapterNumber((p) => Math.max(1, p - 1));
                    }}
                    className="hover:text-ink-bone disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <span className="font-mono text-ink-ash">
                    Chapter {selectedChapterNumber} of {chapters.length || 1}
                  </span>
                  <button
                    disabled={selectedChapterNumber >= (chapters.length || 1)}
                    onClick={() => {
                      if (isDirty && !window.confirm("Unsaved changes. Switch anyway?")) return;
                      setSelectedChapterNumber((p) => p + 1);
                    }}
                    className="hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Continuity Flags Drawer */}
          {showIssuesPanel && (
            <aside className="xl:col-span-4 2xl:col-span-3 flex flex-col gap-5 sticky top-24">
              <Surface depth={2} className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-primary" />
                    <span className="font-headline text-sm font-medium text-ink-parchment">
                      Chapter Continuity
                    </span>
                  </div>
                  <Badge variant="contradiction" size="sm">
                    {chapterIssues.length} Flags
                  </Badge>
                </div>

                <p className="text-xs text-ink-ash leading-relaxed">
                  Real-time canon checks for Chapter {selectedChapterNumber}. Keep your revisions aligned with established world rules.
                </p>

                {chapterIssues.length === 0 ? (
                  <div className="py-10 text-center text-ink-ash text-xs">
                    <CheckCircle2 className="w-8 h-8 text-secondary mx-auto mb-2 opacity-80" />
                    No open continuity contradictions found in this chapter.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {chapterIssues.map((iss) => (
                      <div
                        key={iss.id}
                        className="p-3 rounded-xl bg-surface-container-lowest border border-white/[0.04] flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant={iss.severity === "red" ? "contradiction" : "warning"}
                            size="sm"
                          >
                            {iss.type.toUpperCase()}
                          </Badge>
                          <span className="font-mono text-[10px] text-ink-faint">{iss.status}</span>
                        </div>
                        <p className="text-xs text-ink-bone leading-relaxed">
                          {iss.description}
                        </p>
                        {iss.evidence && iss.evidence.length > 0 && iss.evidence[0].quote && (
                          <div className="p-2 rounded bg-surface-obsidian text-[11px] italic text-ink-ash border-l-2 border-wine-accent">
                            &ldquo;{iss.evidence[0].quote}&rdquo;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-white/[0.04]">
                  <Link
                    href={`/projects/${projectId}/reader?chapter=${selectedChapterNumber}`}
                    className="w-full py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-bright text-ink-parchment text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    Open in Deep Reader
                  </Link>
                </div>
              </Surface>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
