"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, Upload } from "lucide-react";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ShelfRowProps {
  project: Project;
  index: number;
  /** When true, skip the entrance transform (reduced-motion users). */
  staticEntry?: boolean;
  onUploadClick: (project: Project) => void;
}

/** "12 Nov" — deterministic from the stored timestamp, no clock reads in render. */
function shortDate(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
    .toUpperCase();
}

/**
 * A manuscript's chapter spine: one hairline tick per chapter, oldest at the
 * bottom. It is the only shape on this page that encodes the story itself.
 */
function ChapterSpine({ chapters }: { chapters: number }) {
  const ticks = Math.min(Math.max(chapters, 0), 24);

  if (ticks === 0) {
    return (
      <div
        aria-hidden
        className="mt-1 h-12 w-[3px] rounded-full border-l border-dashed border-border-subtle"
      />
    );
  }

  return (
    <div aria-hidden className="mt-1 flex w-[10px] flex-col-reverse gap-[3px]">
      {Array.from({ length: ticks }).map((_, i) => (
        <span
          key={i}
          className="h-[3px] w-full rounded-full bg-border-prominent transition-colors duration-300 group-hover:bg-ink-faint"
        />
      ))}
    </div>
  );
}

export function ShelfRow({ project, index, staticEntry = false, onUploadClick }: ShelfRowProps) {
  const words = project.word_count || 0;
  const chapters = project.chapter_count || 0;
  const issues = project.open_issue_count || 0;
  const edited = shortDate(project.updated_at || project.created_at);
  const isProcessing = project.status === "processing";
  const hasFailed = project.status === "failed";

  return (
    <motion.div
      initial={staticEntry ? false : { opacity: 0, y: 10 }}
      animate={staticEntry ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.045, ease: "easeOut" }}
      className="group relative border-b border-border-quiet"
    >
      <div className="-mx-3 grid grid-cols-[auto_1fr_auto] items-start gap-4 rounded-xl px-3 py-4 transition-colors duration-300 hover:bg-surface-subtle/40 sm:gap-6 sm:py-5">
        <ChapterSpine chapters={chapters} />

        {/* Identity */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link
              href={`/projects/${project.id}`}
              className="truncate font-serif text-xl font-medium tracking-tight text-ink-parchment transition-colors duration-200 hover:text-white sm:text-2xl"
            >
              {project.title}
            </Link>
            {project.genre && (
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                {project.genre}
              </span>
            )}
            {isProcessing && (
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-severity-warning">
                <span className="h-1 w-1 animate-pulse rounded-full bg-severity-warning" />
                Reading
              </span>
            )}
            {hasFailed && (
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-severity-contradiction">
                Last run failed
              </span>
            )}
          </div>

          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-ash">
            {chapters > 0
              ? `${chapters} ${chapters === 1 ? "chapter" : "chapters"} on file`
              : "Not yet ingested"}
            {edited ? <span className="text-ink-faint"> · edited {edited}</span> : null}
          </p>

          <button
            type="button"
            onClick={() => onUploadClick(project)}
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-ink-parchment focus:outline-none focus-visible:text-ink-parchment"
          >
            <Upload className="h-3 w-3" />
            Import manuscript
          </button>
        </div>

        {/* Ledger + open */}
        <div className="flex shrink-0 items-center gap-5 sm:gap-8">
          <div className="hidden text-right sm:block">
            <div className="font-serif text-lg tabular-nums text-ink-parchment">
              {words.toLocaleString()}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
              words
            </div>
          </div>

          <div className="hidden text-right md:block">
            <div className="font-serif text-lg tabular-nums text-ink-parchment">{chapters}</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
              chapters
            </div>
          </div>

          <div className="w-[86px] text-right">
            {issues > 0 ? (
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-severity-contradiction">
                <span className="h-1 w-1 rounded-full bg-severity-contradiction" />
                {issues} open
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-severity-thread">
                <span className="h-1 w-1 rounded-full bg-severity-thread" />
                consistent
              </span>
            )}
          </div>

          <Link
            href={`/projects/${project.id}`}
            aria-label={`Open ${project.title}`}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-ink-ash",
              "transition-all duration-300 hover:border-border-prominent hover:bg-surface-card hover:text-ink-parchment",
              "focus:outline-none focus-visible:border-border-focus"
            )}
          >
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
