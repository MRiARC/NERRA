"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CharacterNetworkGraph } from "@/lib/characterNetwork/types";
import {
  getG6GraphConfig,
  mapToG6GraphData,
  type G6AdapterOptions,
} from "@/lib/characterNetwork/g6Adapter";

export interface CharacterNetworkCanvasProps {
  graphData: CharacterNetworkGraph;
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  hoveredNodeId: string | null;
  searchQuery: string;
  statusFilter: string;
  toneFilter: string;
  onSelectNode: (nodeId: string | null) => void;
  onSelectConnection: (connectionId: string | null) => void;
  onHoverNode: (nodeId: string | null) => void;
}

export function CharacterNetworkCanvas({
  graphData,
  selectedNodeId,
  selectedConnectionId,
  hoveredNodeId,
  searchQuery,
  statusFilter,
  toneFilter,
  onSelectNode,
  onSelectConnection,
  onHoverNode,
}: CharacterNetworkCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphInstanceRef = useRef<any>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const previousNodeIdsRef = useRef<Set<string>>(new Set());
  const updateSeqRef = useRef<number>(0);

  // Active hover targets for floating HUD tooltips
  const hoveredNode = useMemo(() => {
    if (!hoveredNodeId) return null;
    return graphData.nodes.find((n) => n.id === hoveredNodeId) || null;
  }, [graphData.nodes, hoveredNodeId]);

  const hoveredConn = useMemo(() => {
    if (!hoveredEdgeId) return null;
    return (
      graphData.connections.find((c) => c.connectionId === hoveredEdgeId) || null
    );
  }, [graphData.connections, hoveredEdgeId]);

  // Initialize G6 Graph instance
  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;
    let graph: any = null;

    import("@antv/g6").then(({ Graph, NodeEvent, EdgeEvent, CanvasEvent, GraphEvent }) => {
      if (!isMounted || !containerRef.current) return;

      const { clientWidth, clientHeight } = containerRef.current;
      const width = clientWidth || 900;
      const height = clientHeight || 600;

      const config = getG6GraphConfig(containerRef.current, width, height);
      graph = new Graph(config);

      // Map initial data
      const g6Data = mapToG6GraphData(graphData, {
        selectedNodeId,
        selectedConnectionId,
        hoveredNodeId,
        searchQuery,
        statusFilter,
        toneFilter,
      });

      graph.setData(g6Data);
      previousNodeIdsRef.current = new Set(g6Data.nodes.map((n) => n.id));
      graph.render();

      // Automatically center graph when force layout settles
      graph.once(GraphEvent.AFTER_LAYOUT, () => {
        try {
          graph.fitCenter();
        } catch {}
      });

      // Helper to update canvas cursor reliably
      const updateCursor = (cursor: string) => {
        if (containerRef.current) {
          containerRef.current.style.cursor = cursor;
          const canvas = containerRef.current.querySelector("canvas");
          if (canvas) canvas.style.cursor = cursor;
        }
      };

      // Register Interactive Events
      graph.on(NodeEvent.CLICK, (e: any) => {
        const id = e.target?.id || e.targetId;
        if (id) {
          onSelectNode(id);
          onSelectConnection(null);
        }
      });

      graph.on(EdgeEvent.CLICK, (e: any) => {
        const id = e.target?.id || e.targetId;
        if (id) {
          onSelectConnection(id);
          onSelectNode(null);
        }
      });

      graph.on(CanvasEvent.CLICK, () => {
        onSelectNode(null);
        onSelectConnection(null);
      });

      // Hover feedback and cursor states
      graph.on(NodeEvent.POINTER_ENTER, (e: any) => {
        const id = e.target?.id || e.targetId;
        updateCursor("grab");
        if (id) {
          onHoverNode(id);
          const clientX = e.clientX ?? e.client?.x ?? e.canvas?.x;
          const clientY = e.clientY ?? e.client?.y ?? e.canvas?.y;
          if (clientX != null && clientY != null) {
            setMousePos({ x: clientX, y: clientY });
          }
        }
      });

      graph.on(NodeEvent.POINTER_MOVE, (e: any) => {
        const clientX = e.clientX ?? e.client?.x ?? e.canvas?.x;
        const clientY = e.clientY ?? e.client?.y ?? e.canvas?.y;
        if (clientX != null && clientY != null) {
          setMousePos({ x: clientX, y: clientY });
        }
      });

      graph.on(NodeEvent.POINTER_LEAVE, () => {
        updateCursor("default");
        onHoverNode(null);
      });

      graph.on(NodeEvent.DRAG_START, () => {
        updateCursor("grabbing");
      });

      graph.on(NodeEvent.DRAG_END, () => {
        updateCursor("grab");
      });

      graph.on(EdgeEvent.POINTER_ENTER, (e: any) => {
        const id = e.target?.id || e.targetId;
        updateCursor("pointer");
        if (id) {
          setHoveredEdgeId(id);
          const clientX = e.clientX ?? e.client?.x ?? e.canvas?.x;
          const clientY = e.clientY ?? e.client?.y ?? e.canvas?.y;
          if (clientX != null && clientY != null) {
            setMousePos({ x: clientX, y: clientY });
          }
        }
      });

      graph.on(EdgeEvent.POINTER_MOVE, (e: any) => {
        const clientX = e.clientX ?? e.client?.x ?? e.canvas?.x;
        const clientY = e.clientY ?? e.client?.y ?? e.canvas?.y;
        if (clientX != null && clientY != null) {
          setMousePos({ x: clientX, y: clientY });
        }
      });

      graph.on(EdgeEvent.POINTER_LEAVE, () => {
        updateCursor("default");
        setHoveredEdgeId(null);
      });

      graphInstanceRef.current = graph;
      setIsRendered(true);
    });

    return () => {
      isMounted = false;
      if (graphInstanceRef.current) {
        try {
          graphInstanceRef.current.destroy();
        } catch {
          // ignore cleanup errors on fast remount
        }
        graphInstanceRef.current = null;
      }
    };
  }, []); // Mounts once

  // Update G6 graph when data, selection, or filters change
  useEffect(() => {
    const graph = graphInstanceRef.current;
    if (!graph || !isRendered) return;

    const seq = ++updateSeqRef.current;

    async function applyUpdate() {
      const g6Data = mapToG6GraphData(graphData, {
        selectedNodeId,
        selectedConnectionId,
        hoveredNodeId,
        searchQuery,
        statusFilter,
        toneFilter,
      });

      const currentNodeIds = new Set(g6Data.nodes.map((n) => n.id));
      const hasStructureChanged =
        previousNodeIdsRef.current.size !== currentNodeIds.size ||
        [...currentNodeIds].some((id) => !previousNodeIdsRef.current.has(id));

      try {
        if (hasStructureChanged) {
          try {
            graph.stopLayout();
          } catch {}
          await graph.clear();
          if (seq !== updateSeqRef.current) return;
          graph.setData(g6Data);
          await graph.render();
        } else {
          graph.setData(g6Data);
          await graph.draw();
        }
        if (seq === updateSeqRef.current) {
          previousNodeIdsRef.current = currentNodeIds;
        }
      } catch (err) {
        console.warn("G6 re-render warning:", err);
      }
    }

    applyUpdate();
  }, [
    graphData,
    selectedNodeId,
    selectedConnectionId,
    hoveredNodeId,
    searchQuery,
    statusFilter,
    toneFilter,
    isRendered,
  ]);

  // Handle ResizeObserver for responsive fluid canvas
  useEffect(() => {
    if (!containerRef.current) return;

    const ro = new ResizeObserver((entries) => {
      const graph = graphInstanceRef.current;
      if (!graph) return;
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          try {
            graph.setSize([width, height]);
          } catch {
            // handle transient resizing
          }
        }
      }
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Toolbar Actions
  const handleZoomIn = () => {
    graphInstanceRef.current?.zoomBy(1.15);
  };

  const handleZoomOut = () => {
    graphInstanceRef.current?.zoomBy(0.85);
  };

  const handleFitView = () => {
    graphInstanceRef.current?.fitView({
      when: "always",
      direction: "both",
    });
  };

  const handleFitCenter = () => {
    graphInstanceRef.current?.fitCenter();
  };

  return (
    <div
      className="relative w-full h-full min-h-[500px] overflow-hidden bg-surface-void select-none"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
    >
      {/* G6 Graph Container */}
      <div
        ref={containerRef}
        className="w-full h-full"
      />

      {/* Floating Interactive Tooltip for Hovered Node */}
      {hoveredNode && (
        <div
          className="pointer-events-none absolute z-30 px-3.5 py-2.5 rounded-lg bg-surface-card/95 backdrop-blur-md border border-border-quiet shadow-2xl text-xs max-w-xs transition-opacity duration-150 animate-in fade-in"
          style={{
            left: Math.max(20, Math.min(mousePos.x + 16, (containerRef.current?.clientWidth || 800) - 280)),
            top: Math.max(20, Math.min(mousePos.y + 16, (containerRef.current?.clientHeight || 600) - 140)),
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-serif font-bold text-ink-parchment text-sm">
              {hoveredNode.name}
            </span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold",
                hoveredNode.state.status.toLowerCase() === "alive" &&
                  "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30",
                hoveredNode.state.status.toLowerCase() === "deceased" &&
                  "bg-surface-void text-ink-ash border border-border-subtle",
                hoveredNode.state.status.toLowerCase() === "incapacitated" &&
                  "bg-purple-950/80 text-purple-300 border border-purple-500/30",
                hoveredNode.state.status.toLowerCase() === "unknown" &&
                  "bg-amber-950/80 text-amber-300 border border-amber-500/30"
              )}
            >
              {hoveredNode.state.status}
            </span>
          </div>
          <div className="text-[11px] text-ink-ash mb-1.5 leading-snug">
            {hoveredNode.state.condition}
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-border-quiet text-[10px] font-mono text-ink-faint">
            <span>Intro Ch {hoveredNode.firstChapter}</span>
            <span className="text-sky-400">Click to view dossier →</span>
          </div>
        </div>
      )}

      {/* Floating Interactive Tooltip for Hovered Edge */}
      {hoveredConn && (
        <div
          className="pointer-events-none absolute z-30 px-3.5 py-2.5 rounded-lg bg-surface-card/95 backdrop-blur-md border border-border-quiet shadow-2xl text-xs max-w-xs transition-opacity duration-150 animate-in fade-in"
          style={{
            left: Math.max(20, Math.min(mousePos.x + 16, (containerRef.current?.clientWidth || 800) - 280)),
            top: Math.max(20, Math.min(mousePos.y + 16, (containerRef.current?.clientHeight || 600) - 140)),
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-serif font-bold text-ink-parchment text-xs">
              {hoveredConn.characterAName} ↔ {hoveredConn.characterBName}
            </span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold",
                hoveredConn.visualTone === "friction" &&
                  "bg-rose-950/80 text-rose-300 border border-rose-500/30",
                hoveredConn.visualTone === "warmth" &&
                  "bg-amber-950/80 text-amber-300 border border-amber-500/30",
                hoveredConn.visualTone === "neutral" &&
                  "bg-surface-elevated text-ink-ash border border-border-quiet"
              )}
            >
              {hoveredConn.visualTone}
            </span>
          </div>
          <div className="text-[11px] text-ink-bone mb-1 font-sans">
            {hoveredConn.records.map((r) => r.relation).join(" / ")}
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-border-quiet text-[10px] font-mono text-ink-faint">
            <span>
              {hoveredConn.records.length} record
              {hoveredConn.records.length > 1 ? "s" : ""}{" "}
              {hoveredConn.isReciprocal ? "(reciprocal)" : ""}
            </span>
            <span className="text-sky-400">Click to inspect →</span>
          </div>
        </div>
      )}

      {/* Floating Canvas Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 p-1.5 bg-surface-card/90 backdrop-blur-md rounded-lg border border-border-quiet shadow-xl text-ink-ash">
        <button
          onClick={handleZoomIn}
          className="p-2 rounded hover:bg-surface-elevated hover:text-ink-parchment transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={handleZoomOut}
          className="p-2 rounded hover:bg-surface-elevated hover:text-ink-parchment transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="w-full h-px bg-border-quiet my-0.5" />

        <button
          onClick={handleFitView}
          className="p-2 rounded hover:bg-surface-elevated hover:text-ink-parchment transition-colors"
          title="Fit Graph to Viewport"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleFitCenter}
          className="p-2 rounded hover:bg-surface-elevated hover:text-ink-parchment transition-colors"
          title="Center Network"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Legend & Visual Tone Guide */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex flex-wrap items-center gap-3.5 px-3.5 py-2 bg-surface-card/90 backdrop-blur-md rounded-lg border border-border-quiet text-xs font-mono text-ink-ash">
        {/* Status indicator colors */}
        <span className="text-ink-faint">Status:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-emerald-300 text-[11px]">Alive</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-zinc-400" />
          <span className="text-zinc-300 text-[11px]">Deceased</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-purple-300 text-[11px]">Stasis</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-amber-300 text-[11px]">Unknown</span>
        </div>

        <div className="w-px h-3.5 bg-border-quiet" />

        {/* Tone indicator colors */}
        <span className="text-ink-faint">Tones:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span className="text-rose-300 text-[11px]">Friction</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-amber-300 text-[11px]">Warmth</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          <span className="text-slate-300 text-[11px]">Neutral</span>
        </div>
        <div className="border-l border-border-quiet pl-2.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
          <span>Drag node • Scroll zoom</span>
        </div>
      </div>
    </div>
  );
}
