"use client";

import React, { useEffect, useState } from "react";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChapterScrubberProps {
  currentChapter: number;
  onChapterChange: (chapter: number) => void;
  minChapter?: number;
  maxChapter?: number;
  introducedCount?: number;
  activeRelsCount?: number;
  totalCharacters?: number;
  milestones?: Milestone[];
}

interface Milestone {
  chapter: number;
  label: string;
  shortTag: string;
  description: string;
}

const AETHELGARD_MILESTONES: Milestone[] = [
  {
    chapter: 1,
    label: "Scriptorium Genesis",
    shortTag: "Ch 1",
    description: "Corin Vance discovers ciphered future scroll; Silas Vance mentor memory.",
  },
  {
    chapter: 4,
    label: "Artificer Voss",
    shortTag: "Ch 4",
    description: "Kaelen Voss introduced in clockwork undercroft with brass eyepatch.",
  },
  {
    chapter: 6,
    label: "Blind Astrologer",
    shortTag: "Ch 6",
    description: "Elowen introduced in sewer conduits; black mercury council memory revealed.",
  },
  {
    chapter: 14,
    label: "Belladonna Poisoning",
    shortTag: "Ch 14",
    description: "Vespera's venom-coated cipher key betrayal uncovered by Voss.",
  },
  {
    chapter: 15,
    label: "Deluge Sluice Truth",
    shortTag: "Ch 15",
    description: "Truth uncovered: Silas commanded young Corin to pull floodgate lever.",
  },
  {
    chapter: 16,
    label: "Princess Aurelia Reveal",
    shortTag: "Ch 16",
    description: "Vespera revealed as Princess Aurelia; Malakor drinks black mercury.",
  },
  {
    chapter: 17,
    label: "Seventh Sluice Stand",
    shortTag: "Ch 17",
    description: "Voss sacrifices himself jamming arm into blast door gear housing.",
  },
  {
    chapter: 19,
    label: "Temporal Stasis Loop",
    shortTag: "Ch 19",
    description: "Corin locks Malakor into inescapable 5-second stasis loop with astrolabe.",
  },
  {
    chapter: 20,
    label: "Shores of Mor-Vaelen",
    shortTag: "Ch 20",
    description: "Dawn vigil fulfilled; Corin, Vespera, and Elowen stand on lake shores.",
  },
];

export function ChapterScrubber({
  currentChapter,
  onChapterChange,
  minChapter = 1,
  maxChapter = 20,
  introducedCount,
  activeRelsCount,
  totalCharacters,
  milestones,
}: ChapterScrubberProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const currentChapterRef = React.useRef(currentChapter);
  currentChapterRef.current = currentChapter;

  const effectiveMilestones = milestones !== undefined ? milestones : AETHELGARD_MILESTONES;

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
    }, 1800);

    return () => clearInterval(timer);
  }, [isPlaying, maxChapter, minChapter, onChapterChange]);

  const activeMilestone = effectiveMilestones.find(
    (m) => m.chapter === currentChapter
  );

  return (
    <div className="w-full bg-surface-subtle/95 backdrop-blur-md border-t border-border-quiet p-4 text-ink-parchment select-none shrink-0 z-20 relative">
      <div className="max-w-6xl mx-auto space-y-3">
        {/* Top bar: Playback controls, Chapter Indicator, Stats */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChapterChange(Math.max(minChapter, currentChapter - 1))}
              disabled={currentChapter <= minChapter}
              className="p-1.5 rounded-md hover:bg-surface-elevated text-ink-ash hover:text-ink-parchment disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Previous Chapter"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg bg-surface-card hover:bg-surface-elevated text-ink-parchment border border-border-quiet transition-colors"
              title={isPlaying ? "Pause Timeline Scrub" : "Play Timeline Scrub"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-wine-accent" />
              ) : (
                <Play className="w-4 h-4 text-wine-accent fill-wine-accent" />
              )}
            </button>

            <button
              onClick={() => onChapterChange(Math.min(maxChapter, currentChapter + 1))}
              disabled={currentChapter >= maxChapter}
              className="p-1.5 rounded-md hover:bg-surface-elevated text-ink-ash hover:text-ink-parchment disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Next Chapter"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => onChapterChange(minChapter)}
              className="p-1.5 rounded-md hover:bg-surface-elevated text-ink-faint hover:text-ink-ash transition-colors ml-1"
              title="Reset to Chapter 1"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Current Chapter & Milestone Name */}
          <div className="flex items-center gap-3">
            <span className="font-serif text-lg tracking-wide font-medium text-ink-parchment">
              Chapter {currentChapter}
            </span>
            <span className="text-xs font-mono text-ink-faint">of {maxChapter}</span>

            {activeMilestone && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium">{activeMilestone.label}</span>
              </div>
            )}
          </div>

          {/* Real-time stats */}
          <div className="flex items-center gap-4 text-xs font-mono text-ink-ash">
            {introducedCount !== undefined && (
              <div>
                <span className="text-ink-faint">Cast: </span>
                <span className="text-wine-accent font-semibold">{introducedCount}</span>
                {totalCharacters !== undefined && (
                  <span className="text-ink-faint">/{totalCharacters}</span>
                )}
              </div>
            )}
            {activeRelsCount !== undefined && (
              <div>
                <span className="text-ink-faint">Bonds: </span>
                <span className="text-sky-400 font-semibold">{activeRelsCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Scrubber Track */}
        <div className="relative pt-1">
          <input
            type="range"
            min={minChapter}
            max={maxChapter}
            value={currentChapter}
            onChange={(e) => onChapterChange(Number(e.target.value))}
            className="w-full h-2 bg-surface-card rounded-lg appearance-none cursor-pointer accent-wine-accent hover:accent-wine-crimson focus:outline-none"
          />

          {/* Tick marks for milestone chapters */}
          <div className="relative w-full flex justify-between px-1 mt-1 text-[10px] font-mono text-ink-faint">
            {Array.from({ length: maxChapter - minChapter + 1 }).map((_, idx) => {
              const ch = minChapter + idx;
              const isMilestone = effectiveMilestones.some((m) => m.chapter === ch);
              const isCurrent = ch === currentChapter;

              return (
                <button
                  key={ch}
                  onClick={() => onChapterChange(ch)}
                  className={cn(
                    "flex flex-col items-center group transition-colors",
                    isCurrent ? "text-wine-accent font-bold" : isMilestone ? "text-amber-400/80 hover:text-amber-300" : "hover:text-ink-ash"
                  )}
                  style={{ width: `${100 / (maxChapter - minChapter + 1)}%` }}
                >
                  <span
                    className={cn(
                      "w-1 rounded-full mb-0.5",
                      isCurrent
                        ? "h-2.5 bg-wine-accent"
                        : isMilestone
                        ? "h-2 bg-amber-400/70 group-hover:bg-amber-300"
                        : "h-1 bg-border-subtle"
                    )}
                  />
                  <span className="hidden md:inline">{ch}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Milestone Quick-Jump Chips (rendered only if milestones exist) */}
        {effectiveMilestones.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 text-xs">
            <span className="text-ink-faint text-[11px] font-mono mr-1 shrink-0">Milestones:</span>
            {effectiveMilestones.map((m) => {
              const isActive = m.chapter === currentChapter;
              return (
                <button
                  key={m.chapter}
                  onClick={() => onChapterChange(m.chapter)}
                  title={m.description}
                  className={cn(
                    "shrink-0 px-2.5 py-1 rounded-md text-[11px] transition-all font-sans",
                    isActive
                      ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 font-medium shadow-sm"
                      : "bg-surface-card text-ink-ash border border-border-quiet hover:bg-surface-elevated hover:text-ink-parchment"
                  )}
                >
                  <span className="font-mono text-amber-400/70 mr-1.5">Ch {m.chapter}</span>
                  {m.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
