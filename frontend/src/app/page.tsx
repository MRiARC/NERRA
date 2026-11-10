"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  CheckCircle2,
  GitMerge,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  Users,
  Send,
  Layers,
  ShieldAlert,
  Check,
  Network,
  Clock,
  Eye,
  Package,
  BookMarked,
  Trash2,
  Wand2,
  Download,
  History,
  ShieldCheck,
} from "lucide-react";
import StoryGraphView from "@/components/StoryGraphView";
import TimelineView from "@/components/TimelineView";
import KnowledgeMatrixView from "@/components/KnowledgeMatrixView";
import {
  api,
  Project,
  Issue,
  Character,
  Location,
  StoryObject,
  ObjectCustodyEvent,
  WorldRule,
  Claim,
  ManuscriptStatus,
  ManuscriptVersion,
  ManuscriptSummary,
  ValidationCandidate,
  CorrectionRule,
} from "@/lib/api";

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const SAMPLE_STORY = `Chapter 1 - The Arrival at Ashford

Sarah stepped off the last train into Ashford's rain-slicked streets, her green eyes taking in the sleepy square for the first time. In her coat pocket she fingered the brass compass her grandfather had left her, its needle spinning wildly as if confused by the town itself. The Bellweather Inn was the only light still burning. She checked in under a false name and slept with the compass under her pillow.

Chapter 2 - The Question at the Station

Detective Park had been on the Ashford force for twenty years, and he did not like unsolved things. At the station house he spread the case files across his desk and asked his young deputy, "Who do you think committed the murder of the curator at the Hollis Museum?" The deputy shrugged; the file was thin. Park tapped the photograph of the missing diary with one finger and said nothing more for a long time.

Chapter 3 - The Morning Briefing

Sarah's blue eyes flashed with irritation as the innkeeper questioned her about the previous night. Across town, Park briefed his detectives in the damp morning light. He had only learned of the curator's murder that very morning, and already it refused to fit together. The museum had no record of the diary ever existing. Back at the inn, Sarah unfolded a map of the cellars and made her plans for the night ahead.

Chapter 4 - What the Cellars Keep

The tunnel under the Bellweather Inn smelled of salt and old paper. Sarah moved by flashlight, counting doorways as her grandfather's letter had instructed. When she finally emerged behind the museum's restoration wing, the needle of her thoughts pointed one direction only: whoever removed the diary had done it before the museum ever opened its doors. She climbed the drainpipe and disappeared through the window.`;

export default function NerraDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "issues" | "characters" | "graph" | "timeline" | "knowledge" | "locations" | "claims" | "chat"
  >("issues");
  const [loading, setLoading] = useState(false);

  // Story state
  const [issues, setIssues] = useState<Issue[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [storyObjects, setStoryObjects] = useState<StoryObject[]>([]);
  const [custodyByObj, setCustodyByObj] = useState<Record<string, ObjectCustodyEvent[]>>({});
  const [worldRules, setWorldRules] = useState<WorldRule[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);

  // Rule & reasoner state
  const [newRuleText, setNewRuleText] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState<WorldRule["category"]>("setting");
  const [reasoningIssueId, setReasoningIssueId] = useState<string | null>(null);

  // Versioning & export state
  const [versions, setVersions] = useState<ManuscriptVersion[]>([]);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [exportingBible, setExportingBible] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [manuscripts, setManuscripts] = useState<ManuscriptSummary[]>([]);
  const [isAppendOpen, setIsAppendOpen] = useState(false);
  const [appendTitle, setAppendTitle] = useState("");
  const [appendText, setAppendText] = useState("");
  const [appendingChapter, setAppendingChapter] = useState(false);

  // M3.2 Validation Gate state
  const [candidates, setCandidates] = useState<ValidationCandidate[]>([]);
  const [isCandidatesOpen, setIsCandidatesOpen] = useState(false);
  const [resolvingCandidateId, setResolvingCandidateId] = useState<string | null>(null);
  const [candidateMergeTargets, setCandidateMergeTargets] = useState<Record<string, string>>({});
  const [candidateSplitNames, setCandidateSplitNames] = useState<Record<string, string>>({});

  // M3.3 Feedback Loop state
  const [corrections, setCorrections] = useState<CorrectionRule[]>([]);
  const [isCorrectionsOpen, setIsCorrectionsOpen] = useState(false);
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [editingClaimValue, setEditingClaimValue] = useState("");
  const [renamingCharId, setRenamingCharId] = useState<string | null>(null);
  const [renameCharInput, setRenameCharInput] = useState("");

  // Filter state
  const [issueFilter, setIssueFilter] = useState<
    | "all"
    | "review_queue"
    | "contradiction"
    | "knowledge_violation"
    | "unresolved_thread"
    | "continuity_note"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Panels
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [importTitle, setImportTitle] = useState("The Ashford Mystery");
  const [importText, setImportText] = useState(SAMPLE_STORY);
  const [importStatus, setImportStatus] = useState<ManuscriptStatus | null>(null);

  // Merge state
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergeSourceId, setMergeSourceId] = useState("");

  // Chat state
  const [chatMessages, setChatMessages] = useState<
    Array<{
      role: "user" | "assistant";
      text: string;
      citations?: Array<{ chapter: number; excerpt: string }>;
      intent?: string;
      graph_entities?: string[];
    }>
  >([
    {
      role: "assistant",
      text: "Hello! I am your story intelligence assistant. Ask me anything about characters, locations, continuity, or timeline across your manuscript chapters.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize projects
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.getProjects();
        if (!active) return;
        setProjects(data);
        if (data.length > 0) {
          setSelectedProjectId((prev) => prev || data[0].id);
        }
      } catch (err) {
        console.error("Failed to load projects:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // When project changes, load its data
  useEffect(() => {
    if (selectedProjectId) {
      loadProjectData(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  async function loadProjectData(projectId: string) {
    setLoading(true);
    try {
      const [iss, chars, world, clms, rules, cands, corrs] = await Promise.all([
        api.getIssues(projectId),
        api.getCharacters(projectId),
        api.getWorld(projectId),
        api.getClaims(projectId),
        api.getWorldRules(projectId),
        api.getCandidates(projectId, "pending").catch(() => []),
        api.getCorrections(projectId).catch(() => []),
      ]);
      setIssues(iss);
      setCharacters(chars);
      setLocations(world.locations);
      setStoryObjects(world.objects);
      setCustodyByObj({});
      setClaims(clms);
      setWorldRules(rules);
      setCandidates(cands);
      setCorrections(corrs);
    } catch (err) {
      console.error("Failed to load project details:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReasonIssue(issueId: string) {
    if (!selectedProjectId) return;
    setReasoningIssueId(issueId);
    try {
      const updated = await api.reasonAboutIssue(selectedProjectId, issueId);
      setIssues((prev) => prev.map((item) => (item.id === issueId ? updated : item)));
    } catch (err: unknown) {
      alert("AI intent check failed: " + getErrorMessage(err));
    } finally {
      setReasoningIssueId(null);
    }
  }

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId || !newRuleText.trim()) return;
    try {
      await api.createWorldRule(selectedProjectId, newRuleCategory, newRuleText.trim());
      setNewRuleText("");
      loadProjectData(selectedProjectId);
    } catch (err: unknown) {
      alert("Failed to create rule: " + getErrorMessage(err));
    }
  }

  async function handleDeleteRule(ruleId: string) {
    if (!selectedProjectId) return;
    try {
      await api.deleteWorldRule(selectedProjectId, ruleId);
      setWorldRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err: unknown) {
      alert("Failed to delete rule: " + getErrorMessage(err));
    }
  }

  async function handleInspectCustody(objectId: string) {
    if (!selectedProjectId) return;
    if (custodyByObj[objectId]) {
      setCustodyByObj((prev) => {
        const copy = { ...prev };
        delete copy[objectId];
        return copy;
      });
      return;
    }
    try {
      const list = await api.getObjectCustody(selectedProjectId, objectId);
      setCustodyByObj((prev) => ({ ...prev, [objectId]: list }));
    } catch (err) {
      console.error("Failed to load custody log:", err);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    try {
      const proj = await api.createProject(newProjectTitle.trim());
      setProjects((prev) => [proj, ...prev]);
      setSelectedProjectId(proj.id);
      setIsNewProjectOpen(false);
      setNewProjectTitle("");
    } catch (err: unknown) {
      alert("Error creating project: " + getErrorMessage(err));
    }
  }

  async function handleImportManuscript(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId || (!importFile && !importText.trim())) return;
    try {
      const res = await api.importManuscript(selectedProjectId, importTitle, importText, importFile);
      setImportFile(null);
      setImportStatus({
        manuscript_id: res.manuscript_id,
        status: "processing",
        chapters_done: 0,
        chapters_total: 4,
      });

      // Poll progress
      const interval = setInterval(async () => {
        try {
          const status = await api.getManuscriptStatus(res.manuscript_id, selectedProjectId);
          setImportStatus(status);
          if (status.status === "ready" || status.status === "failed") {
            clearInterval(interval);
            loadProjectData(selectedProjectId);
            setTimeout(() => {
              setIsImportOpen(false);
              setImportStatus(null);
            }, 1200);
          }
        } catch {
          clearInterval(interval);
        }
      }, 1500);
    } catch (err: unknown) {
      alert("Import failed: " + getErrorMessage(err));
    }
  }

  async function handleUpdateIssue(
    issueId: string,
    status: "open" | "accepted" | "rejected" | "intentional"
  ) {
    if (!selectedProjectId) return;
    try {
      const updated = await api.updateIssue(selectedProjectId, issueId, status);
      setIssues((prev) => prev.map((item) => (item.id === issueId ? updated : item)));
    } catch (err: unknown) {
      alert("Failed to update issue: " + getErrorMessage(err));
    }
  }

  async function handleMergeCharacters(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId || !mergeTargetId || !mergeSourceId || mergeTargetId === mergeSourceId) return;
    try {
      await api.mergeCharacters(selectedProjectId, mergeTargetId, mergeSourceId);
      setIsMergeModalOpen(false);
      setMergeTargetId("");
      setMergeSourceId("");
      loadProjectData(selectedProjectId);
    } catch (err: unknown) {
      alert("Merge failed: " + getErrorMessage(err));
    }
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    const q = chatInput.trim();
    if (!q || !selectedProjectId || chatLoading) return;

    setChatMessages((prev) => [...prev, { role: "user", text: q }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await api.sendChat(selectedProjectId, q);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: res.answer,
          citations: res.citations,
          intent: res.intent,
          graph_entities: res.graph_entities,
        },
      ]);
    } catch (err: unknown) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Error querying story intelligence: " + (getErrorMessage(err) || "Failed to reach backend"),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleOpenAppend() {
    if (!selectedProjectId) return;
    try {
      const list = await api.getManuscripts(selectedProjectId);
      setManuscripts(list);
      setIsAppendOpen(true);
    } catch (err: unknown) {
      alert("Failed to load manuscripts: " + getErrorMessage(err));
    }
  }

  async function handleAppendChapter(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId || manuscripts.length === 0 || !appendText.trim()) return;
    setAppendingChapter(true);
    try {
      await api.appendChapter(selectedProjectId, manuscripts[0].id, appendTitle, appendText);
      setIsAppendOpen(false);
      setAppendTitle("");
      setAppendText("");
      await loadProjectData(selectedProjectId);
    } catch (err: unknown) {
      alert("Append chapter failed: " + getErrorMessage(err));
    } finally {
      setAppendingChapter(false);
    }
  }

  async function handleOpenVersions() {
    if (!selectedProjectId) return;
    try {
      const list = await api.getVersions(selectedProjectId);
      setVersions(list);
      setIsVersionsOpen(true);
    } catch (err: unknown) {
      alert("Failed to load draft versions: " + getErrorMessage(err));
    }
  }

  async function handleOpenCandidates() {
    if (!selectedProjectId) return;
    try {
      const list = await api.getCandidates(selectedProjectId, "pending");
      setCandidates(list);
      setIsCandidatesOpen(true);
    } catch (err: unknown) {
      alert("Failed to load validation candidates: " + getErrorMessage(err));
    }
  }

  async function handleResolveCandidate(
    candidateId: string,
    action: "approve" | "reject" | "merge" | "split"
  ) {
    if (!selectedProjectId) return;
    setResolvingCandidateId(candidateId);
    try {
      await api.resolveCandidate(selectedProjectId, candidateId, {
        action,
        target_character_id: action === "merge" ? candidateMergeTargets[candidateId] || null : null,
        split_name: action === "split" ? candidateSplitNames[candidateId] || null : null,
      });
      await loadProjectData(selectedProjectId);
    } catch (err: unknown) {
      alert("Failed to resolve candidate: " + getErrorMessage(err));
    } finally {
      setResolvingCandidateId(null);
    }
  }

  async function handleSaveClaimEdit(claimId: string) {
    if (!selectedProjectId || !editingClaimValue.trim()) return;
    try {
      await api.patchClaim(selectedProjectId, claimId, {
        value: editingClaimValue.trim(),
        reason: "Inline author override",
        re_audit: true,
      });
      setEditingClaimId(null);
      setEditingClaimValue("");
      await loadProjectData(selectedProjectId);
    } catch (err: unknown) {
      alert("Claim update failed: " + getErrorMessage(err));
    }
  }

  async function handleRenameCharacter(charId: string) {
    if (!selectedProjectId || !renameCharInput.trim()) return;
    try {
      await api.renameCharacter(selectedProjectId, charId, renameCharInput.trim());
      setRenamingCharId(null);
      setRenameCharInput("");
      await loadProjectData(selectedProjectId);
    } catch (err: unknown) {
      alert("Character rename failed: " + getErrorMessage(err));
    }
  }

  async function handleSplitAlias(charId: string, aliasText: string) {
    if (!selectedProjectId) return;
    try {
      await api.splitCharacterAlias(selectedProjectId, charId, aliasText, aliasText);
      await loadProjectData(selectedProjectId);
    } catch (err: unknown) {
      alert("Alias split failed: " + getErrorMessage(err));
    }
  }

  async function handleDeleteCorrection(correctionId: string) {
    if (!selectedProjectId) return;
    try {
      await api.deleteCorrection(selectedProjectId, correctionId);
      setCorrections((prev) => prev.filter((r) => r.id !== correctionId));
    } catch (err: unknown) {
      alert("Failed to remove correction rule: " + getErrorMessage(err));
    }
  }

  async function handleExportBible() {
    if (!selectedProjectId || exportingBible) return;
    setExportingBible(true);
    try {
      const exported = await api.exportBible(selectedProjectId);
      const blob = new Blob([exported.markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exported.project_title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-story-bible.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert("Story Bible export failed: " + getErrorMessage(err));
    } finally {
      setExportingBible(false);
    }
  }

  // Filtered issues
  const filteredIssues = issues.filter((iss) => {
    if (issueFilter === "review_queue") {
      const isReview =
        iss.severity === "yellow" ||
        iss.intent_classification === "ambiguous" ||
        (iss.confidence !== undefined && iss.confidence < 0.85);
      if (!isReview) return false;
    } else if (issueFilter !== "all" && iss.type !== issueFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return iss.description.toLowerCase().includes(q) || iss.type.toLowerCase().includes(q);
    }
    return true;
  });

  const redCount = issues.filter((i) => i.severity === "red" && i.status === "open").length;
  const reviewQueueCount = issues.filter(
    (i) =>
      i.status === "open" &&
      (i.severity === "yellow" ||
        i.intent_classification === "ambiguous" ||
        (i.confidence !== undefined && i.confidence < 0.85))
  ).length;
  const blueCount = issues.filter((i) => i.severity === "blue" && i.status === "open").length;
  const greenCount = issues.filter((i) => i.severity === "green" && i.status === "open").length;

  return (
    <div className="min-h-screen bg-[#090b10] text-[#e2e8f0] font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-[#0d1117]/90 backdrop-blur sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 font-bold text-white text-base">
            N
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                NERRA
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v1 Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Deterministic Story Intelligence & Contradiction Engine</p>
          </div>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-1">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-sm text-slate-200 font-medium px-2 py-1 outline-none cursor-pointer"
            >
              {projects.length === 0 && <option value="">No projects found</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                  {p.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsNewProjectOpen(true)}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
              title="Create new project"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm shadow-indigo-600/30"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Manuscript</span>
          </button>

          <button
            onClick={handleOpenAppend}
            disabled={!selectedProjectId}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition disabled:opacity-40"
            title="Append a new chapter incrementally"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden lg:inline">Append Ch</span>
          </button>

          <button
            onClick={() => setIsCorrectionsOpen(true)}
            disabled={!selectedProjectId}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition disabled:opacity-40"
            title="Inspect author feedback correction rules"
          >
            <BookMarked className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Corrections</span>
            {corrections.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {corrections.length}
              </span>
            )}
          </button>

          <button
            onClick={handleOpenCandidates}
            disabled={!selectedProjectId}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition disabled:opacity-40"
            title="Inspect pre-graph quarantined & review candidates"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden md:inline">Gate Queue</span>
            {candidates.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {candidates.length}
              </span>
            )}
          </button>

          <button
            onClick={handleOpenVersions}
            disabled={!selectedProjectId}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition disabled:opacity-40"
            title="View draft snapshots & diff summary"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Versions</span>
          </button>

          <button
            onClick={handleExportBible}
            disabled={!selectedProjectId || exportingBible}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition disabled:opacity-40"
            title="Download full Living Story Bible (.md)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">{exportingBible ? "Exporting..." : "Export Bible"}</span>
          </button>

          <button
            onClick={() => selectedProjectId && loadProjectData(selectedProjectId)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            title="Refresh story state"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center Content */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {/* Subheader & Tabs */}
          <div className="border-b border-slate-800/80 bg-[#090b10] px-8 pt-4 pb-0 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab("issues")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "issues"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Consistency & Contradictions</span>
                {redCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {redCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("characters")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "characters"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Character Bible</span>
                <span className="text-xs text-slate-500">({characters.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("graph")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "graph"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Network className="w-4 h-4 text-cyan-400" />
                <span>Story Graph</span>
              </button>

              <button
                onClick={() => setActiveTab("timeline")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "timeline"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Timeline</span>
              </button>

              <button
                onClick={() => setActiveTab("knowledge")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "knowledge"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Eye className="w-4 h-4 text-sky-400" />
                <span>Knowledge Matrix</span>
              </button>

              <button
                onClick={() => setActiveTab("claims")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "claims"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Verified Claims</span>
                <span className="text-xs text-slate-500">({claims.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("locations")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "locations"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>World Locations</span>
                <span className="text-xs text-slate-500">({locations.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("chat")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "chat"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Story Chat Agent</span>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-2 pb-3">
              <span className="text-xs px-2.5 py-1 rounded bg-rose-950/40 text-rose-300 border border-rose-900/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                {redCount} Contradictions
              </span>
              <span className="text-xs px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-900/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {greenCount} Loose Threads
              </span>
              <span className="text-xs px-2.5 py-1 rounded bg-blue-950/40 text-blue-300 border border-blue-900/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {blueCount} Notes
              </span>
            </div>
          </div>

          {/* TAB 1: ISSUES / CONTRADICTION ENGINE */}
          {activeTab === "issues" && (
            <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {(
                    [
                      { id: "all", label: "All Issues", count: issues.length },
                      { id: "review_queue", label: "🟡 Review Queue", count: reviewQueueCount },
                      { id: "contradiction", label: "🔴 Contradictions", count: redCount },
                      { id: "knowledge_violation", label: "🔵 Knowledge Timing", count: issues.filter((i) => i.type === "knowledge_violation").length },
                      { id: "unresolved_thread", label: "🟢 Dangling Threads", count: greenCount },
                      { id: "continuity_note", label: "🔵 Continuity Notes", count: issues.filter((i) => i.type === "continuity_note").length },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setIssueFilter(f.id)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition flex items-center gap-1.5 ${
                        issueFilter === f.id
                          ? "bg-slate-200 text-slate-900 font-semibold"
                          : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      <span>{f.label}</span>
                      <span className="text-[11px] opacity-75">({f.count})</span>
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search issues..."
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Issues Grid */}
              {filteredIssues.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl p-8 bg-slate-950/20">
                  <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-slate-300 font-semibold text-base">No matching issues found</h3>
                  <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                    {issues.length === 0
                      ? "Import a manuscript to automatically detect character contradictions, knowledge violations, and dangling plot threads."
                      : "All filtered issues have been reviewed or resolved."}
                  </p>
                  {issues.length === 0 && (
                    <button
                      onClick={() => setIsImportOpen(true)}
                      className="mt-4 inline-flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Import Demo Story
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredIssues.map((issue) => {
                    const isRed = issue.severity === "red";
                    const isGreen = issue.severity === "green";

                    return (
                      <div
                        key={issue.id}
                        className={`border rounded-xl p-5 transition relative ${
                          isRed
                            ? "bg-rose-950/10 border-rose-900/30 hover:border-rose-700/50"
                            : isGreen
                            ? "bg-emerald-950/10 border-emerald-900/30 hover:border-emerald-700/50"
                            : "bg-blue-950/10 border-blue-900/30 hover:border-blue-700/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                  isRed
                                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                    : isGreen
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                }`}
                              >
                                {issue.type.replace("_", " ")}
                              </span>

                              <span
                                className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                                  issue.status === "open"
                                    ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                    : issue.status === "accepted"
                                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {issue.status}
                              </span>

                              {issue.intent_classification && (
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                    issue.intent_classification === "intentional"
                                      ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                                      : issue.intent_classification === "ambiguous"
                                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                      : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                                  }`}
                                >
                                  {issue.intent_classification}
                                  {issue.confidence !== undefined
                                    ? ` · ${Math.round(issue.confidence * 100)}%`
                                    : ""}
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-semibold text-white leading-snug">{issue.description}</h4>
                            {issue.ai_reasoning && (
                              <p className="text-xs text-slate-400 bg-slate-950/50 border border-slate-800/70 rounded-lg px-3 py-2 mt-1">
                                <span className="text-indigo-400 font-semibold mr-1.5">AI Reasoning:</span>
                                {issue.ai_reasoning}
                              </p>
                            )}
                          </div>

                          {/* Action controls */}
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <button
                              onClick={() => handleReasonIssue(issue.id)}
                              disabled={reasoningIssueId === issue.id}
                              className="text-xs px-2.5 py-1 rounded-md bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition flex items-center gap-1 disabled:opacity-50"
                              title="Run LangGraph Intent Reasoner"
                            >
                              <Wand2
                                className={`w-3.5 h-3.5 ${
                                  reasoningIssueId === issue.id ? "animate-spin" : ""
                                }`}
                              />
                              <span>Intent Check</span>
                            </button>
                            {issue.status === "open" ? (
                              <>
                                <button
                                  onClick={() => handleUpdateIssue(issue.id, "accepted")}
                                  className="text-xs px-2.5 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1"
                                  title="Accept issue & resolve in manuscript"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Accept</span>
                                </button>
                                <button
                                  onClick={() => handleUpdateIssue(issue.id, "intentional")}
                                  className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                  title="Intentional literary choice"
                                >
                                  Intentional
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleUpdateIssue(issue.id, "open")}
                                className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                              >
                                Reopen
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Evidence Quotes Preview */}
                        {issue.evidence && issue.evidence.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {issue.evidence.map((ev, idx) => (
                              <div
                                key={idx}
                                className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-3 text-xs flex flex-col justify-between"
                              >
                                <div className="flex items-center justify-between mb-1 text-slate-400 font-medium">
                                  <span className="text-indigo-400 font-semibold">Chapter {ev.chapter}</span>
                                  <span className="text-[10px] text-slate-500">Verbatim Passage</span>
                                </div>
                                <blockquote className="text-slate-200 italic line-clamp-3">
                                  &ldquo;{ev.quote || ev.fact || "Mentioned in this chapter"}&rdquo;
                                </blockquote>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CHARACTERS */}
          {activeTab === "characters" && (
            <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Character Registry & Living Bible</h3>
                  <p className="text-xs text-slate-400">
                    Tracked entities across the novel, their physical traits, and aliases.
                  </p>
                </div>
                {characters.length >= 2 && (
                  <button
                    onClick={() => setIsMergeModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 transition"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Merge Duplicate Characters</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    className="border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900/80 rounded-xl p-5 space-y-3 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm">
                          {char.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{char.name}</h4>
                          <span className="text-[11px] text-slate-400 capitalize">{char.status}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setRenamingCharId(char.id);
                            setRenameCharInput(char.name);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300"
                          title="Safe UUID-preserving rename"
                        >
                          Rename
                        </button>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          Ch. {char.first_chapter ?? 1}–{char.last_chapter ?? 1}
                        </span>
                      </div>
                    </div>

                    {renamingCharId === char.id && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          value={renameCharInput}
                          onChange={(e) => setRenameCharInput(e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white flex-1"
                        />
                        <button
                          onClick={() => handleRenameCharacter(char.id)}
                          className="text-[11px] px-2 py-1 rounded bg-indigo-600 text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setRenamingCharId(null)}
                          className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {char.description && (
                      <p className="text-xs text-slate-300 line-clamp-2">{char.description}</p>
                    )}

                    {/* Aliases */}
                    {char.aliases && char.aliases.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Aliases:</span>
                        {char.aliases.map((al, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/50"
                          >
                            <span>{al}</span>
                            <button
                              onClick={() => handleSplitAlias(char.id, al)}
                              className="text-amber-400 hover:text-amber-200 font-semibold"
                              title={`Split "${al}" into its own character`}
                            >
                              Split
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Physical Traits */}
                    {char.physical_traits && Object.keys(char.physical_traits).length > 0 && (
                      <div className="pt-2 border-t border-slate-800/60 flex flex-wrap gap-1.5">
                        {Object.entries(char.physical_traits).map(([trait, val], idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-900/50"
                          >
                            <span className="text-indigo-400/80">{trait}:</span> {String(val)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2.5: STORY GRAPH (MILESTONE 2.1) */}
          {activeTab === "graph" && selectedProjectId && (
            <StoryGraphView key={selectedProjectId} projectId={selectedProjectId} />
          )}

          {/* TAB 2.6: DUAL TIMELINE (MILESTONE 2.2) */}
          {activeTab === "timeline" && selectedProjectId && (
            <TimelineView key={selectedProjectId} projectId={selectedProjectId} />
          )}

          {/* TAB 3: CLAIMS */}
          {activeTab === "claims" && (
            <div className="p-8 max-w-7xl w-full mx-auto space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Extracted Story Claims & Provenance</h3>
                <p className="text-xs text-slate-400">
                  Every fact extracted from the manuscript with verifiable character-level quote provenance.
                </p>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400">
                      <th className="py-3 px-4 font-semibold">Subject</th>
                      <th className="py-3 px-4 font-semibold">Attribute</th>
                      <th className="py-3 px-4 font-semibold">Value</th>
                      <th className="py-3 px-4 font-semibold">Chapter</th>
                      <th className="py-3 px-4 font-semibold">Verbatim Evidence Quote</th>
                      <th className="py-3 px-4 font-semibold text-right">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {claims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-4 font-medium text-white">{claim.subject}</td>
                        <td className="py-2.5 px-4 text-indigo-300 font-mono text-[11px]">{claim.attribute}</td>
                        <td className="py-2.5 px-4 text-slate-200">
                          {editingClaimId === claim.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingClaimValue}
                                onChange={(e) => setEditingClaimValue(e.target.value)}
                                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                              />
                              <button
                                onClick={() => handleSaveClaimEdit(claim.id)}
                                className="text-[11px] px-2 py-1 rounded bg-emerald-600 text-white"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingClaimId(null)}
                                className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            claim.value
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 font-mono">Ch. {claim.chapter}</td>
                        <td className="py-2.5 px-4 text-slate-400 italic font-serif">
                          &ldquo;{claim.evidence_quote || "—"}&rdquo;
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setEditingClaimId(claim.id);
                              setEditingClaimValue(claim.value);
                            }}
                            className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2.7: KNOWLEDGE MATRIX (MILESTONE 2.3) */}
          {activeTab === "knowledge" && selectedProjectId && (
            <KnowledgeMatrixView key={selectedProjectId} projectId={selectedProjectId} />
          )}

          {/* TAB 4: WORLD LOCATIONS & OBJECT CUSTODY */}
          {activeTab === "locations" && (
            <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white">World Locations</h3>
                  <p className="text-xs text-slate-400">Key places registered in the story world.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {locations.map((loc) => (
                    <div key={loc.id} className="border border-slate-800 bg-slate-900/40 rounded-xl p-5 space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-sm font-bold text-white">{loc.name}</h4>
                      </div>
                      {loc.description && <p className="text-xs text-slate-400">{loc.description}</p>}
                      <div className="text-[10px] text-slate-500 font-mono">
                        First appearance: Ch. {loc.first_chapter ?? 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-400" />
                    Story Objects &amp; Chain of Custody
                  </h3>
                  <p className="text-xs text-slate-400">
                    Inspect tracked artifacts and click to view possession transfers across chapters.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {storyObjects.map((obj) => {
                    const logs = custodyByObj[obj.id];
                    return (
                      <div key={obj.id} className="border border-slate-800 bg-slate-900/40 rounded-xl p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-amber-400" />
                            <h4 className="text-sm font-bold text-white">{obj.name}</h4>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            Ch. {(obj.mention_chapters || []).join(", ") || obj.first_chapter || 1}
                          </span>
                        </div>
                        {obj.description && <p className="text-xs text-slate-400">{obj.description}</p>}
                        <button
                          onClick={() => handleInspectCustody(obj.id)}
                          className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                        >
                          {logs ? "Hide Custody Log" : "Inspect Chain of Custody"}
                        </button>
                        {logs && (
                          <div className="pt-2 border-t border-slate-800/70 space-y-1.5">
                            {logs.length === 0 ? (
                              <p className="text-[11px] text-slate-500">No custody transfers logged yet.</p>
                            ) : (
                              logs.map((ev) => (
                                <div key={ev.id} className="text-[11px] bg-slate-950/60 border border-slate-800 rounded p-2">
                                  <span className="font-mono text-amber-300 mr-1.5">Ch. {ev.chapter}</span>
                                  <span className="font-semibold text-slate-200">{ev.action}</span>
                                  <span className="text-slate-400"> → {ev.holder_name}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* World Rules Registry (Milestone 2.4) */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-purple-400" />
                    World Rules &amp; Canon Constraints
                  </h3>
                  <p className="text-xs text-slate-400">
                    Define canon laws (magic limits, physics, setting constraints) checked automatically against new chapters.
                  </p>
                </div>

                <form onSubmit={handleCreateRule} className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value as WorldRule["category"])}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
                  >
                    <option value="setting">Setting</option>
                    <option value="magic">Magic</option>
                    <option value="physics">Physics</option>
                    <option value="society">Society</option>
                  </select>
                  <input
                    type="text"
                    value={newRuleText}
                    onChange={(e) => setNewRuleText(e.target.value)}
                    placeholder='e.g. "Magic cannot revive the dead" or "No iron weapons in Ashford"'
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition"
                  >
                    Add Rule
                  </button>
                </form>

                {worldRules.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {worldRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="border border-slate-800 bg-slate-900/50 rounded-xl p-4 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            {rule.category}
                          </span>
                          <p className="text-xs text-slate-200 leading-relaxed">{rule.rule_text}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                          title="Delete world rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: STORY CHAT AGENT */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col p-8 max-w-4xl w-full mx-auto h-[calc(100vh-140px)]">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  LangGraph Story Intelligence Chat
                </h3>
                <p className="text-xs text-slate-400">
                  Retrieval-augmented queries grounded strictly in manuscript passages with verified inline chapter citations.
                </p>
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 border border-slate-800/80 rounded-xl p-4 bg-slate-950/40">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} space-y-2`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white rounded-tr-none shadow-md"
                          : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>

                      {msg.role === "assistant" &&
                        (msg.intent || (msg.graph_entities && msg.graph_entities.length > 0)) && (
                          <div className="mt-2.5 flex items-center flex-wrap gap-1.5 text-[10px]">
                            {msg.intent && (
                              <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 uppercase tracking-wider font-semibold">
                                Intent: {msg.intent}
                              </span>
                            )}
                            {msg.graph_entities?.map((ent) => (
                              <span
                                key={ent}
                                className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium"
                              >
                                Graph: {ent}
                              </span>
                            ))}
                          </div>
                        )}

                      {/* Citations */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                            Grounding Citations:
                          </span>
                          {msg.citations.map((cite, cIdx) => (
                            <div
                              key={cIdx}
                              className="text-xs bg-slate-950/60 border border-slate-800/80 rounded px-2.5 py-1.5 text-slate-300 font-serif"
                            >
                              <span className="font-sans font-semibold text-indigo-300 mr-1.5">
                                [Chapter {cite.chapter}]
                              </span>
                              &ldquo;{cite.excerpt}&rdquo;
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-2 text-xs text-indigo-400 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg w-fit">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching pgvector chunks & synthesizing grounded answer...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Sample Prompts */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-slate-500 font-medium">Try asking:</span>
                {[
                  "What color are Sarah's eyes across chapters?",
                  "Where was the compass in chapter 1?",
                  "Does Park know about the murder in chapter 2?",
                ].map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => {
                      setChatInput(prompt);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask any question about characters, facts, or timeline..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-medium text-sm flex items-center gap-1.5 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* IMPORT MANUSCRIPT MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f141c] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-400" />
                Import Manuscript
              </h3>
              <button
                onClick={() => setIsImportOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportManuscript} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Novel Title</label>
                <input
                  type="text"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-400">Upload File (.txt, .md, .docx, .pdf) or Paste Prose</label>
                  <button
                    type="button"
                    onClick={() => {
                      setImportTitle("The Ashford Mystery");
                      setImportText(SAMPLE_STORY);
                      setImportFile(null);
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Reset to Ashford Mystery Demo
                  </button>
                </div>
                <input
                  type="file"
                  accept=".txt,.md,.docx,.pdf"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="mb-2 block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                />
                <textarea
                  rows={9}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  placeholder="Paste chapter text here with 'Chapter 1', 'Chapter 2', etc..."
                  required={!importFile}
                />
              </div>

              {/* Live progress indicator if importing */}
              {importStatus && (
                <div className="p-3 bg-indigo-950/40 border border-indigo-900/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs text-indigo-300 font-medium">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Status: {importStatus.status}
                    </span>
                    <span>
                      Chapters: {importStatus.chapters_done} / {importStatus.chapters_total}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-300"
                      style={{
                        width: `${
                          importStatus.chapters_total > 0
                            ? (importStatus.chapters_done / importStatus.chapters_total) * 100
                            : 10
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="text-xs px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importStatus?.status === "processing"}
                  className="text-xs px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition disabled:opacity-50"
                >
                  {importStatus?.status === "processing" ? "Analyzing Pipeline..." : "Start Pipeline Analysis"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {isNewProjectOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f141c] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Create Story Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Project / Novel Title</label>
                <input
                  type="text"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="e.g. Chronicles of Eldoria"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewProjectOpen(false)}
                  className="text-xs px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MERGE CHARACTERS MODAL */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f141c] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-indigo-400" />
              Merge Duplicate Characters
            </h3>
            <p className="text-xs text-slate-400">
              Select the primary character entity and the duplicate entity. All claims, events, and aliases will be
              re-linked into the primary character.
            </p>

            <form onSubmit={handleMergeCharacters} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Primary Character (Kept)
                </label>
                <select
                  value={mergeTargetId}
                  onChange={(e) => setMergeTargetId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value="">Select target character...</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Duplicate Character (Merged & Removed)
                </label>
                <select
                  value={mergeSourceId}
                  onChange={(e) => setMergeSourceId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value="">Select source character...</option>
                  {characters
                    .filter((c) => c.id !== mergeTargetId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMergeModalOpen(false)}
                  className="text-xs px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!mergeTargetId || !mergeSourceId}
                  className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition disabled:opacity-50"
                >
                  Confirm Merge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPEND CHAPTER MODAL */}
      {isAppendOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f141c] border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-400" />
                Append New Chapter
              </h3>
              <button onClick={() => setIsAppendOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            {manuscripts.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">Import a manuscript first before appending a chapter.</p>
            ) : (
              <form onSubmit={handleAppendChapter} className="space-y-3">
                <p className="text-xs text-slate-400">
                  Target manuscript: <strong className="text-slate-200">{manuscripts[0].title}</strong> ({manuscripts[0].chapters_total} chapters)
                </p>
                <input
                  type="text"
                  value={appendTitle}
                  onChange={(e) => setAppendTitle(e.target.value)}
                  placeholder="Chapter Title (optional)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
                <textarea
                  rows={8}
                  value={appendText}
                  onChange={(e) => setAppendText(e.target.value)}
                  placeholder="Paste new chapter prose here..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAppendOpen(false)}
                    className="text-xs px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={appendingChapter}
                    className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50"
                  >
                    {appendingChapter ? "Analyzing..." : "Append & Analyze"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DRAFT VERSIONS MODAL */}
      {isVersionsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f141c] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                Draft Version History & Diffs
              </h3>
              <button
                onClick={() => setIsVersionsOpen(false)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>

            {versions.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No manuscript snapshots recorded yet. Import a manuscript draft to capture v1.
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                {versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold">
                          v{ver.version_number}
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {ver.diff_summary.title || "Manuscript Snapshot"}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          #{ver.content_hash.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5">
                        {ver.diff_summary.chapters_total ?? 0} chapters ·{" "}
                        {ver.diff_summary.characters_count ?? 0} characters ·{" "}
                        {ver.diff_summary.claims_count ?? 0} claims ·{" "}
                        {ver.diff_summary.open_issues_count ?? 0} open issues
                      </p>
                      {ver.diff_summary.semantic_diff && (
                        <p className="text-xs text-indigo-300 mt-2 whitespace-pre-wrap bg-slate-950/60 border border-slate-800 rounded p-2">
                          {ver.diff_summary.semantic_diff}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 text-xs font-mono space-y-1">
                      <div>
                        <span className="text-emerald-400">+{ver.diff_summary.lines_added ?? 0}</span>{" "}
                        <span className="text-rose-400">-{ver.diff_summary.lines_removed ?? 0}</span>{" "}
                        <span className="text-slate-500">lines</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(ver.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* M3.2 VALIDATION GATE QUEUE MODAL */}
      {isCandidatesOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f141c] border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                Pre-Graph Validation Gate Queue ({candidates.length} pending)
              </h3>
              <button
                onClick={() => setIsCandidatesOpen(false)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>

            {candidates.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No quarantined or ambiguous candidates awaiting review.
              </p>
            ) : (
              <div className="max-h-[28rem] overflow-y-auto space-y-3 pr-1">
                {candidates.map((cand) => {
                  const isChar = cand.candidate_type === "character";
                  const label = isChar
                    ? String(cand.payload?.name || "Unknown")
                    : `${String(cand.payload?.subject || "?")} · ${String(cand.payload?.attribute || "?")} = ${String(cand.payload?.value || "?")}`;
                  return (
                    <div
                      key={cand.id}
                      className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-slate-800 text-slate-300">
                              Ch {cand.chapter} · {cand.candidate_type}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                cand.route === "reject_hold"
                                  ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                  : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              }`}
                            >
                              {cand.route} ({Math.round(cand.confidence * 100)}%)
                            </span>
                            <span className="text-sm font-semibold text-white">{label}</span>
                          </div>
                          {cand.ambiguity_reason && (
                            <p className="text-xs text-slate-300">{cand.ambiguity_reason}</p>
                          )}
                          {cand.evidence_quote && (
                            <p className="text-xs italic text-slate-400">
                              &ldquo;{cand.evidence_quote}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                        <button
                          disabled={resolvingCandidateId === cand.id}
                          onClick={() => handleResolveCandidate(cand.id, "approve")}
                          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white font-medium disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          disabled={resolvingCandidateId === cand.id}
                          onClick={() => handleResolveCandidate(cand.id, "reject")}
                          className="text-xs px-3 py-1.5 rounded-lg bg-rose-600/70 hover:bg-rose-500 text-white font-medium disabled:opacity-50"
                        >
                          Reject
                        </button>

                        {isChar && (
                          <>
                            <div className="flex items-center gap-1.5 ml-auto">
                              <select
                                value={candidateMergeTargets[cand.id] || ""}
                                onChange={(e) =>
                                  setCandidateMergeTargets((prev) => ({
                                    ...prev,
                                    [cand.id]: e.target.value,
                                  }))
                                }
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                              >
                                <option value="">Merge into...</option>
                                {characters.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                disabled={
                                  resolvingCandidateId === cand.id || !candidateMergeTargets[cand.id]
                                }
                                onClick={() => handleResolveCandidate(cand.id, "merge")}
                                className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white font-medium disabled:opacity-40"
                              >
                                Merge
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                placeholder="Split as new name..."
                                value={candidateSplitNames[cand.id] || ""}
                                onChange={(e) =>
                                  setCandidateSplitNames((prev) => ({
                                    ...prev,
                                    [cand.id]: e.target.value,
                                  }))
                                }
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 w-36"
                              />
                              <button
                                disabled={resolvingCandidateId === cand.id}
                                onClick={() => handleResolveCandidate(cand.id, "split")}
                                className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white font-medium disabled:opacity-40"
                              >
                                Split
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* M3.3 AUTHOR CORRECTION RULES MODAL */}
      {isCorrectionsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f141c] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-indigo-400" />
                Author Correction Rules ({corrections.length} active)
              </h3>
              <button
                onClick={() => setIsCorrectionsOpen(false)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
            {corrections.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No active author feedback rules yet. Edit a claim or rename/split a character to add one.
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
                {corrections.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          {rule.rule_type}
                        </span>
                        <span className="text-xs font-semibold text-white">{rule.target_entity}</span>
                      </div>
                      <p className="text-xs text-slate-300">{rule.instruction_text}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteCorrection(rule.id)}
                      className="p-1.5 rounded bg-slate-800 hover:bg-rose-600/30 text-slate-400 hover:text-rose-300"
                      title="Deactivate correction rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
