/**
 * Central Theme Registry for NERRA.
 * Defines theme metadata, IDs, display names, and primary color swatches.
 * All actual styling values are driven by CSS variables in globals.css.
 */

export type ThemeId =
  | "literary-obsidian"
  | "cypress-void"
  | "scholar-slate"
  | "ivory-atelier";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  isDark: boolean;
  accentHex: string;
  surfaceHex: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  "literary-obsidian": {
    id: "literary-obsidian",
    name: "Literary Obsidian",
    description: "Deep obsidian void with velvet wine and aged parchment",
    isDark: true,
    accentHex: "#7A1D39",
    surfaceHex: "#0A0608",
  },
  "cypress-void": {
    id: "cypress-void",
    name: "Cypress Void",
    description: "Midnight forest void with deep pine and muted vellum",
    isDark: true,
    accentHex: "#173D2F",
    surfaceHex: "#070E0B",
  },
  "scholar-slate": {
    id: "scholar-slate",
    name: "Scholar Slate",
    description: "Obsidian blue with steel epistemic accents and bone ink",
    isDark: true,
    accentHex: "#22425A",
    surfaceHex: "#080C10",
  },
  "ivory-atelier": {
    id: "ivory-atelier",
    name: "Ivory Atelier",
    description: "Warm archival parchment with antique crimson and soot ink",
    isDark: false,
    accentHex: "#8C2242",
    surfaceHex: "#F8F5EE",
  },
};

export const DEFAULT_THEME: ThemeId = "literary-obsidian";
