"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Clock, History, MapPin, Users } from "lucide-react";
import { api, TimelineData } from "@/lib/api";

interface Props {
  projectId: string;
}

export default function TimelineView({ projectId }: Props) {
  const [order, setOrder] = useState<"chronological" | "narrative">("chronological");
  const [selectedChar, setSelectedChar] = useState<string>("");
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.getTimeline(projectId, order, selectedChar || undefined);
        if (active) setData(res);
      } catch (err) {
        console.error("Failed to fetch timeline:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [projectId, order, selectedChar]);

  const events = data?.events || [];
  const conflicts = new Set(data?.spatiotemporal_conflict_chapters || []);

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-800/80 bg-slate-900/40 rounded-xl p-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Dual Story Timeline Engine
          </h3>
          <p className="text-xs text-slate-400">
            Toggle between Narrative Order (book chapters) and Chronological Story Order (flashbacks ordered by
            in-universe time).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs font-medium">
            <button
              onClick={() => setOrder("chronological")}
              className={`px-3 py-1.5 rounded-md transition ${
                order === "chronological"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Story Chronology
            </button>
            <button
              onClick={() => setOrder("narrative")}
              className={`px-3 py-1.5 rounded-md transition ${
                order === "narrative"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Narrative Order
            </button>
          </div>

          {/* Character Swimlane Filter */}
          <select
            value={selectedChar}
            onChange={(e) => setSelectedChar(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
          >
            <option value="">All Characters ({data?.characters.length ?? 0})</option>
            {(data?.characters || []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics & Conflict Alert */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
          Events: {events.length}
        </span>
        <span className="text-xs px-3 py-1 rounded-full bg-purple-950/40 border border-purple-800/40 text-purple-300 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" />
          Flashbacks: {data?.flashback_count ?? 0}
        </span>
        {conflicts.size > 0 && (
          <span className="text-xs px-3 py-1 rounded-full bg-rose-950/50 border border-rose-800/50 text-rose-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Spatiotemporal Conflicts in Ch. {Array.from(conflicts).join(", ")}
          </span>
        )}
      </div>

      {/* Event Swimlane Sequence */}
      {loading && events.length === 0 ? (
        <div className="text-center py-16 text-xs text-slate-500">Computing story chronology...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
          No timeline events extracted yet.
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-slate-800 space-y-4">
          {events.map((ev, idx) => {
            const hasConflict = conflicts.has(ev.chapter_number);
            return (
              <div
                key={ev.id}
                className={`relative border rounded-xl p-4 transition ${
                  hasConflict
                    ? "bg-rose-950/15 border-rose-800/50"
                    : ev.is_flashback
                    ? "bg-purple-950/15 border-purple-800/40"
                    : "bg-slate-900/50 border-slate-800/80"
                }`}
              >
                {/* Timeline dot */}
                <span
                  className={`absolute -left-[31px] top-5 w-3.5 h-3.5 rounded-full border-2 border-[#090b10] ${
                    hasConflict
                      ? "bg-rose-500"
                      : ev.is_flashback
                      ? "bg-purple-400"
                      : "bg-indigo-500"
                  }`}
                />

                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-semibold">
                      #{idx + 1} · Ch. {ev.chapter_number} (Scene {ev.scene_order})
                    </span>
                    {ev.is_flashback && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                        Flashback{ev.temporal_anchor ? `: "${ev.temporal_anchor}"` : ""}
                      </span>
                    )}
                    {ev.is_flashforward && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                        Flash-forward{ev.temporal_anchor ? `: "${ev.temporal_anchor}"` : ""}
                      </span>
                    )}
                    {hasConflict && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                        Spatiotemporal Conflict
                      </span>
                    )}
                  </div>

                  {ev.location && (
                    <span className="text-xs text-emerald-300 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {ev.location}
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-200 leading-relaxed">{ev.summary}</p>

                {ev.participants && ev.participants.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    <Users className="w-3.5 h-3.5 text-slate-500 mr-1" />
                    {ev.participants.map((p, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => setSelectedChar(p)}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600/30 text-slate-300 border border-slate-700/60 transition"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
