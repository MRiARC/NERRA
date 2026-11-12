"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
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
  GitBranch,
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
    <Card
      variant="burgundy"
      hoverEffect
      className="flex flex-col justify-between h-[230px] relative overflow-hidden group border-white/[0.08] hover:border-[#C43D65]/40"
    >
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#9B2242]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#9B2242]/20 transition-all duration-500" />

      {/* Top Details */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-semibold tracking-tight text-[#EDE6D6] group-hover:text-white transition-colors line-clamp-1">
              {project.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-[#7D756C]">
              <Clock className="w-3.5 h-3.5" />
              <span>Created {formatDate(project.created_at)}</span>
            </div>
          </div>

          {/* Status Badge */}
          {issues > 0 ? (
            <Badge variant="red" size="sm" className="gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>{issues} Issues</span>
            </Badge>
          ) : (
            <Badge variant="emerald" size="sm" className="gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Clean Canon</span>
            </Badge>
          )}
        </div>

        {/* Story Metrics */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#C5A059]" />
            <div>
              <p className="text-xs font-semibold text-[#EDE6D6]">
                {chapters} {chapters === 1 ? "Chapter" : "Chapters"}
              </p>
              <p className="text-[10px] text-[#7D756C] uppercase font-mono">
                {formatWords(words)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#1B8A5A]" />
            <div>
              <p className="text-xs font-semibold text-[#EDE6D6]">
                Graph Roster
              </p>
              <p className="text-[10px] text-[#7D756C] uppercase font-mono">
                Active Canon
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
        <Button
          variant="subtle"
          size="sm"
          onClick={() => onUploadClick(project)}
          className="flex-1 text-xs gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Draft</span>
        </Button>

        <Link href={`/projects/${project.id}/reader`} className="flex-1">
          <Button variant="wine" size="sm" className="w-full text-xs gap-1.5">
            <span>Enter Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
