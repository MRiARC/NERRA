"use client";

import React, { use } from "react";
import Link from "next/link";
import {
  useProject,
  useCustomization,
  useManuscripts,
  useIssues,
  useSystemHealth,
} from "@/hooks/useStoryData";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Activity,
  Cpu,
  Database,
  Layers,
  Zap,
  Clock,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { cn, formatWords } from "@/lib/utils";

interface TelemetryPageProps {
  params: Promise<{ id: string }>;
}

export default function TelemetryPage({ params }: TelemetryPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: customization } = useCustomization(projectId);
  const { data: manuscripts = [] } = useManuscripts(projectId);
  const { data: issues = [] } = useIssues(projectId);
  const { data: health } = useSystemHealth();

  const activeManuscript = manuscripts[0];
  const configuredPrimary = customization?.custom_ui_config?.primary_model;
  const configuredEmbedding = customization?.custom_ui_config?.embedding_model;
  const primaryModel =
    typeof configuredPrimary === "string" && configuredPrimary
      ? configuredPrimary
      : "claude-3-7-sonnet";
  const embeddingModel =
    typeof configuredEmbedding === "string" && configuredEmbedding
      ? configuredEmbedding
      : "text-embedding-3-large";
  const configuredHopDepth = customization?.custom_graph_write?.max_hop_depth;
  const hopDepth =
    typeof configuredHopDepth === "number" ? configuredHopDepth : 2;

  const totalWords = project?.word_count ?? 0;
  const totalChapters = project?.chapter_count ?? 0;
  const openIssues = issues.filter(
    (i) => i.status === "open" || i.status === "unresolved"
  ).length;
  const knowledgeNodes =
    (project?.character_count ?? 0) +
    (project?.location_count ?? 0) +
    (project?.object_count ?? 0);
  const systemsNominal = Boolean(health?.database);
  const healthLabel = !health
    ? "Checking system health…"
    : health.database && health.neo4j
    ? "All Subsystems Nominal"
    : health.database
    ? "Graph Offline · SQL Fallback"
    : "Backend Degraded";

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
      {/* Header & Mission Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border-subtle pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-ink-ash font-medium">
              Pipeline Telemetry &amp; System Health
            </span>
            <span className="text-border-subtle">•</span>
            <span
              className={`inline-flex items-center gap-1.5 font-mono text-[11px] ${
                systemsNominal ? "text-severity-thread" : "text-severity-warning"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  systemsNominal ? "bg-severity-thread" : "bg-severity-warning"
                }`}
              />
              {healthLabel}
            </span>
          </div>
          <h1 className="text-3xl font-serif font-normal tracking-tight text-ink-parchment flex items-center gap-3">
            <Activity className="w-7 h-7 text-wine-accent" />
            Usage &amp; Engine Analytics
          </h1>
          <p className="text-sm text-ink-ash max-w-2xl leading-relaxed">
            Live telemetry across PostgreSQL, Neo4j knowledge graph, and vector embedding pipelines.
            Monitor inference latency, extraction token budgets, and continuity audit coverage.
          </p>
        </div>
      </div>

      {/* Primary KPI Rail */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Surface depth={2} border="subtle" className="p-5 rounded-xl space-y-1">
          <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash">
            Manuscript Corpus
          </p>
          <p className="text-2xl font-serif text-ink-parchment font-medium">
            {formatWords(totalWords)}
          </p>
          <p className="text-xs font-mono text-ink-ash">{totalChapters} Chapters Ingested</p>
        </Surface>

        <Surface depth={2} border="subtle" className="p-5 rounded-xl space-y-1">
          <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash">
            Active Contradictions
          </p>
          <p className="text-2xl font-serif text-ink-parchment font-medium">{openIssues}</p>
          <p className="text-xs font-mono text-ink-ash">Requiring Author Decision</p>
        </Surface>

        <Surface depth={2} border="subtle" className="p-5 rounded-xl space-y-1">
          <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash">
            Knowledge Nodes
          </p>
          <p className="text-2xl font-serif text-ink-parchment font-medium">
            {knowledgeNodes}
          </p>
          <p className="text-xs font-mono text-ink-ash">Neo4j Entity Topology</p>
        </Surface>

        <Surface depth={2} border="subtle" className="p-5 rounded-xl space-y-1">
          <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash">
            Factual Claims
          </p>
          <p className="text-2xl font-serif text-ink-parchment font-medium">
            {project?.claim_count ?? 0}
          </p>
          <p className="text-xs font-mono text-ink-ash">Epistemic Truth Triples</p>
        </Surface>
      </div>

      {/* Two Column Health & Inference Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inference & Model Pipeline */}
        <Surface depth={2} border="subtle" className="p-6 rounded-xl space-y-5">
          <div className="flex items-center gap-2 border-b border-border-quiet pb-3">
            <Cpu className="w-4 h-4 text-wine-accent" />
            <h3 className="font-serif text-base font-medium text-ink-parchment">
              AI Engine &amp; Model Routing
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle border border-border-quiet text-xs font-mono">
              <span className="text-ink-ash">Primary Chat &amp; Synthesis:</span>
              <span className="text-ink-parchment font-semibold">{primaryModel}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle border border-border-quiet text-xs font-mono">
              <span className="text-ink-ash">Dense Embedding Index:</span>
              <span className="text-ink-parchment font-semibold">{embeddingModel}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle border border-border-quiet text-xs font-mono">
              <span className="text-ink-ash">Max Graph Traversal Hop Depth:</span>
              <span className="text-ink-parchment font-semibold">
                {hopDepth} hops
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle border border-border-quiet text-xs font-mono">
              <span className="text-ink-ash">Manuscript Progress:</span>
              <span className="text-ink-parchment font-semibold">
                {activeManuscript
                  ? `${activeManuscript.chapters_done}/${activeManuscript.chapters_total} chapters`
                  : "No manuscript"}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href={`/projects/${projectId}/customization`}
              className="text-xs font-mono text-wine-accent hover:text-ink-parchment flex items-center gap-1.5 transition-colors"
            >
              Configure Sovereign Keys &amp; Base URL in Story Settings <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Surface>

        {/* Database & Graph Sync Health */}
        <Surface depth={2} border="subtle" className="p-6 rounded-xl space-y-5">
          <div className="flex items-center gap-2 border-b border-border-quiet pb-3">
            <Database className="w-4 h-4 text-emerald-400" />
            <h3 className="font-serif text-base font-medium text-ink-parchment">
              Data Storage &amp; Topology Nodes
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle border border-border-quiet text-xs font-mono">
              <span className="text-ink-ash">PostgreSQL Relational DB:</span>
              <span
                className={`flex items-center gap-1.5 ${
                  health?.database ? "text-severity-thread" : "text-severity-contradiction"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    health?.database ? "bg-severity-thread" : "bg-severity-contradiction"
                  }`}
                />
                {health ? (health.database ? "Connected" : "Unavailable") : "Checking…"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle border border-border-quiet text-xs font-mono">
              <span className="text-ink-ash">Neo4j Cypher Graph:</span>
              <span
                className={`flex items-center gap-1.5 ${
                  health?.neo4j ? "text-severity-thread" : "text-severity-warning"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    health?.neo4j ? "bg-severity-thread" : "bg-severity-warning"
                  }`}
                />
                {health ? (health.neo4j ? "Connected" : "Offline · SQL fallback") : "Checking…"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle border border-border-quiet text-xs font-mono">
              <span className="text-ink-ash">pgvector Semantic Embeddings:</span>
              <span className="text-ink-parchment flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-wine-crimson" />
                384-dim · cosine index
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle border border-border-quiet text-xs font-mono">
              <span className="text-ink-ash">Ingestion Jobs:</span>
              <span className="text-ink-parchment flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-severity-warning" />
                In-process background tasks
              </span>
            </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}
