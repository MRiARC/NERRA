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
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CharacterNetworkNode,
  DataQualityIssue,
  VisualConnection,
} from "@/lib/characterNetwork/types";

export interface CharacterInspectorProps {
  node: CharacterNetworkNode | null;
  connections: VisualConnection[];
  dataQualityIssues?: DataQualityIssue[];
  currentChapter: number;
  onClose: () => void;
  onSelectConnection: (connectionId: string) => void;
  onSelectCharacter: (characterId: string) => void;
}

export function CharacterInspector({
  node,
  connections,
  dataQualityIssues = [],
  currentChapter,
  onClose,
  onSelectConnection,
  onSelectCharacter,
}: CharacterInspectorProps) {
  if (!node) return null;

  // Filter connections involving this character
  const characterConnections = connections.filter(
    (c) => c.characterAId === node.id || c.characterBId === node.id
  );

  // Filter active self-referential relationship claims for this character
  const selfLoopIssues = dataQualityIssues.filter(
    (issue) => issue.code === "SELF_LOOP" && issue.characterId === node.id
  );

  const status = node.state.status.toLowerCase();
  const transition = node.state.statusTransition;
  const revelations = node.state.knownRevelations;

  return (
    <aside className="w-96 max-w-full h-full bg-surface-subtle/95 backdrop-blur-md border-l border-border-quiet flex flex-col shadow-2xl text-ink-parchment z-20 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border-quiet bg-surface-card/60 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono tracking-wider text-wine-accent uppercase">
              Character Dossier
            </span>
            <span className="text-[10px] font-mono text-ink-faint">
              • Intro Ch {node.firstChapter}
            </span>
          </div>
          <h2 className="text-xl font-serif font-bold text-ink-parchment tracking-tight">
            {node.name}
          </h2>

          {node.aliases.length > 0 && (
            <p className="text-xs text-ink-ash mt-1 italic">
              Known as: {node.aliases.join(", ")}
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

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm custom-scrollbar">
        {/* Physical Status Card */}
        <div className="p-3.5 rounded-lg bg-surface-card border border-border-quiet space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-ink-faint">
              Physical State
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium uppercase font-mono tracking-wider",
                status === "alive" && "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30",
                status === "deceased" && "bg-surface-void text-ink-ash border border-border-subtle",
                status === "incapacitated" && "bg-purple-950/60 text-purple-300 border border-purple-500/30",
                status === "unknown" && "bg-amber-950/60 text-amber-300 border border-amber-500/30"
              )}
            >
              {status === "alive" && <Heart className="w-3 h-3 text-emerald-400" />}
              {status === "deceased" && <Skull className="w-3 h-3 text-ink-faint" />}
              {status === "incapacitated" && <Clock className="w-3 h-3 text-purple-400" />}
              {status === "unknown" && <HelpCircle className="w-3 h-3 text-amber-400" />}
              {node.state.status}
            </span>
          </div>

          <div className="text-xs text-ink-bone font-sans font-medium">
            {node.state.condition}
          </div>

          {/* Status Transition Provenance */}
          {transition && (
            <div className="pt-2 border-t border-border-quiet text-[11px] space-y-1">
              <div className="flex items-center justify-between text-ink-ash">
                <span className="font-mono text-[10px]">
                  Transition Source: {transition.sourceType}
                </span>
                <span className="font-mono text-emerald-400/90 text-[10px]">
                  Ch {transition.chapter}
                </span>
              </div>
              <div className="text-ink-ash italic">
                {transition.description}
              </div>
              {transition.evidenceQuote && (
                <div className="mt-1.5 p-2 rounded bg-surface-void border-l-2 border-emerald-500/60 text-ink-bone font-serif text-xs leading-relaxed">
                  &ldquo;{transition.evidenceQuote}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chapter-Scoped Description */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-mono uppercase text-ink-faint tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            Chapter {currentChapter} Knowledge
          </h3>
          <p className="text-xs text-ink-bone leading-relaxed font-sans bg-surface-field p-3 rounded-md border border-border-quiet">
            {node.description}
          </p>
        </div>

        {/* Narrative Revelations */}
        <div className="space-y-2">
          <h3 className="text-xs font-mono uppercase text-ink-faint tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Unlocked Revelations ({revelations.length})
          </h3>

          {revelations.length === 0 ? (
            <p className="text-xs text-ink-faint italic">
              No hidden revelations unlocked for this character up to Chapter {currentChapter}.
            </p>
          ) : (
            <div className="space-y-2.5">
              {revelations.map((rev) => (
                <div
                  key={rev.id}
                  className="p-3 rounded-lg bg-surface-card border border-amber-500/20 text-xs space-y-1.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-amber-300 font-sans">
                      {rev.label}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
                      Ch {rev.revealedAtChapter} • {rev.category}
                    </span>
                  </div>

                  <p className="text-ink-ash text-[11px] leading-relaxed">
                    {rev.description}
                  </p>

                  {rev.evidenceQuote && (
                    <div className="p-2 rounded bg-surface-void border-l-2 border-amber-500/50 text-ink-bone font-serif text-[11px] leading-relaxed flex items-start gap-1.5">
                      <Quote className="w-3 h-3 text-amber-500/60 shrink-0 mt-0.5" />
                      <span>{rev.evidenceQuote}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Self-Referential Story Records (Excluded from pairwise visual edges) */}
        {selfLoopIssues.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-mono uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              Self-Referential Records ({selfLoopIssues.length})
            </h3>
            <p className="text-[11px] text-ink-ash italic">
              These records represent reflexive internal states or unilateral declarations in the source database. They are tracked on the character rather than as pairwise connections.
            </p>
            <div className="space-y-2">
              {selfLoopIssues.map((issue, idx) => {
                const details = issue.details as any;
                return (
                  <div
                    key={issue.relationshipId || idx}
                    className="p-3 rounded-lg bg-surface-card border border-amber-500/30 text-xs space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-300 font-sans capitalize">
                        {details?.relation ? String(details.relation).replace(/[-_]/g, " ") : "Self-Referential Claim"}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        Ch {details?.sinceChapter ?? 1}
                        {details?.untilChapter ? ` → Ch ${details.untilChapter}` : "+"}
                      </span>
                    </div>

                    {details?.description && (
                      <p className="text-ink-bone text-[11px] leading-relaxed">
                        {details.description}
                      </p>
                    )}

                    {details?.evidenceQuote && (
                      <div className="p-2 rounded bg-surface-void border-l-2 border-amber-500/60 text-ink-parchment font-serif text-[11px] leading-relaxed flex items-start gap-1.5">
                        <Quote className="w-3 h-3 text-amber-500/60 shrink-0 mt-0.5" />
                        <span>{details.evidenceQuote}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Bonds at Chapter N */}
        <div className="space-y-2">
          <h3 className="text-xs font-mono uppercase text-ink-faint tracking-wider flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-wine-accent" />
            Active Bonds ({characterConnections.length})
          </h3>

          {characterConnections.length === 0 ? (
            <p className="text-xs text-ink-faint italic">
              No active relationship bonds at Chapter {currentChapter}.
            </p>
          ) : (
            <div className="space-y-1.5">
              {characterConnections.map((conn) => {
                const otherId =
                  conn.characterAId === node.id ? conn.characterBId : conn.characterAId;
                const otherName =
                  conn.characterAId === node.id ? conn.characterBName : conn.characterAName;

                return (
                  <div
                    key={conn.connectionId}
                    onClick={() => onSelectConnection(conn.connectionId)}
                    className="p-2.5 rounded-md bg-surface-card hover:bg-surface-elevated border border-border-quiet cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-medium text-ink-parchment group-hover:text-wine-accent transition-colors">
                        {otherName}
                      </div>
                      <div className="text-[11px] text-ink-ash">
                        {conn.records.map((r) => r.relation).join(" / ")}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold",
                          conn.visualTone === "friction" && "bg-rose-950/70 text-rose-300 border border-rose-500/30",
                          conn.visualTone === "warmth" && "bg-amber-950/70 text-amber-300 border border-amber-500/30",
                          conn.visualTone === "neutral" && "bg-surface-elevated text-ink-ash border border-border-quiet"
                        )}
                      >
                        {conn.visualTone}
                      </span>
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
