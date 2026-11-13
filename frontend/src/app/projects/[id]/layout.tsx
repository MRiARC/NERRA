"use client";

import React, { useState, use, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProject, useIssues, useManuscripts, useCustomization } from "@/hooks/useStoryData";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import {
  Feather,
  ArrowLeft,
  LayoutDashboard,
  PenTool,
  BookOpen,
  Clock,
  Compass,
  Users,
  GitBranch,
  GitPullRequest,
  AlertTriangle,
  MessageSquare,
  ShieldAlert,
  Scroll,
  History,
  Activity,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Upload,
  Sparkles,
} from "lucide-react";
import { cn, formatWords } from "@/lib/utils";
import { ImportManuscriptModal } from "@/components/dashboard/ImportManuscriptModal";
import { motion, AnimatePresence } from "motion/react";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isCheckingAuth: authLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [authLoading, isAuthenticated, router, pathname]);

  const [collapsed, setCollapsed] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: issues = [] } = useIssues(projectId);
  const { data: manuscripts = [] } = useManuscripts(projectId);
  const { data: customization } = useCustomization(projectId);

  const activeManuscript = manuscripts[0];

  const openIssuesCount = issues.filter(
    (i) => i.status === "open" || i.status === "unresolved"
  ).length;

  const enabledFeatures = customization?.custom_ui_config?.enabled_features as string[] | undefined;

  const rawNavItems = [
    {
      group: "Writing & Reading",
      items: [
        {
          id: "overview",
          name: "Overview",
          href: `/projects/${projectId}`,
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: "ingestion",
          name: "Ingestion Radar",
          href: `/projects/${projectId}/ingestion`,
          icon: Activity,
          badge:
            activeManuscript?.status === "failed"
              ? "FAILED"
              : activeManuscript?.status === "processing"
              ? "ACTIVE"
              : null,
          badgeVariant:
            activeManuscript?.status === "failed"
              ? ("contradiction" as const)
              : ("warning" as const),
        },
        {
          id: "editor",
          name: "Editor",
          href: `/projects/${projectId}/editor`,
          icon: PenTool,
          badge: null,
        },
        {
          id: "reader",
          name: "Reader",
          href: `/projects/${projectId}/reader`,
          icon: BookOpen,
          badge: null,
        },
      ],
    },
    {
      group: "Characters & World",
      items: [
        {
          id: "timeline",
          name: "Timeline",
          href: `/projects/${projectId}/timeline`,
          icon: Clock,
          badge: null,
        },
        {
          id: "knowledge",
          name: "Who Knows What",
          href: `/projects/${projectId}/knowledge`,
          icon: Compass,
          badge: null,
        },
        {
          id: "characters",
          name: "Characters",
          href: `/projects/${projectId}/characters`,
          icon: Users,
          badge: null,
        },
        {
          id: "graph",
          name: "Items & Relationships",
          href: `/projects/${projectId}/graph`,
          icon: GitBranch,
          badge: null,
        },
        {
          id: "plot-threads",
          name: "Plot Threads",
          href: `/projects/${projectId}/plot-threads`,
          icon: GitPullRequest,
          badge: null,
        },
      ],
    },
    {
      group: "Story Checks & AI",
      items: [
        {
          id: "issues",
          name: "Consistency & Issues",
          href: `/projects/${projectId}/issues`,
          icon: AlertTriangle,
          badge: openIssuesCount > 0 ? `${openIssuesCount}` : null,
          badgeVariant: "contradiction" as const,
        },
        {
          id: "chat",
          name: "Ask Your Story",
          href: `/projects/${projectId}/chat`,
          icon: MessageSquare,
          badge: null,
        },
        {
          id: "validation",
          name: "Fact Approvals",
          href: `/projects/${projectId}/validation`,
          icon: ShieldAlert,
          badge: null,
        },
        {
          id: "bible",
          name: "World Rules",
          href: `/projects/${projectId}/bible`,
          icon: Scroll,
          badge: null,
        },
        {
          id: "versions",
          name: "Version History",
          href: `/projects/${projectId}/versions`,
          icon: History,
          badge: null,
        },
        {
          id: "telemetry",
          name: "Usage & Analytics",
          href: `/projects/${projectId}/telemetry`,
          icon: Activity,
          badge: null,
        },
        {
          id: "settings",
          name: "Story Settings",
          href: `/projects/${projectId}/customization`,
          icon: Sliders,
          badge: null,
        },
      ],
    },
  ];

  // Filter items if author configured modular feature toggles
  const navItems = rawNavItems
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        // Essential items always stay
        if (["overview", "editor", "reader", "settings", "telemetry", "versions"].includes(item.id)) {
          return true;
        }
        if (!enabledFeatures || !Array.isArray(enabledFeatures)) {
          return true;
        }
        return enabledFeatures.includes(item.id);
      }),
    }))
    .filter((group) => group.items.length > 0);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-void">
        <div className="flex items-center gap-2.5 text-xs font-mono text-ink-ash">
          <span className="w-1.5 h-1.5 rounded-full bg-wine-crimson animate-pulse" />
          <span>Opening your study…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-surface-void flex flex-col selection:bg-wine-accent selection:text-ink-parchment">
      {/* Top Breadcrumb & Telemetry Command Bar */}
      <header className="h-12 shrink-0 border-b border-border-quiet bg-surface-subtle flex items-center justify-between px-4 sm:px-6 z-40">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium text-ink-ash hover:text-ink-parchment transition-colors px-2 py-1.5 rounded-lg hover:bg-surface-card border border-transparent hover:border-border-quiet"
            title="Back to All Projects"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">All Projects</span>
          </Link>

          <span className="text-border-subtle font-mono text-xs">/</span>

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-serif font-medium text-sm text-ink-parchment tracking-tight truncate">
              {project?.title || "Loading..."}
            </span>
            {project?.genre && (
              <span className="text-xs text-ink-ash italic hidden md:inline truncate">
                • {project.genre}
              </span>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-border-quiet text-xs">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Checker: Online</span>
            </span>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setImportModalOpen(true)}
            className="gap-1.5 text-ink-bone hover:text-ink-parchment border-border-subtle"
          >
            <Upload className="w-3.5 h-3.5 text-wine-crimson" />
            <span className="hidden sm:inline">Upload Manuscript</span>
          </Button>

          <ThemeSwitcher />
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Literary Navigation Rail / Codex Drawer */}
        <aside
          className={cn(
            "h-full border-r border-border-quiet bg-surface-subtle flex flex-col shrink-0 overflow-hidden transition-all duration-200 select-none z-30",
            collapsed ? "w-16" : "w-64"
          )}
        >
          {/* Rail Header */}
          <div className="shrink-0 p-3 border-b border-border-quiet flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-2 px-1">
                <div className="w-6 h-6 rounded-lg bg-surface-card border border-border-subtle flex items-center justify-center text-wine-crimson text-xs font-serif font-bold">
                  N
                </div>
                <span className="text-xs font-serif font-medium text-ink-parchment tracking-tight">
                  Atelier Codex
                </span>
              </div>
            )}

            <button
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "p-1.5 rounded-lg text-ink-ash hover:text-ink-parchment hover:bg-surface-card transition-colors border border-transparent hover:border-border-quiet",
                collapsed && "mx-auto"
              )}
              title={collapsed ? "Expand rail" : "Collapse rail"}
              aria-label={collapsed ? "Expand rail" : "Collapse rail"}
            >
              {collapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto min-h-0 p-2.5 space-y-4">
            {navItems.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {!collapsed && (
                  <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-semibold text-ink-faint">
                    {group.group}
                  </div>
                )}

                {group.items.map((item) => {
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
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all duration-150 relative group",
                        isActive
                          ? "bg-surface-elevated text-ink-parchment font-medium border border-border-subtle"
                          : "text-ink-bone hover:bg-white/[0.04] hover:text-ink-parchment border border-transparent",
                        collapsed && "justify-center px-0 py-2.5"
                      )}
                      title={collapsed ? item.name : undefined}
                    >
                      {isActive && (
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-3.5 bg-wine-accent rounded-full" />
                      )}

                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isActive
                            ? "text-wine-crimson"
                            : "text-ink-ash group-hover:text-ink-bone"
                        )}
                      />

                      {!collapsed && (
                        <span className="truncate flex-1 font-sans">{item.name}</span>
                      )}

                      {!collapsed && item.badge && (
                        <Badge
                          variant={item.badgeVariant || "subtle"}
                          size="xs"
                          className="shrink-0 rounded-full"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Rail Footer Telemetry */}
          {!collapsed && (
            <div className="shrink-0 p-3 border-t border-border-quiet bg-surface-subtle text-xs text-ink-ash space-y-2">
              <Link
                href="/settings"
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-card hover:text-ink-parchment transition-colors text-xs font-mono text-ink-bone border border-transparent hover:border-border-quiet"
                title="Global Studio Settings & Sovereign Keys"
              >
                <Sliders className="w-3.5 h-3.5 text-wine-accent shrink-0" />
                <span className="truncate">Studio Settings</span>
              </Link>

              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-border-quiet">
                <span>Folio Daemon</span>
                <span className="text-emerald-400 font-mono text-[10px] font-medium">v2.4.9 Active</span>
              </div>
            </div>
          )}
        </aside>

        {/* Center Workspace Content Canvas */}
        <main className="flex-1 overflow-y-auto min-h-0 bg-surface-void flex flex-col">
          {children}
        </main>
      </div>

      {/* Ingestion Modal */}
      {project && (
        <ImportManuscriptModal
          project={project}
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImportComplete={() => {}}
        />
      )}
    </div>
  );
}
