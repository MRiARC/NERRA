/**
 * Unified Story Graph & World and Cast Network Transformation Engine.
 *
 * Ingests relational story world data:
 * - Characters (Vitality, condition, aliases, traits)
 * - Interpersonal Relationships (Friction, warmth, evidence provenance)
 * - Story Objects / Relics (Custody, ownership, mentions)
 * - Locations / Settings (Spatial presence, lore)
 * - Major Events (Incident participation, occurrences)
 * - Narrative Plot Threads (Cross-chapter arcs and splines)
 *
 * Guarantees:
 * 1. Strict temporal chapter scoping [since_chapter <= currentChapter, until_chapter > currentChapter].
 * 2. Zero forward-data leakage.
 * 3. Dynamic Lens filtering: "cast", "relics", "geography", "full".
 * 4. Rich provenance with verbatim quotes and DB IDs.
 */

import type {
  StoryGraphData,
  StoryGraphNode,
  StoryGraphConnection,
  StoryConnectionRecord,
  StoryGraphMetadata,
  EntityKind,
  LensMode,
  VisualTone,
  ConnectionType,
} from "./types";
import type { RawCharacter, RawRelationship, NarrativeThreadLink } from "../characterNetwork/types";
import type { StoryGraph, GraphNode, GraphEdge } from "../types";

export interface TransformStoryGraphOptions {
  projectId: string;
  characters: RawCharacter[];
  relationships: RawRelationship[];
  storyGraph?: StoryGraph | null;
  narrativeThreads?: NarrativeThreadLink[];
  chapter: number;
  lensMode?: LensMode;
  connectionLayer?: "all" | "bonds" | "threads";
}

/**
 * Normalizes entity IDs to strip or harmonize prefixes (e.g., "char:uuid" -> "uuid").
 */
export function extractBareId(id: string): string {
  if (!id) return "";
  const parts = id.split(":");
  return parts.length > 1 ? parts.slice(1).join(":") : id;
}

/**
 * Canonical visual color mapping by entity kind and state.
 */
export function getEntityVisualTheme(
  kind: EntityKind,
  status?: string
): { color: string; badge: string } {
  switch (kind) {
    case "character": {
      const s = (status || "").toLowerCase();
      if (s === "deceased") {
        return { color: "#71717a", badge: "DECEASED" };
      }
      if (s === "incapacitated" || s === "stasis") {
        return { color: "#a855f7", badge: "STASIS" };
      }
      if (s === "unknown") {
        return { color: "#f59e0b", badge: "UNKNOWN" };
      }
      return { color: "#10b981", badge: "ALIVE" };
    }
    case "object":
      return { color: "#f59e0b", badge: "RELIC" };
    case "location":
      return { color: "#059669", badge: "SETTING" };
    case "event":
      return { color: "#e11d48", badge: "EVENT" };
  }
}

/**
 * Maps raw sentiment or relation semantic into a visual tone token.
 */
export function mapRelationToTone(relation: string, sentiment?: string): VisualTone {
  const relLower = (relation || "").toLowerCase();
  const sentLower = (sentiment || "").toLowerCase();

  if (
    sentLower.includes("hostile") ||
    sentLower.includes("friction") ||
    sentLower.includes("betray") ||
    sentLower.includes("adversar") ||
    sentLower.includes("enemy") ||
    relLower.includes("betray") ||
    relLower.includes("adversar") ||
    relLower.includes("rival") ||
    relLower.includes("interrogat")
  ) {
    return "friction";
  }

  if (
    sentLower.includes("warmth") ||
    sentLower.includes("trust") ||
    sentLower.includes("ally") ||
    sentLower.includes("collaborat") ||
    sentLower.includes("family") ||
    sentLower.includes("kin") ||
    relLower.includes("ally") ||
    relLower.includes("family") ||
    relLower.includes("wield") ||
    relLower.includes("possess")
  ) {
    return "warmth";
  }

  return "neutral";
}

/**
 * Transforms raw story world data into normalized StoryGraphData scoped to the given chapter.
 */
export function transformStoryGraph({
  projectId,
  characters,
  relationships,
  storyGraph,
  narrativeThreads = [],
  chapter,
  lensMode = "cast",
  connectionLayer = "all",
}: TransformStoryGraphOptions): StoryGraphData {
  const selectedChapter = Math.max(1, chapter);

  // 1. Process Characters
  const charNodesMap = new Map<string, StoryGraphNode>();
  let minCh = 1;
  let maxCh = 1;

  for (const c of characters) {
    const firstCh = c.first_chapter || 1;
    minCh = Math.min(minCh, firstCh);
    maxCh = Math.max(maxCh, firstCh, c.last_chapter || 1);

    if (firstCh <= selectedChapter) {
      const bareId = extractBareId(c.id);
      const canonicalId = `char:${bareId}`;
      const theme = getEntityVisualTheme("character", c.status);

      charNodesMap.set(bareId, {
        id: canonicalId,
        rawId: bareId,
        name: c.name,
        kind: "character",
        firstChapter: firstCh,
        lastChapter: c.last_chapter || null,
        state: {
          status: c.status || "Alive",
          condition: (c.physical_traits as any)?.condition || c.description || "Active in story",
          aliases: c.aliases || [],
          description: c.description || "",
        },
        visualColor: theme.color,
        visualBadge: theme.badge,
      });
    }
  }

  // 2. Process World Entities (Objects, Locations, Events) from storyGraph
  const objectNodesMap = new Map<string, StoryGraphNode>();
  const locationNodesMap = new Map<string, StoryGraphNode>();
  const eventNodesMap = new Map<string, StoryGraphNode>();

  const rawGraphNodes = storyGraph?.nodes || [];
  for (const node of rawGraphNodes) {
    const bareId = extractBareId(node.id);
    const firstCh = node.chapter || 1;
    maxCh = Math.max(maxCh, firstCh);

    if (firstCh <= selectedChapter) {
      const kind = (node.kind || "").toLowerCase() as EntityKind;

      if (kind === "object") {
        const theme = getEntityVisualTheme("object");
        const mentions = ((node.metadata?.mention_chapters as number[]) || []).filter(
          (ch) => ch <= selectedChapter
        );
        objectNodesMap.set(bareId, {
          id: `obj:${bareId}`,
          rawId: bareId,
          name: node.label,
          kind: "object",
          firstChapter: firstCh,
          lastChapter: null,
          state: {
            status: "Recorded Relic",
            condition: (node.metadata?.description as string) || "Active Artifact",
            aliases: [],
            description: (node.metadata?.description as string) || "",
            mentionChapters: mentions,
          },
          visualColor: theme.color,
          visualBadge: theme.badge,
        });
      } else if (kind === "location") {
        const theme = getEntityVisualTheme("location");
        locationNodesMap.set(bareId, {
          id: `loc:${bareId}`,
          rawId: bareId,
          name: node.label,
          kind: "location",
          firstChapter: firstCh,
          lastChapter: null,
          state: {
            status: "Story Setting",
            condition: (node.metadata?.description as string) || "Geographic Setting",
            aliases: [],
            description: (node.metadata?.description as string) || "",
          },
          visualColor: theme.color,
          visualBadge: theme.badge,
        });
      } else if (kind === "event") {
        const theme = getEntityVisualTheme("event");
        eventNodesMap.set(bareId, {
          id: `event:${bareId}`,
          rawId: bareId,
          name: node.label,
          kind: "event",
          firstChapter: firstCh,
          lastChapter: null,
          state: {
            status: "Historical Event",
            condition: (node.metadata?.summary as string) || node.label,
            aliases: [],
            description: (node.metadata?.summary as string) || "",
            participants: (node.metadata?.participants as string[]) || [],
            location: (node.metadata?.location as string) || undefined,
          },
          visualColor: theme.color,
          visualBadge: theme.badge,
        });
      }
    }
  }

  // 3. Assemble Active Nodes based on Lens Mode
  const activeNodesMap = new Map<string, StoryGraphNode>();

  // Always include characters
  for (const [id, node] of charNodesMap) {
    activeNodesMap.set(node.id, node);
  }

  if (lensMode === "relics" || lensMode === "full") {
    for (const [id, node] of objectNodesMap) {
      activeNodesMap.set(node.id, node);
    }
  }

  if (lensMode === "geography" || lensMode === "full") {
    for (const [id, node] of locationNodesMap) {
      activeNodesMap.set(node.id, node);
    }
  }

  if (lensMode === "full") {
    for (const [id, node] of eventNodesMap) {
      activeNodesMap.set(node.id, node);
    }
  }

  // 4. Ingest and Bundle Connections
  // Map of connectionKey (sorted endpoints) -> bundled StoryGraphConnection
  const connectionBundles = new Map<string, StoryGraphConnection>();
  let excludedSelfLoopsCount = 0;
  let activeRelsCount = 0;
  let activeCustodyCount = 0;
  let activeSpatialCount = 0;

  // A. Interpersonal Relationships
  for (const r of relationships) {
    const sinceCh = r.chapter;
    const untilCh = r.until_chapter;
    maxCh = Math.max(maxCh, sinceCh, untilCh || sinceCh);

    const isSelfLoop = r.character_a_id === r.character_b_id;
    if (isSelfLoop) {
      if (sinceCh <= selectedChapter && (untilCh === null || selectedChapter < untilCh)) {
        excludedSelfLoopsCount += 1;
      }
      continue;
    }

    // Check temporal window
    if (sinceCh <= selectedChapter && (untilCh === null || selectedChapter < untilCh)) {
      const srcBare = extractBareId(r.character_a_id);
      const dstBare = extractBareId(r.character_b_id);
      const srcNode = charNodesMap.get(srcBare);
      const dstNode = charNodesMap.get(dstBare);

      if (srcNode && dstNode) {
        activeRelsCount += 1;
        const tone = mapRelationToTone(r.type, r.sentiment);

        const record: StoryConnectionRecord = {
          id: r.id,
          source: srcNode.id,
          target: dstNode.id,
          relation: r.type,
          tone,
          sinceChapter: sinceCh,
          untilChapter: untilCh,
          description: r.description || undefined,
          evidenceQuote: r.evidence_quote || undefined,
        };

        const sortedEndpoints = [srcNode.id, dstNode.id].sort();
        const connectionKey = `${sortedEndpoints[0]}--${sortedEndpoints[1]}`;

        let bundle = connectionBundles.get(connectionKey);
        if (!bundle) {
          bundle = {
            connectionId: connectionKey,
            sourceId: srcNode.id,
            targetId: dstNode.id,
            sourceName: srcNode.name,
            targetName: dstNode.name,
            sourceKind: "character",
            targetKind: "character",
            connectionTypes: ["interpersonal"],
            visualTone: tone,
            isReciprocal: false,
            records: [record],
            sinceChapter: sinceCh,
            untilChapter: untilCh,
          };
          connectionBundles.set(connectionKey, bundle);
        } else {
          bundle.records.push(record);
          if (!bundle.connectionTypes.includes("interpersonal")) {
            bundle.connectionTypes.push("interpersonal");
          }
          if (bundle.sourceId !== srcNode.id) {
            bundle.isReciprocal = true;
          }
          // Prioritize friction over warmth over neutral
          if (tone === "friction" || bundle.visualTone === "neutral") {
            bundle.visualTone = tone;
          }
          bundle.sinceChapter = Math.min(bundle.sinceChapter, sinceCh);
          if (bundle.untilChapter !== null && untilCh !== null) {
            bundle.untilChapter = Math.max(bundle.untilChapter, untilCh);
          } else {
            bundle.untilChapter = null;
          }
        }
      }
    }
  }

  // B. World Graph Edges (Relic Custody, Location Presence, Event Occurrences)
  const rawGraphEdges = storyGraph?.edges || [];
  for (const edge of rawGraphEdges) {
    const sinceCh = edge.since_chapter || 1;
    const untilCh = edge.until_chapter || null;

    if (sinceCh <= selectedChapter && (untilCh === null || selectedChapter < untilCh)) {
      const srcId = edge.source;
      const dstId = edge.target;
      const srcNode = activeNodesMap.get(srcId);
      const dstNode = activeNodesMap.get(dstId);

      if (srcNode && dstNode) {
        let connType: ConnectionType = "interpersonal";
        let tone: VisualTone = "neutral";

        if (srcNode.kind === "object" || dstNode.kind === "object") {
          connType = "custody";
          tone = "warmth";
          activeCustodyCount += 1;
        } else if (srcNode.kind === "location" || dstNode.kind === "location") {
          connType = "spatial";
          tone = "neutral";
          activeSpatialCount += 1;
        } else if (srcNode.kind === "event" || dstNode.kind === "event") {
          connType = "event_involvement";
          tone = "friction";
        }

        const sortedEndpoints = [srcNode.id, dstNode.id].sort();
        const connectionKey = `${sortedEndpoints[0]}--${sortedEndpoints[1]}`;

        const record: StoryConnectionRecord = {
          id: edge.id,
          source: srcNode.id,
          target: dstNode.id,
          relation: edge.relation || "CONNECTED_TO",
          tone,
          sinceChapter: sinceCh,
          untilChapter: untilCh,
          description: edge.description || undefined,
          evidenceQuote: edge.evidence_quote || undefined,
        };

        let bundle = connectionBundles.get(connectionKey);
        if (!bundle) {
          bundle = {
            connectionId: connectionKey,
            sourceId: srcNode.id,
            targetId: dstNode.id,
            sourceName: srcNode.name,
            targetName: dstNode.name,
            sourceKind: srcNode.kind,
            targetKind: dstNode.kind,
            connectionTypes: [connType],
            visualTone: tone,
            isReciprocal: false,
            records: [record],
            sinceChapter: sinceCh,
            untilChapter: untilCh,
          };
          connectionBundles.set(connectionKey, bundle);
        } else {
          bundle.records.push(record);
          if (!bundle.connectionTypes.includes(connType)) {
            bundle.connectionTypes.push(connType);
          }
        }
      }
    }
  }

  // C. Narrative Plot Threads
  let activeThreadsCount = 0;
  for (const th of narrativeThreads) {
    if (th.setupChapter <= selectedChapter) {
      if (th.payoffChapter === null || selectedChapter <= th.payoffChapter) {
        const srcBare = extractBareId(th.characterAId);
        const dstBare = extractBareId(th.characterBId);
        const srcNode = charNodesMap.get(srcBare);
        const dstNode = charNodesMap.get(dstBare);

        if (srcNode && dstNode) {
          activeThreadsCount += 1;
          const sortedEndpoints = [srcNode.id, dstNode.id].sort();
          const connectionKey = `${sortedEndpoints[0]}--${sortedEndpoints[1]}`;

          const record: StoryConnectionRecord = {
            id: `thread_link:${th.id}`,
            source: srcNode.id,
            target: dstNode.id,
            relation: `Plot Thread: ${th.threadTitle}`,
            tone: "neutral",
            sinceChapter: th.setupChapter,
            untilChapter: th.payoffChapter,
            description: `${th.threadTitle} (${th.status})`,
          };

          let bundle = connectionBundles.get(connectionKey);
          if (!bundle) {
            bundle = {
              connectionId: connectionKey,
              sourceId: srcNode.id,
              targetId: dstNode.id,
              sourceName: srcNode.name,
              targetName: dstNode.name,
              sourceKind: "character",
              targetKind: "character",
              connectionTypes: ["narrative_thread"],
              visualTone: "neutral",
              isReciprocal: false,
              records: [record],
              sinceChapter: th.setupChapter,
              untilChapter: th.payoffChapter,
            };
            connectionBundles.set(connectionKey, bundle);
          } else {
            bundle.records.push(record);
            if (!bundle.connectionTypes.includes("narrative_thread")) {
              bundle.connectionTypes.push("narrative_thread");
            }
          }
        }
      }
    }
  }

  // Filter connections by connectionLayer ("all" | "bonds" | "threads")
  const allConnections = Array.from(connectionBundles.values());
  const filteredConnections = allConnections.filter((conn) => {
    if (connectionLayer === "bonds") {
      return (
        conn.connectionTypes.includes("interpersonal") ||
        conn.connectionTypes.includes("custody") ||
        conn.connectionTypes.includes("spatial")
      );
    }
    if (connectionLayer === "threads") {
      return conn.connectionTypes.includes("narrative_thread");
    }
    return true;
  });

  const metadata: StoryGraphMetadata = {
    projectId,
    currentChapter: selectedChapter,
    minChapter: minCh,
    maxChapter: Math.max(maxCh, 20),
    totalCharactersCount: characters.length,
    introducedCharactersCount: charNodesMap.size,
    totalObjectsCount: objectNodesMap.size,
    introducedObjectsCount: objectNodesMap.size,
    totalLocationsCount: locationNodesMap.size,
    introducedLocationsCount: locationNodesMap.size,
    activeRelationshipsCount: activeRelsCount,
    activeNarrativeThreadsCount: activeThreadsCount,
    activeCustodyCount,
    activeSpatialCount,
    excludedSelfLoopsCount,
    lensMode,
  };

  return {
    nodes: Array.from(activeNodesMap.values()),
    connections: filteredConnections,
    metadata,
  };
}
