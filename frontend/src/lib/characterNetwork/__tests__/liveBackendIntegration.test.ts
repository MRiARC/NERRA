import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  transformCharacterNetwork,
  getRelationshipProvenance,
  getHistoricalRelationshipsForPair,
  validateGraphIntegrity,
} from "../transform.ts";
import { enrichNeo4jGraphWithPostgresEvidence } from "../service.ts";
import type { RawCharacter, RawRelationship } from "../types.ts";
import type { GraphEdge, StoryGraph } from "../../types.ts";

// Load verbatim live FastAPI response export
const liveDataPath = path.resolve(process.cwd(), "scratch/live_backend_export.json");
const liveData = JSON.parse(fs.readFileSync(liveDataPath, "utf-8"));

const liveCharacters: RawCharacter[] = liveData.characters.map((c: any) => ({
  id: c.id,
  name: c.name,
  status: c.status || "alive",
  first_chapter: c.first_chapter || 1,
  last_chapter: c.last_chapter ?? null,
  aliases: c.aliases || [],
  physical_traits: c.physical_traits || {},
  description: c.description || "",
}));

const liveRelationships: RawRelationship[] = liveData.relationships.map((r: any) => ({
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

const liveNeo4jGraph: StoryGraph = liveData.neo4jGraph;

test("Live Backend Integration - Raw Entities Map Accurately from FastAPI Routes", () => {
  assert.equal(liveCharacters.length, 7, "Live FastAPI /characters endpoint returns exactly 7 characters");
  assert.equal(liveRelationships.length, 40, "Live FastAPI /relationships endpoint returns exactly 40 relationships");
  assert.equal(liveNeo4jGraph.nodes.length, 591, "Live FastAPI /graph endpoint returns 591 Neo4j nodes");
  assert.equal(liveNeo4jGraph.edges.length, 1026, "Live FastAPI /graph endpoint returns 1026 Neo4j edges");
  assert.equal(liveNeo4jGraph.neo4j_connected, true, "Live Neo4j container is connected and operational");
});

test("Live Backend Integration - All 20 Chapters Temporal Evaluation on Live Data", () => {
  for (let ch = 1; ch <= 20; ch++) {
    const graph = transformCharacterNetwork({
      projectId: liveData.projectId,
      characters: liveCharacters,
      relationships: liveRelationships,
      chapter: ch,
    });

    assert.equal(graph.metadata.selectedChapter, ch);
    assert.equal(graph.metadata.totalCharactersInStory, 7);
    assert.equal(graph.metadata.totalRelationshipsInStory, 40);

    // Every node in the graph must have first_chapter <= ch
    for (const node of graph.nodes) {
      assert.ok(node.firstChapter <= ch, `Character ${node.name} introduced after Ch ${ch}`);
      assert.ok(node.state.statusTransition, `Character ${node.name} must have transition evidence`);
      assert.ok(node.state.statusTransition.chapter <= ch, `Status transition must have occurred on or before Ch ${ch}`);
    }

    // Every active edge must satisfy half-open interval [since, until)
    for (const edge of graph.edges) {
      assert.ok(edge.sinceChapter <= ch, `Edge ${edge.id} sinceChapter must be <= ${ch}`);
      if (edge.untilChapter !== null) {
        assert.ok(ch < edge.untilChapter, `Edge ${edge.id} untilChapter ${edge.untilChapter} must be > ${ch}`);
      }
    }

    // Elowen check: must not appear before Chapter 6
    const hasElowen = graph.nodes.some((n) => n.name === "Elowen");
    if (ch < 6) {
      assert.equal(hasElowen, false, `Elowen must NOT appear before Ch 6 (queried at Ch ${ch})`);
    } else {
      assert.equal(hasElowen, true, `Elowen MUST appear at Ch 6+ (queried at Ch ${ch})`);
    }
  }
});

test("Live Backend Integration - Neo4j Canonical UUID Mapping & Evidence Enrichment", () => {
  const { enrichedEdges, driftReport } = enrichNeo4jGraphWithPostgresEvidence(
    liveNeo4jGraph,
    liveRelationships
  );

  // In the live database, Neo4j character edges are synced from PostgreSQL
  assert.ok(driftReport.enrichedEdgesCount > 0, "Must enrich live character edges");
  assert.equal(driftReport.missingInNeo4jCount, 0, "No PostgreSQL relationships are missing from Neo4j in fresh sync");
  assert.equal(driftReport.staleInNeo4jCount, 0, "No stale relationship edges in live Neo4j");
  assert.equal(driftReport.isSynchronized, true, "Live Neo4j projection is fully synchronized with PostgreSQL");

  // Verify that all enriched edges now carry the PostgreSQL manuscript evidence quote
  for (const edge of enrichedEdges) {
    assert.ok(edge.evidenceQuote !== undefined, `Edge ${edge.id} must have evidenceQuote property`);
    // Check canonical UUID prefix strip: edge.id must be 36-char UUID (without rel:)
    assert.match(edge.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    assert.ok(edge.sourceNeo4jId.startsWith("char:"), "sourceNeo4jId must have char: prefix");
    assert.ok(edge.targetNeo4jId.startsWith("char:"), "targetNeo4jId must have char: prefix");
  }
});

test("Live Backend Integration - Projection Drift Simulation & Self-Healing", () => {
  // Simulate drift by dropping 3 specific character edges and adding 1 orphaned edge
  const droppedIds = [
    "rel:b11578af-3b2e-4488-b5ac-23caaf80cd7f",
    "rel:a3694973-57ef-4a76-9efd-508e5b2240df",
    "rel:432852c1-24d7-442d-8a34-002c8161d696",
  ];
  const driftedNeo4jGraph: StoryGraph = {
    ...liveNeo4jGraph,
    edges: [
      ...liveNeo4jGraph.edges.filter((e: GraphEdge) => !droppedIds.includes(e.id)),
      {
        id: "rel:00000000-0000-0000-0000-000000000999",
        source: "char:082fa8a3-47e6-4436-82c1-8197f0f71381",
        target: "char:6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
        relation: "ghost-drift",
        sentiment: "hostile",
        since_chapter: 1,
        until_chapter: null,
      },
    ],
  };

  const { enrichedEdges, driftReport } = enrichNeo4jGraphWithPostgresEvidence(
    driftedNeo4jGraph,
    liveRelationships
  );

  assert.equal(driftReport.isSynchronized, false, "Must detect drift");
  assert.equal(driftReport.staleInNeo4jCount, 1, "Must detect 1 stale orphaned edge in Neo4j");
  assert.equal(driftReport.staleInNeo4jIds[0], "rel:00000000-0000-0000-0000-000000000999");
  assert.equal(driftReport.missingInNeo4jCount, 3, "Must detect 3 missing edges from Neo4j projection");
  assert.deepEqual(
    driftReport.missingInNeo4jIds.sort(),
    droppedIds.map((id) => id.replace("rel:", "")).sort()
  );
  assert.equal(driftReport.enrichedEdgesCount, 37, "37 remaining character edges enriched");
});

test("Live Backend Integration - Chapter-Authorized Live Evidence Retrieval", () => {
  // Relationship 3c6e20b1-8e00-4ffb-858b-b05600d03709 is the Ch 15 Deluge Sluice revelation
  const delugeRelId = "3c6e20b1-8e00-4ffb-858b-b05600d03709";

  // 1. Authorized at Chapter 15
  const provCh15 = getRelationshipProvenance(liveRelationships, liveCharacters, delugeRelId, 15);
  assert.ok(provCh15);
  assert.equal(provCh15?.relationshipId, delugeRelId);
  assert.ok(provCh15?.evidenceQuote?.includes("Silas was mortally wounded"));
  assert.equal(provCh15?.isHistorical, false);

  // 2. Unauthorized before Chapter 15
  const provCh14 = getRelationshipProvenance(liveRelationships, liveCharacters, delugeRelId, 14);
  assert.equal(provCh14, null, "Must return null when inspected at Ch 14 to prevent future spoiler leak");

  // 3. Historical check: Ch 1-5 Silas mentor relation inspected at Ch 10
  const earlyRelId = "a93eed90-cc89-4d35-b77c-e2d291ff6b44";
  const provCh10 = getRelationshipProvenance(liveRelationships, liveCharacters, earlyRelId, 10);
  assert.ok(provCh10);
  assert.equal(provCh10?.isHistorical, true, "Relationship ending at Ch 5 must be marked isHistorical when viewed at Ch 10");
});
