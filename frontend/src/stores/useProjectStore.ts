import { create } from "zustand";
import type { Project } from "@/lib/types";

interface ProjectState {
  activeProject: Project | null;
  activeChapterNumber: number;
  isUploadingManuscript: boolean;
  uploadStatusText: string;

  // Actions
  setActiveProject: (project: Project | null) => void;
  setActiveChapterNumber: (num: number) => void;
  setUploading: (isUploading: boolean, statusText?: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  activeProject: null,
  activeChapterNumber: 1,
  isUploadingManuscript: false,
  uploadStatusText: "",

  setActiveProject: (project) => set({ activeProject: project }),
  setActiveChapterNumber: (num) => set({ activeChapterNumber: num }),
  setUploading: (isUploading, statusText = "") =>
    set({ isUploadingManuscript: isUploading, uploadStatusText: statusText }),
}));
