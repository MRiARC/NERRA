"use client";

import React, { use, useState } from "react";
import { StoryGraphView } from "@/components/storyGraph/StoryGraphView";
import { useCharacters, useStoryGraph } from "@/hooks/useStoryData";
import { PageHeader, SectionHeading } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Network, Users, BookOpen } from "lucide-react";

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
 * Characters Page for Nera.
 * Defaults to the AntV G6 5.x dynamic force-directed Character Network Explorer
 * with chapter scrubber, live dossier inspectors, and anti-spoiler gates.
 * Also provides a toggle to the legacy static Cast constellation index.
 */
export default function CharactersPage({ params }: CharactersPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const [viewMode, setViewMode] = useState<"network" | "cast">("network");

  if (viewMode === "network") {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden bg-surface-void">
        <StoryGraphView
          projectId={projectId}
          initialLens="cast"
          viewMode={viewMode}
          onToggleViewMode={() => setViewMode("cast")}
        />
      </div>
    );
  }

  // Legacy Cast Index View
  return <LegacyCastView projectId={projectId} onSwitchToNetwork={() => setViewMode("network")} />;
}

function LegacyCastView({
  projectId,
  onSwitchToNetwork,
}: {
  projectId: string;
  onSwitchToNetwork: () => void;
}) {
  const { data: characters = [], isLoading } = useCharacters(projectId);
  const { data: graph } = useStoryGraph(projectId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const visibleCharacters = React.useMemo(() => {
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

  const positions = React.useMemo<Positioned[]>(() => {
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

  const positionById = React.useMemo(() => {
    const map = new Map<string, Positioned>();
    for (const position of positions) map.set(position.id, position);
    return map;
  }, [positions]);

  const edges = React.useMemo(() => {
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

  const connectionsById = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const edge of edges) {
      map.set(edge.from.id, (map.get(edge.from.id) || 0) + 1);
      map.set(edge.to.id, (map.get(edge.to.id) || 0) + 1);
    }
    return map;
  }, [edges]);

  const selectedCharacter =
    characters.find((c) => c.id === (selectedId ?? hoveredId)) || null;

  const totalConnections = edges.length;

  return (
    <div className="w-full max-w-6xl mx-auto px-6 sm:px-8 py-10 sm:py-14 text-ink-parchment">
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          eyebrow="Cast Index"
          title="The people in this story"
          line={
            characters.length === 0
              ? "No one has been read into the cast yet."
              : `${characters.length} people, ${totalConnections} recorded connections.`
          }
        />
        <div className="flex items-center gap-2 p-1 bg-surface-card rounded-lg border border-border-quiet text-xs font-mono">
          <button
            onClick={onSwitchToNetwork}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-ink-ash hover:text-ink-parchment transition-colors"
          >
            <Network className="w-3.5 h-3.5" />
            <span>Network Explorer</span>
          </button>
          <button
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-pine-moss/20 text-pine-moss font-semibold border border-pine-moss/40"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Cast Index</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="py-24 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          Loading cast constellation…
        </p>
      ) : (
        <section className="mt-8">
          <SectionHeading label="Index of names" meta={<span>{visibleCharacters.length}</span>} />
          <ul className="mt-2 divide-y divide-border-quiet">
            {visibleCharacters.map((character) => (
              <li key={character.id} className="py-3 flex items-baseline justify-between gap-4">
                <div>
                  <span className="font-serif text-base text-ink-parchment">{character.name}</span>
                  {character.aliases?.length > 0 && (
                    <span className="ml-2 font-mono text-xs text-ink-ash">
                      ({character.aliases.join(", ")})
                    </span>
                  )}
                  <p className="text-xs text-ink-ash mt-1">{character.description}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-pine-moss">
                  {connectionsById.get(character.id) || 0} links
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
