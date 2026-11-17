import type { ChapterSummary, Issue } from "@/lib/types";

export interface MockStory {
  id: string;
  title: string;
  author: string;
  word_count: number;
  chapter_count: number;
  open_issue_count: number;
  character_count: number;
  claim_count: number;
  genre: string;
  description: string;
  status: "drafting" | "verified" | "in_review";
  updated_at: string;
}

export interface MockCharacter {
  id: string;
  name: string;
  role: string;
  first_chapter: number;
  last_chapter: number;
  aliases: string[];
  traits: string[];
  description: string;
  allies: string[];
  rivals: string[];
}

export interface MockClaim {
  id: string;
  subject: string;
  attribute: string;
  value: string;
  chapter: number;
  evidence_quote: string;
}

export interface MockTimelineEvent {
  id: string;
  chapter_number: number;
  chronological_order: number;
  time_anchor: string;
  title: string;
  location: string;
  description: string;
  participants: string[];
  is_flashback: boolean;
  has_conflict?: boolean;
  conflict_note?: string;
}

export interface MockPlotThread {
  id: string;
  title: string;
  description: string;
  status: "open" | "resolved" | "abandoned" | "red_herring";
  setup_chapter: number;
  payoff_chapter: number | null;
  related_entities: string[];
}

export const HARDCODED_STORIES: MockStory[] = [
  {
    id: "story-1",
    title: "The Brass Alchemist of Prague",
    author: "Adarsh Chauhan",
    word_count: 12480,
    chapter_count: 4,
    open_issue_count: 3,
    character_count: 5,
    claim_count: 28,
    genre: "Victorian Steampunk Mystery",
    description: "An alchemical apprentice uncovers an imperial syndicate poisoning magistrates through clockwork relics.",
    status: "drafting",
    updated_at: "Just now",
  },
  {
    id: "story-2",
    title: "The Obsidian Archive of Aethelgard",
    author: "Adarsh Chauhan",
    word_count: 51960,
    chapter_count: 20,
    open_issue_count: 0,
    character_count: 14,
    claim_count: 112,
    genre: "Dark Academia Epic",
    description: "A subterranean monastic university attempts to preserve dead magic against the Inquisitorial censors.",
    status: "verified",
    updated_at: "2 hours ago",
  },
  {
    id: "story-3",
    title: "Echoes of the Salt Sea",
    author: "Adarsh Chauhan",
    word_count: 24100,
    chapter_count: 7,
    open_issue_count: 2,
    character_count: 8,
    claim_count: 46,
    genre: "Nautical Mythos",
    description: "Whalers pursuing a bioluminescent leviathan discover the sea has begun remembering their drowned dead.",
    status: "in_review",
    updated_at: "Yesterday",
  },
];

export const MANUSCRIPT_CHAPTERS: ChapterSummary[] = [
  {
    number: 1,
    title: "The Alchemist's Sealed Vault",
    word_count: 3120,
    preview: "The brass seal lay upon the scarred oak desk...",
  },
  {
    number: 2,
    title: "The River Patrol at Dover",
    word_count: 2840,
    preview: "Dawn mist hung low over the Dover rigging...",
  },
  {
    number: 3,
    title: "Nightshade at the Citadel Banquet",
    word_count: 3410,
    preview: "Twelve crystal goblets gleamed beneath the vaulted arch...",
  },
  {
    number: 4,
    title: "The Clockwork Heart",
    word_count: 3110,
    preview: "The gale tore through the open belfry, drenching...",
  },
];

export const INITIAL_ISSUES: Issue[] = [
  {
    id: "issue-1",
    type: "custody_paradox",
    severity: "red",
    status: "open",
    description:
      "Broken object custody chain: Marcus withdraws the obsidian compass in Chapter 4, but the relic was impounded in the Citadel Vault in Chapter 3 with zero custody transfers recorded.",
    evidence: [
      {
        chapter: 4,
        quote:
          "Marcus withdrew the obsidian compass from his inner coat pocket and spun its brass ring.",
      },
      {
        chapter: 3,
        quote:
          "Captain Lysander logged the obsidian compass into vault register #409, sealing the iron latch.",
      },
    ],
    created_at: "2026-11-16T10:00:00Z",
  },
  {
    id: "issue-2",
    type: "spatiotemporal_conflict",
    severity: "yellow",
    status: "open",
    description:
      "Spatiotemporal collision: Lysander is documented inspecting Dover harbor at dawn in Chapter 2, but Chapter 5 establishes he presided over the military tribunal in York 6 hours prior (240 leagues transit).",
    evidence: [
      {
        chapter: 2,
        quote:
          "Lysander inspected the harbor manifests beside Captain Valerius at Dover Anchorage...",
      },
    ],
    created_at: "2026-11-16T10:05:00Z",
  },
  {
    id: "issue-3",
    type: "knowledge_violation",
    severity: "yellow",
    status: "open",
    description:
      "Epistemic state violation: Sarah accuses Chancellor Vane of using nightshade poison, but Sarah was locked in the lower cellar and no testimony has revealed the poison to her.",
    evidence: [
      {
        chapter: 3,
        quote:
          "We both know you dissolved nightshade into the Grand Magistrate's wine before midnight.",
      },
    ],
    created_at: "2026-11-16T10:10:00Z",
  },
];

export const MOCK_CHARACTERS: MockCharacter[] = [
  {
    id: "char-1",
    name: "Marcus Vance",
    role: "Protagonist · Alchemist's Ward",
    first_chapter: 1,
    last_chapter: 4,
    aliases: ["The Scribe of Old Town", "Apprentice Vance"],
    traits: ["Steadfast", "Observant", "Apprentice alchemist"],
    description:
      "Sole surviving apprentice to Master Aldous. Bound by an imperial pact not to reveal the formula of the brass alloy.",
    allies: ["Sarah Coyle"],
    rivals: ["Chancellor Vane", "Captain Lysander"],
  },
  {
    id: "char-2",
    name: "Sarah Coyle",
    role: "Infiltrator · Guard's Daughter",
    first_chapter: 2,
    last_chapter: 4,
    aliases: ["The Shadow of the Lower Gate", "Little Coyle"],
    traits: ["Cunning", "Disguised", "Lockpicker"],
    description:
      "Daughter of Sergeant Coyle. Moves undetected through the lower Citadel corridors seeking evidence of the poisoning.",
    allies: ["Marcus Vance"],
    rivals: ["Chancellor Vane"],
  },
  {
    id: "char-3",
    name: "Chancellor Vane",
    role: "Antagonist · High Councilor",
    first_chapter: 2,
    last_chapter: 3,
    aliases: ["The Iron Purse", "Lord Treasurer"],
    traits: ["Ambitious", "Machiavellian", "Venal"],
    description:
      "Master of the Council Treasury. Orchestrated the Dover unmanifested shipping kickbacks and the banquet hemlock.",
    allies: ["Captain Lysander"],
    rivals: ["Marcus Vance", "Sarah Coyle"],
  },
  {
    id: "char-4",
    name: "Captain Lysander",
    role: "Imperial Naval Commander",
    first_chapter: 2,
    last_chapter: 4,
    aliases: ["The Dover Mastiff", "Commander Lysander"],
    traits: ["Rigid", "Loyal to crown", "Unforgiving"],
    description:
      "Commandant of the Dover patrol and keeper of the Citadel Vault keys. Tracks Marcus under imperial treason warrants.",
    allies: ["Chancellor Vane"],
    rivals: ["Marcus Vance"],
  },
  {
    id: "char-5",
    name: "High Magistrate Paul",
    role: "Victim · Late Chief Justice",
    first_chapter: 1,
    last_chapter: 3,
    aliases: ["His Honor of Prague"],
    traits: ["Incorruptible", "Frail", "Scholar"],
    description:
      "Late presiding judge who refused Chancellor Vane's trade monopoly charter before collapsing at the harvest banquet.",
    allies: ["Marcus Vance"],
    rivals: ["Chancellor Vane"],
  },
];

export const MOCK_CLAIMS: MockClaim[] = [
  {
    id: "claim-1",
    subject: "The Obsidian Compass",
    attribute: "custody",
    value: "Citadel Vault #409",
    chapter: 3,
    evidence_quote: "Captain Lysander logged the obsidian compass into vault register #409, sealing the iron latch.",
  },
  {
    id: "claim-2",
    subject: "Grand Magistrate",
    attribute: "cause_of_death",
    value: "Belladonna Nightshade",
    chapter: 3,
    evidence_quote: "The dregs in the silver chalice reeked of crushed nightshade and bitter almond.",
  },
  {
    id: "claim-3",
    subject: "Chancellor Vane",
    attribute: "complicity",
    value: "Dover Smuggling Syndicate",
    chapter: 2,
    evidence_quote: "Vane signed the unmanifested shipping manifests behind closed doors in the harbormaster's office.",
  },
  {
    id: "claim-4",
    subject: "Sarah Coyle",
    attribute: "possession",
    value: "Citadel Vault Key",
    chapter: 2,
    evidence_quote: "Sarah felt the cold brass teeth of Sergeant Coyle's ring key press into her palm.",
  },
  {
    id: "claim-5",
    subject: "Marcus Vance",
    attribute: "lineage",
    value: "Blood of Master Aldous",
    chapter: 1,
    evidence_quote: "The imperial signet ring left an identical seal upon Marcus's testament.",
  },
  {
    id: "claim-6",
    subject: "Captain Lysander",
    attribute: "location",
    value: "Dover Anchorage",
    chapter: 2,
    evidence_quote: "Lysander stood on the south jetty watching the schooner slip into the fog.",
  },
  {
    id: "claim-7",
    subject: "The Brass Testament",
    attribute: "seal",
    value: "Triple Wax Sigil",
    chapter: 1,
    evidence_quote: "The parchment was wrapped in thrice-boiled pigskin and bound with red twine.",
  },
  {
    id: "claim-8",
    subject: "Prague Clocktower",
    attribute: "mechanism",
    value: "Alchemical Pendulum",
    chapter: 4,
    evidence_quote: "The giant brass pendulum swung between the heavy stone piers, ticking once every four seconds.",
  },
];

export const MOCK_TIMELINE_EVENTS: MockTimelineEvent[] = [
  {
    id: "ev-1",
    chapter_number: 1,
    chronological_order: 3,
    time_anchor: "1894 Autumn · Morning",
    title: "Sealing of the Brass Testament",
    location: "Prague Cathedral Crypts",
    description: "Master Aldous entrusts the sealed cipher and compass to Marcus Vance.",
    participants: ["Marcus Vance"],
    is_flashback: false,
  },
  {
    id: "ev-2",
    chapter_number: 2,
    chronological_order: 1,
    time_anchor: "1888 Winter · 6 Years Earlier",
    title: "The Fleet at Dover Anchorage",
    location: "Dover Anchorage",
    description: "Lysander inspects unmanifested cargo for Chancellor Vane's trade syndicate.",
    participants: ["Captain Lysander", "Chancellor Vane"],
    is_flashback: true,
    has_conflict: true,
    conflict_note:
      "Spatiotemporal Collision: Lysander presided over the York tribunal at midnight on the same date (240 leagues away).",
  },
  {
    id: "ev-3",
    chapter_number: 3,
    chronological_order: 4,
    time_anchor: "1894 Autumn · Midnight",
    title: "Nightshade at the Citadel Banquet",
    location: "Grand Council Banquet Hall",
    description: "The Grand Magistrate collapses after drinking from the gilded chalice.",
    participants: ["Marcus Vance", "Chancellor Vane", "Sarah Coyle"],
    is_flashback: false,
  },
  {
    id: "ev-4",
    chapter_number: 4,
    chronological_order: 5,
    time_anchor: "1894 Winter · Dawn",
    title: "The Clocktower Belfry Stand-off",
    location: "Prague Clocktower Belfry",
    description: "Marcus confronts Lysander atop the open spire surrounded by mist.",
    participants: ["Marcus Vance", "Captain Lysander"],
    is_flashback: false,
  },
];

export const MOCK_PLOT_THREADS: MockPlotThread[] = [
  {
    id: "th-1",
    title: "The Stolen Citadel Vault Key",
    description: "Sarah lifted Sergeant Coyle's brass key during the changing of the night guard.",
    status: "open",
    setup_chapter: 2,
    payoff_chapter: null,
    related_entities: ["Sarah Coyle", "Sergeant Coyle", "Citadel Vault"],
  },
  {
    id: "th-2",
    title: "The Grand Magistrate's Murder",
    description: "Investigation into whether the death was natural cardiac collapse or nightshade poisoning.",
    status: "open",
    setup_chapter: 3,
    payoff_chapter: null,
    related_entities: ["Chancellor Vane", "Nightshade Poison", "Marcus Vance"],
  },
  {
    id: "th-3",
    title: "The Lodestone Compass Calibration",
    description: "Master Aldous tuned the needle to point to the subterranean silver lode.",
    status: "resolved",
    setup_chapter: 1,
    payoff_chapter: 4,
    related_entities: ["The Obsidian Compass", "Marcus Vance"],
  },
  {
    id: "th-4",
    title: "The Prior's Sealed Letter",
    description: "A mysterious message delivered to the monastery gate that was never opened or read.",
    status: "abandoned",
    setup_chapter: 1,
    payoff_chapter: null,
    related_entities: ["Prior Clement"],
  },
  {
    id: "th-5",
    title: "The Poisoner's Apothecary Decoy",
    description: "Rumors planted across the Old Town that an apothecary fled across the river.",
    status: "red_herring",
    setup_chapter: 3,
    payoff_chapter: null,
    related_entities: ["Old Town Apothecary"],
  },
];

export const MOCK_KNOWLEDGE_FACTS = [
  "The Magistrate was poisoned with Belladonna Nightshade",
  "The Obsidian Compass is impounded in Vault 409",
  "Sarah lifted the brass vault key from her father",
  "Chancellor Vane commands the Dover smuggling fleet",
  "Marcus carries Master Aldous's alchemical bloodline",
];

export const MOCK_KNOWLEDGE_MATRIX: Record<
  string,
  Record<string, { knows: boolean; since_chapter?: number; rule: string; propagated?: boolean }>
> = {
  "Marcus Vance": {
    "The Magistrate was poisoned with Belladonna Nightshade": {
      knows: true,
      since_chapter: 3,
      rule: "Direct eyewitness: saw Chancellor Vane empty the crystal vial into the ceremonial chalice.",
      propagated: false,
    },
    "The Obsidian Compass is impounded in Vault 409": {
      knows: false,
      rule: "HAZARD: Marcus believes he still carries the compass in his inner breast pocket. He was not present during the Dover seizure.",
    },
    "Sarah lifted the brass vault key from her father": {
      knows: true,
      since_chapter: 4,
      rule: "Informed secondhand by Sarah in the belfry.",
      propagated: true,
    },
    "Chancellor Vane commands the Dover smuggling fleet": {
      knows: false,
      rule: "HAZARD: Believes the Dover fleet is an official naval blockade. Unaware of the tariff kickbacks.",
    },
    "Marcus carries Master Aldous's alchemical bloodline": {
      knows: true,
      since_chapter: 1,
      rule: "Holds the sealed testament bearing the double-ouroboros watermark.",
      propagated: false,
    },
  },
  "Sarah Coyle": {
    "The Magistrate was poisoned with Belladonna Nightshade": {
      knows: false,
      rule: "HAZARD: Sarah was stationed at the north portcullis. Accusing Vane of poison before Chapter 7 is an epistemic leak.",
    },
    "The Obsidian Compass is impounded in Vault 409": {
      knows: true,
      since_chapter: 3,
      rule: "Witnessed Lysander seal the vault ledger during her patrol round.",
      propagated: false,
    },
    "Sarah lifted the brass vault key from her father": {
      knows: true,
      since_chapter: 2,
      rule: "Primary actor: picked the ring lock from Sergeant Coyle's night belt.",
      propagated: false,
    },
    "Chancellor Vane commands the Dover smuggling fleet": {
      knows: true,
      since_chapter: 2,
      rule: "Intercepted courier dispatch in the lower garrison archives.",
      propagated: false,
    },
    "Marcus carries Master Aldous's alchemical bloodline": {
      knows: true,
      since_chapter: 3,
      rule: "Overheard Father Clement whispering the secret during vespers.",
      propagated: true,
    },
  },
  "Chancellor Vane": {
    "The Magistrate was poisoned with Belladonna Nightshade": {
      knows: true,
      since_chapter: 3,
      rule: "Instigator: procured the nightshade extract through the river apothecary.",
      propagated: false,
    },
    "The Obsidian Compass is impounded in Vault 409": {
      knows: true,
      since_chapter: 3,
      rule: "Ordered Lysander to quarantine the compass from Marcus's reach.",
      propagated: false,
    },
    "Sarah lifted the brass vault key from her father": {
      knows: false,
      rule: "HAZARD: Believes the key remains under Sergeant Coyle's guard.",
    },
    "Chancellor Vane commands the Dover smuggling fleet": {
      knows: true,
      since_chapter: 2,
      rule: "Sole beneficiary of the contraband bullion transfers.",
      propagated: false,
    },
    "Marcus carries Master Aldous's alchemical bloodline": {
      knows: false,
      rule: "Believes Marcus is merely an orphaned foundry apprentice.",
    },
  },
  "Captain Lysander": {
    "The Magistrate was poisoned with Belladonna Nightshade": {
      knows: false,
      rule: "Investigating the demise as acute apoplexy under official orders.",
    },
    "The Obsidian Compass is impounded in Vault 409": {
      knows: true,
      since_chapter: 3,
      rule: "Signed the quarantine inventory in vault ledger folio #409.",
      propagated: false,
    },
    "Sarah lifted the brass vault key from her father": {
      knows: false,
      rule: "Unaware of the theft; assumes the Citadel security grid is airtight.",
    },
    "Chancellor Vane commands the Dover smuggling fleet": {
      knows: true,
      since_chapter: 2,
      rule: "Complicit naval officer providing escort frigates on high tides.",
      propagated: false,
    },
    "Marcus carries Master Aldous's alchemical bloodline": {
      knows: false,
      rule: "Sees Marcus only as an outlaw fugitive with stolen cathedral notes.",
    },
  },
  "High Magistrate Paul": {
    "The Magistrate was poisoned with Belladonna Nightshade": {
      knows: true,
      since_chapter: 3,
      rule: "Recognized the bitter almond taint in the chalice seconds before collapsing.",
      propagated: false,
    },
    "The Obsidian Compass is impounded in Vault 409": {
      knows: false,
      rule: "Deceased prior to the vault lockup.",
    },
    "Sarah lifted the brass vault key from her father": {
      knows: false,
      rule: "Had no knowledge of Sarah's infiltration.",
    },
    "Chancellor Vane commands the Dover smuggling fleet": {
      knows: true,
      since_chapter: 1,
      rule: "Refused to countersign Vane's illicit maritime charter.",
      propagated: false,
    },
    "Marcus carries Master Aldous's alchemical bloodline": {
      knows: true,
      since_chapter: 1,
      rule: "Countersigned the original sealed testament in the cathedral crypts.",
      propagated: false,
    },
  },
};

export const DEFAULT_CHAPTER_1_PROSE = `The brass seal lay upon the scarred oak desk, cold and unyielding beneath Marcus's trembling thumb. Outside, the bells of Prague were ringing terce, sending low iron reverberations through the attic floorboards of Master Aldous's workshop.

Marcus wiped a smudge of lead carbonate from his cuff. For seven months he had ground antimony and vitriol for the master alchemist, believing each crucible was bound for the Imperial Guild at Nuremberg. Yet the ledger beneath the loose flagstone told an entirely different chronicle.

There were twelve names inscribed in Aldous's cipher. The first seven had already perished under mysterious seizures during the winter solstice.

He reached for the brass caliper, measuring the thickness of the vault door's bevel. If the pins were forged of crucible steel, no acid in the workshop would bite through before dusk.

"You should not be holding that, boy," a raspy whisper echoed from the dark stairwell.

Marcus froze. Master Aldous stood in the stone archway, holding a lantern whose yellow wick cast long, skeletal shadows across the rows of alembics.`;

export const DEFAULT_CHAPTER_2_PROSE = `Dawn mist hung low over the Dover rigging, smelling of tar, brine, and coal smoke from the incoming packet steamer. Captain Lysander stood at the head of the stone slipway, his heavy woolen greatcoat buttoned up to his collar against the stinging sea spray.

The naval patrol had impounded four skiffs before the morning tide. In the stern sheets of each vessel, the inspectors had uncovered unmarked crates packed with brass gears, hydraulic escapements, and unrefined mercury from the eastern mines.

"The manifest claims clockwork parts for the Westminster astronomical tower, Captain," Sergeant Kelly reported, stamping his boots against the frost-bitten cobbles.

Lysander reached down and pulled a brass gear from the excelsior straw. The teeth were angled in an impossible spiral—a ratio that no terrestrial chronometer required.

"There is no clockwork tower in Westminster that requires distilled quicksilver, Sergeant," Lysander said softly, tossing the gear into the water. "Summon the port magistrate and lock the harbor gates."

Across the quay, a silhouette in an oilskin mantle slipped between the stacks of lumber and vanished into the fog.`;

export const DEFAULT_CHAPTER_3_PROSE = `Twelve crystal goblets gleamed beneath the vaulted arches of the Citadel Banquet Hall, catching the pale flicker of three hundred beeswax tapers. Chancellor Vane raised his glass toward the assembled nobility, smiling with the practiced warmth of an executioner.

From the shadowy alcove behind the tapestries, Sarah kept her gaze fixed on the Chancellor's left sleeve. She had watched him drop three grains of dark, crystalline nightshade into the Grand Magistrate's carillon decanter while the orchestra played the imperial anthem.

Below the banquet floor, in the iron-gated vaults, Captain Lysander logged the obsidian compass into vault register #409, sealing the iron latch with the Council's wax insignia.

"No one enters Vault Four Hundred and Nine without the Magistrate's direct seal," Lysander barked at the guards, sliding the heavy iron bolt into its hasp.

Sarah slipped her fingers into the leather pouch at her belt. She needed both the ledger and the key before the clock struck midnight, or Marcus would never make it across the Vltava alive.`;

export const DEFAULT_CHAPTER_4_PROSE = `Dawn broke in thin, salt-rimed ribs across the belfry of Prague Cathedral. Below, the fog coiled over the Vltava like grease on cooling soup, swallowing the patrol barges one by one until only the brass beacons at the water-gate remained alight.

Underneath the floorboards, the iron escapement shuddered, ticking in four-second arcs. Marcus knelt beside the alchemical housing, his fingers numb inside cracked lambskin gloves, listening for the telltale friction of ground lead.

Across the river, the lanterns of the Dover naval detachment were already being doused. If Lysander had crossed the bridge before midnight, the harbor register was already sealed against him.

Marcus slipped his fingers into his inner coat pocket and withdrew the obsidian compass, spinning its brass ring to orient the belfry gear-train toward the southern meridian. The needle spun wildly three times before seizing upon true north—a dead azimuth that no natural lodestone should have acknowledged.

High above the gargoyles, the iron escapement struck five notes into the rising gale. The vibration ran down through the timber joints into his knees, humming with the frequency of cold mercury.

If Master Aldous had deceived him about the vault manifest, then every ledger in Prague was forged. Marcus drew his wool scarf across his face and prepared the alchemical crucible.`;

export const RECONCILED_CHAPTER_4_PROSE = `Dawn broke in thin, salt-rimed ribs across the belfry of Prague Cathedral. Below, the fog coiled over the Vltava like grease on cooling soup, swallowing the patrol barges one by one until only the brass beacons at the water-gate remained alight.

Underneath the floorboards, the iron escapement shuddered, ticking in four-second arcs. Marcus knelt beside the alchemical housing, his fingers numb inside cracked lambskin gloves, listening for the telltale friction of ground lead.

Across the river, the lanterns of the Dover naval detachment were already being doused. If Lysander had crossed the bridge before midnight, the harbor register was already sealed against him.

Marcus slipped his fingers into his inner coat pocket and withdrew Master Aldous's brass pocket-watch, winding its tarnished crown to orient the belfry gear-train toward the southern meridian. The escapement caught cleanly with a lawful, tempered ring.

High above the gargoyles, the iron escapement struck five notes into the rising gale. The vibration ran down through the timber joints into his knees, humming with the frequency of cold mercury.

Every ledger in Prague was intact. Marcus drew his wool scarf across his face and prepared the alchemical crucible.`;

export const TWIST_CHAPTER_4_PROSE = `Dawn broke in thin, salt-rimed ribs across the belfry of Prague Cathedral. Below, the fog coiled over the Vltava like grease on cooling soup, swallowing the patrol barges one by one until only the brass beacons at the water-gate remained alight.

Underneath the floorboards, the iron escapement shuddered, ticking in four-second arcs. Marcus knelt beside the alchemical housing, his fingers numb inside cracked lambskin gloves, listening for the telltale friction of ground lead.

Across the river, the lanterns of the Dover naval detachment were already being doused. If Lysander had crossed the bridge before midnight, the harbor register was already sealed against him.

Marcus slipped his fingers into his inner coat pocket and withdrew the obsidian compass—a counterfeit cast in dark resin by Sarah's syndicate—its false dial spinning freely against the belfry gears.

High above the gargoyles, the iron escapement struck five notes into the rising gale. The vibration ran down through the timber joints into his knees, humming with the frequency of cold mercury.

If Master Aldous had deceived him about the vault manifest, then Sarah's counterfeit was their only remaining defense. Marcus drew his wool scarf across his face and prepared the alchemical crucible.`;

export const DEFAULT_CHAPTER_PROSE_MAP: Record<number, string> = {
  1: DEFAULT_CHAPTER_1_PROSE,
  2: DEFAULT_CHAPTER_2_PROSE,
  3: DEFAULT_CHAPTER_3_PROSE,
  4: DEFAULT_CHAPTER_4_PROSE,
};

