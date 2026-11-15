"use client";

import React, { useMemo } from "react";
import {
  X,
  History,
  Quote,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CharacterNetworkNode,
  HistoricalRelationshipStage,
  RawCharacter,
  RawRelationship,
  VisualConnection,
} from "@/lib/characterNetwork/types";
import { getHistoricalRelationshipsForPair } from "@/lib/characterNetwork/transform";

export interface RelationshipInspectorProps {
  connection: VisualConnection | null;
  allCharacters: readonly RawCharacter[];
  allRelationships: readonly RawRelationship[];
  currentChapter: number;
  onClose: () => void;
  onSelectCharacter: (characterId: string) => void;
}

export function RelationshipInspector({
  connection,
  allCharacters,
  allRelationships,
  currentChapter,
  onClose,
  onSelectCharacter,
}: RelationshipInspectorProps) {
  if (!connection) return null;

  // Retrieve historical relationship evolution stages up to currentChapter
  const historyStages: HistoricalRelationshipStage[] = useMemo(() => {
    return getHistoricalRelationshipsForPair(
      allRelationships,
      allCharacters,
      connection.characterAId,
      connection.characterBId,
      currentChapter
    );
  }, [allRelationships, allCharacters, connection, currentChapter]);

  const tone = connection.visualTone;

  return (
    <aside className="w-96 max-w-full h-full bg-surface-subtle/95 backdrop-blur-md border-l border-border-quiet flex flex-col shadow-2xl text-ink-parchment z-20 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border-quiet bg-surface-card/60 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono tracking-wider text-sky-400 uppercase">
              Relationship Bond
            </span>
            <span className="text-[10px] font-mono text-ink-faint">
              • {connection.records.length} record{connection.records.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-base font-serif font-bold text-ink-parchment">
            <button
              onClick={() => onSelectCharacter(connection.characterAId)}
              className="hover:text-wine-accent transition-colors underline decoration-dotted underline-offset-4"
              title={`Inspect ${connection.characterAName}`}
            >
              {connection.characterAName}
            </button>
            <span className="text-ink-faint text-sm">
              {connection.isReciprocal ? "⇄" : "→"}
            </span>
            <button
              onClick={() => onSelectCharacter(connection.characterBId)}
              className="hover:text-wine-accent transition-colors underline decoration-dotted underline-offset-4"
              title={`Inspect ${connection.characterBName}`}
            >
              {connection.characterBName}
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

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm custom-scrollbar">
        {/* Visual Tone & Sentiment Banner */}
        <div className="p-3.5 rounded-lg bg-surface-card border border-border-quiet space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-ink-faint">
              Visual Tone
            </span>
            <span
              className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold uppercase tracking-wider",
                tone === "friction" && "bg-rose-950/70 text-rose-300 border border-rose-500/40",
                tone === "warmth" && "bg-amber-950/70 text-amber-300 border border-amber-500/40",
                tone === "neutral" && "bg-surface-elevated text-ink-ash border border-border-quiet"
              )}
            >
              {tone}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono text-ink-faint mr-1">
              Sentiments:
            </span>
            {connection.sentimentDistribution.map((s) => (
              <span
                key={s}
                className="px-2 py-0.5 rounded bg-surface-field text-ink-bone border border-border-quiet text-[11px] font-mono"
              >
                {s}
              </span>
            ))}
            {connection.isReciprocal && (
              <span className="px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-500/30 text-[10px] font-mono uppercase">
                Reciprocal
              </span>
            )}
          </div>
        </div>

        {/* Active Directional Records at Chapter N */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase text-ink-faint tracking-wider flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-wine-accent" />
            Active Records at Ch {currentChapter} ({connection.records.length})
          </h3>

          <div className="space-y-2.5">
            {connection.records.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-lg bg-surface-card border border-border-quiet space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-ink-parchment">
                    <span>{r.sourceName}</span>
                    <ArrowRight className="w-3 h-3 text-ink-faint" />
                    <span>{r.targetName}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-field text-wine-accent border border-wine-accent/30">
                    Ch {r.sinceChapter} → {r.untilChapter ? `Ch ${r.untilChapter}` : "End"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-sky-300">{r.relation}</span>
                  <span className="text-ink-faint">•</span>
                  <span className="text-ink-ash italic">{r.sentiment}</span>
                </div>

                {r.description && (
                  <p className="text-xs text-ink-ash leading-relaxed">
                    {r.description}
                  </p>
                )}

                {r.evidenceQuote && (
                  <div className="mt-2 p-2.5 rounded bg-surface-void border-l-2 border-wine-accent/60 text-ink-bone font-serif text-xs leading-relaxed flex items-start gap-1.5">
                    <Quote className="w-3 h-3 text-wine-accent/70 shrink-0 mt-0.5" />
                    <span>{r.evidenceQuote}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Historical Evolution Timeline */}
        <div className="space-y-3 pt-2 border-t border-border-quiet">
          <h3 className="text-xs font-mono uppercase text-ink-faint tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-amber-400" />
            Evolution Stages up to Ch {currentChapter} ({historyStages.length})
          </h3>

          {historyStages.length === 0 ? (
            <p className="text-xs text-ink-faint italic">
              No historical relationship stages recorded prior to Chapter {currentChapter}.
            </p>
          ) : (
            <div className="relative pl-4 space-y-3 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-quiet">
              {historyStages.map((stage, idx) => {
                const isCurrent = stage.isCurrentAtChapter;
                return (
                  <div key={stage.id} className="relative group text-xs space-y-1">
                    {/* Timeline dot */}
                    <span
                      className={cn(
                        "absolute -left-4 top-1.5 w-2.5 h-2.5 rounded-full border-2 bg-surface-void",
                        isCurrent
                          ? "border-wine-accent bg-wine-accent shadow-[0_0_8px_rgba(140,34,66,0.5)]"
                          : "border-border-subtle group-hover:border-amber-400"
                      )}
                    />

                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "font-semibold",
                          isCurrent ? "text-wine-accent" : "text-ink-bone"
                        )}
                      >
                        Stage {idx + 1}: {stage.relation}
                      </span>
                      <span className="text-[10px] font-mono text-ink-faint">
                        Ch {stage.sinceChapter}
                        {stage.untilChapter ? ` - ${stage.untilChapter}` : "+"}
                      </span>
                    </div>

                    <div className="text-[11px] text-ink-ash flex items-center gap-1.5">
                      <span>{stage.sourceName} → {stage.targetName}</span>
                      <span>•</span>
                      <span className="italic">{stage.sentiment}</span>
                      {isCurrent && (
                        <span className="text-[10px] font-mono uppercase px-1 py-0.2 rounded bg-wine-accent/20 text-wine-accent border border-wine-accent/40">
                          Active
                        </span>
                      )}
                    </div>

                    {stage.evidenceQuote && (
                      <p className="text-[11px] font-serif text-ink-ash italic line-clamp-2 mt-0.5">
                        &ldquo;{stage.evidenceQuote}&rdquo;
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
