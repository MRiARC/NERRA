"use client";

import React, { useState, use, useMemo } from "react";
import Link from "next/link";
import { useWorldRules, useWorld, useProject } from "@/hooks/useStoryData";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Scroll,
  Plus,
  Trash2,
  Download,
  MapPin,
  Box,
  Filter,
  Search,
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface BiblePageProps {
  params: Promise<{ id: string }>;
}

export default function BiblePage({ params }: BiblePageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const queryClient = useQueryClient();

  const { data: project } = useProject(projectId);
  const { data: rules = [], isLoading: rulesLoading } = useWorldRules(projectId);
  const { data: worldData, isLoading: worldLoading } = useWorld(projectId);

  const [activeTab, setActiveTab] = useState<"rules" | "locations" | "objects">("rules");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // New rule modal state
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newCategory, setNewCategory] = useState("setting");
  const [newRuleText, setNewRuleText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filtered rules
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (searchQuery) {
        return r.rule_text.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [rules, categoryFilter, searchQuery]);

  // Handle create rule
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleText.trim()) return;

    setIsSubmitting(true);
    try {
      await api.story.createWorldRule(projectId, {
        category: newCategory,
        rule_text: newRuleText.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ["world-rules", projectId] });
      setNewRuleText("");
      setIsAddingRule(false);
      toast.success("Canon rule recorded into story bible.");
    } catch (err: any) {
      toast.error(err.message || "Failed to create rule.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete rule
  const handleDeleteRule = async (ruleId: string) => {
    try {
      await api.story.deleteWorldRule(projectId, ruleId);
      await queryClient.invalidateQueries({ queryKey: ["world-rules", projectId] });
      toast.success("Rule excised from canon.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete rule.");
    }
  };

  // Handle Export Bible
  const handleExportBible = async () => {
    setIsExporting(true);
    try {
      const bible = await api.story.exportBible(projectId);
      const blob = new Blob([JSON.stringify(bible, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project?.title || "Story"}_Bible_Export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Story Bible exported successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to export Story Bible.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
      {/* Header & Mission Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border-subtle pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-ink-ash font-medium">
              World Mechanics &amp; Lore Codex
            </span>
            <span className="text-border-subtle">•</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-pine-forest">
              <span className="w-1.5 h-1.5 rounded-full bg-pine-forest" />
              {rules.length} Canon Constraints Active
            </span>
          </div>
          <h1 className="text-3xl font-serif font-normal tracking-tight text-ink-parchment flex items-center gap-3">
            <Scroll className="w-7 h-7 text-wine-accent" />
            World Rules &amp; Lore Wiki
          </h1>
          <p className="text-sm text-ink-ash max-w-2xl leading-relaxed">
            Define immutable laws of your setting, magic systems, technology, and social customs.
            The audit daemon checks every written chapter against these canon directives.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportBible}
            disabled={isExporting}
            className="gap-2 font-mono text-xs"
          >
            <Download className="w-3.5 h-3.5 text-wine-accent" />
            {isExporting ? "Exporting..." : "Export Bible JSON"}
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddingRule(true)}
            className="gap-2 font-mono text-xs bg-wine-accent text-ink-parchment hover:bg-wine-crimson"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Canon Rule
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center p-1 bg-surface-card border border-border-quiet rounded-xl shadow-inner w-fit">
        <button
          onClick={() => setActiveTab("rules")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
            activeTab === "rules"
              ? "bg-surface-elevated text-ink-parchment shadow-sm border border-border-subtle"
              : "text-ink-ash hover:text-ink-parchment"
          )}
        >
          <Scroll className="w-3.5 h-3.5 text-wine-accent" />
          World Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab("locations")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
            activeTab === "locations"
              ? "bg-surface-elevated text-ink-parchment shadow-sm border border-border-subtle"
              : "text-ink-ash hover:text-ink-parchment"
          )}
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          Locations ({worldData?.locations?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab("objects")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
            activeTab === "objects"
              ? "bg-surface-elevated text-ink-parchment shadow-sm border border-border-subtle"
              : "text-ink-ash hover:text-ink-parchment"
          )}
        >
          <Box className="w-3.5 h-3.5 text-amber-400" />
          Artifacts &amp; Relics ({worldData?.objects?.length ?? 0})
        </button>
      </div>

      {/* TAB 1: World Rules */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          {/* Rule Filter Bar */}
          <Surface depth={1} border="quiet" className="p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-ink-ash absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search canon rules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-surface-card border border-border-subtle rounded-lg pl-8 pr-3 py-1.5 text-xs text-ink-parchment placeholder:text-ink-faint outline-none focus:border-wine-accent w-64"
                />
              </div>

              <span className="text-border-subtle font-mono text-xs hidden sm:inline">|</span>

              <div className="flex items-center gap-2 text-xs font-mono text-ink-ash">
                <Filter className="w-3.5 h-3.5" />
                <span>Category:</span>
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-surface-card border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-ink-parchment outline-none focus:border-wine-accent cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="setting">Setting &amp; Geography</option>
                <option value="magic">Magic &amp; Technology</option>
                <option value="social">Social &amp; Hierarchy</option>
                <option value="biological">Biological &amp; Invariants</option>
                <option value="physics">Physics &amp; World Laws</option>
              </select>
            </div>

            <div className="text-xs font-mono text-ink-faint">
              Showing <span className="text-ink-parchment font-medium">{filteredRules.length}</span> of {rules.length} rules
            </div>
          </Surface>

          {/* Add Rule Modal */}
          {isAddingRule && (
            <Surface depth={2} border="focus" className="p-6 rounded-xl space-y-4 animate-fade-in border-wine-accent/40">
              <div className="flex items-center justify-between border-b border-border-quiet pb-3">
                <h3 className="font-serif text-base font-medium text-ink-parchment">
                  Add New Story Canon Rule
                </h3>
                <button
                  onClick={() => setIsAddingRule(false)}
                  className="text-xs font-mono text-ink-ash hover:text-ink-parchment"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleCreateRule} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-ash mb-1">
                      Rule Category
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-surface-subtle border border-border-subtle rounded-lg px-3 py-2 text-xs text-ink-parchment outline-none focus:border-wine-accent"
                    >
                      <option value="setting">Setting &amp; Geography</option>
                      <option value="magic">Magic &amp; Technology</option>
                      <option value="social">Social &amp; Hierarchy</option>
                      <option value="biological">Biological &amp; Invariants</option>
                      <option value="physics">Physics &amp; World Laws</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-ash mb-1">
                    Canon Directive Text
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g., Nightshade poison requires minimum 2 hours to metabolize before symptoms manifest..."
                    value={newRuleText}
                    onChange={(e) => setNewRuleText(e.target.value)}
                    className="w-full bg-surface-subtle border border-border-subtle rounded-lg p-3 text-xs text-ink-parchment placeholder:text-ink-faint outline-none focus:border-wine-accent"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingRule(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting || !newRuleText.trim()}
                    className="bg-wine-accent text-ink-parchment hover:bg-wine-crimson"
                  >
                    {isSubmitting ? "Recording..." : "Save Rule to Canon"}
                  </Button>
                </div>
              </form>
            </Surface>
          )}

          {/* Rules Stream */}
          {rulesLoading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-wine-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono text-ink-ash">Compiling world canon matrix...</p>
            </div>
          ) : filteredRules.length === 0 ? (
            <Surface depth={2} border="subtle" className="p-12 text-center rounded-2xl max-w-xl mx-auto space-y-4">
              <Scroll className="w-10 h-10 text-ink-ash mx-auto opacity-50" />
              <h3 className="font-serif text-lg text-ink-parchment">No Canon Rules Found</h3>
              <p className="text-xs text-ink-ash leading-relaxed">
                Click &apos;Add Canon Rule&apos; to author world invariants that the continuity checker will enforce.
              </p>
            </Surface>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRules.map((rule) => (
                <Surface
                  key={rule.id}
                  depth={2}
                  border="subtle"
                  className="p-5 rounded-xl flex flex-col justify-between space-y-3 hover:border-border-prominent transition-all duration-150"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-subtle text-ink-ash border border-border-quiet uppercase tracking-wider">
                        {rule.category}
                      </span>
                      {rule.source_chapter && (
                        <span className="font-mono text-[10px] text-ink-faint">
                          Discovered Ch. {rule.source_chapter}
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-sans text-ink-parchment leading-relaxed">
                      {rule.rule_text}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border-quiet flex items-center justify-between text-xs font-mono">
                    <span className="text-[11px] text-pine-forest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-pine-forest" />
                      Enforced by Checker
                    </span>

                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-ink-ash hover:text-wine-crimson p-1 rounded transition-colors"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Surface>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Canon Locations */}
      {activeTab === "locations" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(worldData?.locations || []).map((loc, idx) => (
              <Surface key={idx} depth={2} border="subtle" className="p-5 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-ink-parchment font-serif text-base font-medium">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>{typeof loc === "string" ? loc : loc.name}</span>
                </div>
                {typeof loc !== "string" && loc.description && (
                  <p className="text-xs text-ink-ash leading-relaxed">{loc.description}</p>
                )}
              </Surface>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Artifacts & Relics */}
      {activeTab === "objects" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(worldData?.objects || []).map((obj, idx) => (
              <Surface key={idx} depth={2} border="subtle" className="p-5 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-ink-parchment font-serif text-base font-medium">
                  <Box className="w-4 h-4 text-amber-400" />
                  <span>{typeof obj === "string" ? obj : obj.name}</span>
                </div>
                {typeof obj !== "string" && obj.description && (
                  <p className="text-xs text-ink-ash leading-relaxed">{obj.description}</p>
                )}
              </Surface>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
