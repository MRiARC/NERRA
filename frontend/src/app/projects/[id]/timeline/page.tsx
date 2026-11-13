"use client";

import React, { use, useMemo, useState } from "react";
import Link from "next/link";
import { useTimeline } from "@/hooks/useStoryData";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import { ArrowRight, ChevronDown } from "lucide-react";

interface TimelinePageProps {
  params: Promise<{ id: string }>;
}

/**
 * The timeline is two clocks: the order the reader meets events, and the order
 * they happened. A chronicle down a single spine makes the difference visible.
 */
export default function TimelinePage({ params }: TimelinePageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [order, setOrder] = useState<"narrative" | "chronological">("narrative");
  const [selectedCharacter, setSelectedCharacter] = useState<string>("all");
  const [selectedChapter, setSelectedChapter] = useState<number | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: timeline, isLoading } = useTimeline(projectId, order);

  const events = timeline?.events || [];
  const characters = timeline?.characters || [];
  const conflictChapters = new Set(timeline?.spatiotemporal_conflict_chapters || []);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (selectedCharacter !== "all" && !(event.participants || []).includes(selectedCharacter)) {
        return false;
      }
      if (selectedChapter !== "all" && event.chapter_number !== selectedChapter) return false;
      return true;
    });
  }, [events, selectedCharacter, selectedChapter]);

  const chapters = useMemo(
    () => Array.from(new Set(events.map((event) => event.chapter_number))).sort((a, b) => a - b),
    [events]
  );

  const stateLine =
    events.length === 0
      ? "No events have been read out of the manuscript yet."
      : `${events.length} events across ${chapters.length} ${
          chapters.length === 1 ? "chapter" : "chapters"
        }. ${timeline?.flashback_count ?? 0} flashbacks, ${timeline?.flashforward_count ?? 0} flashforwards${
          conflictChapters.size > 0
            ? `, and ${conflictChapters.size} ${
                conflictChapters.size === 1 ? "chapter" : "chapters"
              } where the clock contradicts itself.`
            : ". The clock holds."
        }`;

  return (
    <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 py-10 sm:py-14">
      <PageHeader eyebrow="Chronology" title="The order of things" line={stateLine} />

      {/* Clock + filters */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.16em]">
          {(
            [
              { id: "narrative" as const, label: "As written" },
              { id: "chronological" as const, label: "As it happened" },
            ]
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setOrder(mode.id)}
              aria-pressed={order === mode.id}
              className={cn(
                "border-b pb-1 transition-colors",
                order === mode.id
                  ? "border-wine-crimson text-ink-parchment"
                  : "border-transparent text-ink-faint hover:text-ink-ash"
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            <span>Who</span>
            <select
              value={selectedCharacter}
              onChange={(event) => setSelectedCharacter(event.target.value)}
              className="cursor-pointer bg-transparent text-ink-ash focus:outline-none"
            >
              <option value="all" className="bg-surface-elevated">
                everyone
              </option>
              {characters.map((character) => (
                <option key={character} value={character} className="bg-surface-elevated">
                  {character}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            <span>Where</span>
            <select
              value={selectedChapter}
              onChange={(event) =>
                setSelectedChapter(event.target.value === "all" ? "all" : Number(event.target.value))
              }
              className="cursor-pointer bg-transparent text-ink-ash focus:outline-none"
            >
              <option value="all" className="bg-surface-elevated">
                all chapters
              </option>
              {chapters.map((chapter) => (
                <option key={chapter} value={chapter} className="bg-surface-elevated">
                  ch. {String(chapter).padStart(2, "0")}
                  {conflictChapters.has(chapter) ? " ⚠" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Chronicle */}
      {isLoading ? (
        <p className="py-24 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          Ordering the events…
        </p>
      ) : filteredEvents.length === 0 ? (
        <div className="mt-10 border-t border-dashed border-border-subtle py-20 text-center">
          <p className="font-serif text-xl text-ink-parchment">Nothing happens here yet.</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            {events.length === 0 ? "Import a manuscript to build a chronology" : "No events match this filter"}
          </p>
        </div>
      ) : (
        <ol className="mt-10">
          {filteredEvents.map((event, index) => {
            const hasConflict = conflictChapters.has(event.chapter_number);
            const isExpanded = expandedId === event.id;
            const clockLabel =
              order === "narrative"
                ? `Scene ${event.scene_order}`
                : `Clock ${event.story_time_order}`;

            return (
              <li key={event.id} className="relative border-b border-border-quiet">
                <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-5 py-5 sm:grid-cols-[88px_minmax(0,1fr)] sm:gap-x-8">
                  {/* Margin: chapter + clock */}
                  <div className="pt-0.5">
                    <p
                      className={cn(
                        "font-mono text-[10px] uppercase tracking-[0.16em]",
                        hasConflict ? "text-wine-crimson" : "text-ink-faint"
                      )}
                    >
                      Ch. {String(event.chapter_number).padStart(2, "0")}
                    </p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                      {clockLabel}
                    </p>
                    <span
                      aria-hidden
                      className={cn(
                        "mt-3 block h-1.5 w-1.5 rounded-full",
                        event.is_flashback
                          ? "bg-wine-accent"
                          : event.is_flashforward
                          ? "bg-severity-thread"
                          : hasConflict
                          ? "bg-severity-contradiction"
                          : "bg-ink-faint"
                      )}
                    />
                  </div>

                  {/* The event */}
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : event.id)}
                      aria-expanded={isExpanded}
                      className="group w-full text-left"
                    >
                      <p className="font-serif text-[17px] leading-relaxed text-ink-bone transition-colors group-hover:text-ink-parchment">
                        {event.summary}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                        {event.temporal_anchor && (
                          <span className="text-ink-ash">{event.temporal_anchor}</span>
                        )}
                        {event.location && <span>{event.location}</span>}
                        {event.is_flashback && (
                          <span className="text-wine-accent">flashback</span>
                        )}
                        {event.is_flashforward && (
                          <span className="text-severity-thread">flashforward</span>
                        )}
                        {hasConflict && (
                          <span className="text-severity-contradiction">
                            temporal conflict
                          </span>
                        )}
                        <ChevronDown
                          className={cn(
                            "ml-auto h-3 w-3 transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-4 border-l border-border-quiet pl-3">
                        {event.participants?.length > 0 && (
                          <p className="font-serif text-[13px] italic text-ink-ash">
                            {event.participants.join(" · ")}
                          </p>
                        )}
                        <div className="mt-3 flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.16em]">
                          <Link
                            href={`/projects/${projectId}/reader?chapter=${event.chapter_number}`}
                            className="inline-flex items-center gap-1.5 text-ink-ash transition-colors hover:text-ink-parchment"
                          >
                            Read this chapter
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                          <span className="text-ink-faint">
                            {index + 1} of {filteredEvents.length}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
