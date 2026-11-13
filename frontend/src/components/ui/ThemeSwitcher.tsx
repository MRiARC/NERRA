"use client";

import React, { useState, useRef, useEffect } from "react";
import { useThemeStore } from "@/stores/useThemeStore";
import { THEMES, type ThemeId } from "@/lib/theme";
import { Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const activeThemeConfig = THEMES[theme] || THEMES["literary-obsidian"];

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] bg-surface-subtle hover:bg-surface-card border border-border-subtle hover:border-border-prominent text-ink-bone hover:text-ink-parchment text-xs font-medium transition-all duration-150 select-none"
        title="Switch Studio Palette Theme"
        aria-label="Theme selector"
      >
        <span
          className="w-2.5 h-2.5 rounded-full border border-black/40 shadow-sm shrink-0"
          style={{ backgroundColor: activeThemeConfig.accentHex }}
        />
        <span className="hidden sm:inline">{activeThemeConfig.name}</span>
        <Palette className="w-3.5 h-3.5 text-ink-ash" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 mt-1.5 w-60 rounded-[4px] bg-surface-elevated border border-border-prominent shadow-2xl p-1.5 z-50 text-xs"
          >
            <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-ink-ash border-b border-border-quiet mb-1">
              Studio Aesthetic
            </div>

            <div className="space-y-0.5">
              {(Object.keys(THEMES) as ThemeId[]).map((themeKey) => {
                const config = THEMES[themeKey];
                const isActive = theme === themeKey;

                return (
                  <button
                    key={themeKey}
                    onClick={() => {
                      setTheme(themeKey);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-2 rounded-[3px] text-left transition-colors duration-150",
                      isActive
                        ? "bg-wine-accent/15 text-ink-parchment font-medium"
                        : "text-ink-bone hover:bg-surface-card hover:text-ink-parchment"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full border border-black/50 shrink-0 shadow-sm"
                        style={{ backgroundColor: config.accentHex }}
                      />
                      <div className="truncate">
                        <div className="text-xs truncate">{config.name}</div>
                        <div className="text-[10px] text-ink-ash truncate">
                          {config.isDark ? "Dark Editorial" : "Warm Parchment"}
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <Check className="w-3.5 h-3.5 text-wine-crimson shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
