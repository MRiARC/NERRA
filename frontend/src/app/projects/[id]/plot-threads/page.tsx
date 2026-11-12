"use client";

import React, { useState, use, useMemo } from "react";
import Link from "next/link";
import { usePlotThreads, useProject } from "@/hooks/useStoryData";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  GitPullRequest,
  Plus,
  RefreshCw,
  Search,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  HelpCircle,
  Tag,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import type { PlotThread } from "@/lib/types";

interface PlotThreadsPageProps {
  params: Promise<{ id: string }>;
}

const COLUMNS = [
  { id: "open", label: "Open & Developing", dot: "bg-wine-accent", border: "border-wine-accent/30" },
  { id: "resolved", label: "Paid Off / Resolved", dot: "bg-pine-forest", border: "border-pine-forest/30" },
  { id: "abandoned", label: "Dropped / Forgotten", dot: "bg-wine-crimson", border: "border-wine-crimson/30" },
  { id: "red_herring", label: "Red Herring", dot: "bg-amber-400", border: "border-amber-400/30" },
];

export default function PlotThreadsPage({ params }: PlotThreadsPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const queryClient = useQueryClient();

  const { data: project } = useProject(projectId);
  const { data: threads = [], isLoading } = usePlotThreads(projectId);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddingModal, setIsAddingModal] = useState(false);

  // New thread form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSetupChapter, setNewSetupChapter] = useState(1);
  const [newPayoffChapter, setNewPayoffChapter] = useState<number | "">("");
  const [newStatus, setNewStatus] = useState("open");
  const [newRelatedEntities, setNewRelatedEntities] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered threads
  const filteredThreads = useMemo(() => {
    if (!searchQuery) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.related_entities?.some((e) => e.toLowerCase().includes(q))
    );
  }, [threads, searchQuery]);

  // Group threads by status
  const groupedThreads = useMemo(() => {
    const map: Record<string, PlotThread[]> = {
      open: [],
      resolved: [],
      abandoned: [],
      red_herring: [],
    };
    for (const t of filteredThreads) {
      const st = t.status || "open";
      if (!map[st]) map[st] = [];
      map[st].push(t);
    }
    return map;
  }, [filteredThreads]);

  // Handle cross-chapter synthesis
  const handleSyncThreads = async () => {
    setIsSyncing(true);
    try {
      await api.story.syncPlotThreads(projectId);
      await queryClient.invalidateQueries({ queryKey: ["plot-threads", projectId] });
      toast.success("Cross-chapter plot threads synthesized from manuscript.");
    } catch (err: any) {
      toast.error(err.message || "Failed to sync plot threads.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle status update
  const handleUpdateStatus = async (threadId: string, nextStatus: string) => {
    try {
      await api.story.patchPlotThread(projectId, threadId, { status: nextStatus });
      await queryClient.invalidateQueries({ queryKey: ["plot-threads", projectId] });
      toast.success(`Plot thread marked as ${nextStatus}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update plot thread.");
    }
  };

  // Handle add thread
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    setIsSubmitting(true);
    try {
      const entities = newRelatedEntities
        ? newRelatedEntities.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      await api.story.createPlotThread(projectId, {
        title: newTitle.trim(),
        description: newDescription.trim(),
        setup_chapter: Number(newSetupChapter) || 1,
        payoff_chapter: newPayoffChapter ? Number(newPayoffChapter) : null,
        status: newStatus,
        related_entities: entities,
      });

      await queryClient.invalidateQueries({ queryKey: ["plot-threads", projectId] });
      setIsAddingModal(false);
      setNewTitle("");
      setNewDescription("");
      setNewRelatedEntities("");
      toast.success("Plot thread registered into narrative canon.");
    } catch (err: any) {
      toast.error(err.message || "Failed to create plot thread.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
      {/* Header & Mission Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border-subtle pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-ink-ash font-medium">
              Narrative Arcs &amp; Payoff Engine
            </span>
            <span className="text-border-subtle">•</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-pine-forest">
              <span className="w-1.5 h-1.5 rounded-full bg-pine-forest" />
              {threads.length} Plot Threads Tracked
            </span>
          </div>
          <h1 className="text-3xl font-serif font-normal tracking-tight text-ink-parchment flex items-center gap-3">
            <GitPullRequest className="w-7 h-7 text-wine-accent" />
            Plot Threads &amp; Chekhov Guns
          </h1>
          <p className="text-sm text-ink-ash max-w-2xl leading-relaxed">
            Track setup-and-payoff arcs across chapters. Ensure planted clues pay off, mysteries resolve with satisfying catharsis, and unfulfilled promises are eliminated before printing.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncThreads}
            disabled={isSyncing}
            className="gap-2 font-mono text-xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
            {isSyncing ? "Synthesizing..." : "Cross-Chapter AI Synthesis"}
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddingModal(true)}
            className="gap-2 font-mono text-xs bg-wine-accent text-ink-parchment hover:bg-wine-crimson"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Plot Thread
          </Button>
        </div>
      </div>

      {/* Control Deck */}
      <Surface depth={1} border="quiet" className="p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-ink-ash absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search plot threads, setups, entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-surface-card border border-border-subtle rounded-lg pl-8 pr-3 py-1.5 text-xs text-ink-parchment placeholder:text-ink-faint outline-none focus:border-wine-accent w-72"
          />
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-ink-ash">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-wine-accent" /> Open: {groupedThreads.open.length}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pine-forest" /> Resolved: {groupedThreads.resolved.length}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-wine-crimson" /> Dropped: {groupedThreads.abandoned.length}
          </span>
        </div>
      </Surface>

      {/* Add Thread Modal */}
      {isAddingModal && (
        <Surface depth={2} border="focus" className="p-6 rounded-xl space-y-4 animate-fade-in border-wine-accent/40">
          <div className="flex items-center justify-between border-b border-border-quiet pb-3">
            <h3 className="font-serif text-base font-medium text-ink-parchment">
              Register New Narrative Thread
            </h3>
            <button
              onClick={() => setIsAddingModal(false)}
              className="text-xs font-mono text-ink-ash hover:text-ink-parchment"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateThread} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-ash mb-1">
                  Thread Title / Mystery
                </label>
                <input
                  type="text"
                  placeholder="e.g., The Secret Will in the Study Desk"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-surface-subtle border border-border-subtle rounded-lg px-3 py-2 text-xs text-ink-parchment outline-none focus:border-wine-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-ash mb-1">
                  Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-surface-subtle border border-border-subtle rounded-lg px-3 py-2 text-xs text-ink-parchment outline-none focus:border-wine-accent"
                >
                  <option value="open">Open &amp; Developing</option>
                  <option value="resolved">Resolved / Paid Off</option>
                  <option value="abandoned">Dropped / Forgotten</option>
                  <option value="red_herring">Red Herring</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-ash mb-1">
                Narrative Premise &amp; Dramatic Stakes
              </label>
              <textarea
                rows={3}
                placeholder="Explain the initial setup, what promise was made to the reader, and expected payoff..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full bg-surface-subtle border border-border-subtle rounded-lg p-3 text-xs text-ink-parchment outline-none focus:border-wine-accent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-ash mb-1">
                  Setup Chapter
                </label>
                <input
                  type="number"
                  min={1}
                  value={newSetupChapter}
                  onChange={(e) => setNewSetupChapter(Number(e.target.value))}
                  className="w-full bg-surface-subtle border border-border-subtle rounded-lg px-3 py-2 text-xs text-ink-parchment outline-none focus:border-wine-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-ash mb-1">
                  Payoff Chapter (Optional)
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="e.g., 6"
                  value={newPayoffChapter}
                  onChange={(e) =>
                    setNewPayoffChapter(e.target.value ? Number(e.target.value) : "")
                  }
                  className="w-full bg-surface-subtle border border-border-subtle rounded-lg px-3 py-2 text-xs text-ink-parchment outline-none focus:border-wine-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-ash mb-1">
                  Related Entities (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="Julian, Clara, Cedar Box"
                  value={newRelatedEntities}
                  onChange={(e) => setNewRelatedEntities(e.target.value)}
                  className="w-full bg-surface-subtle border border-border-subtle rounded-lg px-3 py-2 text-xs text-ink-parchment outline-none focus:border-wine-accent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !newTitle.trim()}
                className="bg-wine-accent text-ink-parchment hover:bg-wine-crimson"
              >
                {isSubmitting ? "Registering..." : "Record Thread"}
              </Button>
            </div>
          </form>
        </Surface>
      )}

      {/* Main Kanban Board (4 Columns) */}
      {isLoading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-wine-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-ink-ash">Synthesizing narrative promise arcs...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {COLUMNS.map((col) => {
            const columnThreads = groupedThreads[col.id] || [];

            return (
              <div key={col.id} className="space-y-4">
                {/* Column Header */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-card border border-border-quiet">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", col.dot)} />
                    <h3 className="font-mono text-xs font-semibold text-ink-parchment uppercase tracking-wider">
                      {col.label}
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-ink-ash px-2 py-0.5 rounded bg-surface-subtle border border-border-quiet">
                    {columnThreads.length}
                  </span>
                </div>

                {/* Column Thread Cards */}
                <div className="space-y-3 min-h-[300px]">
                  {columnThreads.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-border-quiet text-center">
                      <p className="text-xs font-mono text-ink-faint">No threads in this stage</p>
                    </div>
                  ) : (
                    columnThreads.map((thread) => (
                      <Surface
                        key={thread.id}
                        depth={2}
                        border="subtle"
                        className="p-4 rounded-xl space-y-3 hover:border-border-prominent transition-all duration-150 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-subtle border border-border-quiet text-ink-parchment font-semibold">
                              Ch. {thread.setup_chapter}
                              {thread.payoff_chapter
                                ? ` → Ch. ${thread.payoff_chapter}`
                                : " → Unresolved"}
                            </span>

                            <select
                              value={thread.status || "open"}
                              onChange={(e) => handleUpdateStatus(thread.id, e.target.value)}
                              className="bg-surface-subtle border border-border-quiet rounded text-[10px] font-mono text-ink-ash outline-none px-1.5 py-0.5 cursor-pointer"
                            >
                              <option value="open">Open</option>
                              <option value="resolved">Resolved</option>
                              <option value="abandoned">Abandoned</option>
                              <option value="red_herring">Red Herring</option>
                            </select>
                          </div>

                          <h4 className="text-sm font-serif font-medium text-ink-parchment leading-snug">
                            {thread.title}
                          </h4>

                          <p className="text-xs font-sans text-ink-ash leading-relaxed line-clamp-3">
                            {thread.description}
                          </p>

                          {/* Related Entities */}
                          {thread.related_entities && thread.related_entities.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {thread.related_entities.map((e, idx) => (
                                <span
                                  key={idx}
                                  className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-subtle border border-border-quiet text-ink-bone"
                                >
                                  {e}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Evidence Quote */}
                          {thread.evidence_quote && (
                            <p className="text-[11px] font-serif italic text-ink-faint bg-surface-subtle p-2 rounded border-l border-wine-accent">
                              &ldquo;{thread.evidence_quote}&rdquo;
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-border-quiet flex items-center justify-between text-xs font-mono">
                          <Link
                            href={`/projects/${projectId}/reader?chapter=${thread.setup_chapter}`}
                            className="text-[10px] text-wine-accent hover:text-ink-parchment flex items-center gap-1 transition-colors"
                          >
                            Read Setup <ArrowRight className="w-2.5 h-2.5" />
                          </Link>

                          {thread.payoff_chapter && (
                            <Link
                              href={`/projects/${projectId}/reader?chapter=${thread.payoff_chapter}`}
                              className="text-[10px] text-pine-forest hover:text-ink-parchment flex items-center gap-1 transition-colors"
                            >
                              Read Payoff <ArrowRight className="w-2.5 h-2.5" />
                            </Link>
                          )}
                        </div>
                      </Surface>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
