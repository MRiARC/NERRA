"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useGlobalSettingsStore } from "@/stores/useGlobalSettingsStore";
import { THEMES, type ThemeId } from "@/lib/theme";
import { Navbar } from "@/components/dashboard/Navbar";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Palette,
  Cpu,
  User as UserIcon,
  Laptop,
  Sliders,
  Check,
  Eye,
  EyeOff,
  Save,
  ArrowLeft,
  ShieldCheck,
  Key,
  Globe,
  Layers,
  Sparkles,
  BookOpen,
  Trash2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

type SettingsTab = "appearance" | "ai" | "profile" | "sessions" | "presets";

export default function GlobalSettingsPage() {
  const { user, isAuthenticated, checkAuth, sessions, fetchSessions, revokeSession, revokeAllOtherSessions } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const globalSettings = useGlobalSettingsStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const [showApiKey, setShowApiKey] = useState(false);

  // Form local state for AI Engine
  const [primaryModel, setPrimaryModel] = useState(globalSettings.primaryModel);
  const [customBaseUrl, setCustomBaseUrl] = useState(globalSettings.customBaseUrl);
  const [apiKeyOverride, setApiKeyOverride] = useState(globalSettings.apiKeyOverride);
  const [embeddingModel, setEmbeddingModel] = useState(globalSettings.embeddingModel);
  const [maxHopDepth, setMaxHopDepth] = useState(globalSettings.maxHopDepth);

  // Form local state for Presets
  const [defaultStrictness, setDefaultStrictness] = useState(globalSettings.defaultStrictness);
  const [defaultNomenclature, setDefaultNomenclature] = useState(globalSettings.defaultNomenclature);
  const [defaultNovellaMode, setDefaultNovellaMode] = useState(globalSettings.defaultNovellaMode);

  useEffect(() => {
    checkAuth();
    fetchSessions();
  }, [checkAuth, fetchSessions]);

  const handleSaveAISettings = () => {
    globalSettings.updateGlobalSettings({
      primaryModel,
      customBaseUrl: customBaseUrl.trim(),
      apiKeyOverride: apiKeyOverride.trim(),
      embeddingModel,
      maxHopDepth,
    });
    toast.success("Global AI Engine & Sovereign Keys saved successfully.");
  };

  const handleSavePresets = () => {
    globalSettings.updateGlobalSettings({
      defaultStrictness,
      defaultNomenclature,
      defaultNovellaMode,
    });
    toast.success("Studio default presets updated.");
  };

  return (
    <div className="min-h-screen bg-surface-void flex flex-col selection:bg-wine-accent selection:text-ink-parchment">
      {/* Studio Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border-quiet bg-surface-subtle/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-mono text-ink-ash hover:text-ink-parchment transition-colors px-2 py-1 rounded-lg hover:bg-surface-card border border-transparent hover:border-border-quiet"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Studio</span>
            </Link>
            <span className="text-border-subtle font-mono text-xs">/</span>
            <span className="font-serif text-sm font-medium text-ink-parchment tracking-tight">
              Studio Settings
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-pine-forest flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-card border border-border-quiet">
              <span className="w-1.5 h-1.5 rounded-full bg-pine-forest" />
              Preferences Synchronized
            </span>
          </div>
        </div>
      </header>

      {/* Main Settings Canvas */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in pb-24">
        {/* Header & Mission Banner */}
        <div className="space-y-2 border-b border-border-subtle pb-6">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-ink-ash font-medium">
              Global Author Workspace Configuration
            </span>
          </div>
          <h1 className="text-3xl font-serif font-normal tracking-tight text-ink-parchment flex items-center gap-3">
            <Sliders className="w-7 h-7 text-wine-accent" />
            Studio Preferences &amp; Sovereign Keys
          </h1>
          <p className="text-sm text-ink-ash max-w-2xl leading-relaxed">
            Manage your studio visual theme, default sovereign AI engines, local inference endpoints,
            author identity, and account security. These settings apply globally across all your novels.
          </p>
        </div>

        {/* Tab Rail */}
        <div className="flex items-center p-1 bg-surface-card border border-border-quiet rounded-xl shadow-inner w-full sm:w-fit overflow-x-auto">
          <button
            onClick={() => setActiveTab("appearance")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 shrink-0",
              activeTab === "appearance"
                ? "bg-surface-elevated text-ink-parchment shadow-sm border border-border-subtle"
                : "text-ink-ash hover:text-ink-parchment"
            )}
          >
            <Palette className="w-3.5 h-3.5 text-wine-accent" />
            Appearance &amp; Theme
          </button>

          <button
            onClick={() => setActiveTab("ai")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 shrink-0",
              activeTab === "ai"
                ? "bg-surface-elevated text-ink-parchment shadow-sm border border-border-subtle"
                : "text-ink-ash hover:text-ink-parchment"
            )}
          >
            <Cpu className="w-3.5 h-3.5 text-wine-accent" />
            AI Engine &amp; Sovereign Keys
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 shrink-0",
              activeTab === "profile"
                ? "bg-surface-elevated text-ink-parchment shadow-sm border border-border-subtle"
                : "text-ink-ash hover:text-ink-parchment"
            )}
          >
            <UserIcon className="w-3.5 h-3.5 text-wine-accent" />
            Author Profile
          </button>

          <button
            onClick={() => setActiveTab("sessions")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 shrink-0",
              activeTab === "sessions"
                ? "bg-surface-elevated text-ink-parchment shadow-sm border border-border-subtle"
                : "text-ink-ash hover:text-ink-parchment"
            )}
          >
            <Laptop className="w-3.5 h-3.5 text-wine-accent" />
            Active Sessions ({sessions.length})
          </button>

          <button
            onClick={() => setActiveTab("presets")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 shrink-0",
              activeTab === "presets"
                ? "bg-surface-elevated text-ink-parchment shadow-sm border border-border-subtle"
                : "text-ink-ash hover:text-ink-parchment"
            )}
          >
            <Layers className="w-3.5 h-3.5 text-wine-accent" />
            Default Studio Presets
          </button>
        </div>

        {/* TAB 1: Appearance & Theme */}
        {activeTab === "appearance" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-serif font-medium text-ink-parchment">
                Studio Aesthetic &amp; Editorial Pigment
              </h2>
              <p className="text-xs text-ink-ash leading-relaxed">
                Choose the optical environment for your writing sessions. All themes enforce the Archival Matte &amp; Industrial Tactility philosophy with WCAG AAA legibility.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {(Object.keys(THEMES) as ThemeId[]).map((themeKey) => {
                const config = THEMES[themeKey];
                const isSelected = theme === themeKey;

                return (
                  <Surface
                    key={themeKey}
                    depth={2}
                    border={isSelected ? "focus" : "subtle"}
                    className={cn(
                      "p-6 rounded-2xl cursor-pointer transition-all duration-200 space-y-4 flex flex-col justify-between",
                      isSelected
                        ? "ring-1 ring-border-focus"
                        : "hover:border-border-prominent"
                    )}
                    onClick={() => setTheme(themeKey)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-5 h-5 rounded-full border border-black/40 shadow-sm shrink-0"
                            style={{ backgroundColor: config.accentHex }}
                          />
                          <h3 className="font-serif text-base font-medium text-ink-parchment">
                            {config.name}
                          </h3>
                        </div>

                        {isSelected ? (
                          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-pine-forest/20 text-pine-forest border border-pine-forest/30 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Active Palette
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] text-ink-faint">Select</span>
                        )}
                      </div>

                      <p className="text-xs font-sans text-ink-ash leading-relaxed">
                        {config.description}
                      </p>
                    </div>

                    {/* Miniature Theme Swatch Preview */}
                    <div
                      className="p-3.5 rounded-xl border border-black/30 space-y-2 select-none"
                      style={{ backgroundColor: config.surfaceHex }}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span style={{ color: config.isDark ? "#E6E0D8" : "#1B1C1A" }}>
                          Chapter 1: The First Scriptorium
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono text-white"
                          style={{ backgroundColor: config.accentHex }}
                        >
                          98% Integrity
                        </span>
                      </div>
                      <div
                        className="h-1.5 rounded-full w-3/4 opacity-40"
                        style={{ backgroundColor: config.accentHex }}
                      />
                    </div>
                  </Surface>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: AI Engine & Sovereign Keys */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-serif font-medium text-ink-parchment">
                Default AI Model &amp; Local Sovereign Endpoints
              </h2>
              <p className="text-xs text-ink-ash leading-relaxed">
                Configure your preferred inference engine once. All your novels will inherit these settings by default unless you choose to override them on a specific book.
              </p>
            </div>

            <Surface depth={2} border="subtle" className="p-6 sm:p-8 rounded-2xl space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-ink-ash mb-1.5 font-medium">
                    Primary Intelligence Model
                  </label>
                  <select
                    value={primaryModel}
                    onChange={(e) => setPrimaryModel(e.target.value)}
                    className="w-full bg-surface-subtle border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-ink-parchment outline-none focus:border-wine-accent cursor-pointer transition-colors"
                  >
                    <option value="claude-3-7-sonnet">Anthropic Claude 3.7 Sonnet (Recommended)</option>
                    <option value="claude-3-5-sonnet-20241022">Anthropic Claude 3.5 Sonnet</option>
                    <option value="claude-3-5-haiku-20241022">Anthropic Claude 3.5 Haiku (High Speed)</option>
                    <option value="deepseek-r1">DeepSeek R1 (Advanced Reasoning)</option>
                    <option value="gpt-4o">OpenAI GPT-4o</option>
                    <option value="custom-ollama">Local Model via Ollama / vLLM</option>
                  </select>
                  <p className="text-[11px] text-ink-faint mt-1">
                    Used for consistency checking, story timeline synthesis, and dialogue co-pilot.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-ink-ash mb-1.5 font-medium">
                    Dense Semantic Embedding Model
                  </label>
                  <select
                    value={embeddingModel}
                    onChange={(e) => setEmbeddingModel(e.target.value)}
                    className="w-full bg-surface-subtle border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-ink-parchment outline-none focus:border-wine-accent cursor-pointer transition-colors"
                  >
                    <option value="text-embedding-3-large">OpenAI text-embedding-3-large (3072 dims)</option>
                    <option value="text-embedding-3-small">OpenAI text-embedding-3-small (1536 dims)</option>
                    <option value="all-MiniLM-L6-v2">Local Sentence-Transformers MiniLM (384 dims)</option>
                    <option value="nomic-embed-text">Nomic Embed Text (Ollama Local)</option>
                  </select>
                  <p className="text-[11px] text-ink-faint mt-1">
                    Drives pgvector similarity search across chapter paragraphs.
                  </p>
                </div>
              </div>

              {/* Custom Base URL (Ollama / vLLM / OpenRouter) */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-ink-ash mb-1.5 font-medium flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-wine-accent" />
                  Custom Base URL (Local Ollama / vLLM / OpenRouter)
                </label>
                <input
                  type="text"
                  placeholder="e.g. http://localhost:11434/v1 or https://openrouter.ai/api/v1"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  className="w-full bg-surface-subtle border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs font-mono text-ink-parchment placeholder:text-ink-faint outline-none focus:border-wine-accent transition-colors"
                />
                <p className="text-[11px] text-ink-faint mt-1">
                  Leave blank to use default cloud endpoints. Point to your local Ollama instance for 100% air-gapped sovereign execution.
                </p>
              </div>

              {/* Sovereign API Key Override */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-mono uppercase tracking-wider text-ink-ash font-medium flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-wine-accent" />
                    Sovereign API Key Override
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-[11px] font-mono text-ink-ash hover:text-ink-parchment flex items-center gap-1 transition-colors"
                  >
                    {showApiKey ? (
                      <>
                        <EyeOff className="w-3 h-3" /> Hide Key
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" /> Reveal Key
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk-ant-... or sk-proj-..."
                    value={apiKeyOverride}
                    onChange={(e) => setApiKeyOverride(e.target.value)}
                    className="w-full bg-surface-subtle border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs font-mono text-ink-parchment placeholder:text-ink-faint outline-none focus:border-wine-accent transition-colors"
                  />
                </div>
                <p className="text-[11px] text-ink-faint mt-1">
                  Stored securely in your private browser session. When set, overrides server environment defaults.
                </p>
              </div>

              {/* Max Graph Traversal Hop Depth */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-ink-ash font-medium">
                    Knowledge Graph Hop Depth: {maxHopDepth} Hops
                  </label>
                  <span className="text-[11px] font-mono text-ink-ash">
                    {maxHopDepth === 1 ? "Direct Relationships Only" : maxHopDepth === 2 ? "Recommended (2 Hops)" : "Deep Epistemic Traversal (3 Hops)"}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={1}
                  value={maxHopDepth}
                  onChange={(e) => setMaxHopDepth(Number(e.target.value))}
                  className="w-full accent-wine-accent cursor-pointer"
                />
              </div>

              <div className="pt-4 border-t border-border-quiet flex justify-end">
                <Button
                  onClick={handleSaveAISettings}
                  className="gap-2 bg-wine-accent text-ink-parchment hover:bg-wine-crimson text-xs font-mono"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Global AI Engine Configuration
                </Button>
              </div>
            </Surface>
          </div>
        )}

        {/* TAB 3: Author Profile */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-serif font-medium text-ink-parchment">
                Author Identity &amp; Studio Profile
              </h2>
              <p className="text-xs text-ink-ash leading-relaxed">
                Your authenticated author credential and metadata.
              </p>
            </div>

            <Surface depth={2} border="subtle" className="p-6 sm:p-8 rounded-2xl space-y-6 max-w-2xl">
              <div className="flex items-center gap-4 border-b border-border-quiet pb-6">
                <div className="w-14 h-14 rounded-2xl bg-wine-accent/20 border border-wine-accent/40 flex items-center justify-center text-ink-parchment font-serif text-xl font-bold">
                  {user?.display_name ? user.display_name[0].toUpperCase() : "A"}
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-lg font-serif font-medium text-ink-parchment">
                    {user?.display_name || "Author"}
                  </h3>
                  <p className="text-xs font-mono text-ink-ash">{user?.email}</p>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-pine-forest pt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-pine-forest" />
                    Verified Studio Session
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-ink-ash mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.display_name || ""}
                    className="w-full bg-surface-subtle border border-border-quiet rounded-xl px-3.5 py-2 text-xs text-ink-ash cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-ink-ash mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="w-full bg-surface-subtle border border-border-quiet rounded-xl px-3.5 py-2 text-xs text-ink-ash cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-ink-ash mb-1.5">
                    Author ID
                  </label>
                  <p className="text-xs font-mono text-ink-faint bg-surface-subtle p-2.5 rounded-xl border border-border-quiet truncate">
                    {user?.id || "Anonymous"}
                  </p>
                </div>
              </div>
            </Surface>
          </div>
        )}

        {/* TAB 4: Active Device Sessions */}
        {activeTab === "sessions" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-serif font-medium text-ink-parchment">
                  Active Device Sessions &amp; Security
                </h2>
                <p className="text-xs text-ink-ash leading-relaxed">
                  Devices and browser instances with active authorization tokens to your studio.
                </p>
              </div>

              {sessions.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await revokeAllOtherSessions();
                    toast.success("All other sessions revoked.");
                  }}
                  className="text-xs font-mono text-wine-crimson hover:bg-wine-crimson/10 border-wine-crimson/30 shrink-0"
                >
                  <Lock className="w-3.5 h-3.5 mr-1.5" />
                  Revoke All Other Sessions
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {sessions.map((sess) => (
                <Surface
                  key={sess.id}
                  depth={2}
                  border={sess.is_current ? "prominent" : "subtle"}
                  className="p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-surface-subtle border border-border-quiet flex items-center justify-center text-ink-ash">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-ink-parchment font-mono">
                          {sess.user_agent || "Web Browser"}
                        </span>
                        {sess.is_current && (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-pine-forest/20 text-pine-forest border border-pine-forest/30">
                            Current Device
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-ink-ash mt-0.5">
                        IP: {sess.ip_address || "Localhost"} • Signed in:{" "}
                        {new Date(sess.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {!sess.is_current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await revokeSession(sess.id);
                        toast.success("Session revoked.");
                      }}
                      className="text-xs font-mono text-wine-crimson hover:bg-wine-crimson/10 self-end sm:self-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Revoke
                    </Button>
                  )}
                </Surface>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: Studio Default Presets */}
        {activeTab === "presets" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-serif font-medium text-ink-parchment">
                Default Studio Presets for New Novels
              </h2>
              <p className="text-xs text-ink-ash leading-relaxed">
                Configure standard conventions applied automatically whenever you create a new manuscript project.
              </p>
            </div>

            <Surface depth={2} border="subtle" className="p-6 sm:p-8 rounded-2xl space-y-6 max-w-3xl">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-ink-ash mb-2 font-medium">
                  Default Novel Architecture Preset
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setDefaultNovellaMode(false)}
                    className={cn(
                      "p-4 rounded-xl border cursor-pointer transition-all",
                      !defaultNovellaMode
                        ? "bg-surface-elevated border-wine-accent/50 ring-1 ring-wine-accent/30"
                        : "bg-surface-subtle border-border-subtle hover:border-border-prominent"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-sm font-medium text-ink-parchment">
                        Epic Saga Mode
                      </span>
                      {!defaultNovellaMode && <Check className="w-4 h-4 text-wine-accent" />}
                    </div>
                    <p className="text-xs text-ink-ash mt-1 leading-relaxed">
                      All 9 studio modules enabled by default (Epistemic Matrix, Custody Graph, Plot Threads, Timeline, Fact Approvals).
                    </p>
                  </div>

                  <div
                    onClick={() => setDefaultNovellaMode(true)}
                    className={cn(
                      "p-4 rounded-xl border cursor-pointer transition-all",
                      defaultNovellaMode
                        ? "bg-surface-elevated border-wine-accent/50 ring-1 ring-wine-accent/30"
                        : "bg-surface-subtle border-border-subtle hover:border-border-prominent"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-sm font-medium text-ink-parchment">
                        Novella Mode
                      </span>
                      {defaultNovellaMode && <Check className="w-4 h-4 text-wine-accent" />}
                    </div>
                    <p className="text-xs text-ink-ash mt-1 leading-relaxed">
                      Streamlined workspace for character dramas: hides complex custody graphs and plot kanbans for minimal distraction.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-ink-ash mb-1.5 font-medium">
                  Default Chapter Naming Convention
                </label>
                <input
                  type="text"
                  value={defaultNomenclature}
                  onChange={(e) => setDefaultNomenclature(e.target.value)}
                  className="w-full bg-surface-subtle border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs font-mono text-ink-parchment outline-none focus:border-wine-accent transition-colors"
                />
                <p className="text-[11px] text-ink-faint mt-1">
                  e.g., &quot;Chapter #&quot;, &quot;Folio #&quot;, &quot;Act I, Scene #&quot;
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-ink-ash mb-1.5 font-medium">
                  Default Consistency Strictness Tolerance
                </label>
                <select
                  value={defaultStrictness}
                  onChange={(e) => setDefaultStrictness(e.target.value as any)}
                  className="w-full bg-surface-subtle border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-ink-parchment outline-none focus:border-wine-accent cursor-pointer transition-colors"
                >
                  <option value="balanced">Balanced (Flags major plot holes &amp; obvious contradictions)</option>
                  <option value="strict">Strict Canon (Audits hair ribbons, minor physical gestures, 95% threshold)</option>
                  <option value="relaxed">Relaxed / Drafting (Suppresses minor alerts during initial drafting sprints)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-border-quiet flex justify-end">
                <Button
                  onClick={handleSavePresets}
                  className="gap-2 bg-wine-accent text-ink-parchment hover:bg-wine-crimson text-xs font-mono"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Default Presets
                </Button>
              </div>
            </Surface>
          </div>
        )}
      </main>
    </div>
  );
}
