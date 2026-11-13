"use client";

import React, { useState, use, useMemo } from "react";
import Link from "next/link";
import {
  useProject,
  useIssues,
  useCharacters,
  useManuscripts,
  useChapters,
} from "@/hooks/useStoryData";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatWords, cn, getErrorMessage } from "@/lib/utils";
import {
  BookOpen,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Download,
  Compass,
  ChevronRight,
  ExternalLink,
  Activity,
  CheckCircle2,
  Upload,
  Clock,
  Layers,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ImportManuscriptModal } from "@/components/dashboard/ImportManuscriptModal";

interface ProjectHubPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectHubPage({ params }: ProjectHubPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { data: project, isLoading: projectLoading, refetch: refetchProject } = useProject(projectId);
  const { data: issues = [], refetch: refetchIssues } = useIssues(projectId);
  const { data: characters = [] } = useCharacters(projectId);
  const { data: manuscripts = [] } = useManuscripts(projectId);

  const activeManuscript = manuscripts[0];
  const { data: chapters = [] } = useChapters(projectId, activeManuscript?.id);

  const [isAuditing, setIsAuditing] = useState(false);
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Live telemetry derived in one single request from the enriched project endpoint
  const totalWords = project?.word_count ?? (chapters.length > 0 ? chapters.reduce((acc, c) => acc + (c.word_count || 0), 0) : 0);
  const totalChapters = project?.chapter_count ?? activeManuscript?.chapters_total ?? chapters.length ?? 0;
  const characterCount = project?.character_count ?? characters.length;
  const locationCount = project?.location_count ?? 0;
  const objectCount = project?.object_count ?? 0;
  const eventCount = project?.event_count ?? 0;
  const totalKnowledgeNodes = characterCount + locationCount + objectCount;

  // Real Issues Breakdown
  const criticalIssues = useMemo(() => {
    return issues.filter((i) => i.severity === "red" && i.status === "open");
  }, [issues]);

  const minorIssues = useMemo(() => {
    return issues.filter((i) => i.severity !== "red" && i.status === "open");
  }, [issues]);

  // Dynamic Coherence Score (100% clean baseline, penalized by open critical/minor contradictions)
  const coherenceScore = useMemo(() => {
    if (totalChapters === 0 && issues.length === 0) return 100;
    if (issues.length === 0) return 100;
    const penalty = criticalIssues.length * 3.5 + minorIssues.length * 1.0;
    return Math.max(50, Math.min(100, Math.round(100 - penalty)));
  }, [totalChapters, issues.length, criticalIssues.length, minorIssues.length]);

  // Selected Chapter details
  const activeSelectedChapter = useMemo(() => {
    if (!selectedChapterNumber && chapters.length > 0) {
      return chapters[0];
    }
    return chapters.find((c) => c.number === selectedChapterNumber) || chapters[0] || null;
  }, [chapters, selectedChapterNumber]);

  const selectedChapterIssues = useMemo(() => {
    if (!activeSelectedChapter) return [];
    return issues.filter((iss) =>
      iss.evidence?.some((e) => e.chapter === activeSelectedChapter.number)
    );
  }, [issues, activeSelectedChapter]);

  const handleExportBible = async () => {
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
    setIsAuditing(true);
    try {
      const result = await api.story.audit(projectId);
      await Promise.all([refetchIssues(), refetchProject()]);
      toast.success(
        `Consistency audit complete: ${result.issues_open} open of ${result.issues_total} recorded.`
      );
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to run consistency audit"));
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
      {/* Top Banner (Stitch Screen 1) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-border-quiet">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-ink-faint uppercase tracking-wider font-semibold">
              Story Overview
            </span>
            <span className="text-border-subtle font-mono">•</span>
            <span
              className={`text-xs font-mono flex items-center gap-1.5 font-medium ${
                activeManuscript?.status === "failed"
                  ? "text-wine-crimson"
                  : activeManuscript?.status === "processing"
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeManuscript?.status === "failed"
                    ? "bg-wine-crimson"
                    : activeManuscript?.status === "processing"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-emerald-500"
                }`}
              />
              <span>
                Status: {activeManuscript?.status ? activeManuscript.status.toUpperCase() : "READY"}
              </span>
            </span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-ink-parchment">
            {project?.title || "Project Overview"}
          </h1>
          <p className="text-xs sm:text-sm text-ink-ash mt-1.5 max-w-2xl leading-relaxed">
            {project?.genre ? <span className="font-medium text-ink-bone">{project.genre} • </span> : ""}
            Track your manuscript&apos;s progress, review plot consistency, and manage characters and key story events.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportBible}
            className="gap-2 text-ink-bone hover:text-ink-parchment border-border-subtle"
          >
            <Download className="w-3.5 h-3.5 text-wine-crimson" />
            <span>Export Story Bible</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleTriggerAudit}
            isLoading={isAuditing}
            className="gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Check Consistency</span>
          </Button>
        </div>
      </div>

      {/* Ingestion Pipeline Status Banners */}
      {activeManuscript?.status === "failed" && (
        <div className="rounded-xl border border-wine-crimson/50 bg-wine-crimson/10 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-full bg-wine-crimson/20 border border-wine-crimson/40 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-wine-crimson" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-ink-parchment">
                  Manuscript Extraction Interrupted
                </h4>
                <Badge variant="contradiction" size="xs">
                  FAILED
                </Badge>
              </div>
              <p className="text-xs text-ink-bone mt-1 max-w-2xl leading-relaxed">
                {activeManuscript.error_note?.includes("401") ||
                activeManuscript.error_note?.toLowerCase().includes("unauthorized")
                  ? "The AI pipeline halted because the Anthropic Claude API key is invalid or unauthorized. Review diagnostics to configure sovereign keys or run air-gapped heuristic extraction."
                  : activeManuscript.error_note || "An unexpected error interrupted the extraction pipeline."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportModalOpen(true)}
              className="gap-1.5 text-xs border-wine-crimson/40 text-wine-crimson hover:bg-wine-crimson/10"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Review Diagnostics & Recover</span>
            </Button>

            <Link href={`/projects/${projectId}/ingestion`}>
              <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                <span>Open Ingestion Radar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {activeManuscript?.status === "processing" && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RotateCw className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
            <div>
              <p className="text-xs font-medium text-ink-parchment">
                Manuscript Analysis in Progress • Chapter {activeManuscript.chapters_done || 0} of {activeManuscript.chapters_total || 4}
              </p>
              <p className="text-[11px] text-ink-ash mt-0.5">
                Extracting entities, checking timeline chronology, and auditing canon consistency.
              </p>
            </div>
          </div>

          <Link href={`/projects/${projectId}/ingestion`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>View Live Radar</span>
            </Button>
          </Link>
        </div>
      )}

      {/* 4 Telemetry Scorecards (Stitch Screen 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Coherence Scorecard */}
        <Surface depth={2} border="subtle" rounded="md" className="p-5 space-y-3 relative overflow-hidden shadow-[inset_0_1px_0_0_var(--edge-highlight)]">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-faint">
            <span>Story Consistency</span>
            <Badge variant={coherenceScore >= 90 ? "thread" : "warning"} size="xs" className="rounded-full">
              {coherenceScore >= 90 ? "Consistent" : "Needs Review"}
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-medium text-ink-parchment">
              {coherenceScore}%
            </span>
            <span className="text-xs text-ink-ash">target &gt; 90%</span>
          </div>
          <div className="w-full h-1 bg-surface-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-wine-accent via-emerald-600 to-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
              style={{ width: `${coherenceScore}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-ink-ash pt-0.5">
            <span className="text-ink-bone font-medium">{issues.length} {issues.length === 1 ? "issue" : "issues"} recorded</span>
            <span className={criticalIssues.length > 0 ? "text-severity-contradiction font-medium" : "text-ink-ash"}>
              {criticalIssues.length} major
            </span>
          </div>
        </Surface>

        {/* Volume & Velocity Scorecard */}
        <Surface depth={2} border="subtle" rounded="md" className="p-5 space-y-3 shadow-[inset_0_1px_0_0_var(--edge-highlight)]">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-faint">
            <span>Word Count & Progress</span>
            <BookOpen className="w-4 h-4 text-wine-crimson" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-medium text-ink-parchment">
              {formatWords(totalWords)}
            </span>
            <span className="text-xs text-ink-ash">words written</span>
          </div>
          <p className="text-xs text-ink-bone truncate font-medium">
            {totalChapters} {totalChapters === 1 ? "Chapter" : "Chapters"} in manuscript
          </p>
          <div className="flex gap-1.5 pt-0.5">
            {activeManuscript ? (
              <Badge variant="subtle" size="xs" className="rounded-full">
                {activeManuscript.chapters_done}/{activeManuscript.chapters_total} Processed
              </Badge>
            ) : (
              <Badge variant="subtle" size="xs" className="rounded-full">Awaiting Manuscript</Badge>
            )}
          </div>
        </Surface>

        {/* Continuity Paradox Index */}
        <Surface depth={2} border="subtle" rounded="md" className="p-5 space-y-3 shadow-[inset_0_1px_0_0_var(--edge-highlight)]">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-faint">
            <span>Plot Contradictions</span>
            <AlertTriangle className="w-4 h-4 text-severity-contradiction" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-medium text-severity-contradiction">
              {criticalIssues.length < 10 ? `0${criticalIssues.length}` : criticalIssues.length}
            </span>
            <span className="text-xs text-severity-contradiction uppercase font-semibold tracking-wide">
              Major
            </span>
            <span className="text-border-subtle mx-1 font-mono">/</span>
            <span className="text-xs text-ink-ash font-medium">{minorIssues.length} Minor</span>
          </div>
          <p className="text-xs text-ink-bone truncate font-medium">
            Automatic plot & character checker
          </p>
          <div className="flex items-center gap-2 text-xs pt-0.5">
            <Badge variant="contradiction" size="xs" className="rounded-full">
              {criticalIssues.length} Open Issues
            </Badge>
            <Badge variant="knowledge" size="xs" className="rounded-full">
              {eventCount} Timeline Events
            </Badge>
          </div>
        </Surface>

        {/* Entity & Lore Topology */}
        <Surface depth={2} border="subtle" rounded="md" className="p-5 space-y-3 shadow-[inset_0_1px_0_0_var(--edge-highlight)]">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-faint">
            <span>Entity & Lore Topology</span>
            <Compass className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-medium text-ink-parchment">
              {totalKnowledgeNodes}
            </span>
            <span className="text-xs text-ink-ash">knowledge nodes</span>
          </div>
          <p className="text-xs text-ink-bone truncate font-medium">
            Characters, Artifacts & Locations
          </p>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <Badge variant="subtle" size="xs" className="rounded-full">
              {characterCount} Personae
            </Badge>
            <Badge variant="subtle" size="xs" className="rounded-full">
              {locationCount} Locations
            </Badge>
            <Badge variant="subtle" size="xs" className="rounded-full">
              {objectCount} Objects
            </Badge>
          </div>
        </Surface>
      </div>

      {/* Main Two-Column Layout: Chapter Audit Matrix & Continuous Ingestion Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Chapter Audit Matrix & Folio Velocity (Stitch Screen 1) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-medium text-ink-parchment flex items-center gap-2">
                <span>Chapter Audit Matrix & Velocity</span>
              </h2>
              <p className="text-xs text-ink-ash mt-0.5">
                Folio-level continuity integrity across parsed manuscript chapters.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-ink-bone font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Clean</span>
              </span>
              <span className="flex items-center gap-1.5 text-ink-bone font-medium">
                <span className="w-2 h-2 rounded-full bg-severity-contradiction" />
                <span>Conflict</span>
              </span>
            </div>
          </div>

          {/* Chapter Matrix Grid */}
          {chapters.length === 0 ? (
            <Surface depth={1} border="subtle" rounded="md" className="p-8 text-center space-y-4">
              <BookOpen className="w-10 h-10 text-ink-ash mx-auto opacity-50" />
              <div>
                <h3 className="font-serif text-base text-ink-parchment font-medium">
                  No manuscript chapters ingested yet
                </h3>
                <p className="text-xs text-ink-ash mt-1 max-w-md mx-auto">
                  Upload a manuscript file (.txt, .md, .docx, .pdf) to populate the chapter folio matrix and run the continuity engine.
                </p>
              </div>
              <Button
                variant="wine"
                size="sm"
                onClick={() => setImportModalOpen(true)}
                className="gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Manuscript</span>
              </Button>
            </Surface>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {chapters.map((ch) => {
                const isSelected = (selectedChapterNumber || chapters[0].number) === ch.number;
                const chIssues = issues.filter((iss) =>
                  iss.evidence?.some((e) => e.chapter === ch.number)
                );
                const hasCritical = chIssues.some((iss) => iss.severity === "red");
                const hasMinor = chIssues.some((iss) => iss.severity !== "red");

                let pipColor = "bg-emerald-500";
                if (hasCritical) {
                  pipColor = "bg-severity-contradiction";
                } else if (hasMinor) {
                  pipColor = "bg-amber-500";
                }

                return (
                  <button
                    key={ch.number}
                    onClick={() => setSelectedChapterNumber(ch.number)}
                    className={cn(
                      "p-3.5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between h-24 select-none relative",
                      isSelected
                        ? "bg-surface-elevated border-border-prominent ring-1 ring-border-prominent"
                        : "bg-surface-card border-border-subtle hover:border-border-prominent hover:bg-surface-elevated/60"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] uppercase font-mono tracking-wider text-ink-faint font-semibold">
                        CH.{ch.number < 10 ? `0${ch.number}` : ch.number}
                      </span>
                      <span className={cn("w-2 h-2 rounded-full shrink-0", pipColor)} />
                    </div>

                    <div>
                      <div className="font-serif text-xs font-medium text-ink-parchment truncate">
                        {ch.title}
                      </div>
                      <div className="text-xs text-ink-ash mt-0.5 truncate">
                        {chIssues.length > 0 ? (
                          <span className="text-severity-contradiction font-semibold flex items-center gap-1">
                            <span>{chIssues.length} {chIssues.length === 1 ? "Alert" : "Alerts"}</span>
                          </span>
                        ) : (
                          <span className="text-ink-ash">{formatWords(ch.word_count)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected Folio Inspector Bar */}
          {activeSelectedChapter && (
            <Surface depth={1} border="subtle" rounded="md" className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-[inset_0_1px_0_0_var(--edge-highlight)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-surface-card border border-border-subtle text-wine-crimson shrink-0 shadow-[inset_0_1px_0_0_var(--edge-highlight)]">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h4 className="font-serif text-sm font-medium text-ink-parchment truncate">
                    {activeSelectedChapter.title}
                  </h4>
                  <p className="text-xs text-ink-ash mt-0.5 truncate">
                    <span className="text-ink-bone font-medium">{formatWords(activeSelectedChapter.word_count)} words</span> •{" "}
                    {selectedChapterIssues.length} continuity {selectedChapterIssues.length === 1 ? "issue" : "issues"} detected
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/projects/${projectId}/reader?chapter=${activeSelectedChapter.number}`}>
                  <Button variant="outline" size="xs" className="border-border-subtle text-ink-bone hover:text-ink-parchment">
                    Read Folio
                  </Button>
                </Link>
                <Link href={`/projects/${projectId}/editor?chapter=${activeSelectedChapter.number}`}>
                  <Button variant="primary" size="xs" className="gap-1.5 shadow-[0_2px_10px_rgba(140,34,66,0.3)]">
                    <span>Open in Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </Surface>
          )}

          {/* Priority Adjudication Flags */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-medium text-ink-parchment">
                  Plot Inconsistencies to Review
                </h3>
                <p className="text-xs text-ink-ash mt-0.5">
                  Conflicts caught across chapters that need your decision.
                </p>
              </div>

              <Link href={`/projects/${projectId}/issues`}>
                <Button variant="ghost" size="xs" className="gap-1 text-wine-crimson hover:text-wine-crimson font-medium">
                  <span>Review All ({issues.length}) Issues</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            <div className="space-y-2.5">
              {issues.slice(0, 4).map((issue) => (
                <Surface
                  key={issue.id}
                  depth={2}
                  border={issue.severity === "red" ? "contradiction" : "subtle"}
                  rounded="md"
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-[inset_0_1px_0_0_var(--edge-highlight)]"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        issue.severity === "red"
                          ? "bg-severity-contradiction-bg text-severity-contradiction border border-severity-contradiction-border"
                          : "bg-severity-warning-bg text-severity-warning border border-severity-warning-border"
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-1 truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink-parchment font-sans text-xs">
                          {issue.type ? issue.type.replace(/_/g, " ").toUpperCase() : "CONTINUITY ISSUE"}
                        </span>
                        <Badge
                          variant={issue.severity === "red" ? "contradiction" : "warning"}
                          size="xs"
                          className="rounded-full"
                        >
                          {issue.id.slice(0, 8).toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-ink-bone line-clamp-1 font-medium">
                        {issue.description}
                      </p>
                    </div>
                  </div>

                  <Link href={`/projects/${projectId}/issues`}>
                    <Button variant="outline" size="xs" className="shrink-0 gap-1 border-border-subtle text-ink-bone hover:text-ink-parchment">
                      <span>Inspect</span>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </Link>
                </Surface>
              ))}

              {issues.length === 0 && (
                <Surface depth={1} border="subtle" rounded="md" className="p-5 text-center text-xs text-ink-ash shadow-[inset_0_1px_0_0_var(--edge-highlight)]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                  <span>No outstanding priority adjudication flags. Your narrative graph is canonical.</span>
                </Surface>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Continuous Daemon Feed & Dramatic Anchors */}
        <div className="space-y-6">
          {/* Continuous Daemon Log Feed */}
          <Surface depth={2} border="subtle" rounded="md" className="p-5 space-y-4 shadow-[inset_0_1px_0_0_var(--edge-highlight)]">
            <div className="flex items-center justify-between pb-3 border-b border-border-quiet">
              <div>
                <h3 className="font-serif text-sm font-medium text-ink-parchment flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-wine-crimson" />
                  <span>Continuous Ingestion Daemon</span>
                </h3>
                <p className="text-xs text-ink-ash mt-0.5">
                  Real-time pipeline status and story graph sync
                </p>
              </div>

              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink-parchment">Manuscript Pipeline</span>
                  <span className="text-emerald-400 font-mono text-[11px] font-medium">
                    {activeManuscript ? activeManuscript.status.toUpperCase() : "IDLE"}
                  </span>
                </div>
                <p className="text-xs text-ink-ash leading-relaxed">
                  {activeManuscript
                    ? `${activeManuscript.chapters_done} of ${activeManuscript.chapters_total} chapters verified in canon.`
                    : "No active manuscript ingestion running."}
                </p>
              </div>

              <div className="border-t border-border-quiet pt-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-rose-400">
                    Continuity Issues
                  </span>
                  <span className="text-ink-bone font-mono text-[11px]">
                    {issues.length} detected
                  </span>
                </div>
                <p className="text-xs text-ink-ash leading-relaxed">
                  {criticalIssues.length} critical contradictions requiring author adjudication.
                </p>
              </div>

              <div className="border-t border-border-quiet pt-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-emerald-400">
                    Story Memory Graph
                  </span>
                  <span className="text-ink-bone font-mono text-[11px]">
                    {totalKnowledgeNodes} nodes
                  </span>
                </div>
                <p className="text-xs text-ink-ash leading-relaxed">
                  {characterCount} characters, {locationCount} locations, and {objectCount} objects linked.
                </p>
              </div>
            </div>
          </Surface>

          {/* Dramatic Anchors (Cast Preview) */}
          <Surface depth={2} border="subtle" rounded="md" className="p-5 space-y-3 shadow-[inset_0_1px_0_0_var(--edge-highlight)]">
            <div className="flex items-center justify-between pb-3 border-b border-border-quiet">
              <div>
                <h3 className="font-serif text-sm font-medium text-ink-parchment">
                  Key Characters
                </h3>
                <p className="text-xs text-ink-ash mt-0.5">
                  Characters introduced in your story
                </p>
              </div>

              <Link href={`/projects/${projectId}/characters`}>
                <span className="text-xs font-medium text-wine-crimson hover:underline">
                  View All ({characters.length})
                </span>
              </Link>
            </div>

            <div className="space-y-2.5 text-xs">
              {characters.slice(0, 4).map((char) => (
                <div
                  key={char.id}
                  className="p-3 rounded-xl bg-surface-subtle border border-border-quiet flex items-center justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-border-subtle transition-colors"
                >
                  <div className="space-y-0.5 truncate mr-2">
                    <p className="font-medium text-ink-parchment truncate">{char.name}</p>
                    <p className="text-xs text-ink-ash truncate">
                      {char.description ? char.description.slice(0, 45) + "..." : "Character"}
                    </p>
                  </div>
                  <Badge variant="subtle" size="xs" className="rounded-full shrink-0 font-mono text-[11px]">
                    {char.first_chapter ? `Ch. ${char.first_chapter}` : "Scene 1"}
                  </Badge>
                </div>
              ))}

              {characters.length === 0 && (
                <div className="p-3 rounded-xl bg-surface-subtle border border-border-quiet text-ink-ash text-center py-4">
                  Upload a manuscript to automatically discover characters.
                </div>
              )}
            </div>
          </Surface>

          {/* Quick Actions */}
          <Surface depth={1} border="subtle" rounded="md" className="p-5 space-y-2.5 text-xs shadow-[inset_0_1px_0_0_var(--edge-highlight)]">
            <h3 className="font-serif text-sm font-medium text-ink-parchment mb-1">
              Quick Actions
            </h3>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportBible}
              className="w-full justify-between border-border-subtle text-ink-bone hover:text-ink-parchment"
            >
              <span>Export Story Bible</span>
              <Download className="w-3.5 h-3.5 text-wine-crimson" />
            </Button>

            <Link href={`/projects/${projectId}/editor`} className="block">
              <Button variant="primary" size="sm" className="w-full justify-between shadow-[0_2px_8px_rgba(140,34,66,0.3)]">
                <span>Continue Writing in Editor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>

            <Link href={`/projects/${projectId}/validation`}>
              <Button variant="ghost" size="sm" className="w-full justify-between text-ink-bone hover:text-ink-parchment">
                <span>Review Extracted Story Facts</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </Surface>
        </div>
      </div>

      {/* Ingest Manuscript Modal */}
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
