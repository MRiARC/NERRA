"use client";

import React, { use, useMemo, useState } from "react";
import Link from "next/link";
import { useCharacters, useStoryGraph } from "@/hooks/useStoryData";
import { PageHeader, SectionHeading } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";

interface CharactersPageProps {
  params: Promise<{ id: string }>;
}

const VIEW_W = 1000;
const VIEW_H = 660;

type Positioned = {
  id: string;
  name: string;
  x: number;
  y: number;
  index: number;
};

/**
 * The cast page is a constellation: people placed around the story, joined by
 * the relationships the manuscript actually asserts. Clicking a person opens
 * their dossier; their lines stay lit while the rest of the sky dims.
 */
export default function CharactersPage({ params }: CharactersPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { data: characters = [], isLoading } = useCharacters(projectId);
  const { data: graph } = useStoryGraph(projectId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const visibleCharacters = useMemo(() => {
    return characters.filter((character) => {
      if (statusFilter !== "all" && (character.status || "active") !== statusFilter) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        character.name.toLowerCase().includes(query) ||
        character.description?.toLowerCase().includes(query) ||
        character.aliases?.some((alias) => alias.toLowerCase().includes(query))
      );
    });
  }, [characters, statusFilter, searchQuery]);

  const positions = useMemo<Positioned[]>(() => {
    const count = visibleCharacters.length;
    if (count === 0) return [];
    const centerX = VIEW_W / 2;
    const centerY = VIEW_H / 2 - 10;
    const radiusX = count > 10 ? 350 : 300;
    const radiusY = count > 10 ? 235 : 205;

    return visibleCharacters.map((character, index) => {
      const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
      return {
        id: character.id,
        name: character.name,
        index,
        x: centerX + Math.cos(angle) * radiusX,
        y: centerY + Math.sin(angle) * radiusY,
      };
    });
  }, [visibleCharacters]);

  const positionById = useMemo(() => {
    const map = new Map<string, Positioned>();
    for (const position of positions) map.set(position.id, position);
    return map;
  }, [positions]);

  const edges = useMemo(() => {
    const raw = graph?.edges || [];
    return raw
      .map((edge) => {
        const src = edge.source.replace(/^char:/i, "");
        const dst = edge.target.replace(/^char:/i, "");
        if (!positionById.has(src) || !positionById.has(dst)) return null;
        return {
          ...edge,
          from: positionById.get(src)!,
          to: positionById.get(dst)!,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }, [graph?.edges, positionById]);

  const connectionsById = useMemo(() => {
    const map = new Map<string, number>();
    for (const edge of edges) {
      map.set(edge.from.id, (map.get(edge.from.id) || 0) + 1);
      map.set(edge.to.id, (map.get(edge.to.id) || 0) + 1);
    }
    return map;
  }, [edges]);

  const selectedCharacter =
    characters.find((c) => c.id === (selectedId ?? hoveredId)) || null;

  const selectedRelations = useMemo(() => {
    if (!selectedCharacter) return [];
    return edges
      .filter((edge) => edge.from.id === selectedCharacter.id || edge.to.id === selectedCharacter.id)
      .map((edge) => {
        const otherId = edge.from.id === selectedCharacter.id ? edge.to.id : edge.from.id;
        const other = characters.find((c) => c.id === otherId);
        return { id: edge.id, other, relation: edge.relation, chapter: edge.since_chapter };
      })
      .filter((entry) => entry.other);
  }, [edges, selectedCharacter, characters]);

  const totalConnections = edges.length;

  return (
    <div className="w-full max-w-6xl mx-auto px-6 sm:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Cast"
        title="The people in this story"
        line={
          characters.length === 0
            ? "No one has been read into the cast yet."
            : `${characters.length} ${
                characters.length === 1 ? "person" : "people"
              }, ${totalConnections} recorded ${
                totalConnections === 1 ? "connection" : "connections"
              }. Select anyone to bring their lines forward.`
        }
        actions={
          <Link
            href={`/projects/${projectId}/knowledge`}
            className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-ash transition-colors hover:text-ink-parchment"
          >
            Who knows what →
          </Link>
        }
      />

      {/* Quiet controls */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search a name or alias"
            className="w-56 border-0 border-b border-border-quiet bg-transparent pb-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-parchment placeholder:text-ink-faint focus:border-border-prominent focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
            className="cursor-pointer bg-transparent font-mono text-[10px] uppercase tracking-[0.14em] text-ink-ash focus:outline-none"
          >
            <option value="all" className="bg-surface-elevated">
              All
            </option>
            <option value="active" className="bg-surface-elevated">
              Alive
            </option>
            <option value="deceased" className="bg-surface-elevated">
              Dead
            </option>
            <option value="missing" className="bg-surface-elevated">
              Missing
            </option>
          </select>
        </div>

        <div className="flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
          <span className="flex items-center gap-1.5">
            <span className="h-px w-5 bg-pine-moss/60" /> warmth
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-px w-5 bg-wine-crimson/60" /> friction
          </span>
        </div>
      </div>

      {isLoading ? (
        <p className="py-24 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          Drawing the constellation…
        </p>
      ) : visibleCharacters.length === 0 ? (
        <div className="mt-10 border-t border-dashed border-border-subtle py-20 text-center">
          <p className="font-serif text-xl text-ink-parchment">An empty stage.</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Cast members appear as chapters are read
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Constellation */}
          <div className="relative">
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="h-auto w-full overflow-visible"
              role="group"
              aria-label="Character relationship map"
            >
              {edges.map((edge) => {
                const isLit =
                  !selectedCharacter ||
                  edge.from.id === selectedCharacter.id ||
                  edge.to.id === selectedCharacter.id;
                const warmth = (edge.sentiment || "").toLowerCase();
                const stroke =
                  warmth.includes("neg") || warmth.includes("hostil") || warmth.includes("conflict")
                    ? "var(--wine-crimson)"
                    : warmth.includes("pos") || warmth.includes("affection") || warmth.includes("trust")
                    ? "var(--pine-moss)"
                    : "var(--border-prominent)";

                return (
                  <line
                    key={edge.id}
                    x1={edge.from.x}
                    y1={edge.from.y}
                    x2={edge.to.x}
                    y2={edge.to.y}
                    stroke={stroke}
                    strokeWidth={isLit ? 1.1 : 0.6}
                    strokeOpacity={isLit ? 0.5 : 0.12}
                    className="transition-all duration-300"
                  />
                );
              })}

              {positions.map((position) => {
                const character = visibleCharacters[position.index];
                const isSelected = selectedCharacter?.id === character.id;
                const isDimmed = Boolean(selectedCharacter) && !isSelected;
                const isDeceased = character.status === "deceased";
                const labelBelow = position.index % 2 === 0;

                return (
                  <g
                    key={character.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${character.name}, ${connectionsById.get(character.id) || 0} connections`}
                    onClick={() => setSelectedId(character.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(character.id);
                      }
                    }}
                    onMouseEnter={() => setHoveredId(character.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onFocus={() => setHoveredId(character.id)}
                    onBlur={() => setHoveredId(null)}
                    className={cn(
                      "cursor-pointer transition-opacity duration-300 focus:outline-none",
                      isDimmed ? "opacity-35" : "opacity-100"
                    )}
                  >
                    <circle
                      cx={position.x}
                      cy={position.y}
                      r={isSelected ? 9 : 6}
                      fill={isSelected ? "var(--wine-crimson)" : "var(--surface-card)"}
                      stroke={isDeceased ? "var(--wine-crimson)" : "var(--border-prominent)"}
                      strokeWidth={isDeceased ? 1.6 : 1}
                      className="transition-all duration-300"
                    />
                    <text
                      x={position.x}
                      y={position.y + (labelBelow ? 24 : -14)}
                      textAnchor="middle"
                      className="fill-ink-parchment font-serif"
                      fontSize={isSelected ? 14 : 12.5}
                    >
                      {character.name}
                    </text>
                    <text
                      x={position.x}
                      y={position.y + (labelBelow ? 36 : -2)}
                      textAnchor="middle"
                      className="fill-ink-faint font-mono uppercase"
                      fontSize={8}
                      letterSpacing={1.2}
                    >
                      {connectionsById.get(character.id) || 0} links
                      {character.first_chapter ? ` · ch.${character.first_chapter}` : ""}
                    </text>
                  </g>
                );
              })}
            </svg>

            <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
              Hover to read · click to hold open
            </p>
          </div>

          {/* Dossier */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            {selectedCharacter ? (
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">
                  Dossier
                </p>
                <h2 className="mt-2 font-serif text-2xl font-medium text-ink-parchment">
                  {selectedCharacter.name}
                </h2>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-ash">
                  {(selectedCharacter.status || "active").replace(/_/g, " ")}
                  {selectedCharacter.first_chapter
                    ? ` · ch. ${String(selectedCharacter.first_chapter).padStart(2, "0")} → ${
                        selectedCharacter.last_chapter
                          ? String(selectedCharacter.last_chapter).padStart(2, "0")
                          : "—"
                      }`
                    : ""}
                </p>

                {selectedCharacter.aliases?.length > 0 && (
                  <p className="mt-3 font-serif text-[13px] italic text-ink-ash">
                    also called {selectedCharacter.aliases.join(", ")}
                  </p>
                )}

                <p className="mt-4 border-t border-border-quiet pt-4 text-[13px] leading-relaxed text-ink-bone">
                  {selectedCharacter.description || "No biography recorded yet."}
                </p>

                {Object.keys(selectedCharacter.physical_traits || {}).length > 0 && (
                  <dl className="mt-5 space-y-2">
                    {Object.entries(selectedCharacter.physical_traits).map(([trait, value]) => (
                      <div key={trait} className="flex items-baseline justify-between gap-3">
                        <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                          {trait}
                        </dt>
                        <dd className="text-right font-serif text-[13px] text-ink-bone">
                          {String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {selectedRelations.length > 0 && (
                  <>
                    <div className="mt-6">
                      <SectionHeading
                        label="Connections"
                        meta={<span>{selectedRelations.length}</span>}
                      />
                    </div>
                    <ul className="divide-y divide-border-quiet">
                      {selectedRelations.map((relation) => (
                        <li key={relation.id} className="py-2.5">
                          <p className="text-[13px] text-ink-bone">
                            <button
                              type="button"
                              onClick={() => setSelectedId(relation.other!.id)}
                              className="font-serif text-ink-parchment transition-colors hover:text-wine-crimson"
                            >
                              {relation.other!.name}
                            </button>
                            <span className="text-ink-ash"> · {relation.relation.replace(/_/g, " ")}</span>
                          </p>
                          {relation.chapter ? (
                            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                              since ch. {relation.chapter}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <Link
                  href={`/projects/${projectId}/reader?chapter=${selectedCharacter.first_chapter || 1}`}
                  className="mt-6 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-ash transition-colors hover:text-ink-parchment"
                >
                  <BookOpen className="h-3 w-3" />
                  First appearance
                </Link>
              </div>
            ) : (
              <p className="font-serif text-[15px] italic leading-relaxed text-ink-ash">
                Hover a person to read their dossier. Click to keep it open while you follow a line.
              </p>
            )}
          </aside>
        </div>
      )}

      {/* Index */}
      {visibleCharacters.length > 0 && (
        <section className="mt-14">
          <SectionHeading label="Index of names" meta={<span>{visibleCharacters.length}</span>} />
          <ul className="mt-1 divide-y divide-border-quiet">
            {visibleCharacters.map((character) => (
              <li key={character.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(character.id)}
                  className="flex w-full items-baseline justify-between gap-4 py-3 text-left"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-serif text-[15px] text-ink-bone">{character.name}</span>
                    {character.aliases?.length > 0 && (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                        {character.aliases.join(", ")}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                    {connectionsById.get(character.id) || 0} links
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
