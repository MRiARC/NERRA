"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { Navbar } from "@/components/dashboard/Navbar";
import { ShelfRow } from "@/components/dashboard/ShelfRow";
import { NewProjectModal } from "@/components/dashboard/NewProjectModal";
import { ImportManuscriptModal } from "@/components/dashboard/ImportManuscriptModal";
import { SessionsDrawer } from "@/components/dashboard/SessionsDrawer";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import type { Project } from "@/lib/types";
import {
  BookPlus,
  Compass,
  Clock,
  GitBranch,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

/** Time-aware greeting. Rendered on the server too, hence the hydration guard. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Still awake";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function today(): string {
  return new Date()
    .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
    .toUpperCase();
}

export default function DashboardPage() {
  const { user, isAuthenticated, checkAuth, isCheckingAuth: authLoading } = useAuthStore();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [sessionsDrawerOpen, setSessionsDrawerOpen] = useState(false);
  const [uploadProject, setUploadProject] = useState<Project | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const {
    data: projects = [],
    isLoading: projectsLoading,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.projects.list(),
    enabled: isAuthenticated,
  });

  const totalWords = projects.reduce((acc, p) => acc + (p.word_count || 0), 0);
  const totalChapters = projects.reduce((acc, p) => acc + (p.chapter_count || 0), 0);
  const totalIssues = projects.reduce((acc, p) => acc + (p.open_issue_count || 0), 0);

  const firstName = (user?.display_name || "").trim().split(/\s+/)[0] || "author";

  const stateLine =
    projects.length === 0
      ? "The shelf is empty. The first page is yours."
      : totalChapters === 0
      ? `${projects.length === 1 ? "One story" : `${projects.length} stories`} on the shelf, not yet read. Bring in a draft and I will start mapping it.`
      : totalIssues > 0
      ? `${projects.length === 1 ? "One story" : `${projects.length} stories`} on the shelf. ${totalIssues} ${
          totalIssues === 1 ? "thread is" : "threads are"
        } waiting for you.`
      : `${projects.length === 1 ? "One story" : `${projects.length} stories`} on the shelf. Nothing is broken today.`;

  const ledger = [
    { value: totalWords.toLocaleString(), label: "words" },
    { value: String(totalChapters), label: totalChapters === 1 ? "chapter" : "chapters" },
    {
      value: String(totalIssues),
      label: totalIssues === 1 ? "open thread" : "open threads",
      alert: totalIssues > 0,
    },
    {
      value: String(projects.length),
      label: projects.length === 1 ? "story" : "stories",
    },
  ];

  return (
    <div className="min-h-screen bg-surface-void flex flex-col selection:bg-wine-accent selection:text-ink-parchment">
      <Navbar
        onOpenNewProject={() => setNewProjectOpen(true)}
        onOpenSessions={() => setSessionsDrawerOpen(true)}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-12 sm:py-16">
        {isAuthenticated ? (
          <>
            {/* Nameplate */}
            <motion.section
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-ash">
                <span>Study</span>
                <span aria-hidden className="h-px w-8 bg-border-subtle" />
                <span suppressHydrationWarning>{today()}</span>
              </div>

              <h1 className="mt-6 font-serif text-[clamp(2.25rem,5vw,3.5rem)] font-medium leading-[1.05] tracking-tight text-ink-parchment">
                <span suppressHydrationWarning>{greeting()}</span>, {firstName}.
              </h1>

              <p className="mt-4 max-w-xl font-serif text-base italic leading-relaxed text-ink-bone sm:text-lg">
                {stateLine}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setNewProjectOpen(true)}
                  className="gap-2"
                >
                  <BookPlus className="w-4 h-4" />
                  <span>New story</span>
                </Button>

                <button
                  type="button"
                  onClick={() => projects.length > 0 && setUploadProject(projects[0])}
                  disabled={projects.length === 0}
                  className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-ash transition-colors hover:text-ink-parchment disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-ink-ash"
                >
                  <span>Import manuscript</span>
                  <span
                    aria-hidden
                    className="h-px w-6 bg-current transition-all duration-300 group-enabled:group-hover:w-9"
                  />
                </button>
              </div>
            </motion.section>

            {/* Ledger */}
            <motion.section
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={reduceMotion ? undefined : { opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-14 border-y border-border-quiet py-6"
            >
              <dl className="grid grid-cols-2 gap-y-6 sm:flex sm:items-baseline sm:gap-0">
                {ledger.map((entry, i) => (
                  <div
                    key={entry.label}
                    className={
                      i === 0
                        ? "sm:pr-9"
                        : "sm:border-l sm:border-border-quiet sm:px-9 last:sm:pr-0"
                    }
                  >
                    <dd
                      className={`font-serif text-2xl tabular-nums ${
                        entry.alert ? "text-severity-contradiction" : "text-ink-parchment"
                      }`}
                    >
                      {entry.value}
                    </dd>
                    <dt className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                      {entry.label}
                    </dt>
                  </div>
                ))}
              </dl>
            </motion.section>

            {/* Shelf */}
            <section className="mt-12">
              <header className="flex items-baseline justify-between gap-4">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-ash">
                  Your shelf
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                  {projects.length} {projects.length === 1 ? "manuscript" : "manuscripts"}
                </span>
              </header>

              <div className="mt-2">
                {authLoading || projectsLoading ? (
                  <div className="divide-y divide-border-quiet">
                    {[0, 1, 2].map((n) => (
                      <div key={n} className="flex items-center gap-6 py-7">
                        <div className="h-12 w-[10px] rounded-full bg-surface-subtle" />
                        <div className="flex-1 space-y-2.5">
                          <div className="h-4 w-1/3 rounded bg-surface-subtle" />
                          <div className="h-3 w-1/5 rounded bg-surface-subtle/70" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : projects.length === 0 ? (
                  <div className="border-t border-dashed border-border-subtle py-20 text-center">
                    <p className="font-serif text-2xl text-ink-parchment">
                      The first page is blank.
                    </p>
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
                      No manuscripts in this study
                    </p>
                    <div className="mt-7 flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNewProjectOpen(true)}
                        className="gap-2"
                      >
                        <BookPlus className="w-3.5 h-3.5" />
                        <span>Begin a story</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div role="list">
                    {projects.map((project, index) => (
                      <ShelfRow
                        key={project.id}
                        project={project}
                        index={index}
                        staticEntry={Boolean(reduceMotion)}
                        onUploadClick={(proj) => setUploadProject(proj)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          /* Unauthenticated Landing / Guest Experience */
          <div className="space-y-12 py-8">
            <Surface depth={2} border="subtle" rounded="lg" className="p-8 sm:p-14 text-center max-w-3xl mx-auto">
              <div className="space-y-4">
                <Badge variant="wine" size="sm" className="gap-1.5" dot>
                  <span>Deterministic Story Intelligence</span>
                </Badge>

                <h1 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-ink-parchment leading-tight">
                  Where Literary Craft Meets Forensic Continuity
                </h1>

                <p className="text-sm sm:text-base text-ink-bone max-w-xl mx-auto leading-relaxed">
                  NERRA parses your novel into an interconnected universe: characters, knowledge
                  states, physical object custody, and dual timelines—surfacing contradictions before
                  your readers do.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                  <Link href="/login">
                    <Button variant="primary" size="lg" className="gap-2">
                      <span>Enter Scribe&apos;s Atelier</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>

                  <Link href="/register">
                    <Button variant="outline" size="lg">
                      <span>Create Author Account</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </Surface>

            {/* Feature Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto text-xs">
              <Surface depth={1} border="quiet" rounded="md" className="p-6 space-y-3">
                <div className="w-9 h-9 rounded-xl bg-wine-accent/20 border border-wine-accent/40 flex items-center justify-center text-wine-crimson shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                  <Compass className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-base font-medium text-ink-parchment">
                  Epistemic Knowledge Matrix
                </h3>
                <p className="text-ink-ash leading-relaxed">
                  2D matrix tracking exactly who knows which secrets, since which chapter, and whether
                  information was learned firsthand or overheard.
                </p>
              </Surface>

              <Surface depth={1} border="quiet" rounded="md" className="p-6 space-y-3">
                <div className="w-9 h-9 rounded-xl bg-pine-accent/20 border border-pine-accent/40 flex items-center justify-center text-pine-moss shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-base font-medium text-ink-parchment">
                  Dual Chronology Engine
                </h3>
                <p className="text-ink-ash leading-relaxed">
                  Toggle seamlessly between Narrative In-Book order and In-Universe Chronological
                  order, with automatic spatiotemporal collision warnings.
                </p>
              </Surface>

              <Surface depth={1} border="quiet" rounded="md" className="p-6 space-y-3">
                <div className="w-9 h-9 rounded-xl bg-severity-knowledge-bg border border-severity-knowledge-border flex items-center justify-center text-severity-knowledge shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                  <GitBranch className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-base font-medium text-ink-parchment">
                  Story Graph &amp; Custody
                </h3>
                <p className="text-ink-ash leading-relaxed">
                  Multi-hop entity graph tracking artifact custody handoffs and character dynamics
                  with chapter-temporal validity.
                </p>
              </Surface>
            </div>
          </div>
        )}
      </main>

      <NewProjectModal
        isOpen={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onProjectCreated={() => refetchProjects()}
      />

      <ImportManuscriptModal
        project={uploadProject}
        isOpen={Boolean(uploadProject)}
        onClose={() => setUploadProject(null)}
        onImportComplete={() => refetchProjects()}
      />

      <SessionsDrawer
        isOpen={sessionsDrawerOpen}
        onClose={() => setSessionsDrawerOpen(false)}
      />
    </div>
  );
}
