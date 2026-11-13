"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface GlobalSettingsState {
  // Global AI Engine & Sovereign Keys
  primaryModel: string;
  customBaseUrl: string;
  apiKeyOverride: string;
  embeddingModel: string;
  maxHopDepth: number;

  // Global Writing Presets
  defaultStructure: string;
  defaultNomenclature: string;
  defaultStrictness: "strict" | "balanced" | "relaxed";
  defaultNovellaMode: boolean;

  // Actions
  setPrimaryModel: (model: string) => void;
  setCustomBaseUrl: (url: string) => void;
  setApiKeyOverride: (key: string) => void;
  setEmbeddingModel: (model: string) => void;
  setMaxHopDepth: (depth: number) => void;
  setDefaultStructure: (structure: string) => void;
  setDefaultNomenclature: (nomenclature: string) => void;
  setDefaultStrictness: (preset: "strict" | "balanced" | "relaxed") => void;
  setDefaultNovellaMode: (isNovella: boolean) => void;
  updateGlobalSettings: (settings: Partial<GlobalSettingsState>) => void;
}

export const useGlobalSettingsStore = create<GlobalSettingsState>()(
  persist(
    (set) => ({
      primaryModel: "claude-3-7-sonnet",
      customBaseUrl: "",
      apiKeyOverride: "",
      embeddingModel: "text-embedding-3-large",
      maxHopDepth: 2,

      defaultStructure: "three_act",
      defaultNomenclature: "Chapter #",
      defaultStrictness: "balanced",
      defaultNovellaMode: false,

      setPrimaryModel: (primaryModel) => set({ primaryModel }),
      setCustomBaseUrl: (customBaseUrl) => set({ customBaseUrl }),
      setApiKeyOverride: (apiKeyOverride) => set({ apiKeyOverride }),
      setEmbeddingModel: (embeddingModel) => set({ embeddingModel }),
      setMaxHopDepth: (maxHopDepth) => set({ maxHopDepth }),
      setDefaultStructure: (defaultStructure) => set({ defaultStructure }),
      setDefaultNomenclature: (defaultNomenclature) => set({ defaultNomenclature }),
      setDefaultStrictness: (defaultStrictness) => set({ defaultStrictness }),
      setDefaultNovellaMode: (defaultNovellaMode) => set({ defaultNovellaMode }),
      updateGlobalSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
    }),
    {
      name: "nerra_global_studio_settings",
    }
  )
);
