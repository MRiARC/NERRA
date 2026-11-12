"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, Eye, HelpCircle, SlidersHorizontal } from "lucide-react";
import { api, KnowledgeMatrix } from "@/lib/api";

interface Props {
  projectId: string;
}

export default function KnowledgeMatrixView({ projectId }: Props) {
  const [data, setData] = useState<KnowledgeMatrix | null>(null);
  const [chapterLimit, setChapterLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadMatrix(ch: number | null) {
    setLoading(true);
    try {
      const res = await api.getKnowledgeMatrix(projectId, ch);
      setData(res);
    } catch (err) {
      console.error("Failed to fetch knowledge matrix:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.getKnowledgeMatrix(projectId, null);
        if (active) setData(res);
      } catch (err) {
        console.error("Failed to fetch knowledge matrix:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, [projectId]);

  const cellLookup = useMemo(() => {
    const map = new Map<string, KnowledgeMatrix["cells"][number]>();
    for (const c of data?.cells || []) {
      map.set(`${c.character}::${c.fact}`, c);
    }
    return map;
  }, [data]);

  const maxChapter = Math.max(data?.max_chapter || 1, 1);
  const characters = data?.characters || [];
  const facts = data?.facts || [];

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-800/80 bg-slate-900/40 rounded-xl p-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-sky-400" />
            Epistemic Knowledge Matrix (&ldquo;Who Knows What, When?&rdquo;)
          </h3>
          <p className="text-xs text-slate-400">
            Track secrets, dramatic irony, and multi-hop knowledge propagation across every chapter.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs text-slate-300 font-medium whitespace-nowrap">
            {chapterLimit === null ? "Full Manuscript" : `As of Ch. ${chapterLimit}`}
          </span>
          <input
            type="range"
            min={1}
            max={maxChapter}
            value={chapterLimit ?? maxChapter}
            onChange={(e) => {
              const val = Number(e.target.value);
              setChapterLimit(val);
              loadMatrix(val);
            }}
            className="w-28 accent-sky-500 cursor-pointer"
          />
          {chapterLimit !== null && (
            <button
              onClick={() => {
                setChapterLimit(null);
                loadMatrix(null);
              }}
              className="text-[11px] text-sky-400 hover:text-sky-300 font-medium"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {loading && !data ? (
        <div className="text-center py-16 text-xs text-slate-500">Building epistemic matrix...</div>
      ) : facts.length === 0 || characters.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
          No character knowledge updates extracted yet.
        </div>
      ) : (
        <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-900/40">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-300">
                <th className="py-3 px-4 font-semibold sticky left-0 bg-slate-900 z-10 min-w-[160px]">
                  Character
                </th>
                {facts.map((f, idx) => (
                  <th key={idx} className="py-3 px-4 font-semibold min-w-[180px]">
                    {f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {characters.map((chName) => (
                <tr key={chName} className="hover:bg-slate-800/20">
                  <td className="py-3 px-4 font-semibold text-white sticky left-0 bg-[#0c1018] border-r border-slate-800/60">
                    {chName}
                  </td>
                  {facts.map((fact, fIdx) => {
                    const cell = cellLookup.get(`${chName}::${fact}`);
                    if (cell?.knows) {
                      return (
                        <td key={fIdx} className="py-2.5 px-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                            <Check className="w-3.5 h-3.5" />
                            <span className="font-mono text-[11px] font-semibold">
                              Ch. {cell.since_chapter}
                            </span>
                            {cell.how_learned && (
                              <span className="text-[10px] opacity-80">({cell.how_learned})</span>
                            )}
                          </div>
                        </td>
                      );
                    }
                    return (
                      <td key={fIdx} className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                          <HelpCircle className="w-3 h-3" />
                          Unknown
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
