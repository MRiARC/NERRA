/**
 * TEST FIXTURE ONLY.
 * Ground-truth PostgreSQL / Neo4j snapshot for "The Obsidian Archive of Aethelgard"
 * (Project ID: cabf8f78-9488-4e6c-b9e3-74d390e6eb45).
 *
 * This file serves strictly as an offline deterministic test fixture and golden snapshot.
 * Production application code must query the live FastAPI story-world endpoints.
 */

import type { RawCharacter, RawRelationship } from './types.ts';

export const AETHELGARD_PROJECT_ID = 'cabf8f78-9488-4e6c-b9e3-74d390e6eb45';

export const AETHELGARD_CHARACTERS: RawCharacter[] = [
  {
    "id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "name": "Corin Vance",
    "status": "alive",
    "first_chapter": 1,
    "last_chapter": 20,
    "aliases": [
      "Corin",
      "Young Corin Vance",
      "young Corin"
    ],
    "physical_traits": {},
    "description": "The archivist of the Seventh Tier who works in the drowned scriptorium beneath Lake Mor-Vaelen. Wears a charcoal wool coat. Discovers a parchment scroll written in his own ciphered handwriting dated ten years in the future. Carries the Brass Astrolabe and writes in the Scriptorium Ledger."
  },
  {
    "id": "b38566c3-1aef-44e5-9eb3-c65402472d47",
    "name": "Silas Vance",
    "status": "deceased",
    "first_chapter": 1,
    "last_chapter": 15,
    "aliases": [
      "Master Silas",
      "Master Silas Vance",
      "Silas"
    ],
    "physical_traits": {},
    "description": "Corin Vance's mentor who perished twenty years ago during the Great Deluge."
  },
  {
    "id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "name": "Lady Vespera Thorne",
    "status": "alive",
    "first_chapter": 2,
    "last_chapter": 20,
    "aliases": [
      "Lady Vespera",
      "Princess Aurelia",
      "Vespera"
    ],
    "physical_traits": {},
    "description": "A noble lady who arrives under royal escort from the northern Silver Court, wearing an emerald velvet travelling cloak and bearing an ivory-sheathed dagger. Claims her brother Lord Julian was lost in the submerged catacombs and insists he is alive in the Vault of Bells."
  },
  {
    "id": "a3841ca4-db51-407d-b2be-24c0cbec7008",
    "name": "Lord Julian",
    "status": "unknown",
    "first_chapter": 2,
    "last_chapter": 3,
    "aliases": [
      "Julian"
    ],
    "physical_traits": {},
    "description": "Brother of Lady Vespera Thorne who was lost in the submerged catacombs and officially declared deceased by the Obsidian Order. Vespera insists he is alive in the Vault of Bells."
  },
  {
    "id": "463a6505-a969-4076-891b-292b6b192355",
    "name": "High Inquisitor Malakor",
    "status": "alive",
    "first_chapter": 3,
    "last_chapter": 19,
    "aliases": [
      "Inquisitor Malakor",
      "Malakor",
      "Young Malakor",
      "the inquisitor"
    ],
    "physical_traits": {},
    "description": "Arrives with six armored penitents. Wears an obsidian breastplate and has sharp steel-gray eyes (also described as cold steel-gray eyes). Demands the surrender of all foreign visitors and forbidden relics. Brandishes the Iron Censer and warns that seeking the Drowned Vault is heresy punishable by total soul-cleansing. Marks the Scriptorium door with ash."
  },
  {
    "id": "faf3b450-18bb-49f0-94a0-6ac3521482d3",
    "name": "Kaelen Voss",
    "status": "alive",
    "first_chapter": 4,
    "last_chapter": 17,
    "aliases": [
      "Voss"
    ],
    "physical_traits": {},
    "description": "A renegade Shadowsmith and exiled artificer. Works among clockwork automata with scarred hands and wears a brass clockwork eyepatch. Agrees to unlock the Seventh Sluice after Corin gives him the Silver Cipher Key to decipher the internal gear mechanism. Possesses the Jade Scarab of Ur-Thal on his workbench."
  },
  {
    "id": "8e22de06-5f30-44a7-bfad-a43c1dbaa52d",
    "name": "Elowen",
    "status": "alive",
    "first_chapter": 6,
    "last_chapter": 20,
    "aliases": [
      "the Blind Astrologer"
    ],
    "physical_traits": {},
    "description": "A blind astrologer consulted by Corin in the drainage catacombs. Surrounded by clockwork ravens that transmit sound and optical echoes into her mind. Reveals epistemic truths about the black mercury and the ancient Sunken Council."
  }
];

export const AETHELGARD_RELATIONSHIPS: RawRelationship[] = [
  {
    "id": "a93eed90-cc89-4d35-b77c-e2d291ff6b44",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "b38566c3-1aef-44e5-9eb3-c65402472d47",
    "type": "mentor-student",
    "sentiment": "respectful",
    "chapter": 1,
    "until_chapter": 5,
    "evidence_quote": "Silas Vance was his mentor who perished twenty years ago during the Great Deluge.",
    "description": "Silas Vance was Corin's mentor before perishing twenty years ago"
  },
  {
    "id": "480d800d-5da8-4537-b92c-9809abb1c43c",
    "character_a_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "character_b_id": "a3841ca4-db51-407d-b2be-24c0cbec7008",
    "type": "familial",
    "sentiment": "devoted",
    "chapter": 2,
    "until_chapter": null,
    "evidence_quote": "Lady Vespera Thorne claims her brother Lord Julian was lost in the submerged catacombs. Vespera insists Julian is alive in the Vault of Bells.",
    "description": "Vespera is Julian's sister who refuses to accept his official death declaration and believes he is still alive"
  },
  {
    "id": "b1aa6df5-aef8-46c1-b1f2-6cf088a47b3e",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "type": "professional",
    "sentiment": "formal",
    "chapter": 2,
    "until_chapter": 8,
    "evidence_quote": "She presents the Silver Cipher Key to Corin Vance for authentication. Corin verifies the Silver Cipher Key; its teeth are carved from starlight silver. Corin warns her that Julian was officially declared deceased by the Obsidian Order.",
    "description": "Corin authenticates the Silver Cipher Key presented by Vespera and provides her with official information about her brother's status"
  },
  {
    "id": "6b876bdb-5729-4d35-97f3-ab7d4bfb997b",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "463a6505-a969-4076-891b-292b6b192355",
    "type": "adversarial",
    "sentiment": "hostile",
    "chapter": 3,
    "until_chapter": 10,
    "evidence_quote": "Malakor demands the surrender of all foreign visitors and forbidden relics... He brandishes the Iron Censer and warns that seeking the Drowned Vault is heresy punishable by total soul-cleansing. Corin denies possessing the Silver Cipher Key.",
    "description": "Malakor demands surrender of forbidden relics and threatens Corin with heresy charges for seeking the Drowned Vault. Corin denies possessing the Silver Cipher Key."
  },
  {
    "id": "b6d9544a-d877-4ea1-8428-c131c0714a47",
    "character_a_id": "463a6505-a969-4076-891b-292b6b192355",
    "character_b_id": "463a6505-a969-4076-891b-292b6b192355",
    "type": "hierarchical",
    "sentiment": "formal",
    "chapter": 3,
    "until_chapter": null,
    "evidence_quote": "Sister Martha stands witness as Malakor marks the Scriptorium door with ash.",
    "description": "Sister Martha serves as witness to Malakor's official actions, suggesting she is subordinate or associated with his authority."
  },
  {
    "id": "432852c1-24d7-442d-8a34-002c8161d696",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "faf3b450-18bb-49f0-94a0-6ac3521482d3",
    "type": "collaborative",
    "sentiment": "trusting",
    "chapter": 4,
    "until_chapter": 7,
    "evidence_quote": "Corin flees through the steam conduits to seek Kaelen Voss, the renegade Shadowsmith... Corin gives the Silver Cipher Key to Voss so Voss can decipher the internal gear mechanism. Voss agrees to unlock the Seventh Sluice.",
    "description": "Corin seeks out Voss for help and entrusts him with the Silver Cipher Key to unlock the Seventh Sluice"
  },
  {
    "id": "5d3f89a3-973a-4ceb-bbb0-3b82b07f91a9",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "b38566c3-1aef-44e5-9eb3-c65402472d47",
    "type": "mentor-student",
    "sentiment": "trusting",
    "chapter": 5,
    "until_chapter": 13,
    "evidence_quote": "Young Corin Vance was a novice scholar studying under Master Silas Vance... Silas reveals the secret of the Sunken Spire to Corin and entrusts him with the prototype Silver Cipher Key.",
    "description": "Silas is Corin's master and mentor who entrusts him with critical secrets and artifacts."
  },
  {
    "id": "b0bbf590-5280-481e-968f-a3dcb02e902e",
    "character_a_id": "b38566c3-1aef-44e5-9eb3-c65402472d47",
    "character_b_id": "463a6505-a969-4076-891b-292b6b192355",
    "type": "hierarchical",
    "sentiment": "wary",
    "chapter": 5,
    "until_chapter": null,
    "evidence_quote": "Young Malakor is then only a junior temple warden. Silas warns Corin that one day the council will betray them.",
    "description": "In the past, Silas knew Malakor when he was only a junior temple warden and warned of future betrayal by the council."
  },
  {
    "id": "81457359-6c40-4ef0-9e46-b519913d2473",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "8e22de06-5f30-44a7-bfad-a43c1dbaa52d",
    "type": "consultative",
    "sentiment": "trusting",
    "chapter": 6,
    "until_chapter": 10,
    "evidence_quote": "Corin navigates the dripping sewer conduits to consult Elowen, the Blind Astrologer.",
    "description": "Corin navigates the dangerous sewer conduits to consult Elowen for knowledge about Aethelgard's secrets"
  },
  {
    "id": "a3694973-57ef-4a76-9efd-508e5b2240df",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "faf3b450-18bb-49f0-94a0-6ac3521482d3",
    "type": "collaborative",
    "sentiment": "concerned",
    "chapter": 7,
    "until_chapter": 12,
    "evidence_quote": "Corin, wearing his charcoal wool coat, meets Voss at the Bell Tower. An agile cloaked assailant ambushes Voss on the high catwalk... Corin chases the shadow across the gargoyles. Voss groans on the stone platform, clutching his wounded shoulder.",
    "description": "Corin meets Voss at the Bell Tower at midnight and chases the assailant after Voss is attacked"
  },
  {
    "id": "cd7097c5-cf86-4f54-922f-a38eb9de0d56",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "type": "collaborative",
    "sentiment": "professional",
    "chapter": 8,
    "until_chapter": 9,
    "evidence_quote": "In the Scriptorium Vault, Corin Vance and Lady Vespera examine the star charts together.",
    "description": "They examine star charts together in the Scriptorium Vault at midnight during the winter solstice"
  },
  {
    "id": "0c295b7e-2daf-4101-aef0-0cdbbf4c13fc",
    "character_a_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "character_b_id": "faf3b450-18bb-49f0-94a0-6ac3521482d3",
    "type": "professional",
    "sentiment": "impatient",
    "chapter": 9,
    "until_chapter": 11,
    "evidence_quote": "Lady Vespera Thorne reveals she stole the key because Voss was taking too long. She needed the tumblers realigned for the water gate.",
    "description": "Lady Vespera grew impatient with Voss's pace and stole the key herself"
  },
  {
    "id": "37004144-4123-4e01-9b5b-55282387fcf3",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "type": "adversarial-turned-alliance",
    "sentiment": "tense",
    "chapter": 9,
    "until_chapter": 11,
    "evidence_quote": "Corin confronts the cloaked thief on the mist-shrouded terrace above the waterfall. The thief drops her hood\u2014it is Lady Vespera Thorne herself, holding the Silver Cipher Key and her ivory dagger... Corin and Vespera form a tense truce",
    "description": "Corin confronts Lady Vespera on the terrace after discovering she is the thief, but they form a tense truce"
  },
  {
    "id": "814151cb-3178-4b50-876b-7ac668c6b35d",
    "character_a_id": "8e22de06-5f30-44a7-bfad-a43c1dbaa52d",
    "character_b_id": "463a6505-a969-4076-891b-292b6b192355",
    "type": "adversarial-sabotage",
    "sentiment": "hostile",
    "chapter": 10,
    "until_chapter": null,
    "evidence_quote": "Just as the inquisitor prepares to brand Corin with the burning seal of silence, Elowen's clockwork raven shatters the high glass lantern, creating a blast of smoke.",
    "description": "Elowen sabotages Malakor's interrogation and prevents him from branding Corin with the seal of silence"
  },
  {
    "id": "96b487fe-fa85-451a-9b25-3a8813858d55",
    "character_a_id": "463a6505-a969-4076-891b-292b6b192355",
    "character_b_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "type": "adversarial-interrogation",
    "sentiment": "hostile",
    "chapter": 10,
    "until_chapter": 16,
    "evidence_quote": "High Inquisitor Malakor surrounds the Scriptorium with inquisitorial guards and drags Corin before the Tribunal. Corin is accused of conspiracy with northern heretics.",
    "description": "Malakor accuses Corin of conspiracy with northern heretics, drags him before the Tribunal, and interrogates him"
  },
  {
    "id": "d7d291b7-dc1c-46e0-9301-cd1669117b85",
    "character_a_id": "8e22de06-5f30-44a7-bfad-a43c1dbaa52d",
    "character_b_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "type": "alliance-rescue",
    "sentiment": "supportive",
    "chapter": 10,
    "until_chapter": 20,
    "evidence_quote": "Just as the inquisitor prepares to brand Corin with the burning seal of silence, Elowen's clockwork raven shatters the high glass lantern, creating a blast of smoke.",
    "description": "Elowen intervenes to rescue Corin from Malakor's interrogation by deploying a clockwork raven to create a diversion"
  },
  {
    "id": "9e166f9f-e473-44fb-a284-5443d94d9ae8",
    "character_a_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "character_b_id": "faf3b450-18bb-49f0-94a0-6ac3521482d3",
    "type": "adversarial",
    "sentiment": "hostile",
    "chapter": 11,
    "until_chapter": 12,
    "evidence_quote": "Corin makes a premature accusation: 'Vespera coated the silver key with weeping belladonna venom to paralyze you at the bell tower!' Voss checks his wound with alarm.",
    "description": "Vespera is accused of poisoning Voss with venom on the silver key at the bell tower, causing him injury."
  },
  {
    "id": "b6bbe09f-4db6-4a0e-8f33-454a152775e3",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "type": "adversarial",
    "sentiment": "accusatory",
    "chapter": 11,
    "until_chapter": 12,
    "evidence_quote": "Corin makes a premature accusation: 'Vespera coated the silver key with weeping belladonna venom to paralyze you at the bell tower!'",
    "description": "Corin makes a premature accusation that Vespera poisoned Voss with weeping belladonna venom on the silver key."
  },
  {
    "id": "751fca34-c868-4ad4-81e5-16b10d3a228a",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "type": "collaborative",
    "sentiment": "neutral",
    "chapter": 12,
    "until_chapter": 14,
    "evidence_quote": "Corin, Voss, and Vespera meet before the colossal arch of the Seventh Vault beneath the black lake.",
    "description": "Corin, Voss, and Vespera meet as a group before the colossal arch of the Seventh Vault to collaborate on opening it"
  },
  {
    "id": "b11578af-3b2e-4488-b5ac-23caaf80cd7f",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "faf3b450-18bb-49f0-94a0-6ac3521482d3",
    "type": "collaborative",
    "sentiment": "neutral",
    "chapter": 12,
    "until_chapter": 17,
    "evidence_quote": "Corin, Voss, and Vespera meet before the colossal arch of the Seventh Vault beneath the black lake.",
    "description": "Corin and Voss meet as part of a group before the Seventh Vault to work together on opening it"
  },
  {
    "id": "b15cf3ff-5e93-4dde-85ba-e40c053d9ca6",
    "character_a_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "character_b_id": "faf3b450-18bb-49f0-94a0-6ac3521482d3",
    "type": "collaborative",
    "sentiment": "neutral",
    "chapter": 12,
    "until_chapter": 14,
    "evidence_quote": "Lady Vespera Thorne steps forward and inserts the Silver Cipher Key into the keystone aperture. Voss engages the hydraulic bypass lever.",
    "description": "Vespera inserts the Silver Cipher Key while Voss engages the hydraulic bypass lever, working in coordination to open the Seventh Vault"
  },
  {
    "id": "81a4a81b-f7c4-4647-86c8-fcb05a3c2eaa",
    "character_a_id": "b38566c3-1aef-44e5-9eb3-c65402472d47",
    "character_b_id": "b38566c3-1aef-44e5-9eb3-c65402472d47",
    "type": "protector-protected",
    "sentiment": "protective",
    "chapter": 13,
    "until_chapter": null,
    "evidence_quote": "Silas Vance triggers the emergency floodgates to drown the lower wards, spiriting Princess Aurelia away to the northern border where she took the alias Lady Vespera Thorne",
    "description": "Silas Vance spirited Princess Aurelia away to safety during the mutiny"
  },
  {
    "id": "baa3e737-acbc-4b01-bb98-8fbc1e468a83",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "b38566c3-1aef-44e5-9eb3-c65402472d47",
    "type": "familial-descendant",
    "sentiment": "respectful",
    "chapter": 13,
    "until_chapter": 15,
    "evidence_quote": "Seven years before the catastrophic flood, the council of Aethelgard governed in opulence. High Chancellor Silas Vance presided over the guild elders.",
    "description": "Corin Vance appears to be related to High Chancellor Silas Vance, experiencing a temporal flashback to events involving his ancestor"
  },
  {
    "id": "d8f5fe44-26dd-4780-b39e-58dbe3b6db0f",
    "character_a_id": "b38566c3-1aef-44e5-9eb3-c65402472d47",
    "character_b_id": "b38566c3-1aef-44e5-9eb3-c65402472d47",
    "type": "adversarial-mutiny",
    "sentiment": "hostile",
    "chapter": 13,
    "until_chapter": null,
    "evidence_quote": "Warden Malakor stages a covert mutiny",
    "description": "Warden Malakor staged a covert mutiny against the council presided over by Silas Vance"
  },
  {
    "id": "282d21e3-e2ff-4013-b847-7e1f5b9fdda1",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "type": "adversarial-confrontational",
    "sentiment": "tense",
    "chapter": 14,
    "until_chapter": 17,
    "evidence_quote": "Within the dripping marble halls of the opened vault, Corin confronts Vespera about her actions at the bell tower.",
    "description": "Corin confronts Vespera about her actions at the bell tower"
  },
  {
    "id": "4eb584b6-ed9b-4b3a-9820-33d0550d56b0",
    "character_a_id": "faf3b450-18bb-49f0-94a0-6ac3521482d3",
    "character_b_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "type": "adversarial-betrayed",
    "sentiment": "resigned",
    "chapter": 14,
    "until_chapter": 17,
    "evidence_quote": "Voss nods grimly, accepting the truth.",
    "description": "Voss grimly accepts the truth about being poisoned by Vespera"
  },
  {
    "id": "d7243d1a-5c7e-41c1-b5d4-0b79b27f4d20",
    "character_a_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "character_b_id": "faf3b450-18bb-49f0-94a0-6ac3521482d3",
    "type": "adversarial-confession",
    "sentiment": "guilty",
    "chapter": 14,
    "until_chapter": 17,
    "evidence_quote": "Lady Vespera Thorne formally confesses: 'I coated the silver cipher key with weeping belladonna venom so that Voss would succumb to slumber without lasting harm.'",
    "description": "Vespera confesses to poisoning Voss with weeping belladonna venom on the silver cipher key to make him fall asleep"
  },
  {
    "id": "3c6e20b1-8e00-4ffb-858b-b05600d03709",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "b38566c3-1aef-44e5-9eb3-c65402472d47",
    "type": "mentor-student",
    "sentiment": "traumatic-obedience",
    "chapter": 15,
    "until_chapter": null,
    "evidence_quote": "on the night of the flood, Silas did not die by enemy blade; Silas was mortally wounded and commanded young Corin to pull the sluice lever to seal the breach. Corin realizes his memory amnesia was a psychological defense against the trauma of drowning his mentor's city.",
    "description": "Silas was mortally wounded on the night of the flood and commanded young Corin to pull the sluice lever to seal the breach, resulting in the drowning of the city. Corin's memory amnesia was a psychological defense against the trauma of this act."
  },
  {
    "id": "99f2c9fb-7b08-4d02-834d-028ecdf48a9f",
    "character_a_id": "463a6505-a969-4076-891b-292b6b192355",
    "character_b_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "type": "adversarial-confrontation",
    "sentiment": "hostile",
    "chapter": 16,
    "until_chapter": 17,
    "evidence_quote": "High Inquisitor Malakor breaches the inner sanctum. His body has been transformed by drinking black mercury: his steel-gray eyes have turned to pitch-black void wells radiating shadowy vapor.",
    "description": "Malakor breaches the inner sanctum and mocks Corin after transforming by drinking black mercury"
  },
  {
    "id": "b6967fda-0c60-4463-85ee-76a0bbd6f0c7",
    "character_a_id": "463a6505-a969-4076-891b-292b6b192355",
    "character_b_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "type": "adversarial-sacrificial",
    "sentiment": "hostile",
    "chapter": 16,
    "until_chapter": 17,
    "evidence_quote": "He mocks Corin and Vespera, revealing he knew Vespera was Princess Aurelia all along and intended to sacrifice her to unbind the entity beneath Lake Mor-Vaelen.",
    "description": "Malakor reveals he knew Vespera was Princess Aurelia all along and intended to sacrifice her to unbind the entity beneath Lake Mor-Vaelen"
  },
  {
    "id": "d0ec9d0d-29ee-4252-9a43-83342ec961d2",
    "character_a_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "character_b_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "type": "identity-revelation",
    "sentiment": "neutral",
    "chapter": 16,
    "until_chapter": null,
    "evidence_quote": "revealing he knew Vespera was Princess Aurelia all along",
    "description": "Lady Vespera Thorne is revealed to be Princess Aurelia"
  },
  {
    "id": "2daf56ea-1a24-41c3-84b2-9fc18feca261",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "type": "collaborative-escape",
    "sentiment": "allied",
    "chapter": 17,
    "until_chapter": 20,
    "evidence_quote": "He jams his mechanical arm into the gear teeth to hold the blast door open for Corin and Vespera.",
    "description": "Corin and Vespera escape together through the blast door held by Voss"
  },
  {
    "id": "6b3dfdf3-55eb-4c92-bbd8-084d96447289",
    "character_a_id": "faf3b450-18bb-49f0-94a0-6ac3521482d3",
    "character_b_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "type": "collaborative-sacrificial",
    "sentiment": "protective",
    "chapter": 17,
    "until_chapter": null,
    "evidence_quote": "He jams his mechanical arm into the gear teeth to hold the blast door open for Corin and Vespera. Voss bids Corin to finish the journey as the collapsing gantry plunges into the whirlpool.",
    "description": "Voss sacrifices himself by jamming his mechanical arm into gear teeth to hold a blast door open for Corin"
  },
  {
    "id": "75a11edb-b420-4ef2-a16e-ec2616d5e85e",
    "character_a_id": "463a6505-a969-4076-891b-292b6b192355",
    "character_b_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "type": "adversarial-combat",
    "sentiment": "hostile",
    "chapter": 17,
    "until_chapter": 19,
    "evidence_quote": "Inquisitor Malakor unleashes torrents of black mercury constructs.",
    "description": "Malakor unleashes black mercury constructs in combat against Corin"
  },
  {
    "id": "85fc4f8d-42c2-4583-b10e-fd42b8820736",
    "character_a_id": "463a6505-a969-4076-891b-292b6b192355",
    "character_b_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "type": "adversarial-combat",
    "sentiment": "hostile",
    "chapter": 17,
    "until_chapter": null,
    "evidence_quote": "Inquisitor Malakor unleashes torrents of black mercury constructs. The iron gantry begins to collapse under the pressure of the subterranean vortex.",
    "description": "Malakor attacks with black mercury constructs as Vespera escapes"
  },
  {
    "id": "ceffffa0-6ced-431f-adcc-da62c49da195",
    "character_a_id": "faf3b450-18bb-49f0-94a0-6ac3521482d3",
    "character_b_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "type": "collaborative-sacrificial",
    "sentiment": "protective",
    "chapter": 17,
    "until_chapter": null,
    "evidence_quote": "He jams his mechanical arm into the gear teeth to hold the blast door open for Corin and Vespera.",
    "description": "Voss sacrifices himself to hold the blast door open for Vespera's escape"
  },
  {
    "id": "ea26ddec-3a47-471f-8169-76c14edbf734",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "463a6505-a969-4076-891b-292b6b192355",
    "type": "adversarial-final confrontation",
    "sentiment": "hostile",
    "chapter": 19,
    "until_chapter": null,
    "evidence_quote": "Malakor emerges from the mercury mist for a final confrontation atop the shattered glass arches. He conjures spears of crystallized shadow. Corin Vance uses the Brass Astrolabe to align the ambient temporal frequencies of the room. He refracts Malakor's shadow sorcery through the astrolabe lens, locking High Inquisitor Malakor into an inescapable recurring five-second temporal stasis loop.",
    "description": "Final confrontation atop the shattered glass arches where Corin uses the Brass Astrolabe to trap Malakor in temporal stasis"
  },
  {
    "id": "6589e22f-f717-4f1c-b363-cb3cbabe2202",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "type": "ceremonial-formal",
    "sentiment": "respectful",
    "chapter": 20,
    "until_chapter": null,
    "evidence_quote": "Corin formally transfers the Obsidian Phylactery into the hands of Lady Vespera, addressing her as Princess Aurelia.",
    "description": "Corin formally transfers the Obsidian Phylactery to Lady Vespera, addressing her by her true title as Princess Aurelia"
  },
  {
    "id": "709546b7-4ae9-4789-89ba-46d60e7a77fd",
    "character_a_id": "082fa8a3-47e6-4436-82c1-8197f0f71381",
    "character_b_id": "8e22de06-5f30-44a7-bfad-a43c1dbaa52d",
    "type": "allied-companionship",
    "sentiment": "neutral",
    "chapter": 20,
    "until_chapter": null,
    "evidence_quote": "Corin Vance, Lady Vespera Thorne, and Elowen stand on the shores of Lake Mor-Vaelen as dawn breaks.",
    "description": "Corin and Elowen stand together on the shores of Lake Mor-Vaelen at dawn as the vigil is fulfilled"
  },
  {
    "id": "a83cf8ac-7be3-41bc-aadf-b9a6dedb1196",
    "character_a_id": "6f1bcccc-39c1-456a-95e8-532c88fc1b8a",
    "character_b_id": "8e22de06-5f30-44a7-bfad-a43c1dbaa52d",
    "type": "allied-companionship",
    "sentiment": "neutral",
    "chapter": 20,
    "until_chapter": null,
    "evidence_quote": "Corin Vance, Lady Vespera Thorne, and Elowen stand on the shores of Lake Mor-Vaelen as dawn breaks.",
    "description": "Lady Vespera and Elowen stand together on the shores of Lake Mor-Vaelen at dawn as the vigil is fulfilled"
  }
];
