"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { Navbar } from "@/components/dashboard/Navbar";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { NewProjectModal } from "@/components/dashboard/NewProjectModal";
import { ImportManuscriptModal } from "@/components/dashboard/ImportManuscriptModal";
import { AuthModal } from "@/components/dashboard/AuthModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
  Upload,
} from "lucide-react";

export default function DashboardPage() {
  const { isAuthenticated, checkAuth, isLoading: authLoading } = useAuthStore();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "register" | "sessions">("signin");
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
    <div className="min-h-screen bg-[#08090B] flex flex-col selection:bg-[#9B2242]/30 selection:text-white">
      {/* Top Atmospheric Navbar */}
      <Navbar
        onOpenNewProject={() => setNewProjectOpen(true)}
        onOpenAuth={() => {
          setAuthModalTab("signin");
          setAuthModalOpen(true);
        }}
        onOpenSessions={() => {
          setAuthModalTab("sessions");
          setAuthModalOpen(true);
        }}
      />

      {/* Main Studio Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Literary Welcome Banner */}
        <section className="relative overflow-hidden rounded-2xl p-8 bg-gradient-to-r from-[#140E13] via-[#101311] to-[#0A0D0B] border border-white/[0.08] shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#9B2242]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="brass" size="sm" className="gap-1.5">
                <Sparkles className="w-3 h-3 text-[#C5A059]" />
                <span>Deterministic Story Intelligence</span>
              </Badge>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#EDE6D6] leading-tight">
              Where your manuscript builds its own living memory.
            </h1>
            <p className="text-sm text-[#B5ACA0] leading-relaxed">
              Track character claims across 50,000+ words, decouple flashbacks into dual chronological order, enforce magic system rules, and prevent custody paradoxes.
            </p>

            {isAuthenticated ? (
              <div className="pt-2 flex items-center gap-3">
                <Button
                  variant="wine"
                  size="md"
                  onClick={() => setNewProjectOpen(true)}
                  className="gap-2 shadow-[0_0_20px_rgba(155,34,66,0.3)]"
                >
                  <BookPlus className="w-4 h-4" />
                  <span>Start New Novel</span>
                </Button>
              </div>
            ) : (
              <div className="pt-2 flex items-center gap-3">
                <Button
                  variant="wine"
                  size="md"
                  onClick={() => {
                    setAuthModalTab("signin");
                    setAuthModalOpen(true);
                  }}
                  className="gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In to Access Manuscripts</span>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Story Telemetry Ribbon (Only for authenticated authors) */}
        {isAuthenticated && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card variant="burgundy" className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#9B2242]/20 border border-[#9B2242]/30 flex items-center justify-center">
                <Layers className="w-5 h-5 text-[#C43D65]" />
              </div>
              <div>
                <p className="text-xl font-bold font-serif text-[#EDE6D6]">{projects.length}</p>
                <p className="text-xs text-[#7D756C] uppercase font-mono">Manuscripts</p>
              </div>
            </Card>

            <Card variant="forest" className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#1B8A5A]/20 border border-[#1B8A5A]/30 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#2DD4BF]" />
              </div>
              <div>
                <p className="text-xl font-bold font-serif text-[#EDE6D6]">{totalChapters}</p>
                <p className="text-xs text-[#7D756C] uppercase font-mono">Tracked Chapters</p>
              </div>
            </Card>

            <Card variant="burgundy" className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#C5A059]/20 border border-[#C5A059]/30 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-[#E5C384]" />
              </div>
              <div>
                <p className="text-xl font-bold font-serif text-[#EDE6D6]">{formatWords(totalWords)}</p>
                <p className="text-xs text-[#7D756C] uppercase font-mono">Active Canon Words</p>
              </div>
            </Card>

            <Card variant="forest" className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#34D399]" />
              </div>
              <div>
                <p className="text-xl font-bold font-serif text-[#EDE6D6]">{totalIssues}</p>
                <p className="text-xs text-[#7D756C] uppercase font-mono">Pending Continuity Issues</p>
              </div>
            </Card>
          </section>
        )}

        {/* Manuscripts Grid / Empty State */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold tracking-tight text-[#EDE6D6]">
              Your Manuscripts
            </h2>
            {isAuthenticated && projects.length > 0 && (
              <span className="text-xs text-[#7D756C]">
                {projects.length} {projects.length === 1 ? "project" : "projects"} loaded
              </span>
            )}
          </div>

          {!isAuthenticated ? (
            <div className="p-12 text-center rounded-2xl bg-[#130D12] border border-white/[0.08] space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-[#C5A059]" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-serif text-lg font-semibold text-[#EDE6D6]">
                  Sign In to View Your Studio
                </h3>
                <p className="text-xs text-[#B5ACA0] leading-relaxed">
                  Your story memory graphs and manuscript drafts are tied to your authenticated author session.
                </p>
              </div>
              <Button
                variant="brass"
                size="md"
                onClick={() => {
                  setAuthModalTab("signin");
                  setAuthModalOpen(true);
                }}
              >
                Sign In / Register
              </Button>
            </div>
          ) : projectsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[230px] rounded-xl bg-white/[0.02] border border-white/[0.06] animate-pulse"
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#130D12] border border-white/[0.08] space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#9B2242]/20 border border-[#9B2242]/40 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-[#C43D65]" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-serif text-lg font-semibold text-[#EDE6D6]">
                  No manuscripts in your studio yet
                </h3>
                <p className="text-xs text-[#B5ACA0] leading-relaxed">
                  Create your first manuscript project or import an existing draft (.txt, .md, .pdf) to begin extracting your story memory graph.
                </p>
              </div>
              <Button
                variant="wine"
                size="md"
                onClick={() => setNewProjectOpen(true)}
                className="gap-2"
              >
                <BookPlus className="w-4 h-4" />
                <span>Create First Manuscript</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onUploadClick={(p) => setUploadProject(p)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-[#7D756C]">
        <p>NERRA Studio • Obsidian Velvet & Forest Noir • Deterministic Narrative OS</p>
      </footer>

      {/* Modals */}
      <NewProjectModal
        isOpen={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onProjectCreated={() => refetchProjects()}
      />

      <ImportManuscriptModal
        project={uploadProject}
        isOpen={!!uploadProject}
        onClose={() => setUploadProject(null)}
        onImportComplete={() => refetchProjects()}
      />

      <AuthModal
        isOpen={authModalOpen}
        initialTab={authModalTab}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
