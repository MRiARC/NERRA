"use client";

import React, { use, useMemo, useState } from "react";
import Link from "next/link";
import { usePlotThreads } from "@/hooks/useStoryData";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader, SectionHeading } from "@/components/ui/PageHeader";
import { cn, getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";

interface PlotThreadsPageProps {
  params: Promise<{ id: string }>;
}

const GROUPS = [
  { id: "open", label: "Still running", note: "planted, not yet paid" },
  { id: "resolved", label: "Paid off", note: "the promise was kept" },
  { id: "abandoned", label: "Dropped", note: "planted and forgotten" },
  { id: "red_herring", label: "Red herrings", note: "planted on purpose" },
];

/**
 * Plot threads are Chekhov's guns: something planted, something paid. Each row
 * is drawn as a span across the book, and the ones still open simply run off
 * the edge of the page.
 */
export default function PlotThreadsPage({ params }: PlotThreadsPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const queryClient = useQueryClient();

  const { data: threads = [], isLoading } = usePlotThreads(projectId);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSetupChapter, setNewSetupChapter] = useState(1);
  const [newPayoffChapter, setNewPayoffChapter] = useState<number | "">("");
  const [newStatus, setNewStatus] = useState("open");
  const [newRelatedEntities, setNewRelatedEntities] = useState("");

  const filteredThreads = useMemo(() => {
    if (!searchQuery) return threads;
    const query = searchQuery.toLowerCase();
    return threads.filter(
      (thread) =>
        thread.title.toLowerCase().includes(query) ||
        thread.description.toLowerCase().includes(query) ||
        thread.related_entities?.some((entity) => entity.toLowerCase().includes(query))
    );
  }, [threads, searchQuery]);

  const groupedThreads = useMemo(() => {
    const map: Record<string, typeof threads> = {};
    for (const group of GROUPS) map[group.id] = [];
    for (const thread of filteredThreads) {
      const status = thread.status || "open";
      if (!map[status]) map[status] = [];
      map[status].push(thread);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.setup_chapter ?? 0) - (b.setup_chapter ?? 0));
    }
    return map;
  }, [filteredThreads]);

  const lastChapter = useMemo(
    () =>
      Math.max(
        1,
        ...threads.flatMap((thread) => [
          thread.setup_chapter ?? 0,
          thread.payoff_chapter ?? 0,
        ])
      ),
    [threads]
  );

  const openCount = threads.filter((thread) => (thread.status || "open") === "open").length;
  const droppedCount = threads.filter((thread) => thread.status === "abandoned").length;

  const handleSyncThreads = async () => {
    setIsSyncing(true);
    try {
      await api.story.syncPlotThreads(projectId);
      await queryClient.invalidateQueries({ queryKey: ["plot-threads", projectId] });
      toast.success("Threads re-read from the manuscript.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not re-read the threads."));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateStatus = async (threadId: string, nextStatus: string) => {
    try {
      await api.story.patchPlotThread(projectId, threadId, { status: nextStatus });
      await queryClient.invalidateQueries({ queryKey: ["plot-threads", projectId] });
      toast.success(`Marked as ${nextStatus.replace(/_/g, " ")}.`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not update that thread."));
    }
  };

  const handleCreateThread = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    setIsSubmitting(true);
    try {
      const entities = newRelatedEntities
        ? newRelatedEntities.split(",").map((entry) => entry.trim()).filter(Boolean)
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
      setIsAdding(false);
      setNewTitle("");
      setNewDescription("");
      setNewPayoffChapter("");
      setNewRelatedEntities("");
      toast.success("Planted.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not plant that thread."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Threads"
        title="What has been planted"
        line={
          threads.length === 0
            ? "No threads have been pulled out of the manuscript yet."
            : `${threads.length} threads. ${openCount} still running, ${droppedCount} left dangling. Every one of them is a promise to the reader.`
        }
        actions={
          <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.16em]">
            <button
              type="button"
              onClick={handleSyncThreads}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 text-ink-ash transition-colors hover:text-ink-parchment disabled:opacity-50"
            >
              {isSyncing && <Loader2 className="h-3 w-3 animate-spin text-wine-accent" />}
              {isSyncing ? "reading…" : "re-read the book"}
            </button>
            <button
              type="button"
              onClick={() => setIsAdding((open) => !open)}
              className={cn(
                "border-b pb-1 transition-colors",
                isAdding
                  ? "border-wine-crimson text-ink-parchment"
                  : "border-transparent text-ink-faint hover:text-ink-ash"
              )}
            >
              plant one
            </button>
          </div>
        }
      />

      {/* Cross-Chapter Plot Threads In-Flight Banner */}
      {isSyncing && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-elevated/40 p-4 font-mono text-xs text-ink-bone">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-wine-accent" />
          <p className="leading-relaxed">
            <span className="text-[10px] uppercase tracking-[0.16em] text-wine-accent font-semibold">
              Synthesizing Threads ·{" "}
            </span>
            Traversing all manuscript chapters with AI to identify planted promises, foreshadowing, and payoffs…
          </p>
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleCreateThread} className="mt-6 border-y border-border-quiet py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                What was planted
              </span>
              <input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                required
                placeholder="The locked east wing"
                className="mt-1 w-full border-0 border-b border-border-quiet bg-transparent pb-1.5 font-serif text-[15px] text-ink-parchment placeholder:text-ink-faint focus:border-border-prominent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                Who or what it touches
              </span>
              <input
                value={newRelatedEntities}
                onChange={(event) => setNewRelatedEntities(event.target.value)}
                placeholder="Mira, the house, the ledger"
                className="mt-1 w-full border-0 border-b border-border-quiet bg-transparent pb-1.5 font-serif text-[15px] text-ink-parchment placeholder:text-ink-faint focus:border-border-prominent focus:outline-none"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
              What it promises
            </span>
            <textarea
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              required
              rows={2}
              placeholder="A door that has been shut since the fire, and a key nobody admits to keeping."
              className="mt-1 w-full resize-none border-0 border-b border-border-quiet bg-transparent pb-1.5 font-serif text-[15px] leading-relaxed text-ink-parchment placeholder:text-ink-faint focus:border-border-prominent focus:outline-none"
            />
          </label>

          <div className="mt-4 flex flex-wrap items-end gap-6">
            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                Planted in
              </span>
              <input
                type="number"
                min={1}
                value={newSetupChapter}
                onChange={(event) => setNewSetupChapter(Number(event.target.value))}
                className="mt-1 w-16 border-0 border-b border-border-quiet bg-transparent pb-1 font-mono text-[13px] text-ink-parchment focus:border-border-prominent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                Paid off in
              </span>
              <input
                type="number"
                min={1}
                value={newPayoffChapter}
                onChange={(event) =>
                  setNewPayoffChapter(event.target.value === "" ? "" : Number(event.target.value))
                }
                placeholder="—"
                className="mt-1 w-16 border-0 border-b border-border-quiet bg-transparent pb-1 font-mono text-[13px] text-ink-parchment placeholder:text-ink-faint focus:border-border-prominent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                Fate
              </span>
              <select
                value={newStatus}
                onChange={(event) => setNewStatus(event.target.value)}
                className="mt-1 block cursor-pointer bg-transparent font-mono text-[11px] uppercase tracking-[0.12em] text-ink-ash focus:outline-none"
              >
                {GROUPS.map((group) => (
                  <option key={group.id} value={group.id} className="bg-surface-elevated">
                    {group.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ml-auto border-b border-wine-crimson pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-parchment transition-colors hover:text-wine-crimson disabled:opacity-50"
            >
              {isSubmitting ? "planting…" : "plant it"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 flex items-center justify-between gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search a thread, a name, a promise"
          className="w-64 border-0 border-b border-border-quiet bg-transparent pb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-parchment placeholder:text-ink-faint focus:border-border-prominent focus:outline-none"
        />
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
          the book runs to ch. {String(lastChapter).padStart(2, "0")}
        </p>
      </div>

      {isLoading ? (
        <p className="py-24 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          Following the threads…
        </p>
      ) : threads.length === 0 ? (
        <div className="mt-10 border-t border-dashed border-border-subtle py-20 text-center">
          <p className="font-serif text-xl text-ink-parchment">Nothing planted yet.</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Threads appear as chapters are read — or plant one yourself
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {GROUPS.map((group) => {
            const groupThreads = groupedThreads[group.id] || [];
            if (groupThreads.length === 0) return null;

            return (
              <section key={group.id}>
                <SectionHeading
                  label={group.label}
                  meta={
                    <span>
                      {groupThreads.length} · {group.note}
                    </span>
                  }
                />
                <ul>
                  {groupThreads.map((thread) => {
                    const setup = thread.setup_chapter ?? 1;
                    const payoff = thread.payoff_chapter ?? null;
                    const startPercent = Math.min(100, ((setup - 1) / lastChapter) * 100);
                    const endPercent = payoff
                      ? Math.min(100, ((payoff - 1) / lastChapter) * 100)
                      : 100;

                    return (
                      <li key={thread.id} className="border-b border-border-quiet py-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                          <h3 className="font-serif text-[16px] text-ink-parchment">
                            {thread.title}
                          </h3>
                          <select
                            value={thread.status || "open"}
                            onChange={(event) => handleUpdateStatus(thread.id, event.target.value)}
                            aria-label={`Change the fate of ${thread.title}`}
                            className="cursor-pointer bg-transparent font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint focus:outline-none"
                          >
                            {GROUPS.map((option) => (
                              <option key={option.id} value={option.id} className="bg-surface-elevated">
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <p className="mt-1 max-w-[75ch] font-serif text-[14px] leading-relaxed text-ink-bone">
                          {thread.description}
                        </p>

                        {thread.related_entities?.length > 0 && (
                          <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                            {thread.related_entities.join(" · ")}
                          </p>
                        )}

                        {/* The span */}
                        <div className="mt-3 flex items-center gap-3">
                          <span className="w-10 shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                            ch.{setup}
                          </span>
                          <div className="relative h-px flex-1 bg-border-quiet">
                            <span
                              className={cn(
                                "absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full",
                                group.id === "resolved"
                                  ? "bg-pine-moss"
                                  : group.id === "abandoned"
                                  ? "bg-wine-crimson"
                                  : "bg-wine-accent"
                              )}
                              style={{ left: `${startPercent}%` }}
                            />
                            {payoff ? (
                              <>
                                <span
                                  className="absolute top-1/2 h-px -translate-y-1/2 bg-border-prominent"
                                  style={{
                                    left: `${startPercent}%`,
                                    right: `${100 - endPercent}%`,
                                  }}
                                />
                                <span
                                  className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-ink-bone"
                                  style={{ left: `${endPercent}%` }}
                                />
                              </>
                            ) : (
                              <span
                                className="absolute top-1/2 h-px -translate-y-1/2 border-t border-dashed border-border-prominent"
                                style={{ left: `${startPercent}%`, right: 0 }}
                              />
                            )}
                          </div>
                          {payoff ? (
                            <span className="w-10 shrink-0 text-right font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                              ch.{payoff}
                            </span>
                          ) : (
                            <span className="w-10 shrink-0 text-right font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                              open
                            </span>
                          )}
                        </div>

                        {thread.evidence_quote && (
                          <p className="mt-3 max-w-[75ch] border-l border-border-quiet pl-3 font-serif text-[13px] italic leading-relaxed text-ink-ash">
                            &ldquo;{thread.evidence_quote}&rdquo;
                          </p>
                        )}

                        <Link
                          href={`/projects/${projectId}/reader?chapter=${setup}`}
                          className="mt-2.5 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-ink-parchment"
                        >
                          where it is planted
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
