"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoryGraphData } from "@/lib/storyGraph/types";
import {
  getG6GraphConfig,
  mapToG6GraphData,
  type G6AdapterOptions,
} from "@/lib/storyGraph/g6Adapter";

export interface StoryGraphCanvasProps {
  graphData: StoryGraphData;
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

export const StoryGraphCanvas = React.memo(function StoryGraphCanvas({
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
}: StoryGraphCanvasProps) {
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

    const initGraph = async () => {
      try {
        const { Graph } = await import("@antv/g6");
        if (!isMounted || !containerRef.current) return;

        const width = containerRef.current.clientWidth || 1000;
        const height = containerRef.current.clientHeight || 660;

        const adapterOptions: G6AdapterOptions = {
          selectedNodeId,
          selectedConnectionId,
          hoveredNodeId,
          searchQuery,
          statusFilter,
          toneFilter,
        };

        const g6Data = mapToG6GraphData(graphData, adapterOptions);
        const config = getG6GraphConfig(containerRef.current, width, height);

        graph = new Graph({
          ...config,
          data: g6Data,
        });

        // Resolve node ID robustly across G6 event payload and @antv/g DisplayObject hierarchy
        const resolveNodeId = (e: any): string | null => {
          if (!e) return null;
          // 1. Direct targetId on G6 event
          if (e.targetId && typeof e.targetId === "string") {
            return e.targetId;
          }
          // 2. Direct id on target
          const targetId = e.target?.id;
          if (targetId && typeof targetId === "string") {
            if (
              targetId.startsWith("char:") ||
              targetId.startsWith("obj:") ||
              targetId.startsWith("loc:") ||
              targetId.startsWith("event:")
            ) {
              return targetId;
            }
            try {
              if (graph.getNodeData(targetId)) return String(targetId);
            } catch {}
          }
          // 3. Recursive DisplayObject tree traversal
          let curr = e.target || e;
          while (curr) {
            const id = curr.id || curr.attributes?.id;
            if (id && typeof id === "string") {
              if (
                id.startsWith("char:") ||
                id.startsWith("obj:") ||
                id.startsWith("loc:") ||
                id.startsWith("event:")
              ) {
                return id;
              }
              try {
                if (graph.getNodeData(id)) return String(id);
              } catch {}
            }
            curr = curr.parentElement || curr.parentNode;
          }
          return null;
        };

        const resolveEdgeId = (e: any): string | null => {
          if (!e) return null;
          if (e.targetId && typeof e.targetId === "string" && e.targetId.includes("--")) {
            return e.targetId;
          }
          const targetId = e.target?.id;
          if (targetId && typeof targetId === "string" && targetId.includes("--")) {
            return targetId;
          }
          let curr = e.target || e;
          while (curr) {
            const id = curr.id || curr.attributes?.id;
            if (id && typeof id === "string") {
              if (id.includes("--")) return id;
              try {
                if (graph.getEdgeData(id)) return String(id);
              } catch {}
            }
            curr = curr.parentElement || curr.parentNode;
          }
          return null;
        };

        // Pointer event listeners — Scene-graph native event handling with hover intent dwell
        graph.on("node:pointerenter", (e: any) => {
          const nodeId = resolveNodeId(e);
          if (nodeId) {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = setTimeout(() => {
              setLocalHoveredNodeId(nodeId);
              setLocalHoveredEdgeId(null);
            }, 120);
            if (e.client) updateTooltipPosition(e.client.x, e.client.y);
          }
        });

        graph.on("node:pointermove", (e: any) => {
          if (e.client) updateTooltipPosition(e.client.x, e.client.y);
        });

        graph.on("node:pointerleave", () => {
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
          hoverTimeoutRef.current = setTimeout(() => {
            setLocalHoveredNodeId(null);
          }, 120);
        });

        graph.on("node:click", (e: any) => {
          const nodeId = resolveNodeId(e);
          if (nodeId) {
            onSelectNode(nodeId);
            onSelectConnection(null);
          }
        });

        graph.on("edge:pointerenter", (e: any) => {
          const edgeId = resolveEdgeId(e);
          if (edgeId) {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = setTimeout(() => {
              setLocalHoveredEdgeId(edgeId);
              setLocalHoveredNodeId(null);
            }, 120);
            if (e.client) updateTooltipPosition(e.client.x, e.client.y);
          }
        });

        graph.on("edge:pointermove", (e: any) => {
          if (e.client) updateTooltipPosition(e.client.x, e.client.y);
        });

        graph.on("edge:pointerleave", () => {
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
          hoverTimeoutRef.current = setTimeout(() => {
            setLocalHoveredEdgeId(null);
          }, 120);
        });

        graph.on("edge:click", (e: any) => {
          const edgeId = resolveEdgeId(e);
          if (edgeId) {
            onSelectConnection(edgeId);
            onSelectNode(null);
          }
        });

        graph.on("canvas:click", (e: any) => {
          if (e.targetType === "canvas" || e.target === graph.getCanvas?.()) {
            onSelectNode(null);
            onSelectConnection(null);
          }
        });

        await graph.render();

        if (isMounted) {
          graphInstanceRef.current = graph;
          setIsRendered(true);
          previousNodeIdsRef.current = new Set(g6Data.nodes.map((n: any) => n.id));
          previousEdgeIdsRef.current = new Set(g6Data.edges.map((e: any) => e.id));
        }
      } catch (err) {
        console.error("Failed to initialize Story Graph G6 instance:", err);
      }
    };

    initGraph();

    return () => {
      isMounted = false;
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (graphInstanceRef.current) {
        graphInstanceRef.current.destroy();
        graphInstanceRef.current = null;
      }
      setIsRendered(false);
    };
  }, []);

  // Sequential Update Queue Lock
  useEffect(() => {
    if (!graphInstanceRef.current || !isRendered) return;

    const currentSeq = ++updateSeqRef.current;
    const adapterOptions: G6AdapterOptions = {
      selectedNodeId,
      selectedConnectionId,
      hoveredNodeId: null, // Scene-graph handles hover spotlighting directly on GPU via hover-activate
      searchQuery,
      statusFilter,
      toneFilter,
    };

    nextUpdateParamsRef.current = { graphData, adapterOptions, seq: currentSeq };

    const processQueue = async () => {
      if (isUpdatingRef.current) return;
      isUpdatingRef.current = true;

      try {
        while (nextUpdateParamsRef.current) {
          const {
            graphData: data,
            adapterOptions: opts,
            seq,
          } = nextUpdateParamsRef.current;
          nextUpdateParamsRef.current = null;

          const g6 = graphInstanceRef.current;
          if (!g6 || g6.destroyed) break;

          const g6Data = mapToG6GraphData(data, opts);
          const currentNodes = new Set<string>(g6Data.nodes.map((n: any) => n.id));
          const currentEdges = new Set<string>(g6Data.edges.map((e: any) => e.id));

          const nodesChanged =
            currentNodes.size !== previousNodeIdsRef.current.size ||
            [...currentNodes].some((id) => !previousNodeIdsRef.current.has(id));

          const edgesChanged =
            currentEdges.size !== previousEdgeIdsRef.current.size ||
            [...currentEdges].some((id) => !previousEdgeIdsRef.current.has(id));

          if (nodesChanged || edgesChanged) {
            previousNodeIdsRef.current = currentNodes;
            previousEdgeIdsRef.current = currentEdges;
            g6.setData(g6Data);
            await g6.render();
          } else {
            g6.updateData(g6Data);
            await g6.draw();
          }

          if (nextUpdateParamsRef.current && nextUpdateParamsRef.current.seq > seq) {
            continue;
          }
        }
      } catch (err) {
        console.warn("Recovered from concurrent G6 frame update:", err);
      } finally {
        isUpdatingRef.current = false;
      }
    };

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

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !graphInstanceRef.current) return;
      const width = containerRef.current.clientWidth || 1000;
      const height = containerRef.current.clientHeight || 660;
      graphInstanceRef.current.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden bg-surface-void select-none">
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating GPU Tooltip */}
      <div
        ref={tooltipRef}
        onMouseEnter={() => {
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
        }}
        onMouseLeave={() => {
          setLocalHoveredNodeId(null);
          setLocalHoveredEdgeId(null);
        }}
        className={cn(
          "absolute z-30 top-0 left-0 transition-opacity duration-150 will-change-transform",
          hoveredNode || hoveredConn ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        style={{ transform: "translate3d(-9999px, -9999px, 0)" }}
      >
        {hoveredNode && (
          <div className="px-3.5 py-2.5 rounded-xl bg-surface-card/95 backdrop-blur-md border border-border-quiet shadow-2xl text-xs max-w-xs animate-in fade-in">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-serif font-bold text-ink-parchment text-sm">
                {hoveredNode.name}
              </span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold",
                  hoveredNode.kind === "character" &&
                    "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30",
                  hoveredNode.kind === "object" &&
                    "bg-amber-950/80 text-amber-300 border border-amber-500/30",
                  hoveredNode.kind === "location" &&
                    "bg-teal-950/80 text-teal-300 border border-teal-500/30",
                  hoveredNode.kind === "event" &&
                    "bg-rose-950/80 text-rose-300 border border-rose-500/30"
                )}
              >
                {hoveredNode.visualBadge}
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
                  e.preventDefault();
                  if (hoveredNode?.id) {
                    onSelectNode(hoveredNode.id);
                    onSelectConnection(null);
                  }
                }}
                className="text-sky-400 hover:text-sky-300 pointer-events-auto cursor-pointer underline-offset-2 hover:underline font-medium"
              >
                Inspect Dossier →
              </button>
            </div>
          </div>
        )}

        {hoveredConn && !hoveredNode && (
          <div className="px-3.5 py-2.5 rounded-xl bg-surface-card/95 backdrop-blur-md border border-border-quiet shadow-2xl text-xs max-w-xs animate-in fade-in">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-serif font-bold text-ink-parchment text-xs">
                {hoveredConn.sourceName} ↔ {hoveredConn.targetName}
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
                Inspect Link →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Canvas Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 p-1.5 bg-surface-elevated/80 backdrop-blur-md rounded-xl border border-border-quiet/80 shadow-xl text-ink-ash">
        <button
          onClick={() => graphInstanceRef.current?.zoomBy(1.15)}
          className="p-1.5 rounded-lg hover:bg-surface-card hover:text-ink-parchment transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={() => graphInstanceRef.current?.zoomBy(0.85)}
          className="p-1.5 rounded-lg hover:bg-surface-card hover:text-ink-parchment transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="w-full h-px bg-border-quiet/60 my-0.5" />

        <button
          onClick={() =>
            graphInstanceRef.current?.fitView({ when: "always", direction: "both" })
          }
          className="p-1.5 rounded-lg hover:bg-surface-card hover:text-ink-parchment transition-colors"
          title="Fit Graph to Viewport"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => graphInstanceRef.current?.fitCenter()}
          className="p-1.5 rounded-lg hover:bg-surface-card hover:text-ink-parchment transition-colors"
          title="Center Network"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
