"use client";

import React, { useState, use, useRef, useEffect } from "react";
import Link from "next/link";
import { useProject, useCustomization } from "@/hooks/useStoryData";
import { api } from "@/lib/api";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PromptDeck } from "@/components/ui/PromptDeck";
import {
  MessageSquare,
  Sparkles,
  BookOpen,
  ArrowRight,
  GitBranch,
  Compass,
  CornerDownLeft,
  Bot,
  User,
  Quote,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { cn, getErrorMessage } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import type { ChatCitation } from "@/lib/types";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

interface ChatMessage {
  id: string;
  sender: "user" | "nerra";
  content: string;
  timestamp: string;
  citations?: ChatCitation[];
  graphEntities?: string[];
  intent?: string;
}

const QUICK_PROMPTS = [
  "Where was the cedar box last seen in Chapter 2?",
  "Did Clara ever tell Julian about the London apothecary?",
  "Trace the custody chain of the rare Blue Dahlia cutting.",
  "Are there any timeline paradoxes between Chapter 3 and Chapter 4?",
];

export default function StoryChatPage({ params }: ChatPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { data: project } = useProject(projectId);
  const { data: customization } = useCustomization(projectId);

  const configuredModel = customization?.custom_ui_config?.primary_model;
  const activeModelName =
    typeof configuredModel === "string" && configuredModel
      ? configuredModel
      : "Claude 3.7 Sonnet";

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-welcome",
      sender: "nerra",
      content: `Welcome to the Story Intelligence Atelier for "${project?.title || "your manuscript"}". I have ingested your chapters into the vector index and Neo4j knowledge graph. Ask me anything about character movements, secret propagation, plot threads, or potential continuity plot holes.`,
      timestamp: "Just now",
    },
  ]);

  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const messageSeq = useRef(0);
  const nextMessageId = (prefix: string) => `${prefix}-${++messageSeq.current}`;

  // Auto-scroll on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const question = (textToSend || inputVal).trim();
    if (!question || isLoading) return;

    const userMsg: ChatMessage = {
      id: nextMessageId("user"),
      sender: "user",
      content: question,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsLoading(true);

    try {
      const res = await api.story.chat(projectId, question);

      const nerraMsg: ChatMessage = {
        id: nextMessageId("nerra"),
        sender: "nerra",
        content: res.answer,
        timestamp: "Just now",
        citations: res.citations || [],
        graphEntities: res.graph_entities || [],
        intent: res.intent,
      };

      setMessages((prev) => [...prev, nerraMsg]);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to receive response from story engine."));
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId("err"),
          sender: "nerra",
          content:
            "I encountered an error querying the story memory graph. Please ensure your backend is reachable and try again.",
          timestamp: "Just now",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col justify-between overflow-hidden relative">
      {/* Top Mission Header */}
      <div className="p-4 sm:p-6 border-b border-border-quiet bg-surface-subtle shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-card border border-border-quiet flex items-center justify-center text-wine-accent">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-serif font-medium text-ink-parchment">
                Story Canon Intelligence Copilot
              </h1>
              <p className="text-[11px] font-mono text-ink-ash">
                Grounding against {project?.title || "manuscript"} • Multi-Hop Vector &amp; Graph RAG
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-card border border-border-quiet text-severity-thread flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-severity-thread" />
              Graph Synced
            </span>
          </div>
        </div>
      </div>

      {/* Message Stream */}
      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3",
              msg.sender === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.sender === "nerra" && (
              <div className="w-7 h-7 rounded-lg bg-surface-card border border-border-subtle flex items-center justify-center text-wine-accent shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={cn(
                "max-w-2xl space-y-3",
                msg.sender === "user" ? "items-end" : "items-start"
              )}
            >
              <Surface
                depth={msg.sender === "user" ? 1 : 2}
                border={msg.sender === "user" ? "prominent" : "subtle"}
                className={cn(
                  "p-4 sm:p-5 rounded-2xl",
                  msg.sender === "user"
                    ? "bg-surface-elevated text-ink-parchment border-border-prominent"
                    : "bg-surface-card text-ink-parchment"
                )}
              >
                <div className="prose prose-invert prose-xs max-w-none text-xs sm:text-sm font-sans leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>

                {/* Graph Entities Pills */}
                {msg.graphEntities && msg.graphEntities.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border-quiet flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono text-ink-ash uppercase tracking-wider mr-1">
                      Referenced Entities:
                    </span>
                    {msg.graphEntities.map((ent, idx) => (
                      <span
                        key={idx}
                        className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-subtle border border-border-quiet text-ink-bone"
                      >
                        {ent}
                      </span>
                    ))}
                  </div>
                )}
              </Surface>

              {/* Citations Excerpts */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="space-y-2 pl-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ink-ash flex items-center gap-1">
                    <Quote className="w-3 h-3 text-wine-accent" /> Grounded Text Citations
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {msg.citations.map((cite, cIdx) => (
                      <div
                        key={cIdx}
                        className="p-3 rounded-lg bg-surface-subtle border border-border-quiet text-xs font-serif text-ink-bone space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-mono text-[10px] text-ink-ash">
                          <span>Chapter {cite.chapter}</span>
                          <Link
                            href={`/projects/${projectId}/reader?chapter=${cite.chapter}`}
                            className="text-wine-accent hover:text-ink-parchment flex items-center gap-1 transition-colors"
                          >
                            Read In Manuscript <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="italic text-ink-parchment">&ldquo;{cite.excerpt}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.sender === "user" && (
              <div className="w-7 h-7 rounded-lg bg-surface-elevated border border-border-quiet flex items-center justify-center text-ink-ash shrink-0 mt-1">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-surface-card border border-border-subtle flex items-center justify-center text-wine-accent shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <Surface depth={2} border="subtle" className="p-4 rounded-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-wine-accent animate-pulse" />
              <span className="text-xs font-mono text-ink-ash">
                Traversing knowledge graph and retrieving chapter chunks...
              </span>
            </Surface>
          </div>
        )}
      </div>

      {/* Bottom Typing Deck & Quick Prompts */}
      <div className="p-4 sm:p-6 bg-surface-void border-t border-border-quiet shrink-0">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Quick Prompts (if initial conversation) */}
          {messages.length <= 2 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] font-mono text-ink-ash uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-wine-accent" /> Suggested:
              </span>
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 rounded-full bg-surface-card hover:bg-surface-elevated border border-border-quiet text-[11px] font-mono text-ink-bone hover:text-ink-parchment shrink-0 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Hardware Prompt Deck */}
          <PromptDeck
            value={inputVal}
            onChange={setInputVal}
            onSubmit={(text) => handleSendMessage(text)}
            isLoading={isLoading}
            modelBadge={activeModelName}
            placeholder={`Ask about characters, timeline, or consistency in "${project?.title || "story"}"...`}
          />
        </div>
      </div>
    </div>
  );
}
