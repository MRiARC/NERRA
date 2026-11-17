"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Feather,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Eye,
  ShieldCheck,
  ChevronRight,
  BookOpen,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

type ScenarioId = "custody" | "epistemic" | "chronology";

interface Scenario {
  id: ScenarioId;
  title: string;
  category: string;
  chapter: string;
  act: string;
  sceneName: string;
  initialProse: {
    before: string;
    flawedText: string;
    after: string;
  };
  reconciledText: string;
  finding: {
    code: string;
    type: "contradiction" | "knowledge" | "warning";
    title: string;
    severityLabel: string;
    assertedClaim: string;
    canonTruth: string;
    evidenceChapter: string;
    explanation: string;
    intentOptionLabel: string;
  };
}

const SCENARIOS: Record<ScenarioId, Scenario> = {
  custody: {
    id: "custody",
    title: "Artifact Custody Paradox",
    category: "Physical Custody",
    chapter: "Chapter 4",
    act: "Act II",
    sceneName: "The Clocktower Spire",
    initialProse: {
      before:
        "The gale tore through the open belfry, drenching the gargoyles in river mist. Marcus backed toward the edge, his boots skidding across slick slate. Across the parapet, Lysander leveled his flintlock. Without breaking his gaze, ",
      flawedText:
        "Marcus withdrew the obsidian compass from his inner coat pocket and spun its brass ring.",
      after:
        " The needle spun erratically toward the river gate, pointing where no northern lodestone could ever guide.",
    },
    reconciledText:
      "Marcus reached toward his inner coat pocket, his fingers closing on empty silk where the obsidian compass once rested.",
    finding: {
      code: "ISSUE-042",
      type: "contradiction",
      title: "Broken Object Custody Chain",
      severityLabel: "Physical Contradiction",
      assertedClaim:
        "Marcus possesses and activates the obsidian compass in Chapter 4 at the Clocktower.",
      canonTruth:
        "The obsidian compass was impounded in the High Magistrate’s Vault in Chapter 3, Scene 2.",
      evidenceChapter: "Ch. 3 · § 14",
      explanation:
        "No custody transfer or retrieval event exists between Lysander impounding the relic in Chapter 3 and Marcus producing it in Chapter 4. Marcus was imprisoned 8 miles away.",
      intentOptionLabel: "Mark as Intentional Counterfeit (Bluff)",
    },
  },
  epistemic: {
    id: "epistemic",
    title: "Epistemic Knowledge Leak",
    category: "Character Knowledge",
    chapter: "Chapter 6",
    act: "Act II",
    sceneName: "The High Council Chamber",
    initialProse: {
      before:
        "The great oak doors groaned shut. Sarah stood alone before the twelve seated judges, the torchlight flickering across their stone masks. She leveled her gaze at Chancellor Vane and said quietly, ",
      flawedText:
        "\"We both know you dissolved nightshade into the Grand Magistrate's wine before midnight.\"",
      after:
        " A sharp intake of breath ran through the gallery, though Vane’s smile never wavered.",
    },
    reconciledText:
      "\"We both know the Grand Magistrate never died of natural fever in that locked bedchamber.\"",
    finding: {
      code: "ISSUE-078",
      type: "knowledge",
      title: "Epistemic State Violation",
      severityLabel: "Premature Knowledge Leak",
      assertedClaim:
        "Sarah knows the exact poison (nightshade) and the time (before midnight).",
      canonTruth:
        "Only Vane and the apothecary know the poison type. Sarah was locked in the lower cellar until 3:00 AM.",
      evidenceChapter: "Ch. 5 · § 09",
      explanation:
        "Sarah has not received testimony, eavesdropped, or read any correspondence revealing the nightshade poison. Speaking with firsthand certainty shatters epistemic immersion.",
      intentOptionLabel: "Mark as Lucky Accusation (Unverified Bluff)",
    },
  },
  chronology: {
    id: "chronology",
    title: "Dual Timeline Collision",
    category: "Spatiotemporal Order",
    chapter: "Chapter 2",
    act: "Act I",
    sceneName: "The Ashford Anchorage",
    initialProse: {
      before:
        "Rain pattered against the canvas awnings of the docks. Dawn was still two hours away when ",
      flawedText:
        "Lysander inspected the harbor manifests beside Captain Valerius, confirming the galleon had cleared the reef.",
      after:
        " The sea mist swallowed the lantern light as the last mooring lines were cast into the dark surge.",
    },
    reconciledText:
      "Captain Valerius signed the harbor manifests alone, clutching Lysander’s sealed written orders from York.",
    finding: {
      code: "ISSUE-115",
      type: "contradiction",
      title: "Spatiotemporal Presence Collision",
      severityLabel: "Dual Timeline Collision",
      assertedClaim:
        "Lysander is physically present at Ashford Anchorage on the 4th of October at dawn.",
      canonTruth:
        "Chapter 5 establishes Lysander presided over the court martial in York until midnight of October 3rd.",
      evidenceChapter: "Ch. 5 · § 22",
      explanation:
        "York to Ashford is 240 leagues over mountainous terrain. In 1888 carriage transit, this requires a minimum of 48 hours. Lysander cannot physically stand at Ashford docks 6 hours later.",
      intentOptionLabel: "Mark as Non-Linear Flashback Discrepancy",
    },
  },
};

export function HeroProseSimulator() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId>("custody");
  const [resolvedState, setResolvedState] = useState<"unresolved" | "twist" | "reconciled">(
    "unresolved"
  );
  const [isHovered, setIsHovered] = useState(false);
  const [activeInspectorOpen, setActiveInspectorOpen] = useState(true);

  const scenario = SCENARIOS[selectedScenarioId];

  const handleScenarioChange = (id: ScenarioId) => {
    setSelectedScenarioId(id);
    setResolvedState("unresolved");
  };

  const handleResolveTwist = () => {
    setResolvedState("twist");
  };

  const handleResolveReconcile = () => {
    setResolvedState("reconciled");
  };

  const handleReset = () => {
    setResolvedState("unresolved");
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Scenario Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border-quiet">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Interactive Test Cases
          </span>
          <span className="text-border-subtle">•</span>
          <span className="text-xs text-ink-bone">
            Select a manuscript dilemma:
          </span>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-subtle border border-border-quiet">
          {(Object.keys(SCENARIOS) as ScenarioId[]).map((key) => {
            const sc = SCENARIOS[key];
            const isActive = selectedScenarioId === key;
            return (
              <button
                key={key}
                onClick={() => handleScenarioChange(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-surface-elevated text-ink-parchment shadow-sm border border-border-subtle"
                    : "text-ink-ash hover:text-ink-parchment hover:bg-surface-card"
                }`}
              >
                {sc.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Frame */}
      <Surface
        depth={2}
        border="subtle"
        rounded="xl"
        className="mt-4 overflow-hidden border border-border-subtle shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      >
        {/* Studio Top Masthead */}
        <div className="h-12 px-5 bg-surface-subtle border-b border-border-quiet flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-severity-contradiction/80 border border-severity-contradiction inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-severity-warning/80 border border-severity-warning inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-severity-thread/80 border border-severity-thread inline-block" />
            </div>
            <div className="h-4 w-px bg-border-quiet mx-1" />
            <div className="flex items-center gap-2 font-mono text-[11px] text-ink-ash">
              <span className="text-ink-parchment font-medium">The Brass Alchemist of Prague</span>
              <span className="text-ink-faint">/</span>
              <span>{scenario.chapter}: {scenario.sceneName}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {resolvedState === "unresolved" ? (
              <Badge
                variant={scenario.finding.type === "knowledge" ? "knowledge" : "contradiction"}
                size="xs"
                dot
                pulse
              >
                1 {scenario.finding.severityLabel} Detected
              </Badge>
            ) : resolvedState === "twist" ? (
              <Badge variant="wine" size="xs" className="gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Canon Twist Accepted</span>
              </Badge>
            ) : (
              <Badge variant="thread" size="xs" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Text Reconciled</span>
              </Badge>
            )}

            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border-quiet font-mono text-[10px] text-ink-faint">
              <span>LINTER ACTIVE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-severity-thread animate-pulse" />
            </div>
          </div>
        </div>

        {/* Studio Workspace: Split Manuscript & Finding Case */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
          {/* Left: Editorial Galley Prose */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border-quiet bg-surface-void/40">
            <div>
              {/* Manuscript Page Header */}
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-border-quiet/60">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
                  {scenario.act} • {scenario.chapter}
                </span>
                <span className="font-mono text-[10px] text-ink-faint">
                  Word 1,482 of 3,110
                </span>
              </div>

              {/* The Prose Itself */}
              <article className="prose prose-invert max-w-none">
                <p className="font-serif text-lg sm:text-xl text-ink-bone leading-[1.8] sm:leading-[1.85] selection:bg-wine-accent selection:text-ink-parchment">
                  <span>{scenario.initialProse.before}</span>

                  {resolvedState === "reconciled" ? (
                    <motion.span
                      initial={{ backgroundColor: "rgba(52, 211, 153, 0.25)" }}
                      animate={{ backgroundColor: "rgba(52, 211, 153, 0.05)" }}
                      transition={{ duration: 1.5 }}
                      className="px-1.5 py-0.5 rounded text-ink-parchment border-b border-severity-thread"
                    >
                      {scenario.reconciledText}
                    </motion.span>
                  ) : resolvedState === "twist" ? (
                    <span className="relative group cursor-pointer">
                      <span className="px-1 py-0.5 rounded bg-wine-accent/20 border-b border-wine-crimson text-ink-parchment font-medium">
                        {scenario.initialProse.flawedText}
                      </span>
                      <span className="inline-flex ml-1.5 align-middle">
                        <Badge variant="wine" size="xs">
                          Twist Locked
                        </Badge>
                      </span>
                    </span>
                  ) : (
                    /* The Active Squiggled Contradiction */
                    <span
                      onClick={() => setActiveInspectorOpen(true)}
                      onMouseEnter={() => setIsHovered(true)}
                      onMouseLeave={() => setIsHovered(false)}
                      className={`relative cursor-pointer transition-colors px-1 py-0.5 rounded ${
                        scenario.finding.type === "knowledge"
                          ? "bg-severity-knowledge-bg text-ink-parchment decoration-severity-knowledge underline underline-offset-8 decoration-wavy decoration-2"
                          : "bg-severity-contradiction-bg text-ink-parchment decoration-severity-contradiction underline underline-offset-8 decoration-wavy decoration-2"
                      } ${isHovered ? "ring-1 ring-border-prominent" : ""}`}
                    >
                      <span>{scenario.initialProse.flawedText}</span>

                      {/* Floating Indicator Tooltip */}
                      <span className="absolute -top-3.5 right-0 font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-surface-elevated border border-border-subtle shadow-sm flex items-center gap-1 text-ink-parchment">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            scenario.finding.type === "knowledge"
                              ? "bg-severity-knowledge"
                              : "bg-severity-contradiction"
                          }`}
                        />
                        {scenario.finding.code}
                      </span>
                    </span>
                  )}

                  <span>{scenario.initialProse.after}</span>
                </p>
              </article>
            </div>

            {/* Bottom Status & Reset Control */}
            <div className="pt-8 mt-6 border-t border-border-quiet/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-ink-ash">
                <span className="font-mono text-[10px] uppercase text-ink-faint">
                  Engine Status:
                </span>
                {resolvedState === "unresolved" ? (
                  <span className="text-severity-contradiction font-mono text-[11px]">
                    ● 1 Inconsistency in Scene
                  </span>
                ) : (
                  <span className="text-severity-thread font-mono text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Canon Coherent
                  </span>
                )}
              </div>

              {resolvedState !== "unresolved" && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 font-mono text-[11px] text-ink-ash hover:text-ink-parchment transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Scene</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Finding Case File & Triage Actions */}
          <div className="lg:col-span-5 p-6 sm:p-8 bg-surface-card flex flex-col justify-between">
            <div className="space-y-5">
              {/* Case Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border-quiet">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-ink-ash font-semibold">
                    Case File {scenario.finding.code}
                  </span>
                  <Badge
                    variant={
                      scenario.finding.type === "knowledge"
                        ? "knowledge"
                        : "contradiction"
                    }
                    size="xs"
                  >
                    {scenario.finding.severityLabel}
                  </Badge>
                </div>

                <span className="font-mono text-[10px] text-ink-faint">
                  {scenario.category}
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h4 className="font-serif text-lg font-medium text-ink-parchment">
                  {scenario.finding.title}
                </h4>
                <p className="mt-2 text-xs text-ink-bone leading-relaxed">
                  {scenario.finding.explanation}
                </p>
              </div>

              {/* Forensic Canon Comparison Grid */}
              <div className="space-y-2.5 rounded-xl bg-surface-subtle p-3.5 border border-border-quiet text-xs font-mono">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-faint flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-severity-contradiction" />
                    <span>Current Manuscript Claim</span>
                  </div>
                  <p className="mt-1 font-sans text-xs text-ink-parchment pl-3 border-l-2 border-severity-contradiction">
                    &ldquo;{scenario.finding.assertedClaim}&rdquo;
                  </p>
                </div>

                <div className="pt-2 border-t border-border-quiet/60">
                  <div className="text-[10px] uppercase tracking-wider text-ink-faint flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-severity-thread" />
                      <span>Canon Truth in Story Graph</span>
                    </span>
                    <span className="text-ink-ash text-[9px]">
                      {scenario.finding.evidenceChapter}
                    </span>
                  </div>
                  <p className="mt-1 font-sans text-xs text-ink-parchment pl-3 border-l-2 border-severity-thread">
                    &ldquo;{scenario.finding.canonTruth}&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* Authorial Triage Actions */}
            <div className="pt-6 border-t border-border-quiet space-y-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint block">
                Resolve Inconsistency
              </span>

              {resolvedState === "unresolved" ? (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleResolveReconcile}
                    className="w-full justify-between gap-2 shadow-sm"
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Reconcile Text with Canon</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResolveTwist}
                    className="w-full justify-between gap-2 border-wine-accent/40 hover:border-wine-accent"
                  >
                    <span className="flex items-center gap-2 text-ink-bone">
                      <Sparkles className="w-3.5 h-3.5 text-wine-crimson" />
                      <span className="truncate">{scenario.finding.intentOptionLabel}</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl bg-surface-subtle p-3.5 border border-border-quiet">
                  <div className="flex items-center gap-2 text-xs text-ink-parchment font-medium">
                    <CheckCircle2 className="w-4 h-4 text-severity-thread" />
                    <span>
                      {resolvedState === "reconciled"
                        ? "Prose reconciled in manuscript."
                        : "Marked as intentional authorial twist."}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-ash">
                    {resolvedState === "reconciled"
                      ? "The timeline and custody chain are now in 100% agreement."
                      : "The engine records this as an intentional deceit; no future false alarms will trigger."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Surface>
    </div>
  );
}
