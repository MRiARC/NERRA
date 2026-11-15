/**
 * Normalized TypeScript DTOs for the Character Network Visualization Contract.
 * Decoupled from AntV G6 or any visual canvas rendering library.
 *
 * Designed to provide:
 * 1. Separation of physical status, condition, and known revelations.
 * 2. Visual connection grouping with documented visualTone aggregation.
 * 3. Chapter-authorized provenance retrieval with strict temporal boundaries.
 * 4. Zero future-data leakage in chapter-scoped responses.
 */

/** Raw Character entity as stored in PostgreSQL / Neo4j */
export interface RawCharacter {
  id: string; // Canonical PostgreSQL UUID
  name: string;
  status: "alive" | "deceased" | "unknown" | string;
  first_chapter: number;
  last_chapter: number | null;
  aliases: string[];
  physical_traits: Record<string, unknown>;
  description: string;
}

/** Raw Relationship record as stored in PostgreSQL / Neo4j */
export interface RawRelationship {
  id: string; // Canonical PostgreSQL UUID
  character_a_id: string; // Source character UUID
  character_b_id: string; // Target character UUID
  type: string; // Semantic relation type
  sentiment: string; // Sentiment classification (hostile, trusting, etc.)
  chapter: number; // since_chapter (inclusive start)
  until_chapter: number | null; // until_chapter (exclusive end; null = active to story end)
  evidence_quote: string | null; // Verbatim quotation from manuscript
  description: string | null; // Narrative context
}

/** Specific narrative truth or identity discovery revealed in the story */
export interface CharacterRevelation {
  /** Canonical claim or relationship UUID */
  id: string;
  /** Categorization of the revelation */
  category: "identity" | "historical_truth" | "betrayal" | "fate" | "lore";
  /** Chapter where this revelation becomes known to the reader/characters */
  revealedAtChapter: number;
  /** Concise summary title of the discovery */
  label: string;
  /** Narrative description of what was uncovered */
  description: string;
  /** Verbatim manuscript citation proving this revelation (required when evidence is available) */
  evidenceQuote: string;
}

/**
 * Verbatim provenance proving how a character entered their current physical state/condition.
 * Guarantees zero ungrounded transitions: every status is tied to a database claim or relationship.
 */
export interface StateTransitionEvidence {
  /** Canonical DB ID (UUID) of the claim, relationship, or genesis record */
  sourceId: string;
  /** Source entity type in PostgreSQL */
  sourceType: "relationship" | "claim" | "character_genesis";
  /** Chapter where the state transition occurred */
  chapter: number;
  /** Summary of the transition event */
  description: string;
  /** Verbatim manuscript excerpt proving the transition */
  evidenceQuote: string;
}

/**
 * Character state model separating physical existence, condition,
 * and accumulated narrative revelations.
 */
export interface CharacterState {
  /** Physical life status: "alive" | "deceased" | "unknown" | "incapacitated" */
  status: "alive" | "deceased" | "unknown" | "incapacitated" | string;
  /** Physical or environmental condition */
  condition: string;
  /** Verbatim evidence and source record ID proving this physical status */
  statusTransition: StateTransitionEvidence;
  /** Revelations uncovered on or before chapter N */
  knownRevelations: CharacterRevelation[];
}

/** Data quality discrepancy classification */
export type DataQualityIssueCode =
  | "SELF_LOOP"
  | "MISSING_ENDPOINT"
  | "DUPLICATE_ID"
  | "CONFLICTING_INTERVAL"
  | "INVALID_CHAPTER_RANGE";

export interface DataQualityIssue {
  code: DataQualityIssueCode;
  severity: "warning" | "error";
  message: string;
  relationshipId?: string;
  characterId?: string;
  sourceId?: string;
  targetId?: string;
  details?: Record<string, unknown>;
}

/**
 * Chapter-scoped Character node.
 * Contains only information known up to the selected chapter.
 * Future-sensitive raw fields (raw status, unrevealed aliases, future exit chapters)
 * are strictly omitted to prevent spoiler leakage.
 */
export interface CharacterNetworkNode {
  /** Canonical PostgreSQL character UUID */
  id: string;
  /** Bolt / Neo4j node identifier: "char:<uuid>" */
  neo4jId: string;
  /** Primary character display name */
  name: string;
  /** Structured chapter-scoped state separating physical status and revelations */
  state: CharacterState;
  /** First chapter in which this character appears */
  firstChapter: number;
  /** Chapter-scoped revealed aliases (e.g. "Princess Aurelia" is excluded before Ch. 16) */
  aliases: string[];
  /** Chapter-scoped character description built strictly from claims available at chapter N */
  description: string;
}

/**
 * Chapter-scoped active directional relationship edge.
 * Represents one directional relationship record active at chapter N.
 */
export interface CharacterNetworkEdge {
  /** Canonical PostgreSQL relationship UUID */
  id: string;
  /** Source character UUID */
  sourceId: string;
  /** Target character UUID */
  targetId: string;
  /** Bolt / Neo4j source identifier: "char:<uuid>" */
  sourceNeo4jId: string;
  /** Bolt / Neo4j target identifier: "char:<uuid>" */
  targetNeo4jId: string;
  /** Source character display name */
  sourceName: string;
  /** Target character display name */
  targetName: string;
  /** Semantic relationship category */
  relation: string;
  /** Sentiment classification */
  sentiment: string;
  /** Inclusive starting chapter */
  sinceChapter: number;
  /** Exclusive ending chapter (null = active through end) */
  untilChapter: number | null;
  /** Narrative description */
  description: string | null;
  /** Verbatim excerpt from novel manuscript */
  evidenceQuote: string | null;
}

/** Visual tone classification for connection line rendering */
export type VisualTone = "friction" | "warmth" | "neutral";

/**
 * Bundled visual connection between two characters.
 * Groups multiple directional relationship records (e.g. concurrent reciprocal perspectives)
 * into a single cohesive visual link without losing individual record IDs, sentiments, or evidence.
 */
export interface VisualConnection {
  /** Deterministic connection identifier: "conn:<minUUID>--<maxUUID>" */
  connectionId: string;
  /** Lexicographically first character UUID */
  characterAId: string;
  /** Lexicographically second character UUID */
  characterBId: string;
  /** Display name of character A */
  characterAName: string;
  /** Display name of character B */
  characterBName: string;
  /** Aggregated visual tone for line coloring (friction / warmth / neutral) */
  visualTone: VisualTone;
  /** Set of distinct underlying sentiments present across all bundled records */
  sentimentDistribution: string[];
  /** True if active records exist in both directions (A -> B and B -> A) */
  isReciprocal: boolean;
  /** All underlying active relationship records comprising this visual connection */
  records: CharacterNetworkEdge[];
}

/**
 * Historical evolution stage for a character relationship.
 * Used for timeline inspection of relationship progressions up to a selected chapter.
 */
export interface HistoricalRelationshipStage {
  id: string;
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  relation: string;
  sentiment: string;
  sinceChapter: number;
  untilChapter: number | null;
  description: string | null;
  evidenceQuote: string | null;
  /** True if this stage is the active state at the inspected chapter */
  isCurrentAtChapter: boolean;
  /** Chapter where this stage was superseded by an evolution, if applicable */
  supersededAtChapter: number | null;
}

/**
 * Comprehensive evidence provenance bundle for inspection dialogs.
 */
export interface EvidenceProvenance {
  relationshipId: string;
  sourceCharacter: { id: string; name: string };
  targetCharacter: { id: string; name: string };
  chapterRange: { since: number; until: number | null };
  relationType: string;
  sentiment: string;
  evidenceQuote: string | null;
  contextDescription: string | null;
  /** True if relationship was active in the past but superseded by chapter N */
  isHistorical: boolean;
}

/** Chapter-scoped graph metadata */
export interface CharacterNetworkMetadata {
  projectId: string;
  selectedChapter: number;
  totalCharactersInStory: number;
  introducedCharactersCount: number;
  totalRelationshipsInStory: number;
  activeRelationshipsCount: number;
  activeConnectionsCount: number;
  excludedSelfLoopsCount: number;
  dataQualityIssuesCount: number;
  minChapter: number;
  maxChapter: number;
}

/**
 * Primary chapter-scoped Character Network Graph response DTO.
 * Active-only: contains only introduced characters and active edges/connections for chapter N.
 */
export interface CharacterNetworkGraph {
  metadata: CharacterNetworkMetadata;
  nodes: CharacterNetworkNode[];
  edges: CharacterNetworkEdge[];
  connections: VisualConnection[];
  dataQualityIssues: DataQualityIssue[];
}

/** Options for generating chapter-scoped graph */
export interface TransformOptions {
  projectId: string;
  characters: readonly RawCharacter[];
  relationships: readonly RawRelationship[];
  chapter: number;
}
