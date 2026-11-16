import test from "node:test";
import assert from "node:assert/strict";
import { transformStoryGraph, extractBareId } from "../transform.ts";
import {
  mapToG6GraphData,
  getG6GraphConfig,
  clampLabelToEnvelope,
  computeBoundingHullRadius,
} from "../g6Adapter.ts";
import type { RawCharacter, RawRelationship } from "../../characterNetwork/types.ts";
import type { StoryGraph } from "../../types.ts";

const mockCharacters: RawCharacter[] = [
  {
    id: "char-1",
    name: "Corin Vance",
    status: "alive",
    first_chapter: 1,
    last_chapter: null,
    aliases: ["The Shadow Scribe"],
    physical_traits: { condition: "Alert and searching" },
    description: "Young archivist of Aethelgard.",
  },
  {
    id: "char-2",
    name: "Lady Vespera Thorne",
    status: "alive",
    first_chapter: 1,
    last_chapter: null,
    aliases: ["Vespera"],
    physical_traits: { condition: "Plotting in secret" },
    description: "Noble scion of the Thorne house.",
  },
  {
    id: "char-3",
    name: "Silas Vance",
    status: "deceased",
    first_chapter: 5,
    last_chapter: 12,
    aliases: ["Old Silas"],
    physical_traits: { condition: "Fallen in battle" },
    description: "Former high archivist.",
  },
];

const mockRelationships: RawRelationship[] = [
  {
    id: "rel-1",
    character_a_id: "char-1",
    character_b_id: "char-2",
    type: "collaborative / intellectual ally",
    sentiment: "warmth",
    chapter: 1,
    until_chapter: null,
    evidence_quote: "They shared secret notes across the desk.",
    description: "Close investigative partnership.",
  },
  {
    id: "rel-2",
    character_a_id: "char-2",
    character_b_id: "char-3",
    type: "adversarial / political betrayal",
    sentiment: "hostile",
    chapter: 6,
    until_chapter: null,
    evidence_quote: "She poisoned his chalice at dusk.",
    description: "Vespera betrayed Silas to seize the codex.",
  },
];

const mockStoryGraph: StoryGraph = {
  nodes: [
    {
      id: "char:char-1",
      label: "Corin Vance",
      kind: "character",
      chapter: 1,
    },
    {
      id: "char:char-2",
      label: "Lady Vespera Thorne",
      kind: "character",
      chapter: 1,
    },
    {
      id: "obj:relic-1",
      label: "Obsidian Dagger of Vane",
      kind: "object",
      chapter: 3,
      metadata: {
        description: "An ancient blade humming with shadow essence.",
        mention_chapters: [3, 7, 14],
      },
    },
    {
      id: "loc:setting-1",
      label: "The Sunken Archives",
      kind: "location",
      chapter: 1,
      metadata: {
        description: "Subterranean catacombs beneath Aethelgard.",
      },
    },
    {
      id: "event:event-1",
      label: "The Cataclysm of Dusk",
      kind: "event",
      chapter: 8,
      metadata: {
        summary: "The grand vault collapsed under forbidden rite.",
        participants: ["Corin Vance", "Lady Vespera Thorne"],
        location: "The Sunken Archives",
      },
    },
  ],
  edges: [
    {
      id: "edge-custody-1",
      source: "char:char-1",
      target: "obj:relic-1",
      relation: "WIELDS",
      sentiment: "warmth",
      since_chapter: 3,
      until_chapter: null,
      description: "Corin recovered the blade from the crypt.",
    },
    {
      id: "edge-loc-1",
      source: "char:char-1",
      target: "loc:setting-1",
      relation: "RESIDES_IN",
      sentiment: "neutral",
      since_chapter: 1,
      until_chapter: null,
      description: "Corin studies in the archives.",
    },
  ],
  neo4j_connected: true,
  max_chapter: 20,
};

test("World & Cast Network - extractBareId strips prefix cleanly", () => {
  assert.equal(extractBareId("char:abc-123"), "abc-123");
  assert.equal(extractBareId("obj:dagger-456"), "dagger-456");
  assert.equal(extractBareId("bare-uuid"), "bare-uuid");
});

test("World & Cast Network - Chapter 1 Cast Lens isolates Chapter 1 characters only", () => {
  const result = transformStoryGraph({
    projectId: "proj-1",
    characters: mockCharacters,
    relationships: mockRelationships,
    storyGraph: mockStoryGraph,
    chapter: 1,
    lensMode: "cast",
  });

  // Silas Vance (Ch 5) and Obsidian Dagger (Ch 3) must be excluded
  assert.equal(result.nodes.length, 2);
  const names = result.nodes.map((n) => n.name).sort();
  assert.deepEqual(names, ["Corin Vance", "Lady Vespera Thorne"]);

  // Only Ch 1 relationship should be present
  assert.equal(result.connections.length, 1);
  assert.equal(result.connections[0].visualTone, "warmth");
});

test("World & Cast Network - Relics Lens brings in Chapter 3 Relic and Custody connection", () => {
  const result = transformStoryGraph({
    projectId: "proj-1",
    characters: mockCharacters,
    relationships: mockRelationships,
    storyGraph: mockStoryGraph,
    chapter: 4,
    lensMode: "relics",
  });

  // Corin Vance, Lady Vespera, and Obsidian Dagger
  const kinds = result.nodes.map((n) => n.kind).sort();
  assert.deepEqual(kinds, ["character", "character", "object"]);

  // Relic custody connection is present
  const custodyConn = result.connections.find((c) => c.connectionTypes.includes("custody"));
  assert.ok(custodyConn, "Custody connection must be present");
  assert.equal(custodyConn.sourceName, "Corin Vance");
  assert.equal(custodyConn.targetName, "Obsidian Dagger of Vane");
});

test("World & Cast Network - Geography Lens brings in Locations and Spatial Presence", () => {
  const result = transformStoryGraph({
    projectId: "proj-1",
    characters: mockCharacters,
    relationships: mockRelationships,
    storyGraph: mockStoryGraph,
    chapter: 2,
    lensMode: "geography",
  });

  const locNode = result.nodes.find((n) => n.kind === "location");
  assert.ok(locNode, "Location node must be present");
  assert.equal(locNode.name, "The Sunken Archives");

  const spatialConn = result.connections.find((c) => c.connectionTypes.includes("spatial"));
  assert.ok(spatialConn, "Spatial presence connection must be present");
});

test("World & Cast Network - Full Lens at Chapter 10 incorporates all entities", () => {
  const result = transformStoryGraph({
    projectId: "proj-1",
    characters: mockCharacters,
    relationships: mockRelationships,
    storyGraph: mockStoryGraph,
    chapter: 10,
    lensMode: "full",
  });

  // All 3 characters, 1 relic, 1 location, 1 event
  assert.equal(result.nodes.length, 6);
  assert.ok(result.nodes.some((n) => n.name === "Silas Vance"));
  assert.ok(result.nodes.some((n) => n.name === "The Cataclysm of Dusk"));
});

test("World & Cast Network - G6 Adapter maps multi-entity nodes with correct badges and sizes", () => {
  const graphData = transformStoryGraph({
    projectId: "proj-1",
    characters: mockCharacters,
    relationships: mockRelationships,
    storyGraph: mockStoryGraph,
    chapter: 4,
    lensMode: "relics",
  });

  const g6Data = mapToG6GraphData(graphData);
  assert.equal(g6Data.nodes.length, 3);
  assert.equal(g6Data.edges.length, 2);

  const relicG6Node = g6Data.nodes.find((n) => n.data.kind === "object");
  assert.ok(relicG6Node);
  assert.equal(relicG6Node.style.badgeText, "RELIC");
  assert.equal(relicG6Node.style.iconText, "◆");

  const config = getG6GraphConfig("container", 1200, 800);
  assert.deepEqual(config.layout.center, [600, 400]);
});

test("World & Cast Network - Universal Line-Clamping & 2D Bounding Hull Collision", () => {
  const longManuscriptSentence =
    "The world becomes through a thin radiation visible to a selected few who survived the initial blast";
  const clamped = clampLabelToEnvelope(longManuscriptSentence, 20, 2);

  const lines = clamped.split("\n");
  assert.ok(lines.length <= 2, "Must not exceed 2 lines");
  assert.ok(clamped.includes("…"), "Must include ellipsis for clamped long text");
  for (const line of lines) {
    assert.ok(line.length <= 20, `Line length must not exceed 20 chars: "${line}" (${line.length})`);
  }

  // Hull radius for short label vs long label
  const shortRadius = computeBoundingHullRadius(20, "Sophie", 16);
  const longRadius = computeBoundingHullRadius(20, clamped, 16);
  assert.ok(longRadius > shortRadius, "Long label must produce larger collision radius than short label");
  assert.ok(longRadius >= 60, "Long label must have adequate physical collision clearance");

  // Verify hover-activate has no inactiveState (prevents blinking strobe)
  const config = getG6GraphConfig("container", 1000, 600);
  const hoverBehavior = config.behaviors.find((b: any) => b.type === "hover-activate");
  assert.ok(hoverBehavior, "hover-activate behavior must be present");
  assert.equal(
    hoverBehavior.inactiveState,
    undefined,
    "inactiveState must be undefined to avoid rapid cursor sweeping flicker"
  );
});

test("World & Cast Network - Ego-Network Isolation Focus Mode", () => {
  const fullGraph = transformStoryGraph({
    projectId: "proj-1",
    characters: mockCharacters,
    relationships: mockRelationships,
    storyGraph: mockStoryGraph,
    chapter: 10,
    lensMode: "full",
  });

  // Total 6 nodes in full graph
  assert.equal(fullGraph.nodes.length, 6);

  // 1. Resting Constellation (no selection): all 6 nodes returned
  const restingData = mapToG6GraphData(fullGraph, { selectedNodeId: null });
  assert.equal(restingData.nodes.length, 6, "All 6 nodes present in resting constellation");

  // 2. Click/Select Corin Vance (char:char-1)
  // Corin connects to: Vespera (char:char-2), Silas (char:char-3), Obsidian Dagger (obj:dagger-1), Archives (loc:setting-1)
  // Cataclysm (event:event-1) is UNRELATED to Corin
  const corinId = "char:char-1";
  const isolatedData = mapToG6GraphData(fullGraph, { selectedNodeId: corinId });

  // Unrelated nodes disappear: Silas (char:char-3, 2-hop) and Cataclysm (event:event-1) must NOT be present
  assert.ok(isolatedData.nodes.some((n) => n.id === corinId), "Selected node must be present");
  assert.ok(isolatedData.nodes.some((n) => n.id === "char:char-2"), "Connected neighbor Vespera must be present");
  assert.ok(isolatedData.nodes.some((n) => n.id === "obj:relic-1"), "Connected relic must be present");
  assert.ok(isolatedData.nodes.some((n) => n.id === "loc:setting-1"), "Connected location must be present");
  assert.ok(!isolatedData.nodes.some((n) => n.id === "char:char-3"), "Unrelated character Silas must disappear");
  assert.ok(!isolatedData.nodes.some((n) => n.id === "event:event-1"), "Unrelated event Cataclysm must disappear");
  assert.equal(isolatedData.nodes.length, 4, "Only Corin + 3 connected neighbors show (4 total; Silas and Cataclysm disappeared)");

  // 3. Deselect Corin: all 6 nodes reappear
  const restoredData = mapToG6GraphData(fullGraph, { selectedNodeId: null });
  assert.equal(restoredData.nodes.length, 6, "All 6 nodes reappear on deselect");
});
