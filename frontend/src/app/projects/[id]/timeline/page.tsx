"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { useTimeline } from "@/hooks/useStoryData";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Clock,
  History,
  FastForward,
  AlertTriangle,
  MapPin,
  Users,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle2,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface TimelinePageProps {
  params: Promise<{ id: string }>;
}

export default function TimelinePage({ params }: TimelinePageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [order, setOrder] = useState<"narrative" | "chronological">("narrative");
  const [selectedCharacter, setSelectedCharacter] = useState<string>("all");
  const [selectedChapter, setSelectedChapter] = useState<number | "all">("all");
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const { data: timeline, isLoading, error } = useTimeline(projectId, order);

  const events = timeline?.events || [];
  const characters = timeline?.characters || [];
  const conflictChapters = new Set(timeline?.spatiotemporal_conflict_chapters || []);

  // Filter events by character and chapter
  const filteredEvents = events.filter((ev) => {
    if (selectedCharacter !== "all") {
      const parts = ev.participants || [];
      if (!parts.includes(selectedCharacter)) return false;
    }
    if (selectedChapter !== "all" && ev.chapter_number !== selectedChapter) {
      return false;
    }
    return true;
  });

  // Extract unique chapters
  const chapters = Array.from(new Set(events.map((e) => e.chapter_number))).sort(
    (a, b) => a - b
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
      {/* Header & Mission Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border-subtle pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-ink-ash font-medium">
              Chrono-Spatial Integrity
            </span>
            <span className="text-border-subtle">•</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-severity-thread">
              <span className="w-1.5 h-1.5 rounded-full bg-severity-thread" />
              Temporal Engine Active
            </span>
          </div>
          <h1 className="text-3xl font-serif font-normal tracking-tight text-ink-parchment flex items-center gap-3">
            <Clock className="w-7 h-7 text-wine-accent" />
            Dual Story Timeline
          </h1>
          <p className="text-sm text-ink-ash max-w-2xl leading-relaxed">
            Correlate narrative manuscript flow against in-universe chronological history.
            Detect temporal paradoxes, anachronisms, and time-travel discrepancies before publication.
          </p>
        </div>

        {/* View Switcher: Narrative vs Chronological */}
        <div className="flex items-center p-1 bg-surface-card border border-border-quiet rounded-xl shadow-inner shrink-0">
          <button
            onClick={() => setOrder("narrative")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
              order === "narrative"
                ? "bg-surface-elevated text-ink-parchment shadow-sm border border-border-subtle"
                : "text-ink-ash hover:text-ink-parchment"
            )}
          >
            <BookOpen className="w-3.5 h-3.5 text-wine-accent" />
            Narrative Order
          </button>
          <button
            onClick={() => setOrder("chronological")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
              order === "chronological"
                ? "bg-surface-elevated text-ink-parchment shadow-sm border border-border-subtle"
                : "text-ink-ash hover:text-ink-parchment"
            )}
          >
            <History className="w-3.5 h-3.5 text-wine-accent" />
            In-Universe Chronology
          </button>
        </div>
      </div>

      {/* KPI & Telemetry Rail */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Surface depth={2} border="subtle" className="p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash">Total Events</p>
            <p className="text-2xl font-serif text-ink-parchment mt-0.5">{events.length}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-border-quiet flex items-center justify-center text-ink-ash">
            <Calendar className="w-4 h-4" />
          </div>
        </Surface>

        <Surface depth={2} border="subtle" className="p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash">Flashbacks</p>
            <p className="text-2xl font-serif text-ink-parchment mt-0.5">{timeline?.flashback_count ?? 0}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-border-quiet flex items-center justify-center text-wine-accent">
            <History className="w-4 h-4" />
          </div>
        </Surface>

        <Surface depth={2} border="subtle" className="p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash">Flashforwards</p>
            <p className="text-2xl font-serif text-ink-parchment mt-0.5">{timeline?.flashforward_count ?? 0}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-border-quiet flex items-center justify-center text-severity-thread">
            <FastForward className="w-4 h-4" />
          </div>
        </Surface>

        <Surface
          depth={2}
          border={conflictChapters.size > 0 ? "contradiction" : "subtle"}
          className="p-4 rounded-xl flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash">Temporal Conflicts</p>
            <p className="text-2xl font-serif text-ink-parchment mt-0.5">{conflictChapters.size}</p>
          </div>
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            conflictChapters.size > 0
              ? "bg-wine-crimson/15 text-wine-crimson border border-wine-crimson/30"
              : "bg-surface-subtle border border-border-quiet text-ink-ash"
          )}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </Surface>
      </div>

      {/* Filter and Query Deck */}
      <Surface depth={1} border="quiet" className="p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-ink-ash">
            <Filter className="w-3.5 h-3.5" />
            <span>Character Swimlane:</span>
          </div>
          <select
            value={selectedCharacter}
            onChange={(e) => setSelectedCharacter(e.target.value)}
            className="bg-surface-card border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-ink-parchment outline-none focus:border-wine-accent cursor-pointer transition-colors"
          >
            <option value="all">All Cast Members ({characters.length})</option>
            {characters.map((char) => (
              <option key={char} value={char}>
                {char}
              </option>
            ))}
          </select>

          <span className="text-border-subtle font-mono text-xs hidden sm:inline">|</span>

          <div className="flex items-center gap-2 text-xs font-mono text-ink-ash">
            <span>Chapter:</span>
          </div>
          <select
            value={selectedChapter}
            onChange={(e) =>
              setSelectedChapter(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="bg-surface-card border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-ink-parchment outline-none focus:border-wine-accent cursor-pointer transition-colors"
          >
            <option value="all">All Chapters ({chapters.length})</option>
            {chapters.map((ch) => (
              <option key={ch} value={ch}>
                Chapter {ch} {conflictChapters.has(ch) ? "⚠️ Conflict" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-mono text-ink-faint">
          Showing <span className="text-ink-parchment font-medium">{filteredEvents.length}</span> of {events.length} events
        </div>
      </Surface>

      {/* Main Timeline Stream */}
      {isLoading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-wine-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-ink-ash">Synthesizing spatiotemporal topology...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <Surface depth={2} border="subtle" className="p-12 text-center rounded-2xl max-w-xl mx-auto space-y-4">
          <Clock className="w-10 h-10 text-ink-ash mx-auto opacity-50" />
          <h3 className="font-serif text-lg text-ink-parchment">No Temporal Events Detected</h3>
          <p className="text-xs text-ink-ash leading-relaxed">
            No events match the selected character or chapter filter. Try switching back to &apos;All Cast Members&apos; or re-importing the manuscript to refresh timeline extraction.
          </p>
        </Surface>
      ) : (
        <div className="relative pl-6 sm:pl-8 border-l border-border-subtle space-y-8 my-4 ml-4">
          {filteredEvents.map((ev, idx) => {
            const hasConflict = conflictChapters.has(ev.chapter_number);
            const isSelected = activeEventId === ev.id;

            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: Math.min(idx * 0.03, 0.4) }}
                className="relative group"
              >
                {/* Node Pip on the timeline spine */}
                <div
                  className={cn(
                    "absolute -left-[31px] sm:-left-[39px] top-4 w-3.5 h-3.5 rounded-full border-2 transition-transform duration-200 group-hover:scale-125",
                    ev.is_flashback
                      ? "bg-wine-accent border-surface-void"
                      : ev.is_flashforward
                      ? "bg-severity-thread border-surface-void"
                      : hasConflict
                      ? "bg-wine-crimson border-surface-void"
                      : "bg-ink-bone border-surface-void"
                  )}
                />

                <Surface
                  depth={2}
                  border={hasConflict ? "contradiction" : isSelected ? "focus" : "subtle"}
                  className={cn(
                    "p-5 rounded-xl transition-all duration-200 cursor-pointer",
                    isSelected ? "ring-1 ring-border-focus" : "hover:border-border-prominent"
                  )}
                  onClick={() => setActiveEventId(isSelected ? null : ev.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-subtle text-ink-parchment border border-border-quiet">
                        Ch. {ev.chapter_number}
                      </span>

                      <span className="font-mono text-[11px] text-ink-ash">
                        {order === "narrative" ? `Scene #${ev.scene_order}` : `Story Clock #${ev.story_time_order}`}
                      </span>

                      {ev.is_flashback && (
                        <Badge variant="contradiction" size="sm" className="gap-1">
                          <History className="w-3 h-3" /> Flashback
                        </Badge>
                      )}

                      {ev.is_flashforward && (
                        <Badge variant="thread" size="sm" className="gap-1">
                          <FastForward className="w-3 h-3" /> Flashforward
                        </Badge>
                      )}

                      {hasConflict && (
                        <Badge variant="contradiction" size="sm" className="gap-1">
                          <AlertTriangle className="w-3 h-3" /> Temporal Conflict
                        </Badge>
                      )}
                    </div>

                    {/* Temporal Anchor Label */}
                    {ev.temporal_anchor && (
                      <div className="flex items-center gap-1.5 text-xs font-mono text-ink-ash bg-surface-subtle px-2.5 py-1 rounded-md border border-border-quiet self-start">
                        <Clock className="w-3 h-3 text-wine-accent" />
                        <span>{ev.temporal_anchor}</span>
                      </div>
                    )}
                  </div>

                  {/* Summary Narrative Body */}
                  <p className="text-sm font-sans text-ink-parchment leading-relaxed mb-4">
                    {ev.summary}
                  </p>

                  {/* Footer Meta: Participants & Location */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-quiet text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                      {ev.participants && ev.participants.length > 0 && (
                        <div className="flex items-center gap-1.5 text-ink-ash">
                          <Users className="w-3.5 h-3.5 text-ink-faint" />
                          <div className="flex flex-wrap gap-1">
                            {ev.participants.map((p) => (
                              <span
                                key={p}
                                className="px-1.5 py-0.5 rounded bg-surface-subtle border border-border-quiet text-[11px] text-ink-parchment font-mono"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {ev.location && (
                        <div className="flex items-center gap-1.5 text-ink-ash">
                          <MapPin className="w-3.5 h-3.5 text-ink-faint" />
                          <span className="font-mono text-[11px] text-ink-bone">{ev.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/projects/${projectId}/reader?chapter=${ev.chapter_number}`}
                        className="text-[11px] font-mono text-wine-accent hover:text-ink-parchment flex items-center gap-1 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Read Folio <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </Surface>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
