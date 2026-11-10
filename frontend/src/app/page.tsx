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
} from "lucide-react";
import StoryGraphView from "@/components/StoryGraphView";
import {
  api,
  Project,
  Issue,
  Character,
  Location,
  Claim,
  ManuscriptStatus,
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
    "issues" | "characters" | "graph" | "locations" | "claims" | "chat"
  >("issues");
  const [loading, setLoading] = useState(false);

  // Story state
  const [issues, setIssues] = useState<Issue[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);

  // Filter state
  const [issueFilter, setIssueFilter] = useState<"all" | "contradiction" | "knowledge_violation" | "unresolved_thread" | "continuity_note">("all");
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
    Array<{ role: "user" | "assistant"; text: string; citations?: Array<{ chapter: number; excerpt: string }> }>
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
      const [iss, chars, locs, clms] = await Promise.all([
        api.getIssues(projectId),
        api.getCharacters(projectId),
        api.getLocations(projectId),
        api.getClaims(projectId),
      ]);
      setIssues(iss);
      setCharacters(chars);
      setLocations(locs);
      setClaims(clms);
    } catch (err) {
      console.error("Failed to load project details:", err);
    } finally {
      setLoading(false);
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
    if (!selectedProjectId || !importText.trim()) return;
    try {
      const res = await api.importManuscript(selectedProjectId, importTitle, importText);
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

  // Filtered issues
  const filteredIssues = issues.filter((iss) => {
    if (issueFilter !== "all" && iss.type !== issueFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return iss.description.toLowerCase().includes(q) || iss.type.toLowerCase().includes(q);
    }
    return true;
  });

  const redCount = issues.filter((i) => i.severity === "red" && i.status === "open").length;
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
                            </div>

                            <h4 className="text-sm font-semibold text-white leading-snug">{issue.description}</h4>
                          </div>

                          {/* Action controls */}
                          <div className="flex items-center gap-1.5">
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

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Ch. {char.first_chapter ?? 1}–{char.last_chapter ?? 1}
                      </span>
                    </div>

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
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/50"
                          >
                            {al}
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {claims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-4 font-medium text-white">{claim.subject}</td>
                        <td className="py-2.5 px-4 text-indigo-300 font-mono text-[11px]">{claim.attribute}</td>
                        <td className="py-2.5 px-4 text-slate-200">{claim.value}</td>
                        <td className="py-2.5 px-4 text-slate-400 font-mono">Ch. {claim.chapter}</td>
                        <td className="py-2.5 px-4 text-slate-400 italic font-serif">
                          &ldquo;{claim.evidence_quote || "—"}&rdquo;
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: LOCATIONS */}
          {activeTab === "locations" && (
            <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
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
                  <label className="text-xs font-semibold text-slate-400">Manuscript Prose / Chapters</label>
                  <button
                    type="button"
                    onClick={() => {
                      setImportTitle("The Ashford Mystery");
                      setImportText(SAMPLE_STORY);
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Reset to Ashford Mystery Demo
                  </button>
                </div>
                <textarea
                  rows={10}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  placeholder="Paste chapter text here with 'Chapter 1', 'Chapter 2', etc..."
                  required
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
    </div>
  );
}
