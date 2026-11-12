"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_THEME, THEMES, type ThemeId } from "@/lib/theme";

interface ThemeState {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  cycleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: DEFAULT_THEME,
      setTheme: (theme: ThemeId) => {
        set({ theme });
        applyTheme(theme);
      },
      cycleTheme: () => {
        const themeKeys = Object.keys(THEMES) as ThemeId[];
        const currentIndex = themeKeys.indexOf(get().theme);
        const nextTheme = themeKeys[(currentIndex + 1) % themeKeys.length];
        get().setTheme(nextTheme);
      },
    }),
    {
      name: "nerra_theme_preference",
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

export function applyTheme(themeId: ThemeId) {
  if (typeof document === "undefined") return;
  const config = THEMES[themeId] || THEMES[DEFAULT_THEME];
  const root = document.documentElement;

  root.setAttribute("data-theme", themeId);
  if (config.isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}
