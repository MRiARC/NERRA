/**
 * Production Live Integration Service for Character Network.
 *
 * Connects the pure Character Network transformation contract to live FastAPI
 * backend endpoints (`GET /projects/:id/characters` and `GET /projects/:id/relationships`).
 * Decouples live network transport from test fixtures.
 */

import type { GraphEdge, StoryGraph } from "../types.ts";
import { api } from "../api.ts";
import {
  getHistoricalRelationshipsForPair,
  getRelationshipProvenance,
  transformCharacterNetwork,
} from "./transform.ts";
import type {
  CharacterNetworkEdge,
  CharacterNetworkGraph,
  EvidenceProvenance,
  HistoricalRelationshipStage,
  RawCharacter,
  RawRelationship,
} from "./types.ts";

/**
 * Result of projection drift detection between Neo4j graph and PostgreSQL records.
 */
export interface ProjectionDriftReport {
  isSynchronized: boolean;
  missingInNeo4jCount: number;
  missingInNeo4jIds: string[];
  staleInNeo4jCount: number;
  staleInNeo4jIds: string[];
  enrichedEdgesCount: number;
}

/**
 * Enriches a Neo4j StoryGraph projection with PostgreSQL evidence quotes via canonical UUIDs.
 * Neo4j edges use the format `rel:<uuid>`, which maps 1:1 to PostgreSQL `relationships.id`.
 */
export function enrichNeo4jGraphWithPostgresEvidence(
  neo4jGraph: StoryGraph,
  postgresRelationships: readonly RawRelationship[]
): {
  enrichedEdges: CharacterNetworkEdge[];
  driftReport: ProjectionDriftReport;
} {
  const pgMap = new Map<string, RawRelationship>();
  for (const r of postgresRelationships) {
    pgMap.set(r.id, r);
  }

  const neo4jRelEdges = neo4jGraph.edges.filter(
    (e: GraphEdge) =>
      e.source.startsWith("char:") &&
      e.target.startsWith("char:") &&
      e.relation !== "PARTICIPATED_IN" &&
      e.relation !== "OCCURRED_AT" &&
      e.relation !== "THREAD_INVOLVES"
  );

  const seenPgIds = new Set<string>();
  const enrichedEdges: CharacterNetworkEdge[] = [];
  const staleInNeo4jIds: string[] = [];

  for (const ne of neo4jRelEdges) {
    const canonicalId = ne.id.replace(/^rel:/, "");
    const pgRecord = pgMap.get(canonicalId);

    if (!pgRecord) {
      staleInNeo4jIds.push(ne.id);
      continue;
    }

    seenPgIds.add(canonicalId);
    enrichedEdges.push({
      id: canonicalId,
      sourceId: pgRecord.character_a_id,
      targetId: pgRecord.character_b_id,
      sourceNeo4jId: ne.source,
      targetNeo4jId: ne.target,
      sourceName: ne.source,
      targetName: ne.target,
      relation: pgRecord.type,
      sentiment: pgRecord.sentiment,
      sinceChapter: pgRecord.chapter,
      untilChapter: pgRecord.until_chapter,
      description: pgRecord.description,
      evidenceQuote: pgRecord.evidence_quote,
    });
  }

  // Detect PostgreSQL relationships missing from the Neo4j projection
  const missingInNeo4jIds: string[] = [];
  for (const r of postgresRelationships) {
    if (!seenPgIds.has(r.id)) {
      missingInNeo4jIds.push(r.id);
    }
  }

  const driftReport: ProjectionDriftReport = {
    isSynchronized:
      missingInNeo4jIds.length === 0 && staleInNeo4jIds.length === 0,
    missingInNeo4jCount: missingInNeo4jIds.length,
    missingInNeo4jIds,
    staleInNeo4jCount: staleInNeo4jIds.length,
    staleInNeo4jIds,
    enrichedEdgesCount: enrichedEdges.length,
  };

  return { enrichedEdges, driftReport };
}

/**
 * Fetches live story characters and relationships from the PostgreSQL-backed API
 * and transforms them into a chapter-scoped Character Network Graph.
 */
export async function fetchLiveCharacterNetwork(
  projectId: string,
  chapter: number
): Promise<CharacterNetworkGraph> {
  const [charactersRaw, relationshipsRaw] = await Promise.all([
    api.story.getCharacters(projectId),
    api.story.getRelationships(projectId),
  ]);

  const characters: RawCharacter[] = charactersRaw.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status || "alive",
    first_chapter: c.first_chapter || 1,
    last_chapter: c.last_chapter ?? null,
    aliases: c.aliases || [],
    physical_traits: c.physical_traits || {},
    description: c.description || "",
  }));

  const relationships: RawRelationship[] = relationshipsRaw.map((r) => ({
    id: r.id,
    character_a_id: r.character_a_id,
    character_b_id: r.character_b_id,
    type: r.type,
    sentiment: r.sentiment || "neutral",
    chapter: r.chapter || 1,
    until_chapter: r.until_chapter ?? null,
    evidence_quote: r.evidence_quote ?? null,
    description: r.description ?? null,
  }));

  return transformCharacterNetwork({
    projectId,
    characters,
    relationships,
    chapter,
  });
}

/**
 * Fetches the live relationship evolution timeline between two characters up to chapter N.
 */
export async function fetchLivePairHistory(
  projectId: string,
  charAId: string,
  charBId: string,
  upToChapter?: number
): Promise<HistoricalRelationshipStage[]> {
  const [charactersRaw, relationshipsRaw] = await Promise.all([
    api.story.getCharacters(projectId),
    api.story.getRelationships(projectId),
  ]);

  const characters: RawCharacter[] = charactersRaw.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status || "alive",
    first_chapter: c.first_chapter || 1,
    last_chapter: c.last_chapter ?? null,
    aliases: c.aliases || [],
    physical_traits: c.physical_traits || {},
    description: c.description || "",
  }));

  const relationships: RawRelationship[] = relationshipsRaw.map((r) => ({
    id: r.id,
    character_a_id: r.character_a_id,
    character_b_id: r.character_b_id,
    type: r.type,
    sentiment: r.sentiment || "neutral",
    chapter: r.chapter || 1,
    until_chapter: r.until_chapter ?? null,
    evidence_quote: r.evidence_quote ?? null,
    description: r.description ?? null,
  }));

  return getHistoricalRelationshipsForPair(
    relationships,
    characters,
    charAId,
    charBId,
    upToChapter
  );
}

/**
 * Fetches chapter-authorized evidence provenance for a relationship record.
 * upToChapter is mandatory to prevent forward spoiler leaks.
 */
export async function fetchLiveRelationshipProvenance(
  projectId: string,
  relationshipId: string,
  upToChapter: number
): Promise<EvidenceProvenance | null> {
  const [charactersRaw, relationshipsRaw] = await Promise.all([
    api.story.getCharacters(projectId),
    api.story.getRelationships(projectId),
  ]);

  const characters: RawCharacter[] = charactersRaw.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status || "alive",
    first_chapter: c.first_chapter || 1,
    last_chapter: c.last_chapter ?? null,
    aliases: c.aliases || [],
    physical_traits: c.physical_traits || {},
    description: c.description || "",
  }));

  const relationships: RawRelationship[] = relationshipsRaw.map((r) => ({
    id: r.id,
    character_a_id: r.character_a_id,
    character_b_id: r.character_b_id,
    type: r.type,
    sentiment: r.sentiment || "neutral",
    chapter: r.chapter || 1,
    until_chapter: r.until_chapter ?? null,
    evidence_quote: r.evidence_quote ?? null,
    description: r.description ?? null,
  }));

  return getRelationshipProvenance(
    relationships,
    characters,
    relationshipId,
    upToChapter
  );
}
