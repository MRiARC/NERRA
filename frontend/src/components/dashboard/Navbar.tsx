"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import {
  Feather,
  Plus,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  Laptop,
  LogIn,
  Sliders,
} from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

interface NavbarProps {
  onOpenNewProject: () => void;
  onOpenSessions: () => void;
}

export function Navbar({ onOpenNewProject, onOpenSessions }: NavbarProps) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-quiet bg-surface-subtle/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Emblem */}
        <Link href="/" className="flex items-center gap-3 select-none group">
          <div className="w-8 h-8 rounded-xl bg-wine-accent/20 border border-wine-accent/40 flex items-center justify-center text-wine-crimson shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] group-hover:bg-wine-accent/30 transition-colors">
            <Feather className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-medium tracking-tight text-ink-parchment">
                NERRA
              </span>
              <Badge variant="wine" size="xs">
                Studio
              </Badge>
            </div>
            <p className="text-[10px] text-ink-ash tracking-widest uppercase font-mono hidden sm:block">
              Story Intelligence Operating System
            </p>
          </div>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <ThemeSwitcher />

          {isAuthenticated ? (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenNewProject}
                className="gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Novel</span>
              </Button>

              {/* User Dropdown */}
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-card hover:bg-surface-elevated border border-border-subtle hover:border-border-prominent text-ink-bone text-xs transition-colors shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                >
                  <div className="w-5 h-5 rounded-full bg-wine-accent/30 flex items-center justify-center text-ink-parchment font-serif font-bold text-[10px]">
                    {user?.display_name ? user.display_name[0].toUpperCase() : "A"}
                  </div>
                  <span className="max-w-[120px] truncate hidden md:inline">
                    {user?.display_name || user?.email}
                  </span>
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 mt-2 w-60 rounded-2xl bg-surface-elevated border border-border-subtle shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_12px_36px_rgba(0,0,0,0.6)] p-2 z-50 text-xs text-ink-bone"
                    >
                      <div className="px-3 py-2 border-b border-border-quiet mb-1">
                        <p className="text-xs font-medium text-ink-parchment truncate">
                          {user?.display_name || "Author"}
                        </p>
                        <p className="text-[11px] text-ink-ash truncate">{user?.email}</p>
                      </div>

                      <Link
                        href="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-surface-card hover:text-ink-parchment transition-colors text-left"
                      >
                        <Sliders className="w-3.5 h-3.5 text-wine-accent" />
                        <span>Studio Settings</span>
                      </Link>

                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenSessions();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-surface-card hover:text-ink-parchment transition-colors text-left"
                      >
                        <Laptop className="w-3.5 h-3.5 text-ink-ash" />
                        <span>Active Device Sessions</span>
                      </button>

                      <div className="my-1 border-t border-border-quiet" />

                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-severity-contradiction hover:bg-severity-contradiction-bg transition-colors text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">
                  <span>Register</span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
