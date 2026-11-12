"use client";

import React, { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Surface } from "./Surface";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Glass Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Depth-3 Elevated Surface Frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg"
          >
            <Surface
              depth={3}
              border="prominent"
              rounded="sm"
              className={cn("p-6 text-ink-parchment relative", className)}
            >
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-1.5 rounded-[4px] text-ink-ash hover:text-ink-parchment hover:bg-surface-subtle transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>

              {title && (
                <div className="mb-4 pr-6">
                  <h2 className="text-lg font-serif font-medium tracking-tight text-ink-parchment">
                    {title}
                  </h2>
                  {description && (
                    <p className="mt-1 text-xs text-ink-bone leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
              )}

              {children}
            </Surface>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
