"use client";

import React, { useMemo, useState } from "react";
import {
  Network,
  Users,
  Box,
  MapPin,
  Calendar,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StoryGraphCanvas } from "@/components/storyGraph/StoryGraphCanvas";
import type { StoryGraphData, LensMode } from "@/lib/storyGraph/types";

export const MOCK_STORY_GRAPH_DATA: StoryGraphData = {
  nodes: [
    {
      id: "char:marcus",
      rawId: "marcus",
      name: "Marcus Vance",
      kind: "character",
      firstChapter: 1,
      lastChapter: 4,
      visualColor: "#10b981",
      visualBadge: "ALIVE",
      state: {
        status: "alive",
        condition: "Apprentice",
        aliases: ["Apprentice Vance"],
        description: "Sole surviving apprentice alchemist bearing Master Aldous's brass formula.",
      },
    },
    {
      id: "char:sarah",
      rawId: "sarah",
      name: "Sarah Coyle",
      kind: "character",
      firstChapter: 2,
      lastChapter: 4,
      visualColor: "#10b981",
      visualBadge: "ALIVE",
      state: {
        status: "alive",
        condition: "Infiltrator",
        aliases: ["The Shadow"],
        description: "Guard's daughter who infiltrated the lower Citadel vaults seeking evidence of poison.",
      },
    },
    {
      id: "char:vane",
      rawId: "vane",
      name: "Chancellor Vane",
      kind: "character",
      firstChapter: 2,
      lastChapter: 3,
      visualColor: "#10b981",
      visualBadge: "ALIVE",
      state: {
        status: "alive",
        condition: "High Councilor",
        aliases: ["Lord Treasurer"],
        description: "Master of Council Treasury running Dover smuggling syndicate.",
      },
    },
    {
      id: "char:lysander",
      rawId: "lysander",
      name: "Captain Lysander",
      kind: "character",
      firstChapter: 2,
      lastChapter: 4,
      visualColor: "#10b981",
      visualBadge: "ALIVE",
      state: {
        status: "alive",
        condition: "Commander",
        aliases: ["Dover Mastiff"],
        description: "Commandant of Dover naval patrol tracking Marcus under imperial treason warrants.",
      },
    },
    {
      id: "obj:compass",
      rawId: "compass",
      name: "Obsidian Compass",
      kind: "object",
      firstChapter: 1,
      lastChapter: 4,
      visualColor: "#f59e0b",
      visualBadge: "RELIC",
      state: {
        status: "impounded",
        condition: "Sealed",
        aliases: ["Lodestone Dial"],
        description: "Alchemical relic impounded in Citadel Vault register #409 in Chapter 3.",
      },
    },
    {
      id: "obj:testament",
      rawId: "testament",
      name: "Brass Testament",
      kind: "object",
      firstChapter: 1,
      lastChapter: 4,
      visualColor: "#f59e0b",
      visualBadge: "RELIC",
      state: {
        status: "carried",
        condition: "Sealed",
        aliases: ["Double Ouroboros Parchment"],
        description: "Formula parchment sealed with imperial red wax.",
      },
    },
    {
      id: "loc:citadel",
      rawId: "citadel",
      name: "Prague Citadel",
      kind: "location",
      firstChapter: 1,
      lastChapter: 4,
      visualColor: "#059669",
      visualBadge: "SETTING",
      state: {
        status: "active",
        condition: "Fortress",
        aliases: ["Grand Council Seat"],
        description: "High fortress containing Vault #409 and banquet hall.",
      },
    },
    {
      id: "loc:dover",
      rawId: "dover",
      name: "Dover Anchorage",
      kind: "location",
      firstChapter: 2,
      lastChapter: 4,
      visualColor: "#059669",
      visualBadge: "SETTING",
      state: {
        status: "active",
        condition: "Harbor",
        aliases: ["South Jetty"],
        description: "Naval patrol base and smuggling loading point.",
      },
    },
  ],
  connections: [
    {
      connectionId: "marcus--sarah",
      sourceId: "char:marcus",
      targetId: "char:sarah",
      sourceName: "Marcus Vance",
      targetName: "Sarah Coyle",
      sourceKind: "character",
      targetKind: "character",
      connectionTypes: ["interpersonal"],
      visualTone: "warmth",
      isReciprocal: true,
      sinceChapter: 2,
      untilChapter: null,
      records: [
        {
          id: "rec-1",
          source: "char:marcus",
          target: "char:sarah",
          relation: "Allies",
          tone: "warmth",
          sinceChapter: 2,
          untilChapter: null,
          description: "Sarah aids Marcus in evading the Dover patrol.",
        },
      ],
    },
    {
      connectionId: "marcus--lysander",
      sourceId: "char:marcus",
      targetId: "char:lysander",
      sourceName: "Marcus Vance",
      targetName: "Captain Lysander",
      sourceKind: "character",
      targetKind: "character",
      connectionTypes: ["interpersonal"],
      visualTone: "friction",
      isReciprocal: false,
      sinceChapter: 2,
      untilChapter: null,
      records: [
        {
          id: "rec-2",
          source: "char:marcus",
          target: "char:lysander",
          relation: "Hunted By",
          tone: "friction",
          sinceChapter: 2,
          untilChapter: null,
          description: "Lysander carries imperial arrest warrant for Marcus.",
        },
      ],
    },
    {
      connectionId: "vane--lysander",
      sourceId: "char:vane",
      targetId: "char:lysander",
      sourceName: "Chancellor Vane",
      targetName: "Captain Lysander",
      sourceKind: "character",
      targetKind: "character",
      connectionTypes: ["interpersonal"],
      visualTone: "friction",
      isReciprocal: false,
      sinceChapter: 2,
      untilChapter: null,
      records: [
        {
          id: "rec-3",
          source: "char:vane",
          target: "char:lysander",
          relation: "Syndicate Collusion",
          tone: "friction",
          sinceChapter: 2,
          untilChapter: null,
          description: "Vane instructs Lysander to seize contraband relics.",
        },
      ],
    },
    {
      connectionId: "marcus--obj:testament",
      sourceId: "char:marcus",
      targetId: "obj:testament",
      sourceName: "Marcus Vance",
      targetName: "Brass Testament",
      sourceKind: "character",
      targetKind: "object",
      connectionTypes: ["custody"],
      visualTone: "warmth",
      isReciprocal: false,
      sinceChapter: 1,
      untilChapter: null,
      records: [
        {
          id: "rec-4",
          source: "char:marcus",
          target: "obj:testament",
          relation: "Custodian",
          tone: "warmth",
          sinceChapter: 1,
          untilChapter: null,
          description: "Marcus carries the alchemical cipher in his coat.",
        },
      ],
    },
    {
      connectionId: "lysander--obj:compass",
      sourceId: "char:lysander",
      targetId: "obj:compass",
      sourceName: "Captain Lysander",
      targetName: "Obsidian Compass",
      sourceKind: "character",
      targetKind: "object",
      connectionTypes: ["custody"],
      visualTone: "warmth",
      isReciprocal: false,
      sinceChapter: 3,
      untilChapter: null,
      records: [
        {
          id: "rec-5",
          source: "char:lysander",
          target: "obj:compass",
          relation: "Impounded in Vault 409",
          tone: "warmth",
          sinceChapter: 3,
          untilChapter: null,
          description: "Lysander signed register #409 locking the compass.",
        },
      ],
    },
    {
      connectionId: "marcus--obj:compass",
      sourceId: "char:marcus",
      targetId: "obj:compass",
      sourceName: "Marcus Vance",
      targetName: "Obsidian Compass",
      sourceKind: "character",
      targetKind: "object",
      connectionTypes: ["custody", "narrative_thread"],
      visualTone: "friction",
      isReciprocal: false,
      sinceChapter: 4,
      untilChapter: null,
      records: [
        {
          id: "rec-6",
          source: "char:marcus",
          target: "obj:compass",
          relation: "Contested Custody Paradox",
          tone: "friction",
          sinceChapter: 4,
          untilChapter: null,
          description: "Marcus withdraws compass with zero transfers from Vault #409.",
        },
      ],
    },
    {
      connectionId: "sarah--loc:citadel",
      sourceId: "char:sarah",
      targetId: "loc:citadel",
      sourceName: "Sarah Coyle",
      targetName: "Prague Citadel",
      sourceKind: "character",
      targetKind: "location",
      connectionTypes: ["spatial"],
      visualTone: "neutral",
      isReciprocal: false,
      sinceChapter: 2,
      untilChapter: null,
      records: [
        {
          id: "rec-7",
          source: "char:sarah",
          target: "loc:citadel",
          relation: "Vault Infiltration",
          tone: "neutral",
          sinceChapter: 2,
          untilChapter: null,
          description: "Infiltrated lower gate using stolen brass key.",
        },
      ],
    },
    {
      connectionId: "lysander--loc:dover",
      sourceId: "char:lysander",
      targetId: "loc:dover",
      sourceName: "Captain Lysander",
      targetName: "Dover Anchorage",
      sourceKind: "character",
      targetKind: "location",
      connectionTypes: ["spatial"],
      visualTone: "neutral",
      isReciprocal: false,
      sinceChapter: 2,
      untilChapter: null,
      records: [
        {
          id: "rec-8",
          source: "char:lysander",
          target: "loc:dover",
          relation: "Harbor Patrol Command",
          tone: "neutral",
          sinceChapter: 2,
          untilChapter: null,
          description: "Inspected manifests at Dover Anchorage in 1888.",
        },
      ],
    },
  ],
  metadata: {
    projectId: "story-1",
    currentChapter: 4,
    minChapter: 1,
    maxChapter: 4,
    totalCharactersCount: 4,
    introducedCharactersCount: 4,
    totalObjectsCount: 2,
    introducedObjectsCount: 2,
    totalLocationsCount: 2,
    introducedLocationsCount: 2,
    activeRelationshipsCount: 8,
    activeNarrativeThreadsCount: 1,
    activeCustodyCount: 2,
    activeSpatialCount: 2,
    excludedSelfLoopsCount: 0,
    lensMode: "full",
  },
};

export function GraphView() {
  const [lensMode, setLensMode] = useState<LensMode>("full");
  const [currentChapter, setCurrentChapter] = useState(4);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("char:marcus");
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter G6 graph data by lens mode & chapter
  const scopedGraphData = useMemo<StoryGraphData>(() => {
    const nodes = MOCK_STORY_GRAPH_DATA.nodes.filter((node) => {
      if (node.firstChapter > currentChapter) return false;
      if (lensMode === "cast" && node.kind !== "character") return false;
      if (lensMode === "relics" && node.kind !== "object") return false;
      if (lensMode === "geography" && node.kind !== "location") return false;
      if (searchQuery && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    const nodeIds = new Set(nodes.map((n) => n.id));
    const connections = MOCK_STORY_GRAPH_DATA.connections.filter(
      (conn) =>
        nodeIds.has(conn.sourceId) &&
        nodeIds.has(conn.targetId) &&
        conn.sinceChapter <= currentChapter
    );

    return {
      nodes,
      connections,
      metadata: {
        ...MOCK_STORY_GRAPH_DATA.metadata,
        currentChapter,
        activeRelationshipsCount: connections.length,
        lensMode,
      },
    };
  }, [lensMode, currentChapter, searchQuery]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return MOCK_STORY_GRAPH_DATA.nodes[0];
    return MOCK_STORY_GRAPH_DATA.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-surface-void text-ink-parchment select-none">
      {/* ===================================================================
          TIER 1: Editorial Masthead matching StoryGraphView.tsx
          =================================================================== */}
      <header className="px-3 sm:px-4 py-2 border-b border-border-quiet/80 bg-surface-void flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div>
          <div className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-wider text-ink-faint">
            <span className="flex items-center gap-1 text-wine-accent">
              <Network className="w-3 h-3" />
              <span>World &amp; Cast Network</span>
            </span>
            <span>·</span>
            <span>AntV G6 5.x Engine · Ch. 0{currentChapter} State</span>
          </div>
          <h2 className="font-serif text-base sm:text-lg font-medium text-ink-parchment leading-tight mt-0.5">
            Relational Entity Mesh
          </h2>
        </div>

        {/* Dossier Record Ledger Tile */}
        <div className="flex items-center rounded-lg bg-surface-card/60 border border-border-quiet px-2.5 py-1 gap-3 text-[9px] font-mono">
          <div className="text-center">
            <span className="block font-serif text-xs font-semibold text-emerald-400 tabular-nums">4</span>
            <span className="text-[7.5px] uppercase text-ink-faint">Cast</span>
          </div>
          <div className="h-4 w-px bg-border-quiet" />
          <div className="text-center">
            <span className="block font-serif text-xs font-semibold text-amber-300 tabular-nums">2</span>
            <span className="text-[7.5px] uppercase text-ink-faint">Relics</span>
          </div>
          <div className="h-4 w-px bg-border-quiet" />
          <div className="text-center">
            <span className="block font-serif text-xs font-semibold text-sky-400 tabular-nums">2</span>
            <span className="text-[7.5px] uppercase text-ink-faint">Places</span>
          </div>
        </div>
      </header>

      {/* ===================================================================
          TIER 2: Filter & Lens Ribbon matching StoryGraphView.tsx
          =================================================================== */}
      <div className="px-3 sm:px-4 py-1 border-b border-border-quiet/80 bg-surface-subtle/20 flex flex-wrap items-center justify-between gap-2 shrink-0 text-[9px] font-mono">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLensMode("full")}
            className={cn(
              "px-2 py-0.5 rounded transition-all",
              lensMode === "full"
                ? "bg-surface-elevated text-ink-parchment font-semibold border border-border-subtle"
                : "text-ink-ash hover:text-ink-parchment"
            )}
          >
            Full Web
          </button>
          <button
            type="button"
            onClick={() => setLensMode("cast")}
            className={cn(
              "px-2 py-0.5 rounded transition-all",
              lensMode === "cast"
                ? "bg-emerald-950/40 text-emerald-300 font-semibold border border-emerald-500/30"
                : "text-ink-ash hover:text-ink-parchment"
            )}
          >
            Cast &amp; Bonds
          </button>
          <button
            type="button"
            onClick={() => setLensMode("relics")}
            className={cn(
              "px-2 py-0.5 rounded transition-all",
              lensMode === "relics"
                ? "bg-amber-950/40 text-amber-300 font-semibold border border-amber-500/30"
                : "text-ink-ash hover:text-ink-parchment"
            )}
          >
            Relics &amp; Custody
          </button>
          <button
            type="button"
            onClick={() => setLensMode("geography")}
            className={cn(
              "px-2 py-0.5 rounded transition-all",
              lensMode === "geography"
                ? "bg-sky-950/40 text-sky-300 font-semibold border border-sky-500/30"
                : "text-ink-ash hover:text-ink-parchment"
            )}
          >
            Settings
          </button>
        </div>

        {/* Chronometer Scrubber */}
        <div className="flex items-center gap-1.5">
          <Calendar className="w-2.5 h-2.5 text-wine-accent" />
          <span className="text-ink-faint">Chronometer:</span>
          <div className="flex items-center gap-0.5 bg-surface-card rounded p-0.5 border border-border-quiet">
            {[1, 2, 3, 4].map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setCurrentChapter(ch)}
                className={cn(
                  "px-1.5 py-0.2 rounded text-[8.5px] font-semibold transition-all",
                  currentChapter === ch
                    ? "bg-wine-accent text-white"
                    : "text-ink-faint hover:text-ink-bone"
                )}
              >
                Ch {ch}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===================================================================
          CANVAS AREA: G6 Graph Canvas + Entity Inspector
          =================================================================== */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* AntV G6 Canvas Viewport */}
        <div className="flex-1 h-full min-h-0 relative overflow-hidden bg-surface-void">
          <StoryGraphCanvas
            graphData={scopedGraphData}
            selectedNodeId={selectedNodeId}
            selectedConnectionId={selectedConnectionId}
            searchQuery={searchQuery}
            statusFilter="all"
            toneFilter="all"
            onSelectNode={(id) => {
              setSelectedNodeId(id);
              setSelectedConnectionId(null);
            }}
            onSelectConnection={(id) => {
              setSelectedConnectionId(id);
            }}
          />

          <div className="absolute bottom-1.5 left-2 font-mono text-[7.5px] uppercase tracking-wider text-ink-faint pointer-events-none z-10">
            ✦ AntV G6 5.x d3-force physics · Drag nodes · Scroll to zoom
          </div>
        </div>

        {/* Entity Inspector Side Panel matching EntityInspector.tsx */}
        {selectedNode && (
          <aside className="w-56 sm:w-60 shrink-0 border-l border-border-quiet/80 bg-surface-card/40 p-2.5 flex flex-col justify-between overflow-y-auto z-20">
            <div className="space-y-2.5">
              <div className="pb-1.5 border-b border-border-quiet/60">
                <span className="font-mono text-[7.5px] uppercase tracking-wider text-wine-accent block">
                  Entity Dossier
                </span>
                <h4 className="font-serif text-sm font-medium text-ink-parchment mt-0.5">
                  {selectedNode.name}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[8px] uppercase tracking-wider">
                  <span
                    className={cn(
                      "px-1 rounded text-[7px] font-semibold",
                      selectedNode.kind === "character"
                        ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                        : selectedNode.kind === "object"
                        ? "bg-amber-950/60 text-amber-300 border border-amber-500/30"
                        : "bg-sky-950/60 text-sky-300 border border-sky-500/30"
                    )}
                  >
                    {selectedNode.visualBadge}
                  </span>
                  <span className="text-ink-ash">{selectedNode.kind}</span>
                </div>
              </div>

              <div>
                <span className="font-mono text-[7.5px] uppercase tracking-wider text-ink-faint block mb-0.5">
                  Condition &amp; Role:
                </span>
                <p className="font-serif italic text-ink-bone text-[10.5px] leading-snug">
                  {selectedNode.state.condition}
                </p>
              </div>

              <div className="rounded bg-surface-subtle p-2 border border-border-quiet/60 font-mono text-[8.5px]">
                <span className="text-[7.5px] uppercase text-ink-faint block">Temporal Range</span>
                <span className="text-ink-parchment block mt-0.5">
                  Active Ch. {selectedNode.firstChapter} &rarr; Ch. {selectedNode.lastChapter ?? "Open"}
                </span>
              </div>

              <div>
                <span className="font-mono text-[7.5px] uppercase tracking-wider text-ink-faint block mb-0.5">
                  Canon Provenance:
                </span>
                <p className="font-sans text-[9.5px] text-ink-ash leading-relaxed">
                  {selectedNode.state.description}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-border-quiet/60 font-mono text-[7.5px] text-ink-faint uppercase">
              Scale-Invariant Network Mesh
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
