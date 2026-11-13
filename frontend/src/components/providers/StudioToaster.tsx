"use client";

import { Toaster } from "sonner";
import { useThemeStore } from "@/stores/useThemeStore";

/**
 * Sonner toaster that follows the active studio theme instead of forcing dark.
 */
export function StudioToaster() {
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme !== "ivory-atelier";

  return (
    <Toaster
      theme={isDark ? "dark" : "light"}
      position="bottom-right"
      toastOptions={{
        className:
          "!bg-surface-elevated !border !border-border-prominent !text-ink-parchment !shadow-2xl",
      }}
    />
  );
}
