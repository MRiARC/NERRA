"use client";

import React, { useState, use, useMemo } from "react";
import Link from "next/link";
import {
  useProject,
  useManuscripts,
  useManuscriptStatus,
  useChapters,
  useCharacters,
  useClaims,
} from "@/hooks/useStoryData";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  RotateCw,
  Sparkles,
  Cpu,
  Layers,
  Settings2,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Clock,
  Compass,
  Scroll,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
} from "lucide-react";

interface IngestionRadarPageProps {
  params: Promise<{ id: string }>;
}

export default function IngestionRadarPage({ params }: IngestionRadarPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { data: project, refetch: refetchProject } = useProject(projectId);
  const { data: manuscripts = [], refetch: refetchManuscripts } = useManuscripts(projectId);
  const activeManuscript = manuscripts[0];

  const {
    data: statusData,
    refetch: refetchStatus,
  } = useManuscriptStatus(projectId, activeManuscript?.id);

  const { data: chapters = [], refetch: refetchChapters } = useChapters(projectId, activeManuscript?.id);
  const { data: characters = [], refetch: refetchCharacters } = useCharacters(projectId);
  const { data: claims = [], refetch: refetchClaims } = useClaims(projectId);

  const [isRetrying, setIsRetrying] = useState(false);
  const [showRawTrace, setShowRawTrace] = useState(false);

  const effectiveStatus = statusData?.status || activeManuscript?.status || "ready";
  const rawErrorMessage = statusData?.error_note || activeManuscript?.error_note || "";

  const isAuthError =
    rawErrorMessage.includes("401") ||
    rawErrorMessage.toLowerCase().includes("unauthorized") ||
    rawErrorMessage.toLowerCase().includes("authentication_error") ||
    rawErrorMessage.toLowerCase().includes("api_key");

  const isRateLimit =
    rawErrorMessage.includes("429") || rawErrorMessage.toLowerCase().includes("rate");

  const chaptersDone = statusData?.chapters_done ?? activeManuscript?.chapters_done ?? chapters.length;
  const chaptersTotal = statusData?.chapters_total ?? activeManuscript?.chapters_total ?? Math.max(chapters.length, 1);

  const progressPercent = useMemo(() => {
    if (effectiveStatus === "ready") return 100;
    if (chaptersTotal === 0) return 0;
    return Math.min(100, Math.round((chaptersDone / chaptersTotal) * 100));
  }, [effectiveStatus, chaptersDone, chaptersTotal]);

  const handleRetry = async () => {
    if (!activeManuscript) return;
    setIsRetrying(true);
    try {
      await api.projects.reanalyzeChapter(projectId, activeManuscript.id);
      toast.info("Re-analysis pipeline started. Tracking live progress...");
      await refetchStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger re-analysis");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-border-quiet">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-ink-faint uppercase tracking-wider font-semibold">
              Pipeline Telemetry
            </span>
            <span className="text-border-subtle font-mono">•</span>
            <span
              className={`text-xs font-mono flex items-center gap-1.5 font-medium ${
                effectiveStatus === "failed"
                  ? "text-wine-crimson"
                  : effectiveStatus === "processing" || effectiveStatus === "pending"
                  ? "text-amber-400"
                  : "text-pine-moss"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  effectiveStatus === "failed"
                    ? "bg-wine-crimson"
                    : effectiveStatus === "processing" || effectiveStatus === "pending"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-pine-moss"
                }`}
              />
              <span>STATUS: {effectiveStatus.toUpperCase()}</span>
            </span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-ink-parchment">
            Story Ingestion Radar & Decision Stream
          </h1>
          <p className="text-xs sm:text-sm text-ink-ash mt-1.5 max-w-2xl leading-relaxed">
            Monitor real-time folio parsing, multi-pass entity extraction, chronology computation, and continuity verification across your manuscript.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link href={`/projects/${projectId}`}>
            <Button variant="outline" size="sm" className="gap-2 text-ink-bone hover:text-ink-parchment">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </Button>
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRetry}
            isLoading={isRetrying}
            className="gap-2"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Re-analyze Manuscript</span>
          </Button>
        </div>
      </div>

      {/* ERROR DIAGNOSTIC CARD (If Failed) */}
      {effectiveStatus === "failed" && (
        <Surface depth={2} border="subtle" rounded="md" className="p-6 border-l-4 border-l-wine-crimson space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-wine-crimson/20 border border-wine-crimson/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-wine-crimson" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-ink-parchment">
                  {isAuthError
                    ? "Authentication Error: Anthropic Claude API (HTTP 401)"
                    : isRateLimit
                    ? "API Rate Limit Exceeded (HTTP 429)"
                    : "Extraction Pipeline Halted"}
                </h3>
                <Badge variant="contradiction" size="xs">
                  HALTED
                </Badge>
              </div>
              <p className="text-xs text-ink-bone leading-relaxed max-w-3xl">
                {isAuthError ? (
                  <>
                    The AI extraction pipeline was unable to authenticate with Anthropic Claude because the API key in{" "}
                    <code className="text-wine-crimson font-mono bg-surface-base px-1.5 py-0.5 rounded border border-border-quiet">
                      backend/.env
                    </code>{" "}
                    is unauthorized or expired. Please configure your sovereign API key in Global Settings and click Retry below.
                  </>
                ) : (
                  rawErrorMessage || "The background extraction worker reported an unhandled failure."
                )}
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-lg border border-border-subtle bg-surface-subtle flex flex-col justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-ink-parchment flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-wine-crimson" />
                  <span>Configure Sovereign API Key</span>
                </p>
                <p className="text-[11px] text-ink-ash mt-1 leading-relaxed">
                  Provide your personal Anthropic or OpenRouter key in Settings to authenticate multi-pass LLM extraction.
                </p>
              </div>
              <Link
                href="/settings?tab=ai"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md bg-surface-card hover:bg-surface-elevated border border-border-subtle text-ink-parchment transition-colors font-medium"
              >
                <span>Open Key Settings</span>
                <ExternalLink className="w-3 h-3 text-ink-ash" />
              </Link>
            </div>

            <div className="p-4 rounded-lg border border-border-subtle bg-surface-subtle flex flex-col justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-ink-parchment flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-pine-moss" />
                  <span>Retry Analysis Pipeline</span>
                </p>
                <p className="text-[11px] text-ink-ash mt-1 leading-relaxed">
                  Once your API key is configured or network is restored, re-run extraction across all chapters.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                isLoading={isRetrying}
                className="w-full text-xs gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Retry Analysis</span>
              </Button>
            </div>
          </div>

          {/* Collapsible raw trace */}
          {rawErrorMessage && (
            <div className="pt-2 border-t border-border-quiet">
              <button
                type="button"
                onClick={() => setShowRawTrace(!showRawTrace)}
                className="flex items-center gap-1.5 text-[11px] font-mono text-ink-ash hover:text-ink-parchment transition-colors"
              >
                <span>{showRawTrace ? "Hide Diagnostic Trace" : "Show Diagnostic Trace"}</span>
                {showRawTrace ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showRawTrace && (
                <div className="mt-2 p-3 rounded bg-surface-base border border-border-quiet font-mono text-[10px] text-ink-ash max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
                  {rawErrorMessage}
                </div>
              )}
            </div>
          )}
        </Surface>
      )}

      {/* 4 Telemetry Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Surface depth={2} border="subtle" rounded="md" className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-faint">
            <span>Manuscript Folio</span>
            <FileText className="w-4 h-4 text-wine-crimson" />
          </div>
          <p className="text-sm font-medium text-ink-parchment truncate">
            {activeManuscript?.title || "No Manuscript Uploaded"}
          </p>
          <p className="text-xs text-ink-ash font-mono">
            {project?.word_count?.toLocaleString() || "0"} words indexed
          </p>
        </Surface>

        <Surface depth={2} border="subtle" rounded="md" className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-faint">
            <span>Chapter Coverage</span>
            <Layers className="w-4 h-4 text-pine-moss" />
          </div>
          <p className="font-serif text-2xl font-medium text-ink-parchment">
            {chaptersDone} / {chaptersTotal}
          </p>
          <p className="text-xs text-ink-ash font-mono">
            {progressPercent}% pipeline completion
          </p>
        </Surface>

        <Surface depth={2} border="subtle" rounded="md" className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-faint">
            <span>Recognized Entities</span>
            <Compass className="w-4 h-4 text-sky-400" />
          </div>
          <p className="font-serif text-2xl font-medium text-ink-parchment">
            {characters.length}
          </p>
          <p className="text-xs text-ink-ash font-mono">
            Characters in canon roster
          </p>
        </Surface>

        <Surface depth={2} border="subtle" rounded="md" className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-faint">
            <span>Established Claims</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="font-serif text-2xl font-medium text-ink-parchment">
            {claims.length}
          </p>
          <p className="text-xs text-ink-ash font-mono">
            Verified narrative assertions
          </p>
        </Surface>
      </div>

      {/* Progress & Stepper Panel */}
      <Surface depth={2} border="subtle" rounded="md" className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-medium text-ink-parchment">
              Pipeline Execution Stepper
            </h3>
            <p className="text-xs text-ink-ash mt-0.5">
              Four concurrent passes ensure zero epistemic leakage and audit continuity against the story world.
            </p>
          </div>
          <Badge
            variant={
              effectiveStatus === "failed"
                ? "contradiction"
                : effectiveStatus === "processing"
                ? "warning"
                : "thread"
            }
            size="sm"
          >
            {progressPercent}% Complete
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface-card rounded-full h-2.5 overflow-hidden border border-border-quiet">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              effectiveStatus === "failed" ? "bg-wine-crimson" : "bg-pine-moss"
            }`}
            style={{ width: `${Math.max(5, progressPercent)}%` }}
          />
        </div>

        {/* 4 Stages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div
            className={`p-4 rounded-xl border ${
              chaptersDone >= 1
                ? "border-pine-accent/30 bg-pine-accent/5 text-ink-parchment"
                : "border-border-quiet bg-surface-subtle text-ink-ash"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-pine-moss" />
              <span className="font-semibold uppercase tracking-wider text-[11px]">Pass 1</span>
            </div>
            <p className="font-medium text-ink-parchment">Folio Splitting</p>
            <p className="text-[11px] text-ink-ash mt-1">
              Chapter boundary regex parsing & SHA-256 chunk hashing.
            </p>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              effectiveStatus === "processing"
                ? "border-amber-400/40 bg-amber-400/5 text-ink-parchment"
                : chaptersDone >= 2
                ? "border-pine-accent/30 bg-pine-accent/5 text-ink-parchment"
                : "border-border-quiet bg-surface-subtle text-ink-ash"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {effectiveStatus === "processing" ? (
                <RotateCw className="w-4 h-4 text-amber-400 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-pine-moss" />
              )}
              <span className="font-semibold uppercase tracking-wider text-[11px]">Pass 2</span>
            </div>
            <p className="font-medium text-ink-parchment">Multi-Pass Extraction</p>
            <p className="text-[11px] text-ink-ash mt-1">
              Characters, aliases, locations, artifacts & speech quotes.
            </p>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              chaptersDone >= 3
                ? "border-pine-accent/30 bg-pine-accent/5 text-ink-parchment"
                : "border-border-quiet bg-surface-subtle text-ink-ash"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-pine-moss" />
              <span className="font-semibold uppercase tracking-wider text-[11px]">Pass 3</span>
            </div>
            <p className="font-medium text-ink-parchment">Epistemic Horizon</p>
            <p className="text-[11px] text-ink-ash mt-1">
              Chronological ordering and who knew what fact when.
            </p>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              effectiveStatus === "ready"
                ? "border-pine-accent/30 bg-pine-accent/5 text-ink-parchment"
                : "border-border-quiet bg-surface-subtle text-ink-ash"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-pine-moss" />
              <span className="font-semibold uppercase tracking-wider text-[11px]">Pass 4</span>
            </div>
            <p className="font-medium text-ink-parchment">Canon Continuity</p>
            <p className="text-[11px] text-ink-ash mt-1">
              Cross-chapter contradiction audit and Graph persistence.
            </p>
          </div>
        </div>
      </Surface>

      {/* Decision Stream / Live Extracted Outputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Discovered Characters */}
        <Surface depth={2} border="subtle" rounded="md" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-wine-crimson" />
              <h3 className="font-serif text-base font-medium text-ink-parchment">
                Extracted Character Roster
              </h3>
            </div>
            <Badge variant="subtle" size="xs">
              {characters.length} Identified
            </Badge>
          </div>

          {characters.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-ash rounded border border-dashed border-border-quiet">
              No characters recognized yet. Run the extraction pipeline above to detect names and aliases.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {characters.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg border border-border-quiet bg-surface-subtle flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-medium text-ink-parchment">{c.name}</p>
                    {c.aliases && c.aliases.length > 0 && (
                      <p className="text-[10px] text-ink-ash mt-0.5">
                        Aliases: {c.aliases.join(", ")}
                      </p>
                    )}
                  </div>
                  <Badge variant="thread" size="xs">
                    {c.status || "Canon"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Surface>

        {/* Established Claims & Fact Vectors */}
        <Surface depth={2} border="subtle" rounded="md" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-pine-moss" />
              <h3 className="font-serif text-base font-medium text-ink-parchment">
                Canon Claim Vectors
              </h3>
            </div>
            <Badge variant="subtle" size="xs">
              {claims.length} Vectors
            </Badge>
          </div>

          {claims.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-ash rounded border border-dashed border-border-quiet">
              No factual assertions recorded yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {claims.slice(0, 10).map((cl) => (
                <div
                  key={cl.id}
                  className="p-3 rounded-lg border border-border-quiet bg-surface-subtle space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink-parchment">
                      {cl.subject}.{cl.attribute} ={" "}
                      <span className="text-wine-crimson font-mono">{cl.value}</span>
                    </span>
                    <span className="text-[10px] text-ink-ash font-mono">Ch. {cl.chapter}</span>
                  </div>
                  {cl.evidence_quote && (
                    <p className="text-[11px] text-ink-ash italic leading-relaxed line-clamp-1">
                      &ldquo;{cl.evidence_quote}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Surface>
      </div>
    </div>
  );
}
