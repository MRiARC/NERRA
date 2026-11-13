"use client";

import React, { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  useProject,
  useManuscripts,
  useManuscriptStatus,
  useChapters,
  useCharacters,
  useClaims,
} from "@/hooks/useStoryData";
import { PageHeader, SectionHeading } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { formatWords, getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, RotateCw } from "lucide-react";

interface IngestionRadarPageProps {
  params: Promise<{ id: string }>;
}

/**
 * The ingestion page is the reading room: you are watching NERRA read the book.
 * Everything here answers "how far in is it, and what has it found so far?"
 */
export default function IngestionRadarPage({ params }: IngestionRadarPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { data: project, refetch: refetchProject } = useProject(projectId);
  const { data: manuscripts = [], refetch: refetchManuscripts } = useManuscripts(projectId);
  const activeManuscript = manuscripts[0];

  const { data: statusData, refetch: refetchStatus } = useManuscriptStatus(
    projectId,
    activeManuscript?.id
  );
  const { data: chapters = [] } = useChapters(projectId, activeManuscript?.id);
  const { data: characters = [] } = useCharacters(projectId);
  const { data: claims = [] } = useClaims(projectId);

  const [isRetrying, setIsRetrying] = useState(false);
  const [showRawTrace, setShowRawTrace] = useState(false);

  const effectiveStatus = statusData?.status || activeManuscript?.status || "ready";
  const rawErrorMessage = statusData?.error_note || activeManuscript?.error_note || "";
  const chaptersDone =
    statusData?.chapters_done ?? activeManuscript?.chapters_done ?? chapters.length;
  const chaptersTotal =
    statusData?.chapters_total ??
    activeManuscript?.chapters_total ??
    Math.max(chapters.length, 1);

  const isAuthError =
    rawErrorMessage.includes("401") ||
    rawErrorMessage.toLowerCase().includes("unauthorized") ||
    rawErrorMessage.toLowerCase().includes("authentication_error") ||
    rawErrorMessage.toLowerCase().includes("api_key");
  const isRateLimit =
    rawErrorMessage.includes("429") || rawErrorMessage.toLowerCase().includes("rate");

  const progressPercent = useMemo(() => {
    if (effectiveStatus === "ready") return 100;
    if (chaptersTotal === 0) return 0;
    return Math.min(100, Math.round((chaptersDone / chaptersTotal) * 100));
  }, [effectiveStatus, chaptersDone, chaptersTotal]);

  const readingState = useMemo(() => {
    if (!activeManuscript) return "No manuscript yet. Import a draft to begin.";
    if (effectiveStatus === "failed") return "The reading stopped partway. Nothing was lost.";
    if (effectiveStatus === "processing" || effectiveStatus === "pending") {
      return `Reading chapter ${Math.max(chaptersDone, 1)} of ${chaptersTotal}.`;
    }
    return `Read to the end: ${chaptersTotal} ${
      chaptersTotal === 1 ? "chapter" : "chapters"
    }, ${characters.length} ${characters.length === 1 ? "character" : "characters"}, ${
      claims.length
    } asserted ${claims.length === 1 ? "fact" : "facts"}.`;
  }, [activeManuscript, effectiveStatus, chaptersDone, chaptersTotal, characters.length, claims.length]);

  const handleRetry = async () => {
    if (!activeManuscript) return;
    setIsRetrying(true);
    try {
      await api.projects.reanalyzeChapter(projectId, activeManuscript.id);
      toast.info("The manuscript is back in the reading queue.");
      await Promise.all([refetchStatus(), refetchManuscripts(), refetchProject()]);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Could not restart the analysis"));
    } finally {
      setIsRetrying(false);
    }
  };

  const visibleChapters = chapters.length > 0
    ? chapters.length
    : Math.max(chaptersTotal, 1);

  return (
    <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Ingestion"
        title={activeManuscript?.title || project?.title || "No manuscript yet"}
        line={readingState}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            isLoading={isRetrying}
            disabled={!activeManuscript}
            className="gap-2"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{effectiveStatus === "failed" ? "Read it again" : "Re-read"}</span>
          </Button>
        }
      />

      {/* Diagnosis — one line, only when it matters */}
      {effectiveStatus === "failed" && (
        <div className="mt-8 border-l-2 border-wine-crimson pl-4">
          <p className="text-[13px] leading-relaxed text-ink-bone">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-wine-crimson">
              {isAuthError
                ? "Key rejected · "
                : isRateLimit
                ? "Rate limited · "
                : "Reading halted · "}
            </span>
            {isAuthError
              ? "The inference endpoint refused the credentials, so extraction stopped. Add a working key in Settings, then read again."
              : rawErrorMessage.toLowerCase().includes("temporarily_suspended") ||
                rawErrorMessage.toLowerCase().includes("temporarily suspended")
              ? "Your proxy account is suspended upstream. Use a direct Anthropic or OpenRouter key in Settings."
              : rawErrorMessage || "The extraction worker failed without a message."}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.16em]">
            <Link href="/settings?tab=ai" className="text-ink-ash transition-colors hover:text-ink-parchment">
              Open key settings →
            </Link>
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className="text-wine-crimson transition-colors hover:text-ink-parchment disabled:opacity-50"
            >
              {isRetrying ? "Restarting…" : "Read it again"}
            </button>
            {rawErrorMessage && (
              <button
                type="button"
                onClick={() => setShowRawTrace((open) => !open)}
                className="ml-auto flex items-center gap-1 text-ink-faint transition-colors hover:text-ink-ash"
              >
                <span>{showRawTrace ? "Hide trace" : "Trace"}</span>
                {showRawTrace ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          {showRawTrace && rawErrorMessage && (
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-border-quiet bg-surface-subtle p-3 font-mono text-[10px] leading-relaxed text-ink-ash select-text">
              {rawErrorMessage}
            </pre>
          )}
        </div>
      )}

      {/* Reading track: one tick per chapter, filled as it is read */}
      <section className="mt-12">
        <div className="flex items-end justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          <span>{formatWords(project?.word_count || 0)}</span>
          <span className={effectiveStatus === "failed" ? "text-wine-crimson" : "text-ink-ash"}>
            {chaptersDone} / {chaptersTotal} read
          </span>
        </div>

        <div className="mt-3 flex gap-[3px]" aria-hidden>
          {Array.from({ length: visibleChapters }).map((_, index) => {
            const isRead = index < chaptersDone || effectiveStatus === "ready";
            const isCurrent =
              !isRead && index === chaptersDone && effectiveStatus !== "failed";
            return (
              <span
                key={index}
                className={`h-8 flex-1 rounded-[2px] ${
                  isRead
                    ? "bg-wine-crimson/60"
                    : isCurrent
                    ? "bg-severity-warning/50 animate-pulse"
                    : "bg-surface-subtle"
                }`}
              />
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
          <span>Ch. 01</span>
          <span>{progressPercent}% complete</span>
          <span>Ch. {String(visibleChapters).padStart(2, "0")}</span>
        </div>
      </section>

      {/* What the reading produced */}
      <section className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <SectionHeading label="Who has appeared" meta={<span>{characters.length}</span>} />

          {characters.length === 0 ? (
            <p className="py-8 font-serif text-[15px] italic text-ink-ash">
              No one yet. The reading has not reached a name.
            </p>
          ) : (
            <ul className="divide-y divide-border-quiet">
              {characters.slice(0, 14).map((character) => (
                <li key={character.id} className="flex items-baseline justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-serif text-base text-ink-parchment">{character.name}</p>
                    {character.aliases?.length > 0 && (
                      <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                        also {character.aliases.join(", ")}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                    {character.first_chapter ? `Ch. ${String(character.first_chapter).padStart(2, "0")}` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <SectionHeading label="What the text asserts" meta={<span>{claims.length}</span>} />

          {claims.length === 0 ? (
            <p className="py-8 font-serif text-[15px] italic text-ink-ash">
              Nothing recorded yet. Facts appear as chapters are read.
            </p>
          ) : (
            <ul className="divide-y divide-border-quiet">
              {claims.slice(0, 14).map((claim) => (
                <li key={claim.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-[13px] text-ink-bone">
                      <span className="text-ink-ash">{claim.subject}</span>
                      <span className="text-ink-faint"> · {claim.attribute} · </span>
                      <span className="font-mono text-wine-crimson">{claim.value}</span>
                    </p>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                      Ch. {String(claim.chapter).padStart(2, "0")}
                    </span>
                  </div>
                  {claim.evidence_quote && (
                    <p className="mt-1.5 line-clamp-2 border-l border-border-quiet pl-2.5 font-serif text-[13px] italic leading-relaxed text-ink-ash">
                      &ldquo;{claim.evidence_quote}&rdquo;
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
