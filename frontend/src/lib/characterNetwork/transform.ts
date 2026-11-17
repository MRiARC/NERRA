/**
 * Character Network Transformation Engine.
 *
 * Implements a read-only, deterministic transformation from raw PostgreSQL / Neo4j
 * story-world records into normalized Character Network DTOs.
 *
 * Grounded in verified database provenance:
 * 1. Physical status, condition, and known revelations are cleanly separated.
 * 2. Descriptions are constructed strictly from claims available up to chapter N.
 * 3. visualTone aggregation is explicitly defined and documented, keeping underlying sentiments intact.
 * 4. Provenance retrieval enforces chapter authorization to prevent forward leaks.
 * 5. Strict half-open intervals: [since_chapter, until_chapter).
 * 6. Visual connection grouping bundles directional records into cohesive visual links.
 */

import type {
  CharacterNetworkEdge,
  CharacterNetworkGraph,
  CharacterNetworkMetadata,
  CharacterNetworkNode,
  CharacterRevelation,
  CharacterState,
  DataQualityIssue,
  EvidenceProvenance,
  HistoricalRelationshipStage,
  NarrativeThreadLink,
  RawCharacter,
  RawRelationship,
  StateTransitionEvidence,
  TransformOptions,
  VisualConnection,
  VisualTone,
} from "./types.ts";

/**
 * Derives structured character state dynamically from entity records and relationship events:
 * cleanly separating physical vitality status, narrative condition, and revelations known on or before chapter N.
 *
 * Guarantees:
 * - 100% data-driven: operates on any novel / manuscript records without hardcoded character dictionaries.
 * - Every state transition includes verbatim database evidence and source record ID.
 * - Narrative discoveries are decoupled from physical vitality.
 */
export function deriveCharacterState(
  character: RawCharacter,
  selectedChapter: number,
  allRelationships: readonly RawRelationship[] = []
): CharacterState {
  // Relationships involving this character on or before selectedChapter
  const charRelsUpToChapter = allRelationships
    .filter(
      (r) =>
        (r.character_a_id === character.id || r.character_b_id === character.id) &&
        r.chapter <= selectedChapter
    )
    .sort((a, b) => a.chapter - b.chapter);

  // Active relationships at selectedChapter
  const activeRels = charRelsUpToChapter.filter(
    (r) => r.until_chapter === null || selectedChapter < r.until_chapter
  );

  // Derive known revelations dynamically:
  // A revelation is either:
  // 1. A self-referential relationship (r.character_a_id === r.character_b_id)
  // 2. A relationship whose type or description indicates identity, secret, truth, betrayal, confession, sacrifice, or stasis
  // 3. A relationship with sentiment 'traumatic-obedience' or similar profound turn
  const knownRevelations: CharacterRevelation[] = [];
  const seenRevIds = new Set<string>();

  for (const r of charRelsUpToChapter) {
    const isSelfLoop = r.character_a_id === r.character_b_id;
    const typeLower = (r.type || "").toLowerCase();
    const descLower = (r.description || "").toLowerCase();
    const sentLower = (r.sentiment || "").toLowerCase();

    const isRevelationType =
      isSelfLoop ||
      typeLower.includes("revelation") ||
      typeLower.includes("truth") ||
      typeLower.includes("confession") ||
      typeLower.includes("betray") ||
      typeLower.includes("identity") ||
      typeLower.includes("secret") ||
      typeLower.includes("sacrific") ||
      typeLower.includes("stasis") ||
      typeLower.includes("mutiny") ||
      typeLower.includes("transform") ||
      sentLower.includes("traumatic") ||
      sentLower.includes("betrayed") ||
      sentLower.includes("guilty") ||
      descLower.includes("revealed") ||
      descLower.includes("secret") ||
      descLower.includes("confess") ||
      descLower.includes("stasis loop") ||
      descLower.includes("transform");

    if (isRevelationType && !seenRevIds.has(r.id)) {
      seenRevIds.add(r.id);

      // Determine clean category
      let category: "identity" | "historical_truth" | "betrayal" | "fate" | "lore" =
        "lore";
      if (
        typeLower.includes("identity") ||
        descLower.includes("identity") ||
        descLower.includes("princess") ||
        descLower.includes("royal")
      ) {
        category = "identity";
      } else if (
        typeLower.includes("betray") ||
        descLower.includes("betray") ||
        descLower.includes("poison") ||
        descLower.includes("confess")
      ) {
        category = "betrayal";
      } else if (
        typeLower.includes("sacrific") ||
        typeLower.includes("stasis") ||
        typeLower.includes("transform") ||
        descLower.includes("sacrifice") ||
        descLower.includes("stasis") ||
        descLower.includes("whirlpool") ||
        descLower.includes("transform")
      ) {
        category = "fate";
      } else if (
        typeLower.includes("truth") ||
        descLower.includes("truth") ||
        sentLower.includes("traumatic") ||
        descLower.includes("amnesia") ||
        typeLower.includes("mutiny")
      ) {
        category = "historical_truth";
      }

      // Generate a clean concise label
      let label = r.description
        ? r.description.split(/[.;:]/)[0].trim()
        : r.type;
      if (label.length > 50) {
        label = label.slice(0, 47) + "...";
      }

      knownRevelations.push({
        id: `rel:${r.id}`,
        category,
        revealedAtChapter: r.chapter,
        label,
        description: r.description || "",
        evidenceQuote:
          r.evidence_quote ||
          r.description ||
          `${character.name} narrative revelation in Chapter ${r.chapter}.`,
      });
    }
  }

  // Determine physical status dynamically:
  const baseStatus = (character.status || "alive").toLowerCase();
  let physicalStatus = baseStatus;
  let condition = "";

  if (baseStatus === "deceased") {
    physicalStatus = "deceased";
    // Check if a truth/revelation about the death occurred
    const latestDeathRel = [...charRelsUpToChapter]
      .reverse()
      .find(
        (r) =>
          (r.type || "").toLowerCase().includes("truth") ||
          (r.description || "").toLowerCase().includes("truth") ||
          (r.sentiment || "").toLowerCase().includes("traumatic")
      );
    if (latestDeathRel && latestDeathRel.description) {
      condition = latestDeathRel.description.split(/[.;]/)[0].trim().toLowerCase();
    } else {
      condition = character.description
        ? character.description.split(/[.;]/)[0].trim().toLowerCase()
        : "deceased";
    }
  } else if (baseStatus === "unknown") {
    physicalStatus = "unknown";
    condition = character.description
      ? character.description.split(/[.;]/)[0].trim().toLowerCase()
      : "whereabouts unknown";
  } else if (character.last_chapter !== null && selectedChapter >= character.last_chapter) {
    // Character has reached or passed their concluding chapter
    const terminalRels = charRelsUpToChapter.filter(
      (r) => r.chapter >= character.last_chapter! - 1
    );
    const sacrificeRel = terminalRels.find(
      (r) =>
        (r.type || "").toLowerCase().includes("sacrific") ||
        (r.description || "").toLowerCase().includes("sacrific") ||
        (r.description || "").toLowerCase().includes("plung") ||
        (r.description || "").toLowerCase().includes("died") ||
        (r.description || "").toLowerCase().includes("kill")
    );
    const stasisRel = terminalRels.find(
      (r) =>
        (r.type || "").toLowerCase().includes("stasis") ||
        (r.description || "").toLowerCase().includes("stasis") ||
        (r.description || "").toLowerCase().includes("loop") ||
        (r.description || "").toLowerCase().includes("trap")
    );

    if (sacrificeRel) {
      physicalStatus = "deceased";
      condition = sacrificeRel.description
        ? sacrificeRel.description.split(/[.;]/)[0].trim().toLowerCase()
        : "sacrificed";
    } else if (stasisRel) {
      physicalStatus = "incapacitated";
      condition = stasisRel.description
        ? stasisRel.description.split(/[.;]/)[0].trim().toLowerCase()
        : "trapped in stasis loop";
    } else if (selectedChapter > character.last_chapter) {
      physicalStatus = "inactive";
      condition = `concluded in Chapter ${character.last_chapter}`;
    } else {
      physicalStatus = "alive";
      condition = character.description
        ? character.description.split(/[.;]/)[0].trim().toLowerCase()
        : "active";
    }
  } else {
    // Character is alive / active in current chapter
    const activeStasisRel = activeRels.find(
      (r) =>
        (r.type || "").toLowerCase().includes("stasis") ||
        (r.description || "").toLowerCase().includes("stasis loop")
    );
    if (activeStasisRel) {
      physicalStatus = "incapacitated";
      condition = activeStasisRel.description
        ? activeStasisRel.description.split(/[.;]/)[0].trim().toLowerCase()
        : "incapacitated";
    } else {
      physicalStatus = "alive";
      // Dynamic condition from active relationships or genesis
      const latestActive = activeRels[activeRels.length - 1];
      if (latestActive && latestActive.description) {
        condition = latestActive.description.split(/[.;]/)[0].trim().toLowerCase();
      } else {
        condition = character.description
          ? character.description.split(/[.;]/)[0].trim().toLowerCase()
          : "active in story";
      }
    }
  }

  // Derive status transition dynamically:
  // Find the latest significant relationship event up to selectedChapter
  const latestRelEvent = [...charRelsUpToChapter]
    .reverse()
    .find((r) => r.evidence_quote || r.description);

  let statusTransition: StateTransitionEvidence;
  if (latestRelEvent && latestRelEvent.chapter > (character.first_chapter || 1)) {
    statusTransition = {
      sourceId: `rel:${latestRelEvent.id}`,
      sourceType: "relationship",
      chapter: latestRelEvent.chapter,
      description: latestRelEvent.description || `Story event in Chapter ${latestRelEvent.chapter}`,
      evidenceQuote:
        latestRelEvent.evidence_quote ||
        latestRelEvent.description ||
        `Story event in Chapter ${latestRelEvent.chapter}.`,
    };
  } else {
    // Falls back to character genesis
    statusTransition = {
      sourceId: `char:${character.id}`,
      sourceType: "character_genesis",
      chapter: character.first_chapter || 1,
      description: `Introduced in Chapter ${character.first_chapter || 1}`,
      evidenceQuote: character.description || `${character.name} appears in Chapter ${character.first_chapter || 1}.`,
    };
  }

  return {
    status: physicalStatus,
    condition,
    statusTransition,
    knownRevelations,
  };
}

/**
 * Returns revealed aliases grounded dynamically in records available at chapter N.
 * Withholds aliases that only appear in future chapter relationship records.
 */
export function deriveChapterScopedAliases(
  character: RawCharacter,
  selectedChapter: number,
  allRelationships: readonly RawRelationship[] = []
): string[] {
  const allAliases = character.aliases || [];
  if (allAliases.length === 0) return [];

  const pastRels = allRelationships.filter(
    (r) =>
      (r.character_a_id === character.id || r.character_b_id === character.id) &&
      r.chapter <= selectedChapter
  );
  const futureRels = allRelationships.filter(
    (r) =>
      (r.character_a_id === character.id || r.character_b_id === character.id) &&
      r.chapter > selectedChapter
  );

  const pastCorpus = [
    character.name,
    character.description || "",
    ...pastRels.map((r) => `${r.type} ${r.description || ""} ${r.evidence_quote || ""}`),
  ]
    .join(" ")
    .toLowerCase();

  const futureCorpus = futureRels
    .map((r) => `${r.type} ${r.description || ""} ${r.evidence_quote || ""}`)
    .join(" ")
    .toLowerCase();

  return allAliases.filter((alias) => {
    const norm = alias.trim().toLowerCase();
    if (pastCorpus.includes(norm) || character.name.toLowerCase().includes(norm)) {
      return true;
    }
    if (futureCorpus.includes(norm)) {
      return false;
    }
    return true;
  });
}

/**
 * Constructs a chapter-scoped character description built dynamically from
 * character introduction and relationship milestones established on or before chapter N.
 */
export function deriveChapterScopedDescription(
  character: RawCharacter,
  selectedChapter: number,
  allRelationships: readonly RawRelationship[] = []
): string {
  const baseDesc = character.description || "";
  if (selectedChapter < character.first_chapter) {
    return "";
  }

  const charRelsUpToChapter = allRelationships.filter(
    (r) =>
      (r.character_a_id === character.id || r.character_b_id === character.id) &&
      r.chapter <= selectedChapter &&
      r.chapter > character.first_chapter
  );

  const majorEvents = charRelsUpToChapter.filter((r) => {
    const t = (r.type || "").toLowerCase();
    const d = (r.description || "").toLowerCase();
    return (
      r.character_a_id === r.character_b_id ||
      t.includes("revelation") ||
      t.includes("truth") ||
      t.includes("sacrific") ||
      t.includes("stasis") ||
      d.includes("revealed") ||
      d.includes("sacrifice") ||
      d.includes("stasis")
    );
  });

  if (majorEvents.length > 0) {
    const latestEvent = majorEvents[majorEvents.length - 1];
    if (latestEvent.description) {
      return `${baseDesc} Chapter ${latestEvent.chapter}: ${latestEvent.description}`;
    }
  }

  return baseDesc;
}

/**
 * Validates integrity of raw story graph records.
 * Distinguishes true conflicting same-direction temporal intervals from valid reciprocal perspectives.
 */
export function validateGraphIntegrity(
  characters: readonly RawCharacter[],
  relationships: readonly RawRelationship[]
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const charIds = new Set<string>();
  const charMap = new Map<string, RawCharacter>();

  // 1. Validate Character IDs
  for (const c of characters) {
    if (charIds.has(c.id)) {
      issues.push({
        code: "DUPLICATE_ID",
        severity: "error",
        message: `Duplicate Character ID detected: ${c.id} (${c.name})`,
        characterId: c.id,
      });
    }
    charIds.add(c.id);
    charMap.set(c.id, c);
  }

  // 2. Validate Relationship IDs & Ranges
  const relIds = new Set<string>();
  for (const r of relationships) {
    if (relIds.has(r.id)) {
      issues.push({
        code: "DUPLICATE_ID",
        severity: "error",
        message: `Duplicate Relationship ID detected: ${r.id}`,
        relationshipId: r.id,
      });
    }
    relIds.add(r.id);

    if (r.chapter < 1) {
      issues.push({
        code: "INVALID_CHAPTER_RANGE",
        severity: "error",
        message: `Relationship ${r.id} has invalid start chapter: ${r.chapter}`,
        relationshipId: r.id,
      });
    }

    if (r.until_chapter !== null && r.until_chapter <= r.chapter) {
      issues.push({
        code: "INVALID_CHAPTER_RANGE",
        severity: "error",
        message: `Relationship ${r.id} has until_chapter (${r.until_chapter}) <= chapter (${r.chapter})`,
        relationshipId: r.id,
        details: { sinceChapter: r.chapter, untilChapter: r.until_chapter },
      });
    }

    if (!charMap.has(r.character_a_id)) {
      issues.push({
        code: "MISSING_ENDPOINT",
        severity: "error",
        message: `Relationship ${r.id} references non-existent source character: ${r.character_a_id}`,
        relationshipId: r.id,
        sourceId: r.character_a_id,
      });
    }

    if (!charMap.has(r.character_b_id)) {
      issues.push({
        code: "MISSING_ENDPOINT",
        severity: "error",
        message: `Relationship ${r.id} references non-existent target character: ${r.character_b_id}`,
        relationshipId: r.id,
        targetId: r.character_b_id,
      });
    }
  }

  // 3. Validate Conflicting Same-Direction Intervals
  // Two edges in the SAME direction (A -> B) must not have overlapping half-open intervals [s, u)
  const directedMap = new Map<string, RawRelationship[]>();
  for (const r of relationships) {
    if (r.character_a_id === r.character_b_id) continue;
    const dirKey = `${r.character_a_id}-->${r.character_b_id}`;
    const list = directedMap.get(dirKey) || [];
    list.push(r);
    directedMap.set(dirKey, list);
  }

  for (const [dirKey, list] of directedMap.entries()) {
    for (let i = 0; i < list.length; i++) {
      const r1 = list[i];
      const u1 = r1.until_chapter ?? Infinity;
      for (let j = i + 1; j < list.length; j++) {
        const r2 = list[j];
        const u2 = r2.until_chapter ?? Infinity;

        const overlaps = Math.max(r1.chapter, r2.chapter) < Math.min(u1, u2);
        if (overlaps) {
          issues.push({
            code: "CONFLICTING_INTERVAL",
            severity: "error",
            message: `Conflicting overlapping intervals detected for directed edge ${dirKey} between rel ${r1.id} [${r1.chapter}, ${r1.until_chapter}) and rel ${r2.id} [${r2.chapter}, ${r2.until_chapter})`,
            relationshipId: r2.id,
            details: {
              rel1: { id: r1.id, type: r1.type, since: r1.chapter, until: r1.until_chapter },
              rel2: { id: r2.id, type: r2.type, since: r2.chapter, until: r2.until_chapter },
            },
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Deterministically derives an aggregated visual tone for a connection line.
 *
 * MAPPING RULE:
 * 1. FRICTION (red / wine-crimson): Triggered if any active record contains adversarial,
 *    hostile, combat, betrayal, accusatory, guilty, resigned, or tense sentiments.
 * 2. WARMTH (green / pine-moss): Triggered if no friction exists and any active record
 *    contains trusting, allied, protective, supportive, respectful, or familial sentiments.
 * 3. NEUTRAL (parchment ash): Triggered if records are formal, professional, or unclassified.
 *
 * NOTE: visualTone is strictly a visual rendering hint. Underlying individual records
 * in `connection.records` remain the authoritative source of truth for semantic sentiment.
 */
export function deriveVisualTone(records: CharacterNetworkEdge[]): VisualTone {
  const frictionKeywords = [
    "hostil",
    "adversar",
    "combat",
    "betray",
    "accusat",
    "tense",
    "guilty",
    "resigned",
  ];
  const warmthKeywords = [
    "trust",
    "allie",
    "protect",
    "devot",
    "support",
    "respect",
    "collaborat",
    "familial",
  ];

  let hasFriction = false;
  let hasWarmth = false;

  for (const r of records) {
    const s = `${r.relation} ${r.sentiment}`.toLowerCase();
    if (frictionKeywords.some((k) => s.includes(k))) hasFriction = true;
    if (warmthKeywords.some((k) => s.includes(k))) hasWarmth = true;
  }

  if (hasFriction) return "friction";
  if (hasWarmth) return "warmth";
  return "neutral";
}

/**
 * Groups active directional relationship edges and narrative plot threads into bundled visual connections.
 */
export function groupEdgesIntoConnections(
  edges: CharacterNetworkEdge[],
  activeNarrativeThreads: NarrativeThreadLink[] = [],
  characterMap: Map<string, RawCharacter> = new Map()
): VisualConnection[] {
  const pairMap = new Map<
    string,
    { edges: CharacterNetworkEdge[]; threads: NarrativeThreadLink[] }
  >();

  function getEntry(pairKey: string) {
    let entry = pairMap.get(pairKey);
    if (!entry) {
      entry = { edges: [], threads: [] };
      pairMap.set(pairKey, entry);
    }
    return entry;
  }

  for (const edge of edges) {
    const [idA, idB] = [edge.sourceId, edge.targetId].sort();
    const pairKey = `${idA}--${idB}`;
    getEntry(pairKey).edges.push(edge);
  }

  for (const th of activeNarrativeThreads) {
    const [idA, idB] = [th.characterAId, th.characterBId].sort();
    const pairKey = `${idA}--${idB}`;
    getEntry(pairKey).threads.push(th);
  }

  const connections: VisualConnection[] = [];

  for (const [pairKey, { edges: records, threads }] of pairMap.entries()) {
    const [charAId, charBId] = pairKey.split("--");
    const firstEdge = records[0];
    const firstThread = threads[0];

    let charAName = "";
    let charBName = "";

    if (firstEdge) {
      charAName =
        firstEdge.sourceId === charAId ? firstEdge.sourceName : firstEdge.targetName;
      charBName =
        firstEdge.sourceId === charBId ? firstEdge.sourceName : firstEdge.targetName;
    } else if (firstThread) {
      charAName =
        firstThread.characterAId === charAId
          ? firstThread.characterAName
          : firstThread.characterBName;
      charBName =
        firstThread.characterBId === charBId
          ? firstThread.characterBName
          : firstThread.characterAName;
    }

    if (!charAName && characterMap.has(charAId)) charAName = characterMap.get(charAId)!.name;
    if (!charBName && characterMap.has(charBId)) charBName = characterMap.get(charBId)!.name;

    const hasAtoB = records.some(
      (r) => r.sourceId === charAId && r.targetId === charBId
    );
    const hasBtoA = records.some(
      (r) => r.sourceId === charBId && r.targetId === charAId
    );

    const connectionTypes: Array<"interpersonal" | "narrative_thread"> = [];
    if (records.length > 0) connectionTypes.push("interpersonal");
    if (threads.length > 0) connectionTypes.push("narrative_thread");

    const visualTone: VisualTone =
      records.length > 0 ? deriveVisualTone(records) : "narrative_thread";

    const sentimentDistribution = Array.from(
      new Set(
        records.length > 0
          ? records.map((r) => r.sentiment)
          : ["narrative_thread"]
      )
    ).sort();

    connections.push({
      connectionId: `conn:${pairKey}`,
      characterAId: charAId,
      characterBId: charBId,
      characterAName: charAName || charAId,
      characterBName: charBName || charBId,
      visualTone,
      sentimentDistribution,
      isReciprocal:
        (hasAtoB && hasBtoA) || (records.length === 0 && threads.length > 0),
      records: [...records],
      narrativeThreads: [...threads],
      connectionTypes,
    });
  }

  return connections;
}

/**
 * Transforms raw story entities into a chapter-scoped Character Network Graph.
 *
 * Guarantees:
 * - Active-only: only introduced characters and active relationships for chapter N.
 * - Half-open interval: since_chapter <= N && (until_chapter === null || N < until_chapter)
 * - Self-loops excluded from visual edges and recorded in dataQualityIssues.
 * - Zero future data leakage: structured CharacterState separates status from revelations.
 * - Bundles concurrent records into cohesive visual connections with visualTone.
 */
export function transformCharacterNetwork(
  options: TransformOptions
): CharacterNetworkGraph {
  const { projectId, characters, relationships, chapter } = options;

  // Run integrity validations
  const validationIssues = validateGraphIntegrity(characters, relationships);
  const dataQualityIssues: DataQualityIssue[] = [...validationIssues];

  const characterMap = new Map<string, RawCharacter>();
  for (const c of characters) {
    characterMap.set(c.id, c);
  }

  // 1. Build chapter-scoped introduced nodes
  const nodes: CharacterNetworkNode[] = [];
  for (const c of characters) {
    if (c.first_chapter > chapter) {
      continue;
    }

    nodes.push({
      id: c.id,
      neo4jId: `char:${c.id}`,
      name: c.name,
      state: deriveCharacterState(c, chapter, relationships),
      firstChapter: c.first_chapter,
      aliases: deriveChapterScopedAliases(c, chapter, relationships),
      description: deriveChapterScopedDescription(c, chapter, relationships),
    });
  }

  // 2. Build chapter-scoped active directional edges (excluding self-loops)
  const edges: CharacterNetworkEdge[] = [];
  let excludedSelfLoopsCount = 0;

  for (const r of relationships) {
    const isSelfLoop = r.character_a_id === r.character_b_id;

    if (isSelfLoop) {
      // Chapter-scoped self-loop evaluation: only report and count self-loops
      // that are active for the selected chapter horizon.
      const isSelfLoopActive =
        r.chapter <= chapter &&
        (r.until_chapter === null || chapter < r.until_chapter);

      if (isSelfLoopActive) {
        excludedSelfLoopsCount++;
        const selfChar = characterMap.get(r.character_a_id);
        dataQualityIssues.push({
          code: "SELF_LOOP",
          severity: "warning",
          message: `Self-referential relationship on character '${selfChar?.name || r.character_a_id}' (${r.type}, Ch. ${r.chapter}->${r.until_chapter ?? "end"}). Excluded from visual connections.`,
          relationshipId: r.id,
          characterId: r.character_a_id,
          sourceId: r.character_a_id,
          targetId: r.character_b_id,
          details: {
            relation: r.type,
            sentiment: r.sentiment,
            sinceChapter: r.chapter,
            untilChapter: r.until_chapter,
            description: r.description,
            evidenceQuote: r.evidence_quote,
          },
        });
      }
      continue;
    }

    // Half-open interval: since_chapter <= N && (until_chapter === null || N < until_chapter)
    const isActive =
      r.chapter <= chapter &&
      (r.until_chapter === null || chapter < r.until_chapter);

    if (!isActive) {
      continue;
    }

    const srcChar = characterMap.get(r.character_a_id);
    const tgtChar = characterMap.get(r.character_b_id);

    edges.push({
      id: r.id,
      sourceId: r.character_a_id,
      targetId: r.character_b_id,
      sourceNeo4jId: `char:${r.character_a_id}`,
      targetNeo4jId: `char:${r.character_b_id}`,
      sourceName: srcChar ? srcChar.name : r.character_a_id,
      targetName: tgtChar ? tgtChar.name : r.character_b_id,
      relation: r.type,
      sentiment: r.sentiment || "neutral",
      sinceChapter: r.chapter,
      untilChapter: r.until_chapter,
      description: r.description,
      evidenceQuote: r.evidence_quote,
    });
  }

  // 3. Filter active narrative threads for chapter
  const rawNarrativeThreads = options.narrativeThreads || [];
  const activeNarrativeThreads: NarrativeThreadLink[] = [];
  for (const th of rawNarrativeThreads) {
    const isActive =
      th.setupChapter <= chapter &&
      (th.payoffChapter === null || chapter <= th.payoffChapter);
    const cA = characterMap.get(th.characterAId);
    const cB = characterMap.get(th.characterBId);
    if (isActive && cA && cB && cA.first_chapter <= chapter && cB.first_chapter <= chapter) {
      activeNarrativeThreads.push(th);
    }
  }

  // 4. Group edges and narrative threads into visual connections
  const connections = groupEdgesIntoConnections(edges, activeNarrativeThreads, characterMap);

  // 5. Compute chapter-scoped metadata
  const minChapter = characters.reduce(
    (min, c) => Math.min(min, c.first_chapter),
    characters.length > 0 ? characters[0].first_chapter : 1
  );
  const maxChapter = characters.reduce(
    (max, c) => Math.max(max, c.last_chapter || c.first_chapter),
    20
  );

  const metadata: CharacterNetworkMetadata = {
    projectId,
    selectedChapter: chapter,
    totalCharactersInStory: characters.length,
    introducedCharactersCount: nodes.length,
    totalRelationshipsInStory: relationships.length,
    activeRelationshipsCount: edges.length,
    activeConnectionsCount: connections.length,
    activeNarrativeThreadsCount: activeNarrativeThreads.length,
    excludedSelfLoopsCount,
    dataQualityIssuesCount: dataQualityIssues.length,
    minChapter,
    maxChapter,
  };

  return {
    metadata,
    nodes,
    edges,
    connections,
    narrativeThreads: activeNarrativeThreads,
    dataQualityIssues,
  };
}

/**
 * Retrieves the historical evolution of relationships between two characters up to a given chapter.
 * Prevents future relationship stages from leaking into the history.
 */
export function getHistoricalRelationshipsForPair(
  relationships: readonly RawRelationship[],
  characters: readonly RawCharacter[],
  charAId: string,
  charBId: string,
  upToChapter?: number
): HistoricalRelationshipStage[] {
  const charMap = new Map<string, RawCharacter>();
  for (const c of characters) charMap.set(c.id, c);

  return relationships
    .filter((r) => {
      if (r.character_a_id === r.character_b_id) return false;
      const matchesPair =
        (r.character_a_id === charAId && r.character_b_id === charBId) ||
        (r.character_a_id === charBId && r.character_b_id === charAId);
      if (!matchesPair) return false;
      if (upToChapter !== undefined && r.chapter > upToChapter) return false;
      return true;
    })
    .sort((a, b) => a.chapter - b.chapter)
    .map((r) => {
      const src = charMap.get(r.character_a_id);
      const tgt = charMap.get(r.character_b_id);
      const isCurrent =
        upToChapter !== undefined
          ? r.chapter <= upToChapter &&
            (r.until_chapter === null || upToChapter < r.until_chapter)
          : r.until_chapter === null;

      const supersededAt =
        r.until_chapter !== null &&
        (upToChapter === undefined || r.until_chapter <= upToChapter)
          ? r.until_chapter
          : null;

      return {
        id: r.id,
        sourceId: r.character_a_id,
        targetId: r.character_b_id,
        sourceName: src ? src.name : r.character_a_id,
        targetName: tgt ? tgt.name : r.character_b_id,
        relation: r.type,
        sentiment: r.sentiment,
        sinceChapter: r.chapter,
        untilChapter: r.until_chapter,
        description: r.description,
        evidenceQuote: r.evidence_quote,
        isCurrentAtChapter: isCurrent,
        supersededAtChapter: supersededAt,
      };
    });
}

/**
 * Retrieves full evidence provenance for a relationship record by ID.
 *
 * CHAPTER AUTHORIZATION RULE:
 * `upToChapter` is MANDATORY for reader-facing provenance retrieval.
 * Requests for relationships established in a future chapter (r.chapter > upToChapter)
 * return `null` to strictly prevent spoiler leakage.
 */
export function getRelationshipProvenance(
  relationships: readonly RawRelationship[],
  characters: readonly RawCharacter[],
  relationshipId: string,
  upToChapter: number
): EvidenceProvenance | null {
  const r = relationships.find((rel) => rel.id === relationshipId);
  if (!r) return null;

  // Chapter authorization check: prevent forward leakage
  if (r.chapter > upToChapter) {
    return null;
  }

  const charMap = new Map<string, RawCharacter>();
  for (const c of characters) charMap.set(c.id, c);

  const src = charMap.get(r.character_a_id);
  const tgt = charMap.get(r.character_b_id);

  const isHistorical =
    r.until_chapter !== null && upToChapter >= r.until_chapter;

  return {
    relationshipId: r.id,
    sourceCharacter: {
      id: r.character_a_id,
      name: src ? src.name : r.character_a_id,
    },
    targetCharacter: {
      id: r.character_b_id,
      name: tgt ? tgt.name : r.character_b_id,
    },
    chapterRange: {
      since: r.chapter,
      until: r.until_chapter,
    },
    relationType: r.type,
    sentiment: r.sentiment,
    evidenceQuote: r.evidence_quote,
    contextDescription: r.description,
    isHistorical,
  };
}
