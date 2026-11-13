"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.projects.get(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCharacters(projectId: string) {
  return useQuery({
    queryKey: ["characters", projectId],
    queryFn: () => api.story.getCharacters(projectId),
    enabled: Boolean(projectId),
  });
}

export function useEvents(projectId: string) {
  return useQuery({
    queryKey: ["events", projectId],
    queryFn: () => api.story.getEvents(projectId),
    enabled: Boolean(projectId),
  });
}

export function useTimeline(projectId: string, order = "narrative") {
  return useQuery({
    queryKey: ["timeline", projectId, order],
    queryFn: () => api.story.getTimeline(projectId, order),
    enabled: Boolean(projectId),
  });
}

export function useStoryGraph(projectId: string) {
  return useQuery({
    queryKey: ["graph", projectId],
    queryFn: () => api.story.getGraph(projectId),
    enabled: Boolean(projectId),
  });
}

export function useKnowledgeMatrix(projectId: string, maxChapter?: number) {
  return useQuery({
    queryKey: ["knowledge-matrix", projectId, maxChapter],
    queryFn: () => api.story.getKnowledgeMatrix(projectId, maxChapter),
    enabled: Boolean(projectId),
  });
}

export function useClaims(projectId: string, chapter?: number) {
  return useQuery({
    queryKey: ["claims", projectId, chapter],
    queryFn: () => api.story.getClaims(projectId, chapter),
    enabled: Boolean(projectId),
  });
}

export function useIssues(projectId: string, severity?: string) {
  return useQuery({
    queryKey: ["issues", projectId, severity],
    queryFn: () => api.story.getIssues(projectId, severity),
    enabled: Boolean(projectId),
  });
}

export function useWorld(projectId: string) {
  return useQuery({
    queryKey: ["world", projectId],
    queryFn: () => api.story.getWorld(projectId),
    enabled: Boolean(projectId),
  });
}

export function useWorldRules(projectId: string) {
  return useQuery({
    queryKey: ["world-rules", projectId],
    queryFn: () => api.story.getWorldRules(projectId),
    enabled: Boolean(projectId),
  });
}

export function usePlotThreads(projectId: string) {
  return useQuery({
    queryKey: ["plot-threads", projectId],
    queryFn: () => api.story.getPlotThreads(projectId),
    enabled: Boolean(projectId),
  });
}

export function useManuscripts(projectId: string) {
  return useQuery({
    queryKey: ["manuscripts", projectId],
    queryFn: () => api.projects.getManuscripts(projectId),
    enabled: Boolean(projectId),
  });
}

export function useManuscriptStatus(projectId: string, manuscriptId?: string) {
  return useQuery({
    queryKey: ["manuscript-status", projectId, manuscriptId],
    queryFn: () => api.projects.getManuscriptStatus(projectId, manuscriptId!),
    enabled: Boolean(projectId && manuscriptId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === "pending" || data.status === "processing")) {
        return 2000; // Poll every 2s while running
      }
      return false;
    },
  });
}

export function useChapters(projectId: string, manuscriptId?: string) {
  return useQuery({
    queryKey: ["chapters", projectId, manuscriptId],
    queryFn: () => api.projects.getChapters(projectId, manuscriptId!),
    enabled: Boolean(projectId && manuscriptId),
  });
}

export function useChapter(projectId: string, manuscriptId?: string, chapterNumber?: number) {
  return useQuery({
    queryKey: ["chapter", projectId, manuscriptId, chapterNumber],
    queryFn: () => api.projects.getChapter(projectId, manuscriptId!, chapterNumber!),
    enabled: Boolean(projectId && manuscriptId && chapterNumber !== undefined),
  });
}

export function useCustomization(projectId: string) {
  return useQuery({
    queryKey: ["customization", projectId],
    queryFn: () => api.story.getCustomization(projectId),
    enabled: Boolean(projectId),
  });
}

