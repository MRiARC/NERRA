"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  line?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * The dossier masthead used by every workspace page: mono eyebrow, display
 * serif title, one plain-language line, actions on the right.
 */
export function PageHeader({ eyebrow, title, line, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("border-b border-border-quiet pb-6", className)}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-ash">{eyebrow}</p>
          <h1 className="mt-3 font-serif text-[clamp(1.6rem,3vw,2.25rem)] font-medium leading-[1.15] tracking-tight text-ink-parchment">
            {title}
          </h1>
          {line ? (
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-bone">{line}</p>
          ) : null}
        </div>

        {actions ? <div className="flex shrink-0 items-center gap-2.5">{actions}</div> : null}
      </div>
    </header>
  );
}

interface SectionHeadingProps {
  label: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** A section label as a rule with mono capitals, not a card title. */
export function SectionHeading({ label, meta, action, className }: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border-quiet pb-2",
        className
      )}
    >
      <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-ash">{label}</h2>
      <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
        {meta}
        {action}
      </div>
    </div>
  );
}
