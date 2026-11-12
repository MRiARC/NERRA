"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProject, useIssues, useManuscripts } from "@/hooks/useStoryData";
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

  const [collapsed, setCollapsed] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: issues = [] } = useIssues(projectId);
  const { data: manuscripts = [] } = useManuscripts(projectId);

  const openIssuesCount = issues.filter(
    (i) => i.status === "open" || i.status === "unresolved"
  ).length;

  const navItems = [
    {
      group: "Writing & Reading",
      items: [
        {
          name: "Overview",
          href: `/projects/${projectId}`,
          icon: LayoutDashboard,
          badge: null,
        },
        {
          name: "Editor",
          href: `/projects/${projectId}/editor`,
          icon: PenTool,
          badge: null,
        },
        {
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
          name: "Timeline",
          href: `/projects/${projectId}/timeline`,
          icon: Clock,
          badge: null,
        },
        {
          name: "Who Knows What",
          href: `/projects/${projectId}/knowledge`,
          icon: Compass,
          badge: null,
        },
        {
          name: "Characters",
          href: `/projects/${projectId}/characters`,
          icon: Users,
          badge: null,
        },
        {
          name: "Items & Relationships",
          href: `/projects/${projectId}/graph`,
          icon: GitBranch,
          badge: null,
        },
        {
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
          name: "Consistency & Issues",
          href: `/projects/${projectId}/issues`,
          icon: AlertTriangle,
          badge: openIssuesCount > 0 ? `${openIssuesCount}` : null,
          badgeVariant: "contradiction" as const,
        },
        {
          name: "Ask Your Story",
          href: `/projects/${projectId}/chat`,
          icon: MessageSquare,
          badge: null,
        },
        {
          name: "Fact Approvals",
          href: `/projects/${projectId}/validation`,
          icon: ShieldAlert,
          badge: null,
        },
        {
          name: "World Rules",
          href: `/projects/${projectId}/bible`,
          icon: Scroll,
          badge: null,
        },
        {
          name: "Version History",
          href: `/projects/${projectId}/versions`,
          icon: History,
          badge: null,
        },
        {
          name: "Usage & Analytics",
          href: `/projects/${projectId}/telemetry`,
          icon: Activity,
          badge: null,
        },
        {
          name: "Story Settings",
          href: `/projects/${projectId}/customization`,
          icon: Sliders,
          badge: null,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-surface-void flex flex-col selection:bg-wine-accent selection:text-ink-parchment">
      {/* Top Breadcrumb & Telemetry Command Bar */}
      <header className="sticky top-0 z-40 w-full h-14 border-b border-border-quiet bg-surface-subtle/95 backdrop-blur-md flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-ink-ash hover:text-ink-parchment transition-colors p-1 rounded-[4px] hover:bg-surface-card"
            title="Back to All Projects"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">All Projects</span>
          </Link>

          <span className="text-border-subtle">/</span>

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-serif font-medium text-sm text-ink-parchment truncate">
              {project?.title || "Loading..."}
            </span>
            {project?.genre && (
              <span className="text-[11px] text-ink-ash italic hidden md:inline truncate">
                • {project.genre}
              </span>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-border-quiet text-[11px] text-ink-ash">
            <span className="inline-flex items-center gap-1.5 text-pine-moss">
              <span className="w-1.5 h-1.5 rounded-full bg-pine-moss animate-pulse-subtle" />
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
            className="gap-1.5 text-ink-bone"
          >
            <Upload className="w-3.5 h-3.5 text-wine-crimson" />
            <span className="hidden sm:inline">Upload Manuscript</span>
          </Button>

          <ThemeSwitcher />
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Literary Navigation Rail / Codex Drawer */}
        <aside
          className={cn(
            "border-r border-border-quiet bg-surface-subtle/80 flex flex-col shrink-0 transition-all duration-200 select-none z-30",
            collapsed ? "w-16" : "w-64"
          )}
        >
          {/* Rail Header */}
          <div className="p-3 border-b border-border-quiet flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-2 px-1">
                <div className="w-6 h-6 rounded-[3px] bg-wine-accent/20 border border-wine-accent/40 flex items-center justify-center text-wine-crimson text-xs font-serif font-bold">
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
                "p-1.5 rounded-[4px] text-ink-ash hover:text-ink-parchment hover:bg-surface-card transition-colors",
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
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {navItems.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {!collapsed && (
                  <div className="px-2.5 py-1 text-[9px] uppercase tracking-widest font-semibold text-ink-ash">
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
                        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-xs transition-colors duration-150 relative group",
                        isActive
                          ? "bg-wine-accent/15 text-ink-parchment font-medium shadow-sm"
                          : "text-ink-bone hover:bg-surface-card hover:text-ink-parchment",
                        collapsed && "justify-center px-0 py-2"
                      )}
                      title={collapsed ? item.name : undefined}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-wine-crimson rounded-r" />
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
                        <span className="truncate flex-1">{item.name}</span>
                      )}

                      {!collapsed && item.badge && (
                        <Badge
                          variant={item.badgeVariant || "subtle"}
                          size="xs"
                          className="shrink-0"
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
            <div className="p-3 border-t border-border-quiet bg-surface-subtle text-[10px] text-ink-ash space-y-1">
              <div className="flex justify-between">
                <span>Folio Daemon</span>
                <span className="text-pine-moss font-mono">v2.4.9</span>
              </div>
              <div className="flex justify-between">
                <span>Integrity Gate</span>
                <span className="text-ink-bone">Passing</span>
              </div>
            </div>
          )}
        </aside>

        {/* Center Workspace Content Canvas */}
        <main className="flex-1 overflow-y-auto bg-surface-void flex flex-col">
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
