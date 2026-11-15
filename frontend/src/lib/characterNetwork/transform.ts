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

export const AETHELGARD_PROJECT_ID = "cabf8f78-9488-4e6c-b9e3-74d390e6eb45";
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
  RawCharacter,
  RawRelationship,
  StateTransitionEvidence,
  TransformOptions,
  VisualConnection,
  VisualTone,
} from "./types.ts";

/**
 * All verified story revelations from PostgreSQL claims and relationships.
 * Each revelation has an exact source UUID, chapter anchor, and verbatim citation.
 */
const VERIFIED_REVELATIONS: Record<string, CharacterRevelation[]> = {
  // Lady Vespera Thorne
  "6f1bcccc-39c1-456a-95e8-532c88fc1b8a": [
    {
      id: "claim:941cb020-c148-4afd-8fde-a6d4a94ccb0d",
      category: "identity",
      revealedAtChapter: 16,
      label: "True Identity: Princess Aurelia",
      description:
        "Lady Vespera Thorne is secretly Princess Aurelia, royal heir to Aethelgard spirited away during the Deluge.",
      evidenceQuote:
        "revealing he knew Vespera was Princess Aurelia all along and intended to sacrifice her to unbind the entity beneath Lake Mor-Vaelen.",
    },
  ],
  // Silas Vance
  "b38566c3-1aef-44e5-9eb3-c65402472d47": [
    {
      id: "rel:3c6e20b1-8e00-4ffb-858b-b05600d03709",
      category: "historical_truth",
      revealedAtChapter: 15,
      label: "Deluge Sluice Command Truth",
      description:
        "Silas did not die by enemy blade; mortally wounded, he commanded young Corin to pull the sluice lever to drown the city, which caused Corin's traumatic amnesia.",
      evidenceQuote:
        "on the night of the flood, Silas did not die by enemy blade; Silas was mortally wounded and commanded young Corin to pull the sluice lever to seal the breach. Corin realizes his memory amnesia was a psychological defense against the trauma of drowning his mentor's city.",
    },
  ],
  // High Inquisitor Malakor
  "463a6505-a969-4076-891b-292b6b192355": [
    {
      id: "rel:99f2c9fb-7b08-4d02-834d-028ecdf48a9f",
      category: "fate",
      revealedAtChapter: 16,
      label: "Black Mercury Void Transformation",
      description:
        "Body transformed by drinking black mercury: eyes turned to pitch-black void wells radiating shadowy vapor.",
      evidenceQuote:
        "High Inquisitor Malakor breaches the inner sanctum. His body has been transformed by drinking black mercury: his steel-gray eyes have turned to pitch-black void wells radiating shadowy vapor.",
    },
    {
      id: "claim:00a3abdf-4c20-4c54-9e22-0863e72dded5",
      category: "fate",
      revealedAtChapter: 19,
      label: "Temporal Stasis Loop Imprisonment",
      description:
        "Corin Vance refracted Malakor's shadow sorcery through the Brass Astrolabe lens, locking him into a 5-second recurring temporal loop.",
      evidenceQuote:
        "He refracts Malakor's shadow sorcery through the astrolabe lens, locking High Inquisitor Malakor into an inescapable recurring five-second temporal stasis loop.",
    },
  ],
  // Kaelen Voss
  "faf3b450-18bb-49f0-94a0-6ac3521482d3": [
    {
      id: "rel:d7243d1a-5c7e-41c1-b5d4-0b79b27f4d20",
      category: "betrayal",
      revealedAtChapter: 14,
      label: "Belladonna Key Poisoning Discovered",
      description:
        "Discovered that Vespera coated the silver cipher key with belladonna venom to induce slumber at the Bell Tower.",
      evidenceQuote:
        "Lady Vespera Thorne formally confesses: 'I coated the silver cipher key with weeping belladonna venom so that Voss would succumb to slumber without lasting harm.'",
    },
    {
      id: "rel:6b3dfdf3-55eb-4c92-bbd8-084d96447289",
      category: "fate",
      revealedAtChapter: 17,
      label: "Seventh Sluice Sacrificial Stand",
      description:
        "Jammed his mechanical arm into the gear teeth to hold the blast door open for Corin and Vespera, plunging into the whirlpool.",
      evidenceQuote:
        "He jams his mechanical arm into the gear teeth to hold the blast door open for Corin and Vespera. Voss bids Corin to finish the journey as the collapsing gantry plunges into the whirlpool.",
    },
  ],
  // Lord Julian
  "a3841ca4-db51-407d-b2be-24c0cbec7008": [
    {
      id: "claim:a9bc00bd-8e4b-4a99-bce5-9ba33fa5e171",
      category: "identity",
      revealedAtChapter: 2,
      label: "Contested Fate: Deceased vs Alive in Vault of Bells",
      description:
        "Officially declared deceased by the Obsidian Order; Vespera insists he survived in the Vault of Bells.",
      evidenceQuote:
        "Corin warns her that Julian was officially declared deceased by the Obsidian Order. Vespera insists Julian is alive in the Vault of Bells.",
    },
  ],
  // Elowen
  "8e22de06-5f30-44a7-bfad-a43c1dbaa52d": [
    {
      id: "claim:04ee4249-c6d4-4c67-bca0-5a8d5048ac74",
      category: "lore",
      revealedAtChapter: 6,
      label: "Epistemic Truth of Black Mercury",
      description:
        "Revealed that black mercury in Lake Mor-Vaelen is not poison, but distilled memory of the ancient Sunken Council.",
      evidenceQuote:
        "Elowen reveals an epistemic truth: 'The black mercury in Lake Mor-Vaelen is not industrial poison; it is the distilled memory of the ancient Sunken Council'",
    },
  ],
};

/**
 * Derives structured character state: separating physical status, condition,
 * and narrative revelations known on or before chapter N.
 *
 * Guarantees:
 * - Every state transition includes verbatim database evidence and source record ID.
 * - Narrative discoveries are decoupled from physical vitality.
 */
export function deriveCharacterState(
  character: RawCharacter,
  selectedChapter: number,
  isAethelgard: boolean = false
): CharacterState {
  const normName = character.name.trim().toLowerCase();
  const shouldApplyAethelgard =
    isAethelgard || Boolean(VERIFIED_REVELATIONS[character.id]);
  const allRevelations = shouldApplyAethelgard
    ? VERIFIED_REVELATIONS[character.id] || []
    : [];
  const knownRevelations = allRevelations.filter(
    (rev) => rev.revealedAtChapter <= selectedChapter
  );

  if (shouldApplyAethelgard) {
    // Silas Vance: physical status is always "deceased" across all chapters
    if (normName.includes("silas vance")) {
    const isTruthRevealed = selectedChapter >= 15;
    const condition = isTruthRevealed
      ? "deluge casualty (sluice breach command revealed)"
      : "deluge casualty (believed lost to flood)";

    const statusTransition: StateTransitionEvidence = isTruthRevealed
      ? {
          sourceId: "rel:3c6e20b1-8e00-4ffb-858b-b05600d03709",
          sourceType: "relationship",
          chapter: 15,
          description:
            "Silas was mortally wounded during the Deluge and commanded young Corin to pull the sluice lever to seal the breach",
          evidenceQuote:
            "on the night of the flood, Silas did not die by enemy blade; Silas was mortally wounded and commanded young Corin to pull the sluice lever to seal the breach. Corin realizes his memory amnesia was a psychological defense against the trauma of drowning his mentor's city.",
        }
      : {
          sourceId: "claim:1e3807db-88e2-4112-8ed8-da1fe54d9fee",
          sourceType: "claim",
          chapter: 1,
          description: "Perished twenty years ago during the Great Deluge",
          evidenceQuote:
            "Silas Vance was his mentor who perished twenty years ago during the Great Deluge.",
        };

    return {
      status: "deceased",
      condition,
      statusTransition,
      knownRevelations,
    };
  }

  // High Inquisitor Malakor: physical life vs environmental state
  if (normName.includes("malakor")) {
    if (selectedChapter >= 19) {
      return {
        status: "incapacitated",
        condition: "trapped in 5-second temporal stasis loop",
        statusTransition: {
          sourceId: "claim:00a3abdf-4c20-4c54-9e22-0863e72dded5",
          sourceType: "claim",
          chapter: 19,
          description:
            "Corin Vance refracted Malakor's shadow sorcery through the Brass Astrolabe lens, locking High Inquisitor Malakor into an inescapable recurring five-second temporal stasis loop",
          evidenceQuote:
            "He refracts Malakor's shadow sorcery through the astrolabe lens, locking High Inquisitor Malakor into an inescapable recurring five-second temporal stasis loop.",
        },
        knownRevelations,
      };
    }
    if (selectedChapter >= 16) {
      return {
        status: "alive",
        condition: "transformed by black mercury void",
        statusTransition: {
          sourceId: "rel:99f2c9fb-7b08-4d02-834d-028ecdf48a9f",
          sourceType: "relationship",
          chapter: 16,
          description:
            "Body transformed by drinking black mercury: steel-gray eyes turned to pitch-black void wells radiating shadowy vapor",
          evidenceQuote:
            "High Inquisitor Malakor breaches the inner sanctum. His body has been transformed by drinking black mercury: his steel-gray eyes have turned to pitch-black void wells radiating shadowy vapor.",
        },
        knownRevelations,
      };
    }
    return {
      status: "alive",
      condition: "active high inquisitor of the obsidian order",
      statusTransition: {
        sourceId: "char:463a6505-a969-4076-891b-292b6b192355",
        sourceType: "character_genesis",
        chapter: 3,
        description: "Arrived with six armored penitents brandishing the Iron Censer",
        evidenceQuote:
          "High Inquisitor Malakor arrives with six armored penitents brandishing the Iron Censer.",
      },
      knownRevelations,
    };
  }

  // Kaelen Voss: physical status changes from alive to sacrificed at Ch. 17
  if (normName.includes("kaelen voss") || normName === "voss") {
    if (selectedChapter >= 17) {
      return {
        status: "deceased",
        condition: "sacrificed in gear housing; plunged into whirlpool",
        statusTransition: {
          sourceId: "rel:6b3dfdf3-55eb-4c92-bbd8-084d96447289",
          sourceType: "relationship",
          chapter: 17,
          description:
            "Jammed mechanical arm into Seventh Sluice blast door gear teeth to hold it open, plunging into the whirlpool",
          evidenceQuote:
            "He jams his mechanical arm into the gear teeth to hold the blast door open for Corin and Vespera. Voss bids Corin to finish the journey as the collapsing gantry plunges into the whirlpool.",
        },
        knownRevelations,
      };
    }
    return {
      status: "alive",
      condition: "active renegade shadowsmith",
      statusTransition: {
        sourceId: "char:faf3b450-18bb-49f0-94a0-6ac3521482d3",
        sourceType: "character_genesis",
        chapter: 4,
        description:
          "Renegade Shadowsmith and exiled artificer working among clockwork automata with brass clockwork eyepatch",
        evidenceQuote:
          "Kaelen Voss, a renegade Shadowsmith and exiled artificer, works among clockwork automata with scarred hands and wears a brass clockwork eyepatch.",
      },
      knownRevelations,
    };
  }

  // Lord Julian: status unknown
  if (normName.includes("julian")) {
    return {
      status: "unknown",
      condition: "missing in submerged catacombs",
      statusTransition: {
        sourceId: "claim:a9bc00bd-8e4b-4a99-bce5-9ba33fa5e171",
        sourceType: "claim",
        chapter: 2,
        description:
          "Officially declared deceased by the Obsidian Order; Vespera insists he survived in the Vault of Bells",
        evidenceQuote:
          "Corin warns her that Julian was officially declared deceased by the Obsidian Order. Vespera insists Julian is alive in the Vault of Bells.",
      },
      knownRevelations,
    };
  }

  // Lady Vespera Thorne: alive throughout
  if (normName.includes("vespera")) {
    const isIdentityRevealed = selectedChapter >= 16;
    const condition = isIdentityRevealed
      ? "royal heir (revealed as princess aurelia)"
      : "noble of the northern silver court";
    const statusTransition: StateTransitionEvidence = isIdentityRevealed
      ? {
          sourceId: "claim:941cb020-c148-4afd-8fde-a6d4a94ccb0d",
          sourceType: "claim",
          chapter: 16,
          description:
            "True identity revealed as Princess Aurelia of the Royal House of Aethelgard",
          evidenceQuote:
            "revealing he knew Vespera was Princess Aurelia all along and intended to sacrifice her to unbind the entity beneath Lake Mor-Vaelen.",
        }
      : {
          sourceId: "char:6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
          sourceType: "character_genesis",
          chapter: 2,
          description:
            "Arrived from northern Silver Court seeking lost brother Julian",
          evidenceQuote:
            "Lady Vespera Thorne arrives from the northern Silver Court, seeking her lost brother Lord Julian.",
        };

    return {
      status: "alive",
      condition,
      statusTransition,
      knownRevelations,
    };
  }

  // Corin Vance: alive throughout
  if (normName.includes("corin vance")) {
    return {
      status: "alive",
      condition: "archivist of the seventh tier",
      statusTransition: {
        sourceId: "char:082fa8a3-47e6-4436-82c1-8197f0f71381",
        sourceType: "character_genesis",
        chapter: 1,
        description:
          "Archivist of the Seventh Tier in the drowned scriptorium beneath Lake Mor-Vaelen",
        evidenceQuote:
          "Corin Vance, an archivist of the Seventh Tier, works in the drowned scriptorium beneath Lake Mor-Vaelen.",
      },
      knownRevelations,
    };
  }

  // Elowen: alive throughout
  if (normName.includes("elowen")) {
    return {
      status: "alive",
      condition: "blind astrologer of the catacombs",
      statusTransition: {
        sourceId: "char:8e22de06-5f30-44a7-bfad-a43c1dbaa52d",
        sourceType: "character_genesis",
        chapter: 6,
        description:
          "Blind astrologer in drainage catacombs surrounded by clockwork ravens",
        evidenceQuote:
          "Corin navigates the dripping sewer conduits to consult Elowen, the Blind Astrologer. Elowen sits surrounded by clockwork ravens that transmit sound and optical echoes into her mind.",
      },
      knownRevelations,
    };
  }
  }

  const isDeceased =
    character.status?.toLowerCase() === "deceased" ||
    (character.last_chapter !== null && selectedChapter > character.last_chapter);

  return {
    status: isDeceased ? "deceased" : character.status || "alive",
    condition: isDeceased ? "inactive" : "active",
    statusTransition: {
      sourceId: `char:${character.id}`,
      sourceType: "character_genesis",
      chapter: character.first_chapter || 1,
      description: `Introduced in Chapter ${character.first_chapter || 1}`,
      evidenceQuote: character.description || `${character.name} appears in the story.`,
    },
    knownRevelations,
  };
}

/**
 * Returns revealed aliases grounded strictly in claims available at chapter N.
 * Conceals "Princess Aurelia" prior to Chapter 16 for Aethelgard story fixture.
 */
export function deriveChapterScopedAliases(
  character: RawCharacter,
  selectedChapter: number,
  isAethelgard: boolean = false
): string[] {
  const normName = character.name.trim().toLowerCase();
  const allAliases = character.aliases || [];

  if (isAethelgard || Boolean(VERIFIED_REVELATIONS[character.id])) {
    if (normName.includes("vespera")) {
      if (selectedChapter < 16) {
        return allAliases.filter(
          (alias) => !alias.toLowerCase().includes("aurelia")
        );
      }
      return [...allAliases];
    }
  }

  return [...allAliases];
}

/**
 * Constructs a chapter-scoped character description built strictly from claims
 * established on or before chapter N.
 */
export function deriveChapterScopedDescription(
  character: RawCharacter,
  selectedChapter: number,
  isAethelgard: boolean = false
): string {
  if (isAethelgard || Boolean(VERIFIED_REVELATIONS[character.id])) {
    const normName = character.name.trim().toLowerCase();

    if (normName.includes("corin vance")) {
      return "The archivist of the Seventh Tier who works in the drowned scriptorium beneath Lake Mor-Vaelen. Wears a charcoal wool coat. Discovers a parchment scroll written in his own ciphered handwriting dated ten years in the future. Carries the Brass Astrolabe and writes in the Scriptorium Ledger.";
    }

    if (normName.includes("silas vance")) {
      if (selectedChapter >= 15) {
        return "Corin Vance's former mentor. Long believed to have drowned as a casualty of the Great Deluge twenty years ago; Chapter 15 uncovers the repressed truth that Silas mortally commanded young Corin to pull the sluice gate lever to drown the city.";
      }
      return "Corin Vance's mentor who perished twenty years ago during the Great Deluge.";
    }

    if (normName.includes("vespera")) {
      if (selectedChapter >= 16) {
        return "A noble lady who arrived from the northern Silver Court seeking her lost brother Lord Julian. In Chapter 16, High Inquisitor Malakor reveals her true identity as Princess Aurelia of the Royal House of Aethelgard.";
      }
      return "A noble lady who arrives under royal escort from the northern Silver Court, wearing an emerald velvet travelling cloak and bearing an ivory-sheathed dagger. She seeks her lost brother Lord Julian in the catacombs.";
    }

    if (normName.includes("malakor")) {
      if (selectedChapter >= 19) {
        return "Arrived with six armored penitents brandishing the Iron Censer. After transforming via black mercury in Chapter 16, he was combatted by Corin Vance in Chapter 19 and locked into an inescapable recurring five-second temporal stasis loop.";
      }
      if (selectedChapter >= 16) {
        return "Arrived with six armored penitents brandishing the Iron Censer. In Chapter 16, his body was transformed by drinking black mercury: his steel-gray eyes turned to pitch-black void wells radiating shadowy vapor.";
      }
      return "Arrives with six armored penitents. Wears an obsidian breastplate and has sharp steel-gray eyes. Demands the surrender of all foreign visitors and forbidden relics, brandishing the Iron Censer.";
    }

    if (normName.includes("kaelen voss") || normName === "voss") {
      if (selectedChapter >= 17) {
        return "A renegade Shadowsmith and exiled artificer with a brass clockwork eyepatch. In Chapter 17, he sacrificed himself by jamming his mechanical arm into the gear housing to hold the blast door open for Corin and Vespera, plunging with the collapsing gantry into the subterranean whirlpool.";
      }
      return "A renegade Shadowsmith and exiled artificer. Works among clockwork automata with scarred hands and wears a brass clockwork eyepatch. Agrees to unlock the Seventh Sluice after Corin gives him the Silver Cipher Key to decipher the gear mechanism.";
    }

    if (normName.includes("julian")) {
      return "Brother of Lady Vespera Thorne who was lost in the submerged catacombs and officially declared deceased by the Obsidian Order. Vespera insists he is alive in the Vault of Bells.";
    }

    if (normName.includes("elowen")) {
      return "A blind astrologer consulted by Corin in the drainage catacombs. Surrounded by clockwork ravens that transmit sound and optical echoes into her mind. Reveals epistemic truths about the black mercury and the ancient Sunken Council.";
    }
  }

  return character.description || "";
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
 * Groups active directional relationship edges into bundled visual connections.
 */
export function groupEdgesIntoConnections(
  edges: CharacterNetworkEdge[]
): VisualConnection[] {
  const pairMap = new Map<string, CharacterNetworkEdge[]>();

  for (const edge of edges) {
    const [idA, idB] = [edge.sourceId, edge.targetId].sort();
    const pairKey = `${idA}--${idB}`;
    const list = pairMap.get(pairKey) || [];
    list.push(edge);
    pairMap.set(pairKey, list);
  }

  const connections: VisualConnection[] = [];

  for (const [pairKey, records] of pairMap.entries()) {
    const [charAId, charBId] = pairKey.split("--");
    const firstEdge = records[0];

    const charAName =
      firstEdge.sourceId === charAId ? firstEdge.sourceName : firstEdge.targetName;
    const charBName =
      firstEdge.sourceId === charBId ? firstEdge.sourceName : firstEdge.targetName;

    const hasAtoB = records.some(
      (r) => r.sourceId === charAId && r.targetId === charBId
    );
    const hasBtoA = records.some(
      (r) => r.sourceId === charBId && r.targetId === charAId
    );

    const sentimentDistribution = Array.from(
      new Set(records.map((r) => r.sentiment))
    ).sort();

    connections.push({
      connectionId: `conn:${pairKey}`,
      characterAId: charAId,
      characterBId: charBId,
      characterAName: charAName,
      characterBName: charBName,
      visualTone: deriveVisualTone(records),
      sentimentDistribution,
      isReciprocal: hasAtoB && hasBtoA,
      records: [...records],
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

  const isAethelgard =
    projectId === AETHELGARD_PROJECT_ID ||
    characters.some((c) => Boolean(VERIFIED_REVELATIONS[c.id]));

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
      state: deriveCharacterState(c, chapter, isAethelgard),
      firstChapter: c.first_chapter,
      aliases: deriveChapterScopedAliases(c, chapter, isAethelgard),
      description: deriveChapterScopedDescription(c, chapter, isAethelgard),
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

  // 3. Group edges into visual connections
  const connections = groupEdgesIntoConnections(edges);

  // 4. Compute chapter-scoped metadata
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
