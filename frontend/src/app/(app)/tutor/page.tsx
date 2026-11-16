"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Bot, User, SlidersHorizontal, ChevronDown, ChevronUp,
  Database, Activity, ShieldAlert, Loader2, CheckCircle2, RefreshCw,
  MessageSquare, PlusCircle, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import clsx from "clsx";
import { useApi } from "@/lib/useApi";
import type { AskMetadata } from "@/lib/types";
import { masteryColor, formatTopic } from "@/lib/format";
import ChatMarkdown from "@/components/ChatMarkdown";
import { ProblemChip } from "@/components/ProblemCard";
import { getProblems } from "@/lib/problems";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: AskMetadata | null;
  stats?: AskResponseStats;
  stages?: string[];
};

type AskResponseStats = {
  complexity: string;
  pathfinder: { escalated: boolean; confidence: number; below_threshold?: boolean };
  mastery_used?: number;
};

export default function TutorPage() {
  const api = useApi();
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [liveStages, setLiveStages] = useState<string[]>([]);
  const [mastery, setMastery] = useState(0.5);
  const [overrideMastery, setOverrideMastery] = useState(false);

  // Session management
  const [sessions, setSessions] = useState<Array<{ id: string; title: string; msg_count: number }>>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("default");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setHistoryLoaded(false);
    api
      .getChatHistory(sessionId)
      .then((res) => {
        setMessages(
          res.messages.map((m, i) => ({
            id: `history_${sessionId}_${i}`,
            role: m.role,
            content: m.content,
            metadata: m.metadata,
          }))
        );
      })
      .catch(() => setMessages([]))
      .finally(() => setHistoryLoaded(true));
  };

  const refreshSessions = () => {
    api.getChatSessions().then((res) => setSessions(res.sessions)).catch(() => {});
  };

  const createNewSession = () => {
    const newId = `session_${Date.now()}`;
    setActiveSessionId(newId);
    setMessages([]);
    setHistoryLoaded(true);
    refreshSessions();
  };

  useEffect(() => {
    loadSession("default");
    refreshSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveStages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setLiveStages([]);

    const stagesSoFar: string[] = [];

    try {
      // Pass explicitly only if overridden, otherwise undefined for auto-detect
      const data = await api.askStream(userMessage.content, overrideMastery ? mastery : undefined, undefined, (message) => {
        stagesSoFar.push(message);
        setLiveStages([...stagesSoFar]);
      }, activeSessionId);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer,
          metadata: data.metadata,
          stats: { 
            complexity: data.retrieval_stats.complexity, 
            pathfinder: data.retrieval_stats.pathfinder,
            mastery_used: data.retrieval_stats.mastery_used,
          },
          stages: stagesSoFar,
        },
      ]);
      refreshSessions(); // Update sidebar with the new session/message
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Something went wrong: ${message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setLiveStages([]);
    }
  };

  const mc = masteryColor(mastery);

  return (
    <div className="flex flex-row flex-1 overflow-hidden h-full">
      {/* Chat Sessions Sidebar */}
      <aside className={clsx(
        "flex flex-col shrink-0 border-r border-white/[0.06] bg-[#0d0d12] transition-all duration-200 overflow-hidden",
        sidebarOpen ? "w-60" : "w-12"
      )}>
        <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.06]">
          {sidebarOpen && <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Chats</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors ml-auto">
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>
        
        {sidebarOpen && (
          <>
            <button
              onClick={createNewSession}
              className="flex items-center gap-2 mx-2 mt-2 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg text-xs text-indigo-300 font-medium transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" /> New Chat
            </button>
            
            <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
              {sessions.length === 0 && (
                <p className="text-[11px] text-slate-600 px-2 py-3 text-center">No saved chats yet</p>
              )}
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  className={clsx(
                    "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors group",
                    activeSessionId === session.id
                      ? "bg-indigo-500/15 border border-indigo-500/30 text-indigo-200"
                      : "hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3 shrink-0 opacity-60" />
                    <span className="truncate font-medium">{session.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-600 mt-0.5 block pl-4.5">{session.msg_count} messages</span>
                </button>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
      <header className="px-4 py-3 sm:px-8 sm:py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-2">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" /> Adaptive Tutor
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Ask a DSA question — the answer adapts to your mastery level in real time</p>
          </div>
          
          <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={overrideMastery}
                onChange={(e) => setOverrideMastery(e.target.checked)}
                className="rounded border-white/20 bg-transparent text-indigo-500 focus:ring-indigo-500/30"
              />
              Demo Override
            </label>
            
            <div className={clsx("flex min-w-[12rem] flex-1 items-center gap-3 transition-opacity sm:min-w-[16rem] lg:w-64 lg:flex-none", overrideMastery ? "opacity-100" : "opacity-30 pointer-events-none")}>
              <SlidersHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={mastery}
                onChange={(e) => setMastery(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className={clsx("text-xs font-bold px-2 py-1 rounded-md border shrink-0", mc.bg, mc.text, mc.border)}>
                {mastery.toFixed(2)}
              </span>
            </div>
            
            <button
              onClick={async () => {
                await api.clearChatHistory().catch(() => {});
                setMessages([]);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium rounded-lg transition-colors border border-white/10 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" /> New Chat
            </button>
          </div>
        </div>
        {/* Technique awareness banner — shows reviewers what's running under the hood */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: "3-Tier Source Grounding", color: "text-emerald-400/70 bg-emerald-500/8 border-emerald-500/10" },
            { label: "Mastery-Adaptive Retrieval", color: "text-indigo-400/70 bg-indigo-500/8 border-indigo-500/10" },
            { label: "Self-Verification", color: "text-amber-400/70 bg-amber-500/8 border-amber-500/10" },
            { label: "SAKT Knowledge Tracing", color: "text-cyan-400/70 bg-cyan-500/8 border-cyan-500/10" },
            { label: "Pathfinder Confidence Gate", color: "text-violet-400/70 bg-violet-500/8 border-violet-500/10" },
          ].map((t) => (
            <span key={t.label} className={clsx("text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border", t.color)}>
              {t.label}
            </span>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8">
        {historyLoaded && messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
            <Bot className="w-16 h-16 text-indigo-500/50" />
            <p className="text-lg font-medium text-slate-300">Start the tutoring session.</p>
            <p className="text-sm text-slate-500 max-w-md">
              Ask a Data Structures & Algorithms question. The response adapts to the mastery slider above.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={clsx("flex gap-4 max-w-4xl mx-auto", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
              )}

              <div className={clsx("flex flex-col gap-2 min-w-0", msg.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={clsx(
                    "px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm max-w-2xl",
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-sm"
                      : "bg-[#1a1a24] border border-white/10 text-slate-200 rounded-tl-sm"
                  )}
                >
                  {msg.role === "assistant" ? <ChatMarkdown content={msg.content} /> : msg.content}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  {msg.metadata && <XRayPanel metadata={msg.metadata} stats={msg.stats} stages={msg.stages} />}
                  
                  {/* Wire Chatbot to Practice & Curated Coding Challenges */}
                  {msg.role === "assistant" && msg.metadata?.sources?.[0]?.topic && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full mt-1.5 pt-1.5 border-t border-white/[0.04]">
                      {/* Curated Problem Chips for this Topic */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-medium">Practice direct:</span>
                        {getProblems(msg.metadata.sources[0].topic, msg.stats?.mastery_used ?? 0.5, 3).map((prob) => (
                          <ProblemChip key={prob.id} problem={prob} />
                        ))}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-auto">
                        {msg.stats?.mastery_used !== undefined && (
                          <span className="text-[10px] font-medium text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3 h-3" />
                            Mastery: {msg.stats.mastery_used.toFixed(2)}
                          </span>
                        )}
                        <a 
                          href={`/practice?topic=${msg.metadata.sources[0].topic}`}
                          className="text-[11px] font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg transition-colors border border-indigo-500/20 flex items-center gap-1"
                        >
                          Diagnostic Q&A &rarr;
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </motion.div>
          ))
        )}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 max-w-4xl mx-auto justify-start">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1">
              <Bot className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
            <ThinkingTrace stages={liveStages} />
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 sm:p-6 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Dijkstra, Heaps, or Dynamic Programming..."
            className="w-full bg-[#16161e] border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-lg"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}

/** Live trace of the real pipeline stages streamed from backend/main.py's
 * /api/ask/stream — not a simulated/timed animation. Every line here is a
 * message the actual retrieval/generation code emitted while it ran. */
function ThinkingTrace({ stages }: { stages: string[] }) {
  return (
    <div className="px-5 py-4 rounded-2xl bg-[#1a1a24] border border-white/10 rounded-tl-sm min-w-[280px] max-w-xl">
      {stages.length === 0 ? (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      ) : (
        <ul className="space-y-1.5">
          {stages.map((s, i) => {
            const isLast = i === stages.length - 1;
            return (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className={clsx("flex items-start gap-2 text-xs", isLast ? "text-slate-200" : "text-slate-500")}
              >
                {isLast ? (
                  <Loader2 className="w-3.5 h-3.5 mt-0.5 shrink-0 animate-spin text-indigo-400" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500/70" />
                )}
                <span className="leading-relaxed">{s}</span>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function XRayPanel({
  metadata, stats, stages,
}: { metadata: AskMetadata; stats?: AskResponseStats; stages?: string[] }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mt-1 w-full max-w-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-indigo-400 transition-colors px-1 py-0.5 rounded"
      >
        <Database className="w-3 h-3" />
        X-Ray Analytics
        {isOpen ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-2"
          >
            <div className="p-4 bg-[#111116] border border-white/5 rounded-xl space-y-4">
              {stages && stages.length > 0 && (
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Pipeline Trace</div>
                  <ul className="space-y-1">
                    {stages.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                        <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500/60" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Adaptive Persona</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/30 p-2 rounded border border-white/5">
                    <div className="text-[10px] text-slate-500 mb-0.5">Applied Label</div>
                    <div className="text-xs font-medium text-slate-300">{metadata.mastery_label}</div>
                  </div>
                  <div className="bg-black/30 p-2 rounded border border-white/5">
                    <div className="text-[10px] text-slate-500 mb-0.5">Query Complexity</div>
                    <div className="text-xs font-medium text-amber-400">{stats?.complexity || "UNKNOWN"}</div>
                  </div>
                </div>
              </div>

              {stats?.pathfinder && (
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldAlert className="w-3 h-3" /> Pathfinder Validation
                  </div>
                  <div className="bg-black/30 p-2 rounded border border-white/5 text-xs text-slate-300 flex items-center justify-between">
                    <span>Confidence: {(stats.pathfinder.confidence * 100).toFixed(0)}%</span>
                    {stats.pathfinder.escalated && (
                      <span className="text-amber-400 text-[10px] font-medium">ESCALATED RETRY</span>
                    )}
                  </div>
                </div>
              )}

              {metadata.tier_distribution && (
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Retrieval Distribution</div>
                  <div className="space-y-2">
                    {Object.entries(metadata.tier_distribution).map(([tier, count]) => {
                      const total = Object.values(metadata.tier_distribution).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      let color = "bg-indigo-500";
                      if (tier === "T1") color = "bg-rose-500";
                      if (tier === "T2") color = "bg-amber-500";
                      if (tier === "T3") color = "bg-emerald-500";

                      return (
                        <div key={tier} className="text-xs">
                          <div className="flex justify-between mb-1">
                            <span className="text-slate-400 font-medium">
                              {tier} {tier === "T1" ? "(CLRS)" : tier === "T2" ? "(GFG)" : "(MIT)"}
                            </span>
                            <span className="text-slate-500">
                              {count} chunks ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.5, delay: 0.1 }}
                              className={`h-full ${color}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {metadata.model && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Activity className="w-3 h-3" /> Answered by <span className="text-slate-400 font-mono">{metadata.model}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
