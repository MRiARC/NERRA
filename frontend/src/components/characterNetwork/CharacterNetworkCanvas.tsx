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
  hoveredNodeId?: string | null;
  searchQuery: string;
  statusFilter: string;
  toneFilter: string;
  onSelectNode: (nodeId: string | null) => void;
  onSelectConnection: (connectionId: string | null) => void;
  onHoverNode?: (nodeId: string | null) => void;
}

export const CharacterNetworkCanvas = React.memo(function CharacterNetworkCanvas({
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
  const tooltipRef = useRef<HTMLDivElement>(null);
  const graphInstanceRef = useRef<any>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [localHoveredNodeId, setLocalHoveredNodeId] = useState<string | null>(null);
  const [localHoveredEdgeId, setLocalHoveredEdgeId] = useState<string | null>(null);
  const previousNodeIdsRef = useRef<Set<string>>(new Set());
  const previousEdgeIdsRef = useRef<Set<string>>(new Set());
  const updateSeqRef = useRef<number>(0);
  const isUpdatingRef = useRef(false);
  const nextUpdateParamsRef = useRef<any>(null);

  // Fast GPU tooltip positioning without triggering React component re-renders
  const updateTooltipPosition = (clientX: number, clientY: number) => {
    if (tooltipRef.current && containerRef.current) {
      const maxX = (containerRef.current.clientWidth || 800) - 290;
      const maxY = (containerRef.current.clientHeight || 600) - 150;
      const clampedX = Math.max(16, Math.min(clientX + 16, maxX));
      const clampedY = Math.max(16, Math.min(clientY + 16, maxY));
      tooltipRef.current.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
    }
  };

  // Active hover targets for floating HUD tooltips
  const hoveredNode = useMemo(() => {
    const activeId = localHoveredNodeId || hoveredNodeId;
    if (!activeId) return null;
    return graphData.nodes.find((n) => n.id === activeId) || null;
  }, [graphData.nodes, localHoveredNodeId, hoveredNodeId]);

  const hoveredConn = useMemo(() => {
    if (!localHoveredEdgeId) return null;
    return (
      graphData.connections.find((c) => c.connectionId === localHoveredEdgeId) || null
    );
  }, [graphData.connections, localHoveredEdgeId]);

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
      previousEdgeIdsRef.current = new Set(g6Data.edges.map((e) => e.id));
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

      // Helper to accurately resolve graph node/edge IDs across @antv/g DisplayObject hierarchies
      const resolveNodeId = (e: any): string | null => {
        let curr = e?.target;
        while (curr) {
          if (curr.id) {
            try {
              if (graph.getNodeData(curr.id)) return String(curr.id);
            } catch {}
          }
          curr = curr.parentNode || curr.parentElement;
        }
        return e?.target?.id || e?.targetId || null;
      };

      const resolveEdgeId = (e: any): string | null => {
        let curr = e?.target;
        while (curr) {
          if (curr.id) {
            try {
              if (graph.getEdgeData(curr.id)) return String(curr.id);
            } catch {}
          }
          curr = curr.parentNode || curr.parentElement;
        }
        return e?.target?.id || e?.targetId || null;
      };

      // Register Interactive Events
      graph.on(NodeEvent.CLICK, (e: any) => {
        const id = resolveNodeId(e);
        if (id) {
          onSelectNode(id);
          onSelectConnection(null);
        }
      });

      graph.on(EdgeEvent.CLICK, (e: any) => {
        const id = resolveEdgeId(e);
        if (id) {
          onSelectConnection(id);
          onSelectNode(null);
        }
      });

      graph.on(CanvasEvent.CLICK, (e: any) => {
        // Only clear selection if click hit the background canvas directly
        if (!e.targetType || e.targetType === "canvas") {
          onSelectNode(null);
          onSelectConnection(null);
        }
      });

      // Hover feedback and cursor states — Scene-graph native with hover intent dwell
      graph.on(NodeEvent.POINTER_ENTER, (e: any) => {
        const id = resolveNodeId(e);
        updateCursor("grab");
        if (id) {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = setTimeout(() => {
            setLocalHoveredNodeId(id);
            setLocalHoveredEdgeId(null);
          }, 120);
          const clientX = e.clientX ?? e.client?.x ?? e.canvas?.x;
          const clientY = e.clientY ?? e.client?.y ?? e.canvas?.y;
          if (clientX != null && clientY != null) {
            updateTooltipPosition(clientX, clientY);
          }
        }
      });

      graph.on(NodeEvent.POINTER_MOVE, (e: any) => {
        const clientX = e.clientX ?? e.client?.x ?? e.canvas?.x;
        const clientY = e.clientY ?? e.client?.y ?? e.canvas?.y;
        if (clientX != null && clientY != null) {
          updateTooltipPosition(clientX, clientY);
        }
      });

      graph.on(NodeEvent.POINTER_LEAVE, () => {
        updateCursor("default");
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        setLocalHoveredNodeId(null);
      });

      graph.on(NodeEvent.DRAG_START, () => {
        updateCursor("grabbing");
      });

      graph.on(NodeEvent.DRAG_END, () => {
        updateCursor("grab");
      });

      graph.on(EdgeEvent.POINTER_ENTER, (e: any) => {
        const id = resolveEdgeId(e);
        updateCursor("pointer");
        if (id) {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = setTimeout(() => {
            setLocalHoveredEdgeId(id);
            setLocalHoveredNodeId(null);
          }, 120);
          const clientX = e.clientX ?? e.client?.x ?? e.canvas?.x;
          const clientY = e.clientY ?? e.client?.y ?? e.canvas?.y;
          if (clientX != null && clientY != null) {
            updateTooltipPosition(clientX, clientY);
          }
        }
      });

      graph.on(EdgeEvent.POINTER_MOVE, (e: any) => {
        const clientX = e.clientX ?? e.client?.x ?? e.canvas?.x;
        const clientY = e.clientY ?? e.client?.y ?? e.canvas?.y;
        if (clientX != null && clientY != null) {
          updateTooltipPosition(clientX, clientY);
        }
      });

      graph.on(EdgeEvent.POINTER_LEAVE, () => {
        updateCursor("default");
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        setLocalHoveredEdgeId(null);
      });

      graphInstanceRef.current = graph;
      setIsRendered(true);
    });

    return () => {
      isMounted = false;
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
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

  // Update G6 graph sequentially when data, selection, or filters change
  useEffect(() => {
    const graph = graphInstanceRef.current;
    if (!graph || !isRendered) return;

    nextUpdateParamsRef.current = {
      graphData,
      selectedNodeId,
      selectedConnectionId,
      hoveredNodeId: null, // GPU scene-graph handles hover spotlighting directly
      searchQuery,
      statusFilter,
      toneFilter,
    };

    if (isUpdatingRef.current) {
      return;
    }

    async function processQueue() {
      if (!graph || isUpdatingRef.current) return;
      isUpdatingRef.current = true;

      while (nextUpdateParamsRef.current) {
        const params = nextUpdateParamsRef.current;
        nextUpdateParamsRef.current = null;

        const g6Data = mapToG6GraphData(params.graphData, {
          selectedNodeId: params.selectedNodeId,
          selectedConnectionId: params.selectedConnectionId,
          hoveredNodeId: params.hoveredNodeId,
          searchQuery: params.searchQuery,
          statusFilter: params.statusFilter,
          toneFilter: params.toneFilter,
        });

        const currentNodeIds = new Set(g6Data.nodes.map((n) => n.id));
        const currentEdgeIds = new Set(g6Data.edges.map((e) => e.id));
        const hasStructureChanged =
          previousNodeIdsRef.current.size !== currentNodeIds.size ||
          [...currentNodeIds].some((id) => !previousNodeIdsRef.current.has(id)) ||
          previousEdgeIdsRef.current.size !== currentEdgeIds.size ||
          [...currentEdgeIds].some((id) => !previousEdgeIdsRef.current.has(id));

        // Capture currently simulated coordinates from the live G6 graph.
        // This prevents node positions from being wiped or resetting to undefined/NaN
        // during style-only updates (such as hover highlight, click selection, or dimming).
        try {
          const currentNodes = graph.getNodeData();
          if (Array.isArray(currentNodes)) {
            const posMap = new Map<string, { x: number; y: number }>();
            for (const n of currentNodes) {
              if (
                n &&
                n.id &&
                n.style &&
                typeof n.style.x === "number" &&
                !isNaN(n.style.x) &&
                typeof n.style.y === "number" &&
                !isNaN(n.style.y)
              ) {
                posMap.set(String(n.id), { x: n.style.x, y: n.style.y });
              }
            }
            for (const node of g6Data.nodes) {
              const pos = posMap.get(String(node.id));
              if (pos) {
                (node.style as any).x = pos.x;
                (node.style as any).y = pos.y;
              }
            }
          }
        } catch (posErr) {
          console.warn("Could not capture node coordinates:", posErr);
        }

        try {
          if (hasStructureChanged) {
            graph.setData(g6Data);
            await graph.render();
          } else {
            graph.updateData(g6Data);
            await graph.draw({ animation: false });
          }
          previousNodeIdsRef.current = currentNodeIds;
          previousEdgeIdsRef.current = currentEdgeIds;
        } catch (err) {
          console.warn("G6 re-render warning:", err);
        }
      }

      isUpdatingRef.current = false;
    }

    processQueue();
  }, [
    graphData,
    selectedNodeId,
    selectedConnectionId,
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
    <div className="relative w-full h-full min-h-[500px] overflow-hidden bg-surface-void select-none">
      {/* G6 Graph Container */}
      <div
        ref={containerRef}
        className="w-full h-full"
      />

      {/* Floating Interactive Tooltip using GPU translate3d (Zero React re-render overhead) */}
      <div
        ref={tooltipRef}
        className={cn(
          "pointer-events-none absolute z-30 top-0 left-0 transition-opacity duration-150 will-change-transform",
          hoveredNode || hoveredConn ? "opacity-100" : "opacity-0"
        )}
        style={{ transform: "translate3d(-9999px, -9999px, 0)" }}
      >
        {hoveredNode && (
          <div className="px-3.5 py-2.5 rounded-lg bg-surface-card/95 backdrop-blur-md border border-border-quiet shadow-2xl text-xs max-w-xs animate-in fade-in">
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
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(hoveredNode.id);
                  onSelectConnection(null);
                }}
                className="text-sky-400 hover:text-sky-300 pointer-events-auto cursor-pointer underline-offset-2 hover:underline"
              >
                Click to view dossier →
              </button>
            </div>
          </div>
        )}

        {hoveredConn && !hoveredNode && (
          <div className="px-3.5 py-2.5 rounded-lg bg-surface-card/95 backdrop-blur-md border border-border-quiet shadow-2xl text-xs max-w-xs animate-in fade-in">
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
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectConnection(hoveredConn.connectionId);
                  onSelectNode(null);
                }}
                className="text-sky-400 hover:text-sky-300 pointer-events-auto cursor-pointer underline-offset-2 hover:underline"
              >
                Click to inspect →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Canvas Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 p-1.5 bg-surface-elevated/80 backdrop-blur-md rounded-xl border border-border-quiet/80 shadow-xl text-ink-ash">
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-lg hover:bg-surface-card hover:text-ink-parchment transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-lg hover:bg-surface-card hover:text-ink-parchment transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="w-full h-px bg-border-quiet/60 my-0.5" />

        <button
          onClick={handleFitView}
          className="p-1.5 rounded-lg hover:bg-surface-card hover:text-ink-parchment transition-colors"
          title="Fit Graph to Viewport"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleFitCenter}
          className="p-1.5 rounded-lg hover:bg-surface-card hover:text-ink-parchment transition-colors"
          title="Center Network"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
