"use client";

import React from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import {
  ArrowRight,
  Clock,
  Compass,
  GitBranch,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { ProductStudioSimulator } from "./ProductStudioSimulator";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

// ─── Real Questions from README that resonate with novelists ──────────────────
const NARRATIVE_PARADOXES = [
  {
    q: "Where was the brass compass left when Marcus fled the pier in Chapter 4?",
    engine: "Custody Engine",
    color: "text-red-400 border-red-500/20 bg-red-500/5",
  },
  {
    q: "Does Sarah know about the banquet poisoning, or is she speaking with knowledge she hasn't acquired yet?",
    engine: "Epistemic Matrix",
    color: "text-sky-400 border-sky-500/20 bg-sky-500/5",
  },
  {
    q: "Did this flashback occur before or after the Treaty of Ashford was signed?",
    engine: "Dual Chronology",
    color: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  },
  {
    q: "Did Sarah's eyes turn from steel-gray to amber between Chapter 1 and Chapter 8?",
    engine: "Entity Memory",
    color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
  },
  {
    q: "Which of the 14 subplots introduced in Act I were abandoned without resolution?",
    engine: "Plot Threads",
    color: "text-purple-400 border-purple-500/20 bg-purple-500/5",
  },
];

// ─── The 5 Intelligence Modules from README ────────────────────────────────────
const INTELLIGENCE_MODULES = [
  {
    id: "01",
    icon: Clock,
    title: "Dual Chronology & Flashback Engine",
    desc: "Decouples narrative reading sequence from in-universe calendar time. Pin flashbacks and catch impossible travel velocities before your readers do.",
  },
  {
    id: "02",
    icon: Compass,
    title: "Epistemic Knowledge Matrix",
    desc: "Tracks exactly who knows what secret, since which chapter, and how they learned it—whether witnessed firsthand, told by an ally, or overheard.",
  },
  {
    id: "03",
    icon: ShieldCheck,
    title: "Object Custody & Paradox Prevention",
    desc: "Traces the unbroken physical trajectory of relics, letters, and weapons. If a dagger is locked in a vault, no character can draw it from a coat pocket.",
  },
  {
    id: "04",
    icon: Sparkles,
    title: "Intent Reasoner & World Rules",
    desc: "Distinguishes between genuine errors and deliberate craft. Flags magical transformation, disguise, and unreliable narration without false alarms.",
  },
  {
    id: "05",
    icon: GitBranch,
    title: "Cross-Chapter Plot Thread Tracker",
    desc: "Monitors subplot lifecycles across chapters (Introduced → Escalating → Resolved → Abandoned), ensuring no narrative promise is forgotten.",
  },
];

export function UnauthenticatedLandingView() {
  const { scrollYProgress } = useScroll();
  const wireWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div className="min-h-screen bg-surface-void text-ink-parchment selection:bg-wine-accent/30 selection:text-ink-parchment font-sans">
      {/* Scroll indicator wire */}
      <motion.div
        style={{ width: wireWidth }}
        className="fixed top-0 left-0 h-[2px] bg-wine-crimson z-50 pointer-events-none"
      />

      {/* ===================================================================
          01. NAV MASTHEAD
          =================================================================== */}
      <header className="sticky top-0 z-40 w-full border-b border-border-quiet bg-surface-void/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 h-16 flex items-center justify-between">
          {/* Brand mark */}
          <Link href="/" className="flex items-center gap-3 select-none group">
            <span className="font-serif text-xl font-medium tracking-[0.2em] text-ink-parchment group-hover:text-white transition-colors">
              ✦ NERRA ✦
            </span>
            <span className="hidden md:inline-block h-3 w-px bg-border-quiet" />
            <span className="hidden md:flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Story Operating System
            </span>
          </Link>

          {/* Quick jump anchors */}
          <nav className="hidden lg:flex items-center gap-7 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-ash">
            <a href="#simulator" className="hover:text-ink-parchment transition-colors text-wine-accent font-semibold">
              Interactive Studio
            </a>
            <a href="#philosophy" className="hover:text-ink-parchment transition-colors">
              The Problem
            </a>
            <a href="#engines" className="hover:text-ink-parchment transition-colors">
              5 Engines
            </a>
            <a href="#benchmark" className="hover:text-ink-parchment transition-colors">
              Benchmark
            </a>
          </nav>

          {/* Action controls */}
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <Link
              href="/login"
              className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.18em] text-ink-ash hover:text-ink-parchment transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-full bg-wine-accent hover:bg-wine-crimson text-white px-5 py-2 text-xs font-medium uppercase tracking-wider transition-all duration-200 shadow-[0_2px_14px_rgba(140,34,66,0.35)] hover:shadow-[0_4px_22px_rgba(140,34,66,0.5)]"
            >
              <span>Start Free</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ===================================================================
          02. HERO SECTION — THE PHILOSOPHY & IMMEDIATE INTERACTIVE STUDIO
          =================================================================== */}
      <section className="relative px-5 sm:px-8 lg:px-10 pt-16 sm:pt-20 pb-12 max-w-7xl mx-auto">
        <div className="max-w-3xl space-y-6">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-wine-accent/30 bg-wine-accent/10 px-3.5 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-wine-crimson">
            <span>The Intelligent Story Operating System</span>
          </div>

          {/* Core Philosophy Headline directly from README */}
          <h1 className="font-serif text-[clamp(2.8rem,5.8vw,4.5rem)] font-light leading-[1.06] tracking-[-0.025em] text-ink-parchment">
            Your story has a memory. <br />
            <span className="italic font-normal text-wine-crimson">NERRA makes it intelligent.</span>
          </h1>

          {/* Value Proposition */}
          <p className="font-serif text-lg sm:text-xl text-ink-bone leading-relaxed max-w-2xl">
            As your novel scales past 30,000 words, human memory falters under exponential plot entanglements.
            NERRA transforms your draft into an interconnected, graph-backed intelligence layer—verifying
            character knowledge states, physical object custody, and dual timelines as you write.
          </p>

          {/* Action pills */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-wine-accent hover:bg-wine-crimson text-white px-7 py-3 text-sm font-medium transition-all duration-200 shadow-[0_2px_16px_rgba(140,34,66,0.4)] hover:shadow-[0_4px_24px_rgba(140,34,66,0.55)]"
            >
              <span>Begin Your Story</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#simulator"
              className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-subtle/50 hover:bg-surface-elevated text-ink-bone hover:text-ink-parchment px-6 py-3 text-sm font-medium transition-colors"
            >
              <span>Explore Interactive Studio ↓</span>
            </a>
          </div>

          {/* Sovereign reassurance */}
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint pt-1">
            Zero AI training on your prose &nbsp;·&nbsp; Pure deterministic graph verification &nbsp;·&nbsp; All drafts sovereign
          </p>
        </div>

        {/* Narrative Paradox Carousel / Chips: The authentic questions authors face */}
        <div className="mt-12 pt-8 border-t border-border-quiet">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-ink-faint mb-4">
            The questions that haunt complex novelists at scale:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {NARRATIVE_PARADOXES.slice(0, 3).map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-border-quiet bg-surface-subtle/30 backdrop-blur-xs flex flex-col justify-between gap-3"
              >
                <p className="font-serif text-sm italic text-ink-bone leading-snug">
                  &ldquo;{item.q}&rdquo;
                </p>
                <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider">
                  <span className="text-ink-faint">Guarded by:</span>
                  <span className={`px-2 py-0.5 rounded border font-medium ${item.color}`}>
                    {item.engine}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===================================================================
            THE HERO INTERACTIVE STUDIO SIMULATOR
            Embedded directly inside the Hero fold as requested
            =================================================================== */}
        <div id="simulator" className="mt-14 scroll-mt-20">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-border-quiet pb-3">
            <div>
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.24em] text-wine-accent">
                <BookOpen className="h-3 w-3" />
                <span>The Author&apos;s Workbench · Full Interactive Simulation</span>
              </div>
              <h2 className="mt-1 font-serif text-2xl font-light text-ink-parchment">
                Live Manuscript Studio: <em>The Brass Alchemist of Prague</em>
              </h2>
            </div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
              Interact with the Editor, Reader, Graph, Timeline &amp; Knowledge Matrix
            </p>
          </div>

          {/* Master Product Studio Simulator */}
          <div className="w-full">
            <ProductStudioSimulator />
          </div>
        </div>
      </section>

      {/* ===================================================================
          03. THE PHILOSOPHY: NARRATIVE COMPLEXITY COLLAPSE
          =================================================================== */}
      <section id="philosophy" className="border-t border-border-quiet bg-surface-subtle/10 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="max-w-3xl space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-wine-crimson font-medium">
              The Philosophy · Why Conventional Tools Break
            </p>
            <h2 className="font-serif text-[clamp(2.2rem,4.5vw,3.6rem)] font-light leading-[1.1] tracking-tight text-ink-parchment">
              Flat text editors cannot remember <br />
              <span className="italic text-ink-ash">what happened forty chapters ago.</span>
            </h2>
            <p className="font-serif text-base sm:text-lg text-ink-bone leading-relaxed pt-2">
              Traditional writing tools—Scrivener, Notion, Word—treat your novel as dumb, flat text strings.
              They force you to maintain manual side wikis that inevitably fall out of sync with your evolving manuscript.
              When an apprentice steals a key in Act I, you shouldn&apos;t need an external spreadsheet to ensure he doesn&apos;t
              leave it on a desk in Act III.
            </p>
          </div>

          {/* Comparison Ledger */}
          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-border-quiet pt-10">
            <div className="space-y-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                Traditional Writing Tools (Scrivener, Word, Notion)
              </span>
              <ul className="space-y-3 font-serif text-sm text-ink-ash leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-mono">✕</span>
                  <span><strong>Flat text silos:</strong> No awareness of entity identities, location distances, or chronological order.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-mono">✕</span>
                  <span><strong>Manual wikis:</strong> Require tedious manual updates after every revision, quickly becoming obsolete.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-mono">✕</span>
                  <span><strong>Silent plot holes:</strong> Contradictions and severed plot threads remain undetected until beta readers find them.</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4 border-l border-border-quiet md:pl-8">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-medium">
                The NERRA Story Operating System
              </span>
              <ul className="space-y-3 font-serif text-sm text-ink-parchment leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Living Graph Layer:</strong> Extracts characters, custody chains, and knowledge states straight from your prose.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Live Prose Squiggles:</strong> Real-time editor squiggles flag custody paradoxes and epistemic leaks as you type.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Intent-Aware Craft:</strong> Evaluates apparent errors against unreliable narrators, disguises, and world rules.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          04. THE FIVE STORY INTELLIGENCE ENGINES
          =================================================================== */}
      <section id="engines" className="border-t border-border-quiet py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="max-w-2xl mb-14">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-wine-crimson font-medium">
              Core Intelligence Modules
            </span>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-light text-ink-parchment">
              Five engines designed around the way novelists actually write.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {INTELLIGENCE_MODULES.map((eng) => (
              <div
                key={eng.id}
                className="space-y-3 border-t border-border-quiet pt-6"
              >
                <div className="flex items-center justify-between">
                  <eng.icon className="h-5 w-5 text-wine-accent" strokeWidth={1.5} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                    Module {eng.id}
                  </span>
                </div>
                <h3 className="font-serif text-lg font-medium text-ink-parchment">
                  {eng.title}
                </h3>
                <p className="font-sans text-xs text-ink-ash leading-relaxed">
                  {eng.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================
          05. EMPIRICAL BENCHMARK (REAL DATA FROM 20-CH NOVEL STRESS TEST)
          =================================================================== */}
      <section id="benchmark" className="border-t border-border-quiet bg-surface-subtle/15 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 mb-10 pb-4 border-b border-border-quiet">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-ink-faint">
                Empirical Audit · Full-Length Fantasy Manuscript
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-light text-ink-parchment mt-1">
                Stress-tested on <em>The Obsidian Archive of Aethelgard</em>
              </h2>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-ash">
              51,960 Words · 20 Chapters · Zero State Corruption
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            <div className="space-y-1">
              <span className="font-serif text-2xl sm:text-3xl font-light text-ink-parchment tabular-nums">51,960</span>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">Novel Word Count</p>
            </div>
            <div className="space-y-1">
              <span className="font-serif text-2xl sm:text-3xl font-light text-ink-parchment tabular-nums">728</span>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">Resolved Entities</p>
            </div>
            <div className="space-y-1">
              <span className="font-serif text-2xl sm:text-3xl font-light text-ink-parchment tabular-nums">46</span>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">Custody Transfers</p>
            </div>
            <div className="space-y-1">
              <span className="font-serif text-2xl sm:text-3xl font-light text-ink-parchment tabular-nums">261</span>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">Plot Thread States</p>
            </div>
            <div className="space-y-1">
              <span className="font-serif text-2xl sm:text-3xl font-light text-ink-parchment tabular-nums">94</span>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">Issues Triaged</p>
            </div>
            <div className="space-y-1">
              <span className="font-serif text-2xl sm:text-3xl font-light text-emerald-400 tabular-nums">100%</span>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">Prose Preserved</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          06. ARCHITECTURAL COLOPHON & FINAL INVITATION
          =================================================================== */}
      <footer className="border-t border-border-quiet bg-surface-void py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="max-w-3xl space-y-6">
            <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-wine-accent">
              ✦ ENTER THE STUDY ✦
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1.08] tracking-tight text-ink-parchment">
              Write your story. <br />
              <span className="italic text-ink-ash">Let NERRA remember everything.</span>
            </h2>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-wine-accent hover:bg-wine-crimson text-white px-7 py-3 text-sm font-medium transition-all duration-200 shadow-[0_2px_14px_rgba(140,34,66,0.35)]"
              >
                <span>Create Author Account</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="font-mono text-xs text-ink-ash hover:text-ink-parchment transition-colors uppercase tracking-wider pl-2"
              >
                Sign In to Study &rarr;
              </Link>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-border-quiet flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
            <p>
              NERRA &copy; {new Date().getFullYear()} &nbsp;·&nbsp; Designed for novelists who care about their fictional worlds.
            </p>
            <p>
              All Drafts Sovereign &nbsp;·&nbsp; Zero Prose Training
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
