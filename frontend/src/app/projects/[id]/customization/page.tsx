"use client";

import React, { useState, useEffect, use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  useProject,
  useCustomization,
  useWorldRules,
  useManuscripts,
} from "@/hooks/useStoryData";
import { api } from "@/lib/api";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatWords } from "@/lib/utils";
import type { WorldRule } from "@/lib/types";
import {
  Sliders,
  Sparkles,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Scroll,
  ShieldAlert,
  Cpu,
  Trash2,
  Plus,
  RefreshCw,
  Download,
  AlertOctagon,
  Eye,
  EyeOff,
  Scale,
  Settings,
  HelpCircle,
  Clock,
  Compass,
  Users,
  GitBranch,
  GitPullRequest,
  MessageSquare,
  Globe,
  KeyRound,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

interface CustomizationPageProps {
  params: Promise<{ id: string }>;
}

type TabType = "identity" | "features" | "canon" | "validation" | "models" | "danger";

export default function ProjectCustomizationPage({ params }: CustomizationPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: customization, isLoading: custLoading } = useCustomization(projectId);
  const { data: worldRules = [], refetch: refetchWorldRules } = useWorldRules(projectId);
  const { data: manuscripts = [] } = useManuscripts(projectId);
  const activeManuscript = manuscripts[0];

  const [activeTab, setActiveTab] = useState<TabType>("identity");
  const [isSaving, setIsSaving] = useState(false);
  const [isReauditing, setIsReauditing] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Tab 1: Book Details
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [nomenclature, setNomenclature] = useState("Chapter #");
  const [structure, setStructure] = useState("three_act");
  const [targetWordCount, setTargetWordCount] = useState(80000);
  const [targetChapterWords, setTargetChapterWords] = useState(4000);

  // Tab 2: Modular Studio Features (Novella vs Epic)
  const defaultFeatures = [
    "timeline",
    "knowledge",
    "characters",
    "graph",
    "plot-threads",
    "issues",
    "chat",
    "validation",
    "bible",
  ];
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>(defaultFeatures);

  // Tab 3: Story Rules & Directives
  const [customPrompt, setCustomPrompt] = useState("");
  const [customContext, setCustomContext] = useState("");
  const [newRuleModalOpen, setNewRuleModalOpen] = useState(false);
  const [newRuleCategory, setNewRuleCategory] = useState("setting");
  const [newRuleText, setNewRuleText] = useState("");
  const [isAddingRule, setIsAddingRule] = useState(false);

  // Tab 4: Checking Rules & Sensitivity
  const [strictnessPreset, setStrictnessPreset] = useState<"strict" | "balanced" | "relaxed">("balanced");
  const [aliasSensitivity, setAliasSensitivity] = useState(90);
  const [autoAdmitCutoff, setAutoAdmitCutoff] = useState(95);
  const [triagePolicy, setTriagePolicy] = useState("flag_and_continue");
  const [autoAdjudicateMinor, setAutoAdjudicateMinor] = useState(true);

  // Tab 5: AI Engine & Sovereign Keys
  const [primaryModel, setPrimaryModel] = useState("claude-3-7-sonnet");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [apiKeyOverride, setApiKeyOverride] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-3-large");
  const [maxHopDepth, setMaxHopDepth] = useState(2);

  // Tab 6: Danger Zone
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmationTitle, setDeleteConfirmationTitle] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Populate initial state from backend
  useEffect(() => {
    if (project) {
      setTitle(project.title || "");
      setGenre(project.genre || "");
    }
  }, [project]);

  useEffect(() => {
    if (customization) {
      setCustomPrompt(customization.custom_prompt || "");
      setCustomContext(customization.custom_context || "");

      const uiConfig = customization.custom_ui_config || {};
      if (uiConfig.nomenclature) setNomenclature(uiConfig.nomenclature);
      if (uiConfig.structure) setStructure(uiConfig.structure);
      if (uiConfig.target_word_count) setTargetWordCount(Number(uiConfig.target_word_count));
      if (uiConfig.target_chapter_words) setTargetChapterWords(Number(uiConfig.target_chapter_words));
      if (uiConfig.primary_model) setPrimaryModel(uiConfig.primary_model);
      if (uiConfig.custom_base_url) setCustomBaseUrl(uiConfig.custom_base_url);
      if (uiConfig.embedding_model) setEmbeddingModel(uiConfig.embedding_model);
      if (uiConfig.api_key_override) setApiKeyOverride(uiConfig.api_key_override);
      if (Array.isArray(uiConfig.enabled_features)) {
        setEnabledFeatures(uiConfig.enabled_features);
      }

      const valConfig = customization.custom_validation || {};
      if (valConfig.alias_sensitivity !== undefined) setAliasSensitivity(Number(valConfig.alias_sensitivity));
      if (valConfig.auto_admit_cutoff !== undefined) setAutoAdmitCutoff(Number(valConfig.auto_admit_cutoff));
      if (valConfig.triage_policy) setTriagePolicy(valConfig.triage_policy);
      if (valConfig.auto_adjudicate_minor !== undefined) setAutoAdjudicateMinor(Boolean(valConfig.auto_adjudicate_minor));
      if (valConfig.strictness_preset) setStrictnessPreset(valConfig.strictness_preset);

      const graphConfig = customization.custom_graph_write || {};
      if (graphConfig.max_hop_depth !== undefined) setMaxHopDepth(Number(graphConfig.max_hop_depth));
    }
  }, [customization]);

  // Handle Strictness Preset Change
  const handleApplyStrictness = (preset: "strict" | "balanced" | "relaxed") => {
    setStrictnessPreset(preset);
    if (preset === "strict") {
      setAliasSensitivity(95);
      setAutoAdmitCutoff(98);
      setAutoAdjudicateMinor(false);
      setTriagePolicy("halt_critical");
    } else if (preset === "balanced") {
      setAliasSensitivity(90);
      setAutoAdmitCutoff(95);
      setAutoAdjudicateMinor(true);
      setTriagePolicy("flag_and_continue");
    } else {
      setAliasSensitivity(75);
      setAutoAdmitCutoff(85);
      setAutoAdjudicateMinor(true);
      setTriagePolicy("soft_warning");
    }
  };

  // Toggle individual studio module
  const toggleFeature = (featureId: string) => {
    if (enabledFeatures.includes(featureId)) {
      setEnabledFeatures(enabledFeatures.filter((f) => f !== featureId));
    } else {
      setEnabledFeatures([...enabledFeatures, featureId]);
    }
  };

  // Preset for studio modules
  const applyFeaturePreset = (mode: "novella" | "epic" | "all") => {
    if (mode === "novella") {
      setEnabledFeatures(["characters", "issues", "chat"]);
      toast.success("Applied Novella Mode (clean, streamlined workspace).");
    } else if (mode === "epic") {
      setEnabledFeatures(defaultFeatures);
      toast.success("Applied Epic Saga Mode (all 9 modules enabled).");
    } else {
      setEnabledFeatures(defaultFeatures);
    }
  };

  // Handle Save
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      if (project && (project.title !== title || project.genre !== genre)) {
        await api.projects.update(projectId, {
          title: title.trim(),
          genre: genre.trim() || undefined,
        });
      }

      await api.story.updateCustomization(projectId, {
        custom_context: customContext.trim() || undefined,
        custom_prompt: customPrompt.trim() || undefined,
        custom_ui_config: {
          nomenclature,
          structure,
          target_word_count: targetWordCount,
          target_chapter_words: targetChapterWords,
          primary_model: primaryModel,
          custom_base_url: customBaseUrl.trim() || undefined,
          embedding_model: embeddingModel,
          api_key_override: apiKeyOverride.trim() || undefined,
          enabled_features: enabledFeatures,
        },
        custom_validation: {
          strictness_preset: strictnessPreset,
          alias_sensitivity: aliasSensitivity,
          auto_admit_cutoff: autoAdmitCutoff,
          triage_policy: triagePolicy,
          auto_adjudicate_minor: autoAdjudicateMinor,
        },
        custom_graph_write: {
          max_hop_depth: maxHopDepth,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["customization", projectId] });

      toast.success("Story settings and modules updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save project settings.");
    } finally {
      setIsSaving(false);
    }
  };

  // World Rule Handlers
  const handleAddWorldRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleText.trim()) return;

    setIsAddingRule(true);
    try {
      await api.story.createWorldRule(projectId, {
        category: newRuleCategory,
        rule_text: newRuleText.trim(),
      });
      await refetchWorldRules();
      setNewRuleText("");
      setNewRuleModalOpen(false);
      toast.success("Story rule saved to your lore ledger.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save story rule.");
    } finally {
      setIsAddingRule(false);
    }
  };

  const handleDeleteWorldRule = async (ruleId: string) => {
    try {
      await api.story.deleteWorldRule(projectId, ruleId);
      await refetchWorldRules();
      toast.success("Story rule deleted.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete world rule.");
    }
  };

  // Canon Re-audit Trigger
  const handleTriggerReaudit = async () => {
    setIsReauditing(true);
    try {
      if (activeManuscript) {
        await api.projects.reanalyzeChapter(projectId, activeManuscript.id);
      }
      await queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Fresh consistency check started across all chapters.");
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger re-audit.");
    } finally {
      setIsReauditing(false);
    }
  };

  // Export Story Bible
  const handleExportBible = async () => {
    try {
      const bible = await api.story.exportBible(projectId);
      const blob = new Blob([bible.markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(project?.title || "Story_Bible").replace(/[^a-zA-Z0-9_-]/g, "_")}_LoreBible.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Story Bible downloaded as Markdown.");
    } catch (err: any) {
      toast.error(err.message || "Failed to export Story Bible.");
    }
  };

  // Workspace Deletion
  const handleDeleteProject = async () => {
    if (deleteConfirmationTitle.trim().toLowerCase() !== (project?.title || "").trim().toLowerCase()) {
      toast.error("Project title does not match. Deletion aborted.");
      return;
    }

    setIsDeleting(true);
    try {
      await api.projects.delete(projectId);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted.");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete project.");
      setIsDeleting(false);
    }
  };

  const tabs: Array<{ id: TabType; label: string; icon: any; count?: number }> = [
    { id: "identity", label: "Book Details", icon: BookOpen },
    { id: "features", label: "Studio Modules", icon: Sliders, count: enabledFeatures.length },
    { id: "canon", label: "Story Rules", icon: Scroll, count: worldRules.length },
    { id: "validation", label: "Checking Rules", icon: ShieldAlert },
    { id: "models", label: "AI Engine", icon: Cpu },
    { id: "danger", label: "Export & Archive", icon: AlertOctagon },
  ];

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto selection:bg-wine-accent selection:text-ink-parchment">
      {/* Top Banner & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border-quiet">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex items-center gap-1.5 text-xs text-ink-ash hover:text-ink-parchment transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </Link>
            <span className="text-border-subtle">•</span>
            <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Checker: Online</span>
            </span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-ink-parchment">
            Story Settings & Modules
          </h1>
          <p className="text-xs text-ink-bone max-w-2xl leading-relaxed">
            Customize which modules are active in this novel, calibrate story rules, set target word counts, and configure custom AI endpoints.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerReaudit}
            isLoading={isReauditing}
            className="gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5 text-wine-crimson" />
            <span>Check Entire Story</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveChanges}
            isLoading={isSaving}
            className="gap-2 shadow-[0_4px_16px_rgba(140,34,66,0.3)]"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </Button>
        </div>
      </div>

      {/* Literary Obsidian Tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border-quiet scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-150 whitespace-nowrap shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ${
                isActive
                  ? "bg-wine-accent/15 text-ink-parchment border border-wine-accent/35 font-semibold"
                  : "bg-surface-card border border-border-subtle text-ink-ash hover:text-ink-parchment hover:border-border-prominent"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0 text-wine-crimson" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    isActive
                      ? "bg-wine-accent/25 text-wine-crimson"
                      : "bg-surface-subtle text-ink-ash"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Tab Panels */}
      <div className="space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: BOOK DETAILS & STRUCTURE                                          */}
        {/* ========================================================================= */}
        {activeTab === "identity" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Surface depth={2} border="subtle" rounded="md" className="p-6 sm:p-8 space-y-6">
              <div className="border-b border-border-quiet pb-4">
                <h2 className="font-serif text-lg font-medium text-ink-parchment">
                  1. Book Details & Structure
                </h2>
                <p className="text-xs text-ink-bone mt-1">
                  Basic book details, pacing targets, and how chapters are labeled.
                </p>
              </div>

              {/* Title & Genre */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-ink-parchment">
                    Book Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. The Obsidian Archive"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent transition-colors shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                  />
                  <p className="text-[11px] text-ink-ash">
                    Appears across all folios and export headers.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-ink-parchment">
                    Genre & Tone
                  </label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="e.g. Gothic Fantasy, Mystery Thriller, Historical Fiction"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent transition-colors shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                  />
                  <p className="text-[11px] text-ink-ash">
                    Informs the checker of your story&apos;s tone and genre conventions.
                  </p>
                </div>
              </div>

              {/* Chapter Naming Style */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-ink-parchment">
                    Chapter Naming Style
                  </label>
                  <p className="text-[11px] text-ink-ash mt-0.5">
                    How chapter titles appear throughout the Studio navigation and table of contents.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: "Chapter #", label: "Chapter #" },
                    { id: "Folio §", label: "Folio §" },
                    { id: "Scene #", label: "Scene #" },
                    { id: "Canto", label: "Canto" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setNomenclature(item.id)}
                      className={`p-3 rounded-xl border text-xs font-medium text-center transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ${
                        nomenclature === item.id
                          ? "bg-wine-accent/20 border-wine-accent text-ink-parchment shadow-sm"
                          : "bg-surface-card border-border-subtle text-ink-ash hover:text-ink-parchment hover:border-border-focus"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Story Structure Template */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-ink-parchment">
                    Story Structure Template
                  </label>
                  <p className="text-[11px] text-ink-ash mt-0.5">
                    Generates structural milestone dividers (Act I Inciting Incident, Act II Midpoint, Act III Climax) on your timeline and reader.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      id: "three_act",
                      title: "Classic 3-Act Structure",
                      desc: "Setup, confrontation with midpoint turning point, and resolution.",
                    },
                    {
                      id: "tragedy",
                      title: "Five-Act Dramatic Arc",
                      desc: "Detailed five-stage progression with rising action, crisis, and emotional climax.",
                    },
                    {
                      id: "episodic",
                      title: "Episodic / Series Format",
                      desc: "Connected standalone episodes linked through recurring characters and overarching mysteries.",
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStructure(item.id)}
                      className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ${
                        structure === item.id
                          ? "bg-wine-accent/15 border-wine-accent shadow-[0_4px_16px_rgba(140,34,66,0.25)]"
                          : "bg-surface-card border-border-subtle hover:border-border-focus"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-serif text-xs font-medium text-ink-parchment">
                          {item.title}
                        </span>
                        {structure === item.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-wine-crimson shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-ink-ash leading-relaxed">
                        {item.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Word Count Targets */}
              <div className="space-y-4 pt-4 border-t border-border-quiet">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-medium text-ink-parchment">
                      Word Count Targets
                    </label>
                    <p className="text-[11px] text-ink-ash mt-0.5">
                      Powers the completion progress gauges in your Studio Hub and Reader.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-wine-crimson font-medium">
                    {formatWords(targetWordCount)} total • ~{formatWords(targetChapterWords)} / chapter
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-ink-ash">
                      <span>Target Total Words</span>
                      <span className="font-mono text-ink-parchment">{formatWords(targetWordCount)}</span>
                    </div>
                    <input
                      type="range"
                      min="20000"
                      max="200000"
                      step="5000"
                      value={targetWordCount}
                      onChange={(e) => setTargetWordCount(Number(e.target.value))}
                      className="w-full accent-wine-accent cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-ink-ash">
                      <span>20k (Novella)</span>
                      <span>80k (Standard Novel)</span>
                      <span>200k (Epic)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-ink-ash">
                      <span>Target Words per Chapter</span>
                      <span className="font-mono text-ink-parchment">{formatWords(targetChapterWords)}</span>
                    </div>
                    <input
                      type="range"
                      min="1000"
                      max="10000"
                      step="250"
                      value={targetChapterWords}
                      onChange={(e) => setTargetChapterWords(Number(e.target.value))}
                      className="w-full accent-wine-accent cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-ink-ash">
                      <span>1k words</span>
                      <span>4k words</span>
                      <span>10k words</span>
                    </div>
                  </div>
                </div>
              </div>
            </Surface>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MODULAR STUDIO MODULES (Novella vs Epic)                          */}
        {/* ========================================================================= */}
        {activeTab === "features" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Surface depth={2} border="subtle" rounded="md" className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-quiet pb-4">
                <div>
                  <h2 className="font-serif text-lg font-medium text-ink-parchment">
                    2. Modular Studio Modules
                  </h2>
                  <p className="text-xs text-ink-bone mt-1">
                    Choose which story intelligence modules you want active. Turning off unused modules keeps your workspace clean and saves processing time.
                  </p>
                </div>

                {/* Preset shortcuts */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => applyFeaturePreset("novella")}
                  >
                    Novella Mode (Clean)
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => applyFeaturePreset("epic")}
                  >
                    Epic Saga (All Modules)
                  </Button>
                </div>
              </div>

              {/* Feature Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    id: "timeline",
                    title: "Timeline & Dual Chronology",
                    icon: Clock,
                    desc: "Tracks in-universe story dates vs in-book narrative reading order. Detects temporal paradoxes.",
                  },
                  {
                    id: "characters",
                    title: "Character Cast & Bible",
                    icon: Users,
                    desc: "Automatically extracts characters, aliases, first mentions, and dynamic physical descriptions.",
                  },
                  {
                    id: "graph",
                    title: "Item Custody & Relic Graph",
                    icon: GitBranch,
                    desc: "Tracks physical weapon, letter, and artifact handoffs between characters across chapters.",
                  },
                  {
                    id: "knowledge",
                    title: "Who Knows What (Knowledge Matrix)",
                    icon: Compass,
                    desc: "2D matrix mapping which characters know specific secrets, lies, or plot twists.",
                  },
                  {
                    id: "plot-threads",
                    title: "Plot Threads & Payoffs",
                    icon: GitPullRequest,
                    desc: "Monitors unresolved narrative questions and setups needing a dramatic payoff.",
                  },
                  {
                    id: "issues",
                    title: "Consistency & Plot Checker",
                    icon: AlertTriangle,
                    desc: "Automated continuity engine flagging character, physical, and historical plot contradictions.",
                  },
                  {
                    id: "chat",
                    title: "Story Assistant Chat",
                    icon: MessageSquare,
                    desc: "Chat directly with your story universe to brainstorm scenes or query obscure background facts.",
                  },
                  {
                    id: "validation",
                    title: "Fact Quarantine & Approvals",
                    icon: ShieldAlert,
                    desc: "Review and approve extracted facts before they are committed into your canon memory.",
                  },
                  {
                    id: "bible",
                    title: "World Rules & Lore Laws",
                    icon: Scroll,
                    desc: "Inscribe physical, magical, or setting rules that the AI must never violate.",
                  },
                ].map((feat) => {
                  const Icon = feat.icon;
                  const isEnabled = enabledFeatures.includes(feat.id);
                  return (
                    <div
                      key={feat.id}
                      onClick={() => toggleFeature(feat.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ${
                        isEnabled
                          ? "bg-wine-accent/10 border-wine-accent/40"
                          : "bg-surface-card border-border-subtle opacity-60 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                            isEnabled
                              ? "bg-wine-accent/20 text-wine-crimson"
                              : "bg-surface-subtle text-ink-ash"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-serif text-xs font-medium text-ink-parchment">
                            {feat.title}
                          </h3>
                          <p className="text-[11px] text-ink-ash leading-relaxed">
                            {feat.desc}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        <span
                          className={`w-9 h-5 rounded-full transition-colors inline-flex items-center px-0.5 ${
                            isEnabled ? "bg-wine-accent" : "bg-surface-subtle border border-border-subtle"
                          }`}
                        >
                          <span
                            className={`block w-4 h-4 rounded-full bg-ink-parchment transition-transform duration-150 ${
                              isEnabled ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Surface>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: STORY RULES & WORLD FACTS                                         */}
        {/* ========================================================================= */}
        {activeTab === "canon" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Surface depth={2} border="subtle" rounded="md" className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-quiet pb-4">
                <div>
                  <h2 className="font-serif text-lg font-medium text-ink-parchment">
                    3. Story Rules & World Facts
                  </h2>
                  <p className="text-xs text-ink-bone mt-1">
                    Rules about your story&apos;s universe (magic systems, character physical limits, historical facts) that the AI should enforce.
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => setNewRuleModalOpen(true)}
                  className="gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Story Rule</span>
                </Button>
              </div>

              {/* Active World Rules List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-ink-parchment">
                    Active Story Rules ({worldRules.length})
                  </label>
                  <span className="text-[11px] text-ink-ash">
                    The AI checks every chapter against these rules
                  </span>
                </div>

                <div className="space-y-3">
                  {worldRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-4 rounded-xl bg-surface-card border border-border-subtle flex items-start justify-between gap-4 group hover:border-wine-accent/40 transition-colors shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="subtle" size="xs" className="uppercase font-mono">
                            {rule.category}
                          </Badge>
                          {rule.source_chapter && (
                            <span className="text-[10px] text-ink-ash">
                              Established: Chapter {rule.source_chapter}
                            </span>
                          )}
                          <span className="text-[10px] text-pine-moss flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-pine-moss" />
                            <span>Active Rule</span>
                          </span>
                        </div>
                        <p className="font-serif text-xs text-ink-parchment leading-relaxed">
                          &ldquo;{rule.rule_text}&rdquo;
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDeleteWorldRule(rule.id)}
                        className="text-ink-ash hover:text-severity-contradiction shrink-0 opacity-80 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}

                  {worldRules.length === 0 && (
                    <div className="p-6 rounded-xl bg-surface-card border border-dashed border-border-subtle text-center space-y-2">
                      <Scroll className="w-6 h-6 text-ink-ash mx-auto" />
                      <p className="text-xs text-ink-bone">
                        No custom world rules defined yet.
                      </p>
                      <p className="text-[11px] text-ink-ash">
                        Rules define facts such as physical constraints, medical limits, or unique item locations.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Prose Register & Linguistic Lexicon */}
              <div className="space-y-2 pt-4 border-t border-border-quiet">
                <label className="text-xs font-medium text-ink-parchment">
                  Writing Style & Tone Guidelines (AI Directives)
                </label>
                <textarea
                  rows={4}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Victorian gothic style; formal dialogue fitting social hierarchy. No modern colloquialisms. Dark, atmospheric descriptive tone."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent transition-colors font-mono leading-relaxed shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                />
                <p className="text-[11px] text-ink-ash">
                  Guides how the AI interprets character dialogue and prose style.
                </p>
              </div>

              {/* Narrative Point of View & Secret Lore */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-medium text-ink-parchment">
                  Point of View & Secret Lore (Context)
                </label>
                <textarea
                  rows={4}
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  placeholder="e.g. Third-person limited with shifting viewpoints. Chapter 14 features an unreliable sensory state due to medicine/poison. Don't flag this hallucination as a factual error."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent transition-colors font-mono leading-relaxed shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                />
                <p className="text-[11px] text-ink-ash">
                  Share intentional plot twists or unreliable narrator states so the AI does not mistake them for mistakes.
                </p>
              </div>
            </Surface>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CHECKING RULES & SENSITIVITY                                      */}
        {/* ========================================================================= */}
        {activeTab === "validation" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Surface depth={2} border="subtle" rounded="md" className="p-6 sm:p-8 space-y-6">
              <div className="border-b border-border-quiet pb-4">
                <h2 className="font-serif text-lg font-medium text-ink-parchment">
                  4. Consistency Checking Strictness
                </h2>
                <p className="text-xs text-ink-bone mt-1">
                  Choose how strictly the checker flags plot differences and character facts.
                </p>
              </div>

              {/* 3-Way Strictness Presets */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-ink-parchment">
                  Checking Strictness Preset
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      id: "relaxed" as const,
                      title: "Relaxed Mode",
                      badge: "Quiet",
                      desc: "Only alerts you to undeniable, major plot contradictions. Ignores minor phrasing nuances.",
                    },
                    {
                      id: "balanced" as const,
                      title: "Balanced (Recommended)",
                      badge: "Default",
                      desc: "Balanced analysis checking character facts, location conflicts, and clear timeline paradoxes.",
                    },
                    {
                      id: "strict" as const,
                      title: "Strict Forensic Mode",
                      badge: "Forensic",
                      desc: "Flags even subtle phrasing differences, minor physical trait changes, and strict item custody.",
                    },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyStrictness(preset.id)}
                      className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ${
                        strictnessPreset === preset.id
                          ? "bg-wine-accent/15 border-wine-accent shadow-[0_4px_16px_rgba(140,34,66,0.25)]"
                          : "bg-surface-card border-border-subtle hover:border-border-focus"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-serif text-xs font-medium text-ink-parchment">
                          {preset.title}
                        </span>
                        {strictnessPreset === preset.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-wine-crimson shrink-0" />
                        )}
                      </div>
                      <Badge variant="subtle" size="xs">
                        {preset.badge}
                      </Badge>
                      <p className="text-[11px] text-ink-ash leading-relaxed">
                        {preset.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fine-Tuning Details */}
              <div className="space-y-4 pt-4 border-t border-border-quiet">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-parchment">
                    Fine-Tuning Parameters
                  </span>
                  <span className="text-[11px] text-ink-ash font-mono">
                    Alias: {aliasSensitivity}% • Cutoff: {autoAdmitCutoff}%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] text-ink-ash">
                      Character Name Matching Strictness
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="1"
                      value={aliasSensitivity}
                      onChange={(e) => setAliasSensitivity(Number(e.target.value))}
                      className="w-full accent-wine-accent cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-ink-ash">
                      <span>50% (Flexible)</span>
                      <span>90% (Standard)</span>
                      <span>100% (Exact Only)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] text-ink-ash">
                      Auto-Approval Confidence Level
                    </label>
                    <input
                      type="range"
                      min="70"
                      max="100"
                      step="1"
                      value={autoAdmitCutoff}
                      onChange={(e) => setAutoAdmitCutoff(Number(e.target.value))}
                      className="w-full accent-wine-accent cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-ink-ash">
                      <span>70% (Auto-approve most)</span>
                      <span>95% (Standard)</span>
                      <span>100% (Manual only)</span>
                    </div>
                  </div>
                </div>
              </div>
            </Surface>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: AI ENGINE & SOVEREIGN KEYS                                        */}
        {/* ========================================================================= */}
        {activeTab === "models" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Surface depth={2} border="subtle" rounded="md" className="p-6 sm:p-8 space-y-6">
              <div className="border-b border-border-quiet pb-4">
                <h2 className="font-serif text-lg font-medium text-ink-parchment">
                  5. AI Engine & Custom Endpoints
                </h2>
                <p className="text-xs text-ink-bone mt-1">
                  Choose your AI model, connect your own sovereign API key, or use a custom endpoint (Ollama, OpenRouter, vLLM).
                </p>
              </div>

              {/* Model Presets */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-ink-parchment">
                  Recommended Model Presets
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      id: "claude-3-7-sonnet",
                      title: "Claude 3.7 Sonnet",
                      badge: "Recommended",
                      desc: "Best balance of deep literary comprehension, tone sensitivity, and fast plot validation.",
                    },
                    {
                      id: "claude-3-5-haiku",
                      title: "Claude 3.5 Haiku",
                      badge: "Fast & Light",
                      desc: "Fast, light model ideal for quick chapter importing and simple character tracking.",
                    },
                    {
                      id: "deepseek-r1",
                      title: "DeepSeek R1",
                      badge: "Deep Reasoning",
                      desc: "Maximum deductive reasoning power for complex, interwoven multi-character mysteries.",
                    },
                  ].map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setPrimaryModel(model.id)}
                      className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ${
                        primaryModel === model.id
                          ? "bg-wine-accent/15 border-wine-accent shadow-[0_4px_16px_rgba(140,34,66,0.25)]"
                          : "bg-surface-card border-border-subtle hover:border-border-focus"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-serif text-xs font-medium text-ink-parchment">
                            {model.title}
                          </span>
                          {primaryModel === model.id && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-wine-crimson shrink-0" />
                          )}
                        </div>
                        <Badge variant="subtle" size="xs">
                          {model.badge}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-ink-ash leading-relaxed">
                        {model.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Model Name Input */}
              <div className="space-y-2 pt-4 border-t border-border-quiet">
                <label className="text-xs font-medium text-ink-parchment">
                  Custom Model Name
                </label>
                <input
                  type="text"
                  value={primaryModel}
                  onChange={(e) => setPrimaryModel(e.target.value)}
                  placeholder="e.g. claude-3-7-sonnet, gpt-4o, deepseek-chat, mistral-large"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent transition-colors font-mono shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                />
                <p className="text-[11px] text-ink-ash">
                  Enter any valid model identifier supported by your provider or custom gateway.
                </p>
              </div>

              {/* Custom Base URL (Ollama / OpenRouter / vLLM) */}
              <div className="space-y-2 pt-4 border-t border-border-quiet">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-ink-parchment flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-wine-crimson" />
                    <span>Custom Base URL (Optional)</span>
                  </label>
                  <span className="text-[10px] text-ink-ash font-mono">
                    {customBaseUrl.trim() ? "Custom Endpoint Active" : "Default NERRA Gateway"}
                  </span>
                </div>
                <input
                  type="text"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="e.g. http://localhost:11434/v1 (Ollama) or https://openrouter.ai/api/v1"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent transition-colors font-mono shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                />
                <p className="text-[11px] text-ink-ash">
                  Leave blank to use the default cloud gateway, or supply your own OpenAI/Anthropic-compatible endpoint.
                </p>
              </div>

              {/* Sovereign API Key Override */}
              <div className="space-y-2 pt-4 border-t border-border-quiet">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-ink-parchment flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-wine-crimson" />
                    <span>Sovereign API Key Override (Optional)</span>
                  </label>
                  <span className="text-[10px] text-pine-moss flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>System Key Ready</span>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKeyOverride}
                    onChange={(e) => setApiKeyOverride(e.target.value)}
                    placeholder="Leave blank to use system key, or paste your personal sk-..."
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent transition-colors font-mono shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3.5 top-3 text-ink-ash hover:text-ink-parchment"
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-ink-ash">
                  If provided, your personal quota will be billed directly by your provider.
                </p>
              </div>

              {/* Vector Graph & Embedding Engine */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border-quiet">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-ink-parchment">
                    Search & Memory Engine
                  </label>
                  <select
                    value={embeddingModel}
                    onChange={(e) => setEmbeddingModel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent transition-colors shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                  >
                    <option value="text-embedding-3-large">OpenAI text-embedding-3-large (Recommended)</option>
                    <option value="bge-large-en">BAAI bge-large-en (Fast Local Embeddings)</option>
                    <option value="voyage-3">Voyage AI voyage-3 (Literary Embeddings)</option>
                  </select>
                  <p className="text-[11px] text-ink-ash">
                    Used for vector search and connecting story references.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-ink-parchment">
                      Context Memory Depth
                    </label>
                    <span className="font-mono text-xs text-wine-crimson font-medium">
                      {maxHopDepth} Steps
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={maxHopDepth}
                    onChange={(e) => setMaxHopDepth(Number(e.target.value))}
                    className="w-full accent-wine-accent cursor-pointer mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-ink-ash">
                    <span>1 Step (Direct)</span>
                    <span>2 Steps (Standard)</span>
                    <span>5 Steps (Deep background lore)</span>
                  </div>
                </div>
              </div>
            </Surface>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: EXPORT & DIGNIFIED ARCHIVE (No bright red boxes)                  */}
        {/* ========================================================================= */}
        {activeTab === "danger" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Surface
              depth={2}
              border="subtle"
              rounded="md"
              className="p-6 sm:p-8 space-y-6 relative overflow-hidden"
            >
              <div className="border-b border-border-quiet pb-4">
                <div className="flex items-center gap-2 text-ink-parchment mb-1">
                  <AlertOctagon className="w-5 h-5 text-wine-crimson" />
                  <h2 className="font-serif text-lg font-medium">
                    6. Export, Re-Check & Story Deletion
                  </h2>
                </div>
                <p className="text-xs text-ink-bone mt-1">
                  Export your complete story files, re-verify your manuscript, or permanently delete this project.
                </p>
              </div>

              {/* Action 1: Export Lore Bible */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-surface-card border border-border-subtle shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                <div className="space-y-1">
                  <h3 className="font-serif text-xs font-medium text-ink-parchment">
                    Export Complete Story Bible (Markdown)
                  </h3>
                  <p className="text-[11px] text-ink-ash">
                    Downloads a clean Markdown file with all characters, timeline events, world rules, and plot notes.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportBible}
                  className="gap-2 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Story Bible</span>
                </Button>
              </div>

              {/* Action 2: Trigger Global Resync */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-surface-card border border-border-subtle shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                <div className="space-y-1">
                  <h3 className="font-serif text-xs font-medium text-ink-parchment">
                    Re-check Entire Story
                  </h3>
                  <p className="text-[11px] text-ink-ash">
                    Clears cached analysis and runs a fresh consistency check across all chapters.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTriggerReaudit}
                  isLoading={isReauditing}
                  className="gap-2 shrink-0 text-wine-crimson hover:text-wine-crimson"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-check Story</span>
                </Button>
              </div>

              {/* Action 3: Dignified Project Deletion (No harsh bright red card) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-surface-card border border-border-subtle hover:border-border-prominent transition-colors shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                <div className="space-y-1">
                  <h3 className="font-serif text-xs font-medium text-ink-parchment">
                    Delete This Story Project
                  </h3>
                  <p className="text-[11px] text-ink-ash">
                    Permanently deletes this novel, all uploaded chapters, characters, and notes. This cannot be undone.
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteModalOpen(true)}
                  className="gap-2 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Project...</span>
                </Button>
              </div>
            </Surface>
          </motion.div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Add Story Rule                                                     */}
      {/* ========================================================================= */}
      {newRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <Surface depth={3} border="subtle" rounded="lg" className="max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-quiet pb-3">
              <h3 className="font-serif text-base font-medium text-ink-parchment">
                Add Story Rule
              </h3>
              <button
                onClick={() => setNewRuleModalOpen(false)}
                className="text-ink-ash hover:text-ink-parchment text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWorldRule} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-ink-parchment">
                  Rule Category
                </label>
                <select
                  value={newRuleCategory}
                  onChange={(e) => setNewRuleCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                >
                  <option value="setting">Setting & World Rules</option>
                  <option value="magic">Magic & Supernatural</option>
                  <option value="physics">Physical Limits & Health</option>
                  <option value="society">Society & Law</option>
                  <option value="timeline">Time & Travel Limits</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-ink-parchment">
                  Rule Description
                </label>
                <textarea
                  rows={4}
                  required
                  value={newRuleText}
                  onChange={(e) => setNewRuleText(e.target.value)}
                  placeholder="e.g. Dr. Kenneth's right hand was permanently amputated in Chapter 4; any scene depicting him holding scalpel with both hands is a contradiction."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent font-serif shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-quiet">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewRuleModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isAddingRule}
                >
                  Save Rule
                </Button>
              </div>
            </form>
          </Surface>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Delete Project Confirmation                                        */}
      {/* ========================================================================= */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <Surface depth={3} border="subtle" rounded="lg" className="max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-severity-contradiction border-b border-border-quiet pb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-serif text-base font-semibold">
                Delete Story Project
              </h3>
            </div>

            <p className="text-xs text-ink-bone leading-relaxed">
              This action cannot be undone. To confirm deletion of{" "}
              <strong className="text-ink-parchment font-serif">&ldquo;{project?.title}&rdquo;</strong>, type the exact title below:
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={deleteConfirmationTitle}
                onChange={(e) => setDeleteConfirmationTitle(e.target.value)}
                placeholder={project?.title || "Type project title to confirm"}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-severity-contradiction font-mono shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-quiet">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteConfirmationTitle("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={
                  deleteConfirmationTitle.trim().toLowerCase() !==
                  (project?.title || "").trim().toLowerCase()
                }
                isLoading={isDeleting}
                onClick={handleDeleteProject}
              >
                Permanently Delete
              </Button>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}
