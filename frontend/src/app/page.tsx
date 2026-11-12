"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { Navbar } from "@/components/dashboard/Navbar";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { NewProjectModal } from "@/components/dashboard/NewProjectModal";
import { ImportManuscriptModal } from "@/components/dashboard/ImportManuscriptModal";
import { SessionsDrawer } from "@/components/dashboard/SessionsDrawer";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { formatWords } from "@/lib/utils";
import type { Project } from "@/lib/types";
import {
  BookPlus,
  BookOpen,
  GitBranch,
  ShieldCheck,
  Sparkles,
  Layers,
  ArrowRight,
  Clock,
  Compass,
  FileText,
  AlertTriangle,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

export default function DashboardPage() {
  const { user, isAuthenticated, checkAuth, isLoading: authLoading } = useAuthStore();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [sessionsDrawerOpen, setSessionsDrawerOpen] = useState(false);
  const [uploadProject, setUploadProject] = useState<Project | null>(null);

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

  return (
    <div className="min-h-screen bg-surface-void flex flex-col selection:bg-wine-accent selection:text-ink-parchment">
      {/* Top Studio Navbar */}
      <Navbar
        onOpenNewProject={() => setNewProjectOpen(true)}
        onOpenSessions={() => setSessionsDrawerOpen(true)}
      />

      {/* Main Studio Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {isAuthenticated ? (
          <>
            {/* Authenticated Writer's Studio Hero */}
            <Surface
              depth={2}
              border="subtle"
              rounded="lg"
              className="relative overflow-hidden p-8 sm:p-10 shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-96 h-96 bg-wine-accent/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="wine" size="sm" className="gap-1.5" dot>
                    <span>Story Checker: Online</span>
                  </Badge>
                  <span className="text-xs text-ink-ash">•</span>
                  <span className="text-xs text-ink-bone font-serif italic">
                    Welcome back to your Study, {user?.display_name || "Author"}
                  </span>
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-ink-parchment leading-tight">
                  Your Novels & Story Atlas
                </h1>

                <p className="text-xs sm:text-sm text-ink-bone leading-relaxed">
                  Your personal story assistant. Keep track of characters, catch timeline contradictions across chapters, and write with complete confidence.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setNewProjectOpen(true)}
                    className="gap-2"
                  >
                    <BookPlus className="w-4 h-4" />
                    <span>Create New Story</span>
                  </Button>
                </div>
              </div>
            </Surface>

            {/* High-Level Telemetry Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Surface depth={1} border="quiet" rounded="md" className="p-5 space-y-1">
                <div className="flex items-center justify-between text-ink-ash text-xs">
                  <span>Total Words</span>
                  <ScrollText className="w-4 h-4 text-wine-crimson" />
                </div>
                <div className="font-serif text-2xl font-medium text-ink-parchment">
                  {formatWords(totalWords)}
                </div>
                <div className="text-[11px] text-ink-ash">
                  Across {projects.length} {projects.length === 1 ? "story" : "stories"}
                </div>
              </Surface>

              <Surface depth={1} border="quiet" rounded="md" className="p-5 space-y-1">
                <div className="flex items-center justify-between text-ink-ash text-xs">
                  <span>Chapters Ingested</span>
                  <BookOpen className="w-4 h-4 text-pine-moss" />
                </div>
                <div className="font-serif text-2xl font-medium text-ink-parchment">
                  {totalChapters}
                </div>
                <div className="text-[11px] text-ink-ash">
                  Ready in your workspace
                </div>
              </Surface>

              <Surface depth={1} border="quiet" rounded="md" className="p-5 space-y-1">
                <div className="flex items-center justify-between text-ink-ash text-xs">
                  <span>Plot Alerts</span>
                  <AlertTriangle className="w-4 h-4 text-severity-contradiction" />
                </div>
                <div className="font-serif text-2xl font-medium text-ink-parchment flex items-baseline gap-2">
                  <span>{totalIssues}</span>
                  {totalIssues === 0 && (
                    <span className="text-xs font-sans text-pine-moss">All Consistent</span>
                  )}
                </div>
                <div className="text-[11px] text-ink-ash">
                  {totalIssues === 0 ? "No contradictions found" : "Items to review"}
                </div>
              </Surface>

              <Surface depth={1} border="quiet" rounded="md" className="p-5 space-y-1">
                <div className="flex items-center justify-between text-ink-ash text-xs">
                  <span>Consistency Engine</span>
                  <Sparkles className="w-4 h-4 text-wine-crimson" />
                </div>
                <div className="font-serif text-2xl font-medium text-ink-parchment">
                  Ready
                </div>
                <div className="text-[11px] text-ink-ash">
                  Monitoring your story
                </div>
              </Surface>
            </div>

            {/* Novel Workspace Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-xl font-medium tracking-tight text-ink-parchment">
                    Your Novels
                  </h2>
                  <p className="text-xs text-ink-ash mt-0.5">
                    Select a story to open the editor, read chapters, or check consistency.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewProjectOpen(true)}
                  className="gap-1.5"
                >
                  <BookPlus className="w-3.5 h-3.5" />
                  <span>New Manuscript</span>
                </Button>
              </div>

              {projectsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-[236px] rounded-xl bg-surface-subtle border border-border-quiet animate-pulse"
                    />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <Surface
                  depth={1}
                  border="quiet"
                  rounded="sm"
                  className="p-12 text-center space-y-4 max-w-lg mx-auto"
                >
                  <div className="w-12 h-12 rounded-full bg-surface-card border border-border-subtle flex items-center justify-center text-ink-ash mx-auto">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-medium text-ink-parchment">
                      No manuscripts in your Study yet
                    </h3>
                    <p className="text-xs text-ink-bone mt-1 leading-relaxed">
                      Initialize a novel project or import an existing draft (.txt, .md, .docx, .pdf) to begin automatic entity extraction and continuity checks.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setNewProjectOpen(true)}
                    className="gap-2"
                  >
                    <BookPlus className="w-4 h-4" />
                    <span>Create First Manuscript</span>
                  </Button>
                </Surface>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onUploadClick={(proj) => setUploadProject(proj)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Unauthenticated Landing / Guest Experience */
          <div className="space-y-12 py-8">
            <Surface
              depth={2}
              border="subtle"
              rounded="lg"
              className="relative overflow-hidden p-8 sm:p-14 text-center max-w-3xl mx-auto shadow-2xl"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-wine-accent/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-4">
                <Badge variant="wine" size="sm" className="gap-1.5" dot>
                  <span>Deterministic Story Intelligence</span>
                </Badge>

                <h1 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-ink-parchment leading-tight">
                  Where Literary Craft Meets Forensic Continuity
                </h1>

                <p className="text-sm sm:text-base text-ink-bone max-w-xl mx-auto leading-relaxed">
                  NERRA parses your novel into an interconnected universe: characters, knowledge states, physical object custody, and dual timelines—surfacing contradictions before your readers do.
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
                  2D matrix tracking exactly who knows which secrets, since which chapter, and whether information was learned firsthand or overheard.
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
                  Toggle seamlessly between Narrative In-Book order and In-Universe Chronological order, with automatic spatiotemporal collision warnings.
                </p>
              </Surface>

              <Surface depth={1} border="quiet" rounded="md" className="p-6 space-y-3">
                <div className="w-9 h-9 rounded-xl bg-severity-knowledge-bg border border-severity-knowledge-border flex items-center justify-center text-severity-knowledge shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                  <GitBranch className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-base font-medium text-ink-parchment">
                  Story Graph & Custody
                </h3>
                <p className="text-ink-ash leading-relaxed">
                  Multi-hop entity graph tracking artifact custody handoffs and character dynamics with chapter-temporal validity.
                </p>
              </Surface>
            </div>
          </div>
        )}
      </main>

      {/* Modals & Drawers */}
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
