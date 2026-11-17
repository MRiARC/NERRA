"use client";

import React, { use } from "react";
import { StoryGraphView } from "@/components/storyGraph/StoryGraphView";

interface StoryGraphPageProps {
  params: Promise<{ id: string }>;
}

/**
 * World & Cast Network Page for Nera.
 * Unified AntV G6 force-directed constellation tracking Characters, Relics/Artifacts,
 * Locations/Settings, and Events across the chapter chronology.
 */
export default function StoryGraphPage({ params }: StoryGraphPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-surface-void">
      <StoryGraphView projectId={projectId} initialLens="full" />
    </div>
  );
}
