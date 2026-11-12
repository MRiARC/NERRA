"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Feather,
  Plus,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  Laptop,
  BookOpen,
} from "lucide-react";

interface NavbarProps {
  onOpenNewProject: () => void;
  onOpenAuth: () => void;
  onOpenSessions: () => void;
}

export function Navbar({
  onOpenNewProject,
  onOpenAuth,
  onOpenSessions,
}: NavbarProps) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#08090B]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Emblem */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#9B2242] to-[#130D12] border border-[#C43D65]/40 flex items-center justify-center shadow-[0_0_15px_rgba(155,34,66,0.3)]">
            <Feather className="w-5 h-5 text-[#EDE6D6]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-bold tracking-tight text-[#EDE6D6]">
                NERRA
              </span>
              <Badge variant="brass" size="sm">
                Studio
              </Badge>
            </div>
            <p className="text-[10px] text-[#7D756C] tracking-wide uppercase font-mono">
              Story Intelligence Operating System
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Button
                variant="wine"
                size="sm"
                onClick={onOpenNewProject}
                className="gap-2 shadow-[0_0_20px_rgba(155,34,66,0.25)]"
              >
                <Plus className="w-4 h-4" />
                <span>New Manuscript</span>
              </Button>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-[#1B8A5A]/20 border border-[#1B8A5A]/40 flex items-center justify-center">
                    <UserIcon className="w-3.5 h-3.5 text-[#34D399]" />
                  </div>
                  <span className="text-xs text-[#EDE6D6] font-medium max-w-[120px] truncate">
                    {user?.display_name || user?.email || "Author"}
                  </span>
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-[#140E13] border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.8)] py-2 z-50 text-xs text-[#EDE6D6] animate-in fade-in-0 zoom-in-95"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-white/[0.08]">
                      <p className="font-medium text-[#EDE6D6] truncate">
                        {user?.display_name}
                      </p>
                      <p className="text-[11px] text-[#7D756C] truncate">{user?.email}</p>
                    </div>

                    <button
                      onClick={onOpenSessions}
                      className="w-full text-left px-3 py-2 hover:bg-white/[0.05] flex items-center gap-2 text-[#B5ACA0] hover:text-[#EDE6D6] transition-colors"
                    >
                      <Laptop className="w-4 h-4 text-[#C5A059]" />
                      <span>Active Sessions & Devices</span>
                    </button>

                    <button
                      onClick={() => logout()}
                      className="w-full text-left px-3 py-2 hover:bg-[#9B2242]/20 flex items-center gap-2 text-[#F87171] transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Button variant="brass" size="sm" onClick={onOpenAuth}>
              <ShieldCheck className="w-4 h-4" />
              <span>Sign In / Register</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
