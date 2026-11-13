"use client";

import React, { useState, use, useMemo } from "react";
import Link from "next/link";
import { useCandidates, useProject } from "@/hooks/useStoryData";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Merge,
  Split,
  Search,
  BookOpen,
  ArrowRight,
  Filter,
  Sparkles,
  HelpCircle,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import type { ValidationCandidate } from "@/lib/types";

interface ValidationPageProps {
  params: Promise<{ id: string }>;
}

export default function ValidationPage({ params }: ValidationPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const queryClient = useQueryClient();

  const { data: project } = useProject(projectId);
  const { data: candidates = [], isLoading } = useCandidates(projectId);

  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          c.candidate_type.toLowerCase().includes(q) ||
          c.ambiguity_reason?.toLowerCase().includes(q) ||
          c.evidence_quote?.toLowerCase().includes(q) ||
          JSON.stringify(c.payload).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [candidates, statusFilter, searchQuery]);

  const handleResolve = async (
    candidateId: string,
    action: "approve" | "reject" | "merge" | "split"
  ) => {
    setProcessingId(candidateId);
    try {
      await api.story.resolveCandidate(projectId, candidateId, { action });
      await queryClient.invalidateQueries({ queryKey: ["candidates", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["characters", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["claims", projectId] });
      toast.success(`Candidate ${action}d successfully.`);
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} candidate.`);
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = candidates.filter((c) => c.status === "pending").length;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
      {/* Header & Mission Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border-subtle pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-ink-ash font-medium">
              Human-in-the-Loop Adjudication
            </span>
            <span className="text-border-subtle">•</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-wine-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-wine-accent" />
              {pendingCount} Ambiguities Requiring Review
            </span>
          </div>
          <h1 className="text-3xl font-serif font-normal tracking-tight text-ink-parchment flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-wine-accent" />
            Fact Approvals &amp; Identity Disambiguation
          </h1>
          <p className="text-sm text-ink-ash max-w-2xl leading-relaxed">
            When the extraction engine detects borderline entity matches or ambiguous aliases,
            it flags them here for author decision. Never let an AI guess incorrectly when you can decide with one click.
          </p>
        </div>
      </div>

      {/* Control Deck */}
      <Surface depth={1} border="quiet" className="p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-ash absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search candidate facts, names, quotes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-card border border-border-subtle rounded-lg pl-8 pr-3 py-1.5 text-xs text-ink-parchment placeholder:text-ink-faint outline-none focus:border-wine-accent w-64"
            />
          </div>

          <span className="text-border-subtle font-mono text-xs hidden sm:inline">|</span>

          <div className="flex items-center gap-2 text-xs font-mono text-ink-ash">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-card border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-ink-parchment outline-none focus:border-wine-accent cursor-pointer"
          >
            <option value="pending">Pending Review ({pendingCount})</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All Candidates ({candidates.length})</option>
          </select>
        </div>

        <div className="text-xs font-mono text-ink-faint">
          Showing <span className="text-ink-parchment font-medium">{filteredCandidates.length}</span> of {candidates.length} items
        </div>
      </Surface>

      {/* Main Stream */}
      {isLoading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-wine-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-ink-ash">Fetching human-in-the-loop candidate queue...</p>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <Surface depth={2} border="subtle" className="p-12 text-center rounded-2xl max-w-xl mx-auto space-y-4">
          <CheckCircle2 className="w-10 h-10 text-pine-forest mx-auto opacity-70" />
          <h3 className="font-serif text-lg text-ink-parchment">No Pending Approvals</h3>
          <p className="text-xs text-ink-ash leading-relaxed">
            All extracted facts, entity aliases, and world assertions have been resolved or auto-admitted under your current strictness sensitivity.
          </p>
        </Surface>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCandidates.map((candidate) => {
            const isProcessing = processingId === candidate.id;
            const payloadStr =
              typeof candidate.payload === "object"
                ? JSON.stringify(candidate.payload, null, 2)
                : String(candidate.payload);

            return (
              <Surface
                key={candidate.id}
                depth={2}
                border="subtle"
                className="p-5 rounded-xl space-y-4 flex flex-col justify-between hover:border-border-prominent transition-all duration-150"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-subtle text-ink-parchment border border-border-quiet">
                        Ch. {candidate.chapter}
                      </span>
                      <span className="font-mono text-[11px] text-ink-ash uppercase">
                        {candidate.candidate_type.replace(/_/g, " ")}
                      </span>
                    </div>

                    <span className="font-mono text-[11px] text-ink-ash">
                      {Math.round((candidate.confidence || 0) * 100)}% conf
                    </span>
                  </div>

                  {candidate.ambiguity_reason && (
                    <div className="p-2.5 rounded-lg bg-surface-subtle border border-border-quiet text-xs font-sans text-ink-parchment">
                      <span className="text-wine-accent font-mono text-[10px] uppercase font-semibold mr-1.5">
                        Issue:
                      </span>
                      {candidate.ambiguity_reason}
                    </div>
                  )}

                  {candidate.evidence_quote && (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-ink-ash mb-1">
                        Textual Excerpt
                      </p>
                      <blockquote className="text-xs font-serif italic text-ink-bone bg-surface-subtle p-3 rounded-lg border-l-2 border-wine-accent">
                        &ldquo;{candidate.evidence_quote}&rdquo;
                      </blockquote>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-ink-ash mb-1">
                      Candidate Payload
                    </p>
                    <pre className="text-[11px] font-mono text-ink-bone bg-surface-void p-2.5 rounded-lg border border-border-quiet overflow-x-auto max-h-28">
                      {payloadStr}
                    </pre>
                  </div>
                </div>

                {/* Adjudication Action Bar */}
                <div className="pt-3 border-t border-border-quiet flex items-center justify-between gap-2">
                  <Link
                    href={`/projects/${projectId}/reader?chapter=${candidate.chapter}`}
                    className="text-[11px] font-mono text-ink-ash hover:text-ink-parchment flex items-center gap-1 transition-colors"
                  >
                    <BookOpen className="w-3 h-3 text-wine-accent" /> Read Folio
                  </Link>

                  {candidate.status === "pending" ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handleResolve(candidate.id, "reject")}
                        className="h-7 text-xs font-mono text-wine-crimson hover:bg-wine-crimson/10"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handleResolve(candidate.id, "approve")}
                        className="h-7 text-xs font-mono bg-pine-forest hover:bg-emerald-600 text-white"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                    </div>
                  ) : (
                    <span className="font-mono text-xs text-ink-ash capitalize">
                      Resolved: {candidate.status}
                    </span>
                  )}
                </div>
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
}
