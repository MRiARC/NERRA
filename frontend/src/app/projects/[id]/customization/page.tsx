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
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

interface CustomizationPageProps {
  params: Promise<{ id: string }>;
}

type TabType = "identity" | "canon" | "validation" | "models" | "danger";

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

  // Form State
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [nomenclature, setNomenclature] = useState("Chapter #");
  const [structure, setStructure] = useState("three_act");
  const [targetWordCount, setTargetWordCount] = useState(80000);
  const [targetChapterWords, setTargetChapterWords] = useState(4000);

  // Section 2: World Rules & Directives
  const [customPrompt, setCustomPrompt] = useState("");
  const [customContext, setCustomContext] = useState("");
  const [newRuleModalOpen, setNewRuleModalOpen] = useState(false);
  const [newRuleCategory, setNewRuleCategory] = useState("setting");
  const [newRuleText, setNewRuleText] = useState("");
  const [isAddingRule, setIsAddingRule] = useState(false);

  // Section 3: Validation & Quarantine
  const [aliasSensitivity, setAliasSensitivity] = useState(90);
  const [autoAdmitCutoff, setAutoAdmitCutoff] = useState(95);
  const [triagePolicy, setTriagePolicy] = useState("flag_and_continue");
  const [autoAdjudicateMinor, setAutoAdjudicateMinor] = useState(true);

  // Section 4: AI & Studio Engine
  const [primaryModel, setPrimaryModel] = useState("claude-3-7-sonnet");
  const [apiKeyOverride, setApiKeyOverride] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-3-large");
  const [maxHopDepth, setMaxHopDepth] = useState(2);

  // Section 5: Danger Zone
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
      if (uiConfig.embedding_model) setEmbeddingModel(uiConfig.embedding_model);
      if (uiConfig.api_key_override) setApiKeyOverride(uiConfig.api_key_override);

      const valConfig = customization.custom_validation || {};
      if (valConfig.alias_sensitivity !== undefined) setAliasSensitivity(Number(valConfig.alias_sensitivity));
      if (valConfig.auto_admit_cutoff !== undefined) setAutoAdmitCutoff(Number(valConfig.auto_admit_cutoff));
      if (valConfig.triage_policy) setTriagePolicy(valConfig.triage_policy);
      if (valConfig.auto_adjudicate_minor !== undefined) setAutoAdjudicateMinor(Boolean(valConfig.auto_adjudicate_minor));

      const graphConfig = customization.custom_graph_write || {};
      if (graphConfig.max_hop_depth !== undefined) setMaxHopDepth(Number(graphConfig.max_hop_depth));
    }
  }, [customization]);

  // Handle Save
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // 1. Update project title and genre if changed
      if (project && (project.title !== title || project.genre !== genre)) {
        await api.projects.update(projectId, {
          title: title.trim(),
          genre: genre.trim() || undefined,
        });
      }

      // 2. Update customization payload
      await api.story.updateCustomization(projectId, {
        custom_prompt: customPrompt,
        custom_context: customContext,
        custom_ui_config: {
          nomenclature,
          structure,
          target_word_count: targetWordCount,
          target_chapter_words: targetChapterWords,
          primary_model: primaryModel,
          embedding_model: embeddingModel,
          api_key_override: apiKeyOverride.trim() || undefined,
        },
        custom_validation: {
          alias_sensitivity: aliasSensitivity,
          auto_admit_cutoff: autoAdmitCutoff,
          triage_policy: triagePolicy,
          auto_adjudicate_minor: autoAdjudicateMinor,
        },
        custom_graph_write: {
          max_hop_depth: maxHopDepth,
        },
      });

      // Invalidate relevant queries
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["customization", projectId] });

      toast.success("Directives & settings updated successfully across all intelligence daemons.");
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
      toast.success("New canon law inscribed into the Living Ledger.");
    } catch (err: any) {
      toast.error(err.message || "Failed to append canon law.");
    } finally {
      setIsAddingRule(false);
    }
  };

  const handleDeleteWorldRule = async (ruleId: string) => {
    try {
      await api.story.deleteWorldRule(projectId, ruleId);
      await refetchWorldRules();
      toast.success("Canon law decommissioned.");
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
      toast.success("Global canon consistency re-audit initiated across all chapters.");
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
      toast.success("Story Bible compiled and downloaded.");
    } catch (err: any) {
      toast.error(err.message || "Failed to export Story Bible.");
    }
  };

  // Workspace Deletion
  const handleDeleteWorkspace = async () => {
    if (deleteConfirmationTitle !== project?.title) {
      toast.error("Title confirmation does not match exact project title.");
      return;
    }

    setIsDeleting(true);
    try {
      await api.projects.delete(projectId);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Workspace purged from sovereign storage.");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete workspace.");
      setIsDeleting(false);
    }
  };

  const tabs: Array<{ id: TabType; label: string; icon: any; count?: number }> = [
    { id: "identity", label: "Book Details", icon: BookOpen },
    { id: "canon", label: "Story Rules", icon: Scroll, count: worldRules.length },
    { id: "validation", label: "Checking Rules", icon: ShieldAlert },
    { id: "models", label: "AI Settings", icon: Cpu },
    { id: "danger", label: "Export & Delete", icon: AlertOctagon },
  ];

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto selection:bg-wine-accent selection:text-ink-parchment">
      {/* Top Banner & Action Bar (Stitch Screen 4) */}
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
            <span className="text-[11px] text-pine-moss font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-pine-moss animate-pulse-subtle" />
              <span>Checker: Online</span>
            </span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-ink-parchment">
            Story Settings & AI Preferences
          </h1>
          <p className="text-xs text-ink-bone max-w-2xl leading-relaxed">
            Configure your novel&apos;s rules, writing style, character tracking sensitivity, and AI assistant settings.
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
            className="gap-2 shadow-[0_4px_16px_rgba(122,29,57,0.3)]"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </Button>
        </div>
      </div>

      {/* Literary Obsidian Tab Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-border-quiet scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-[4px] text-xs font-medium transition-all duration-150 border-b-2 whitespace-nowrap ${
                isActive
                  ? tab.id === "danger"
                    ? "bg-severity-contradiction/10 text-severity-contradiction border-severity-contradiction font-semibold"
                    : "bg-surface-card text-ink-parchment border-wine-accent font-semibold shadow-sm"
                  : tab.id === "danger"
                  ? "text-severity-contradiction/70 border-transparent hover:text-severity-contradiction hover:bg-severity-contradiction/5"
                  : "text-ink-ash border-transparent hover:text-ink-parchment hover:bg-surface-card/50"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? "bg-wine-accent/20 text-wine-crimson"
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
            <Surface depth={2} border="subtle" rounded="sm" className="p-6 sm:p-8 space-y-6">
              <div className="border-b border-border-quiet pb-4">
                <h2 className="font-serif text-lg font-medium text-ink-parchment">
                  1. Book Details & Structure
                </h2>
                <p className="text-xs text-ink-bone mt-1">
                  Basic information about your novel, target word counts, and chapter naming.
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
                    className="w-full px-3.5 py-2.5 rounded-[4px] bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent transition-colors"
                  />
                  <p className="text-[11px] text-ink-ash">
                    The title of your manuscript.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-ink-parchment">
                    Genre
                  </label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="e.g. Gothic Fantasy, Mystery Thriller, Historical Fiction"
                    className="w-full px-3.5 py-2.5 rounded-[4px] bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent transition-colors"
                  />
                  <p className="text-[11px] text-ink-ash">
                    Helps the AI adapt its analysis to the conventions and tone of your genre.
                  </p>
                </div>
              </div>

              {/* Chapter Naming Style */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-medium text-ink-parchment">
                  Chapter Naming Style
                </label>
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
                      className={`p-3 rounded-[4px] border text-xs font-medium text-center transition-all ${
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
                <label className="text-xs font-medium text-ink-parchment">
                  Story Structure Template
                </label>
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
                      className={`p-4 rounded-[4px] border text-left transition-all flex flex-col justify-between space-y-2 ${
                        structure === item.id
                          ? "bg-wine-accent/15 border-wine-accent shadow-[0_4px_16px_rgba(122,29,57,0.25)]"
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
                  <label className="text-xs font-medium text-ink-parchment">
                    Word Count Targets
                  </label>
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
        {/* TAB 2: STORY RULES & WORLD FACTS                                         */}
        {/* ========================================================================= */}
        {activeTab === "canon" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Surface depth={2} border="subtle" rounded="sm" className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-quiet pb-4">
                <div>
                  <h2 className="font-serif text-lg font-medium text-ink-parchment">
                    2. Story Rules & World Facts
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
                      className="p-4 rounded-[4px] bg-surface-card border border-border-subtle flex items-start justify-between gap-4 group hover:border-wine-accent/40 transition-colors"
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
                    <div className="p-6 rounded-[4px] bg-surface-card border border-dashed border-border-subtle text-center space-y-2">
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

              {/* Prose Register & Linguistic Lexicon Envelope */}
              <div className="space-y-2 pt-4 border-t border-border-quiet">
                <label className="text-xs font-medium text-ink-parchment">
                  Writing Style & Tone Guidelines (AI Directives)
                </label>
                <textarea
                  rows={4}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Victorian gothic style; formal dialogue fitting social hierarchy. No modern colloquialisms. Dark, atmospheric descriptive tone."
                  className="w-full px-3.5 py-2.5 rounded-[4px] bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent transition-colors font-mono leading-relaxed"
                />
                <p className="text-[11px] text-ink-ash">
                  Guides how the AI interprets character dialogue and prose style.
                </p>
              </div>

              {/* Narrative Point of View & Perspective Canon */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-medium text-ink-parchment">
                  Point of View & Secret Lore (Context)
                </label>
                <textarea
                  rows={4}
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  placeholder="e.g. Third-person limited with shifting viewpoints. Chapter 14 features an unreliable sensory state due to medicine/poison. Don't flag this hallucination as a factual error."
                  className="w-full px-3.5 py-2.5 rounded-[4px] bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent transition-colors font-mono leading-relaxed"
                />
                <p className="text-[11px] text-ink-ash">
                  Share intentional plot twists or unreliable narrator states so the AI does not mistake them for mistakes.
                </p>
              </div>
            </Surface>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CHECKING ACCURACY & RULES                                          */}
        {/* ========================================================================= */}
        {activeTab === "validation" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Surface depth={2} border="subtle" rounded="sm" className="p-6 sm:p-8 space-y-6">
              <div className="border-b border-border-quiet pb-4">
                <h2 className="font-serif text-lg font-medium text-ink-parchment">
                  3. Checking Accuracy & Rules
                </h2>
                <p className="text-xs text-ink-bone mt-1">
                  Control how strictly the AI checks for character name variations and plot issues.
                </p>
              </div>

              {/* Alias Resolution Sensitivity */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-ink-parchment">
                    Character Name Matching Strictness
                  </label>
                  <span className="text-xs font-mono text-wine-crimson font-medium">
                    {aliasSensitivity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="1"
                  value={aliasSensitivity}
                  onChange={(e) => setAliasSensitivity(Number(e.target.value))}
                  className="w-full accent-wine-accent cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-ink-ash">
                  <span>50% (Flexible Matching)</span>
                  <span>90% (Recommended)</span>
                  <span>100% (Exact Names Only)</span>
                </div>
                <p className="text-[11px] text-ink-ash">
                  How easily the AI connects different names for the same character (e.g. &ldquo;Dr. Kenneth&rdquo; and &ldquo;The Chief Surgeon&rdquo;).
                </p>
              </div>

              {/* Pre-Graph Auto-Admit Cutoff */}
              <div className="space-y-3 pt-4 border-t border-border-quiet">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-ink-parchment">
                    Auto-Approval Confidence Level
                  </label>
                  <span className="text-xs font-mono text-wine-crimson font-medium">
                    {autoAdmitCutoff}%
                  </span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="100"
                  step="1"
                  value={autoAdmitCutoff}
                  onChange={(e) => setAutoAdmitCutoff(Number(e.target.value))}
                  className="w-full accent-wine-accent cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-ink-ash">
                  <span>70% (Auto-approve most facts)</span>
                  <span>95% (Recommended)</span>
                  <span>100% (Ask before approving any fact)</span>
                </div>
                <p className="text-[11px] text-ink-ash">
                  Story facts extracted with certainty above this score are approved automatically into your story memory.
                </p>
              </div>

              {/* Contradiction Severity Matrix & Triage Policy */}
              <div className="space-y-3 pt-4 border-t border-border-quiet">
                <label className="text-xs font-medium text-ink-parchment">
                  When a Plot Contradiction is Found:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      id: "halt_critical",
                      title: "Pause Chapter Processing",
                      desc: "Stop processing immediately on major contradictions until you review them.",
                    },
                    {
                      id: "flag_and_continue",
                      title: "Flag for Review (Recommended)",
                      desc: "Add to your review queue and highlight the chapter, but keep processing.",
                    },
                    {
                      id: "soft_warning",
                      title: "Log Minor Warning Only",
                      desc: "Log a quiet note without alerting you or interrupting your flow.",
                    },
                  ].map((policy) => (
                    <button
                      key={policy.id}
                      type="button"
                      onClick={() => setTriagePolicy(policy.id)}
                      className={`p-4 rounded-[4px] border text-left transition-all flex flex-col justify-between space-y-2 ${
                        triagePolicy === policy.id
                          ? "bg-wine-accent/15 border-wine-accent shadow-[0_4px_16px_rgba(122,29,57,0.25)]"
                          : "bg-surface-card border-border-subtle hover:border-border-focus"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-serif text-xs font-medium text-ink-parchment">
                          {policy.title}
                        </span>
                        {triagePolicy === policy.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-wine-crimson shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-ink-ash leading-relaxed">
                        {policy.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-Adjudicate Minor Ambiguities */}
              <div className="pt-4 border-t border-border-quiet flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-ink-parchment">
                    Ignore Minor Wording Differences
                  </span>
                  <p className="text-[11px] text-ink-ash">
                    Lets the checker overlook harmless phrasing differences when earlier chapters make the fact clear.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoAdjudicateMinor(!autoAdjudicateMinor)}
                  className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                    autoAdjudicateMinor ? "bg-wine-accent" : "bg-surface-card border border-border-subtle"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-ink-parchment transition-transform duration-150 absolute top-1 ${
                      autoAdjudicateMinor ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </Surface>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: AI MODELS & SETTINGS                                              */}
        {/* ========================================================================= */}
        {activeTab === "models" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Surface depth={2} border="subtle" rounded="sm" className="p-6 sm:p-8 space-y-6">
              <div className="border-b border-border-quiet pb-4">
                <h2 className="font-serif text-lg font-medium text-ink-parchment">
                  4. AI Models & Settings
                </h2>
                <p className="text-xs text-ink-bone mt-1">
                  Choose which AI model analyzes your chapters and how deep its story memory reaches.
                </p>
              </div>

              {/* Primary Narrative Intelligence Model */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-ink-parchment">
                  Primary AI Model
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      id: "claude-3-7-sonnet",
                      title: "Claude 3.7 Sonnet (Recommended)",
                      badge: "Best Balance",
                      desc: "Best balance of deep literary comprehension, tone sensitivity, and fast plot validation.",
                    },
                    {
                      id: "claude-3-5-haiku",
                      title: "Claude 3.5 Haiku (High Speed)",
                      badge: "Fast Extraction",
                      desc: "Faster, lighter model ideal for quick chapter importing and simple character tracking.",
                    },
                    {
                      id: "claude-opus",
                      title: "Claude Opus (Deep Analysis)",
                      badge: "Deep Canon",
                      desc: "Maximum reasoning power for complex, interwoven multi-character climaxes.",
                    },
                  ].map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setPrimaryModel(model.id)}
                      className={`p-4 rounded-[4px] border text-left transition-all flex flex-col justify-between space-y-3 ${
                        primaryModel === model.id
                          ? "bg-wine-accent/15 border-wine-accent shadow-[0_4px_16px_rgba(122,29,57,0.25)]"
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

              {/* Sovereign Anthropic API Key Override */}
              <div className="space-y-2 pt-4 border-t border-border-quiet">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-ink-parchment">
                    Custom Anthropic API Key (Optional)
                  </label>
                  <span className="text-[10px] text-pine-moss flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>System Key Active</span>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKeyOverride}
                    onChange={(e) => setApiKeyOverride(e.target.value)}
                    placeholder="Leave blank to use the default system key"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-[4px] bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-2.5 text-ink-ash hover:text-ink-parchment"
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-ink-ash">
                  Optional. If you have your own Anthropic key, you can provide it here to use your personal quota.
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
                    className="w-full px-3.5 py-2.5 rounded-[4px] bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent transition-colors"
                  >
                    <option value="text-embedding-3-large">OpenAI text-embedding-3-large (Recommended)</option>
                    <option value="bge-large-en">BAAI bge-large-en (Fast Local Embeddings)</option>
                    <option value="voyage-3">Voyage AI voyage-3 (Literary Embeddings)</option>
                  </select>
                  <p className="text-[11px] text-ink-ash">
                    Used for search and matching character references across chapters.
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
                    <span>1 Step (Direct references)</span>
                    <span>2 Steps (Standard)</span>
                    <span>5 Steps (Deep background lore)</span>
                  </div>
                </div>
              </div>
            </Surface>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: EXPORT & DANGER ZONE                                               */}
        {/* ========================================================================= */}
        {activeTab === "danger" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Surface
              depth={2}
              border="contradiction"
              rounded="sm"
              className="p-6 sm:p-8 space-y-6 relative overflow-hidden"
            >
              <div className="border-b border-severity-contradiction/30 pb-4">
                <div className="flex items-center gap-2 text-severity-contradiction mb-1">
                  <AlertOctagon className="w-5 h-5" />
                  <h2 className="font-serif text-lg font-medium">
                    5. Export & Danger Zone
                  </h2>
                </div>
                <p className="text-xs text-ink-bone mt-1">
                  Export your story files, re-check your manuscript, or delete this project.
                </p>
              </div>

              {/* Action 1: Export Lore Bible */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[4px] bg-surface-card border border-border-subtle">
                <div className="space-y-1">
                  <h3 className="font-serif text-xs font-medium text-ink-parchment">
                    Export Complete Story Bible (Markdown)
                  </h3>
                  <p className="text-[11px] text-ink-ash">
                    Downloads a clean Markdown file with all your characters, timeline events, world rules, and plot notes.
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[4px] bg-surface-card border border-border-subtle">
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

              {/* Action 3: Purge Sovereign Workspace */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[4px] bg-severity-contradiction/10 border border-severity-contradiction/40">
                <div className="space-y-1">
                  <h3 className="font-serif text-xs font-semibold text-severity-contradiction">
                    Delete This Story Project
                  </h3>
                  <p className="text-[11px] text-ink-bone">
                    Permanently deletes this book, all uploaded chapters, characters, and notes. This cannot be undone.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Surface depth={3} border="subtle" rounded="sm" className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-quiet pb-3">
              <h3 className="font-serif text-base font-medium text-ink-parchment">
                Add Story Rule
              </h3>
              <button
                onClick={() => setNewRuleModalOpen(false)}
                className="text-ink-ash hover:text-ink-parchment text-sm"
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
                  className="w-full px-3 py-2 rounded-[4px] bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent"
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
                  className="w-full px-3 py-2 rounded-[4px] bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-wine-accent font-serif"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-quiet">
                <Button
                  type="button"
                  variant="outline"
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
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rule</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <Surface depth={3} border="contradiction" rounded="sm" className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-severity-contradiction border-b border-border-quiet pb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-serif text-base font-semibold">
                Delete Project
              </h3>
            </div>

            <p className="text-xs text-ink-bone leading-relaxed">
              This action is permanent. All chapters, consistency checks, characters, and notes will be completely removed.
            </p>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-medium text-ink-parchment">
                To confirm, type <span className="font-mono text-wine-crimson font-bold">&ldquo;{project?.title}&rdquo;</span> below:
              </label>
              <input
                type="text"
                value={deleteConfirmationTitle}
                onChange={(e) => setDeleteConfirmationTitle(e.target.value)}
                placeholder={project?.title}
                className="w-full px-3 py-2 rounded-[4px] bg-surface-field border border-border-subtle text-ink-parchment text-xs focus:outline-none focus:border-severity-contradiction font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-quiet">
              <Button
                type="button"
                variant="outline"
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
                isLoading={isDeleting}
                disabled={deleteConfirmationTitle !== project?.title}
                onClick={handleDeleteWorkspace}
                className="gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanently Delete Project</span>
              </Button>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}