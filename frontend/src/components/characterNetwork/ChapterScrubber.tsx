"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChapterMilestone {
  chapter: number;
  label: string;
  shortTag: string;
  description: string;
}

export interface ChapterScrubberProps {
  currentChapter: number;
  onChapterChange: (chapter: number) => void;
  minChapter?: number;
  maxChapter?: number;
  introducedCount?: number;
  activeRelsCount?: number;
  activeThreadsCount?: number;
  totalCharacters?: number;
  milestones?: ChapterMilestone[];
}

/**
 * Editorial Manuscript Scrubber for the Character Network.
 * Inspired by Nera's ManuscriptRuler: segmented archival ribbon,
 * luminous active bookmark, milestone diamond marginalia, and
 * tactile transport deck.
 */
export function ChapterScrubber({
  currentChapter,
  onChapterChange,
  minChapter = 1,
  maxChapter = 20,
  milestones = [],
}: ChapterScrubberProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const currentChapterRef = useRef(currentChapter);
  currentChapterRef.current = currentChapter;
  const isDraggingRef = useRef(false);
  const rulerTrackRef = useRef<HTMLDivElement>(null);

  const totalSegments = Math.max(1, maxChapter - minChapter + 1);

  // Map milestones for O(1) chapter lookups
  const milestoneMap = React.useMemo(() => {
    const map = new Map<number, ChapterMilestone>();
    for (const m of milestones) {
      map.set(m.chapter, m);
    }
    return map;
  }, [milestones]);

  const activeMilestone = milestoneMap.get(currentChapter);

  // Auto-playback effect
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      const next =
        currentChapterRef.current >= maxChapter
          ? minChapter
          : currentChapterRef.current + 1;
      onChapterChange(next);
      if (next >= maxChapter) {
        setIsPlaying(false);
      }
    }, 1600);

    return () => clearInterval(timer);
  }, [isPlaying, maxChapter, minChapter, onChapterChange]);

  // Keyboard navigation on ruler track
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onChapterChange(Math.max(minChapter, currentChapter - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onChapterChange(Math.min(maxChapter, currentChapter + 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChapterChange(minChapter);
    } else if (e.key === "End") {
      e.preventDefault();
      onChapterChange(maxChapter);
    } else if (e.key === " ") {
      e.preventDefault();
      setIsPlaying((prev) => !prev);
    }
  };

  // Scrubbing calculation from pointer coordinates
  const calculateChapterFromPointer = useCallback(
    (clientX: number) => {
      if (!rulerTrackRef.current) return;
      const rect = rulerTrackRef.current.getBoundingClientRect();
      const relativeX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = rect.width > 0 ? relativeX / rect.width : 0;
      const index = Math.min(
        totalSegments - 1,
        Math.floor(percentage * totalSegments)
      );
      const computedChapter = minChapter + index;
      if (computedChapter !== currentChapterRef.current) {
        onChapterChange(computedChapter);
      }
    },
    [minChapter, totalSegments, onChapterChange]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    calculateChapterFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    calculateChapterFromPointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already ended
    }
  };

  return (
    <div className="w-full bg-surface-subtle/95 backdrop-blur-md border-t border-border-quiet px-4 sm:px-6 py-2.5 sm:py-3 text-ink-parchment select-none shrink-0 z-20 relative">
      <div className="max-w-6xl mx-auto space-y-2">
        {/* Top Control Bar: Transport Deck + Chronometer Readout + Milestone Marginalia */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Transport Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onChapterChange(minChapter)}
              disabled={currentChapter <= minChapter}
              className="p-1 sm:p-1.5 rounded-lg border border-border-quiet/80 bg-surface-card/60 hover:bg-surface-elevated text-ink-ash hover:text-ink-parchment disabled:opacity-25 disabled:hover:bg-surface-card/60 transition-colors"
              title="Jump to First Chapter"
              aria-label="First Chapter"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onChapterChange(Math.max(minChapter, currentChapter - 1))}
              disabled={currentChapter <= minChapter}
              className="p-1 sm:p-1.5 rounded-lg border border-border-quiet/80 bg-surface-card/60 hover:bg-surface-elevated text-ink-ash hover:text-ink-parchment disabled:opacity-25 disabled:hover:bg-surface-card/60 transition-colors"
              title="Previous Chapter (←)"
              aria-label="Previous Chapter"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={cn(
                "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-mono transition-all",
                isPlaying
                  ? "border-wine-accent/60 bg-wine-accent/20 text-ink-parchment shadow-[0_0_12px_rgba(153,27,27,0.3)]"
                  : "border-border-quiet/80 bg-surface-card/80 hover:bg-surface-elevated text-ink-bone hover:text-ink-parchment"
              )}
              title={isPlaying ? "Pause timeline scrub" : "Auto-advance timeline scrub"}
              aria-label={isPlaying ? "Pause Timeline Scrub" : "Play Timeline Scrub"}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-wine-accent fill-wine-accent" />
                  <span className="text-[11px] font-medium text-wine-accent">Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-wine-accent fill-wine-accent" />
                  <span className="text-[11px] font-medium text-ink-parchment">Play</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onChapterChange(Math.min(maxChapter, currentChapter + 1))}
              disabled={currentChapter >= maxChapter}
              className="p-1 sm:p-1.5 rounded-lg border border-border-quiet/80 bg-surface-card/60 hover:bg-surface-elevated text-ink-ash hover:text-ink-parchment disabled:opacity-25 disabled:hover:bg-surface-card/60 transition-colors"
              title="Next Chapter (→)"
              aria-label="Next Chapter"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onChapterChange(maxChapter)}
              disabled={currentChapter >= maxChapter}
              className="p-1 sm:p-1.5 rounded-lg border border-border-quiet/80 bg-surface-card/60 hover:bg-surface-elevated text-ink-ash hover:text-ink-parchment disabled:opacity-25 disabled:hover:bg-surface-card/60 transition-colors"
              title="Jump to Latest Chapter"
              aria-label="Latest Chapter"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chronometer Readout */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-ash hidden sm:inline">
              Manuscript Chronometer
            </span>
            <span className="text-border-subtle font-mono hidden sm:inline">·</span>
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-base sm:text-lg font-medium text-ink-parchment tracking-tight whitespace-nowrap">
                Chapter {currentChapter}
              </span>
              <span className="font-mono text-xs text-ink-faint whitespace-nowrap">of {maxChapter}</span>
            </div>

            {activeMilestone && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-serif italic">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate max-w-[200px] lg:max-w-[280px]">“{activeMilestone.label}”</span>
              </div>
            )}
          </div>

          {/* Milestone Quick Jump Indicators */}
          {milestones.length > 0 && (
            <div className="hidden lg:flex items-center gap-1.5">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint mr-1">
                Milestones:
              </span>
              <div className="flex items-center gap-1 max-w-[280px] xl:max-w-[340px] overflow-x-auto no-scrollbar">
                {milestones.slice(0, 5).map((m) => {
                  const isActive = m.chapter === currentChapter;
                  return (
                    <button
                      key={m.chapter}
                      type="button"
                      onClick={() => onChapterChange(m.chapter)}
                      title={m.description}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-mono transition-all shrink-0",
                        isActive
                          ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold"
                          : "bg-surface-card text-ink-ash border border-border-quiet hover:border-border-prominent hover:text-ink-parchment"
                      )}
                    >
                      Ch {m.chapter}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* The Segmented Manuscript Ruler Track */}
        <div
          ref={rulerTrackRef}
          role="slider"
          aria-label="Chapter Timeline Scrubber"
          aria-valuemin={minChapter}
          aria-valuemax={maxChapter}
          aria-valuenow={currentChapter}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative pt-0.5 pb-0.5 cursor-ew-resize select-none focus:outline-none w-full"
        >
          {/* Segment Blocks */}
          <div className="flex items-end gap-[1.5px] sm:gap-[3px] w-full">
            {Array.from({ length: totalSegments }).map((_, idx) => {
              const ch = minChapter + idx;
              const isPassed = ch < currentChapter;
              const isActive = ch === currentChapter;
              const isFuture = ch > currentChapter;
              const milestone = milestoneMap.get(ch);

              return (
                <div
                  key={ch}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChapterChange(ch);
                  }}
                  className="group relative flex-1 min-w-[4px] flex flex-col items-center cursor-pointer"
                >
                  {/* Milestone Diamond Pip */}
                  <div className="h-1.5 sm:h-2 flex items-center justify-center mb-0.5 sm:mb-1">
                    {milestone && (
                      <span
                        className={cn(
                          "w-1 sm:w-1.5 h-1 sm:h-1.5 rotate-45 transition-colors",
                          isActive
                            ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]"
                            : "bg-amber-400/60 group-hover:bg-amber-300"
                        )}
                      />
                    )}
                  </div>

                  {/* Segment Bar */}
                  <span
                    className={cn(
                      "block w-full h-3 sm:h-3.5 rounded-[2px] transition-all duration-150",
                      isActive &&
                        "bg-wine-crimson ring-2 ring-wine-crimson/50 ring-offset-1 ring-offset-surface-void shadow-[0_0_12px_rgba(153,27,27,0.4)]",
                      isPassed &&
                        "bg-border-prominent group-hover:bg-ink-bone/60",
                      isFuture &&
                        "bg-surface-elevated/70 border border-border-quiet/60 group-hover:bg-surface-card"
                    )}
                  />

                  {/* Hover Dossier Tooltip */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[200px] -translate-x-1/2 rounded-md border border-border-subtle bg-surface-elevated px-2.5 py-1 text-left opacity-0 shadow-[0_8px_20px_rgba(0,0,0,0.6)] transition-opacity duration-150 group-hover:opacity-100"
                  >
                    <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                      Ch. {String(ch).padStart(2, "0")}
                    </span>
                    {milestone ? (
                      <span className="mt-0.5 block truncate font-serif text-xs text-amber-200">
                        {milestone.label}
                      </span>
                    ) : (
                      <span className="mt-0.5 block truncate font-serif text-xs text-ink-parchment">
                        Chapter {ch}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Scale Marginalia */}
          <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
            <span>Ch. {String(minChapter).padStart(2, "0")}</span>
            <span className="hidden sm:inline text-ink-ash text-[9.5px]">
              {currentChapter === maxChapter
                ? `Latest Canon State · Chapter ${maxChapter}`
                : `Scrubbing Temporal Canon Snapshot · Chapter ${currentChapter}`}
            </span>
            <span>Ch. {String(maxChapter).padStart(2, "0")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
