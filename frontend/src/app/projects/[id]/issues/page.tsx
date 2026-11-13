"use client";

import React, { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useIssues } from "@/hooks/useStoryData";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import { ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface IssuesPageProps {
  params: Promise<{ id: string }>;
}

const DECISIONS = [
  {
    id: "accepted" as const,
    label: "A mistake to fix",
    hint: "An accident of drafting. It stays on the list until the manuscript changes.",
  },
  {
    id: "intentional" as const,
    label: "Intentional",
    hint: "A twist, a lie, an unreliable memory. Recorded as yours, not an error.",
  },
  {
    id: "rejected" as const,
    label: "Not an issue",
    hint: "The checker misread the page. Dismiss it from the queue.",
  },
];

/**
 * An editor's desk for contradictions: the queue on the left, the case file on
 * the right, and three honest decisions instead of alarm cards.
 */
export default function IssuesPage({ params }: IssuesPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const queryClient = useQueryClient();

  const { data: issues = [], isLoading, refetch } = useIssues(projectId);

  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("open");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isReasoning, setIsReasoning] = useState(false);
  const [isPatching, setIsPatching] = useState(false);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (selectedSeverity !== "all" && issue.severity !== selectedSeverity) return false;
      if (selectedStatus !== "all" && issue.status !== selectedStatus) return false;
      if (selectedType !== "all" && issue.type !== selectedType) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const descMatch = issue.description.toLowerCase().includes(query);
        const evidenceMatch = issue.evidence?.some((item) => item.quote.toLowerCase().includes(query));
        const entityMatch = issue.related_entities?.some((name) => name.toLowerCase().includes(query));
        if (!descMatch && !evidenceMatch && !entityMatch) return false;
      }
      return true;
    });
  }, [issues, selectedSeverity, selectedStatus, selectedType, searchQuery]);

  const activeIssue = useMemo(() => {
    if (selectedIssueId) return issues.find((issue) => issue.id === selectedIssueId) || null;
    return filteredIssues[0] || null;
  }, [issues, filteredIssues, selectedIssueId]);

  const openIssues = issues.filter((issue) => issue.status === "open");
  const redCount = openIssues.filter((issue) => issue.severity === "red").length;
  const yellowCount = openIssues.filter((issue) => issue.severity === "yellow").length;
  const intentionalCount = issues.filter((issue) => issue.status === "intentional").length;
  const types = Array.from(new Set(issues.map((issue) => issue.type).filter(Boolean)));

  const handleSetStatus = async (status: "open" | "accepted" | "rejected" | "intentional") => {
    if (!activeIssue) return;
    setIsPatching(true);
    try {
      await api.story.patchIssue(projectId, activeIssue.id, status);
      await queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });

      const labels: Record<string, string> = {
        accepted: "Marked as a slip to fix.",
        intentional: "Kept as intentional.",
        rejected: "Dismissed.",
        open: "Back in the queue.",
      };
      toast.success(labels[status]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not update that issue."));
    } finally {
      setIsPatching(false);
    }
  };

  const handleTriggerReasoning = async () => {
    if (!activeIssue) return;
    setIsReasoning(true);
    try {
      await api.story.reasonIssue(projectId, activeIssue.id);
      await queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
      toast.success("The checker has written its reading.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not analyze that issue."));
    } finally {
      setIsReasoning(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 sm:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Consistency"
        title="Where the book contradicts itself"
        line={
          issues.length === 0
            ? "Nothing has been flagged yet."
            : `${openIssues.length} open ${openIssues.length === 1 ? "question" : "questions"} — ${
                redCount
              } that pull the story apart, ${yellowCount} worth a quiet look. ${
                intentionalCount > 0 ? `${intentionalCount} kept on purpose.` : ""
              }`
        }
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-ash transition-colors hover:text-ink-parchment"
          >
            <RefreshCw className="h-3 w-3" />
            Re-read
          </button>
        }
      />

      {/* Queue filters */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.16em]">
          {[
            { id: "open", label: `open ${openIssues.length}` },
            { id: "intentional", label: `intentional ${intentionalCount}` },
            { id: "all", label: `all ${issues.length}` },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setSelectedStatus(filter.id)}
              aria-pressed={selectedStatus === filter.id}
              className={cn(
                "border-b pb-1 transition-colors",
                selectedStatus === filter.id
                  ? "border-wine-crimson text-ink-parchment"
                  : "border-transparent text-ink-faint hover:text-ink-ash"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
          <select
            value={selectedSeverity}
            onChange={(event) => setSelectedSeverity(event.target.value)}
            aria-label="Filter by severity"
            className="cursor-pointer bg-transparent text-ink-ash focus:outline-none"
          >
            <option value="all" className="bg-surface-elevated">
              any weight
            </option>
            <option value="red" className="bg-surface-elevated">
              pulls apart
            </option>
            <option value="yellow" className="bg-surface-elevated">
              worth a look
            </option>
            <option value="blue" className="bg-surface-elevated">
              style
            </option>
          </select>
          <select
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
            aria-label="Filter by kind"
            className="cursor-pointer bg-transparent text-ink-ash focus:outline-none"
          >
            <option value="all" className="bg-surface-elevated">
              every kind
            </option>
            {types.map((type) => (
              <option key={type} value={type} className="bg-surface-elevated">
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="search the pages"
            className="w-48 border-0 border-b border-border-quiet bg-transparent pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-parchment placeholder:text-ink-faint focus:border-border-prominent focus:outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="py-24 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          Reading the manuscript for slips…
        </p>
      ) : issues.length === 0 ? (
        <div className="mt-10 border-t border-dashed border-border-subtle py-20 text-center">
          <p className="font-serif text-xl text-ink-parchment">Nothing contradicting itself.</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            The checker will speak up after the book is read
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Queue */}
          <div className="lg:border-r lg:border-border-quiet lg:pr-8">
            <ol className="divide-y divide-border-quiet">
              {filteredIssues.map((issue, index) => {
                const isActive = activeIssue?.id === issue.id;
                return (
                  <li key={issue.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedIssueId(issue.id)}
                      className={cn(
                        "flex w-full items-start gap-3 py-3 text-left transition-colors",
                        isActive ? "opacity-100" : "opacity-80 hover:opacity-100"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          issue.severity === "red"
                            ? "bg-severity-contradiction"
                            : issue.severity === "yellow"
                            ? "bg-severity-warning"
                            : "bg-border-prominent"
                        )}
                      />
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block font-serif text-[14px] leading-snug",
                            isActive ? "text-ink-parchment" : "text-ink-bone"
                          )}
                        >
                          {issue.description}
                        </span>
                        <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                          {String(index + 1).padStart(2, "0")} ·{" "}
                          {(issue.type || "issue").replace(/_/g, " ")}
                          {issue.evidence?.[0]?.chapter
                            ? ` · ch. ${issue.evidence[0].chapter}`
                            : ""}
                          {issue.status !== "open" ? ` · ${issue.status}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {filteredIssues.length === 0 && (
              <p className="py-12 font-serif text-[14px] italic text-ink-ash">
                Nothing matches those filters.
              </p>
            )}
          </div>

          {/* Case file */}
          {activeIssue ? (
            <article>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">
                Case · {(activeIssue.type || "issue").replace(/_/g, " ")} ·{" "}
                {activeIssue.severity === "red"
                  ? "pulls the story apart"
                  : activeIssue.severity === "yellow"
                  ? "worth a look"
                  : "a matter of style"}
                {activeIssue.status !== "open" && ` · ${activeIssue.status}`}
              </p>

              <h2 className="mt-3 font-serif text-2xl leading-snug text-ink-parchment">
                {activeIssue.description}
              </h2>

              {(activeIssue.related_entities?.length ?? 0) > 0 && (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-ash">
                  {activeIssue.related_entities?.join(" · ")}
                </p>
              )}

              {/* The two pages */}
              <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-6">
                {[0, 1].map((slot) => {
                  const evidence = activeIssue.evidence?.[slot];
                  return (
                    <div
                      key={slot}
                      className={cn(
                        "border-t pt-4",
                        slot === 1
                          ? "border-severity-contradiction/50"
                          : "border-border-prominent"
                      )}
                    >
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                        {slot === 0 ? "As it was first said" : "As it is said later"} ·{" "}
                        {evidence?.chapter ? `chapter ${evidence.chapter}` : "unrecorded"}
                      </p>
                      <blockquote
                        className={cn(
                          "mt-3 font-serif text-[15px] italic leading-relaxed",
                          slot === 1 ? "text-ink-parchment" : "text-ink-bone"
                        )}
                      >
                        {evidence?.quote ? `“${evidence.quote}”` : "No quote was recorded for this side."}
                      </blockquote>
                      {evidence?.chapter && (
                        <Link
                          href={`/projects/${projectId}/reader?chapter=${evidence.chapter}`}
                          className="mt-3 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-ink-parchment"
                        >
                          Read it in place
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* The checker's reading */}
              <div className="mt-8 border-t border-border-quiet pt-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                    The checker&apos;s reading
                  </p>
                  <button
                    type="button"
                    onClick={handleTriggerReasoning}
                    disabled={isReasoning}
                    className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-ash transition-colors hover:text-ink-parchment disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-3 w-3", isReasoning && "animate-spin")} />
                    {activeIssue.ai_reasoning ? "Read again" : "Ask it to explain"}
                  </button>
                </div>
                <p className="mt-3 max-w-[70ch] border-l border-border-quiet pl-4 font-serif text-[14px] leading-relaxed text-ink-bone">
                  {activeIssue.ai_reasoning ||
                    "The checker hasn't explained this one yet. Ask it to read both passages against the story bible."}
                </p>
              </div>

              {/* Decision */}
              <div className="mt-8 border-t border-border-prominent pt-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                  Your call
                </p>
                <div className="mt-3">
                  {DECISIONS.map((decision) => {
                    const isCurrent = activeIssue.status === decision.id;
                    return (
                      <button
                        key={decision.id}
                        type="button"
                        onClick={() => handleSetStatus(decision.id)}
                        disabled={isPatching}
                        className={cn(
                          "flex w-full items-baseline justify-between gap-6 border-b border-border-quiet py-3 text-left transition-colors disabled:opacity-50",
                          isCurrent ? "text-ink-parchment" : "text-ink-bone hover:text-ink-parchment"
                        )}
                      >
                        <span className="min-w-0">
                          <span className="font-serif text-[15px]">{decision.label}</span>
                          <span className="ml-3 text-[13px] text-ink-ash">{decision.hint}</span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 font-mono text-[9px] uppercase tracking-[0.16em]",
                            isCurrent ? "text-wine-crimson" : "text-ink-faint"
                          )}
                        >
                          {isCurrent ? "chosen" : "choose"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {activeIssue.status !== "open" && (
                  <button
                    type="button"
                    onClick={() => handleSetStatus("open")}
                    disabled={isPatching}
                    className="mt-4 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint underline decoration-border-subtle underline-offset-4 transition-colors hover:text-ink-parchment"
                  >
                    Put it back in the queue
                  </button>
                )}
              </div>
            </article>
          ) : (
            <p className="py-16 font-serif text-[15px] italic leading-relaxed text-ink-ash">
              Pick a question from the queue to read both sides of it.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
