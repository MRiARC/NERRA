"use client";

import React, { useState } from "react";
import { MOCK_TIMELINE_EVENTS } from "./mockData";
import { AlertCircle, MapPin, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export function TimelineView() {
  const [order, setOrder] = useState<"narrative" | "chronological">("narrative");

  const sortedEvents =
    order === "narrative"
      ? [...MOCK_TIMELINE_EVENTS].sort((a, b) => a.chapter_number - b.chapter_number)
      : [...MOCK_TIMELINE_EVENTS].sort((a, b) => a.chronological_order - b.chronological_order);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto bg-surface-void px-3 py-3 sm:px-6 sm:py-4 text-ink-parchment overscroll-contain">
      {/* Header matching timeline/page.tsx */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border-quiet/80 pb-2.5 shrink-0">
        <div>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-wine-accent">
            Chronicle
          </span>
          <h2 className="font-serif text-lg sm:text-xl font-medium tracking-tight text-ink-parchment mt-0.5">
            Dual Chronology Timeline
          </h2>
          <p className="mt-0.5 font-serif text-[11px] italic text-ink-bone">
            The timeline is two clocks: in-book narrative reading order vs in-universe chronological order.
          </p>
        </div>

        {/* Order toggle pill */}
        <div className="flex items-center gap-1 rounded bg-surface-card p-0.5 border border-border-quiet font-mono text-[9px]">
          <button
            type="button"
            onClick={() => setOrder("narrative")}
            className={cn(
              "px-2 py-0.5 rounded transition-all",
              order === "narrative"
                ? "bg-surface-elevated text-ink-parchment font-semibold border border-border-subtle"
                : "text-ink-ash hover:text-ink-parchment"
            )}
          >
            In-Book Order
          </button>
          <button
            type="button"
            onClick={() => setOrder("chronological")}
            className={cn(
              "px-2 py-0.5 rounded transition-all",
              order === "chronological"
                ? "bg-wine-accent text-white font-semibold"
                : "text-ink-ash hover:text-ink-parchment"
            )}
          >
            In-Universe Time
          </button>
        </div>
      </div>

      {/* Spatiotemporal collision banner */}
      {order === "chronological" && (
        <div className="mt-3 p-2.5 rounded border border-severity-contradiction/40 bg-severity-contradiction-bg flex items-start gap-2 text-[10px] text-severity-contradiction shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold">Spatiotemporal Collision in 1888</strong>
            <p className="mt-0.5 text-[9.5px] leading-relaxed text-ink-bone">
              Lysander is inspected at Dover Anchorage at dawn in Chapter 2, but simultaneously presides over
              the military tribunal in York 6 hours prior (240 leagues transit).
            </p>
          </div>
        </div>
      )}

      {/* Chronicle Spine Events - Mathematically centered line & dots */}
      <div className="mt-4 space-y-3 pb-8">
        {sortedEvents.map((ev, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === sortedEvents.length - 1;

          return (
            <div key={ev.id} className="relative flex items-start gap-3">
              {/* Spine column with vertical line and centered dot */}
              <div className="flex flex-col items-center shrink-0 w-4 relative self-stretch pt-3">
                {/* Vertical spine line running through dot centers */}
                <div
                  className={cn(
                    "absolute w-px bg-border-quiet/80 left-1/2 -translate-x-1/2",
                    isFirst ? "top-[17px] bottom-0" : isLast ? "top-0 h-[17px]" : "top-0 bottom-0"
                  )}
                />

                {/* Node dot centered on the line */}
                <div
                  className={cn(
                    "relative z-10 h-2.5 w-2.5 rounded-full border-2 border-surface-void shrink-0 shadow-xs",
                    ev.has_conflict
                      ? "bg-severity-contradiction ring-2 ring-severity-contradiction/30 animate-pulse"
                      : "bg-wine-crimson ring-1 ring-wine-crimson/30"
                  )}
                />
              </div>

              {/* Event Card Content */}
              <div className="flex-1 min-w-0 rounded border border-border-quiet/80 bg-surface-card/30 p-2.5 hover:bg-surface-card/60 transition-colors text-[10px]">
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[8px] uppercase tracking-wider text-ink-faint">
                  <span className="flex items-center gap-1 text-wine-accent font-semibold">
                    <Calendar className="w-2.5 h-2.5" />
                    <span>{ev.time_anchor}</span>
                  </span>
                  <span className="flex items-center gap-1 text-ink-ash">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>{ev.location}</span>
                  </span>
                  <span className="text-ink-bone font-semibold">Ch. 0{ev.chapter_number}</span>
                </div>

                <h4 className="mt-1 font-serif text-xs font-medium text-ink-parchment">
                  {ev.title}
                </h4>

                <p className="mt-0.5 font-sans text-[9.5px] text-ink-ash leading-relaxed">
                  {ev.description}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {ev.participants.map((p) => (
                    <span
                      key={p}
                      className="rounded bg-surface-subtle px-1.5 py-0.5 font-mono text-[7.5px] uppercase tracking-wider text-ink-bone"
                    >
                      {p}
                    </span>
                  ))}
                  {ev.is_flashback && (
                    <span className="rounded bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 font-mono text-[7.5px] uppercase text-amber-300">
                      Flashback
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
