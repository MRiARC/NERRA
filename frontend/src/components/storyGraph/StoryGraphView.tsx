"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  Users,
  Box,
  MapPin,
  Calendar,
  Link2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Network,
  ChevronDown,
} from "lucide-react";
import {
  useCharacters,
  useRelationships,
  useStoryGraph,
  useProject,
} from "@/hooks/useStoryData";
import { cn } from "@/lib/utils";
import type {
  StoryGraphData,
  StoryGraphNode,
  StoryGraphConnection,
  LensMode,
} from "@/lib/storyGraph/types";
import { transformStoryGraph } from "@/lib/storyGraph/transform";
import { StoryGraphCanvas } from "./StoryGraphCanvas";
import { EntityInspector } from "./EntityInspector";
import { ConnectionInspector } from "./ConnectionInspector";
import { ChapterScrubber, type ChapterMilestone } from "./ChapterScrubber";
import type { RawCharacter, RawRelationship, NarrativeThreadLink } from "@/lib/characterNetwork/types";

export interface StoryGraphViewProps {
  projectId: string;
  initialChapter?: number;
  initialLens?: LensMode;
  viewMode?: "network" | "cast";
  onToggleViewMode?: () => void;
}

export function StoryGraphView({
  projectId,
  initialChapter = 20,
  initialLens = "cast",
  viewMode = "network",
  onToggleViewMode,
}: StoryGraphViewProps) {
  const [currentChapter, setCurrentChapter] = useState(initialChapter);
  const [lensMode, setLensMode] = useState<LensMode>(initialLens);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toneFilter, setToneFilter] = useState("all");
  const [connectionLayer, setConnectionLayer] = useState<"all" | "bonds" | "threads">("all");
  const [showSelfLoopsModal, setShowSelfLoopsModal] = useState(false);

  // Project metadata
  const { data: project } = useProject(projectId);

  // Live entity queries
  const { data: liveCharacters, isLoading: isLoadingChars, isError: isErrorChars } =
    useCharacters(projectId);
  const { data: liveRelationships, isLoading: isLoadingRels, isError: isErrorRels } =
    useRelationships(projectId);
  const { data: storyGraph } = useStoryGraph(projectId);

  // Normalize raw characters
  const rawCharacters = useMemo<RawCharacter[]>(() => {
    if (!liveCharacters || liveCharacters.length === 0) return [];
    return liveCharacters.map((c) => ({
      id: c.id,
      name: c.name,
      status: (c.status || "alive").toLowerCase(),
      first_chapter: c.first_chapter || 1,
      last_chapter: c.last_chapter ?? null,
      aliases: c.aliases || [],
      physical_traits: (c.physical_traits as Record<string, unknown>) || {},
      description: c.description || "",
    }));
  }, [liveCharacters]);

  // Normalize raw relationships
  const rawRelationships = useMemo<RawRelationship[]>(() => {
    if (!liveRelationships || liveRelationships.length === 0) return [];
    return liveRelationships.map((r) => ({
      id: r.id,
      character_a_id: r.character_a_id,
      character_b_id: r.character_b_id,
      type: r.type || "connected",
      sentiment: r.sentiment || "neutral",
      chapter: r.chapter || 1,
      until_chapter: r.until_chapter ?? null,
      evidence_quote: r.evidence_quote ?? null,
      description: r.description ?? null,
    }));
  }, [liveRelationships]);

  // Normalize narrative threads
  const rawNarrativeThreads = useMemo<NarrativeThreadLink[]>(() => {
    if (!storyGraph?.narrative_threads) return [];
    return storyGraph.narrative_threads.map((t) => ({
      id: t.id,
      characterAId: t.character_a_id,
      characterBId: t.character_b_id,
      characterAName: t.character_a_name,
      characterBName: t.character_b_name,
      threadId: t.thread_id,
      threadTitle: t.thread_title,
      status: t.status,
      setupChapter: t.setup_chapter || 1,
      payoffChapter: t.payoff_chapter ?? null,
    }));
  }, [storyGraph]);

  // Dynamic Story Milestones
  const dynamicMilestones = useMemo<ChapterMilestone[]>(() => {
    const milestoneMap = new Map<number, ChapterMilestone>();

    for (const c of rawCharacters) {
      const ch = c.first_chapter || 1;
      if (!milestoneMap.has(ch)) {
        milestoneMap.set(ch, {
          chapter: ch,
          label: `${c.name} Enters`,
          shortTag: `Ch ${ch}`,
          description: `${c.name} appears in Chapter ${ch}.`,
        });
      }
    }

    for (const r of rawRelationships) {
      const ch = r.chapter;
      const typeLower = (r.type || "").toLowerCase();
      const descLower = (r.description || "").toLowerCase();

      const isMajor =
        r.character_a_id === r.character_b_id ||
        typeLower.includes("revelation") ||
        typeLower.includes("truth") ||
        typeLower.includes("sacrific") ||
        descLower.includes("revealed") ||
        descLower.includes("sacrifice");

      if (isMajor) {
        const summary = r.description
          ? r.description.split(/[.;:]/)[0].trim()
          : r.type;
        milestoneMap.set(ch, {
          chapter: ch,
          label: summary.length > 32 ? summary.slice(0, 29) + "..." : summary,
          shortTag: `Ch ${ch}`,
          description: r.description || summary,
        });
      }
    }

    return Array.from(milestoneMap.values()).sort((a, b) => a.chapter - b.chapter);
  }, [rawCharacters, rawRelationships]);

  // Compute chapter-scoped Story Graph
  const graphData = useMemo<StoryGraphData>(() => {
    return transformStoryGraph({
      projectId,
      characters: rawCharacters,
      relationships: rawRelationships,
      storyGraph,
      narrativeThreads: rawNarrativeThreads,
      chapter: currentChapter,
      lensMode,
      connectionLayer,
    });
  }, [
    projectId,
    rawCharacters,
    rawRelationships,
    storyGraph,
    rawNarrativeThreads,
    currentChapter,
    lensMode,
    connectionLayer,
  ]);

  // Selected Node / Connection
  const activeNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return graphData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [graphData.nodes, selectedNodeId]);

  const activeConnection = useMemo(() => {
    if (!selectedConnectionId) return null;
    return (
      graphData.connections.find((c) => c.connectionId === selectedConnectionId) || null
    );
  }, [graphData.connections, selectedConnectionId]);

  // Deselect node/connection if it drops out of the scrubbed chapter
  React.useEffect(() => {
    if (selectedNodeId && !graphData.nodes.some((n) => n.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
    if (
      selectedConnectionId &&
      !graphData.connections.some((c) => c.connectionId === selectedConnectionId)
    ) {
      setSelectedConnectionId(null);
    }
  }, [graphData, selectedNodeId, selectedConnectionId]);

  const isLoading = isLoadingChars && isLoadingRels;
  const isError = isErrorChars && isErrorRels && rawCharacters.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-surface-void text-ink-parchment overflow-hidden select-none">
      {/* Tier 1: Editorial Masthead */}
      <header className="border-b border-border-quiet bg-surface-subtle/90 backdrop-blur-md px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 z-10 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-mono text-[9px] sm:text-[9.5px] uppercase tracking-[0.22em] text-ink-ash">
            <span className="w-1.5 h-1.5 rounded-full bg-wine-crimson shadow-[0_0_8px_rgba(153,27,27,0.5)] shrink-0" />
            <span className="truncate">Story World · World & Cast Network</span>
            {project?.title && (
              <>
                <span className="text-border-subtle hidden xs:inline">/</span>
                <span className="text-ink-faint truncate max-w-[140px] sm:max-w-xs hidden xs:inline">
                  {project.title}
                </span>
              </>
            )}
          </div>
          <h1 className="mt-0.5 font-serif text-base sm:text-xl font-medium tracking-tight text-ink-parchment flex items-baseline gap-2.5 flex-wrap">
            <span>World & Cast Network</span>
            <span className="font-serif text-xs italic font-normal text-ink-ash truncate">
              Ch {currentChapter} of {graphData.metadata.maxChapter}
            </span>
          </h1>
        </div>

        {/* Dossier Record & Actions */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Dossier Record Ledger Tile */}
          <div className="flex items-center divide-x divide-border-quiet/80 rounded-xl border border-border-quiet/80 bg-surface-card/60 px-3 py-1 shadow-xs">
            <div className="pr-2.5 sm:pr-3 flex flex-col items-center">
              <span className="font-serif text-sm sm:text-base tabular-nums font-medium text-ink-parchment leading-tight">
                {graphData.metadata.introducedCharactersCount}
              </span>
              <span className="font-mono text-[8px] sm:text-[8.5px] uppercase tracking-[0.16em] text-ink-faint">
                Cast
              </span>
            </div>

            {lensMode !== "cast" && (
              <>
                <div className="px-2.5 sm:px-3 flex flex-col items-center">
                  <span className="font-serif text-sm sm:text-base tabular-nums font-medium text-amber-400 leading-tight">
                    {graphData.metadata.introducedObjectsCount}
                  </span>
                  <span className="font-mono text-[8px] sm:text-[8.5px] uppercase tracking-[0.16em] text-ink-faint">
                    Relics
                  </span>
                </div>
                <div className="px-2.5 sm:px-3 flex flex-col items-center">
                  <span className="font-serif text-sm sm:text-base tabular-nums font-medium text-emerald-400 leading-tight">
                    {graphData.metadata.introducedLocationsCount}
                  </span>
                  <span className="font-mono text-[8px] sm:text-[8.5px] uppercase tracking-[0.16em] text-ink-faint">
                    Places
                  </span>
                </div>
              </>
            )}

            <div className="px-2.5 sm:px-3 flex flex-col items-center">
              <span className="font-serif text-sm sm:text-base tabular-nums font-medium text-sky-400 leading-tight">
                {graphData.metadata.activeRelationshipsCount}
              </span>
              <span className="font-mono text-[8px] sm:text-[8.5px] uppercase tracking-[0.16em] text-ink-faint">
                Bonds
              </span>
            </div>

            <div className="pl-2.5 sm:pl-3 flex flex-col items-center">
              <span className="font-serif text-sm sm:text-base tabular-nums font-medium text-cyan-400 leading-tight">
                {graphData.metadata.activeNarrativeThreadsCount}
              </span>
              <span className="font-mono text-[8px] sm:text-[8.5px] uppercase tracking-[0.16em] text-ink-faint">
                Threads
              </span>
            </div>
          </div>

          {/* Self-Loops Audit Pill */}
          {graphData.metadata.excludedSelfLoopsCount > 0 && (
            <button
              onClick={() => setShowSelfLoopsModal(true)}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors text-xs font-mono"
              title="Click to view self-referential records audited for this chapter"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Self-Loops:</span>
              <span>{graphData.metadata.excludedSelfLoopsCount}</span>
            </button>
          )}

          {/* Integrated View Switcher */}
          {onToggleViewMode && (
            <div className="flex items-center p-0.5 rounded-lg border border-border-quiet bg-surface-field text-[11px] font-mono">
              <button
                onClick={() => viewMode !== "network" && onToggleViewMode()}
                className={cn(
                  "flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md transition-all",
                  viewMode === "network"
                    ? "bg-surface-elevated text-ink-parchment font-medium shadow-xs border border-border-subtle"
                    : "text-ink-ash hover:text-ink-parchment"
                )}
              >
                <Network className="w-3.5 h-3.5 text-wine-accent" />
                <span className="hidden sm:inline">Network</span>
              </button>
              <button
                onClick={() => viewMode !== "cast" && onToggleViewMode()}
                className={cn(
                  "flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md transition-all",
                  viewMode === "cast"
                    ? "bg-surface-elevated text-ink-parchment font-medium shadow-xs border border-border-subtle"
                    : "text-ink-ash hover:text-ink-parchment"
                )}
              >
                <Users className="w-3.5 h-3.5 text-ink-ash" />
                <span className="hidden sm:inline">Cast</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Tier 2: Contextual Filter & Lens Ribbon */}
      <div className="px-4 sm:px-6 py-1.5 min-h-10 border-b border-border-quiet/80 bg-surface-void/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0 z-10">
        {/* Left: Lens Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Entity Lens Mode Selector */}
          <div className="flex items-center rounded-lg bg-surface-field border border-border-quiet/80 p-0.5 text-[11px] font-mono shrink-0">
            <button
              onClick={() => setLensMode("cast")}
              className={cn(
                "px-2 sm:px-2.5 py-0.5 rounded-md transition-all text-[11px]",
                lensMode === "cast"
                  ? "bg-surface-card text-ink-parchment font-medium shadow-xs border border-border-subtle"
                  : "text-ink-ash hover:text-ink-parchment"
              )}
              title="Cast & Interpersonal Bonds"
            >
              Cast & Bonds
            </button>
            <button
              onClick={() => setLensMode("relics")}
              className={cn(
                "px-2 sm:px-2.5 py-0.5 rounded-md transition-all text-[11px]",
                lensMode === "relics"
                  ? "bg-amber-950/40 text-amber-300 font-medium shadow-xs border border-amber-500/30"
                  : "text-ink-ash hover:text-ink-parchment"
              )}
              title="Artifacts & Relic Custody"
            >
              Relics
            </button>
            <button
              onClick={() => setLensMode("geography")}
              className={cn(
                "px-2 sm:px-2.5 py-0.5 rounded-md transition-all text-[11px]",
                lensMode === "geography"
                  ? "bg-teal-950/40 text-teal-300 font-medium shadow-xs border border-teal-500/30"
                  : "text-ink-ash hover:text-ink-parchment"
              )}
              title="Settings & Geography"
            >
              Places
            </button>
            <button
              onClick={() => setLensMode("full")}
              className={cn(
                "px-2 sm:px-2.5 py-0.5 rounded-md transition-all text-[11px]",
                lensMode === "full"
                  ? "bg-wine-accent/20 text-wine-accent font-medium shadow-xs border border-wine-accent/40"
                  : "text-ink-ash hover:text-ink-parchment"
              )}
              title="Complete Macro Story World Mesh"
            >
              Full Web
            </button>
          </div>

          <div className="h-4 w-px bg-border-quiet hidden sm:block" />

          {/* Search Input */}
          <div className="relative w-36 sm:w-48 shrink">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
            <input
              type="text"
              placeholder="Search entities…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-7 pl-8 pr-6 text-xs rounded-lg bg-surface-field border border-border-quiet/80 text-ink-parchment placeholder-ink-faint focus:outline-none focus:border-border-prominent font-sans transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-faint hover:text-ink-parchment"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none h-7 pl-2.5 pr-6 text-[11px] rounded-lg bg-surface-field border border-border-quiet/80 text-ink-bone hover:border-border-prominent focus:outline-none focus:border-border-prominent font-mono cursor-pointer transition-colors"
            >
              <option value="all">Status: All</option>
              <option value="alive">Alive</option>
              <option value="deceased">Deceased</option>
              <option value="incapacitated">Incapacitated</option>
              <option value="unknown">Unknown</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          </div>

          {/* Tone Filter */}
          <div className="relative shrink-0">
            <select
              value={toneFilter}
              onChange={(e) => setToneFilter(e.target.value)}
              className="appearance-none h-7 pl-2.5 pr-6 text-[11px] rounded-lg bg-surface-field border border-border-quiet/80 text-ink-bone hover:border-border-prominent focus:outline-none focus:border-border-prominent font-mono cursor-pointer transition-colors"
            >
              <option value="all">Tone: All</option>
              <option value="friction">Friction</option>
              <option value="warmth">Warmth</option>
              <option value="neutral">Neutral</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          </div>

          {/* Connection Layer (All / Bonds / Threads) */}
          <div className="flex items-center rounded-lg bg-surface-field border border-border-quiet/80 p-0.5 text-[11px] font-mono shrink-0">
            <button
              onClick={() => setConnectionLayer("all")}
              className={cn(
                "px-2 sm:px-2.5 py-0.5 rounded-md transition-all text-[11px]",
                connectionLayer === "all"
                  ? "bg-surface-card text-ink-parchment font-medium shadow-xs border border-border-subtle"
                  : "text-ink-ash hover:text-ink-parchment"
              )}
            >
              All
            </button>
            <button
              onClick={() => setConnectionLayer("bonds")}
              className={cn(
                "px-2 sm:px-2.5 py-0.5 rounded-md transition-all text-[11px]",
                connectionLayer === "bonds"
                  ? "bg-sky-950/40 text-sky-300 font-medium shadow-xs border border-sky-500/30"
                  : "text-ink-ash hover:text-ink-parchment"
              )}
            >
              Bonds
            </button>
            <button
              onClick={() => setConnectionLayer("threads")}
              className={cn(
                "px-2 sm:px-2.5 py-0.5 rounded-md transition-all text-[11px]",
                connectionLayer === "threads"
                  ? "bg-cyan-950/40 text-cyan-300 font-medium shadow-xs border border-cyan-500/30"
                  : "text-ink-ash hover:text-ink-parchment"
              )}
            >
              Threads
            </button>
          </div>
        </div>

        {/* Right: Discrete Visual Guide */}
        <div className="hidden xl:flex items-center gap-3 text-[10px] font-mono text-ink-ash shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-ink-faint uppercase tracking-wider text-[9px]">Entities:</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Cast
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Relic
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Place
            </span>
          </div>
          <div className="h-3 w-px bg-border-quiet" />
          <div className="flex items-center gap-2">
            <span className="text-ink-faint uppercase tracking-wider text-[9px]">Tones:</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Friction
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Warmth
            </span>
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-surface-void/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-wine-accent border-t-transparent animate-spin" />
              <p className="text-xs font-mono text-ink-ash">
                Loading World & Cast Network for Chapter {currentChapter}...
              </p>
            </div>
          </div>
        )}

        {/* Interactive G6 Canvas */}
        <main className="flex-1 h-full overflow-hidden relative">
          {graphData.nodes.length === 0 && !isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="p-6 rounded-2xl bg-surface-card border border-border-quiet shadow-xl max-w-md space-y-3">
                <div className="w-12 h-12 rounded-xl bg-wine-accent/10 border border-wine-accent/30 text-wine-accent flex items-center justify-center mx-auto">
                  <Network className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-ink-parchment text-base">
                  No Entities Active Yet
                </h3>
                <p className="text-xs text-ink-ash leading-relaxed">
                  Characters, relics, and settings introduced by Chapter {currentChapter} will form an interactive constellation here.
                </p>
              </div>
            </div>
          ) : (
            <StoryGraphCanvas
              graphData={graphData}
              selectedNodeId={selectedNodeId}
              selectedConnectionId={selectedConnectionId}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              toneFilter={toneFilter}
              onSelectNode={(nodeId) => {
                setSelectedNodeId(nodeId);
                setSelectedConnectionId(null);
              }}
              onSelectConnection={(connId) => {
                setSelectedConnectionId(connId);
                setSelectedNodeId(null);
              }}
            />
          )}
        </main>

        {/* Side Entity Dossier Inspector Drawer */}
        {activeNode && (
          <EntityInspector
            node={activeNode}
            connections={graphData.connections}
            currentChapter={currentChapter}
            onClose={() => setSelectedNodeId(null)}
            onSelectConnection={(connId) => {
              setSelectedNodeId(null);
              setSelectedConnectionId(connId);
            }}
            onSelectEntity={(entityId) => {
              setSelectedConnectionId(null);
              setSelectedNodeId(entityId);
            }}
          />
        )}

        {/* Side Connection Link Inspector Drawer */}
        {activeConnection && !activeNode && (
          <ConnectionInspector
            connection={activeConnection}
            currentChapter={currentChapter}
            onClose={() => setSelectedConnectionId(null)}
            onSelectEntity={(entityId) => {
              setSelectedConnectionId(null);
              setSelectedNodeId(entityId);
            }}
          />
        )}
      </div>

      {/* Chapter Scrubber Footer */}
      <footer className="shrink-0 z-20">
        <ChapterScrubber
          currentChapter={currentChapter}
          onChapterChange={(ch) => {
            setCurrentChapter(ch);
            if (activeNode && activeNode.firstChapter > ch) {
              setSelectedNodeId(null);
            }
          }}
          minChapter={graphData.metadata.minChapter}
          maxChapter={graphData.metadata.maxChapter}
          introducedCount={graphData.metadata.introducedCharactersCount}
          activeRelsCount={graphData.metadata.activeRelationshipsCount}
          activeThreadsCount={graphData.metadata.activeNarrativeThreadsCount}
          totalCharacters={rawCharacters.length}
          milestones={dynamicMilestones}
        />
      </footer>
    </div>
  );
}
