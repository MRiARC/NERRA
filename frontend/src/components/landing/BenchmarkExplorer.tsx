"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import {
  FileText,
  Clock,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Sliders,
  Layers,
  ArrowUpRight,
  Zap,
} from "lucide-react";

interface ChapterBenchmark {
  ch: number;
  title: string;
  words: number;
  latency: number;
  tokens: number;
  entities: {
    characters: number;
    locations: number;
    objects: number;
    events: number;
    claims: number;
  };
  quarantined: number;
  contradictions: number;
  highlight?: string;
}

const CHAPTER_BENCHMARKS: ChapterBenchmark[] = [
  {
    ch: 1,
    title: "The Scribe of the Subterrane",
    words: 2596,
    latency: 80.8,
    tokens: 66665,
    entities: { characters: 2, locations: 4, objects: 6, events: 6, claims: 25 },
    quarantined: 16,
    contradictions: 0,
    highlight: "Initial novel world seeds established with zero hallucinations.",
  },
  {
    ch: 2,
    title: "The Pale Envoy from the Silver Court",
    words: 2622,
    latency: 79.3,
    tokens: 75330,
    entities: { characters: 4, locations: 8, objects: 12, events: 4, claims: 16 },
    quarantined: 4,
    contradictions: 1,
    highlight: "First cross-chapter character interaction linked into graph.",
  },
  {
    ch: 5,
    title: "Twelve Years Before the Breach (Flashback)",
    words: 2613,
    latency: 113.7,
    tokens: 86749,
    entities: { characters: 3, locations: 4, objects: 4, events: 6, claims: 15 },
    quarantined: 2,
    contradictions: 6,
    highlight: "Temporal Synthesizer places events 12 years prior to Chapter 1.",
  },
  {
    ch: 8,
    title: "Midnight at Two Sanctums (Simultaneous)",
    words: 2560,
    latency: 45.3,
    tokens: 79234,
    entities: { characters: 3, locations: 3, objects: 3, events: 5, claims: 9 },
    quarantined: 0,
    contradictions: 8,
    highlight: "0 False Positives: Confirmed simultaneous action at distinct coordinates.",
  },
  {
    ch: 11,
    title: "The Premature Accusation (Epistemic Trap)",
    words: 2557,
    latency: 49.1,
    tokens: 85750,
    entities: { characters: 3, locations: 4, objects: 4, events: 4, claims: 10 },
    quarantined: 1,
    contradictions: 8,
    highlight: "Flagged character acting on unrevealed knowledge without witness.",
  },
  {
    ch: 13,
    title: "Seven Years Before the Flood (Flashback)",
    words: 2605,
    latency: 113.7,
    tokens: 101016,
    entities: { characters: 4, locations: 4, objects: 7, events: 7, claims: 15 },
    quarantined: 12,
    contradictions: 8,
    highlight: "Second deep flashback correctly positioned in pre-story timeline.",
  },
  {
    ch: 16,
    title: "The Descent of the Black Inquisitor",
    words: 2589,
    latency: 63.5,
    tokens: 96848,
    entities: { characters: 4, locations: 2, objects: 8, events: 5, claims: 11 },
    quarantined: 1,
    contradictions: 15,
    highlight: "Trait mutation detection: character eye-color mutation caught.",
  },
  {
    ch: 20,
    title: "The Rising of the Subterrane (Climax)",
    words: 2620,
    latency: 71.5,
    tokens: 108758,
    entities: { characters: 3, locations: 3, objects: 2, events: 0, claims: 9 },
    quarantined: 0,
    contradictions: 15,
    highlight: "Climactic resolution of 46 custody handoffs and 214 plot thread states.",
  },
];

export function BenchmarkExplorer() {
  const [selectedChIndex, setSelectedChIndex] = useState<number>(3); // Chapter 8 default

  const currentCh = CHAPTER_BENCHMARKS[selectedChIndex];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border-quiet">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-wine-crimson font-medium">
            Empirical Stress Audit
          </span>
          <h3 className="font-serif text-xl sm:text-2xl font-medium text-ink-parchment">
            The 20-Chapter Novel Stress Test
          </h3>
          <p className="text-xs text-ink-ash mt-0.5">
            Audited on <em>The Obsidian Archive of Aethelgard</em> (51,960 words) under non-linear temporal distortions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="thread" size="sm" dot>
            71 / 71 Tests Passing
          </Badge>
          <Badge variant="subtle" size="sm">
            Python 3.13 + Next.js 16
          </Badge>
        </div>
      </div>

      {/* Top 4 KPI Ledger Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Surface depth={2} border="subtle" rounded="xl" className="p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between text-ink-ash">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              Novel Corpus
            </span>
            <FileText className="w-3.5 h-3.5 text-wine-accent" />
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-medium text-ink-parchment">
            51,960
          </p>
          <p className="font-mono text-[10px] text-ink-ash">
            20 chapters · 0 text loss
          </p>
        </Surface>

        <Surface depth={2} border="subtle" rounded="xl" className="p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between text-ink-ash">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              Pipeline Wall Time
            </span>
            <Clock className="w-3.5 h-3.5 text-pine-moss" />
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-medium text-ink-parchment">
            794.28s
          </p>
          <p className="font-mono text-[10px] text-ink-ash">
            ~39.7s / chapter average
          </p>
        </Surface>

        <Surface depth={2} border="subtle" rounded="xl" className="p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between text-ink-ash">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              Prompt Cache Rate
            </span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-medium text-ink-parchment">
            91.08%
          </p>
          <p className="font-mono text-[10px] text-ink-ash">
            2.21M input / 216k output
          </p>
        </Surface>

        <Surface depth={2} border="subtle" rounded="xl" className="p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between text-ink-ash">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              Graph Yield
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-severity-knowledge" />
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-medium text-ink-parchment">
            400 Claims
          </p>
          <p className="font-mono text-[10px] text-ink-ash">
            46 custody handoffs tracked
          </p>
        </Surface>
      </div>

      {/* Interactive Per-Chapter Inspector */}
      <Surface depth={2} border="subtle" rounded="xl" className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              Step Through Benchmark Telemetry
            </span>
            <h4 className="font-serif text-lg text-ink-parchment">
              Audited Chapter Telemetry &amp; Graph Gate Decisions
            </h4>
          </div>

          <span className="font-mono text-xs text-ink-ash">
            Select a milestone chapter below:
          </span>
        </div>

        {/* Chapter Selection Bar */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-subtle border border-border-quiet overflow-x-auto">
          {CHAPTER_BENCHMARKS.map((item, idx) => {
            const isSelected = selectedChIndex === idx;
            return (
              <button
                key={item.ch}
                onClick={() => setSelectedChIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
                  isSelected
                    ? "bg-surface-elevated text-ink-parchment border border-border-subtle shadow-sm font-semibold"
                    : "text-ink-ash hover:text-ink-parchment hover:bg-surface-card"
                }`}
              >
                Ch. {item.ch}
              </button>
            );
          })}
        </div>

        {/* Selected Chapter Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 rounded-xl bg-surface-subtle border border-border-quiet">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-ink-faint">
                CHAPTER {currentCh.ch} OF 20
              </span>
              <span className="text-border-subtle">•</span>
              <span className="font-mono text-xs text-ink-ash">
                {currentCh.words.toLocaleString()} words
              </span>
            </div>

            <h5 className="font-serif text-xl font-medium text-ink-parchment">
              {currentCh.title}
            </h5>

            <p className="text-xs text-ink-bone leading-relaxed">
              {currentCh.highlight}
            </p>

            <div className="pt-3 border-t border-border-quiet/50 flex flex-wrap items-center gap-4 text-xs font-mono">
              <span className="text-ink-ash">
                Latency: <strong className="text-ink-parchment">{currentCh.latency}s</strong>
              </span>
              <span className="text-ink-ash">
                Tokens: <strong className="text-ink-parchment">{currentCh.tokens.toLocaleString()}</strong>
              </span>
              <span className="text-ink-ash">
                Quarantined Junk:{" "}
                <strong className={currentCh.quarantined > 0 ? "text-amber-400" : "text-emerald-400"}>
                  {currentCh.quarantined}
                </strong>
              </span>
            </div>
          </div>

          {/* Graph Entities Extracted Strip */}
          <div className="lg:col-span-5 p-4 rounded-xl bg-surface-card border border-border-quiet flex flex-col justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint block">
              Pre-Graph Extraction Yield
            </span>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="p-2 rounded bg-surface-subtle border border-border-quiet">
                <span className="font-mono text-[9px] uppercase text-ink-faint block">
                  Locations
                </span>
                <span className="font-serif text-lg font-medium text-ink-parchment">
                  {currentCh.entities.locations}
                </span>
              </div>
              <div className="p-2 rounded bg-surface-subtle border border-border-quiet">
                <span className="font-mono text-[9px] uppercase text-ink-faint block">
                  Objects
                </span>
                <span className="font-serif text-lg font-medium text-ink-parchment">
                  {currentCh.entities.objects}
                </span>
              </div>
              <div className="p-2 rounded bg-surface-subtle border border-border-quiet">
                <span className="font-mono text-[9px] uppercase text-ink-faint block">
                  Chronological Events
                </span>
                <span className="font-serif text-lg font-medium text-ink-parchment">
                  {currentCh.entities.events}
                </span>
              </div>
              <div className="p-2 rounded bg-surface-subtle border border-border-quiet">
                <span className="font-mono text-[9px] uppercase text-ink-faint block">
                  Verified Claims
                </span>
                <span className="font-serif text-lg font-medium text-severity-thread">
                  {currentCh.entities.claims}
                </span>
              </div>
            </div>

            <span className="mt-3 font-mono text-[10px] text-ink-ash text-right block">
              100% Deterministic Extraction
            </span>
          </div>
        </div>
      </Surface>
    </div>
  );
}
