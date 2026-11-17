/**
 * Unified Story Graph & World in Chaos Network Data Contract
 *
 * Unifies Characters, Story Objects (Relics/Artifacts), Locations (Settings),
 * and Story Events into a cohesive, chapter-scoped relational graph.
 */

export type EntityKind = "character" | "object" | "location" | "event";

export type LensMode = "cast" | "relics" | "geography" | "full";

export type CharacterStatus =
  | "Alive"
  | "Deceased"
  | "Incapacitated"
  | "Stasis"
  | "Unknown";

export type VisualTone = "friction" | "warmth" | "neutral" | "ethereal";

export type ConnectionType =
  | "interpersonal"
  | "narrative_thread"
  | "custody"
  | "spatial"
  | "event_involvement";

export interface StoryNodeState {
  status: string;
  condition: string;
  aliases: string[];
  physicalTraits?: Record<string, string>;
  description?: string;
  mentionChapters?: number[];
  location?: string;
  participants?: string[];
}

export interface StoryGraphNode {
  id: string; // canonical entity id (e.g. "char:uuid", "obj:uuid", "loc:uuid")
  rawId: string; // bare UUID
  name: string; // label
  kind: EntityKind;
  firstChapter: number;
  lastChapter: number | null;
  state: StoryNodeState;
  visualColor: string;
  visualBadge: string; // e.g. "ALIVE", "RELIC", "SETTING", "EVENT"
}

export interface StoryConnectionRecord {
  id: string;
  source: string;
  target: string;
  relation: string;
  tone: VisualTone;
  sinceChapter: number;
  untilChapter: number | null;
  description?: string;
  evidenceQuote?: string;
  confidence?: number;
}

export interface StoryGraphConnection {
  connectionId: string;
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  sourceKind: EntityKind;
  targetKind: EntityKind;
  connectionTypes: ConnectionType[];
  visualTone: VisualTone;
  isReciprocal: boolean;
  records: StoryConnectionRecord[];
  sinceChapter: number;
  untilChapter: number | null;
}

export interface StoryGraphMetadata {
  projectId: string;
  currentChapter: number;
  minChapter: number;
  maxChapter: number;
  totalCharactersCount: number;
  introducedCharactersCount: number;
  totalObjectsCount: number;
  introducedObjectsCount: number;
  totalLocationsCount: number;
  introducedLocationsCount: number;
  activeRelationshipsCount: number;
  activeNarrativeThreadsCount: number;
  activeCustodyCount: number;
  activeSpatialCount: number;
  excludedSelfLoopsCount: number;
  lensMode: LensMode;
}

export interface StoryGraphData {
  nodes: StoryGraphNode[];
  connections: StoryGraphConnection[];
  metadata: StoryGraphMetadata;
}
