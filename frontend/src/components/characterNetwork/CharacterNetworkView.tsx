"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  Filter,
  Users,
  Link2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Sparkles,
  X,
  Network,
  ChevronDown,
} from "lucide-react";
import { useCharacters, useRelationships, useStoryGraph, useProject } from "@/hooks/useStoryData";
import { cn } from "@/lib/utils";
import type {
  CharacterNetworkGraph,
  NarrativeThreadLink,
  RawCharacter,
  RawRelationship,
} from "@/lib/characterNetwork/types";
import { transformCharacterNetwork } from "@/lib/characterNetwork/transform";
import { ChapterScrubber, type ChapterMilestone } from "./ChapterScrubber";
import { CharacterInspector } from "./CharacterInspector";
import { RelationshipInspector } from "./RelationshipInspector";
import { CharacterNetworkCanvas } from "./CharacterNetworkCanvas";

export interface CharacterNetworkViewProps {
  projectId: string;
  initialChapter?: number;
  viewMode?: "network" | "cast";
  onToggleViewMode?: () => void;
}

export function CharacterNetworkView({
  projectId,
  initialChapter = 20,
  viewMode = "network",
  onToggleViewMode,
}: CharacterNetworkViewProps) {
  const [currentChapter, setCurrentChapter] = useState(initialChapter);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toneFilter, setToneFilter] = useState("all");
  const [connectionLayer, setConnectionLayer] = useState<"all" | "bonds" | "threads">("all");
  const [showSelfLoopsModal, setShowSelfLoopsModal] = useState(false);

  // Project metadata for dynamic titles
  const { data: project } = useProject(projectId);

  // Fetch live story entities from FastAPI backend
  const {
    data: liveCharacters,
    isLoading: isLoadingChars,
    isError: isErrorChars,
  } = useCharacters(projectId);

  const {
    data: liveRelationships,
    isLoading: isLoadingRels,
    isError: isErrorRels,
  } = useRelationships(projectId);

  // Fetch Story Knowledge Graph from Neo4j (via FastAPI)
  const {
    data: storyGraph,
    isLoading: isLoadingGraph,
    isError: isErrorGraph,
  } = useStoryGraph(projectId);

  // Normalize live entities purely dynamically without hardcoded fallbacks
  const rawCharacters: RawCharacter[] = useMemo(() => {
    if (!liveCharacters || liveCharacters.length === 0) return [];
    return liveCharacters.map((c: any) => ({
      id: c.id,
      name: c.name,
      status: c.status || "alive",
      first_chapter: c.first_chapter || 1,
      last_chapter: c.last_chapter ?? null,
      aliases: c.aliases || [],
      physical_traits: (c.physical_traits as Record<string, unknown>) || {},
      description: c.description || "",
    }));
  }, [liveCharacters]);

  const rawRelationships: RawRelationship[] = useMemo(() => {
    if (!liveRelationships || liveRelationships.length === 0) return [];
    return liveRelationships.map((r: any) => ({
      id: r.id,
      character_a_id: r.character_a_id,
      character_b_id: r.character_b_id,
      type: r.type,
      sentiment: r.sentiment || "neutral",
      chapter: r.chapter || 1,
      until_chapter: r.until_chapter ?? null,
      evidence_quote: r.evidence_quote ?? null,
      description: r.description ?? null,
    }));
  }, [liveRelationships]);

  // Normalize live narrative threads from Neo4j
  const rawNarrativeThreads: NarrativeThreadLink[] = useMemo(() => {
    if (!storyGraph?.narrative_threads || storyGraph.narrative_threads.length === 0) return [];
    return storyGraph.narrative_threads.map((t: any) => ({
      id: t.id,
      characterAId: t.character_a_id,
      characterBId: t.character_b_id,
      characterAName: t.character_a_name,
      characterBName: t.character_b_name,
      threadId: t.thread_id,
      threadTitle: t.thread_title,
      status: t.status || "active",
      setupChapter: t.setup_chapter || 1,
      payoffChapter: t.payoff_chapter ?? null,
    }));
  }, [storyGraph]);

  // Compute story milestones dynamically from characters and relationship milestones
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
        typeLower.includes("stasis") ||
        descLower.includes("revealed") ||
        descLower.includes("sacrifice") ||
        descLower.includes("stasis");

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

  // Compute chapter-scoped network graph
  const networkGraph: CharacterNetworkGraph = useMemo(() => {
    return transformCharacterNetwork({
      projectId,
      characters: rawCharacters,
      relationships: rawRelationships,
      narrativeThreads: rawNarrativeThreads,
      chapter: currentChapter,
    });
  }, [projectId, rawCharacters, rawRelationships, rawNarrativeThreads, currentChapter]);

  // Filter connections by active connectionLayer ("all" | "bonds" | "threads")
  const displayedGraph = useMemo<CharacterNetworkGraph>(() => {
    if (connectionLayer === "all") return networkGraph;
    const filteredConnections = networkGraph.connections.filter((c) => {
      if (connectionLayer === "bonds") {
        return c.connectionTypes.includes("interpersonal");
      }
      if (connectionLayer === "threads") {
        return c.connectionTypes.includes("narrative_thread");
      }
      return true;
    });
    return {
      ...networkGraph,
      connections: filteredConnections,
    };
  }, [networkGraph, connectionLayer]);

  // Currently inspected node
  const activeNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return networkGraph.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [networkGraph.nodes, selectedNodeId]);

  // Currently inspected visual connection
  const activeConnection = useMemo(() => {
    if (!selectedConnectionId) return null;
    return (
      networkGraph.connections.find(
        (c) => c.connectionId === selectedConnectionId
      ) || null
    );
  }, [networkGraph.connections, selectedConnectionId]);

  // Deselect node/connection if it ceases to exist in the scrubbed chapter
  React.useEffect(() => {
    if (selectedNodeId && !networkGraph.nodes.some((n) => n.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
    if (
      selectedConnectionId &&
      !networkGraph.connections.some((c) => c.connectionId === selectedConnectionId)
    ) {
      setSelectedConnectionId(null);
    }
  }, [networkGraph, selectedNodeId, selectedConnectionId]);

  const isLoading = isLoadingChars && isLoadingRels;
  const isError = isErrorChars && isErrorRels && rawCharacters.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-surface-void text-ink-parchment overflow-hidden select-none">
      {/* Editorial Masthead (Tier 1) */}
      <header className="border-b border-border-quiet bg-surface-subtle/90 backdrop-blur-md px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 z-10 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-mono text-[9px] sm:text-[9.5px] uppercase tracking-[0.22em] text-ink-ash">
            <span className="w-1.5 h-1.5 rounded-full bg-wine-crimson shadow-[0_0_8px_rgba(153,27,27,0.5)] shrink-0" />
            <span className="truncate">Story World · Character Network</span>
            {project?.title && (
              <>
                <span className="text-border-subtle hidden xs:inline">/</span>
                <span className="text-ink-faint truncate max-w-[140px] sm:max-w-xs hidden xs:inline">{project.title}</span>
              </>
            )}
          </div>
          <h1 className="mt-0.5 font-serif text-base sm:text-xl font-medium tracking-tight text-ink-parchment flex items-baseline gap-2.5 flex-wrap">
            <span>Character Constellation</span>
            <span className="font-serif text-xs italic font-normal text-ink-ash truncate">
              Ch {currentChapter} of {networkGraph.metadata.maxChapter}
            </span>
          </h1>
        </div>

        {/* Dossier Record & Actions */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Dossier Record Ledger Tile */}
          <div className="flex items-center divide-x divide-border-quiet/80 rounded-xl border border-border-quiet/80 bg-surface-card/60 px-3 py-1 shadow-xs">
            <div className="pr-2.5 sm:pr-3 flex flex-col items-center">
              <span className="font-serif text-sm sm:text-base tabular-nums font-medium text-ink-parchment leading-tight">
                {networkGraph.metadata.introducedCharactersCount}
              </span>
              <span className="font-mono text-[8px] sm:text-[8.5px] uppercase tracking-[0.16em] text-ink-faint">
                Cast
              </span>
            </div>
            <div className="px-2.5 sm:px-3 flex flex-col items-center">
              <span className="font-serif text-sm sm:text-base tabular-nums font-medium text-sky-400 leading-tight">
                {networkGraph.metadata.activeRelationshipsCount}
              </span>
              <span className="font-mono text-[8px] sm:text-[8.5px] uppercase tracking-[0.16em] text-ink-faint">
                Bonds
              </span>
            </div>
            <div className="pl-2.5 sm:pl-3 flex flex-col items-center">
              <span className="font-serif text-sm sm:text-base tabular-nums font-medium text-cyan-400 leading-tight">
                {networkGraph.metadata.activeNarrativeThreadsCount}
              </span>
              <span className="font-mono text-[8px] sm:text-[8.5px] uppercase tracking-[0.16em] text-ink-faint">
                Threads
              </span>
            </div>
          </div>

          {/* Self-Loops Audit Pill */}
          {networkGraph.metadata.excludedSelfLoopsCount > 0 && (
            <button
              onClick={() => setShowSelfLoopsModal(true)}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors text-xs font-mono"
              title="Click to view self-referential records audited for this chapter"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Self-Loops:</span>
              <span>{networkGraph.metadata.excludedSelfLoopsCount}</span>
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

      {/* Contextual Filter & Query Ribbon (Tier 2) */}
      <div className="px-4 sm:px-6 py-1.5 min-h-10 border-b border-border-quiet/80 bg-surface-void/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0 z-10">
        {/* Left: Filters and Controls */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Search Input */}
          <div className="relative w-36 sm:w-52 shrink">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
            <input
              type="text"
              placeholder="Search characters…"
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
              title="Show all connections"
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
              title="Show direct interpersonal relationship bonds"
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
              title="Show narrative plot thread connections"
            >
              Threads
            </button>
          </div>
        </div>

        {/* Right: Discrete Visual Guide */}
        <div className="hidden lg:flex items-center gap-3 text-[10px] font-mono text-ink-ash shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-ink-faint uppercase tracking-wider text-[9px]">Status:</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Alive</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-zinc-400" /> Deceased</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Stasis</span>
          </div>
          <div className="h-3 w-px bg-border-quiet" />
          <div className="flex items-center gap-2">
            <span className="text-ink-faint uppercase tracking-wider text-[9px]">Tones:</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Friction</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Warmth</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Neutral</span>
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
                Loading character constellation for Chapter {currentChapter}...
              </p>
            </div>
          </div>
        )}

        {/* Error Fallback Notice */}
        {isError && (
          <div className="absolute top-4 right-4 z-20 max-w-sm p-3 rounded-lg bg-rose-950/90 border border-rose-500/40 text-xs text-rose-200">
            <div className="font-semibold mb-1">Backend Connection Notice</div>
            <p className="text-[11px] text-rose-300/90">
              Unable to reach live FastAPI backend.
            </p>
          </div>
        )}

        {/* Interactive G6 Graph Canvas or Empty State */}
        <main className="flex-1 h-full overflow-hidden relative">
          {rawCharacters.length === 0 && !isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="p-6 rounded-2xl bg-surface-card border border-border-quiet shadow-xl max-w-md space-y-3">
                <div className="w-12 h-12 rounded-xl bg-wine-accent/10 border border-wine-accent/30 text-wine-accent flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-ink-parchment text-base">
                  No Characters Recorded Yet
                </h3>
                <p className="text-xs text-ink-ash leading-relaxed">
                  Characters introduced in your manuscript or bible will form an interactive constellation here as your story develops.
                </p>
              </div>
            </div>
          ) : (
            <CharacterNetworkCanvas
              graphData={displayedGraph}
              selectedNodeId={selectedNodeId}
              selectedConnectionId={selectedConnectionId}
              hoveredNodeId={hoveredNodeId}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              toneFilter={toneFilter}
              onSelectNode={(id) => {
                setSelectedNodeId(id);
                if (id) setSelectedConnectionId(null);
              }}
              onSelectConnection={(id) => {
                setSelectedConnectionId(id);
                if (id) setSelectedNodeId(null);
              }}
              onHoverNode={setHoveredNodeId}
            />
          )}
        </main>

        {/* Slide-over Character Inspector */}
        {activeNode && (
          <CharacterInspector
            node={activeNode}
            connections={networkGraph.connections}
            narrativeThreads={networkGraph.narrativeThreads}
            dataQualityIssues={networkGraph.dataQualityIssues}
            currentChapter={currentChapter}
            onClose={() => setSelectedNodeId(null)}
            onSelectConnection={(connId) => {
              setSelectedNodeId(null);
              setSelectedConnectionId(connId);
            }}
            onSelectCharacter={(charId) => {
              setSelectedConnectionId(null);
              setSelectedNodeId(charId);
            }}
          />
        )}

        {/* Slide-over Relationship Inspector */}
        {activeConnection && (
          <RelationshipInspector
            connection={activeConnection}
            allCharacters={rawCharacters}
            allRelationships={rawRelationships}
            currentChapter={currentChapter}
            onClose={() => setSelectedConnectionId(null)}
            onSelectCharacter={(charId) => {
              setSelectedConnectionId(null);
              setSelectedNodeId(charId);
            }}
          />
        )}

        {/* Self-Loops Audit Modal */}
        {showSelfLoopsModal && (
          <div className="absolute inset-0 z-40 bg-surface-void/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-card border border-border-subtle rounded-xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-4 border-b border-border-quiet flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-ink-parchment text-sm">
                      Self-Referential Story Records
                    </h3>
                    <p className="text-[11px] text-ink-ash font-mono">
                      Chapter {currentChapter} Audit • {networkGraph.metadata.excludedSelfLoopsCount} Active Records
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSelfLoopsModal(false)}
                  className="p-1.5 rounded-lg text-ink-faint hover:text-ink-parchment hover:bg-surface-elevated transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
                <p className="text-xs text-ink-bone leading-relaxed">
                  In the story database, these relationship records have matching source and target entities (e.g. unilateral trauma truth, internal mutiny, or ecclesiastical authority declarations). They are preserved verbatim as character milestones and isolated from pairwise visual edges to avoid confusing circular loops.
                </p>

                <div className="space-y-2.5">
                  {networkGraph.dataQualityIssues
                    .filter((i) => i.code === "SELF_LOOP")
                    .map((issue, idx) => {
                      const details = issue.details as any;
                      const charName =
                        rawCharacters.find((c) => c.id === issue.characterId)?.name ||
                        "Character";

                      return (
                        <div
                          key={issue.relationshipId || idx}
                          className="p-3 rounded-lg bg-surface-field border border-border-quiet text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-serif font-bold text-ink-parchment">
                              {charName}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              {details?.relation ? String(details.relation).toUpperCase() : "SELF"} • Ch {details?.sinceChapter ?? 1}
                            </span>
                          </div>

                          {details?.description && (
                            <p className="text-[11px] text-ink-ash">
                              {details.description}
                            </p>
                          )}

                          {details?.evidenceQuote && (
                            <div className="p-2 rounded bg-surface-void border-l-2 border-amber-500/60 text-ink-bone font-serif text-[11px] italic leading-relaxed">
                              &ldquo;{details.evidenceQuote}&rdquo;
                            </div>
                          )}

                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => {
                                setShowSelfLoopsModal(false);
                                if (issue.characterId) setSelectedNodeId(issue.characterId);
                              }}
                              className="text-[11px] text-sky-400 hover:text-sky-300 font-mono"
                            >
                              Open {charName}&rsquo;s Dossier →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="p-3 border-t border-border-quiet bg-surface-subtle flex justify-end">
                <button
                  onClick={() => setShowSelfLoopsModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-surface-card hover:bg-surface-elevated text-xs font-medium text-ink-parchment border border-border-quiet transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
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
          minChapter={networkGraph.metadata.minChapter}
          maxChapter={networkGraph.metadata.maxChapter}
          introducedCount={networkGraph.metadata.introducedCharactersCount}
          activeRelsCount={networkGraph.metadata.activeRelationshipsCount}
          activeThreadsCount={networkGraph.metadata.activeNarrativeThreadsCount}
          totalCharacters={rawCharacters.length}
          milestones={dynamicMilestones}
        />
      </footer>
    </div>
  );
}
