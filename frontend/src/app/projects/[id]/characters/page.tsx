"use client";

import React, { useState, use, useMemo } from "react";
import Link from "next/link";
import { useCharacters, useProject } from "@/hooks/useStoryData";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Users,
  Search,
  BookOpen,
  ArrowRight,
  UserCheck,
  Tag,
  Eye,
  Sliders,
  Filter,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import type { Character } from "@/lib/types";

interface CharactersPageProps {
  params: Promise<{ id: string }>;
}

export default function CharactersPage({ params }: CharactersPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { data: characters = [], isLoading } = useCharacters(projectId);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  // Filter characters
  const filteredCharacters = useMemo(() => {
    return characters.filter((c) => {
      if (statusFilter !== "all" && (c.status || "active") !== statusFilter) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.aliases?.some((a) => a.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [characters, statusFilter, searchQuery]);

  // Selected character dossier
  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId) || characters[0];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
      {/* Header & Mission Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border-subtle pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-ink-ash font-medium">
              Cast &amp; Personae Canon
            </span>
            <span className="text-border-subtle">•</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-pine-forest">
              <span className="w-1.5 h-1.5 rounded-full bg-pine-forest" />
              {characters.length} Active Personae Tracked
            </span>
          </div>
          <h1 className="text-3xl font-serif font-normal tracking-tight text-ink-parchment flex items-center gap-3">
            <Users className="w-7 h-7 text-wine-accent" />
            Character Bible
          </h1>
          <p className="text-sm text-ink-ash max-w-2xl leading-relaxed">
            Preserve physical trait invariants, aliases, and character arcs.
            Guarantee eye colors, birthmarks, and core motivations never contradict across folios.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/knowledge`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-card hover:bg-surface-elevated border border-border-subtle text-xs font-mono text-ink-parchment transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-wine-accent" />
            Epistemic Knowledge Matrix
          </Link>
        </div>
      </div>

      {/* Control Deck */}
      <Surface depth={1} border="quiet" className="p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-ash absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search cast by name, alias, trait..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-card border border-border-subtle rounded-lg pl-8 pr-3 py-1.5 text-xs text-ink-parchment placeholder:text-ink-faint outline-none focus:border-wine-accent w-64"
            />
          </div>

          <span className="text-border-subtle font-mono text-xs hidden sm:inline">|</span>

          <div className="flex items-center gap-2 text-xs font-mono text-ink-ash">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-card border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-ink-parchment outline-none focus:border-wine-accent cursor-pointer"
          >
            <option value="all">All Cast ({characters.length})</option>
            <option value="active">Active</option>
            <option value="deceased">Deceased</option>
            <option value="missing">Missing</option>
          </select>
        </div>

        <div className="text-xs font-mono text-ink-faint">
          Showing <span className="text-ink-parchment font-medium">{filteredCharacters.length}</span> of {characters.length} characters
        </div>
      </Surface>

      {/* Main Split: Cast List & Dossier Pane */}
      {isLoading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-wine-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-ink-ash">Loading character dossiers from knowledge graph...</p>
        </div>
      ) : filteredCharacters.length === 0 ? (
        <Surface depth={2} border="subtle" className="p-12 text-center rounded-2xl max-w-xl mx-auto space-y-4">
          <Users className="w-10 h-10 text-ink-ash mx-auto opacity-50" />
          <h3 className="font-serif text-lg text-ink-parchment">No Characters Found</h3>
          <p className="text-xs text-ink-ash leading-relaxed">
            No characters match your search filter. Characters are automatically discovered as chapters are ingested.
          </p>
        </Surface>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cast Cards Stream */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCharacters.map((char) => {
                const isSelected = selectedCharacter?.id === char.id;
                const traitCount = char.physical_traits
                  ? Object.keys(char.physical_traits).length
                  : 0;

                return (
                  <Surface
                    key={char.id}
                    depth={2}
                    border={isSelected ? "focus" : "subtle"}
                    className={cn(
                      "p-5 rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-4",
                      isSelected ? "ring-1 ring-border-focus" : "hover:border-border-prominent"
                    )}
                    onClick={() => setSelectedCharacterId(char.id)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-serif font-medium text-ink-parchment">
                            {char.name}
                          </h3>
                          {char.aliases && char.aliases.length > 0 && (
                            <p className="text-xs font-mono text-ink-ash mt-0.5">
                              aka {char.aliases.join(", ")}
                            </p>
                          )}
                        </div>

                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border",
                            char.status === "deceased"
                              ? "bg-wine-crimson/15 text-wine-crimson border-wine-crimson/30"
                              : "bg-surface-subtle text-ink-ash border-border-quiet"
                          )}
                        >
                          {char.status || "active"}
                        </span>
                      </div>

                      {char.description && (
                        <p className="text-xs font-sans text-ink-ash leading-relaxed line-clamp-3">
                          {char.description}
                        </p>
                      )}

                      {/* Physical Traits Preview Tags */}
                      {char.physical_traits && Object.keys(char.physical_traits).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Object.entries(char.physical_traits).slice(0, 3).map(([k, v]) => (
                            <span
                              key={k}
                              className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-subtle border border-border-quiet text-ink-bone"
                            >
                              {k}: <span className="text-ink-parchment">{String(v)}</span>
                            </span>
                          ))}
                          {traitCount > 3 && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 text-ink-faint">
                              +{traitCount - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border-quiet flex items-center justify-between text-xs font-mono text-ink-ash">
                      <span>
                        Ch. {char.first_chapter || 1} — {char.last_chapter || 1}
                      </span>
                      <span className="text-wine-accent flex items-center gap-1 group-hover:text-ink-parchment">
                        View Dossier <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Surface>
                );
              })}
            </div>
          </div>

          {/* Selected Character Detailed Dossier */}
          <div className="lg:col-span-1">
            {selectedCharacter ? (
              <Surface depth={2} border="subtle" className="p-6 rounded-xl space-y-6 sticky top-6">
                <div className="flex items-start justify-between border-b border-border-quiet pb-4">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-ash">
                      Canon Cast Dossier
                    </span>
                    <h2 className="text-2xl font-serif font-medium text-ink-parchment">
                      {selectedCharacter.name}
                    </h2>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-1 rounded bg-surface-subtle text-ink-parchment border border-border-quiet">
                    {selectedCharacter.status || "active"}
                  </span>
                </div>

                {/* Aliases */}
                {selectedCharacter.aliases && selectedCharacter.aliases.length > 0 && (
                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash mb-1.5">
                      Known Aliases &amp; Monikers
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCharacter.aliases.map((al, idx) => (
                        <span
                          key={idx}
                          className="font-mono text-xs px-2.5 py-1 rounded bg-surface-subtle border border-border-quiet text-ink-parchment"
                        >
                          {al}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash mb-1.5">
                    Character Biography &amp; Role
                  </p>
                  <p className="text-xs font-sans text-ink-bone leading-relaxed bg-surface-subtle p-3.5 rounded-lg border border-border-quiet">
                    {selectedCharacter.description || "No biographical profile recorded yet."}
                  </p>
                </div>

                {/* Physical Traits Invariant Grid */}
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-ink-ash mb-2">
                    Physical Trait Invariants
                  </p>
                  {selectedCharacter.physical_traits &&
                  Object.keys(selectedCharacter.physical_traits).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(selectedCharacter.physical_traits).map(([trait, val]) => (
                        <div
                          key={trait}
                          className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border-quiet text-xs font-mono"
                        >
                          <span className="text-ink-ash uppercase text-[10px]">{trait}</span>
                          <span className="text-ink-parchment font-medium">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-mono text-ink-ash bg-surface-subtle p-3 rounded-lg border border-border-quiet">
                      No physical trait assertions parsed yet.
                    </p>
                  )}
                </div>

                {/* Chapter Horizon */}
                <div className="flex items-center justify-between p-3 rounded bg-surface-subtle border border-border-quiet text-xs font-mono">
                  <span className="text-ink-ash">Manuscript Arc:</span>
                  <span className="text-ink-parchment font-medium">
                    First in Ch. {selectedCharacter.first_chapter || 1} • Last in Ch.{" "}
                    {selectedCharacter.last_chapter || 1}
                  </span>
                </div>

                {/* Deep Link to Reader */}
                <div className="pt-2">
                  <Link
                    href={`/projects/${projectId}/reader?chapter=${selectedCharacter.first_chapter || 1}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-surface-subtle hover:bg-surface-elevated border border-border-quiet text-xs font-mono text-ink-parchment transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-wine-accent" />
                    Read First Appearance in Ch. {selectedCharacter.first_chapter || 1}
                  </Link>
                </div>
              </Surface>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
