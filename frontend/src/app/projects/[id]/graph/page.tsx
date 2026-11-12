"use client";

import React, { useState, use, useMemo, useRef } from "react";
import Link from "next/link";
import { useStoryGraph, useWorld } from "@/hooks/useStoryData";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  GitBranch,
  Users,
  MapPin,
  Box,
  Calendar,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Search,
  BookOpen,
  ArrowRight,
  Filter,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import type { GraphNode, GraphEdge } from "@/lib/types";

interface GraphPageProps {
  params: Promise<{ id: string }>;
}

const KIND_META: Record<
  GraphNode["kind"],
  { label: string; stroke: string; fill: string; dot: string; icon: any }
> = {
  character: {
    label: "Cast",
    stroke: "border-indigo-400/40",
    fill: "#1e1b4b",
    dot: "bg-indigo-400",
    icon: Users,
  },
  location: {
    label: "Setting",
    stroke: "border-emerald-400/40",
    fill: "#064e3b",
    dot: "bg-emerald-400",
    icon: MapPin,
  },
  object: {
    label: "Artifact / Relic",
    stroke: "border-amber-400/40",
    fill: "#78350f",
    dot: "bg-amber-400",
    icon: Box,
  },
  event: {
    label: "Major Event",
    stroke: "border-rose-400/40",
    fill: "#881337",
    dot: "bg-rose-400",
    icon: Calendar,
  },
};

export default function StoryGraphPage({ params }: GraphPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { data: graphData, isLoading, refetch } = useStoryGraph(projectId);
  const { data: worldData } = useWorld(projectId);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterKind, setFilterKind] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);

  const nodes = graphData?.nodes || [];
  const edges = graphData?.edges || [];

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (filterKind !== "all" && n.kind !== filterKind) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return n.label.toLowerCase().includes(q) || n.kind.toLowerCase().includes(q);
      }
      return true;
    });
  }, [nodes, filterKind, searchQuery]);

  // Compute layout coordinates for SVG canvas
  const positionedNodes = useMemo(() => {
    const width = 900;
    const height = 560;
    const cx = width / 2;
    const cy = height / 2;

    if (nodes.length === 0) return [];

    return nodes.map((n, idx) => {
      // Group geometrically by kind in concentric orbital rings
      let radius = 140;
      if (n.kind === "character") radius = 120;
      else if (n.kind === "object") radius = 190;
      else if (n.kind === "location") radius = 240;
      else if (n.kind === "event") radius = 270;

      const angle = (idx / Math.max(nodes.length, 1)) * Math.PI * 2;
      return {
        ...n,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      };
    });
  }, [nodes]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, typeof positionedNodes[0]>();
    for (const n of positionedNodes) {
      map.set(n.id, n);
    }
    return map;
  }, [positionedNodes]);

  // Selected node details
  const selectedNode = positionedNodes.find((n) => n.id === selectedNodeId);

  // Edges connected to selected node
  const connectedEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return edges.filter(
      (e) => e.source === selectedNodeId || e.target === selectedNodeId
    );
  }, [edges, selectedNodeId]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
      {/* Header & Mission Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border-subtle pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-ink-ash font-medium">
              Knowledge Graph &amp; Custody Topology
            </span>
            <span className="text-border-subtle">•</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-pine-forest">
              <span className="w-1.5 h-1.5 rounded-full bg-pine-forest" />
              {graphData?.neo4j_connected ? "Neo4j Cluster Synced" : "In-Memory Graph Synced"}
            </span>
          </div>
          <h1 className="text-3xl font-serif font-normal tracking-tight text-ink-parchment flex items-center gap-3">
            <GitBranch className="w-7 h-7 text-wine-accent" />
            Items &amp; Relationships
          </h1>
          <p className="text-sm text-ink-ash max-w-2xl leading-relaxed">
            Trace entity connections, character allegiances, location visits, and object custody chains.
            Ensure no weapon or key teleports into a scene without custody transfer.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2 font-mono text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-sync Topology
          </Button>
        </div>
      </div>

      {/* KPI & Metric Rail */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Surface depth={2} border="subtle" className="p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash">Graph Nodes</p>
            <p className="text-2xl font-serif text-ink-parchment mt-0.5">{nodes.length}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-border-quiet flex items-center justify-center text-ink-ash">
            <Layers className="w-4 h-4" />
          </div>
        </Surface>

        <Surface depth={2} border="subtle" className="p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash">Active Relationships</p>
            <p className="text-2xl font-serif text-ink-parchment mt-0.5">{edges.length}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-border-quiet flex items-center justify-center text-wine-accent">
            <GitBranch className="w-4 h-4" />
          </div>
        </Surface>

        <Surface depth={2} border="subtle" className="p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash">Tracked Objects</p>
            <p className="text-2xl font-serif text-ink-parchment mt-0.5">
              {worldData?.objects?.length ?? nodes.filter((n) => n.kind === "object").length}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-border-quiet flex items-center justify-center text-amber-500/80">
            <Box className="w-4 h-4" />
          </div>
        </Surface>

        <Surface depth={2} border="subtle" className="p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash">Canon Locations</p>
            <p className="text-2xl font-serif text-ink-parchment mt-0.5">
              {worldData?.locations?.length ?? nodes.filter((n) => n.kind === "location").length}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-border-quiet flex items-center justify-center text-emerald-500/80">
            <MapPin className="w-4 h-4" />
          </div>
        </Surface>
      </div>

      {/* Control Deck */}
      <Surface depth={1} border="quiet" className="p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-ash absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search entities, artifacts, settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-card border border-border-subtle rounded-lg pl-8 pr-3 py-1.5 text-xs text-ink-parchment placeholder:text-ink-faint outline-none focus:border-wine-accent w-60"
            />
          </div>

          <span className="text-border-subtle font-mono text-xs hidden sm:inline">|</span>

          <div className="flex items-center gap-2 text-xs font-mono text-ink-ash">
            <Filter className="w-3.5 h-3.5" />
            <span>Entity Kind:</span>
          </div>
          <select
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value)}
            className="bg-surface-card border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-ink-parchment outline-none focus:border-wine-accent cursor-pointer"
          >
            <option value="all">All Entities ({nodes.length})</option>
            <option value="character">Characters</option>
            <option value="location">Locations</option>
            <option value="object">Artifacts &amp; Objects</option>
            <option value="event">Events</option>
          </select>
        </div>

        {/* Canvas Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
            className="p-1.5 rounded-lg bg-surface-card border border-border-quiet hover:bg-surface-elevated text-ink-ash transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono text-ink-ash px-1">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
            className="p-1.5 rounded-lg bg-surface-card border border-border-quiet hover:bg-surface-elevated text-ink-ash transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1.5 rounded-lg bg-surface-card border border-border-quiet hover:bg-surface-elevated text-ink-ash transition-colors text-xs font-mono"
            title="Reset Zoom"
          >
            Reset
          </button>
        </div>
      </Surface>

      {/* Main Canvas & Inspection Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive SVG Canvas */}
        <div className="lg:col-span-2">
          <Surface
            depth={0}
            border="subtle"
            className="h-[600px] rounded-xl relative overflow-hidden bg-surface-void flex items-center justify-center border-border-subtle select-none"
          >
            {/* Subtle Grid Backdrop */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, transparent 1px)",
                backgroundSize: "24px 24px",
                backgroundPosition: "0 0, 12px 12px",
              }}
            />

            {isLoading ? (
              <div className="py-24 text-center space-y-3 z-10">
                <div className="w-6 h-6 border-2 border-wine-accent border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-mono text-ink-ash">Synthesizing knowledge graph vectors...</p>
              </div>
            ) : nodes.length === 0 ? (
              <div className="py-24 text-center space-y-2 z-10 text-ink-ash">
                <GitBranch className="w-8 h-8 mx-auto opacity-40 text-ink-faint" />
                <p className="text-xs font-serif text-ink-parchment">No Graph Nodes Extracted</p>
                <p className="text-[11px]">Re-run chapter analysis to populate entities and custody edges.</p>
              </div>
            ) : (
              <svg
                viewBox="0 0 900 560"
                className="w-full h-full cursor-grab active:cursor-grabbing transition-transform duration-150"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                {/* Relationship Edges */}
                {edges.map((e, idx) => {
                  const s = nodeMap.get(e.source);
                  const t = nodeMap.get(e.target);
                  if (!s || !t) return null;

                  const isConnected =
                    selectedNodeId &&
                    (e.source === selectedNodeId || e.target === selectedNodeId);

                  return (
                    <g key={idx}>
                      <line
                        x1={s.x}
                        y1={s.y}
                        x2={t.x}
                        y2={t.y}
                        stroke={isConnected ? "#ffb1bf" : "#332a2e"}
                        strokeWidth={isConnected ? 2 : 1}
                        strokeDasharray={e.relation?.includes("custody") ? "4 3" : undefined}
                      />
                      {/* Edge Label for hovered / selected edges */}
                      {isConnected && e.relation && (
                        <text
                          x={(s.x + t.x) / 2}
                          y={(s.y + t.y) / 2 - 4}
                          fill="#ffb1bf"
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor="middle"
                          className="select-none pointer-events-none"
                        >
                          {e.relation}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Nodes */}
                {positionedNodes.map((n) => {
                  const isSelected = selectedNodeId === n.id;
                  const isFiltered =
                    (filterKind !== "all" && n.kind !== filterKind) ||
                    (searchQuery &&
                      !n.label.toLowerCase().includes(searchQuery.toLowerCase()));

                  const meta = KIND_META[n.kind] || KIND_META.object;

                  return (
                    <g
                      key={n.id}
                      onClick={() => setSelectedNodeId(isSelected ? null : n.id)}
                      className="cursor-pointer transition-transform duration-200"
                      style={{ opacity: isFiltered ? 0.2 : 1 }}
                    >
                      {/* Outer Ring */}
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={isSelected ? 18 : 14}
                        fill={meta.fill}
                        stroke={isSelected ? "#ffb1bf" : "#4a3c42"}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        className="transition-all duration-150"
                      />

                      {/* Inner Pip */}
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={4}
                        fill={isSelected ? "#ffffff" : "#c4bcb3"}
                      />

                      {/* Node Label */}
                      <text
                        x={n.x}
                        y={n.y + 24}
                        fill={isSelected ? "#ffffff" : "#c4bcb3"}
                        fontSize="10"
                        fontFamily="sans-serif"
                        textAnchor="middle"
                        fontWeight={isSelected ? "600" : "400"}
                        className="select-none pointer-events-none"
                      >
                        {n.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Kind Legend Pill in corner */}
            <div className="absolute bottom-3 left-3 bg-surface-card/90 backdrop-blur-sm border border-border-quiet rounded-lg p-2.5 flex items-center gap-3 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-ink-ash">
                <span className="w-2 h-2 rounded-full bg-indigo-400" /> Cast
              </div>
              <div className="flex items-center gap-1.5 text-ink-ash">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Location
              </div>
              <div className="flex items-center gap-1.5 text-ink-ash">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Artifact
              </div>
              <div className="flex items-center gap-1.5 text-ink-ash">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Event
              </div>
            </div>
          </Surface>
        </div>

        {/* Node Inspection Dossier */}
        <div className="lg:col-span-1">
          <Surface depth={2} border="subtle" className="p-5 rounded-xl space-y-5 sticky top-6">
            <div className="flex items-center justify-between border-b border-border-quiet pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-wine-accent" />
                <h3 className="font-serif text-sm font-medium text-ink-parchment">
                  Entity &amp; Custody Dossier
                </h3>
              </div>
              {selectedNode && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-subtle border border-border-quiet text-ink-ash uppercase">
                  {selectedNode.kind}
                </span>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash">Entity Name</p>
                  <p className="text-base font-serif text-ink-parchment mt-0.5 font-medium">
                    {selectedNode.label}
                  </p>
                </div>

                {selectedNode.metadata?.aliases && Array.isArray(selectedNode.metadata.aliases) && selectedNode.metadata.aliases.length > 0 && (
                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash mb-1">
                      Recorded Aliases
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(selectedNode.metadata.aliases as string[]).map((al: string, aIdx: number) => (
                        <span
                          key={aIdx}
                          className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-subtle border border-border-quiet text-ink-bone"
                        >
                          {al}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connected Edges & Custody Transfers */}
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash mb-2">
                    Active Connections ({connectedEdges.length})
                  </p>
                  {connectedEdges.length === 0 ? (
                    <p className="text-xs text-ink-ash font-mono bg-surface-subtle p-3 rounded-lg border border-border-quiet">
                      No direct graph edges recorded.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {connectedEdges.map((e, eIdx) => {
                        const isSource = e.source === selectedNode.id;
                        const otherId = isSource ? e.target : e.source;
                        const otherNode = nodeMap.get(otherId);
                        const edgeChapter = e.since_chapter ? `Ch. ${e.since_chapter}` : null;

                        return (
                          <div
                            key={eIdx}
                            className="p-2.5 rounded-lg bg-surface-subtle border border-border-quiet text-xs font-mono space-y-1"
                          >
                            <div className="flex items-center justify-between text-ink-parchment font-medium">
                              <span className="text-wine-accent">{e.relation || "relates to"}</span>
                              {edgeChapter && (
                                <span className="text-[10px] text-ink-ash">Ch. {edgeChapter}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-ink-bone">
                              <span className="text-ink-ash">{isSource ? "→" : "←"}</span>
                              <span>{otherNode?.label || otherId}</span>
                              <span className="text-[10px] text-ink-ash">({otherNode?.kind})</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick Link to Story Bible */}
                <div className="pt-2">
                  <Link
                    href={`/projects/${projectId}/characters`}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-subtle hover:bg-surface-elevated border border-border-quiet text-xs font-mono text-ink-parchment transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-wine-accent" />
                    Inspect Cast in Bible
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-2 text-ink-ash">
                <GitBranch className="w-8 h-8 mx-auto opacity-40 text-ink-faint" />
                <p className="text-xs">Select any node on the graph canvas to inspect custody chains, aliases, and relationship vectors.</p>
              </div>
            )}
          </Surface>
        </div>
      </div>
    </div>
  );
}
