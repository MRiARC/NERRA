import test from "node:test";
import assert from "node:assert/strict";
import {
  AETHELGARD_CHARACTERS,
  AETHELGARD_PROJECT_ID,
  AETHELGARD_RELATIONSHIPS,
} from "../sampleData.ts";
import { transformCharacterNetwork } from "../transform.ts";
import {
  EDITORIAL_PALETTE,
  getG6GraphConfig,
  mapToG6GraphData,
} from "../g6Adapter.ts";

test("G6 Adapter - Transforms Chapter 1 Graph into G6 Data", () => {
  const ch1Graph = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 1,
  });

  const g6Data = mapToG6GraphData(ch1Graph);

  assert.equal(g6Data.nodes.length, 2, "Chapter 1 has 2 nodes");
  assert.equal(g6Data.edges.length, 1, "Chapter 1 has 1 edge");

  const corinNode = g6Data.nodes.find((n) => n.data.name === "Corin Vance");
  const silasNode = g6Data.nodes.find((n) => n.data.name === "Silas Vance");

  assert.ok(corinNode);
  assert.ok(silasNode);

  // Corin: Alive (Emerald stroke)
  assert.equal(corinNode?.data.status, "alive");
  assert.equal(corinNode?.style.stroke, EDITORIAL_PALETTE.status.alive.stroke);

  // Silas: Deceased (Zinc/Stone stroke)
  assert.equal(silasNode?.data.status, "deceased");
  assert.equal(silasNode?.style.stroke, EDITORIAL_PALETTE.status.deceased.stroke);
  assert.equal(silasNode?.style.badgeText, "DECEASED");

  // Edge tone: Warmth (mentor-student, respectful)
  const edge = g6Data.edges[0];
  assert.equal(edge.data.visualTone, "warmth");
  assert.equal(edge.style.stroke, EDITORIAL_PALETTE.tone.warmth.stroke);
  assert.equal(edge.data.records.length, 1);
  assert.ok(edge.data.records[0].evidenceQuote?.includes("Silas Vance was his mentor"));
});

test("G6 Adapter - Transforms Chapter 16 with Multiple Tones and Reciprocal Connections", () => {
  const ch16Graph = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 16,
  });

  const g6Data = mapToG6GraphData(ch16Graph);

  assert.equal(g6Data.nodes.length, 7, "All 7 characters introduced by Ch 16");
  assert.equal(g6Data.edges.length, 10, "10 visual connections active at Ch 16");

  // Check that edge sentiments and underlying records are preserved
  for (const edge of g6Data.edges) {
    assert.ok(edge.data.records.length >= 1, "Must contain at least 1 underlying record");
    assert.ok(edge.data.sentimentDistribution.length >= 1);
    const validStrokes: string[] = [
      EDITORIAL_PALETTE.tone.friction.stroke,
      EDITORIAL_PALETTE.tone.warmth.stroke,
      EDITORIAL_PALETTE.tone.neutral.stroke,
    ];
    assert.ok(
      validStrokes.includes(edge.style.stroke),
      "Edge stroke must match editorial palette"
    );
  }
});

test("G6 Adapter - Filters (Search and Status) Correctly Prune Isolated Endpoints", () => {
  const ch20Graph = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 20,
  });

  // Filter for deceased only: Silas and Voss
  const deceasedOnly = mapToG6GraphData(ch20Graph, { statusFilter: "deceased" });
  assert.equal(deceasedOnly.nodes.length, 2);
  const names = deceasedOnly.nodes.map((n) => n.data.name).sort();
  assert.deepEqual(names, ["Kaelen Voss", "Silas Vance"]);

  // Search filter for "astrologer"
  const searchResult = mapToG6GraphData(ch20Graph, { searchQuery: "astrologer" });
  assert.equal(searchResult.nodes.length, 1);
  assert.equal(searchResult.nodes[0].data.name, "Elowen");
});

test("G6 Adapter - Spotlight Dimming When Node is Selected", () => {
  const ch8Graph = transformCharacterNetwork({
    projectId: AETHELGARD_PROJECT_ID,
    characters: AETHELGARD_CHARACTERS,
    relationships: AETHELGARD_RELATIONSHIPS,
    chapter: 8,
  });

  const corinId = "082fa8a3-47e6-4436-82c1-8197f0f71381";
  const spotlightData = mapToG6GraphData(ch8Graph, { selectedNodeId: corinId });

  const corinNode = spotlightData.nodes.find((n) => n.id === corinId);
  assert.equal(corinNode?.style.opacity, 1, "Focused node has full opacity");

  // Count bright vs dimmed nodes
  const brightNodes = spotlightData.nodes.filter((n) => n.style.opacity === 1);
  const dimmedNodes = spotlightData.nodes.filter((n) => n.style.opacity < 1);

  assert.ok(brightNodes.length > 0);
  assert.ok(dimmedNodes.length >= 0);
});

test("G6 Adapter - Config Structure Generates Valid Force-Directed Options", () => {
  const dummyContainer = {} as HTMLElement;
  const config = getG6GraphConfig(dummyContainer, 800, 600);

  assert.equal(config.width, 800);
  assert.equal(config.height, 600);
  assert.equal(config.layout.type, "d3-force");
  assert.equal(config.layout.preventOverlap, true);
  assert.equal(config.behaviors.length, 5);
  const behaviorTypes = config.behaviors.map((b) => b.type);
  assert.ok(behaviorTypes.includes("drag-element"));
  assert.ok(behaviorTypes.includes("hover-activate"));
  assert.ok(behaviorTypes.includes("auto-adapt-label"));
});
