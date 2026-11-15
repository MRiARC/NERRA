/**
 * AntV G6 5.x Adapter for Nera's Character Network.
 *
 * Pure, decoupled mapping layer between Character Network Contract DTOs
 * (`CharacterNetworkGraph`, `VisualConnection`, `CharacterNetworkNode`) and
 * AntV G6 5.x Graph data & options specifications.
 *
 * Guarantees:
 * 1. Independent of API, backend, or database logic.
 * 2. VisualTone-based edge styling preserving underlying sentiments and directional records.
 * 3. Force-directed physics layout with spacing and collision avoidance.
 * 4. Cinematic dark editorial design palette.
 */

import type {
  CharacterNetworkGraph,
  CharacterNetworkNode,
  VisualConnection,
  VisualTone,
} from "./types.ts";

/**
 * Editorial color palette for Nera's Dark Obsidian theme.
 */
export const EDITORIAL_PALETTE = {
  background: "#090b0e",
  canvasMuted: "#111419",
  panelBackground: "#13171f",
  panelBorder: "#1e2430",
  // Node Status Accents
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
      stroke: "#a855f7", // Temporal purple / void violet
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
  // Visual Tone Edge Colors
  tone: {
    friction: {
      stroke: "#ef4444", // Carmine Red
      glow: "rgba(239, 68, 68, 0.35)",
      contrastText: "#fca5a5",
    },
    warmth: {
      stroke: "#f59e0b", // Antique Gold
      glow: "rgba(245, 158, 11, 0.3)",
      contrastText: "#fde68a",
    },
    neutral: {
      stroke: "#64748b", // Silver Slate
      glow: "rgba(100, 116, 139, 0.2)",
      contrastText: "#cbd5e1",
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
  statusFilter?: string; // "all" | "alive" | "deceased" | "incapacitated" | "unknown"
  toneFilter?: string; // "all" | "friction" | "warmth" | "neutral"
}

/**
 * Transforms verbose database relationship strings into clean, concise editorial tags.
 */
export function formatRelationLabel(relation: string): string {
  const PRETTY_MAP: Record<string, string> = {
    "adversarial-final confrontation": "Final Battle",
    "collaborative-sacrificial": "Sacrifice",
    "adversarial-combat": "Combat",
    "adversarial-sabotage": "Sabotage",
    "allied-companionship": "Allies",
    "ceremonial-formal": "Ceremony",
    "mentor-student": "Mentorship",
    "hierarchical": "Inquisition",
    "familial": "Family",
    "identity-revelation": "Revelation",
    "protector-protected": "Protector",
    "adversarial-mutiny": "Mutiny",
  };
  if (PRETTY_MAP[relation]) return PRETTY_MAP[relation];
  return relation
    .replace(/^([a-z]+)-/i, "")
    .split(/[-_ ]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Resolves character initials for center node icon display.
 */
export function getCharacterInitials(name: string): string {
  const INITIALS_MAP: Record<string, string> = {
    "Corin Vance": "CV",
    "Lady Vespera Thorne": "VT",
    "High Inquisitor Malakor": "M",
    "Silas Vance": "SV",
    "Master Artificer Voss": "KV",
    "Kaelen Voss": "KV",
    "Elowen": "E",
    "Blind Astrologer Elyon": "EL",
    "Lord Julian": "LJ",
  };
  if (INITIALS_MAP[name]) return INITIALS_MAP[name];
  const clean = name
    .replace(/^(Lady|Lord|High Inquisitor|Master|Artificer|Blind Astrologer)\s+/i, "")
    .trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export interface G6NodeModel {
  id: string;
  data: {
    rawNode: CharacterNetworkNode;
    name: string;
    status: string;
    condition: string;
    degree: number;
    connectionsCount: number;
    firstChapter: number;
    aliases: string[];
    description: string;
    statusTransition: CharacterNetworkNode["state"]["statusTransition"];
    knownRevelations: CharacterNetworkNode["state"]["knownRevelations"];
  };
  style: {
    size: number;
    fill: string;
    stroke: string;
    lineWidth: number;
    labelText: string;
    labelFill: string;
    labelFontSize: number;
    labelFontWeight: string;
    labelPlacement: "bottom" | "top";
    labelOffsetY: number;
    labelBackground?: boolean;
    labelBackgroundFill?: string;
    labelBackgroundPadding?: number[];
    labelBackgroundRadius?: number;
    badgeText?: string;
    badgeFill?: string;
    badges?: Array<{
      text: string;
      placement?: "top" | "bottom" | "left" | "right";
      fill?: string;
      fontSize?: number;
      fontFamily?: string;
      fontWeight?: string;
      backgroundFill?: string;
      backgroundPadding?: number[];
      backgroundRadius?: number;
      offsetY?: number;
    }>;
    iconText?: string;
    iconFill?: string;
    iconFontSize?: number;
    iconFontWeight?: string;
    iconFontFamily?: string;
    halo?: boolean;
    haloStroke?: string;
    haloLineWidth?: number;
    haloOpacity?: number;
    opacity: number;
    cursor: "pointer";
  };
}

export interface G6EdgeModel {
  id: string;
  source: string;
  target: string;
  data: {
    rawConnection: VisualConnection;
    visualTone: VisualTone;
    recordsCount: number;
    isReciprocal: boolean;
    sentimentDistribution: string[];
    relationsSummary: string;
    records: VisualConnection["records"];
  };
  style: {
    stroke: string;
    lineWidth: number;
    lineDash?: number[];
    opacity: number;
    cursor: "pointer";
    labelText?: string;
    labelFill?: string;
    labelFontSize?: number;
    labelFontWeight?: "bold" | "normal" | number;
    labelBackground?: boolean;
    labelBackgroundFill?: string;
    labelBackgroundStroke?: string;
    labelBackgroundLineWidth?: number;
    labelBackgroundPadding?: number[];
    labelBackgroundRadius?: number;
    endArrow?: boolean;
    startArrow?: boolean;
    type?: string;
    curveOffset?: number;
    curvePosition?: number;
  };
}

export interface G6GraphData {
  nodes: G6NodeModel[];
  edges: G6EdgeModel[];
}

/**
 * Determines node accent styles based on character physical status.
 */
function getNodeStatusStyle(status: string) {
  const norm = status.toLowerCase();
  if (norm.includes("deceased") || norm.includes("dead")) {
    return EDITORIAL_PALETTE.status.deceased;
  }
  if (norm.includes("incapacitated") || norm.includes("stasis")) {
    return EDITORIAL_PALETTE.status.incapacitated;
  }
  if (norm.includes("unknown") || norm.includes("missing")) {
    return EDITORIAL_PALETTE.status.unknown;
  }
  return EDITORIAL_PALETTE.status.alive;
}

/**
 * Maps a chapter-scoped Character Network Graph into AntV G6 5.x specification.
 */
export function mapToG6GraphData(
  graph: CharacterNetworkGraph,
  options: G6AdapterOptions = {}
): G6GraphData {
  const {
    selectedNodeId,
    selectedConnectionId,
    hoveredNodeId,
    searchQuery = "",
    statusFilter = "all",
    toneFilter = "all",
  } = options;

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // 1. Calculate node degrees from active visual connections
  const degreeMap = new Map<string, number>();
  for (const conn of graph.connections) {
    degreeMap.set(conn.characterAId, (degreeMap.get(conn.characterAId) || 0) + 1);
    degreeMap.set(conn.characterBId, (degreeMap.get(conn.characterBId) || 0) + 1);
  }

  // 2. Identify active focus / neighbors for spotlight dimming
  const focusNodeId = hoveredNodeId || selectedNodeId;
  const connectedNeighbors = new Set<string>();
  if (focusNodeId) {
    connectedNeighbors.add(focusNodeId);
    for (const conn of graph.connections) {
      if (conn.characterAId === focusNodeId) connectedNeighbors.add(conn.characterBId);
      if (conn.characterBId === focusNodeId) connectedNeighbors.add(conn.characterAId);
    }
  }

  // 3. Filter and build G6 Nodes
  const nodes: G6NodeModel[] = [];
  const includedNodeIds = new Set<string>();

  for (const node of graph.nodes) {
    // Status filter
    const statusNorm = node.state.status.toLowerCase();
    if (statusFilter !== "all" && statusNorm !== statusFilter) {
      continue;
    }

    // Search query filter (matches name, aliases, description)
    if (normalizedQuery) {
      const matchesName = node.name.toLowerCase().includes(normalizedQuery);
      const matchesAlias = node.aliases.some((a) =>
        a.toLowerCase().includes(normalizedQuery)
      );
      const matchesDesc = node.description.toLowerCase().includes(normalizedQuery);
      if (!matchesName && !matchesAlias && !matchesDesc) {
        continue;
      }
    }

    includedNodeIds.add(node.id);
    const degree = degreeMap.get(node.id) || 0;
    const statusStyle = getNodeStatusStyle(node.state.status);

    const isSelected = selectedNodeId === node.id;
    const isHovered = hoveredNodeId === node.id;
    const isFocusNeighbor = focusNodeId ? connectedNeighbors.has(node.id) : true;

    // Count chapter-scoped self-loops for this character
    let selfLoopsCount = 0;
    if (graph.dataQualityIssues) {
      for (const issue of graph.dataQualityIssues) {
        if (issue.code === "SELF_LOOP" && issue.characterId === node.id) {
          selfLoopsCount++;
        }
      }
    }

    // Node opacity: dimmed if not part of current focus cluster
    const opacity = focusNodeId ? (isFocusNeighbor ? 1 : 0.22) : 1;
    // Node size scales gently with degree
    const size = 58 + Math.min(degree * 3, 16);

    const badges: any[] = [
      {
        text: node.state.status.toUpperCase(),
        placement: "top",
        fill: "#ffffff",
        fontSize: 9,
        fontFamily: "monospace",
        fontWeight: "600",
        backgroundFill: statusStyle.badge,
        backgroundPadding: [1, 5],
        backgroundRadius: 4,
        offsetY: -4,
      },
    ];

    if (selfLoopsCount > 0) {
      badges.push({
        text: `↺ ${selfLoopsCount} SELF`,
        placement: "right",
        fill: "#fde68a",
        fontSize: 8.5,
        fontFamily: "monospace",
        fontWeight: "700",
        backgroundFill: "#1e1810",
        backgroundStroke: "#d97706",
        backgroundLineWidth: 1,
        backgroundPadding: [1, 4],
        backgroundRadius: 4,
        offsetX: 4,
      });
    }

    nodes.push({
      id: node.id,
      data: {
        rawNode: node,
        name: node.name,
        status: node.state.status,
        condition: node.state.condition,
        degree,
        connectionsCount: degree,
        firstChapter: node.firstChapter,
        aliases: node.aliases,
        description: node.description,
        statusTransition: node.state.statusTransition,
        knownRevelations: node.state.knownRevelations,
      },
      style: {
        size,
        fill: isSelected ? "#1e2430" : statusStyle.fill,
        stroke: isSelected ? "#ffffff" : isHovered ? "#38bdf8" : statusStyle.stroke,
        lineWidth: isSelected ? 3.5 : isHovered ? 2.5 : 2,
        halo: true,
        haloStroke: isSelected ? "#38bdf8" : statusStyle.stroke,
        haloLineWidth: isSelected ? 8 : 4,
        haloOpacity: isSelected ? 0.4 : 0.2,
        iconText: getCharacterInitials(node.name),
        iconFill: isSelected ? "#ffffff" : "#f1f5f9",
        iconFontSize: 15,
        iconFontWeight: "700",
        iconFontFamily: "sans-serif",
        badges,
        labelText: node.name,
        labelFill: isSelected ? "#ffffff" : EDITORIAL_PALETTE.text.primary,
        labelFontSize: isSelected ? 13 : 12,
        labelFontWeight: isSelected ? "700" : "600",
        labelPlacement: "bottom",
        labelOffsetY: 8,
        labelBackground: true,
        labelBackgroundFill: "#090b0e",
        labelBackgroundPadding: [2, 6],
        labelBackgroundRadius: 4,
        badgeText: node.state.status.toUpperCase(),
        badgeFill: statusStyle.badge,
        opacity,
        cursor: "pointer",
      },
    });
  }

  // 4. Filter and build G6 Edges
  const edges: G6EdgeModel[] = [];

  for (let index = 0; index < graph.connections.length; index++) {
    const conn = graph.connections[index];
    // Both endpoints must be currently visible
    if (!includedNodeIds.has(conn.characterAId) || !includedNodeIds.has(conn.characterBId)) {
      continue;
    }

    // Tone filter
    if (toneFilter !== "all" && conn.visualTone !== toneFilter) {
      continue;
    }

    const isConnSelected = selectedConnectionId === conn.connectionId;
    const isEndpointFocused =
      focusNodeId === conn.characterAId || focusNodeId === conn.characterBId;

    const toneConfig = EDITORIAL_PALETTE.tone[conn.visualTone];
    const edgeOpacity = focusNodeId ? (isEndpointFocused ? 1 : 0.12) : 0.85;

    // Stroke width reflects volume of bundled directional records
    const lineWidth = Math.max(2, Math.min(1 + conn.records.length, 5));
    const relationsSummary = Array.from(new Set(conn.records.map((r) => r.relation))).join(
      " / "
    );

    // Format clean, concise editorial label tag to eliminate text collisions
    const primaryRelation = conn.records[0]?.relation || relationsSummary;
    const formattedTag = formatRelationLabel(primaryRelation);
    const prettyLabel =
      conn.records.length > 1 ? `${formattedTag} +${conn.records.length - 1}` : formattedTag;

    // Alternate curve offsets to avoid overlapping splines between nearby nodes
    const baseOffset = conn.isReciprocal ? 32 : 24;
    const curveOffset = (index % 2 === 0 ? 1 : -1) * baseOffset;

    edges.push({
      id: conn.connectionId,
      source: conn.characterAId,
      target: conn.characterBId,
      data: {
        rawConnection: conn,
        visualTone: conn.visualTone,
        recordsCount: conn.records.length,
        isReciprocal: conn.isReciprocal,
        sentimentDistribution: conn.sentimentDistribution,
        relationsSummary,
        records: conn.records,
      },
      style: {
        stroke: isConnSelected ? "#ffffff" : toneConfig.stroke,
        lineWidth: isConnSelected ? lineWidth + 2 : lineWidth,
        lineDash: conn.isReciprocal ? [5, 4] : undefined,
        opacity: edgeOpacity,
        cursor: "pointer",
        labelText: prettyLabel,
        labelFill: toneConfig.contrastText,
        labelFontSize: 11,
        labelFontWeight: "bold",
        labelBackground: true,
        labelBackgroundFill: "#090b0e",
        labelBackgroundStroke: toneConfig.stroke,
        labelBackgroundLineWidth: 1,
        labelBackgroundPadding: [2, 5],
        labelBackgroundRadius: 4,
        endArrow: !conn.isReciprocal,
        type: "quadratic",
        curveOffset,
        curvePosition: 0.5,
      },
    });
  }

  return { nodes, edges };
}

/**
 * Returns force-directed AntV G6 5.x graph configuration.
 */
export function getG6GraphConfig(
  container: HTMLElement,
  width: number,
  height: number
) {
  const effectiveHeight = Math.max(400, height);
  const centerY = effectiveHeight / 2;

  return {
    container,
    width,
    height: effectiveHeight,
    autoFit: {
      type: "view" as const,
      options: {
        when: "overflow" as const,
        direction: "both" as const,
      },
    },
    padding: [40, 60, 40, 60],
    animation: true,
    zoomRange: [0.3, 2.0] as [number, number],
    layout: {
      type: "d3-force",
      preventOverlap: true,
      nodeSize: 85,
      linkDistance: 270,
      nodeStrength: -750,
      edgeStrength: 0.25,
      collideStrength: 1,
      alphaMin: 0.001,
      centerY,
      centerStrength: 0.03,
      y: {
        y: centerY,
        strength: 0.04,
      },
    },
    node: {
      type: "circle",
      style: (model: any) => ({
        ...model.style,
      }),
      state: {
        selected: {
          lineWidth: 4,
          stroke: "#ffffff",
          halo: true,
          haloStroke: "#38bdf8",
          haloLineWidth: 10,
          haloOpacity: 0.5,
        },
        active: {
          lineWidth: 3.5,
          stroke: "#38bdf8",
          halo: true,
          haloStroke: "#38bdf8",
          haloLineWidth: 6,
          haloOpacity: 0.4,
        },
      },
    },
    edge: {
      type: "quadratic",
      style: (model: any) => ({
        ...model.style,
      }),
      state: {
        selected: {
          lineWidth: 4.5,
          stroke: "#ffffff",
          halo: true,
          haloStroke: "#ffffff",
          haloLineWidth: 8,
          haloOpacity: 0.45,
        },
        active: {
          lineWidth: 4,
          stroke: "#38bdf8",
          halo: true,
          haloStroke: "#38bdf8",
          haloLineWidth: 7,
          haloOpacity: 0.45,
          labelFill: "#ffffff",
          labelFontSize: 12,
          labelFontWeight: "bold" as const,
        },
      },
    },
    behaviors: [
      { type: "drag-canvas" },
      { type: "zoom-canvas", maxZoom: 2.0, minZoom: 0.3 },
      { type: "drag-element" },
      { type: "hover-activate", degree: 0 },
      { type: "auto-adapt-label", padding: 4 },
    ],
  };
}
