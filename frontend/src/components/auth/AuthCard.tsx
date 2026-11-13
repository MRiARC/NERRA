"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Eye, EyeOff, BookOpen, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";

export interface AuthCardProps {
  initialMode?: "login" | "register";
}

export function AuthCard({ initialMode = "login" }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { login, register, isLoading, error: storeError, clearError } = useAuthStore();

  const activeError = formError || storeError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    // Client validation
    if (!email || !email.includes("@")) {
      setFormError("Please enter a valid author email address.");
      return;
    }
    if (!password || password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }
    if (mode === "register" && !displayName.trim()) {
      setFormError("Please provide an author or pen name.");
      return;
    }

    let success = false;
    if (mode === "login") {
      success = await login(email, password);
    } else {
      success = await register(email, password, displayName);
    }

    if (success) {
      router.push(redirectPath);
      router.refresh();
    }
  };

  return (
    <Surface
      depth={2}
      border="subtle"
      rounded="lg"
      className="w-full max-w-md p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm"
    >
      {/* Subtle top wine accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-wine-crimson to-transparent" />

      {/* Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-wine-accent/15 border border-wine-accent/30 text-wine-crimson mb-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
          <BookOpen className="w-5 h-5" />
        </div>
        <h1 className="font-serif text-2xl font-medium tracking-tight text-ink-parchment">
          {mode === "login" ? "Enter the Scribe's Atelier" : "Forge Your Story Codex"}
        </h1>
        <p className="text-xs text-ink-bone mt-1.5 leading-relaxed max-w-xs mx-auto">
          {mode === "login"
            ? "Resume forensic continuity, epistemic tracking, and manuscript intelligence."
            : "Register your authoring workspace for real-time consistency and world graph audits."}
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 p-1 rounded-xl bg-surface-subtle border border-border-quiet mb-6 relative">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setFormError(null);
            clearError();
          }}
          className={`relative z-10 py-1.5 text-xs font-medium transition-colors select-none ${
            mode === "login" ? "text-ink-parchment font-semibold" : "text-ink-ash hover:text-ink-bone"
          }`}
        >
          Sign In
          {mode === "login" && (
            <motion.div
              layoutId="auth-tab-pill"
              className="absolute inset-0 bg-surface-card border border-border-subtle rounded-lg -z-10 shadow-sm"
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("register");
            setFormError(null);
            clearError();
          }}
          className={`relative z-10 py-1.5 text-xs font-medium transition-colors select-none ${
            mode === "register" ? "text-ink-parchment font-semibold" : "text-ink-ash hover:text-ink-bone"
          }`}
        >
          Create Account
          {mode === "register" && (
            <motion.div
              layoutId="auth-tab-pill"
              className="absolute inset-0 bg-surface-card border border-border-subtle rounded-lg -z-10 shadow-sm"
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
        </button>
      </div>

      {/* Error Notice */}
      <AnimatePresence>
        {activeError && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3.5 rounded-xl bg-severity-contradiction-bg border border-severity-contradiction-border flex items-start gap-2.5 text-xs text-severity-contradiction">
              <span className="w-1.5 h-1.5 rounded-full bg-severity-contradiction shrink-0 mt-1.5" />
              <div className="flex-1 leading-relaxed">{activeError}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Input
              id="displayName"
              label="Author / Pen Name"
              placeholder="e.g. Elena Vance"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required={mode === "register"}
              autoComplete="name"
            />
          </motion.div>
        )}

        <Input
          id="email"
          type="email"
          label="Author Email"
          placeholder="scribe@nerra.studio"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-xs font-medium text-ink-bone tracking-wide"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full rounded-xl bg-surface-subtle border border-border-subtle px-3.5 py-2.5 pr-9 text-xs text-ink-parchment placeholder:text-ink-faint transition-all duration-150 outline-none focus:border-border-focus focus:ring-1 focus:ring-wine-accent/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-ash hover:text-ink-bone p-1 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {mode === "register" && (
            <p className="text-[10px] text-ink-ash">
              Cryptographically hashed with Argon2id + rotating session tokens.
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full mt-2 group"
        >
          <span>{mode === "login" ? "Access Workspace" : "Create Author Account"}</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </form>

      {/* Security & Token Guarantee */}
      <div className="mt-6 pt-5 border-t border-border-quiet flex items-center justify-between text-[11px] text-ink-ash">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-pine-moss" />
          <span>Session Token Recycling</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-wine-crimson" />
          <span>Local Engine Active</span>
        </div>
      </div>
    </Surface>
  );
}
