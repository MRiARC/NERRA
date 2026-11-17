"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Compass,
  Clock,
  GitBranch,
  Network,
  Users,
  ShieldAlert,
  ArrowRight,
  Eye,
  Key,
  MapPin,
  Lock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
} from "lucide-react";

type ConsoleTab = "epistemic" | "chronology" | "custody" | "graph";

/* =========================================================================
   1. EPISTEMIC KNOWLEDGE MATRIX DATA
   ========================================================================= */
interface KnowledgeCell {
  state: "witnessed" | "hearsay" | "eavesdropped" | "ignorant";
  chapter: string;
  source?: string;
  excerpt: string;
  ruleCheck: string;
}

const CHARACTERS = ["Marcus", "Sarah", "Lord Vane", "High Magistrate", "Lysander"];
const SECRETS = [
  "Nightshade Poison",
  "Citadel Vault Key",
  "The Alchemist's Lineage",
  "Dover Smuggling Fleet",
];

const MATRIX_DATA: Record<string, Record<string, KnowledgeCell>> = {
  Marcus: {
    "Nightshade Poison": {
      state: "witnessed",
      chapter: "Ch. 3 · § 11",
      excerpt: "Marcus watched from the high gallery as Vane tipped the vial into the goblet.",
      ruleCheck: "Can speak with direct eyewitness credibility.",
    },
    "Citadel Vault Key": {
      state: "hearsay",
      chapter: "Ch. 4 · § 04",
      source: "Told by Sarah",
      excerpt: "Sarah whispered that she had lifted the brass key from the guard captain's belt.",
      ruleCheck: "Knows key exists, but cannot identify physical markings firsthand.",
    },
    "The Alchemist's Lineage": {
      state: "witnessed",
      chapter: "Ch. 1 · § 02",
      excerpt: "Marcus possesses the sealed parchment stamped with the imperial signet.",
      ruleCheck: "Fully informed from chapter one.",
    },
    "Dover Smuggling Fleet": {
      state: "ignorant",
      chapter: "Unknown",
      excerpt: "Marcus believes the harbor is under strict imperial blockade.",
      ruleCheck: "HAZARD: Any dialogue where Marcus mentions Dover fleet is an epistemic leak.",
    },
  },
  Sarah: {
    "Nightshade Poison": {
      state: "ignorant",
      chapter: "Unknown",
      excerpt: "Sarah believes the Magistrate died of seasonal lung rot.",
      ruleCheck: "HAZARD: Sarah cannot accuse anyone of poison before Marcus informs her in Ch. 7.",
    },
    "Citadel Vault Key": {
      state: "witnessed",
      chapter: "Ch. 4 · § 02",
      excerpt: "Sarah picked the pocket of Sergeant Coyle during the changing of the guard.",
      ruleCheck: "Direct physical custodian of the key.",
    },
    "The Alchemist's Lineage": {
      state: "eavesdropped",
      chapter: "Ch. 3 · § 08",
      source: "Overheard in chapel",
      excerpt: "Sarah overheard the Prior arguing with Marcus regarding the bloodline.",
      ruleCheck: "Knows the rumor, but lacks documentary proof.",
    },
    "Dover Smuggling Fleet": {
      state: "ignorant",
      chapter: "Unknown",
      excerpt: "Has no knowledge of maritime logistics.",
      ruleCheck: "Ignorant.",
    },
  },
  "Lord Vane": {
    "Nightshade Poison": {
      state: "witnessed",
      chapter: "Ch. 3 · § 10",
      excerpt: "Vane personally commissioned the tincture from the apothecary in the Old Quarter.",
      ruleCheck: "Instigator of the event.",
    },
    "Citadel Vault Key": {
      state: "ignorant",
      chapter: "Unknown",
      excerpt: "Believes the key is safe on Captain Coyle's iron chain.",
      ruleCheck: "Cannot anticipate Sarah entering the vault.",
    },
    "The Alchemist's Lineage": {
      state: "ignorant",
      chapter: "Unknown",
      excerpt: "Believes Marcus is merely an orphaned foundry apprentice.",
      ruleCheck: "Underestimates Marcus's sovereign legal immunity.",
    },
    "Dover Smuggling Fleet": {
      state: "witnessed",
      chapter: "Ch. 2 · § 06",
      excerpt: "Vane receives 15% kickback on all unmanifested shipments through Dover.",
      ruleCheck: "Mastermind of the shipping operation.",
    },
  },
  "High Magistrate": {
    "Nightshade Poison": {
      state: "witnessed",
      chapter: "Ch. 3 · § 12",
      excerpt: "Drank the wine. Deceased.",
      ruleCheck: "Deceased at conclusion of Act I.",
    },
    "Citadel Vault Key": {
      state: "hearsay",
      chapter: "Ch. 1 · § 05",
      excerpt: "Authorized Coyle to carry the key.",
      ruleCheck: "Formal authority only.",
    },
    "The Alchemist's Lineage": {
      state: "witnessed",
      chapter: "Ch. 1 · § 01",
      excerpt: "Signed the original sealed testament before his death.",
      ruleCheck: "Witnessed origin.",
    },
    "Dover Smuggling Fleet": {
      state: "ignorant",
      chapter: "Unknown",
      excerpt: "Was kept completely in the dark by Vane's council faction.",
      ruleCheck: "Ignorant.",
    },
  },
  Lysander: {
    "Nightshade Poison": {
      state: "ignorant",
      chapter: "Unknown",
      excerpt: "Investigating the death as a common cardiac failure.",
      ruleCheck: "Ignorant.",
    },
    "Citadel Vault Key": {
      state: "hearsay",
      chapter: "Ch. 3 · § 01",
      excerpt: "Told by Coyle that the vault remains securely locked.",
      ruleCheck: "False sense of security.",
    },
    "The Alchemist's Lineage": {
      state: "ignorant",
      chapter: "Unknown",
      excerpt: "Sees Marcus only as a fugitive outlaw.",
      ruleCheck: "Ignorant.",
    },
    "Dover Smuggling Fleet": {
      state: "witnessed",
      chapter: "Ch. 2 · § 04",
      excerpt: "Dispatches naval patrols intentionally away from Dover shipping lanes.",
      ruleCheck: "Complicit officer.",
    },
  },
};

/* =========================================================================
   2. DUAL CHRONOLOGY DATA
   ========================================================================= */
interface TimelineScene {
  id: string;
  narrativeChapter: number;
  chronologicalYear: number;
  chronologicalSeason: string;
  title: string;
  location: string;
  cast: string[];
  isFlashback: boolean;
  hasCollision?: boolean;
  collisionDetails?: string;
}

const TIMELINE_SCENES: TimelineScene[] = [
  {
    id: "sc-1",
    narrativeChapter: 1,
    chronologicalYear: 1894,
    chronologicalSeason: "Autumn",
    title: "The Alchemist's Testament",
    location: "Prague Cathedral",
    cast: ["Marcus", "High Magistrate"],
    isFlashback: false,
  },
  {
    id: "sc-2",
    narrativeChapter: 2,
    chronologicalYear: 1888,
    chronologicalSeason: "Winter (6 Yrs Earlier)",
    title: "The Fleet at Dover",
    location: "Dover Anchorage",
    cast: ["Lysander", "Lord Vane"],
    isFlashback: true,
    hasCollision: true,
    collisionDetails:
      "Spatiotemporal Collision: Lysander is documented presiding over the York military tribunal on the exact same date (Ch. 5, § 22). Travel between York and Dover was impossible in 6 hours.",
  },
  {
    id: "sc-3",
    narrativeChapter: 3,
    chronologicalYear: 1894,
    chronologicalSeason: "Autumn (Present)",
    title: "Nightshade at the Banquet",
    location: "Grand Council Hall",
    cast: ["Marcus", "Lord Vane", "High Magistrate"],
    isFlashback: false,
  },
  {
    id: "sc-4",
    narrativeChapter: 4,
    chronologicalYear: 1882,
    chronologicalSeason: "Spring (12 Yrs Earlier)",
    title: "The Forging of the Compass",
    location: "Foundry of the Guild",
    cast: ["The Alchemist", "Marcus (Child)"],
    isFlashback: true,
  },
  {
    id: "sc-5",
    narrativeChapter: 5,
    chronologicalYear: 1894,
    chronologicalSeason: "Winter (Present)",
    title: "The Clocktower Siege",
    location: "Prague Belfry",
    cast: ["Marcus", "Sarah", "Lysander"],
    isFlashback: false,
  },
];

/* =========================================================================
   3. CUSTODY CHAIN DATA
   ========================================================================= */
interface CustodyStep {
  step: number;
  chapter: string;
  holder: string;
  location: string;
  method: string;
  status: "valid" | "paradox";
  notes: string;
}

const CUSTODY_STEPS: CustodyStep[] = [
  {
    step: 1,
    chapter: "Chapter 1",
    holder: "The Brass Alchemist",
    location: "Imperial Foundry",
    method: "Crafted & sanctified",
    status: "valid",
    notes: "Artifact origin confirmed. Needle calibrated to lodestone deposit.",
  },
  {
    step: 2,
    chapter: "Chapter 2",
    holder: "Marcus",
    location: "Old Town Inn",
    method: "Inheritance / Handover",
    status: "valid",
    notes: "Alchemist entrusts compass to Marcus along with the cipher book.",
  },
  {
    step: 3,
    chapter: "Chapter 3",
    holder: "Citadel Iron Vault (Lysander)",
    location: "New Prague Citadel",
    method: "Confiscation upon arrest",
    status: "valid",
    notes: "Marcus arrested at river barrier. Compass catalogued in vault register #409.",
  },
  {
    step: 4,
    chapter: "Chapter 4",
    holder: "Marcus (Asserted)",
    location: "Clocktower Belfry",
    method: "Drawn from coat pocket",
    status: "paradox",
    notes:
      "PARADOX: Marcus escaped jail with zero belongings. The compass remains locked in the Citadel vault 8 miles away.",
  },
];

/* =========================================================================
   4. WORLD & CAST CONSTELLATION DATA
   ========================================================================= */
interface GraphNode {
  id: string;
  name: string;
  type: "character" | "relic" | "location";
  role: string;
  connections: { target: string; relation: string; color: string }[];
}

const GRAPH_NODES: GraphNode[] = [
  {
    id: "marcus",
    name: "Marcus Vance",
    type: "character",
    role: "Protagonist · Alchemist's Ward",
    connections: [
      { target: "sarah", relation: "Pact of Silence", color: "#34d399" },
      { target: "vane", relation: "Blood Feud", color: "#f43f5e" },
      { target: "compass", relation: "Former Keeper", color: "#38bdf8" },
    ],
  },
  {
    id: "sarah",
    name: "Sarah Coyle",
    type: "character",
    role: "Infiltrator · Guard's Daughter",
    connections: [
      { target: "marcus", relation: "Pact of Silence", color: "#34d399" },
      { target: "citadel", relation: "Infiltrated", color: "#fbbf24" },
    ],
  },
  {
    id: "vane",
    name: "Chancellor Vane",
    type: "character",
    role: "Antagonist · High Councilor",
    connections: [
      { target: "marcus", relation: "Warrants Death", color: "#f43f5e" },
      { target: "citadel", relation: "Controls Access", color: "#8c2242" },
      { target: "compass", relation: "Hunting Relic", color: "#fbbf24" },
    ],
  },
  {
    id: "compass",
    name: "The Obsidian Compass",
    type: "relic",
    role: "Legendary Relic · Lodestone Calibrated",
    connections: [
      { target: "marcus", relation: "Attuned To", color: "#38bdf8" },
      { target: "citadel", relation: "Impounded Inside", color: "#f43f5e" },
    ],
  },
  {
    id: "citadel",
    name: "New Prague Citadel",
    type: "location",
    role: "Fortress & High Magistrate's Vault",
    connections: [
      { target: "vane", relation: "Command Seat", color: "#8c2242" },
      { target: "compass", relation: "Secures", color: "#38bdf8" },
    ],
  },
];

export function ForensicConsole() {
  const [activeTab, setActiveTab] = useState<ConsoleTab>("epistemic");

  // State for Epistemic Matrix
  const [selectedChar, setSelectedChar] = useState<string>("Sarah");
  const [selectedSecret, setSelectedSecret] = useState<string>("Nightshade Poison");

  // State for Dual Chronology
  const [chronologyMode, setChronologyMode] = useState<"narrative" | "chronological">(
    "narrative"
  );

  // State for Custody Chain
  const [selectedCustodyStep, setSelectedCustodyStep] = useState<number>(4);

  // State for Graph
  const [selectedNodeId, setSelectedNodeId] = useState<string>("marcus");
  const [graphLens, setGraphLens] = useState<"all" | "characters" | "relics" | "locations">(
    "all"
  );

  const activeCell = MATRIX_DATA[selectedChar]?.[selectedSecret];
  const activeNode = GRAPH_NODES.find((n) => n.id === selectedNodeId) || GRAPH_NODES[0];

  const sortedTimeline =
    chronologyMode === "narrative"
      ? [...TIMELINE_SCENES].sort((a, b) => a.narrativeChapter - b.narrativeChapter)
      : [...TIMELINE_SCENES].sort((a, b) => a.chronologicalYear - b.chronologicalYear);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Console Tab Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-quiet">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
            Forensic Intelligence Engine
          </span>
          <h3 className="font-serif text-xl sm:text-2xl font-medium text-ink-parchment">
            Deterministic Story Continuity Lenses
          </h3>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-subtle border border-border-quiet overflow-x-auto">
          <button
            onClick={() => setActiveTab("epistemic")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === "epistemic"
                ? "bg-surface-elevated text-ink-parchment border border-border-subtle shadow-sm"
                : "text-ink-ash hover:text-ink-parchment hover:bg-surface-card"
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-severity-knowledge" />
            <span>Epistemic Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab("chronology")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === "chronology"
                ? "bg-surface-elevated text-ink-parchment border border-border-subtle shadow-sm"
                : "text-ink-ash hover:text-ink-parchment hover:bg-surface-card"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-pine-moss" />
            <span>Dual Chronology</span>
          </button>

          <button
            onClick={() => setActiveTab("custody")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === "custody"
                ? "bg-surface-elevated text-ink-parchment border border-border-subtle shadow-sm"
                : "text-ink-ash hover:text-ink-parchment hover:bg-surface-card"
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-severity-contradiction" />
            <span>Object Custody</span>
          </button>

          <button
            onClick={() => setActiveTab("graph")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === "graph"
                ? "bg-surface-elevated text-ink-parchment border border-border-subtle shadow-sm"
                : "text-ink-ash hover:text-ink-parchment hover:bg-surface-card"
            }`}
          >
            <Network className="w-3.5 h-3.5 text-wine-crimson" />
            <span>Story Constellation</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <Surface depth={2} border="subtle" rounded="xl" className="overflow-hidden">
        {/* =====================================================================
            TAB 1: EPISTEMIC KNOWLEDGE MATRIX
            ===================================================================== */}
        {activeTab === "epistemic" && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-quiet">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-severity-knowledge">
                  Epistemic Knowledge Matrix
                </span>
                <h4 className="font-serif text-lg text-ink-parchment">
                  Who Knows What Secrets Across Chapters
                </h4>
                <p className="text-xs text-ink-ash mt-0.5">
                  Click any character cell to audit their epistemic state, information origin, and dialogue hazard check.
                </p>
              </div>

              {/* Status Legend */}
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Witnessed
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Hearsay
                </span>
                <span className="flex items-center gap-1 text-purple-400">
                  <span className="w-2 h-2 rounded-full bg-purple-400" /> Eavesdropped
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> Ignorant
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* The 2D Matrix Table */}
              <div className="lg:col-span-8 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-quiet">
                      <th className="py-2.5 px-3 font-mono text-[10px] uppercase text-ink-faint">
                        Character
                      </th>
                      {SECRETS.map((secret) => (
                        <th
                          key={secret}
                          className="py-2.5 px-3 font-mono text-[10px] uppercase text-ink-ash max-w-[120px] truncate"
                        >
                          {secret}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-quiet/50">
                    {CHARACTERS.map((char) => (
                      <tr key={char} className="hover:bg-surface-elevated/40 transition-colors">
                        <td className="py-3 px-3 font-serif font-medium text-ink-parchment">
                          {char}
                        </td>
                        {SECRETS.map((secret) => {
                          const cell = MATRIX_DATA[char]?.[secret];
                          const isSelected = selectedChar === char && selectedSecret === secret;
                          if (!cell) return <td key={secret} />;

                          const stateColors = {
                            witnessed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                            hearsay: "bg-amber-500/10 text-amber-400 border-amber-500/30",
                            eavesdropped: "bg-purple-500/10 text-purple-400 border-purple-500/30",
                            ignorant: "bg-rose-500/10 text-rose-400 border-rose-500/30",
                          };

                          return (
                            <td key={secret} className="py-2 px-2">
                              <button
                                onClick={() => {
                                  setSelectedChar(char);
                                  setSelectedSecret(secret);
                                }}
                                className={`w-full text-left px-2 py-1.5 rounded-lg border text-[11px] font-mono transition-all ${
                                  stateColors[cell.state]
                                } ${
                                  isSelected
                                    ? "ring-2 ring-severity-knowledge shadow-sm scale-105"
                                    : "hover:opacity-90"
                                }`}
                              >
                                <span className="uppercase text-[9px] block tracking-wider font-semibold">
                                  {cell.state}
                                </span>
                                <span className="text-[10px] opacity-80 truncate block">
                                  {cell.chapter}
                                </span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Epistemic Cell Inspector */}
              <div className="lg:col-span-4 p-5 rounded-xl bg-surface-subtle border border-border-quiet flex flex-col justify-between">
                {activeCell ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border-quiet">
                      <div>
                        <span className="font-mono text-[10px] uppercase text-ink-faint">
                          Audit Cell
                        </span>
                        <h5 className="font-serif text-base text-ink-parchment font-medium">
                          {selectedChar}
                        </h5>
                      </div>
                      <Badge
                        variant={
                          activeCell.state === "witnessed"
                            ? "thread"
                            : activeCell.state === "ignorant"
                            ? "contradiction"
                            : "knowledge"
                        }
                        size="xs"
                      >
                        {activeCell.state.toUpperCase()}
                      </Badge>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] uppercase text-ink-faint">Secret Topic</span>
                      <p className="text-xs font-serif font-medium text-ink-parchment">
                        {selectedSecret}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-card border border-border-quiet">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-ink-faint block">
                        Manuscript Origin ({activeCell.chapter})
                      </span>
                      <p className="mt-1 font-serif italic text-xs text-ink-bone leading-relaxed">
                        &ldquo;{activeCell.excerpt}&rdquo;
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-card/60 border border-border-quiet text-xs">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-ink-faint block">
                        Continuity Invariant
                      </span>
                      <p className="mt-1 text-ink-parchment">
                        {activeCell.ruleCheck}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-ink-ash text-xs">
                    Select a cell to inspect epistemic audit.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: DUAL CHRONOLOGY ENGINE
            ===================================================================== */}
        {activeTab === "chronology" && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-quiet">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-pine-moss">
                  Dual Chronology Engine
                </span>
                <h4 className="font-serif text-lg text-ink-parchment">
                  Narrative Order vs. In-Universe Chronological Order
                </h4>
                <p className="text-xs text-ink-ash mt-0.5">
                  Authors write across non-linear flashbacks. Switch order mode to watch scenes rearrange and reveal travel-time collisions.
                </p>
              </div>

              {/* Order Mode Switcher */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-subtle border border-border-quiet">
                <button
                  onClick={() => setChronologyMode("narrative")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    chronologyMode === "narrative"
                      ? "bg-surface-elevated text-ink-parchment border border-border-subtle"
                      : "text-ink-ash hover:text-ink-parchment"
                  }`}
                >
                  📖 Narrative (Reader Order)
                </button>
                <button
                  onClick={() => setChronologyMode("chronological")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    chronologyMode === "chronological"
                      ? "bg-wine-accent text-ink-parchment shadow-sm"
                      : "text-ink-ash hover:text-ink-parchment"
                  }`}
                >
                  ⏳ Chronological (In-Universe)
                </button>
              </div>
            </div>

            {/* Collision Banner if active */}
            {chronologyMode === "chronological" && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-severity-contradiction-bg border border-severity-contradiction-border flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-severity-contradiction shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-medium text-severity-contradiction block">
                    Spatiotemporal Teleportation Detected in 1888
                  </span>
                  <p className="text-ink-bone mt-0.5 leading-relaxed">
                    By sorting into historical chronology, the engine proves Lysander cannot be at Dover Anchorage in October 1888 when Chapter 5 documents him 240 leagues away in York on the identical calendar day.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Scenes Timeline Strip */}
            <div className="space-y-3">
              {sortedTimeline.map((scene, idx) => (
                <motion.div
                  key={scene.id}
                  layout
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className={`p-4 rounded-xl border transition-all ${
                    scene.hasCollision && chronologyMode === "chronological"
                      ? "bg-severity-contradiction-bg/40 border-severity-contradiction"
                      : "bg-surface-subtle border-border-quiet hover:border-border-prominent"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs px-2 py-1 rounded bg-surface-elevated text-ink-ash border border-border-quiet">
                        {chronologyMode === "narrative"
                          ? `Ch. ${scene.narrativeChapter}`
                          : `${scene.chronologicalYear}`}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-serif font-medium text-sm text-ink-parchment">
                            {scene.title}
                          </h5>
                          {scene.isFlashback && (
                            <Badge variant="subtle" size="xs">
                              Flashback
                            </Badge>
                          )}
                          {scene.hasCollision && chronologyMode === "chronological" && (
                            <Badge variant="contradiction" size="xs" dot>
                              Collision
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-ink-faint font-mono mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-ink-ash" /> {scene.location}
                          </span>
                          <span>•</span>
                          <span>Cast: {scene.cast.join(", ")}</span>
                        </div>
                      </div>
                    </div>

                    <span className="font-mono text-[10px] text-ink-ash self-end sm:self-auto">
                      {scene.chronologicalSeason}
                    </span>
                  </div>

                  {scene.hasCollision && chronologyMode === "chronological" && (
                    <div className="mt-3 pt-3 border-t border-severity-contradiction/30 text-xs text-severity-contradiction font-sans">
                      {scene.collisionDetails}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: OBJECT CUSTODY TRACKER
            ===================================================================== */}
        {activeTab === "custody" && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-quiet">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-severity-contradiction">
                  Object Custody Chains
                </span>
                <h4 className="font-serif text-lg text-ink-parchment">
                  Tracking &ldquo;The Obsidian Compass&rdquo; Across Possession Handoffs
                </h4>
                <p className="text-xs text-ink-ash mt-0.5">
                  Click custody events to follow the artifact from creation to paradoxical re-emergence.
                </p>
              </div>

              <Badge variant="contradiction" size="sm" dot pulse>
                1 Custody Paradox Active
              </Badge>
            </div>

            {/* Stepper Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {CUSTODY_STEPS.map((step) => {
                const isSelected = selectedCustodyStep === step.step;
                const isParadox = step.status === "paradox";

                return (
                  <button
                    key={step.step}
                    onClick={() => setSelectedCustodyStep(step.step)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? isParadox
                          ? "bg-severity-contradiction-bg border-severity-contradiction ring-1 ring-severity-contradiction"
                          : "bg-surface-elevated border-wine-accent ring-1 ring-wine-accent"
                        : "bg-surface-subtle border-border-quiet hover:bg-surface-card"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-quiet/50">
                      <span className="font-mono text-[10px] uppercase text-ink-faint">
                        Step 0{step.step}
                      </span>
                      <span className="font-mono text-[10px] text-ink-ash">
                        {step.chapter}
                      </span>
                    </div>

                    <h5 className="font-serif text-xs font-medium text-ink-parchment truncate">
                      {step.holder}
                    </h5>
                    <p className="font-mono text-[10px] text-ink-faint truncate mt-0.5">
                      {step.location}
                    </p>

                    <div className="mt-3">
                      {isParadox ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase text-severity-contradiction font-semibold">
                          <AlertCircle className="w-3 h-3" /> Paradox
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase text-severity-thread">
                          <CheckCircle2 className="w-3 h-3" /> Valid Handoff
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Step Deep Dive */}
            {CUSTODY_STEPS[selectedCustodyStep - 1] && (
              <div className="p-5 rounded-xl bg-surface-subtle border border-border-quiet space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-ink-ash">
                      Stage {selectedCustodyStep}:
                    </span>
                    <h5 className="font-serif text-base text-ink-parchment font-medium">
                      {CUSTODY_STEPS[selectedCustodyStep - 1].method}
                    </h5>
                  </div>
                  <Badge
                    variant={
                      CUSTODY_STEPS[selectedCustodyStep - 1].status === "paradox"
                        ? "contradiction"
                        : "thread"
                    }
                    size="xs"
                  >
                    {CUSTODY_STEPS[selectedCustodyStep - 1].status === "paradox"
                      ? "PARADOX DETECTED"
                      : "CHAIN INTEGRITY VERIFIED"}
                  </Badge>
                </div>

                <p className="text-xs text-ink-bone leading-relaxed">
                  {CUSTODY_STEPS[selectedCustodyStep - 1].notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 4: STORY CONSTELLATION GRAPH
            ===================================================================== */}
        {activeTab === "graph" && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-quiet">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-wine-crimson">
                  World & Cast Network
                </span>
                <h4 className="font-serif text-lg text-ink-parchment">
                  Interactive Relational Entity Constellation
                </h4>
                <p className="text-xs text-ink-ash mt-0.5">
                  Click any entity to illuminate its relational web, custody ties, and alliances.
                </p>
              </div>

              {/* Entity Filter Lenses */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-subtle border border-border-quiet">
                {(["all", "characters", "relics", "locations"] as const).map((lens) => (
                  <button
                    key={lens}
                    onClick={() => setGraphLens(lens)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[10px] uppercase transition-all ${
                      graphLens === lens
                        ? "bg-surface-elevated text-ink-parchment border border-border-subtle"
                        : "text-ink-ash hover:text-ink-parchment"
                    }`}
                  >
                    {lens}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Visual Node Cluster Preview */}
              <div className="lg:col-span-8 p-6 rounded-xl bg-surface-subtle/80 border border-border-quiet min-h-[300px] flex flex-col justify-between relative overflow-hidden">
                {/* Background Grid Accent */}
                <div
                  className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_center,rgba(140,34,66,0.3),transparent_70%)]"
                  aria-hidden="true"
                />

                <div className="relative z-10 flex flex-wrap gap-3 items-center justify-center py-6">
                  {GRAPH_NODES.filter((n) =>
                    graphLens === "all"
                      ? true
                      : graphLens === "characters"
                      ? n.type === "character"
                      : graphLens === "relics"
                      ? n.type === "relic"
                      : n.type === "location"
                  ).map((node) => {
                    const isSelected = selectedNodeId === node.id;
                    const typeBorder =
                      node.type === "character"
                        ? "border-emerald-500/40"
                        : node.type === "relic"
                        ? "border-sky-500/40"
                        : "border-wine-crimson/40";

                    return (
                      <button
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`px-4 py-3 rounded-2xl border transition-all text-left ${typeBorder} ${
                          isSelected
                            ? "bg-surface-elevated text-ink-parchment ring-2 ring-wine-accent shadow-lg scale-105"
                            : "bg-surface-card/90 text-ink-bone hover:bg-surface-elevated"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-current" />
                          <span className="font-serif font-medium text-xs text-ink-parchment">
                            {node.name}
                          </span>
                        </div>
                        <span className="font-mono text-[9px] uppercase text-ink-faint block mt-1">
                          {node.type}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative z-10 text-center font-mono text-[10px] text-ink-faint">
                  ✦ Select a node to trace its multi-hop narrative causality web
                </div>
              </div>

              {/* Node Dossier Inspector */}
              <div className="lg:col-span-4 p-5 rounded-xl bg-surface-subtle border border-border-quiet space-y-4">
                <div className="pb-3 border-b border-border-quiet">
                  <span className="font-mono text-[10px] uppercase text-ink-faint">
                    Entity Dossier
                  </span>
                  <h5 className="font-serif text-lg font-medium text-ink-parchment">
                    {activeNode.name}
                  </h5>
                  <p className="font-mono text-[11px] text-ink-ash">{activeNode.role}</p>
                </div>

                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint block mb-2">
                    Direct Narrative Bonds
                  </span>

                  <div className="space-y-2">
                    {activeNode.connections.map((conn, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-surface-card border border-border-quiet flex items-center justify-between text-xs"
                      >
                        <span className="font-serif text-ink-parchment font-medium capitalize">
                          {conn.target}
                        </span>
                        <span
                          className="font-mono text-[10px] px-2 py-0.5 rounded"
                          style={{
                            color: conn.color,
                            backgroundColor: `${conn.color}15`,
                          }}
                        >
                          {conn.relation}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Surface>
    </div>
  );
}
