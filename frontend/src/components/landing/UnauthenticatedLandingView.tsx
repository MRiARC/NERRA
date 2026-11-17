"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import {
  ArrowRight,
  ArrowDown,
  Layers,
  Compass,
  Clock,
  Network,
  Activity,
  Check,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Feather,
} from "lucide-react";
import { ProductStudioSimulator } from "./ProductStudioSimulator";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { cn } from "@/lib/utils";

const SPRING_TRANSITION = { duration: 0.7, ease: [0.16, 1, 0.3, 1] } as const;

export function UnauthenticatedLandingView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const scrollIndicatorWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const scrollToAtelier = () => {
    document.getElementById("atelier")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-surface-void text-ink-parchment selection:bg-wine-accent selection:text-ink-parchment"
    >
      {/* Top Single-Pixel Scroll Progress Wire (Solid Wine) */}
      <motion.div
        style={{ width: scrollIndicatorWidth }}
        className="fixed top-0 left-0 h-[2px] bg-wine-crimson z-50 pointer-events-none"
      />

      {/* ===================================================================
          01. EDITORIAL MASTHEAD & STATUS BEACON
          =================================================================== */}
      <header className="sticky top-0 z-40 w-full border-b border-border-quiet bg-surface-void/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 h-14 sm:h-16 flex items-center justify-between">
          {/* Brand Mark: Pure solid typography with live status beacon */}
          <div className="flex items-center gap-3 select-none">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-serif text-lg sm:text-xl font-medium tracking-[0.22em] text-ink-parchment group-hover:text-white transition-colors">
                NERRA
              </span>
            </Link>

            <span aria-hidden className="hidden sm:inline-block h-3.5 w-px bg-border-quiet" />

            <div className="hidden sm:flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Scribe Engine v2.4</span>
            </div>
          </div>

          {/* Navigation Anchors (Broadsheet Style) */}
          <nav className="hidden md:flex items-center gap-6 font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-ash">
            <a href="#thesis" className="hover:text-ink-parchment transition-colors">
              Thesis
            </a>
            <span className="text-border-quiet">·</span>
            <a href="#engines" className="hover:text-ink-parchment transition-colors">
              Four Engines
            </a>
            <span className="text-border-quiet">·</span>
            <a href="#cases" className="hover:text-ink-parchment transition-colors">
              Case Records
            </a>
            <span className="text-border-quiet">·</span>
            <a href="#principles" className="hover:text-ink-parchment transition-colors">
              Manifesto
            </a>
            <span className="text-border-quiet">·</span>
            <a href="#atelier" className="text-wine-accent hover:text-wine-crimson transition-colors font-semibold">
              Live Atelier
            </a>
          </nav>

          {/* Right Controls: Site Theme Switcher + Direct Sign In + Enter Studio */}
          <div className="flex items-center gap-3 sm:gap-4 font-mono text-[10px]">
            <ThemeSwitcher />

            <Link
              href="/login"
              className="text-ink-ash hover:text-ink-parchment uppercase tracking-wider transition-colors hidden sm:inline"
            >
              Sign In
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 bg-wine-accent hover:bg-wine-crimson text-white px-3.5 py-1.5 rounded text-[10px] uppercase tracking-[0.16em] font-medium transition-colors shadow-xs"
            >
              <span>Enter Studio</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* ===================================================================
          02. THE BROADSHEET MONUMENT (HERO)
          Zero boxes. Dramatic typographic scale. Archival marginalia.
          =================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-12 sm:pt-20 lg:pt-24 pb-16 sm:pb-24">
        {/* Folio Register Hairline */}
        <div className="flex items-center justify-between pb-4 border-b border-border-quiet font-mono text-[9px] uppercase tracking-[0.22em] text-ink-faint">
          <div className="flex items-center gap-2">
            <span className="text-wine-accent font-semibold">FOLIO I</span>
            <span>/</span>
            <span>THE FORENSIC CONTINUITY THESIS</span>
          </div>
          <span className="hidden sm:inline">DETERMINISTIC SPATIOTEMPORAL PROOF</span>
        </div>

        {/* Monumental Newsreader Display Headline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING_TRANSITION}
          className="mt-8 sm:mt-12"
        >
          <h1 className="font-serif text-[clamp(2.5rem,7vw,5.5rem)] font-normal leading-[1.02] tracking-[-0.03em] text-ink-parchment max-w-5xl">
            A character who dies in Chapter Three cannot unlock a door in Chapter Twelve.
          </h1>
        </motion.div>

        {/* Asymmetrical 3-Column Editorial Grid (No Boxes) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...SPRING_TRANSITION, delay: 0.15 }}
          className="mt-12 sm:mt-16 pt-8 border-t border-border-quiet grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 text-ink-bone"
        >
          {/* Main Exposition (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            <p className="font-serif text-lg sm:text-2xl font-light italic leading-relaxed text-ink-parchment">
              Human memory breaks at 60,000 words. Narrative canon breaks immediately after.
            </p>
            <p className="font-sans text-sm sm:text-base leading-relaxed text-ink-ash max-w-2xl">
              Traditional copyeditors check punctuation and rhythm. Nerra proofs physical reality.
              We treat your manuscript as an interconnected spacetime continuum—verifying object
              custody chains, epistemic secrecy states, and travel velocities with deterministic certainty.
            </p>

            {/* Action Row */}
            <div className="pt-4 flex flex-wrap items-center gap-6 font-mono text-[11px] uppercase tracking-[0.16em]">
              <button
                type="button"
                onClick={scrollToAtelier}
                className="group inline-flex items-center gap-2 text-wine-accent hover:text-wine-crimson transition-colors cursor-pointer"
              >
                <span>Explore the Working Atelier</span>
                <ArrowDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
              </button>

              <span aria-hidden className="text-border-quiet">·</span>

              <Link
                href="/register"
                className="text-ink-parchment hover:text-white underline decoration-wine-accent/60 underline-offset-4 transition-colors"
              >
                Create Author Study &rarr;
              </Link>
            </div>
          </div>

          {/* Marginalia Coordinates Column (5 Cols) */}
          <div className="lg:col-span-5 border-l-0 lg:border-l lg:border-border-quiet lg:pl-10 space-y-6 font-mono text-[10px]">
            <span className="block text-[8.5px] uppercase tracking-[0.24em] text-ink-faint">
              Canonical Invariants Enforced
            </span>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-wine-crimson font-semibold tracking-wider">§ 01 / CUSTODY INVARIANT</span>
                <p className="font-sans text-xs text-ink-ash leading-normal">
                  A physical relic cannot exist in two places at once without an explicit recorded handoff or theft.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-wine-crimson font-semibold tracking-wider">§ 02 / EPISTEMIC INVARIANT</span>
                <p className="font-sans text-xs text-ink-ash leading-normal">
                  A character cannot act on a secret they have never witnessed, overheard, or been confessed to.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-wine-crimson font-semibold tracking-wider">§ 03 / SPATIOTEMPORAL INVARIANT</span>
                <p className="font-sans text-xs text-ink-ash leading-normal">
                  Characters cannot traverse 240 leagues across rough terrain faster than physical velocity permits.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===================================================================
          03. THE EDITORIAL THESIS (TWO-COLUMN BROADSIDE)
          Zero boxes. Ruled borders. Broadsheet essay format.
          =================================================================== */}
      <section id="thesis" className="border-t border-border-quiet bg-surface-subtle/10 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          {/* Header indicator */}
          <div className="pb-3 border-b border-border-quiet flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-ink-faint">
            <span>SEC. 02 / THE ESSAY</span>
            <span>WHY GENERATIVE LLMS FAIL NOVELISTS</span>
          </div>

          <div className="mt-10 sm:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            {/* Left Headline Column */}
            <div className="lg:col-span-5">
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal leading-[1.08] tracking-tight text-ink-parchment">
                Traditional copyeditors proofread prose. <br />
                <span className="italic text-wine-accent">Nerra proofs reality.</span>
              </h2>

              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                150,000 words · 40 characters · 18 months of drafting
              </p>
            </div>

            {/* Right Prose Column */}
            <div className="lg:col-span-7 space-y-6 font-serif text-base sm:text-lg leading-[1.8] text-ink-bone">
              <p className="first-letter:float-left first-letter:mr-3 first-letter:font-serif first-letter:text-4xl first-letter:leading-none first-letter:text-wine-accent">
                A novel is not an isolated stack of chapters; it is a closed physical world.
                When you draft over eighteen months, subtle drift silently corrupts your story.
                A poison vial placed inside a desk drawer in London is suddenly administered
                in Edinburgh without a journey. An alibi relies on a three-hour train journey
                that historically took twelve hours in 1888. A magistrate accuses a nobleman using
                details known strictly to the conspirators.
              </p>

              <p className="text-ink-ash text-sm sm:text-base leading-relaxed font-sans">
                Generative AI chatbots are fundamentally unsuited for this work. They hallucinate quotes,
                lose context after 10,000 words, and offer generic stylistic clichés. Nerra takes the opposite
                path: sovereign deterministic graph algebra and first-order temporal logic.
                Every finding points to exact line coordinates, with zero made-up rules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          04. THE FOUR FORENSIC ENGINES (OPEN LEDGER · NO BOXES)
          4-Column Ruled Structural Ledger dividing with hairlines.
          =================================================================== */}
      <section id="engines" className="border-t border-border-quiet py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          {/* Header */}
          <div className="pb-3 border-b border-border-quiet flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-ink-faint">
            <span>SEC. 03 / THE CONTINUITY LEDGER</span>
            <span>FOUR DETERMINISTIC VERIFICATION ENGINES</span>
          </div>

          <div className="mt-8 mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-ink-parchment">
              Mathematical canon security across every draft leaf.
            </h2>
          </div>

          {/* 4-Column Ruled Ledger (Zero Boxes) */}
          <div className="border-y border-border-quiet grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border-quiet">
            {/* Col 1 */}
            <div className="py-8 md:pr-6 lg:pr-8 space-y-3">
              <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-wine-accent">
                <span>01 / CUSTODY</span>
                <Layers className="h-3.5 w-3.5 text-ink-faint" />
              </div>
              <h3 className="font-serif text-lg font-medium text-ink-parchment">
                Object Trajectory Worldlines
              </h3>
              <p className="font-sans text-xs text-ink-ash leading-relaxed">
                Every dagger, letter, coin, and carriage follows an unbroken physical path through time.
                If Vault #409 is sealed, a relic cannot be drawn from an inner coat pocket without a theft record.
              </p>
              <span className="block pt-2 font-mono text-[8px] uppercase tracking-wider text-ink-faint">
                Canon Graph · Entity Trajectories
              </span>
            </div>

            {/* Col 2 */}
            <div className="py-8 md:px-6 lg:px-8 space-y-3">
              <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-wine-accent">
                <span>02 / EPISTEMICS</span>
                <Compass className="h-3.5 w-3.5 text-ink-faint" />
              </div>
              <h3 className="font-serif text-lg font-medium text-ink-parchment">
                &ldquo;Who Knows What&rdquo; Matrix
              </h3>
              <p className="font-sans text-xs text-ink-ash leading-relaxed">
                A 2D truth-versus-character grid with chapter dial scrubbing. Distinguishes firsthand
                witnesses from rumors and confessions, halting characters from acting on secrets they never heard.
              </p>
              <span className="block pt-2 font-mono text-[8px] uppercase tracking-wider text-ink-faint">
                Epistemic Grid · Temporal Dial
              </span>
            </div>

            {/* Col 3 */}
            <div className="py-8 md:px-6 lg:px-8 space-y-3">
              <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-wine-accent">
                <span>03 / CHRONOLOGY</span>
                <Clock className="h-3.5 w-3.5 text-ink-faint" />
              </div>
              <h3 className="font-serif text-lg font-medium text-ink-parchment">
                Dual Chronology Engine
              </h3>
              <p className="font-sans text-xs text-ink-ash leading-relaxed">
                Runs two parallel clocks: in-book narrative reading sequence versus in-universe calendar time.
                Automatically detects spatiotemporal collisions where travel exceeds physical road velocity.
              </p>
              <span className="block pt-2 font-mono text-[8px] uppercase tracking-wider text-ink-faint">
                Two-Clock Sync · Spatiotemporal Bounds
              </span>
            </div>

            {/* Col 4 */}
            <div className="py-8 md:pl-6 lg:pl-8 space-y-3">
              <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-wine-accent">
                <span>04 / LOGIC</span>
                <ShieldCheck className="h-3.5 w-3.5 text-ink-faint" />
              </div>
              <h3 className="font-serif text-lg font-medium text-ink-parchment">
                Deterministic Ground Truth
              </h3>
              <p className="font-sans text-xs text-ink-ash leading-relaxed">
                First-order temporal logic and graph theory replace fuzzy LLM advice. Every contradiction
                cites exact chapter and paragraph coordinates with zero hallucinated rules.
              </p>
              <span className="block pt-2 font-mono text-[8px] uppercase tracking-wider text-ink-faint">
                Formal Verification · Paragraph Citations
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          05. THE CASE RECORDS (LITERARY AUTOPSY)
          Full-width ruled broadsheet sections. Side-by-side citations.
          =================================================================== */}
      <section id="cases" className="border-t border-border-quiet bg-surface-subtle/10 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          {/* Header */}
          <div className="pb-3 border-b border-border-quiet flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-ink-faint">
            <span>SEC. 04 / FORENSIC CASE RECORDS</span>
            <span>HISTORICAL MANUSCRIPT AUTOPSIES</span>
          </div>

          <div className="mt-8 mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-ink-parchment">
              Even literary titans slipped in the fog of 100,000 words.
            </h2>
            <p className="mt-2 font-serif text-sm italic text-ink-ash">
              How Nerra&apos;s deterministic canon guard would have halted classic published errors on draft day.
            </p>
          </div>

          {/* Three Full-Width Ruled Case Records (No chunky card boxes) */}
          <div className="divide-y divide-border-quiet border-y border-border-quiet">
            {/* Record 1 */}
            <div className="py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-baseline">
              <div className="lg:col-span-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-wine-accent">
                  CASE I · ARTHUR CONAN DOYLE
                </span>
                <h3 className="font-serif text-base font-medium text-ink-parchment mt-1">
                  The Migrating Jezail Bullet
                </h3>
                <p className="font-mono text-[9px] text-ink-faint mt-0.5">
                  Sherlock Holmes Canon · 1887 vs 1890
                </p>
              </div>

              <div className="lg:col-span-6 space-y-2.5 font-serif text-xs leading-relaxed text-ink-bone">
                <div className="border-l border-border-quiet pl-3">
                  <span className="font-mono text-[8px] uppercase tracking-wider text-ink-faint block pb-0.5">
                    A Study in Scarlet (Ch. 1)
                  </span>
                  &ldquo;I was struck on the shoulder by a Jezail bullet, which shattered the bone and grazed the subclavian artery.&rdquo;
                </div>
                <div className="border-l border-wine-crimson/50 pl-3 text-ink-parchment">
                  <span className="font-mono text-[8px] uppercase tracking-wider text-wine-crimson block pb-0.5">
                    The Sign of the Four (Ch. 1)
                  </span>
                  &ldquo;I sat nursing my wounded leg; a Jezail bullet had passed through it, leaving me with an aching limb.&rdquo;
                </div>
              </div>

              <div className="lg:col-span-3 font-mono text-[9px] space-y-1">
                <span className="text-severity-contradiction uppercase font-semibold block">
                  ● ANATOMY CONTRADICTION
                </span>
                <p className="font-sans text-[11px] text-ink-ash leading-snug">
                  Zero anatomical transfer records between shoulder joint and tibia. Scribe surfaces 1 finding in Dr. Watson&apos;s physical dossier.
                </p>
              </div>
            </div>

            {/* Record 2 */}
            <div className="py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-baseline">
              <div className="lg:col-span-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-wine-accent">
                  CASE II · ALEXANDRE DUMAS
                </span>
                <h3 className="font-serif text-base font-medium text-ink-parchment mt-1">
                  The Phantom Courier
                </h3>
                <p className="font-mono text-[9px] text-ink-faint mt-0.5">
                  The Count of Monte Cristo · 1844
                </p>
              </div>

              <div className="lg:col-span-6 space-y-2.5 font-serif text-xs leading-relaxed text-ink-bone">
                <div className="border-l border-border-quiet pl-3">
                  <span className="font-mono text-[8px] uppercase tracking-wider text-ink-faint block pb-0.5">
                    Volume I (Ch. 14)
                  </span>
                  &ldquo;The courier departed the barriers of Paris at midnight, galloping into the driving November rain.&rdquo;
                </div>
                <div className="border-l border-wine-crimson/50 pl-3 text-ink-parchment">
                  <span className="font-mono text-[8px] uppercase tracking-wider text-wine-crimson block pb-0.5">
                    Volume I (Ch. 15)
                  </span>
                  &ldquo;Before the dawn bells had finished ringing across Marseille harbor, the letter was delivered into Villefort&apos;s hands.&rdquo;
                </div>
              </div>

              <div className="lg:col-span-3 font-mono text-[9px] space-y-1">
                <span className="text-severity-warning uppercase font-semibold block">
                  ▲ SPATIOTEMPORAL COLLISION
                </span>
                <p className="font-sans text-[11px] text-ink-ash leading-snug">
                  480 miles in 5 hours: 96 mph overland horseback velocity violation. Scribe prompts chapter date recalibration.
                </p>
              </div>
            </div>

            {/* Record 3 */}
            <div className="py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-baseline">
              <div className="lg:col-span-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-wine-accent">
                  CASE III · NERRA DEMO STUDIO
                </span>
                <h3 className="font-serif text-base font-medium text-ink-parchment mt-1">
                  The Clockwork Heart
                </h3>
                <p className="font-mono text-[9px] text-ink-faint mt-0.5">
                  The Brass Alchemist of Prague · Draft Leaf
                </p>
              </div>

              <div className="lg:col-span-6 space-y-2.5 font-serif text-xs leading-relaxed text-ink-bone">
                <div className="border-l border-border-quiet pl-3">
                  <span className="font-mono text-[8px] uppercase tracking-wider text-ink-faint block pb-0.5">
                    Chapter 03 · Citadel Vault
                  </span>
                  &ldquo;Lysander logged the obsidian compass into vault register #409, sealing the iron latch.&rdquo;
                </div>
                <div className="border-l border-wine-crimson/50 pl-3 text-ink-parchment">
                  <span className="font-mono text-[8px] uppercase tracking-wider text-wine-crimson block pb-0.5">
                    Chapter 04 · Current Draft
                  </span>
                  &ldquo;Marcus slipped his fingers into his inner coat pocket and withdrew the obsidian compass...&rdquo;
                </div>
              </div>

              <div className="lg:col-span-3 font-mono text-[9px] space-y-1">
                <span className="text-severity-contradiction uppercase font-semibold block">
                  ● BROKEN CUSTODY CHAIN
                </span>
                <p className="font-sans text-[11px] text-ink-ash leading-snug">
                  Relic moved without transfer. 1-click reconcile or mark as intentional syndicate counterfeit twist in the live editor below.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          06. THE SOVEREIGN PRINCIPLES (MANIFESTO LEDGER)
          Open 3-column broadside with single-pixel hairlines.
          =================================================================== */}
      <section id="principles" className="border-t border-border-quiet py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          {/* Header */}
          <div className="pb-3 border-b border-border-quiet flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-ink-faint">
            <span>SEC. 05 / SOVEREIGN PRINCIPLES</span>
            <span>AUTHOR COGNITIVE CALM &amp; DRAFT PRIVACY</span>
          </div>

          <div className="mt-8 mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-ink-parchment">
              Built for authors who refuse distraction.
            </h2>
          </div>

          <div className="border-t border-border-quiet grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border-quiet">
            <div className="py-8 md:pr-8 space-y-2.5">
              <span className="font-mono text-[9px] uppercase tracking-wider text-wine-accent">
                I. SOVEREIGN PRIVACY
              </span>
              <h3 className="font-serif text-lg font-medium text-ink-parchment">
                Zero Training on Your Prose
              </h3>
              <p className="font-sans text-xs text-ink-ash leading-relaxed">
                Your manuscripts are your private intellectual property. Nerra processes your drafts
                in isolated studio instances; zero sentences are ever stored, mined, or used to train public models.
              </p>
            </div>

            <div className="py-8 md:px-8 space-y-2.5">
              <span className="font-mono text-[9px] uppercase tracking-wider text-wine-accent">
                II. COGNITIVE CALM
              </span>
              <h3 className="font-serif text-lg font-medium text-ink-parchment">
                No Chatbots. No Clutter.
              </h3>
              <p className="font-sans text-xs text-ink-ash leading-relaxed">
                We believe conversational chatbots destroy literary flow. Nerra stays completely silent
                until a factual contradiction or broken timeline is detected, presenting proof in the margins.
              </p>
            </div>

            <div className="py-8 md:pl-8 space-y-2.5">
              <span className="font-mono text-[9px] uppercase tracking-wider text-wine-accent">
                III. DETERMINISTIC GROUND TRUTH
              </span>
              <h3 className="font-serif text-lg font-medium text-ink-parchment">
                Exact Coordinates
              </h3>
              <p className="font-sans text-xs text-ink-ash leading-relaxed">
                Every contradiction, missing object, and secret leak links directly to the exact chapter,
                paragraph, and character citation. You inspect the reality, verify the facts, and remain in command.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          07. THE WORKING ATELIER (THE INTERACTIVE SIMULATOR)
          Cleanly anchored. Seamless integration. No chunky outer boxes.
          =================================================================== */}
      <section id="atelier" className="border-t border-border-quiet bg-surface-subtle/15 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          {/* Header */}
          <div className="pb-3 border-b border-border-quiet flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-ink-faint">
            <span>SEC. 06 / THE WORKING ATELIER</span>
            <span>LIVE INTERACTIVE STUDIO SANDBOX</span>
          </div>

          <div className="mt-8 mb-8 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-ink-parchment">
                Step directly into the author&apos;s workbench.
              </h2>
              <p className="mt-1 font-serif text-sm italic text-ink-ash">
                Test the full studio: live Markdown formatting toolbar, 2D knowledge matrix, real G6 world graph, and persistent editor below.
              </p>
            </div>

            <div className="font-mono text-[9px] uppercase tracking-wider text-ink-faint flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Full Interactive Simulation</span>
            </div>
          </div>

          {/* Master Product Studio Simulator — Seamlessly mounted */}
          <div className="mt-6">
            <ProductStudioSimulator />
          </div>
        </div>
      </section>

      {/* ===================================================================
          08. ARCHITECTURAL COLOPHON & STUDIO INVITATION
          Broadsheet closing. Pure solid colors.
          =================================================================== */}
      <footer className="border-t border-border-quiet bg-surface-void py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          {/* Closing Broadside Statement */}
          <div className="space-y-4 max-w-4xl">
            <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-wine-accent block">
              THE CANON INVITATION
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.06] tracking-tight text-ink-parchment">
              Every fictional world has physical laws. <br />
              <span className="italic text-ink-ash">Nerra ensures yours never breaks.</span>
            </h2>

            <div className="pt-6 flex flex-wrap items-center gap-6 font-mono text-[11px] uppercase tracking-[0.16em]">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-wine-accent hover:bg-wine-crimson text-white px-5 py-2.5 rounded text-[11px] uppercase tracking-[0.18em] font-medium transition-colors shadow-xs"
              >
                <span>Create Your Study</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <Link
                href="/login"
                className="text-ink-ash hover:text-ink-parchment transition-colors underline decoration-border-subtle underline-offset-4"
              >
                Author Sign In &rarr;
              </Link>
            </div>
          </div>

          {/* Structural Colophon Hairline Ledger */}
          <div className="mt-16 sm:mt-24 pt-8 border-t border-border-quiet grid grid-cols-1 md:grid-cols-12 gap-6 font-mono text-[9px] uppercase tracking-wider text-ink-faint">
            <div className="md:col-span-4 space-y-1">
              <span className="text-ink-parchment font-semibold">NERRA STUDIO SYSTEMS</span>
              <p className="font-sans normal-case text-xs text-ink-ash">
                Deterministic forensic story intelligence for novelists, showrunners, and narrative directors.
              </p>
            </div>

            <div className="md:col-span-4 space-y-1">
              <span className="text-ink-parchment font-semibold">STUDIO PALETTES</span>
              <p className="normal-case text-ink-ash text-[9.5px]">
                Literary Obsidian · Cypress Void · Scholar Slate · Ivory Atelier
              </p>
            </div>

            <div className="md:col-span-4 md:text-right space-y-1">
              <span className="text-ink-parchment font-semibold">COLOPHON</span>
              <p className="normal-case text-ink-ash text-[9.5px]">
                Set in Newsreader by Production Type &amp; Literata by TypeTogether.
              </p>
              <p className="text-[8.5px] text-ink-faint/60">
                &copy; {new Date().getFullYear()} NERRA TECHNOLOGIES. ALL DRAFTS SOVEREIGN.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
