"use client";

import React, { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  useCharacters,
  useRelationships,
  useStoryGraph,
  useIssues,
} from "@/hooks/useStoryData";
import { cn } from "@/lib/utils";
import {
  Users,
  ShieldAlert,
  ArrowLeft,
  Search,
  Sparkles,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Info,
  X,
  Compass,
} from "lucide-react";
import type { Character, Relationship, Issue } from "@/lib/types";

interface CharactersPageProps {
  params: Promise<{ id: string }>;
}

/** Helper to clean up any "char:" prefix from graph edge IDs */
function cleanId(id: string | null | undefined): string {
  if (!id) return "";
  return id.replace(/^char:/i, "");
}

/** Determine if a relationship sentiment/type leans positive/allied or hostile/adversarial */
function classifyRelation(rel: Relationship): "ally" | "rival" | "neutral" {
  const sentiment = (rel.sentiment || "").toLowerCase();
  const type = (rel.type || "").toLowerCase();

  const isRival =
    sentiment.includes("hostil") ||
    sentiment.includes("neg") ||
    sentiment.includes("tens") ||
    sentiment.includes("conflict") ||
    sentiment.includes("wary") ||
    sentiment.includes("accus") ||
    sentiment.includes("guilt") ||
    type.includes("adversar") ||
    type.includes("hostil") ||
    type.includes("antagon") ||
    type.includes("rival") ||
    type.includes("betray") ||
    type.includes("interrog") ||
    type.includes("combat") ||
    type.includes("mutiny");

  if (isRival) return "rival";

  const isAlly =
    sentiment.includes("pos") ||
    sentiment.includes("allied") ||
    sentiment.includes("respect") ||
    sentiment.includes("devot") ||
    sentiment.includes("protect") ||
    sentiment.includes("trust") ||
    sentiment.includes("support") ||
    type.includes("mentor") ||
    type.includes("student") ||
    type.includes("family") ||
    type.includes("familial") ||
    type.includes("alliance") ||
    type.includes("collaborat") ||
    type.includes("consult") ||
    type.includes("companion");

  if (isAlly) return "ally";
  return "neutral";
}

export default function CharactersPage({ params }: CharactersPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { data: characters = [], isLoading: charsLoading } = useCharacters(projectId);
  const { data: relationships = [] } = useRelationships(projectId);
  const { data: graph } = useStoryGraph(projectId);
  const { data: allIssues = [] } = useIssues(projectId);

  // Pivot navigation: which character is currently the tree's focal root
  const [focalId, setFocalId] = useState<string | null>(null);
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [dossierId, setDossierId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRelDetail, setActiveRelDetail] = useState<Relationship | null>(null);

  // Character lookup map
  const charMap = useMemo(() => {
    const map = new Map<string, Character>();
    for (const c of characters) {
      map.set(c.id, c);
      map.set(cleanId(c.id), c);
    }
    return map;
  }, [characters]);

  // Combined list of relationships (SQL relationships + graph fallback)
  const allRelations = useMemo(() => {
    const list: Relationship[] = [...relationships];
    const seen = new Set(list.map((r) => `${cleanId(r.character_a_id)}:${cleanId(r.character_b_id)}:${r.type}`));

    // Augment with any graph edges not already captured
    for (const edge of graph?.edges || []) {
      const src = cleanId(edge.source);
      const dst = cleanId(edge.target);
      const key = `${src}:${dst}:${edge.relation}`;
      if (!seen.has(key) && charMap.has(src) && charMap.has(dst)) {
        list.push({
          id: edge.id,
          character_a_id: src,
          character_b_id: dst,
          type: edge.relation,
          sentiment: edge.sentiment || "neutral",
          description: edge.description || null,
          chapter: edge.since_chapter ?? null,
          until_chapter: edge.until_chapter ?? null,
        });
        seen.add(key);
      }
    }
    return list;
  }, [relationships, graph?.edges, charMap]);

  // Compute connection count per character to identify the natural protagonist
  const connectionCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const rel of allRelations) {
      const a = cleanId(rel.character_a_id);
      const b = cleanId(rel.character_b_id);
      map.set(a, (map.get(a) || 0) + 1);
      map.set(b, (map.get(b) || 0) + 1);
    }
    return map;
  }, [allRelations]);

  // Determine effective focal character
  const activeFocalId = useMemo(() => {
    if (focalId && charMap.has(focalId)) return focalId;
    if (characters.length === 0) return null;
    // Default to character with most connections (e.g. Corin Vance)
    const sorted = [...characters].sort((a, b) => {
      const countA = connectionCounts.get(a.id) || 0;
      const countB = connectionCounts.get(b.id) || 0;
      return countB - countA;
    });
    return sorted[0]?.id || null;
  }, [focalId, characters, charMap, connectionCounts]);

  const focalCharacter = activeFocalId ? charMap.get(activeFocalId) : null;

  // Pivot handler (stepping into a character as the new root)
  const pivotTo = (newId: string) => {
    if (newId === activeFocalId) return;
    if (activeFocalId) {
      setNavHistory((prev) => [...prev, activeFocalId]);
    }
    setFocalId(newId);
    setActiveRelDetail(null);
  };

  // Backtrack handler
  const backtrack = () => {
    if (navHistory.length === 0) return;
    const prev = navHistory[navHistory.length - 1];
    setNavHistory((h) => h.slice(0, -1));
    setFocalId(prev);
    setActiveRelDetail(null);
  };

  // Find all direct ties for the focal character
  const directTies = useMemo(() => {
    if (!activeFocalId) return { allies: [], rivals: [], neutrals: [] };

    const allyMap = new Map<string, { character: Character; rel: Relationship }>();
    const rivalMap = new Map<string, { character: Character; rel: Relationship }>();
    const neutralMap = new Map<string, { character: Character; rel: Relationship }>();

    for (const rel of allRelations) {
      const a = cleanId(rel.character_a_id);
      const b = cleanId(rel.character_b_id);
      if (a !== activeFocalId && b !== activeFocalId) continue;
      const otherId: string = a === activeFocalId ? b : a;
      if (otherId === activeFocalId) continue; // ignore self-loops
      const other = charMap.get(otherId);
      if (!other) continue;

      const classification = classifyRelation(rel);
      if (classification === "ally") {
        if (!allyMap.has(otherId)) allyMap.set(otherId, { character: other, rel });
      } else if (classification === "rival") {
        if (!rivalMap.has(otherId)) rivalMap.set(otherId, { character: other, rel });
      } else {
        if (!neutralMap.has(otherId)) neutralMap.set(otherId, { character: other, rel });
      }
    }

    return {
      allies: Array.from(allyMap.values()),
      rivals: Array.from(rivalMap.values()),
      neutrals: Array.from(neutralMap.values()),
    };
  }, [activeFocalId, allRelations, charMap]);

  // Secondary sub-branch connections (Level 2: connections of allies & rivals)
  const secondaryTies = useMemo(() => {
    const map = new Map<string, Array<{ character: Character; rel: Relationship }>>();
    if (!activeFocalId) return map;

    const firstDegreeIds = new Set([
      activeFocalId,
      ...directTies.allies.map((t) => t.character.id),
      ...directTies.rivals.map((t) => t.character.id),
      ...directTies.neutrals.map((t) => t.character.id),
    ]);

    for (const primary of [...directTies.allies, ...directTies.rivals]) {
      const pId = primary.character.id;
      const secondaries: Array<{ character: Character; rel: Relationship }> = [];

      for (const rel of allRelations) {
        const a = cleanId(rel.character_a_id);
        const b = cleanId(rel.character_b_id);
        if (a !== pId && b !== pId) continue;
        const otherId: string = a === pId ? b : a;
        if (otherId === activeFocalId || otherId === pId) continue;
        const other = charMap.get(otherId);
        if (other && !secondaries.some((s) => s.character.id === other.id)) {
          secondaries.push({ character: other, rel });
        }
      }
      if (secondaries.length > 0) {
        map.set(pId, secondaries.slice(0, 2)); // keep tree legible (at most 2 secondary branches)
      }
    }
    return map;
  }, [activeFocalId, directTies, allRelations, charMap]);

  // Active dossier character
  const inspectedCharacter = dossierId ? charMap.get(dossierId) : null;

  // Issues / contradictions touching the inspected character
  const characterIssues = useMemo(() => {
    if (!inspectedCharacter) return [];
    const name = inspectedCharacter.name.toLowerCase();
    const aliases = (inspectedCharacter.aliases || []).map((a) => a.toLowerCase());
    return allIssues.filter((issue) => {
      const desc = (issue.description || "").toLowerCase();
      const entities = (issue.related_entities || []).map((e) => e.toLowerCase());
      return (
        entities.includes(name) ||
        desc.includes(name) ||
        aliases.some((alias) => desc.includes(alias) || entities.includes(alias))
      );
    });
  }, [inspectedCharacter, allIssues]);

  // Filtered characters list for the top fast-switcher
  const filteredCharacters = useMemo(() => {
    if (!searchQuery.trim()) return characters;
    const q = searchQuery.toLowerCase();
    return characters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.aliases?.some((a) => a.toLowerCase().includes(q)) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [characters, searchQuery]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-surface-void text-ink-parchment select-none">
      {/* ===================================================================
          FLUID TOP BAR: Quick Switcher & Breadcrumb Lineage
          =================================================================== */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-wine-crimson font-medium">
                Relational Cast Tree
              </span>
              {navHistory.length > 0 && (
                <button
                  type="button"
                  onClick={backtrack}
                  className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-ash hover:bg-white/[0.08] hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-2.5 w-2.5" />
                  <span>Back</span>
                </button>
              )}
            </div>
            <h1 className="mt-1 font-serif text-2xl font-normal text-white">
              {focalCharacter?.name || "Character Graph"}
            </h1>
            <p className="mt-0.5 text-xs text-ink-ash">
              Trace character allegiances, bonds, and rivalries branching from the focal character. Click any node to pivot.
            </p>
          </div>

          {/* Quick Search */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-1.5 text-xs text-ink-ash">
              <Search className="h-3.5 w-3.5 text-ink-faint" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find character or trait..."
                className="w-44 bg-transparent text-xs text-ink-parchment placeholder:text-ink-faint focus:outline-none"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} className="text-ink-faint hover:text-white">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <Link
              href={`/projects/${projectId}/knowledge`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.03] px-3 py-1.5 text-xs font-mono uppercase tracking-[0.12em] text-ink-ash hover:bg-white/[0.07] hover:text-white transition-colors"
            >
              <Compass className="h-3.5 w-3.5 text-ink-faint" />
              <span>Who Knows What →</span>
            </Link>
          </div>
        </div>

        {/* Quick Fast-Switcher Pills (Horizontal Row) */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {filteredCharacters.map((c) => {
            const isActive = c.id === activeFocalId;
            const count = connectionCounts.get(c.id) || 0;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => pivotTo(c.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs transition-colors shrink-0",
                  isActive
                    ? "bg-[#232228] text-white font-medium shadow-sm"
                    : "bg-white/[0.02] text-ink-ash hover:bg-white/[0.05] hover:text-white"
                )}
              >
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full font-serif text-[9px] font-bold",
                    isActive ? "bg-wine-crimson text-white" : "bg-white/[0.06] text-ink-faint"
                  )}
                >
                  {c.name[0]}
                </div>
                <span>{c.name}</span>
                <span className="font-mono text-[9px] text-ink-faint/60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================
          DUAL RELATIONAL TREE CANVAS (Center Root, Left Allies, Right Rivals)
          =================================================================== */}
      <div className="relative flex-1 min-h-[580px] px-6 py-6 flex items-center justify-center">
        {charsLoading ? (
          <div className="flex items-center gap-2 font-mono text-xs text-ink-faint animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-wine-crimson" />
            <span>Building relational tree…</span>
          </div>
        ) : !focalCharacter ? (
          <div className="text-center py-16">
            <p className="font-serif text-lg text-ink-ash">No characters identified in manuscript yet.</p>
          </div>
        ) : (
          <div className="relative w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_280px_1fr] gap-6 lg:gap-12 items-center">
            {/* ---------------------------------------------------------------
                LEFT WING: ALLIANCES & BONDS
                --------------------------------------------------------------- */}
            <div className="flex flex-col items-end space-y-4">
              <div className="flex items-center gap-1.5 pb-2 text-[10px] font-mono uppercase tracking-[0.16em] text-emerald-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                <span>Alliances & Mentors ({directTies.allies.length})</span>
              </div>

              {directTies.allies.length === 0 ? (
                <div className="p-4 text-right font-serif text-xs italic text-ink-faint/60">
                  No recorded alliances or mentors for {focalCharacter.name} yet.
                </div>
              ) : (
                directTies.allies.map(({ character, rel }) => {
                  const secondaries = secondaryTies.get(character.id) || [];
                  const isSelected = dossierId === character.id;

                  return (
                    <div key={character.id} className="group relative flex flex-col items-end w-full max-w-sm">
                      {/* Relationship Connector Label */}
                      <div className="mb-1 flex items-center gap-2 text-right">
                        <button
                          type="button"
                          onClick={() => setActiveRelDetail(rel)}
                          className="font-mono text-[9px] uppercase tracking-[0.14em] text-emerald-400/90 hover:text-emerald-300 hover:underline transition-colors"
                        >
                          ✦ {rel.type.replace(/[-_]/g, " ")}
                        </button>
                        {rel.chapter && (
                          <span className="font-mono text-[8.5px] text-ink-faint/50">Ch.{rel.chapter}</span>
                        )}
                      </div>

                      {/* Character Token Card */}
                      <div
                        className={cn(
                          "relative flex items-center justify-between w-full p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-all cursor-pointer shadow-sm group-hover:shadow-md",
                          isSelected && "ring-1 ring-emerald-500/50 bg-white/[0.06]"
                        )}
                        onClick={() => pivotTo(character.id)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 font-serif text-xs font-bold shrink-0">
                            {character.name[0]}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-serif text-sm font-medium text-white truncate group-hover:text-emerald-200 transition-colors">
                              {character.name}
                            </h4>
                            <p className="font-mono text-[9.5px] text-ink-faint truncate">
                              {character.description || `First seen in Chapter ${character.first_chapter || 1}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDossierId(character.id);
                            }}
                            className="p-1 rounded-md text-ink-faint hover:bg-white/[0.08] hover:text-white transition-colors"
                            title="Inspect Character Dossier"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight className="h-3.5 w-3.5 text-ink-faint/40 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>

                      {/* Level 2 Sub-Branches (e.g. from Vespera to Julian) */}
                      {secondaries.length > 0 && (
                        <div className="mt-1.5 pl-6 space-y-1 w-[90%]">
                          {secondaries.map((sec) => (
                            <div
                              key={sec.character.id}
                              onClick={() => pivotTo(sec.character.id)}
                              className="flex items-center justify-between p-2 rounded-lg bg-white/[0.015] hover:bg-white/[0.04] text-[11px] text-ink-ash hover:text-white cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-[10px] text-ink-faint">↳</span>
                                <span className="font-serif truncate">{sec.character.name}</span>
                              </div>
                              <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-faint/60 shrink-0">
                                {sec.rel.type.split("-")[0]}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* ---------------------------------------------------------------
                CENTER COLUMN: THE FOCAL CHARACTER (ROOT)
                --------------------------------------------------------------- */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="relative group flex flex-col items-center p-6 rounded-2xl bg-surface-elevated/70 shadow-2xl backdrop-blur-sm w-full max-w-[280px]">
                {/* Avatar with subtle radiant glow */}
                <div className="relative mb-3">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-wine-accent/40 via-surface-card to-surface-void flex items-center justify-center font-serif text-2xl font-bold text-white shadow-[0_0_24px_rgba(168,45,84,0.35)]">
                    {focalCharacter.name[0]}
                  </div>
                  <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-surface-void" />
                </div>

                {/* Name & Title */}
                <h2 className="font-serif text-xl font-medium text-white">
                  {focalCharacter.name}
                </h2>

                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-wine-accent font-medium">
                  {focalCharacter.first_chapter ? `Debut Ch. ${focalCharacter.first_chapter}` : "Active Canon"}
                  {focalCharacter.last_chapter ? ` · Ch. ${focalCharacter.last_chapter}` : ""}
                </p>

                {focalCharacter.description && (
                  <p className="mt-2 text-xs leading-relaxed text-ink-ash line-clamp-3 font-serif italic">
                    "{focalCharacter.description}"
                  </p>
                )}

                {/* Relational Balance Meter */}
                <div className="mt-4 flex items-center gap-3 w-full justify-center pt-3 border-t border-white/[0.04] text-[11px] font-mono">
                  <span className="text-emerald-400">
                    {directTies.allies.length} Allies
                  </span>
                  <span className="text-ink-faint/40">·</span>
                  <span className="text-wine-crimson">
                    {directTies.rivals.length} Rivals
                  </span>
                </div>

                {/* Inspect Dossier Action */}
                <button
                  type="button"
                  onClick={() => setDossierId(focalCharacter.id)}
                  className="mt-4 flex items-center gap-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] px-3 py-1.5 text-xs text-white transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5 text-wine-accent" />
                  <span>Inspect Full Dossier</span>
                </button>
              </div>
            </div>

            {/* ---------------------------------------------------------------
                RIGHT WING: RIVALS & ADVERSARIES
                --------------------------------------------------------------- */}
            <div className="flex flex-col items-start space-y-4">
              <div className="flex items-center gap-1.5 pb-2 text-[10px] font-mono uppercase tracking-[0.16em] text-wine-crimson font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-wine-crimson shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
                <span>Rivals & Antagonists ({directTies.rivals.length})</span>
              </div>

              {directTies.rivals.length === 0 ? (
                <div className="p-4 text-left font-serif text-xs italic text-ink-faint/60">
                  No recorded rivalries or active adversaries for {focalCharacter.name} yet.
                </div>
              ) : (
                directTies.rivals.map(({ character, rel }) => {
                  const secondaries = secondaryTies.get(character.id) || [];
                  const isSelected = dossierId === character.id;

                  return (
                    <div key={character.id} className="group relative flex flex-col items-start w-full max-w-sm">
                      {/* Relationship Connector Label */}
                      <div className="mb-1 flex items-center gap-2 text-left">
                        <button
                          type="button"
                          onClick={() => setActiveRelDetail(rel)}
                          className="font-mono text-[9px] uppercase tracking-[0.14em] text-wine-crimson/90 hover:text-wine-crimson hover:underline transition-colors"
                        >
                          ⚔ {rel.type.replace(/[-_]/g, " ")}
                        </button>
                        {rel.chapter && (
                          <span className="font-mono text-[8.5px] text-ink-faint/50">Ch.{rel.chapter}</span>
                        )}
                      </div>

                      {/* Character Token Card */}
                      <div
                        className={cn(
                          "relative flex items-center justify-between w-full p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-all cursor-pointer shadow-sm group-hover:shadow-md",
                          isSelected && "ring-1 ring-wine-crimson/50 bg-white/[0.06]"
                        )}
                        onClick={() => pivotTo(character.id)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-950/40 border border-rose-500/20 text-rose-300 font-serif text-xs font-bold shrink-0">
                            {character.name[0]}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-serif text-sm font-medium text-white truncate group-hover:text-rose-200 transition-colors">
                              {character.name}
                            </h4>
                            <p className="font-mono text-[9.5px] text-ink-faint truncate">
                              {character.description || `First seen in Chapter ${character.first_chapter || 1}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDossierId(character.id);
                            }}
                            className="p-1 rounded-md text-ink-faint hover:bg-white/[0.08] hover:text-white transition-colors"
                            title="Inspect Character Dossier"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight className="h-3.5 w-3.5 text-ink-faint/40 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>

                      {/* Level 2 Sub-Branches */}
                      {secondaries.length > 0 && (
                        <div className="mt-1.5 pr-6 space-y-1 w-[90%]">
                          {secondaries.map((sec) => (
                            <div
                              key={sec.character.id}
                              onClick={() => pivotTo(sec.character.id)}
                              className="flex items-center justify-between p-2 rounded-lg bg-white/[0.015] hover:bg-white/[0.04] text-[11px] text-ink-ash hover:text-white cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-[10px] text-ink-faint">↳</span>
                                <span className="font-serif truncate">{sec.character.name}</span>
                              </div>
                              <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-faint/60 shrink-0">
                                {sec.rel.type.split("-")[0]}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================
          INTERACTIVE RELATIONSHIP EVIDENCE POPOVER
          =================================================================== */}
      {activeRelDetail && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg p-4 rounded-xl bg-surface-elevated/95 backdrop-blur-md shadow-2xl ring-1 ring-white/[0.08] text-xs">
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-wine-accent font-semibold">
                Relationship Canon
              </span>
              <span className="font-mono text-[9px] text-ink-faint">
                {activeRelDetail.type} ({activeRelDetail.sentiment})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveRelDetail(null)}
              className="text-ink-faint hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-2.5 font-serif text-sm leading-relaxed text-ink-parchment italic">
            "{activeRelDetail.description || "Relationship asserted in manuscript text."}"
          </p>
          {activeRelDetail.evidence_quote && (
            <p className="mt-2 font-mono text-[10px] text-ink-faint border-l-2 border-wine-accent/40 pl-2">
              "{activeRelDetail.evidence_quote}"
            </p>
          )}
        </div>
      )}

      {/* ===================================================================
          SIDE SHEET / DOSSIER DRAWER (Pure Antigravity Unboxed Desk View)
          =================================================================== */}
      {inspectedCharacter && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#131218] shadow-2xl p-6 flex flex-col overflow-y-auto select-text">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-wine-accent font-semibold">
              Character Dossier
            </span>
            <button
              type="button"
              onClick={() => setDossierId(null)}
              className="rounded-md p-1 text-ink-faint hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="py-5 space-y-6 flex-1">
            {/* Header info */}
            <div>
              <h3 className="font-serif text-2xl font-normal text-white">
                {inspectedCharacter.name}
              </h3>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                Status: <span className="text-emerald-400 capitalize">{inspectedCharacter.status || "Active"}</span>
                {inspectedCharacter.first_chapter && ` · First seen Ch. ${inspectedCharacter.first_chapter}`}
              </p>
            </div>

            {/* Description / Bio */}
            {inspectedCharacter.description && (
              <div>
                <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-ash font-medium mb-1.5">
                  Narrative Profile
                </h4>
                <p className="font-serif text-sm leading-relaxed text-ink-bone italic">
                  "{inspectedCharacter.description}"
                </p>
              </div>
            )}

            {/* Aliases */}
            {inspectedCharacter.aliases && inspectedCharacter.aliases.length > 0 && (
              <div>
                <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-ash font-medium mb-1.5">
                  Known Aliases & Monikers
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {inspectedCharacter.aliases.map((alias) => (
                    <span
                      key={alias}
                      className="rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-ink-bone"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Physical Traits */}
            {inspectedCharacter.physical_traits &&
              Object.keys(inspectedCharacter.physical_traits).length > 0 && (
                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-ash font-medium mb-1.5">
                    Physical Canon Traits
                  </h4>
                  <div className="space-y-1 text-xs">
                    {Object.entries(inspectedCharacter.physical_traits).map(([key, val]) => (
                      <div key={key} className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="font-mono text-ink-faint capitalize">{key}:</span>
                        <span className="text-white font-serif">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Active Continuity Conflicts Touching this Character */}
            {characterIssues.length > 0 && (
              <div className="rounded-xl bg-wine-crimson/10 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-wine-crimson font-medium text-xs font-mono uppercase tracking-[0.12em]">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>{characterIssues.length} Continuity Findings</span>
                </div>
                <div className="space-y-1.5">
                  {characterIssues.slice(0, 3).map((issue) => (
                    <Link
                      key={issue.id}
                      href={`/projects/${projectId}/editor?issue=${issue.id}`}
                      className="block p-2 rounded-lg bg-surface-void/50 hover:bg-surface-void text-xs transition-colors"
                    >
                      <p className="font-serif text-ink-parchment line-clamp-2">{issue.description}</p>
                      <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.1em] text-wine-crimson">
                        Open in Editor →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              pivotTo(inspectedCharacter.id);
              setDossierId(null);
            }}
            className="w-full py-2.5 rounded-lg bg-wine-accent hover:bg-wine-crimson text-white font-medium text-xs transition-colors"
          >
            Pivot Relational Tree to {inspectedCharacter.name}
          </button>
        </div>
      )}
    </div>
  );
}
