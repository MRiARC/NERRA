"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ArrowUp, Sparkles, SlidersHorizontal, Mic, Zap } from "lucide-react";

export interface PromptDeckProps {
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  isLoading?: boolean;
  modelBadge?: string;
  onModelBadgeClick?: () => void;
  className?: string;
}

export function PromptDeck({
  placeholder = "Ask anything about your novel, characters, or plot...",
  value: controlledValue,
  defaultValue = "",
  onChange,
  onSubmit,
  isLoading = false,
  modelBadge = "Claude 3.7 Sonnet",
  onModelBadgeClick,
  className,
}: PromptDeckProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (controlledValue === undefined) {
      setInternalValue(e.target.value);
    }
    onChange?.(e.target.value);

    // Auto-expand textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit?.(value.trim());
      }
    }
  };

  const handleSend = () => {
    if (value.trim() && !isLoading) {
      onSubmit?.(value.trim());
    }
  };

  return (
    <div
      className={cn(
        "w-full rounded-[20px] bg-surface-card border border-border-subtle shadow-[inset_0_1px_0_0_var(--edge-highlight),0_12px_36px_-4px_rgba(0,0,0,0.5)] transition-all duration-200 focus-within:border-border-prominent focus-within:shadow-[inset_0_1px_0_0_var(--edge-highlight-prominent),0_16px_40px_-4px_rgba(0,0,0,0.65)]",
        className
      )}
    >
      {/* Upper Typing Deck */}
      <div className="p-3.5 sm:p-4">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className="w-full bg-transparent border-0 outline-none resize-none text-xs sm:text-sm text-ink-parchment placeholder:text-ink-faint leading-relaxed min-h-[28px] max-h-[180px]"
        />
      </div>

      {/* Internal Hairline Shelf Divider */}
      <div className="border-t border-border-quiet" />

      {/* Lower Equipment Dock */}
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        {/* Left Side: Scope & Model Badge Pill */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={onModelBadgeClick}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-subtle hover:bg-surface-elevated border border-border-subtle hover:border-border-prominent text-[11px] text-ink-bone hover:text-ink-parchment transition-all select-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
          >
            <Sparkles className="w-3 h-3 text-wine-crimson" />
            <span className="truncate max-w-[140px] sm:max-w-[200px] font-medium">
              {modelBadge}
            </span>
          </button>
        </div>

        {/* Right Side: Tools & Focal Submit Trigger */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-ink-ash hidden sm:inline mr-1">
            Press Enter ↵
          </span>

          <button
            type="button"
            onClick={handleSend}
            disabled={!value.trim() || isLoading}
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center transition-all select-none",
              value.trim() && !isLoading
                ? "bg-wine-accent hover:bg-wine-crimson text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_2px_8px_rgba(140,34,66,0.4)] active:scale-95"
                : "bg-surface-subtle text-ink-ash opacity-40 cursor-not-allowed border border-border-quiet"
            )}
            aria-label="Send query"
          >
            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
