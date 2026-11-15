import test from "node:test";
import assert from "node:assert/strict";
import {
  AETHELGARD_CHARACTERS,
  AETHELGARD_PROJECT_ID,
  AETHELGARD_RELATIONSHIPS,
} from "../sampleData.ts";
import {
  deriveVisualTone,
  getHistoricalRelationshipsForPair,
  getRelationshipProvenance,
  groupEdgesIntoConnections,
  transformCharacterNetwork,
  validateGraphIntegrity,
} from "../transform.ts";
import { enrichNeo4jGraphWithPostgresEvidence } from "../service.ts";
import type { RawCharacter, RawRelationship } from "../types.ts";

test("Character Network Contract - Immutability of Source Records", () => {
  const charsClone = JSON.parse(JSON.stringify(AETHELGARD_CHARACTERS));
  const relsClone = JSON.parse(JSON.stringify(AETHELGARD_RELATIONSHIPS));

  const result = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 8,
  });

  assert.ok(result);
  assert.deepEqual(
    AETHELGARD_CHARACTERS,
    charsClone,
    "Source characters array must not be mutated"
  );
  assert.deepEqual(
    AETHELGARD_RELATIONSHIPS,
    relsClone,
    "Source relationships array must not be mutated"
  );
});

test("Character Network Contract - Separation of Status and Revelations (Silas, Malakor, Voss, Vespera)", () => {
  // 1. Silas Vance: Physical status is ALWAYS "deceased", but revelations emerge at Ch 15
  const ch1 = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 1,
  });
  const silasCh1 = ch1.nodes.find((n) => n.name === "Silas Vance");
  assert.ok(silasCh1);
  assert.equal(silasCh1.state.status, "deceased", "Silas status was always deceased");
  assert.equal(silasCh1.state.condition, "deluge casualty (believed lost to flood)");
  assert.equal(silasCh1.state.knownRevelations.length, 0, "No revelations known about Silas in Ch 1");

  const ch15 = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 15,
  });
  const silasCh15 = ch15.nodes.find((n) => n.name === "Silas Vance");
  assert.ok(silasCh15);
  assert.equal(silasCh15.state.status, "deceased", "Silas status remains deceased in Ch 15");
  assert.equal(silasCh15.state.condition, "deluge casualty (sluice breach command revealed)");
  assert.equal(silasCh15.state.knownRevelations.length, 1, "Deluge truth revelation active in Ch 15");
  assert.equal(silasCh15.state.knownRevelations[0].category, "historical_truth");
  assert.ok(silasCh15.state.knownRevelations[0].evidenceQuote.includes("Silas was mortally wounded"));

  // 2. High Inquisitor Malakor: Physical life vs void transformation vs stasis trap
  const malakorCh8 = ch15.nodes.find((n) => n.name === "High Inquisitor Malakor");
  const ch8 = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 8,
  });
  const malakorCh8Node = ch8.nodes.find((n) => n.name === "High Inquisitor Malakor");
  assert.ok(malakorCh8Node);
  assert.equal(malakorCh8Node.state.status, "alive");
  assert.equal(malakorCh8Node.state.condition, "active high inquisitor of the obsidian order");
  assert.equal(malakorCh8Node.state.knownRevelations.length, 0);

  const ch16 = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 16,
  });
  const malakorCh16 = ch16.nodes.find((n) => n.name === "High Inquisitor Malakor");
  assert.ok(malakorCh16);
  assert.equal(malakorCh16.state.status, "alive");
  assert.equal(malakorCh16.state.condition, "transformed by black mercury void");
  assert.equal(malakorCh16.state.knownRevelations.length, 1);
  assert.equal(malakorCh16.state.knownRevelations[0].label, "Black Mercury Void Transformation");

  const ch20 = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 20,
  });
  const malakorCh20 = ch20.nodes.find((n) => n.name === "High Inquisitor Malakor");
  assert.ok(malakorCh20);
  assert.equal(malakorCh20.state.status, "incapacitated");
  assert.equal(malakorCh20.state.condition, "trapped in 5-second temporal stasis loop");
  assert.equal(malakorCh20.state.knownRevelations.length, 2);

  // 3. Kaelen Voss: Alive until Chapter 17 whirlpool sacrifice
  const vossCh16 = ch16.nodes.find((n) => n.name === "Kaelen Voss");
  assert.ok(vossCh16);
  assert.equal(vossCh16.state.status, "alive");
  assert.equal(vossCh16.state.knownRevelations.length, 1, "Belladonna poisoning known since Ch 14");

  const vossCh20 = ch20.nodes.find((n) => n.name === "Kaelen Voss");
  assert.ok(vossCh20);
  assert.equal(vossCh20.state.status, "deceased");
  assert.equal(vossCh20.state.condition, "sacrificed in gear housing; plunged into whirlpool");
  assert.equal(vossCh20.state.knownRevelations.length, 2);

  // 4. Lady Vespera Thorne: Identity revelation in Chapter 16
  const vesperaCh8 = ch8.nodes.find((n) => n.name === "Lady Vespera Thorne");
  assert.ok(vesperaCh8);
  assert.equal(vesperaCh8.state.knownRevelations.length, 0);

  const vesperaCh16 = ch16.nodes.find((n) => n.name === "Lady Vespera Thorne");
  assert.ok(vesperaCh16);
  assert.equal(vesperaCh16.state.knownRevelations.length, 1);
  assert.equal(vesperaCh16.state.knownRevelations[0].label, "True Identity: Princess Aurelia");
});

test("Character Network Contract - Boundary Verification Across All 20 Chapters", () => {
  for (let ch = 1; ch <= 20; ch++) {
    const graph = transformCharacterNetwork({
      projectId: AETHELGARD_PROJECT_ID,
      characters: AETHELGARD_CHARACTERS,
      relationships: AETHELGARD_RELATIONSHIPS,
      chapter: ch,
    });

    // 1. All nodes must be introduced on or before chapter N
    for (const node of graph.nodes) {
      assert.ok(
        node.firstChapter <= ch,
        `Node ${node.name} firstChapter (${node.firstChapter}) must be <= selected chapter (${ch})`
      );
    }
    assert.equal(
      graph.nodes.length,
      graph.metadata.introducedCharactersCount,
      `Ch ${ch}: nodes count must match metadata introduced count`
    );

    // 2. All active edges must strictly satisfy half-open interval [since, until)
    for (const edge of graph.edges) {
      assert.ok(
        edge.sinceChapter <= ch,
        `Edge ${edge.id} sinceChapter (${edge.sinceChapter}) must be <= chapter (${ch})`
      );
      assert.ok(
        edge.untilChapter === null || ch < edge.untilChapter,
        `Edge ${edge.id} untilChapter (${edge.untilChapter}) must be > chapter (${ch})`
      );
      assert.notEqual(
        edge.sourceId,
        edge.targetId,
        `Edge ${edge.id} must never be a self-loop`
      );
    }
    assert.equal(
      graph.edges.length,
      graph.metadata.activeRelationshipsCount,
      `Ch ${ch}: edges count must match metadata active count`
    );

    // 3. Connections must cleanly bundle active edges
    assert.equal(
      graph.connections.length,
      graph.metadata.activeConnectionsCount,
      `Ch ${ch}: connections count must match metadata connections count`
    );
    const bundledEdgeCount = graph.connections.reduce(
      (sum, c) => sum + c.records.length,
      0
    );
    assert.equal(
      bundledEdgeCount,
      graph.edges.length,
      `Ch ${ch}: sum of connection records must equal total active edges`
    );

    // 4. Excluded self-loops must be strictly chapter-scoped
    const expectedSelfLoops = ch < 3 ? 0 : ch < 13 ? 1 : ch < 16 ? 3 : 4;
    assert.equal(
      graph.metadata.excludedSelfLoopsCount,
      expectedSelfLoops,
      `Ch ${ch}: chapter-scoped self-loops must be ${expectedSelfLoops}`
    );
  }
});

test("Character Network Contract - Future-Data Leakage Prevention Across All Chapters", () => {
  for (let ch = 1; ch <= 20; ch++) {
    const graph = transformCharacterNetwork({
      projectId: AETHELGARD_PROJECT_ID,
      characters: AETHELGARD_CHARACTERS,
      relationships: AETHELGARD_RELATIONSHIPS,
      chapter: ch,
    });

    const vespera = graph.nodes.find((n) => n.name === "Lady Vespera Thorne");
    const voss = graph.nodes.find((n) => n.name === "Kaelen Voss");
    const malakor = graph.nodes.find((n) => n.name === "High Inquisitor Malakor");

    // 1. Alias leak check: "Princess Aurelia" must only appear at Ch >= 16
    if (vespera) {
      if (ch < 16) {
        assert.ok(
          !vespera.aliases.includes("Princess Aurelia"),
          `Ch ${ch}: Princess Aurelia must NOT be revealed before Ch 16`
        );
        assert.ok(
          !vespera.description.includes("Princess Aurelia"),
          `Ch ${ch}: Description must not mention Princess Aurelia before Ch 16`
        );
      } else {
        assert.ok(
          vespera.aliases.includes("Princess Aurelia"),
          `Ch ${ch}: Princess Aurelia MUST be revealed at Ch >= 16`
        );
      }
    }

    // 2. Voss status leak check: sacrifice occurs at Ch 17
    if (voss) {
      if (ch < 17) {
        assert.equal(
          voss.state.status,
          "alive",
          `Ch ${ch}: Voss status must be alive before Ch 17`
        );
      } else {
        assert.equal(
          voss.state.status,
          "deceased",
          `Ch ${ch}: Voss status must reflect sacrifice at Ch >= 17`
        );
      }
    }

    // 3. Malakor status leak check: transformation at Ch 16, stasis loop at Ch 19
    if (malakor) {
      if (ch < 19) {
        assert.equal(
          malakor.state.status,
          "alive",
          `Ch ${ch}: Malakor status must be alive before Ch 19 stasis loop`
        );
      } else {
        assert.equal(
          malakor.state.status,
          "incapacitated",
          `Ch ${ch}: Malakor status must reflect stasis loop at Ch >= 19`
        );
      }
    }

    // 4. Verify no raw future-leaking fields exist on any node
    for (const node of graph.nodes) {
      const record = node as unknown as Record<string, unknown>;
      assert.equal(
        record.rawStatus,
        undefined,
        "rawStatus must not be present on chapter-scoped node"
      );
      assert.equal(
        record.allAliases,
        undefined,
        "allAliases must not be present on chapter-scoped node"
      );
      assert.equal(
        record.lastChapter,
        undefined,
        "lastChapter must not be present on chapter-scoped node"
      );
    }
  }
});

test("Character Network Contract - Overlap Validation Distinguishes Reciprocal Perspectives", () => {
  const issues = validateGraphIntegrity(
    AETHELGARD_CHARACTERS,
    AETHELGARD_RELATIONSHIPS
  );

  const conflictIssues = issues.filter(
    (i) => i.code === "CONFLICTING_INTERVAL"
  );
  assert.equal(
    conflictIssues.length,
    0,
    "Aethelgard dataset has zero conflicting same-direction intervals"
  );

  // Simulated conflict: two edges in the SAME direction overlapping
  const conflictingRels: RawRelationship[] = [
    {
      id: "rel-c1",
      character_a_id: "082fa8a3-47e6-4436-82c1-8197f0f71381", // Corin
      character_b_id: "b38566c3-1aef-44e5-9eb3-c65402472d47", // Silas
      type: "ally",
      sentiment: "trusting",
      chapter: 1,
      until_chapter: 10,
      evidence_quote: "quote1",
      description: "desc1",
    },
    {
      id: "rel-c2",
      character_a_id: "082fa8a3-47e6-4436-82c1-8197f0f71381", // Corin
      character_b_id: "b38566c3-1aef-44e5-9eb3-c65402472d47", // Silas
      type: "enemy",
      sentiment: "hostile",
      chapter: 5,
      until_chapter: 15, // overlaps with rel-c1 on [5, 10) in same direction!
      evidence_quote: "quote2",
      description: "desc2",
    },
  ];

  const conflictDetected = validateGraphIntegrity(
    AETHELGARD_CHARACTERS,
    conflictingRels
  );
  const foundConflict = conflictDetected.find(
    (i) => i.code === "CONFLICTING_INTERVAL"
  );
  assert.ok(foundConflict, "Must detect true same-direction interval conflict");
  assert.equal(foundConflict?.severity, "error");
});

test("Character Network Contract - Visual Connection Grouping & Documented visualTone", () => {
  const ch16 = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 16,
  });

  const vossId = "faf3b450-18bb-49f0-94a0-6ac3521482d3";
  const vesperaId = "6f1bcccc-39c1-456a-95e8-532c88fc1b8a";

  const connection = ch16.connections.find(
    (c) =>
      (c.characterAId === vossId && c.characterBId === vesperaId) ||
      (c.characterAId === vesperaId && c.characterBId === vossId)
  );

  assert.ok(connection, "Visual connection between Voss and Vespera must exist");
  assert.equal(connection?.isReciprocal, true, "Connection must be marked as reciprocal");
  assert.equal(connection?.records.length, 2, "Must bundle exactly 2 directional records");
  assert.equal(connection?.visualTone, "friction", "visualTone must be friction");
  assert.deepEqual(
    connection?.sentimentDistribution,
    ["guilty", "resigned"],
    "sentimentDistribution must preserve distinct sentiments"
  );

  // Single record connection check (Corin and Silas in Ch 1)
  const ch1 = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 1,
  });
  const connCh1 = ch1.connections[0];
  assert.equal(connCh1.isReciprocal, false);
  assert.equal(connCh1.visualTone, "warmth");
  assert.deepEqual(connCh1.sentimentDistribution, ["respectful"]);
});

test("Character Network Contract - Historical Relationship Timeline Retrieval", () => {
  const corinId = "082fa8a3-47e6-4436-82c1-8197f0f71381";
  const vesperaId = "6f1bcccc-39c1-456a-95e8-532c88fc1b8a";

  // History evaluated strictly up to Chapter 8
  const historyCh8 = getHistoricalRelationshipsForPair(
    AETHELGARD_RELATIONSHIPS,
    AETHELGARD_CHARACTERS,
    corinId,
    vesperaId,
    8
  );

  assert.equal(
    historyCh8.length,
    2,
    "At chapter 8, only 2 relationship stages should exist historically"
  );
  assert.equal(historyCh8[0].relation, "professional");
  assert.equal(historyCh8[0].sinceChapter, 2);
  assert.equal(historyCh8[0].untilChapter, 8);
  assert.equal(historyCh8[0].isCurrentAtChapter, false);
  assert.equal(historyCh8[0].supersededAtChapter, 8);

  assert.equal(historyCh8[1].relation, "collaborative");
  assert.equal(historyCh8[1].sinceChapter, 8);
  assert.equal(historyCh8[1].untilChapter, 9);
  assert.equal(historyCh8[1].isCurrentAtChapter, true);
  assert.equal(historyCh8[1].supersededAtChapter, null);

  // Full novel history (all 20 chapters)
  const fullHistory = getHistoricalRelationshipsForPair(
    AETHELGARD_RELATIONSHIPS,
    AETHELGARD_CHARACTERS,
    corinId,
    vesperaId
  );
  assert.equal(fullHistory.length, 8, "Corin and Vespera evolve through 8 stages across the novel");
  assert.equal(fullHistory[fullHistory.length - 1].relation, "ceremonial-formal");
  assert.equal(fullHistory[fullHistory.length - 1].sinceChapter, 20);
});

test("Character Network Contract - Chapter-Authorized Evidence Provenance Retrieval", () => {
  const relIdCh8 = "cd7097c5-cf86-4f54-922f-a38eb9de0d56"; // Ch 8 star charts
  const relIdCh16 = "b6967fda-0c60-4463-85ee-76a0bbd6f0c7"; // Ch 16 Malakor sacrificial confrontation

  // 1. Authorized retrieval at Chapter 8
  const provCh8 = getRelationshipProvenance(
    AETHELGARD_RELATIONSHIPS,
    AETHELGARD_CHARACTERS,
    relIdCh8,
    8
  );
  assert.ok(provCh8);
  assert.equal(provCh8?.relationshipId, relIdCh8);
  assert.equal(provCh8?.sourceCharacter.name, "Corin Vance");
  assert.equal(provCh8?.targetCharacter.name, "Lady Vespera Thorne");
  assert.equal(provCh8?.chapterRange.since, 8);
  assert.equal(provCh8?.chapterRange.until, 9);
  assert.equal(provCh8?.isHistorical, false);

  // 2. Unauthorized future retrieval: Chapter 16 record queried from Chapter 8 perspective
  const unauthorizedFuture = getRelationshipProvenance(
    AETHELGARD_RELATIONSHIPS,
    AETHELGARD_CHARACTERS,
    relIdCh16,
    8 // upToChapter = 8, while relIdCh16 is from Ch 16!
  );
  assert.equal(
    unauthorizedFuture,
    null,
    "Querying a future relationship outside chapter horizon must return null"
  );

  // 3. Authorized retrieval when horizon reaches Chapter 16
  const authorizedCh16 = getRelationshipProvenance(
    AETHELGARD_RELATIONSHIPS,
    AETHELGARD_CHARACTERS,
    relIdCh16,
    16
  );
  assert.ok(authorizedCh16);
  assert.equal(authorizedCh16?.chapterRange.since, 16);
  assert.ok(authorizedCh16?.evidenceQuote?.includes("intended to sacrifice her"));
});

test("Character Network Contract - Milestone Chapter Counts", () => {
  // Chapter 1
  const ch1 = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 1,
  });
  assert.equal(ch1.metadata.introducedCharactersCount, 2);
  assert.equal(ch1.metadata.activeRelationshipsCount, 1);
  assert.equal(ch1.metadata.activeConnectionsCount, 1);

  // Chapter 8
  const ch8 = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 8,
  });
  assert.equal(ch8.metadata.introducedCharactersCount, 7);
  assert.equal(ch8.metadata.activeRelationshipsCount, 7);
  assert.equal(ch8.metadata.activeConnectionsCount, 7);

  // Chapter 16
  const ch16 = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 16,
  });
  assert.equal(ch16.metadata.introducedCharactersCount, 7);
  assert.equal(ch16.metadata.activeRelationshipsCount, 11);
  assert.equal(ch16.metadata.activeConnectionsCount, 10);

  // Chapter 20
  const ch20 = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 20,
  });
  assert.equal(ch20.metadata.introducedCharactersCount, 7);
  assert.equal(ch20.metadata.activeRelationshipsCount, 11);
  assert.equal(ch20.metadata.activeConnectionsCount, 11);
});

test("Character Network Contract - State Transition Evidence & Verbatim Source Provenance", () => {
  // Test every character across chapters 1, 8, 16, 20
  for (const ch of [1, 8, 16, 20]) {
    const graph = transformCharacterNetwork({
      projectId: AETHELGARD_PROJECT_ID,
      characters: AETHELGARD_CHARACTERS,
      relationships: AETHELGARD_RELATIONSHIPS,
      chapter: ch,
    });

    for (const node of graph.nodes) {
      assert.ok(node.state.statusTransition, `Node ${node.name} must have statusTransition at Ch ${ch}`);
      assert.ok(node.state.statusTransition.sourceId, `Node ${node.name} must have sourceId at Ch ${ch}`);
      assert.ok(node.state.statusTransition.chapter <= ch, `Transition chapter cannot be in future for ${node.name}`);
      assert.ok(node.state.statusTransition.evidenceQuote.length > 0, `Evidence quote cannot be empty for ${node.name}`);
      assert.ok(
        ["relationship", "claim", "character_genesis"].includes(node.state.statusTransition.sourceType),
        `Valid sourceType for ${node.name}`
      );
    }
  }

  // Exact transition provenance verification
  const ch14 = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 14,
  });
  const silasCh14 = ch14.nodes.find((n) => n.name === "Silas Vance");
  assert.equal(silasCh14?.state.statusTransition.sourceId, "claim:1e3807db-88e2-4112-8ed8-da1fe54d9fee");

  const ch15 = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 15,
  });
  const silasCh15 = ch15.nodes.find((n) => n.name === "Silas Vance");
  assert.equal(silasCh15?.state.statusTransition.sourceId, "rel:3c6e20b1-8e00-4ffb-858b-b05600d03709");
  assert.ok(silasCh15?.state.statusTransition.evidenceQuote.includes("Silas was mortally wounded"));

  const ch17 = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 17,
  });
  const vossCh17 = ch17.nodes.find((n) => n.name === "Kaelen Voss");
  assert.equal(vossCh17?.state.status, "deceased");
  assert.equal(vossCh17?.state.statusTransition.sourceId, "rel:6b3dfdf3-55eb-4c92-bbd8-084d96447289");
  assert.ok(vossCh17?.state.statusTransition.evidenceQuote.includes("jams his mechanical arm into the gear teeth"));

  const ch19 = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 19,
  });
  const malakorCh19 = ch19.nodes.find((n) => n.name === "High Inquisitor Malakor");
  assert.equal(malakorCh19?.state.status, "incapacitated");
  assert.equal(malakorCh19?.state.statusTransition.sourceId, "claim:00a3abdf-4c20-4c54-9e22-0863e72dded5");
  assert.ok(malakorCh19?.state.statusTransition.evidenceQuote.includes("recurring five-second temporal stasis loop"));
});

test("Character Network Contract - Neo4j Projection Drift & PostgreSQL Evidence Enrichment", () => {
  // Simulated StoryGraph returned from Neo4j (edges prefixed with rel: and lacking evidenceQuote)
  const simulatedNeo4jGraph = {
    nodes: AETHELGARD_CHARACTERS.map((c) => ({
      id: `char:${c.id}`,
      label: c.name,
      kind: "character" as const,
      chapter: c.first_chapter,
    })),
    edges: [
      {
        id: "rel:480d800d-5da8-4537-b92c-9809abb1c43c",
        source: "char:6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
        target: "char:a3841ca4-db51-407d-b2be-24c0cbec7008",
        relation: "familial",
        sentiment: "devoted",
        since_chapter: 2,
        until_chapter: null,
      },
      // Stale edge in Neo4j that does not exist in Postgres
      {
        id: "rel:stale-uuid-99999",
        source: "char:6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
        target: "char:a3841ca4-db51-407d-b2be-24c0cbec7008",
        relation: "ghost-relation",
        sentiment: "neutral",
        since_chapter: 1,
        until_chapter: null,
      },
    ],
    neo4j_connected: true,
    max_chapter: 20,
  };

  const { enrichedEdges, driftReport } = enrichNeo4jGraphWithPostgresEvidence(
    simulatedNeo4jGraph,
    AETHELGARD_RELATIONSHIPS
  );

  // Verifications
  assert.equal(driftReport.isSynchronized, false, "Should detect drift due to stale and missing edges");
  assert.equal(driftReport.staleInNeo4jCount, 1);
  assert.equal(driftReport.staleInNeo4jIds[0], "rel:stale-uuid-99999");
  assert.equal(driftReport.missingInNeo4jCount, 39, "Postgres has 40 rels, only 1 was in simulated Neo4j");
  assert.equal(driftReport.enrichedEdgesCount, 1);

  // Verify the matched edge was enriched with PostgreSQL verbatim quotation
  const matched = enrichedEdges[0];
  assert.equal(matched.id, "480d800d-5da8-4537-b92c-9809abb1c43c");
  assert.ok(matched.evidenceQuote, "Must be enriched with PostgreSQL evidence quote");
  assert.ok(matched.evidenceQuote.includes("Lady Vespera Thorne claims her brother Lord Julian was lost"));
});
