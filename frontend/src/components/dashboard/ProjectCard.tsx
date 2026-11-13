"use client";

import React from "react";
import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatWords, formatDate } from "@/lib/utils";
import type { Project } from "@/lib/types";
import {
  BookOpen,
  AlertCircle,
  Clock,
  Sparkles,
  Upload,
  ArrowRight,
  Bookmark,
} from "lucide-react";

interface ProjectCardProps {
  project: Project;
  onUploadClick: (project: Project) => void;
}

export function ProjectCard({ project, onUploadClick }: ProjectCardProps) {
  const words = project.word_count || 0;
  const chapters = project.chapter_count || 0;
  const issues = project.open_issue_count || 0;

  return (
    <Surface
      depth={2}
      border="subtle"
      interactive
      rounded="md"
      className="flex flex-col justify-between h-[236px] p-5 group"
    >
      {/* Top Details */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h3 className="font-serif text-lg font-medium tracking-tight text-ink-parchment group-hover:text-white transition-colors truncate">
              {project.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-ink-ash">
              <Clock className="w-3.5 h-3.5" />
              <span>Created {formatDate(project.created_at)}</span>
              {project.genre && (
                <>
                  <span className="text-border-subtle">•</span>
                  <span className="text-ink-bone italic">{project.genre}</span>
                </>
              )}
            </div>
          </div>

          {/* Status Badge */}
          {issues > 0 ? (
            <Badge variant="contradiction" size="sm" className="gap-1 shrink-0" dot>
              <span>{issues} Issues</span>
            </Badge>
          ) : (
            <Badge variant="thread" size="sm" className="gap-1 shrink-0" dot>
              <span>All Consistent</span>
            </Badge>
          )}
        </div>

        {/* Narrative Metrics */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border-quiet text-xs">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-faint font-semibold">
              Word Count
            </p>
            <p className="font-serif text-base font-medium text-ink-parchment mt-0.5">
              {words > 0 ? formatWords(words) : "Draft In Progress"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-faint font-semibold">
              Chapters
            </p>
            <p className="font-serif text-base font-medium text-ink-parchment mt-0.5">
              {chapters > 0 ? `${chapters} Chapters` : "No Chapters Yet"}
            </p>
          </div>
        </div>
      </div>

      {/* Card Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border-quiet mt-2">
        <Button
          variant="ghost"
          size="xs"
          onClick={(e) => {
            e.preventDefault();
            onUploadClick(project);
          }}
          className="gap-1.5 text-ink-ash hover:text-ink-bone"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Manuscript</span>
        </Button>

        <Link href={`/projects/${project.id}`}>
          <Button variant="outline" size="xs" className="gap-1 group/btn">
            <span>Open Project</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-0.5" />
          </Button>
        </Link>
      </div>
    </Surface>
  );
}
