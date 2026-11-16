"use client";

import React from "react";
import {
  X,
  ShieldAlert,
  Heart,
  Skull,
  HelpCircle,
  Clock,
  Sparkles,
  Link2,
  Quote,
  Eye,
  Box,
  MapPin,
  Calendar,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoryGraphNode, StoryGraphConnection } from "@/lib/storyGraph/types";

export interface EntityInspectorProps {
  node: StoryGraphNode | null;
  connections: StoryGraphConnection[];
  currentChapter: number;
  onClose: () => void;
  onSelectConnection: (connectionId: string) => void;
  onSelectEntity: (entityId: string) => void;
}

export function EntityInspector({
  node,
  connections,
  currentChapter,
  onClose,
  onSelectConnection,
  onSelectEntity,
}: EntityInspectorProps) {
  if (!node) return null;

  // Filter connections involving this entity
  const entityConnections = connections.filter(
    (c) => c.sourceId === node.id || c.targetId === node.id
  );

  const isCharacter = node.kind === "character";
  const isObject = node.kind === "object";
  const isLocation = node.kind === "location";
  const isEvent = node.kind === "event";

  return (
    <aside className="w-96 max-w-full h-full bg-surface-subtle/95 backdrop-blur-md border-l border-border-quiet flex flex-col shadow-2xl text-ink-parchment z-20 overflow-hidden">
      {/* Drawer Header */}
      <div className="p-5 border-b border-border-quiet bg-surface-card/60 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "text-[10px] font-mono tracking-wider uppercase font-semibold px-2 py-0.5 rounded",
                isCharacter && "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30",
                isObject && "bg-amber-950/80 text-amber-300 border border-amber-500/30",
                isLocation && "bg-teal-950/80 text-teal-300 border border-teal-500/30",
                isEvent && "bg-rose-950/80 text-rose-300 border border-rose-500/30"
              )}
            >
              {isCharacter
                ? "Character Dossier"
                : isObject
                ? "Relic / Artifact"
                : isLocation
                ? "Setting Dossier"
                : "Chronicle Event"}
            </span>
            <span className="text-[10px] font-mono text-ink-faint">
              • Ch {node.firstChapter}
            </span>
          </div>

          <h2 className="text-xl font-serif font-bold text-ink-parchment tracking-tight mt-1">
            {node.name}
          </h2>

          {node.state.aliases && node.state.aliases.length > 0 && (
            <p className="text-xs text-ink-ash mt-1 italic">
              Known as: {node.state.aliases.join(", ")}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-ink-faint hover:text-ink-parchment hover:bg-surface-elevated transition-colors"
          title="Close Inspector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Dossier Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
        {/* Status / Condition Banner */}
        <div className="p-3.5 rounded-xl bg-surface-card border border-border-quiet space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-ink-faint uppercase text-[10px] tracking-wider">
              {isCharacter ? "Vitality & Canon State" : "Entity Status"}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase",
                node.state.status.toLowerCase() === "alive" &&
                  "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30",
                node.state.status.toLowerCase() === "deceased" &&
                  "bg-zinc-900 text-zinc-400 border border-zinc-700",
                node.state.status.toLowerCase() === "stasis" &&
                  "bg-purple-950/60 text-purple-300 border border-purple-500/30",
                node.state.status.toLowerCase() === "unknown" &&
                  "bg-amber-950/60 text-amber-300 border border-amber-500/30",
                !isCharacter && "bg-surface-elevated text-ink-parchment border border-border-subtle"
              )}
            >
              {node.state.status}
            </span>
          </div>

          <p className="text-ink-bone leading-relaxed text-[11px] font-sans">
            {node.state.condition}
          </p>
        </div>

        {/* Narrative Description / Lore */}
        {node.state.description && (
          <div className="space-y-1.5">
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              Canonical Background
            </h3>
            <p className="text-ink-bone leading-relaxed font-sans text-xs bg-surface-field p-3 rounded-lg border border-border-quiet">
              {node.state.description}
            </p>
          </div>
        )}

        {/* Relic Mentions (if Object) */}
        {isObject && node.state.mentionChapters && node.state.mentionChapters.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-ink-faint flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Chapters Mentioned (Through Ch {currentChapter})</span>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {node.state.mentionChapters.map((ch) => (
                <span
                  key={ch}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono",
                    ch === currentChapter
                      ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold"
                      : "bg-surface-card text-ink-ash border border-border-quiet"
                  )}
                >
                  Ch {ch}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Active Connections & Relational Bonds */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-ink-faint flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Active Network Bonds ({entityConnections.length})</span>
            </h3>
            <span className="font-mono text-[10px] text-ink-faint">Ch {currentChapter}</span>
          </div>

          {entityConnections.length === 0 ? (
            <div className="p-4 rounded-lg bg-surface-card border border-border-quiet text-center text-ink-faint text-[11px]">
              No active bonds recorded for this entity at Chapter {currentChapter}.
            </div>
          ) : (
            <div className="space-y-2">
              {entityConnections.map((conn) => {
                const otherName =
                  conn.sourceId === node.id ? conn.targetName : conn.sourceName;
                const otherId =
                  conn.sourceId === node.id ? conn.targetId : conn.sourceId;

                return (
                  <div
                    key={conn.connectionId}
                    onClick={() => onSelectConnection(conn.connectionId)}
                    className="p-3 rounded-xl bg-surface-card hover:bg-surface-elevated border border-border-quiet hover:border-border-prominent transition-all cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif font-bold text-ink-parchment text-xs">
                        {otherName}
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[9.5px] font-mono uppercase font-semibold",
                          conn.visualTone === "friction" &&
                            "bg-rose-950/80 text-rose-300 border border-rose-500/30",
                          conn.visualTone === "warmth" &&
                            "bg-amber-950/80 text-amber-300 border border-amber-500/30",
                          conn.visualTone === "neutral" &&
                            "bg-surface-void text-ink-ash border border-border-quiet"
                        )}
                      >
                        {conn.visualTone}
                      </span>
                    </div>

                    <p className="text-[11px] text-ink-bone font-sans">
                      {conn.records.map((r) => r.relation).join(" / ")}
                    </p>

                    {conn.records[0]?.description && (
                      <p className="text-[10.5px] text-ink-ash italic">
                        {conn.records[0].description}
                      </p>
                    )}

                    <div className="flex justify-between items-center pt-1 border-t border-border-quiet text-[10px] font-mono text-ink-faint">
                      <span>Since Ch {conn.sinceChapter}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEntity(otherId);
                        }}
                        className="text-sky-400 hover:text-sky-300 hover:underline"
                      >
                        Inspect {otherName} →
                      </button>
                    </div>
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
