"use client";

import React from "react";
import {
  X,
  History,
  Quote,
  ArrowRight,
  Link2,
  Sparkles,
  Box,
  MapPin,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoryGraphConnection } from "@/lib/storyGraph/types";

export interface ConnectionInspectorProps {
  connection: StoryGraphConnection | null;
  currentChapter: number;
  onClose: () => void;
  onSelectEntity: (entityId: string) => void;
}

export function ConnectionInspector({
  connection,
  currentChapter,
  onClose,
  onSelectEntity,
}: ConnectionInspectorProps) {
  if (!connection) return null;

  const isThread = connection.connectionTypes.includes("narrative_thread");
  const isCustody = connection.connectionTypes.includes("custody");
  const isSpatial = connection.connectionTypes.includes("spatial");

  return (
    <aside className="w-96 max-w-full h-full bg-surface-subtle/95 backdrop-blur-md border-l border-border-quiet flex flex-col shadow-2xl text-ink-parchment z-20 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border-quiet bg-surface-card/60 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "text-[10px] font-mono tracking-wider uppercase font-semibold px-2 py-0.5 rounded",
                isCustody && "bg-amber-950/80 text-amber-300 border border-amber-500/30",
                isSpatial && "bg-teal-950/80 text-teal-300 border border-teal-500/30",
                isThread && "bg-cyan-950/80 text-cyan-300 border border-cyan-500/30",
                !isCustody && !isSpatial && !isThread && "bg-sky-950/80 text-sky-300 border border-sky-500/30"
              )}
            >
              {isCustody
                ? "Relic Custody Link"
                : isSpatial
                ? "Setting Presence"
                : isThread
                ? "Narrative Plot Thread"
                : "Relationship Bond"}
            </span>
            <span className="text-[10px] font-mono text-ink-faint">
              • {connection.records.length} record{connection.records.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-base font-serif font-bold text-ink-parchment mt-1">
            <button
              onClick={() => onSelectEntity(connection.sourceId)}
              className="hover:text-wine-accent transition-colors underline decoration-dotted underline-offset-4"
            >
              {connection.sourceName}
            </button>
            <span className="text-ink-faint text-sm">
              {connection.isReciprocal ? "⇄" : "→"}
            </span>
            <button
              onClick={() => onSelectEntity(connection.targetId)}
              className="hover:text-wine-accent transition-colors underline decoration-dotted underline-offset-4"
            >
              {connection.targetName}
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-ink-faint hover:text-ink-parchment hover:bg-surface-elevated transition-colors"
          title="Close Inspector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
        {/* Tone & Types Badge */}
        <div className="p-3.5 rounded-xl bg-surface-card border border-border-quiet flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-ink-faint uppercase text-[10px] tracking-wider">
              Visual Tone:
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase",
                connection.visualTone === "friction" &&
                  "bg-rose-950/80 text-rose-300 border border-rose-500/30",
                connection.visualTone === "warmth" &&
                  "bg-amber-950/80 text-amber-300 border border-amber-500/30",
                connection.visualTone === "neutral" &&
                  "bg-surface-void text-ink-ash border border-border-quiet"
              )}
            >
              {connection.visualTone}
            </span>
          </div>

          <span className="font-mono text-[10px] text-ink-faint">
            Since Ch {connection.sinceChapter}
          </span>
        </div>

        {/* Detailed Canonical Records */}
        <div className="space-y-3">
          <h3 className="font-mono text-[10px] uppercase tracking-wider text-ink-faint flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Canonical Records & Evidence Provenance</span>
          </h3>

          <div className="space-y-3">
            {connection.records.map((record, idx) => (
              <div
                key={record.id || idx}
                className="p-3.5 rounded-xl bg-surface-card border border-border-quiet space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-serif font-bold text-ink-parchment text-xs">
                    {record.relation}
                  </span>
                  <span className="font-mono text-[10px] text-ink-faint">
                    Ch {record.sinceChapter}
                    {record.untilChapter ? `–${record.untilChapter}` : "–End"}
                  </span>
                </div>

                {record.description && (
                  <p className="text-[11px] text-ink-bone leading-relaxed font-sans">
                    {record.description}
                  </p>
                )}

                {record.evidenceQuote && (
                  <div className="p-2.5 rounded-lg bg-surface-field border-l-2 border-wine-accent text-ink-bone font-serif text-[11px] italic leading-relaxed flex items-start gap-2">
                    <Quote className="w-3 h-3 text-wine-accent shrink-0 mt-0.5" />
                    <span>&ldquo;{record.evidenceQuote}&rdquo;</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
