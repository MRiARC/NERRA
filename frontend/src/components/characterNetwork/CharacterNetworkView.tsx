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
} from "lucide-react";
import { useCharacters, useRelationships, useProject } from "@/hooks/useStoryData";
import { cn } from "@/lib/utils";
import type {
  CharacterNetworkGraph,
  RawCharacter,
  RawRelationship,
} from "@/lib/characterNetwork/types";
import { transformCharacterNetwork } from "@/lib/characterNetwork/transform";
import {
  AETHELGARD_CHARACTERS,
  AETHELGARD_PROJECT_ID,
  AETHELGARD_RELATIONSHIPS,
} from "@/lib/characterNetwork/sampleData";
import { ChapterScrubber } from "./ChapterScrubber";
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

  // Normalize entities with fallback to verified Aethelgard test fixtures ONLY for Aethelgard
  const rawCharacters: RawCharacter[] = useMemo(() => {
    if (liveCharacters && liveCharacters.length > 0) {
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
    }
    if (projectId === AETHELGARD_PROJECT_ID) {
      return AETHELGARD_CHARACTERS;
    }
    return [];
  }, [liveCharacters, projectId]);

  const rawRelationships: RawRelationship[] = useMemo(() => {
    if (liveRelationships && liveRelationships.length > 0) {
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
    }
    if (projectId === AETHELGARD_PROJECT_ID) {
      return AETHELGARD_RELATIONSHIPS;
    }
    return [];
  }, [liveRelationships, projectId]);

  // Compute chapter-scoped network graph
  const networkGraph: CharacterNetworkGraph = useMemo(() => {
    return transformCharacterNetwork({
      projectId,
      characters: rawCharacters,
      relationships: rawRelationships,
      chapter: currentChapter,
    });
  }, [projectId, rawCharacters, rawRelationships, currentChapter]);

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
      {/* Header Bar */}
      <header className="h-14 px-6 border-b border-border-quiet bg-surface-subtle/90 backdrop-blur-md flex items-center justify-between gap-4 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-wine-accent/10 border border-wine-accent/30 text-wine-accent">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-serif font-bold text-ink-parchment tracking-wide">
              Character Network Explorer
            </h1>
            <p className="text-[11px] font-mono text-ink-faint">
              {project?.title || "Story World"} • Ch {currentChapter}
            </p>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Search characters or aliases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-md bg-surface-field border border-border-quiet text-ink-parchment placeholder-ink-faint focus:outline-none focus:border-wine-accent/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-faint hover:text-ink-parchment"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 text-xs rounded-md bg-surface-field border border-border-quiet text-ink-bone focus:outline-none focus:border-wine-accent/60 font-mono"
          >
            <option value="all">Status: All</option>
            <option value="alive">Status: Alive</option>
            <option value="deceased">Status: Deceased</option>
            <option value="incapacitated">Status: Incapacitated</option>
            <option value="unknown">Status: Unknown</option>
          </select>

          {/* Tone Filter */}
          <select
            value={toneFilter}
            onChange={(e) => setToneFilter(e.target.value)}
            className="h-8 px-2.5 text-xs rounded-md bg-surface-field border border-border-quiet text-ink-bone focus:outline-none focus:border-wine-accent/60 font-mono"
          >
            <option value="all">Tone: All</option>
            <option value="friction">Tone: Friction</option>
            <option value="warmth">Tone: Warmth</option>
            <option value="neutral">Tone: Neutral</option>
          </select>
        </div>

        {/* Header Stats */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-ink-ash">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-wine-accent" />
            <span>Cast:</span>
            <span className="text-ink-parchment font-semibold">
              {networkGraph.metadata.introducedCharactersCount}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Active Bonds:</span>
            <span className="text-ink-parchment font-semibold">
              {networkGraph.metadata.activeConnectionsCount}
            </span>
          </div>

          {networkGraph.metadata.excludedSelfLoopsCount > 0 && (
            <button
              onClick={() => setShowSelfLoopsModal(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors text-xs font-mono"
              title="Click to view self-referential records audited for this chapter"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Self-Loops: {networkGraph.metadata.excludedSelfLoopsCount}</span>
            </button>
          )}

          {/* Integrated Header View Switcher */}
          {onToggleViewMode && (
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-field border border-border-quiet text-xs font-mono shrink-0 ml-1">
              <button
                onClick={() => viewMode !== "network" && onToggleViewMode()}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                  viewMode === "network"
                    ? "bg-wine-accent/20 text-wine-accent font-semibold border border-wine-accent/40"
                    : "text-ink-ash hover:text-ink-parchment"
                )}
              >
                <Network className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Network</span>
              </button>
              <button
                onClick={() => viewMode !== "cast" && onToggleViewMode()}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                  viewMode === "cast"
                    ? "bg-wine-accent/20 text-wine-accent font-semibold border border-wine-accent/40"
                    : "text-ink-ash hover:text-ink-parchment"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cast</span>
              </button>
            </div>
          )}
        </div>
      </header>

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
              graphData={networkGraph}
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
          totalCharacters={rawCharacters.length}
          milestones={projectId === AETHELGARD_PROJECT_ID ? undefined : []}
        />
      </footer>
    </div>
  );
}
