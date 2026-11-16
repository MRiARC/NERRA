/**
 * AntV G6 5.x Adapter for Nera's World & Cast Network.
 *
 * Maps polymorphic StoryGraphData (Characters, Relics, Settings, Events, Connections)
 * into AntV G6 5.x graph data specifications and force-directed physics options.
 */

import type {
  StoryGraphData,
  StoryGraphNode,
  StoryGraphConnection,
  VisualTone,
  EntityKind,
} from "./types";

export const EDITORIAL_PALETTE = {
  background: "#090b0e",
  canvasMuted: "#111419",
  panelBackground: "#13171f",
  panelBorder: "#1e2430",
  // Status Accents
  status: {
    alive: {
      fill: "#131f18",
      stroke: "#10b981", // Emerald
      glow: "rgba(16, 185, 129, 0.25)",
      badge: "#059669",
    },
    deceased: {
      fill: "#18181b",
      stroke: "#71717a", // Zinc/Stone
      glow: "rgba(113, 113, 122, 0.2)",
      badge: "#52525b",
    },
    incapacitated: {
      fill: "#191627",
      stroke: "#a855f7", // Void violet / stasis
      glow: "rgba(168, 85, 247, 0.3)",
      badge: "#7e22ce",
    },
    unknown: {
      fill: "#1c1813",
      stroke: "#f59e0b", // Amber mystery
      glow: "rgba(245, 158, 11, 0.25)",
      badge: "#d97706",
    },
  },
  // World Entity Accents
  entity: {
    object: {
      fill: "#1c1813",
      stroke: "#f59e0b", // Gold/Amber relic
      glow: "rgba(245, 158, 11, 0.3)",
      badge: "#d97706",
    },
    location: {
      fill: "#0c1d18",
      stroke: "#059669", // Jade Setting
      glow: "rgba(5, 150, 105, 0.3)",
      badge: "#047857",
    },
    event: {
      fill: "#200d14",
      stroke: "#e11d48", // Rose Event
      glow: "rgba(225, 29, 72, 0.3)",
      badge: "#be123c",
    },
  },
  // Visual Tone Edge Colors
  tone: {
    friction: {
      stroke: "#ef4444",
      glow: "rgba(239, 68, 68, 0.35)",
      contrastText: "#fca5a5",
    },
    warmth: {
      stroke: "#f59e0b",
      glow: "rgba(245, 158, 11, 0.3)",
      contrastText: "#fde68a",
    },
    neutral: {
      stroke: "#64748b",
      glow: "rgba(100, 116, 139, 0.2)",
      contrastText: "#cbd5e1",
    },
    narrative_thread: {
      stroke: "#06b6d4",
      glow: "rgba(6, 182, 212, 0.35)",
      contrastText: "#a5f3fc",
    },
    custody: {
      stroke: "#d97706",
      glow: "rgba(217, 119, 6, 0.35)",
      contrastText: "#fde68a",
    },
    spatial: {
      stroke: "#10b981",
      glow: "rgba(16, 185, 129, 0.25)",
      contrastText: "#a7f3d0",
    },
  },
  text: {
    primary: "#f8fafc",
    secondary: "#94a3b8",
    muted: "#64748b",
  },
} as const;

export interface G6AdapterOptions {
  selectedNodeId?: string | null;
  selectedConnectionId?: string | null;
  hoveredNodeId?: string | null;
  searchQuery?: string;
  statusFilter?: string;
  toneFilter?: string;
}

export function formatRelationLabel(relation: string): string {
  if (!relation) return "";
  const parts = relation.split(/[-_/]+/).filter(Boolean);
  if (parts.length === 0) return relation;

  const formatted = parts.map(
    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  );

  if (parts.length > 1) {
    const category = parts[0].toLowerCase();
    const rest = formatted.slice(1).join(" ");
    if (
      [
        "adversarial",
        "collaborative",
        "allied",
        "ceremonial",
        "familial",
        "identity",
      ].includes(category) &&
      rest.length > 0
    ) {
      return rest;
    }
    return formatted.join(" / ");
  }

  return formatted[0];
}

export function getEntityInitials(name: string, kind: EntityKind): string {
  if (!name) return "";
  if (kind === "object") return "◆";
  if (kind === "location") return "⌂";
  if (kind === "event") return "⚡";

  const clean = name
    .replace(
      /^(Lord|Lady|Sir|Dame|Madam|Monsieur|Master|Artificer|Inquisitor|High Inquisitor|Grand|Blind|Astrologer|Archmage|Captain|Doctor|Dr|King|Queen|Prince|Princess|Warden|Brother|Father|Sister)\s+/gi,
      ""
    )
    .trim();

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return name.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Transforms StoryGraphData into G6 5.x GraphData.
 */
export function mapToG6GraphData(
  graphData: StoryGraphData,
  options: G6AdapterOptions = {}
): { nodes: any[]; edges: any[]; combos?: any[] } {
  const {
    selectedNodeId,
    selectedConnectionId,
    hoveredNodeId,
    searchQuery = "",
    statusFilter = "all",
    toneFilter = "all",
  } = options;

  const query = searchQuery.trim().toLowerCase();

  // 1. Filter Nodes
  const filteredNodes = graphData.nodes.filter((node) => {
    // Search query
    if (query) {
      const matchName = node.name.toLowerCase().includes(query);
      const matchAlias = node.state.aliases?.some((a) =>
        a.toLowerCase().includes(query)
      );
      const matchDesc = node.state.description?.toLowerCase().includes(query);
      if (!matchName && !matchAlias && !matchDesc) return false;
    }

    // Status filter (applies to character status or all for world entities)
    if (statusFilter !== "all" && node.kind === "character") {
      const nodeStatus = node.state.status.toLowerCase();
      if (nodeStatus !== statusFilter.toLowerCase()) return false;
    }

    return true;
  });

  const visibleNodeIdSet = new Set(filteredNodes.map((n) => n.id));

  // 2. Filter Connections
  const filteredConnections = graphData.connections.filter((conn) => {
    if (!visibleNodeIdSet.has(conn.sourceId) || !visibleNodeIdSet.has(conn.targetId)) {
      return false;
    }
    if (toneFilter !== "all" && conn.visualTone !== toneFilter) {
      return false;
    }
    return true;
  });

  // Calculate degree for dynamic node sizing
  const degreeMap = new Map<string, number>();
  for (const conn of filteredConnections) {
    degreeMap.set(conn.sourceId, (degreeMap.get(conn.sourceId) || 0) + 1);
    degreeMap.set(conn.targetId, (degreeMap.get(conn.targetId) || 0) + 1);
  }

  // Determine connected neighbors of selected or hovered node for spotlight dimming
  const activeFocusId = selectedNodeId || hoveredNodeId;
  const connectedNodeIds = new Set<string>();
  if (activeFocusId) {
    connectedNodeIds.add(activeFocusId);
    for (const conn of filteredConnections) {
      if (conn.sourceId === activeFocusId) connectedNodeIds.add(conn.targetId);
      if (conn.targetId === activeFocusId) connectedNodeIds.add(conn.sourceId);
    }
  }

  // 3. Map G6 Nodes
  const g6Nodes = filteredNodes.map((node) => {
    const isSelected = selectedNodeId === node.id;
    const isHovered = hoveredNodeId === node.id;
    const isFocused = isSelected || isHovered;
    const isDimmed = activeFocusId ? !connectedNodeIds.has(node.id) : false;

    const degree = degreeMap.get(node.id) || 0;
    const baseSize =
      node.kind === "character"
        ? Math.min(38, Math.max(26, 26 + degree * 2.2))
        : node.kind === "object"
        ? 24
        : node.kind === "location"
        ? 26
        : 22;

    const initials = getEntityInitials(node.name, node.kind);

    let themeStroke: string = node.visualColor;
    let themeFill: string = EDITORIAL_PALETTE.panelBackground;
    let themeBadge: string = node.visualBadge;

    if (node.kind === "character") {
      const s = node.state.status.toLowerCase();
      if (s === "deceased") {
        themeFill = EDITORIAL_PALETTE.status.deceased.fill;
        themeStroke = EDITORIAL_PALETTE.status.deceased.stroke;
      } else if (s === "incapacitated" || s === "stasis") {
        themeFill = EDITORIAL_PALETTE.status.incapacitated.fill;
        themeStroke = EDITORIAL_PALETTE.status.incapacitated.stroke;
      } else if (s === "unknown") {
        themeFill = EDITORIAL_PALETTE.status.unknown.fill;
        themeStroke = EDITORIAL_PALETTE.status.unknown.stroke;
      } else {
        themeFill = EDITORIAL_PALETTE.status.alive.fill;
        themeStroke = EDITORIAL_PALETTE.status.alive.stroke;
      }
    } else if (node.kind === "object") {
      themeFill = EDITORIAL_PALETTE.entity.object.fill;
      themeStroke = EDITORIAL_PALETTE.entity.object.stroke;
    } else if (node.kind === "location") {
      themeFill = EDITORIAL_PALETTE.entity.location.fill;
      themeStroke = EDITORIAL_PALETTE.entity.location.stroke;
    } else if (node.kind === "event") {
      themeFill = EDITORIAL_PALETTE.entity.event.fill;
      themeStroke = EDITORIAL_PALETTE.entity.event.stroke;
    }

    return {
      id: node.id,
      data: {
        rawId: node.rawId,
        name: node.name,
        kind: node.kind,
        state: node.state,
        firstChapter: node.firstChapter,
        lastChapter: node.lastChapter,
      },
      style: {
        type: "circle",
        size: baseSize * 2,
        fill: themeFill,
        stroke: isFocused ? "#f8fafc" : themeStroke,
        lineWidth: isFocused ? 2.5 : 1.5,
        opacity: isDimmed ? 0.25 : 1,
        cursor: "pointer",
        labelText: node.name,
        labelPlacement: "bottom",
        labelOffsetY: 8,
        labelFill: isDimmed ? "#475569" : EDITORIAL_PALETTE.text.primary,
        labelFontSize: isFocused ? 12 : 11,
        labelFontFamily: "Cinzel, Cormorant Garamond, serif",
        labelFontWeight: isFocused ? "600" : "400",
        labelBackground: true,
        labelBackgroundFill: "rgba(9, 11, 14, 0.85)",
        labelBackgroundRadius: 4,
        labelBackgroundPadding: [2, 6, 2, 6],
        iconText: initials,
        iconFill: isDimmed ? "#475569" : EDITORIAL_PALETTE.text.primary,
        iconFontSize: initials.length > 2 ? 10 : 12,
        iconFontFamily: "ui-monospace, SFMono-Regular, monospace",
        iconFontWeight: "700",
        badgeText: themeBadge,
        badgePosition: "top",
        badgeFill: themeStroke,
        badgeFontSize: 8,
        badgeFontFamily: "ui-monospace, monospace",
        badgeFontWeight: "600",
        badgeRadius: 3,
        badgePadding: [1, 4, 1, 4],
      },
    };
  });

  // 4. Map G6 Edges
  const g6Edges = filteredConnections.map((conn) => {
    const isSelected = selectedConnectionId === conn.connectionId;
    const isConnectedToFocus = activeFocusId
      ? conn.sourceId === activeFocusId || conn.targetId === activeFocusId
      : false;
    const isDimmed = activeFocusId ? !isConnectedToFocus : false;

    let strokeColor: string = EDITORIAL_PALETTE.tone.neutral.stroke;
    let lineDash: [number, number] | undefined = undefined;
    let lineWidth = 1.6;

    const isThread = conn.connectionTypes.includes("narrative_thread");
    const isCustody = conn.connectionTypes.includes("custody");
    const isSpatial = conn.connectionTypes.includes("spatial");

    if (isThread) {
      strokeColor = EDITORIAL_PALETTE.tone.narrative_thread.stroke;
      lineDash = [4, 4];
      lineWidth = 2.2;
    } else if (isCustody) {
      strokeColor = EDITORIAL_PALETTE.tone.custody.stroke;
      lineWidth = 2.0;
    } else if (isSpatial) {
      strokeColor = EDITORIAL_PALETTE.tone.spatial.stroke;
      lineDash = [2, 3];
      lineWidth = 1.5;
    } else if (conn.visualTone === "friction") {
      strokeColor = EDITORIAL_PALETTE.tone.friction.stroke;
      lineWidth = 2.4;
    } else if (conn.visualTone === "warmth") {
      strokeColor = EDITORIAL_PALETTE.tone.warmth.stroke;
      lineWidth = 2.0;
    }

    const primaryRecord = conn.records[0];
    const rawLabel = primaryRecord ? formatRelationLabel(primaryRecord.relation) : "";
    const extraCount = conn.records.length > 1 ? ` (+${conn.records.length - 1})` : "";
    const labelText = rawLabel ? `${rawLabel}${extraCount}` : "";

    return {
      id: conn.connectionId,
      source: conn.sourceId,
      target: conn.targetId,
      data: {
        connectionId: conn.connectionId,
        sourceName: conn.sourceName,
        targetName: conn.targetName,
        sourceKind: conn.sourceKind,
        targetKind: conn.targetKind,
        visualTone: conn.visualTone,
        records: conn.records,
        isReciprocal: conn.isReciprocal,
        connectionTypes: conn.connectionTypes,
      },
      style: {
        stroke: isSelected ? "#38bdf8" : strokeColor,
        lineWidth: isSelected ? 3.0 : lineWidth,
        lineDash,
        opacity: isDimmed ? 0.12 : isSelected ? 1 : 0.75,
        cursor: "pointer",
        labelText,
        labelFill: isDimmed ? "#334155" : EDITORIAL_PALETTE.text.secondary,
        labelFontSize: 9.5,
        labelFontFamily: "ui-monospace, SFMono-Regular, monospace",
        labelBackground: true,
        labelBackgroundFill: "rgba(9, 11, 14, 0.9)",
        labelBackgroundRadius: 3,
        labelBackgroundPadding: [1, 4, 1, 4],
        endArrow: conn.isReciprocal || isSpatial ? false : true,
        endArrowSize: 5,
      },
    };
  });

  return { nodes: g6Nodes, edges: g6Edges };
}

/**
 * Returns G6 Force-Directed Physics Graph Configuration.
 */
export function getG6GraphConfig(
  container: HTMLElement | string = "container",
  containerWidth: number = 1000,
  containerHeight: number = 660
): any {
  const cx = containerWidth / 2;
  const cy = containerHeight / 2;

  return {
    container,
    width: containerWidth,
    height: containerHeight,
    autoFit: "center",
    layout: {
      type: "d3-force",
      linkDistance: 130,
      nodeStrength: -320,
      edgeStrength: 0.25,
      center: [cx, cy],
      alphaDecay: 0.04,
      velocityDecay: 0.35,
    },
    behaviors: [
      { type: "drag-canvas" },
      { type: "zoom-canvas", maxZoom: 2.0, minZoom: 0.3 },
      { type: "drag-element" },
    ],
  };
}
