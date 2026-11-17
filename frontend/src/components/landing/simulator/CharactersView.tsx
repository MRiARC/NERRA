"use client";

import React, { useState } from "react";
import { MOCK_CHARACTERS, MockCharacter } from "./mockData";
import { PageHeader } from "@/components/ui/PageHeader";
import { Users, Network, ShieldCheck, Heart, Skull } from "lucide-react";
import { cn } from "@/lib/utils";

export function CharactersView() {
  const [selectedCharacter, setSelectedCharacter] = useState<MockCharacter>(MOCK_CHARACTERS[0]);
  const [mode, setMode] = useState<"roster" | "network">("roster");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Cast"
        title="Characters"
        line="The people in the story: when they appear, who they know, and what they carry."
        actions={
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-subtle border border-border-quiet">
            <button
              onClick={() => setMode("roster")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-mono transition-colors",
                mode === "roster"
                  ? "bg-surface-elevated text-ink-parchment font-medium border border-border-subtle"
                  : "text-ink-ash hover:text-ink-parchment"
              )}
            >
              Roster
            </button>
            <button
              onClick={() => setMode("network")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-mono transition-colors",
                mode === "network"
                  ? "bg-surface-elevated text-ink-parchment font-medium border border-border-subtle"
                  : "text-ink-ash hover:text-ink-parchment"
              )}
            >
              Network View
            </button>
          </div>
        }
      />

      {mode === "roster" ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Character Roster List */}
          <div className="md:col-span-5 space-y-2">
            {MOCK_CHARACTERS.map((char) => {
              const isSelected = selectedCharacter.id === char.id;
              return (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharacter(char)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-xl border transition-all",
                    isSelected
                      ? "bg-surface-elevated border-wine-accent shadow-sm"
                      : "bg-surface-subtle border-border-quiet hover:bg-surface-card"
                  )}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-serif font-medium text-sm text-ink-parchment">
                      {char.name}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-ink-faint">
                      Ch. {char.first_chapter}–{char.last_chapter}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-ink-ash block mt-0.5 truncate">
                    {char.role}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Character Dossier */}
          <div className="md:col-span-7 p-6 rounded-xl bg-surface-subtle border border-border-quiet space-y-5">
            <div className="pb-4 border-b border-border-quiet flex items-start justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                  Dossier
                </span>
                <h3 className="font-serif text-2xl font-medium text-ink-parchment mt-0.5">
                  {selectedCharacter.name}
                </h3>
                <span className="font-mono text-xs text-ink-ash mt-0.5 block">
                  {selectedCharacter.role}
                </span>
              </div>
              <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-surface-card border border-border-quiet text-ink-ash">
                Present Ch. {selectedCharacter.first_chapter} to {selectedCharacter.last_chapter}
              </span>
            </div>

            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint block mb-1">
                Background &amp; Profile
              </span>
              <p className="font-serif text-sm italic text-ink-bone leading-relaxed">
                {selectedCharacter.description}
              </p>
            </div>

            {/* Traits */}
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint block mb-2">
                Documented Traits
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedCharacter.traits.map((trait) => (
                  <span
                    key={trait}
                    className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-card border border-border-quiet text-ink-ash"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>

            {/* Alliances & Conflicts */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-quiet text-xs font-mono">
              <div>
                <span className="text-[10px] uppercase text-severity-thread flex items-center gap-1 mb-1">
                  <Heart className="w-3 h-3" /> Alliances
                </span>
                <div className="space-y-1 text-ink-parchment font-sans text-xs">
                  {selectedCharacter.allies.map((a) => (
                    <div key={a} className="p-1.5 rounded bg-surface-card border border-border-quiet">
                      {a}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase text-severity-contradiction flex items-center gap-1 mb-1">
                  <Skull className="w-3 h-3" /> Conflicts
                </span>
                <div className="space-y-1 text-ink-parchment font-sans text-xs">
                  {selectedCharacter.rivals.map((r) => (
                    <div key={r} className="p-1.5 rounded bg-surface-card border border-border-quiet">
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Constellation Network View */
        <div className="p-8 rounded-2xl bg-surface-subtle border border-border-quiet min-h-[360px] flex flex-col justify-between text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 py-8">
            {MOCK_CHARACTERS.map((char) => (
              <div
                key={char.id}
                className="p-4 rounded-xl bg-surface-card border border-border-subtle shadow-md hover:border-wine-accent transition-colors text-left"
              >
                <span className="font-serif font-medium text-ink-parchment block">
                  {char.name}
                </span>
                <span className="font-mono text-[10px] text-ink-ash block mt-0.5">
                  {char.role}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-ink-faint block mt-1">
                  {char.allies.length} ties · {char.rivals.length} rivalries
                </span>
              </div>
            ))}
          </div>
          <span className="font-mono text-[10px] text-ink-faint">
            ✦ Force-directed character dynamics mapped across all 4 chapters
          </span>
        </div>
      )}
    </div>
  );
}
