"use client";

import React, { useState, use, useMemo } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useProject, useIssues, useManuscripts } from "@/hooks/useStoryData";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Issue } from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Sparkles,
  ArrowRight,
  BookOpen,
  PenTool,
  Search,
  Filter,
  Layers,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Scale,
  BrainCircuit,
  HelpCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

interface IssuesPageProps {
  params: Promise<{ id: string }>;
}

export default function IssuesReviewPage({ params }: IssuesPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const queryClient = useQueryClient();

  const { data: project } = useProject(projectId);
  const { data: issues = [], isLoading, refetch } = useIssues(projectId);
  const { data: manuscripts = [] } = useManuscripts(projectId);

  // Filters
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("open");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isReasoning, setIsReasoning] = useState(false);
  const [isPatching, setIsPatching] = useState(false);

  // Filtered Issues
  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      if (selectedSeverity !== "all" && iss.severity !== selectedSeverity) return false;
      if (selectedStatus !== "all" && iss.status !== selectedStatus) return false;
      if (selectedType !== "all" && iss.type !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = iss.description.toLowerCase().includes(q);
        const evidenceMatch = iss.evidence?.some((e) => e.quote.toLowerCase().includes(q));
        const entityMatch = iss.related_entities?.some((ent) => ent.toLowerCase().includes(q));
        if (!descMatch && !evidenceMatch && !entityMatch) return false;
      }
      return true;
    });
  }, [issues, selectedSeverity, selectedStatus, selectedType, searchQuery]);

  // Selected Issue
  const activeIssue = useMemo(() => {
    if (selectedIssueId) {
      return issues.find((i) => i.id === selectedIssueId) || filteredIssues[0] || null;
    }
    return filteredIssues[0] || null;
  }, [issues, filteredIssues, selectedIssueId]);

  // Counts
  const redCount = issues.filter((i) => i.severity === "red" && i.status === "open").length;
  const yellowCount = issues.filter((i) => i.severity === "yellow" && i.status === "open").length;
  const blueCount = issues.filter((i) => i.severity === "blue" && i.status === "open").length;
  const intentionalCount = issues.filter((i) => i.status === "intentional").length;
  const resolvedCount = issues.filter((i) => i.status === "resolved" || i.status === "accepted").length;

  // Adjudicate Issue Status
  const handleSetStatus = async (status: "open" | "accepted" | "rejected" | "intentional") => {
    if (!activeIssue) return;
    setIsPatching(true);
    try {
      await api.story.patchIssue(projectId, activeIssue.id, status);
      await queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      
      const labels: Record<string, string> = {
        accepted: "Accepted as Manuscript Draft Slip (Queued for Revision).",
        intentional: "Recorded as Intentional Authorial Lore / Unreliable POV.",
        rejected: "Dismissed as False Positive.",
        open: "Returned to Open Review Queue.",
      };
      toast.success(labels[status]);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to update issue status."));
    } finally {
      setIsPatching(false);
    }
  };

  // Run AI Reasoner
  const handleTriggerReasoning = async () => {
    if (!activeIssue) return;
    setIsReasoning(true);
    try {
      const updated = await api.story.reasonIssue(projectId, activeIssue.id);
      await queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
      toast.success("AI Hermeneutic Reasoning analysis updated.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to trigger AI reasoning pass."));
    } finally {
      setIsReasoning(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden selection:bg-wine-accent selection:text-ink-parchment">
      {/* Top Banner (Stitch Screen 3) */}
      <header className="px-6 py-4 border-b border-border-quiet bg-surface-subtle shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-ash hover:text-ink-parchment transition-colors px-2 py-1 rounded-lg hover:bg-surface-card border border-transparent hover:border-border-quiet"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Project Overview</span>
            </Link>
            <span className="text-border-subtle font-mono text-xs">•</span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Checker: Ready</span>
            </span>
          </div>

          <h1 className="font-serif text-xl sm:text-2xl font-medium tracking-tight text-ink-parchment flex items-center gap-2.5">
            <span>Plot & Consistency Checks</span>
            <Badge variant="subtle" size="xs" className="font-mono rounded-full text-xs">
              {issues.length} {issues.length === 1 ? "Issue" : "Issues"}
            </Badge>
          </h1>
        </div>

        {/* Quick Severity Scorecards */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => { setSelectedSeverity("red"); setSelectedStatus("open"); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-all ${
              selectedSeverity === "red"
                ? "bg-severity-contradiction/15 border-severity-contradiction text-severity-contradiction font-semibold"
                : "bg-surface-card border-border-subtle text-ink-bone hover:border-border-prominent"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-severity-contradiction" />
            <span>{redCount} Major</span>
          </button>

          <button
            onClick={() => { setSelectedSeverity("yellow"); setSelectedStatus("open"); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-all ${
              selectedSeverity === "yellow"
                ? "bg-severity-warning/15 border-severity-warning text-severity-warning font-semibold"
                : "bg-surface-card border-border-subtle text-ink-bone hover:border-border-prominent"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-severity-warning" />
            <span>{yellowCount} Minor</span>
          </button>

          <button
            onClick={() => { setSelectedStatus("intentional"); setSelectedSeverity("all"); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-all ${
              selectedStatus === "intentional"
                ? "bg-wine-accent/20 border-wine-accent text-wine-crimson font-semibold"
                : "bg-surface-card border-border-subtle text-ink-bone hover:border-border-prominent"
            }`}
          >
            <EyeOff className="w-3.5 h-3.5 text-wine-crimson" />
            <span>{intentionalCount} Marked Intentional</span>
          </button>

          <button
            onClick={() => { setSelectedStatus("all"); setSelectedSeverity("all"); }}
            className={`px-3 py-1.5 rounded-full border text-xs transition-all ${
              selectedStatus === "all" && selectedSeverity === "all"
                ? "bg-surface-field border-border-focus text-ink-parchment font-semibold"
                : "bg-surface-card border-border-subtle text-ink-bone hover:border-border-prominent"
            }`}
          >
            All ({issues.length})
          </button>
        </div>
      </header>

      {/* Main Studio Viewport (2 Columns: List & Comparator) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Issue Review Queue (Width: 380px - 440px) */}
        <aside className="w-full sm:w-[420px] lg:w-[460px] border-r border-border-quiet bg-surface-void flex flex-col shrink-0 overflow-hidden">
          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-border-quiet space-y-3 bg-surface-subtle">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-ash absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search paradoxes, characters, or quotes..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-surface-field border border-border-subtle text-xs text-ink-parchment focus:outline-none focus:border-wine-accent transition-colors shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center justify-between text-[11px] text-ink-ash pt-0.5">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setSelectedStatus(selectedStatus === "open" ? "all" : "open")}
                  className={`px-2.5 py-1 rounded-full border text-[11px] ${
                    selectedStatus === "open"
                      ? "bg-wine-accent/15 border-wine-accent text-wine-crimson font-medium"
                      : "bg-surface-card border-border-subtle"
                  }`}
                >
                  Open Only
                </button>
                <button
                  onClick={() => setSelectedSeverity(selectedSeverity === "red" ? "all" : "red")}
                  className={`px-2.5 py-1 rounded-full border text-[11px] ${
                    selectedSeverity === "red"
                      ? "bg-severity-contradiction/15 border-severity-contradiction text-severity-contradiction font-medium"
                      : "bg-surface-card border-border-subtle"
                  }`}
                >
                  Critical Red
                </button>
              </div>

              <span>{filteredIssues.length} matches</span>
            </div>
          </div>

          {/* Issue Cards Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border-quiet scrollbar-thin">
            {filteredIssues.map((issue) => {
              const isSelected = activeIssue?.id === issue.id;
              const hasTwoFolios = issue.evidence && issue.evidence.length >= 2;
              const chA = issue.evidence?.[0]?.chapter;
              const chB = issue.evidence?.[1]?.chapter;

              return (
                <button
                  key={issue.id}
                  onClick={() => setSelectedIssueId(issue.id)}
                  className={`w-full p-4 text-left transition-all duration-150 flex flex-col gap-2 relative select-none ${
                    isSelected
                      ? "bg-surface-card border-l-4 border-l-wine-accent shadow-sm"
                      : "hover:bg-surface-card/60 border-l-4 border-l-transparent"
                  }`}
                >
                  {/* Top line: severity + type + status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          issue.severity === "red"
                            ? "bg-severity-contradiction"
                            : issue.severity === "yellow"
                            ? "bg-severity-warning"
                            : "bg-severity-thread"
                        }`}
                      />
                      <span className="text-[10px] uppercase font-mono tracking-wider text-ink-ash">
                        {issue.type.replace(/_/g, " ")}
                      </span>
                    </div>

                    {issue.status === "intentional" && (
                      <Badge variant="thread" size="xs">
                        Intentional
                      </Badge>
                    )}
                    {issue.status === "accepted" && (
                      <Badge variant="warning" size="xs">
                        Draft Slip
                      </Badge>
                    )}
                    {issue.status === "open" && (
                      <span className="text-[10px] text-severity-contradiction font-mono font-medium">
                        Open
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="font-serif text-xs font-medium text-ink-parchment line-clamp-2 leading-relaxed">
                    {issue.description}
                  </p>

                  {/* Chapter Chips */}
                  <div className="flex items-center gap-2 text-[10px] text-ink-ash pt-1">
                    {hasTwoFolios ? (
                      <span className="font-mono bg-surface-subtle px-1.5 py-0.5 rounded border border-border-quiet">
                        Folio {chA} ⚡ Folio {chB}
                      </span>
                    ) : (
                      <span className="font-mono bg-surface-subtle px-1.5 py-0.5 rounded border border-border-quiet">
                        Folio {chA || "Global"}
                      </span>
                    )}

                    {issue.confidence && (
                      <span>{Math.round(issue.confidence * 100)}% Certainty</span>
                    )}
                  </div>
                </button>
              );
            })}

            {filteredIssues.length === 0 && (
              <div className="p-8 text-center space-y-2 text-ink-ash">
                <ShieldCheck className="w-8 h-8 mx-auto text-pine-moss" />
                <p className="text-xs text-ink-bone font-medium">
                  No issues matching current filters.
                </p>
                <p className="text-[11px]">
                  All inspected propositions conform to canonical world laws.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Right Column: Detailed Dual-Folio Comparator & Adjudication */}
        <main className="flex-1 overflow-y-auto bg-surface-subtle p-6 sm:p-8 space-y-6">
          {activeIssue ? (
            <motion.div
              key={activeIssue.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl space-y-6"
            >
              {/* Issue Header & Metadata Card */}
              <Surface depth={2} border="subtle" rounded="md" className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-quiet pb-4">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        activeIssue.severity === "red"
                          ? "contradiction"
                          : activeIssue.severity === "yellow"
                          ? "warning"
                          : "subtle"
                      }
                      size="sm"
                      className="uppercase font-mono tracking-wider font-semibold"
                    >
                      {activeIssue.severity} Severity
                    </Badge>
                    <Badge variant="subtle" size="sm" className="uppercase font-mono">
                      {activeIssue.type.replace(/_/g, " ")}
                    </Badge>
                    {activeIssue.confidence && (
                      <span className="text-xs font-mono text-ink-ash">
                        Confidence: {Math.round(activeIssue.confidence * 100)}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-ink-ash">Status:</span>
                    <Badge
                      variant={
                        activeIssue.status === "intentional"
                          ? "thread"
                          : activeIssue.status === "accepted"
                          ? "warning"
                          : activeIssue.status === "rejected"
                          ? "subtle"
                          : "contradiction"
                      }
                      size="sm"
                      className="uppercase font-mono font-medium"
                    >
                      {activeIssue.status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="font-serif text-xl sm:text-2xl font-medium text-ink-parchment leading-snug">
                    {activeIssue.description}
                  </h2>
                  <p className="text-xs text-ink-bone leading-relaxed">
                    The checker found conflicting statements between two chapters in your novel.
                  </p>
                </div>

                {/* AI Explanation / Analysis */}
                <div className="p-4 rounded-xl bg-surface-card border border-border-subtle space-y-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-pine-moss flex items-center gap-1.5">
                      <BrainCircuit className="w-4 h-4" />
                      <span>AI Explanation & Analysis</span>
                    </span>

                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={handleTriggerReasoning}
                      isLoading={isReasoning}
                      className="text-xs text-ink-ash hover:text-ink-parchment gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{activeIssue.ai_reasoning ? "Re-analyze" : "Explain Conflict"}</span>
                    </Button>
                  </div>

                  <p className="text-xs text-ink-bone leading-relaxed font-serif italic">
                    {activeIssue.ai_reasoning ||
                      "The AI flags this discrepancy as a potential drafting slip or an intentional plot change. Click 'Explain Conflict' to run an in-depth contextual analysis across your story bible."}
                  </p>
                </div>
              </Surface>

              {/* Dual-Folio Side-by-Side Evidence Comparison */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-sm font-medium text-ink-parchment flex items-center gap-2">
                    <Scale className="w-4 h-4 text-wine-crimson" />
                    <span>Compare Chapters</span>
                  </h3>
                  <span className="text-[11px] text-ink-ash font-mono">
                    Direct Chapter Quotes
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Evidence Folio A */}
                  <Surface
                    depth={1}
                    border="subtle"
                    rounded="md"
                    className="p-5 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-border-quiet pb-2">
                        <Badge variant="subtle" size="xs" className="font-mono">
                          Chapter {activeIssue.evidence?.[0]?.chapter || "Early"} (First Mention)
                        </Badge>
                        <span className="text-[10px] text-ink-ash">Original statement</span>
                      </div>

                      <blockquote className="p-3.5 rounded-xl bg-surface-card border-l-2 border-pine-moss font-serif text-xs text-ink-parchment leading-relaxed italic shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                        &ldquo;{activeIssue.evidence?.[0]?.quote || "No explicit quote recorded."}&rdquo;
                      </blockquote>
                    </div>

                    <div className="pt-3 border-t border-border-quiet flex items-center justify-between">
                      <span className="text-[10px] text-ink-ash">
                        Chapter {activeIssue.evidence?.[0]?.chapter || 1}
                      </span>
                      {activeIssue.evidence?.[0]?.chapter && (
                        <Link
                          href={`/projects/${projectId}/reader?chapter=${activeIssue.evidence[0].chapter}`}
                        >
                          <Button variant="ghost" size="xs" className="gap-1 text-ink-bone hover:text-ink-parchment">
                            <BookOpen className="w-3 h-3" />
                            <span>Read Chapter</span>
                          </Button>
                        </Link>
                      )}
                    </div>
                  </Surface>

                  {/* Evidence Folio B */}
                  <Surface
                    depth={1}
                    border="contradiction"
                    rounded="md"
                    className="p-5 space-y-3 flex flex-col justify-between bg-severity-contradiction/5"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-severity-contradiction/20 pb-2">
                        <Badge variant="contradiction" size="xs" className="font-mono">
                          Chapter {activeIssue.evidence?.[1]?.chapter || "Later"} (Conflict)
                        </Badge>
                        <span className="text-[10px] text-severity-contradiction font-medium">Conflicting statement</span>
                      </div>

                      <blockquote className="p-3.5 rounded-xl bg-surface-card border-l-2 border-severity-contradiction font-serif text-xs text-ink-parchment leading-relaxed italic shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                        &ldquo;{activeIssue.evidence?.[1]?.quote || "No explicit conflicting quote recorded."}&rdquo;
                      </blockquote>
                    </div>

                    <div className="pt-3 border-t border-border-quiet flex items-center justify-between">
                      <span className="text-[10px] text-ink-ash">
                        Chapter {activeIssue.evidence?.[1]?.chapter || 1}
                      </span>
                      {activeIssue.evidence?.[1]?.chapter && (
                        <Link
                          href={`/projects/${projectId}/editor?chapter=${activeIssue.evidence[1].chapter}`}
                        >
                          <Button variant="primary" size="xs" className="gap-1">
                            <PenTool className="w-3 h-3" />
                            <span>Edit in Manuscript</span>
                          </Button>
                        </Link>
                      )}
                    </div>
                  </Surface>
                </div>
              </div>

              {/* Authorial Arbitration & Decision Bar */}
              <Surface depth={2} border="subtle" rounded="md" className="p-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="font-serif text-sm font-medium text-ink-parchment">
                    How would you like to handle this?
                  </h3>
                  <p className="text-xs text-ink-bone">
                    Decide whether this is an accidental mistake to fix or a deliberate part of your story.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {/* Action 1: Accept Error */}
                  <button
                    onClick={() => handleSetStatus("accepted")}
                    disabled={isPatching}
                    className={`p-4 rounded-xl border text-left transition-all space-y-2 flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ${
                      activeIssue.status === "accepted"
                        ? "bg-severity-warning/20 border-severity-warning shadow-sm"
                        : "bg-surface-card border-border-subtle hover:border-severity-warning/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-severity-warning flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Story Mistake (Fix Later)</span>
                      </span>
                      {activeIssue.status === "accepted" && (
                        <Badge variant="warning" size="xs">Active</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-ash leading-relaxed">
                      Mark as an accidental inconsistency to correct in your manuscript.
                    </p>
                  </button>

                  {/* Action 2: Intentional Lore */}
                  <button
                    onClick={() => handleSetStatus("intentional")}
                    disabled={isPatching}
                    className={`p-4 rounded-xl border text-left transition-all space-y-2 flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ${
                      activeIssue.status === "intentional"
                        ? "bg-wine-accent/20 border-wine-accent shadow-sm"
                        : "bg-surface-card border-border-subtle hover:border-wine-accent/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-wine-crimson flex items-center gap-1.5">
                        <EyeOff className="w-4 h-4" />
                        <span>Intentional (Part of Plot)</span>
                      </span>
                      {activeIssue.status === "intentional" && (
                        <Badge variant="thread" size="xs">Active</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-ash leading-relaxed">
                      Deliberate choice: plot twist, unreliable narrator, character lie, or transformation.
                    </p>
                  </button>

                  {/* Action 3: Dismiss / False Positive */}
                  <button
                    onClick={() => handleSetStatus("rejected")}
                    disabled={isPatching}
                    className={`p-4 rounded-xl border text-left transition-all space-y-2 flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ${
                      activeIssue.status === "rejected"
                        ? "bg-surface-field border-border-focus shadow-sm"
                        : "bg-surface-card border-border-subtle hover:border-border-focus"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink-parchment flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-pine-moss" />
                        <span>Not an Issue (Dismiss)</span>
                      </span>
                      {activeIssue.status === "rejected" && (
                        <Badge variant="subtle" size="xs">Active</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-ash leading-relaxed">
                      Not a real contradiction. Dismiss this alert from your review queue.
                    </p>
                  </button>
                </div>

                {activeIssue.status !== "open" && (
                  <div className="pt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleSetStatus("open")}
                      className="text-xs text-ink-ash hover:text-ink-parchment"
                    >
                      Reopen Issue
                    </Button>
                  </div>
                )}
              </Surface>
            </motion.div>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center text-ink-ash">
              <div className="max-w-md space-y-2">
                <ShieldCheck className="w-12 h-12 mx-auto text-pine-moss" />
                <h3 className="font-serif text-base font-medium text-ink-parchment">
                  All Paradoxes Adjudicated
                </h3>
                <p className="text-xs text-ink-bone">
                  Select a flagged issue from the left queue to inspect side-by-side evidence diffs and AI hermeneutic reasoning.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}