"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";
import {
  ShieldCheck,
  UserPlus,
  LogIn,
  Laptop,
  Trash2,
  AlertTriangle,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "signin" | "register" | "sessions";
}

export function AuthModal({
  isOpen,
  onClose,
  initialTab = "signin",
}: AuthModalProps) {
  const [tab, setTab] = useState<"signin" | "register" | "sessions">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const {
    login,
    register,
    isLoading,
    error,
    clearError,
    sessions,
    revokeSession,
    revokeAllOtherSessions,
  } = useAuthStore();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const ok = await login(email, password);
    if (ok) {
      toast.success("Welcome back to NERRA Studio");
      onClose();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const ok = await register(email, password, displayName || "Author");
    if (ok) {
      toast.success("Account created! Welcome to NERRA Studio");
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        tab === "sessions"
          ? "Active Sessions & Devices"
          : tab === "signin"
          ? "Sign In to NERRA"
          : "Create Author Account"
      }
      description={
        tab === "sessions"
          ? "Manage your active device logins and invalidate sessions remotely."
          : "Your stories and world knowledge graphs are securely encrypted and tied to your account."
      }
    >
      {/* Tab Switcher */}
      {tab !== "sessions" && (
        <div className="flex items-center gap-1 p-1 bg-black/40 rounded-lg border border-white/[0.08] mb-5">
          <button
            type="button"
            onClick={() => {
              setTab("signin");
              clearError();
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              tab === "signin"
                ? "bg-[#9B2242] text-[#EDE6D6] shadow-[0_0_12px_rgba(155,34,66,0.3)]"
                : "text-[#B5ACA0] hover:text-[#EDE6D6]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              clearError();
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              tab === "register"
                ? "bg-[#9B2242] text-[#EDE6D6] shadow-[0_0_12px_rgba(155,34,66,0.3)]"
                : "text-[#B5ACA0] hover:text-[#EDE6D6]"
            }`}
          >
            Create Account
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 mb-4 rounded-lg bg-[#9B2242]/15 border border-[#9B2242]/30 flex items-center gap-2 text-xs text-[#F87171]">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {tab === "signin" && (
        <form onSubmit={handleSignIn} className="space-y-3.5">
          <Input
            id="signin-email"
            label="Email Address"
            type="email"
            placeholder="author@nerra.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <Input
            id="signin-password"
            label="Password"
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="pt-2">
            <Button
              type="submit"
              variant="wine"
              className="w-full gap-2"
              isLoading={isLoading}
            >
              <LogIn className="w-4 h-4" />
              <span>Enter Studio</span>
            </Button>
          </div>
        </form>
      )}

      {tab === "register" && (
        <form onSubmit={handleRegister} className="space-y-3.5">
          <Input
            id="reg-name"
            label="Pen Name / Display Name"
            placeholder="Sarah Ashford"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoFocus
          />
          <Input
            id="reg-email"
            label="Email Address"
            type="email"
            placeholder="author@nerra.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="reg-password"
            label="Password"
            type="password"
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="pt-2">
            <Button
              type="submit"
              variant="wine"
              className="w-full gap-2"
              isLoading={isLoading}
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </Button>
          </div>
        </form>
      )}

      {tab === "sessions" && (
        <div className="space-y-4">
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-lg bg-[#08090B] border border-white/[0.08] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <Laptop className="w-4 h-4 text-[#C5A059]" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#EDE6D6] truncate max-w-[180px]">
                        {s.user_agent ? s.user_agent.slice(0, 30) + "..." : "Browser Session"}
                      </span>
                      {s.is_current && (
                        <Badge variant="emerald" size="sm">
                          Current Device
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-[#7D756C] mt-0.5">
                      IP: {s.ip_address || "127.0.0.1"} • Active:{" "}
                      {new Date(s.last_active_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {!s.is_current && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => revokeSession(s.id)}
                    className="text-[#F87171] hover:bg-[#9B2242]/20"
                    title="Revoke session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
            <Button
              variant="subtle"
              size="sm"
              onClick={() => revokeAllOtherSessions()}
              className="text-[#F87171] gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Revoke All Other Devices</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
