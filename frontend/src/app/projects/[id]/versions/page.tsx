"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { useVersions, useProject, useManuscripts } from "@/hooks/useStoryData";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  History,
  GitCommit,
  Clock,
  Layers,
  ArrowRight,
  BookOpen,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface VersionsPageProps {
  params: Promise<{ id: string }>;
}

export default function VersionsPage({ params }: VersionsPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { data: project } = useProject(projectId);
  const { data: manuscripts = [] } = useManuscripts(projectId);
  const { data: versions = [], isLoading } = useVersions(projectId);

  const activeManuscript = manuscripts[0];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
      {/* Header & Mission Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border-subtle pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-ink-ash font-medium">
              Manuscript Snapshot Tree
            </span>
            <span className="text-border-subtle">•</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-pine-forest">
              <span className="w-1.5 h-1.5 rounded-full bg-pine-forest" />
              Content-Addressed Version Ledger
            </span>
          </div>
          <h1 className="text-3xl font-serif font-normal tracking-tight text-ink-parchment flex items-center gap-3">
            <History className="w-7 h-7 text-wine-accent" />
            Version History &amp; Draft Snapshots
          </h1>
          <p className="text-sm text-ink-ash max-w-2xl leading-relaxed">
            Every manuscript import, chapter revision, and structural rewrite is hashed and stored with full diff summaries. Inspect how continuity evolves across draft iterations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/editor`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-card hover:bg-surface-elevated border border-border-subtle text-xs font-mono text-ink-parchment transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-wine-accent" />
            Open Current Folio
          </Link>
        </div>
      </div>

      {/* Main Stream */}
      {isLoading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-wine-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-ink-ash">Traversing manuscript hash chain...</p>
        </div>
      ) : versions.length === 0 ? (
        <Surface depth={2} border="subtle" className="p-12 text-center rounded-2xl max-w-xl mx-auto space-y-4">
          <History className="w-10 h-10 text-ink-ash mx-auto opacity-50" />
          <h3 className="font-serif text-lg text-ink-parchment">Initial Draft Active</h3>
          <p className="text-xs text-ink-ash leading-relaxed">
            Your manuscript is currently on its initial parsed revision.
            When you import a revised draft or edit chapters in the editor, incremental snapshots will be recorded here automatically.
          </p>
          <div className="pt-2 font-mono text-xs text-ink-ash bg-surface-subtle p-3 rounded-lg border border-border-quiet inline-block">
            Current Manuscript ID: {activeManuscript?.id || "Initial"}
          </div>
        </Surface>
      ) : (
        <div className="relative pl-6 sm:pl-8 border-l border-border-subtle space-y-6 my-4 ml-4">
          {versions.map((ver, idx) => {
            const isLatest = idx === 0;

            return (
              <motion.div
                key={ver.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: idx * 0.04 }}
                className="relative group"
              >
                {/* Node Pip */}
                <div
                  className={cn(
                    "absolute -left-[31px] sm:-left-[39px] top-4 w-3.5 h-3.5 rounded-full border-2 transition-transform duration-200 group-hover:scale-125",
                    isLatest
                      ? "bg-pine-forest border-surface-void"
                      : "bg-surface-elevated border-border-subtle"
                  )}
                />

                <Surface
                  depth={2}
                  border={isLatest ? "prominent" : "subtle"}
                  className="p-5 rounded-xl space-y-4 hover:border-border-prominent transition-all duration-150"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-surface-subtle text-ink-parchment border border-border-quiet">
                        Draft v{ver.version_number}
                      </span>
                      {isLatest && (
                        <span className="font-mono text-[11px] text-pine-forest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-pine-forest" />
                          Current Working Draft
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px] text-ink-ash">
                      <Clock className="w-3.5 h-3.5 text-ink-faint" />
                      <span>{new Date(ver.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-mono text-ink-ash">
                      SHA256 Content Hash: <span className="text-ink-parchment font-mono">{ver.content_hash.slice(0, 16)}...</span>
                    </p>
                    {ver.diff_summary && Object.keys(ver.diff_summary).length > 0 && (
                      <pre className="text-[11px] font-mono text-ink-bone bg-surface-void p-3 rounded-lg border border-border-quiet overflow-x-auto max-h-32 mt-2">
                        {JSON.stringify(ver.diff_summary, null, 2)}
                      </pre>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border-quiet flex items-center justify-between text-xs font-mono">
                    <span className="text-ink-faint">Immutable Snapshot</span>
                    <Link
                      href={`/projects/${projectId}/reader`}
                      className="text-wine-accent hover:text-ink-parchment flex items-center gap-1 transition-colors"
                    >
                      Inspect in Reader <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </Surface>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
