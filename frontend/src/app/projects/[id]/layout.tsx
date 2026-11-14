"use client";

import React, { useState, use, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProject, useManuscripts, useCustomization } from "@/hooks/useStoryData";
import { api } from "@/lib/api";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import {
  PanelLeft,
  Plus,
  Layers,
  BookMarked,
  Feather,
  BookOpen,
  Users,
  Clock,
  Compass,
  Share2,
  GitPullRequest,
  Scroll,
  ShieldAlert,
  History,
  Sliders,
  Settings,
  Radio,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Upload,
  ArrowLeft,
  Laptop,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { cn, formatWords } from "@/lib/utils";
import { ImportManuscriptModal } from "@/components/dashboard/ImportManuscriptModal";
import { NewProjectModal } from "@/components/dashboard/NewProjectModal";
import { SessionsDrawer } from "@/components/dashboard/SessionsDrawer";
import { AnimatePresence, motion } from "motion/react";
import type { Project } from "@/lib/types";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isCheckingAuth: authLoading, checkAuth, logout } = useAuthStore();

  const isEditorPage = pathname.endsWith("/editor");
  const [collapsed, setCollapsed] = useState(isEditorPage);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [sessionsDrawerOpen, setSessionsDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Collapsible section states in the tree
  const [writingOpen, setWritingOpen] = useState(true);
  const [worldOpen, setWorldOpen] = useState(true);
  const [checksOpen, setChecksOpen] = useState(true);
  const [otherStoriesOpen, setOtherStoriesOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [authLoading, isAuthenticated, router, pathname]);

  // Auto-collapse rail on editor page for deep writing focus
  useEffect(() => {
    if (pathname.endsWith("/editor")) {
      setCollapsed(true);
    }
  }, [pathname]);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: project } = useProject(projectId);
  const { data: manuscripts = [] } = useManuscripts(projectId);
  const { data: customization } = useCustomization(projectId);

  // Fetch all stories for the shelf switcher
  const { data: allProjects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => api.projects.list(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const activeManuscript = manuscripts[0];
  const enabledFeatures = customization?.custom_ui_config?.enabled_features as string[] | undefined;

  const totalChapters = project?.chapter_count ?? 0;
  const totalWords = project?.word_count ?? 0;
  const openIssues = project?.open_issue_count ?? 0;
  const otherProjects = allProjects.filter((p) => p.id !== projectId);
  const authorName = (user?.display_name || "").trim().split(/\s+/)[0] || "Author";

  // Derive current page name for the Antigravity-style top breadcrumb
  const getPageTitle = () => {
    if (pathname.endsWith("/editor")) return "Editor";
    if (pathname.endsWith("/reader")) return "Reader";
    if (pathname.endsWith("/characters")) return "Characters";
    if (pathname.endsWith("/timeline")) return "Timeline";
    if (pathname.endsWith("/knowledge")) return "Who Knows What";
    if (pathname.endsWith("/graph")) return "Items & Relationships";
    if (pathname.endsWith("/plot-threads")) return "Plot Threads";
    if (pathname.endsWith("/ingestion")) return "Import Radar";
    if (pathname.endsWith("/bible")) return "World Rules";
    if (pathname.endsWith("/validation")) return "Fact Approvals";
    if (pathname.endsWith("/versions")) return "Version History";
    if (pathname.endsWith("/customization")) return "Story Settings";
    if (pathname.endsWith("/telemetry")) return "Telemetry";
    return "Overview";
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-void">
        <div className="flex items-center gap-2.5 font-mono text-xs text-ink-ash">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-wine-crimson" />
          <span>Opening your workspace…</span>
        </div>
      </div>
    );
  }

  // Navigation Items
  const writingItems = [
    {
      id: "overview",
      name: "Overview",
      href: `/projects/${projectId}`,
      icon: BookMarked,
      meta: totalChapters > 0 ? `${totalChapters} ch` : null,
    },
    {
      id: "editor",
      name: "Editor",
      href: `/projects/${projectId}/editor`,
      icon: Feather,
      meta: null,
    },
    {
      id: "reader",
      name: "Reader",
      href: `/projects/${projectId}/reader`,
      icon: BookOpen,
      meta: null,
    },
  ];

  const worldItems = [
    {
      id: "characters",
      name: "Characters",
      href: `/projects/${projectId}/characters`,
      icon: Users,
      meta: project?.character_count ? String(project.character_count) : null,
    },
    {
      id: "timeline",
      name: "Timeline",
      href: `/projects/${projectId}/timeline`,
      icon: Clock,
      meta: null,
    },
    {
      id: "knowledge",
      name: "Who Knows What",
      href: `/projects/${projectId}/knowledge`,
      icon: Compass,
      meta: null,
    },
    {
      id: "graph",
      name: "Items & Relationships",
      href: `/projects/${projectId}/graph`,
      icon: Share2,
      meta: null,
    },
    {
      id: "plot-threads",
      name: "Plot Threads",
      href: `/projects/${projectId}/plot-threads`,
      icon: GitPullRequest,
      meta: null,
    },
  ];

  const checkItems = [
    {
      id: "ingestion",
      name: "Import Radar",
      href: `/projects/${projectId}/ingestion`,
      icon: Radio,
      meta: activeManuscript?.status === "processing" ? "Reading" : null,
      isReading: activeManuscript?.status === "processing",
    },
    {
      id: "bible",
      name: "World Rules",
      href: `/projects/${projectId}/bible`,
      icon: Scroll,
      meta: null,
    },
    {
      id: "validation",
      name: "Fact Approvals",
      href: `/projects/${projectId}/validation`,
      icon: ShieldAlert,
      meta: project?.claim_count ? String(project.claim_count) : null,
    },
    {
      id: "versions",
      name: "Version History",
      href: `/projects/${projectId}/versions`,
      icon: History,
      meta: null,
    },
    {
      id: "settings",
      name: "Story Settings",
      href: `/projects/${projectId}/customization`,
      icon: Sliders,
      meta: null,
    },
  ];

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-surface-void text-ink-parchment selection:bg-wine-accent selection:text-ink-parchment font-sans">
      {/* ===================================================================
          SLIM TOP BAR (Fluent Antigravity breadcrumb & control strip)
          =================================================================== */}
      <header className="flex h-11 shrink-0 items-center justify-between bg-surface-void px-3 sm:px-4 z-40 select-none">
        {/* Left: Sidebar toggle + Native Breadcrumb */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Toggle sidebar button */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md p-1.5 text-ink-ash hover:bg-white/[0.06] hover:text-ink-parchment transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <Link
            href="/"
            className="rounded-md p-1.5 text-ink-faint hover:bg-white/[0.06] hover:text-ink-parchment transition-colors"
            title="All Stories"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>

          <span className="h-3.5 w-px bg-white/[0.08]" />

          {/* Antigravity-style Breadcrumb: Stories / Novel / Section */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs truncate">
            <Link
              href="/"
              className="text-ink-faint hover:text-ink-parchment transition-colors truncate hidden sm:inline"
            >
              Stories
            </Link>
            <span className="text-ink-faint/50 hidden sm:inline">/</span>

            <Link
              href={`/projects/${projectId}`}
              className="font-medium text-ink-bone hover:text-ink-parchment transition-colors truncate max-w-[180px] sm:max-w-[280px]"
            >
              {project?.title || "Untitled Novel"}
            </Link>

            <span className="text-ink-faint/50">/</span>

            <span className="font-medium text-ink-parchment truncate">
              {getPageTitle()}
            </span>
          </nav>

          {/* Quiet Metric Pills */}
          {totalChapters > 0 && (
            <div className="hidden lg:flex items-center gap-2 pl-2 text-[11px] font-mono text-ink-faint">
              <span>{totalChapters} ch</span>
              <span>·</span>
              <span>{formatWords(totalWords)}</span>
              {openIssues > 0 && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-wine-crimson font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-wine-crimson" />
                    {openIssues} findings
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions, Theme, User Pill */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1 text-xs text-ink-bone hover:bg-white/[0.08] hover:text-ink-parchment transition-colors"
            title="Upload manuscript file"
          >
            <Upload className="h-3.5 w-3.5 text-wine-crimson" />
            <span className="hidden sm:inline">Upload Manuscript</span>
          </button>

          <ThemeSwitcher />

          {/* User Avatar Menu */}
          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2 py-1 text-xs text-ink-bone hover:bg-white/[0.08] hover:text-ink-parchment transition-colors"
            >
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-wine-accent/25 font-serif text-[9px] font-bold text-ink-parchment">
                {authorName[0]?.toUpperCase() || "A"}
              </div>
              <span className="hidden md:inline text-[11px] font-medium max-w-[80px] truncate">
                {authorName}
              </span>
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-surface-elevated/95 backdrop-blur-md p-1.5 shadow-2xl z-50 text-xs text-ink-bone ring-1 ring-white/[0.06]"
                >
                  <div className="px-2.5 py-1.5 mb-1">
                    <p className="font-medium text-ink-parchment truncate">{user?.display_name || "Author"}</p>
                    <p className="font-mono text-[10px] text-ink-faint truncate">{user?.email}</p>
                  </div>

                  <Link
                    href="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-ink-bone hover:bg-white/[0.05] hover:text-ink-parchment transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5 text-ink-ash" />
                    <span>Studio Settings</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      setSessionsDrawerOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-ink-bone hover:bg-white/[0.05] hover:text-ink-parchment transition-colors text-left"
                  >
                    <Laptop className="h-3.5 w-3.5 text-ink-ash" />
                    <span>Active Sessions</span>
                  </button>

                  <div className="my-1 h-px bg-white/[0.04]" />

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-severity-contradiction hover:bg-severity-contradiction-bg transition-colors text-left"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ===================================================================
          BODY: FLUENT ANTIGRAVITY SIDEBAR + WORKSPACE CANVAS
          =================================================================== */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Antigravity Fluent Left Sidebar */}
        <aside
          className={cn(
            "flex h-full shrink-0 flex-col overflow-hidden bg-surface-void select-none z-30 transition-[width] duration-150 ease-out",
            collapsed ? "w-13" : "w-60"
          )}
        >
          {/* Top Quick Actions (New Novel & Library Shelf) */}
          <div className="p-2 space-y-1 shrink-0">
            {!collapsed ? (
              <>
                <button
                  type="button"
                  onClick={() => setNewProjectOpen(true)}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] text-xs font-medium text-ink-parchment hover:bg-white/[0.07] transition-all"
                >
                  <Plus className="h-3.5 w-3.5 text-wine-crimson" />
                  <span>New Novel</span>
                </button>

                <Link
                  href="/"
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-ink-ash hover:text-ink-parchment hover:bg-white/[0.04] transition-colors"
                >
                  <Layers className="h-3.5 w-3.5 text-ink-faint" />
                  <span>Library Shelf</span>
                </Link>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setNewProjectOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.03] text-wine-crimson hover:bg-white/[0.07] transition-colors"
                  title="New Novel"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <Link
                  href="/"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-white/[0.06] hover:text-ink-parchment transition-colors"
                  title="Library Shelf"
                >
                  <Layers className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Navigation Tree (Fluid Antigravity Sections) */}
          <div className="flex-1 overflow-y-auto min-h-0 px-2 py-2 space-y-3">
            {/* Active Story Folder Root */}
            {!collapsed ? (
              <div className="space-y-1">
                {/* Story Folder Header */}
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-ink-parchment truncate">
                  <FolderOpen className="h-3.5 w-3.5 text-wine-crimson shrink-0" />
                  <span className="truncate">{project?.title || "Novel"}</span>
                </div>

                {/* Section 1: Writing */}
                <div className="pl-2 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => setWritingOpen(!writingOpen)}
                    className="flex items-center justify-between w-full px-2 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-faint/70 hover:text-ink-ash transition-colors"
                  >
                    <span>Writing</span>
                    <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", !writingOpen && "-rotate-90")} />
                  </button>

                  {writingOpen &&
                    writingItems.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        item.href === `/projects/${projectId}`
                          ? pathname === item.href
                          : pathname.startsWith(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                            isActive
                              ? "bg-white/[0.08] text-white font-medium"
                              : "text-ink-ash hover:text-ink-parchment hover:bg-white/[0.04]"
                          )}
                        >
                          <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-wine-crimson" : "text-ink-faint group-hover:text-ink-ash")} />
                          <span className="truncate">{item.name}</span>
                          {isActive && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-wine-crimson shadow-[0_0_6px_rgba(168,45,84,0.6)]" />
                          )}
                          {!isActive && item.meta && (
                            <span className="ml-auto font-mono text-[9.5px] text-ink-faint/60">{item.meta}</span>
                          )}
                        </Link>
                      );
                    })}
                </div>

                {/* Section 2: Story World */}
                <div className="pl-2 space-y-0.5 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setWorldOpen(!worldOpen)}
                    className="flex items-center justify-between w-full px-2 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-faint/70 hover:text-ink-ash transition-colors"
                  >
                    <span>Story World</span>
                    <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", !worldOpen && "-rotate-90")} />
                  </button>

                  {worldOpen &&
                    worldItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname.startsWith(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                            isActive
                              ? "bg-white/[0.08] text-white font-medium"
                              : "text-ink-ash hover:text-ink-parchment hover:bg-white/[0.04]"
                          )}
                        >
                          <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-wine-crimson" : "text-ink-faint group-hover:text-ink-ash")} />
                          <span className="truncate">{item.name}</span>
                          {isActive && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-wine-crimson shadow-[0_0_6px_rgba(168,45,84,0.6)]" />
                          )}
                          {!isActive && item.meta && (
                            <span className="ml-auto font-mono text-[9.5px] text-ink-faint/60">{item.meta}</span>
                          )}
                        </Link>
                      );
                    })}
                </div>

                {/* Section 3: Checks & Tools */}
                <div className="pl-2 space-y-0.5 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setChecksOpen(!checksOpen)}
                    className="flex items-center justify-between w-full px-2 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-faint/70 hover:text-ink-ash transition-colors"
                  >
                    <span>Checks & Tools</span>
                    <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", !checksOpen && "-rotate-90")} />
                  </button>

                  {checksOpen &&
                    checkItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname.startsWith(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                            isActive
                              ? "bg-white/[0.08] text-white font-medium"
                              : "text-ink-ash hover:text-ink-parchment hover:bg-white/[0.04]"
                          )}
                        >
                          <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-wine-crimson" : "text-ink-faint group-hover:text-ink-ash")} />
                          <span className="truncate">{item.name}</span>
                          {item.meta && (
                            <span
                              className={cn(
                                "ml-auto font-mono text-[9.5px]",
                                item.isReading ? "text-severity-warning animate-pulse" : "text-ink-faint/60"
                              )}
                            >
                              {item.meta}
                            </span>
                          )}
                          {isActive && !item.meta && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-wine-crimson shadow-[0_0_6px_rgba(168,45,84,0.6)]" />
                          )}
                        </Link>
                      );
                    })}
                </div>

                {/* Section 4: Other Stories on Shelf (Antigravity Multi-Project Tree) */}
                {otherProjects.length > 0 && (
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => setOtherStoriesOpen(!otherStoriesOpen)}
                      className="flex items-center justify-between w-full px-2 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-faint/70 hover:text-ink-ash transition-colors"
                    >
                      <span>Other Novels ({otherProjects.length})</span>
                      <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", !otherStoriesOpen && "-rotate-90")} />
                    </button>

                    {otherStoriesOpen && (
                      <div className="space-y-0.5 pt-1">
                        {otherProjects.map((p) => (
                          <Link
                            key={p.id}
                            href={`/projects/${p.id}`}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-ink-faint hover:text-ink-parchment hover:bg-white/[0.04] transition-colors"
                          >
                            <Folder className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                            <span className="truncate">{p.title}</span>
                            <span className="ml-auto font-mono text-[9px] text-ink-faint/50">
                              {p.chapter_count ?? 0}ch
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Collapsed Icon Strip Mode */
              <div className="flex flex-col items-center gap-1">
                {[...writingItems, ...worldItems, ...checkItems].map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === `/projects/${projectId}`
                      ? pathname === item.href
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                        isActive
                          ? "bg-white/[0.08] text-white"
                          : "text-ink-faint hover:bg-white/[0.04] hover:text-ink-parchment"
                      )}
                      title={item.name}
                    >
                      <Icon className={cn("h-4 w-4", isActive && "text-wine-crimson")} />
                      {isActive && (
                        <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-wine-crimson" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Antigravity Docked Footer Settings */}
          <div className="p-2 shrink-0">
            {!collapsed ? (
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-ink-faint hover:text-ink-parchment hover:bg-white/[0.04] transition-colors">
                <Link
                  href="/settings"
                  className="flex items-center gap-2 flex-1 min-w-0"
                  title="Global Studio Settings"
                >
                  <Settings className="h-3.5 w-3.5 text-ink-faint" />
                  <span className="truncate">Settings</span>
                </Link>
                <span className="font-mono text-[9px] text-ink-faint/50">v2.4</span>
              </div>
            ) : (
              <div className="flex justify-center">
                <Link
                  href="/settings"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-white/[0.04] hover:text-ink-parchment transition-colors"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </aside>

        {/* Workspace Canvas (Fluid, edge-to-edge content container) */}
        <main className="flex flex-1 flex-col overflow-y-auto min-h-0 bg-surface-void">
          {children}
        </main>
      </div>

      {/* Manuscript Import Modal */}
      {project && (
        <ImportManuscriptModal
          project={project}
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImportComplete={() => {}}
        />
      )}

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onProjectCreated={() => {
          setNewProjectOpen(false);
          router.refresh();
        }}
      />

      {/* Sessions Drawer */}
      <SessionsDrawer
        isOpen={sessionsDrawerOpen}
        onClose={() => setSessionsDrawerOpen(false)}
      />
    </div>
  );
}
