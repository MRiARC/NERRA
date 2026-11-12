"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Database, RefreshCw, SlidersHorizontal, Sparkles } from "lucide-react";
import { api, GraphEdge, GraphNode, StoryGraph } from "@/lib/api";

interface Props {
  projectId: string;
}

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}

const KIND_COLORS: Record<GraphNode["kind"], { fill: string; stroke: string; badge: string }> = {
  character: {
    fill: "#312e81",
    stroke: "#818cf8",
    badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  },
  location: {
    fill: "#064e3b",
    stroke: "#34d399",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  object: {
    fill: "#78350f",
    stroke: "#fbbf24",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  event: {
    fill: "#581c87",
    stroke: "#c084fc",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
};

function computeLayout(nodes: GraphNode[], edges: GraphEdge[]): PositionedNode[] {
  const width = 820;
  const height = 520;
  const cx = width / 2;
  const cy = height / 2;

  if (nodes.length === 0) return [];

  // Deterministic concentric initialization grouped by kind
  const positioned: PositionedNode[] = nodes.map((n, idx) => {
    const angle = (idx / Math.max(nodes.length, 1)) * Math.PI * 2;
    const radius =
      n.kind === "character" ? 130 : n.kind === "location" ? 210 : n.kind === "object" ? 180 : 230;
    return {
      ...n,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });

  const byId = new Map(positioned.map((n) => [n.id, n]));

  // Lightweight deterministic force simulation (45 iterations)
  for (let step = 0; step < 45; step++) {
    // Repulsion between nodes
    for (let i = 0; i < positioned.length; i++) {
      for (let j = i + 1; j < positioned.length; j++) {
        const a = positioned[i];
        const b = positioned[j];
        const dx = b.x - a.x || 0.1;
        const dy = b.y - a.y || 0.1;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;
        if (dist < 160) {
          const force = ((160 - dist) / dist) * 0.28;
          a.x -= dx * force;
          a.y -= dy * force;
          b.x += dx * force;
          b.y += dy * force;
        }
      }
    }

    // Spring attraction along edges
    for (const e of edges) {
      const a = byId.get(e.source);
      const b = byId.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ideal = 135;
      const force = ((dist - ideal) / dist) * 0.08;
      a.x += dx * force;
      a.y += dy * force;
      b.x -= dx * force;
      b.y -= dy * force;
    }

    // Gentle center gravity + bounds clamping
    for (const n of positioned) {
      n.x += (cx - n.x) * 0.03;
      n.y += (cy - n.y) * 0.03;
      n.x = Math.max(55, Math.min(width - 55, n.x));
      n.y = Math.max(45, Math.min(height - 45, n.y));
    }
  }

  return positioned;
}

export default function StoryGraphView({ projectId }: Props) {
  const [graph, setGraph] = useState<StoryGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [chapterLimit, setChapterLimit] = useState<number | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showKinds, setShowKinds] = useState<Record<GraphNode["kind"], boolean>>({
    character: true,
    location: true,
    object: true,
    event: true,
  });

  async function fetchGraph(ch?: number | null, refresh = false) {
    setLoading(true);
    try {
      const data = await api.getGraph(projectId, ch, refresh);
      setGraph(data);
    } catch (err) {
      console.error("Failed to fetch story graph:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.getGraph(projectId, null, false);
        if (active) setGraph(data);
      } catch (err) {
        console.error("Failed to fetch story graph:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, [projectId]);

  const visibleNodes = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter((n) => showKinds[n.kind]);
  }, [graph, showKinds]);

  const visibleEdges = useMemo(() => {
    if (!graph) return [];
    const nodeIds = new Set(visibleNodes.map((n) => n.id));
    return graph.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [graph, visibleNodes]);

  const positionedNodes = useMemo(
    () => computeLayout(visibleNodes, visibleEdges),
    [visibleNodes, visibleEdges]
  );

  const nodeById = useMemo(
    () => new Map(positionedNodes.map((n) => [n.id, n])),
    [positionedNodes]
  );

  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) || null : null;
  const connectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    return visibleEdges.filter(
      (e) => e.source === selectedNode.id || e.target === selectedNode.id
    );
  }, [selectedNode, visibleEdges]);

  const maxChapter = Math.max(graph?.max_chapter || 1, 1);

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-800/80 bg-slate-900/40 rounded-xl p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Interactive Story World Graph
            </h3>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                graph?.neo4j_connected
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/30"
              }`}
            >
              <Database className="w-3 h-3" />
              {graph?.neo4j_connected ? "Neo4j Cypher Live" : "SQL Projection Fallback"}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Explore characters, locations, objects, and evolving relationships. Scrub chapters to watch alliances shift.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Chapter Scrubber */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs text-slate-300 font-medium whitespace-nowrap">
              {chapterLimit === null ? "All Chapters" : `Up to Ch. ${chapterLimit}`}
            </span>
            <input
              type="range"
              min={1}
              max={maxChapter}
              value={chapterLimit ?? maxChapter}
              onChange={(e) => {
                const val = Number(e.target.value);
                setChapterLimit(val);
                fetchGraph(val, false);
              }}
              className="w-28 accent-indigo-500 cursor-pointer"
            />
            {chapterLimit !== null && (
              <button
                onClick={() => {
                  setChapterLimit(null);
                  fetchGraph(null, false);
                }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Reset
              </button>
            )}
          </div>

          <button
            onClick={() => fetchGraph(chapterLimit, true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition"
            title="Re-sync Postgres story world into Neo4j"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            <span>Sync Neo4j</span>
          </button>
        </div>
      </div>

      {/* Kind Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["character", "location", "object", "event"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setShowKinds((prev) => ({ ...prev, [k]: !prev[k] }))}
            className={`text-xs px-3 py-1 rounded-full border capitalize transition ${
              showKinds[k]
                ? KIND_COLORS[k].badge
                : "bg-slate-900/50 text-slate-500 border-slate-800"
            }`}
          >
            {showKinds[k] ? "✓ " : "+ "}
            {k}s ({graph?.nodes.filter((n) => n.kind === k).length ?? 0})
          </button>
        ))}
      </div>

      {/* Main Split Canvas + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 border border-slate-800 bg-[#0b0f17] rounded-2xl overflow-hidden relative">
          {positionedNodes.length === 0 ? (
            <div className="h-[520px] flex flex-col items-center justify-center text-slate-500 text-sm">
              No graph entities match the current filter.
            </div>
          ) : (
            <svg viewBox="0 0 820 520" className="w-full h-[520px] select-none">
              <defs>
                <marker
                  id="arrow-neutral"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                </marker>
                <marker
                  id="arrow-hostile"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
                </marker>
                <marker
                  id="arrow-positive"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#34d399" />
                </marker>
              </defs>

              {/* Edges */}
              {visibleEdges.map((e) => {
                const src = nodeById.get(e.source);
                const dst = nodeById.get(e.target);
                if (!src || !dst) return null;
                const isHighlighted =
                  selectedNode && (e.source === selectedNode.id || e.target === selectedNode.id);
                const stroke =
                  e.sentiment === "hostile"
                    ? "#f43f5e"
                    : e.sentiment === "positive"
                    ? "#34d399"
                    : "#475569";
                const marker =
                  e.sentiment === "hostile"
                    ? "url(#arrow-hostile)"
                    : e.sentiment === "positive"
                    ? "url(#arrow-positive)"
                    : "url(#arrow-neutral)";

                const mx = (src.x + dst.x) / 2;
                const my = (src.y + dst.y) / 2;

                return (
                  <g key={e.id} opacity={selectedNode && !isHighlighted ? 0.22 : 0.85}>
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={dst.x}
                      y2={dst.y}
                      stroke={stroke}
                      strokeWidth={isHighlighted ? 2.2 : 1.3}
                      strokeDasharray={e.sentiment === "hostile" ? "5 3" : undefined}
                      markerEnd={marker}
                    />
                    {isHighlighted && (
                      <text
                        x={mx}
                        y={my - 4}
                        textAnchor="middle"
                        className="fill-slate-300 text-[9px] font-mono"
                      >
                        {e.relation}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {positionedNodes.map((n) => {
                const palette = KIND_COLORS[n.kind];
                const isSelected = selectedNodeId === n.id;
                const radius = n.kind === "character" ? 18 : n.kind === "location" ? 15 : 12;

                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x}, ${n.y})`}
                    onClick={() => setSelectedNodeId(n.id)}
                    className="cursor-pointer"
                  >
                    {isSelected && (
                      <circle
                        r={radius + 6}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        strokeDasharray="3 2"
                      />
                    )}
                    <circle
                      r={radius}
                      fill={palette.fill}
                      stroke={palette.stroke}
                      strokeWidth={isSelected ? 2.5 : 1.8}
                    />
                    <text
                      y={radius + 14}
                      textAnchor="middle"
                      className="fill-slate-200 text-[10px] font-medium pointer-events-none"
                    >
                      {n.label.length > 22 ? n.label.slice(0, 20) + "..." : n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Right Side Node Inspector */}
        <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          {!selectedNode ? (
            <div className="text-center my-auto space-y-2 py-12">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Select a Node</p>
              <p className="text-xs text-slate-500">
                Click any Character, Location, Object, or Event node in the graph to inspect its metadata and
                connected edges.
              </p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-[480px]">
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                      KIND_COLORS[selectedNode.kind].badge
                    }`}
                  >
                    {selectedNode.kind}
                  </span>
                  <h4 className="text-base font-bold text-white mt-1.5">{selectedNode.label}</h4>
                </div>
                {selectedNode.chapter && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Ch. {selectedNode.chapter}
                  </span>
                )}
              </div>

              {typeof selectedNode.metadata.description === "string" &&
                selectedNode.metadata.description && (
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedNode.metadata.description}
                  </p>
                )}

              {typeof selectedNode.metadata.summary === "string" && selectedNode.metadata.summary && (
                <p className="text-xs text-slate-300 leading-relaxed">{selectedNode.metadata.summary}</p>
              )}

              <div className="space-y-2 pt-2">
                <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Connected Edges ({connectedEdges.length})
                </h5>
                {connectedEdges.length === 0 ? (
                  <p className="text-xs text-slate-500">No visible edges for this node.</p>
                ) : (
                  <div className="space-y-2">
                    {connectedEdges.map((e) => {
                      const otherId = e.source === selectedNode.id ? e.target : e.source;
                      const otherNode = nodeById.get(otherId);
                      return (
                        <div
                          key={e.id}
                          onClick={() => otherNode && setSelectedNodeId(otherNode.id)}
                          className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 cursor-pointer text-xs space-y-1 transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] text-indigo-300">{e.relation}</span>
                            <span className="text-[10px] text-slate-500">
                              Ch. {e.since_chapter ?? "?"}
                              {e.until_chapter ? `–${e.until_chapter}` : ""}
                            </span>
                          </div>
                          <div className="text-slate-200 font-medium">
                            {otherNode?.label || otherId}
                          </div>
                          {e.description && <p className="text-[11px] text-slate-400">{e.description}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              Nodes: {positionedNodes.length} · Edges: {visibleEdges.length}
            </span>
            <span>Neo4j Browser: :7474</span>
          </div>
        </div>
      </div>
    </div>
  );
}
