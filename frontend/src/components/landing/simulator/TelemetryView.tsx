"use client";

import React from "react";
import { Cpu, Database, Zap, Activity } from "lucide-react";

export function TelemetryView() {
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-surface-void select-none px-3 py-3 sm:px-6 sm:py-4 text-ink-parchment">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border-quiet/80 pb-2.5">
        <div>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-wine-accent">
            Telemetry
          </span>
          <h2 className="font-serif text-lg sm:text-xl font-medium tracking-tight text-ink-parchment mt-0.5">
            Story Engine Telemetry
          </h2>
          <p className="mt-0.5 font-serif text-[11px] italic text-ink-bone">
            Model routing, token cache rates, and deterministic graph validation benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Subsystems Nominal</span>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-2.5 rounded-lg bg-surface-card/40 border border-border-quiet/80">
          <div className="flex items-center justify-between text-ink-faint font-mono text-[8px] uppercase">
            <span>Primary Model</span>
            <Cpu className="w-3 h-3 text-wine-accent" />
          </div>
          <p className="font-serif text-sm font-semibold text-ink-parchment mt-1">
            Gemini 2.5 Pro / Sonnet
          </p>
          <p className="font-mono text-[8px] text-ink-ash mt-0.5">
            Parallel multi-pass extraction
          </p>
        </div>

        <div className="p-2.5 rounded-lg bg-surface-card/40 border border-border-quiet/80">
          <div className="flex items-center justify-between text-ink-faint font-mono text-[8px] uppercase">
            <span>Vector Store</span>
            <Database className="w-3 h-3 text-sky-400" />
          </div>
          <p className="font-serif text-sm font-semibold text-ink-parchment mt-1">
            Postgres + pgvector
          </p>
          <p className="font-mono text-[8px] text-ink-ash mt-0.5">
            1,536-dim embeddings
          </p>
        </div>

        <div className="p-2.5 rounded-lg bg-surface-card/40 border border-border-quiet/80">
          <div className="flex items-center justify-between text-ink-faint font-mono text-[8px] uppercase">
            <span>Cache Rate</span>
            <Zap className="w-3 h-3 text-amber-400" />
          </div>
          <p className="font-serif text-sm font-semibold text-amber-300 mt-1">
            91.08% Hit Rate
          </p>
          <p className="font-mono text-[8px] text-ink-ash mt-0.5">
            Sub-millisecond retrieval
          </p>
        </div>
      </div>

      {/* 20-Chapter Novel Stress Test Benchmark */}
      <div className="mt-3 rounded-lg border border-border-quiet/80 bg-surface-card/25 p-3">
        <span className="font-mono text-[8px] uppercase tracking-wider text-wine-accent block mb-1">
          20-Chapter Benchmark: The Obsidian Archive of Aethelgard
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[9px]">
          <div>
            <span className="text-[7.5px] uppercase text-ink-faint block">Total Corpus</span>
            <span className="font-serif text-xs text-ink-parchment font-semibold">51,960 words</span>
          </div>
          <div>
            <span className="text-[7.5px] uppercase text-ink-faint block">Execution Time</span>
            <span className="font-serif text-xs text-ink-parchment font-semibold">794.28 sec</span>
          </div>
          <div>
            <span className="text-[7.5px] uppercase text-ink-faint block">Cost Efficiency</span>
            <span className="font-serif text-xs text-emerald-400 font-semibold">$0.34 total</span>
          </div>
          <div>
            <span className="text-[7.5px] uppercase text-ink-faint block">Extraction Integrity</span>
            <span className="font-serif text-xs text-ink-parchment font-semibold">100% verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
