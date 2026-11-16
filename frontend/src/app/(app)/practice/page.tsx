"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  Code2,
  ExternalLink,
  Flame,
  ArrowUpRight,
} from "lucide-react";
import clsx from "clsx";
import { useApi } from "@/lib/useApi";
import type { GenerateQuestionsResponse, SubmitAnswerResponse } from "@/lib/types";
import { formatTopic, masteryColor, masteryLabel } from "@/lib/format";
import ProblemCard, { ProblemSectionHeader } from "@/components/ProblemCard";
import { getProblems, getProblemsByDifficulty } from "@/lib/problems";

// Mirrors retrieval/topic_map.py's 34 canonical topics.
const TOPICS = [
  "algorithm_foundations", "amortized_analysis", "arrays", "augmenting_data_structures",
  "avl_trees", "b_trees", "basic_data_structures", "binary_search_trees", "complexity_analysis",
  "complexity_theory", "computational_geometry", "disjoint_sets", "divide_and_conquer",
  "document_distance", "dynamic_programming", "graph_algorithms", "greedy_algorithms", "hashing",
  "heap", "linked_lists", "maximum_flow", "minimum_spanning_trees", "numerics",
  "parallel_architecture", "peak_finding", "queues", "recursion_backtracking", "red_black_trees",
  "searching", "shortest_paths", "sorting", "stacks", "string_matching", "strings",
];

type QuestionState = {
  answer: string;
  result?: SubmitAnswerResponse;
  submitting: boolean;
};

export default function PracticePage() {
  const api = useApi();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [mastery, setMastery] = useState<number | null>(null);
  const [set, setSet] = useState<GenerateQuestionsResponse | null>(null);
  const [states, setStates] = useState<QuestionState[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Read from URL directly to avoid Next.js useSearchParams Suspense requirement boundary
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const t = urlParams.get("topic");
      if (t && TOPICS.includes(t)) {
        setTopic(t);
      }
    }
  }, []);

  useEffect(() => {
    api
      .getMastery()
      .then((res) => setMastery(res.concept_scores[topic] ?? 0.3))
      .catch(() => setMastery(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    setSet(null);
    setActiveIndex(0);
    try {
      const res = await api.generateQuestions(topic, mastery ?? 0.3);
      if (!res.questions.length) {
        setError(res.error || "No questions could be generated for this topic — try another.");
      } else {
        setSet(res);
        setStates(res.questions.map(() => ({ answer: "", submitting: false })));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate questions.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (index: number) => {
    if (!set) return;
    setStates((prev) => prev.map((s, i) => (i === index ? { ...s, submitting: true } : s)));
    try {
      const result = await api.submitAnswer({
        concept: set.canonical_topic,
        question: set.questions[index],
        studentAnswer: states[index].answer,
        referenceAnswer: set.reference_answers[index],
        expectedConcepts: set.expected_concepts[index] || [],
        mastery: mastery ?? undefined,
      });
      setStates((prev) => prev.map((s, i) => (i === index ? { ...s, result, submitting: false } : s)));
      setMastery(result.new_mastery);
    } catch {
      setStates((prev) => prev.map((s, i) => (i === index ? { ...s, submitting: false } : s)));
    }
  };

  const mc = useMemo(() => masteryColor(mastery ?? 0.3), [mastery]);
  const currentState = states[activeIndex];

  // Curated LeetCode & GFG recommendations for the current topic & mastery
  const curatedProblems = useMemo(() => {
    return getProblems(topic, mastery ?? 0.3, 5);
  }, [topic, mastery]);

  // Problems grouped by difficulty for this topic
  const diffProblems = useMemo(() => {
    return getProblemsByDifficulty(topic);
  }, [topic]);

  // Dynamic recommendations for post-answer reinforcement
  const postAnswerProblems = useMemo(() => {
    if (!currentState?.result) return [];
    // If the student answer was incorrect, recommend easier problems to build foundation
    // If correct, challenge them with harder ones
    const currentScore = currentState.result.score;
    const targetMastery = currentScore < 0.6 ? Math.max(0.1, (mastery ?? 0.3) - 0.2) : Math.min(0.9, (mastery ?? 0.3) + 0.2);
    return getProblems(topic, targetMastery, 3);
  }, [currentState?.result, topic, mastery]);

  return (
    <>
      <header className="px-4 py-3 sm:px-8 sm:py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-indigo-400" /> Adaptive Practice Loop
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mastery-calibrated AI questions paired with curated LeetCode & GFG coding challenges
            </p>
          </div>
        </div>
        {mastery !== null && (
          <span className={clsx("text-xs font-bold px-3 py-1.5 rounded-md border", mc.bg, mc.text, mc.border)}>
            {formatTopic(topic)}: {masteryLabel(mastery)} ({mastery.toFixed(2)})
          </span>
        )}
        {/* Session progress bar — shows how many questions answered */}
        {set && states.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              {states.map((s, i) => (
                <div
                  key={i}
                  className={clsx(
                    "w-6 h-1.5 rounded-full transition-colors",
                    s.result
                      ? s.result.correct ? "bg-emerald-500" : "bg-rose-500"
                      : i === activeIndex ? "bg-indigo-500" : "bg-white/10"
                  )}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              {states.filter(s => s.result).length}/{states.length} answered
              {states.filter(s => s.result?.correct).length > 0 && (
                <> · {states.filter(s => s.result?.correct).length} correct</>
              )}
            </span>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Topic Selector & Generation Bar */}
        <div className="flex flex-col items-stretch gap-3 mb-6 sm:flex-row sm:items-center">
          <select
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setSet(null);
            }}
            className="flex-1 bg-[#16161e] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
          >
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {formatTopic(t)}
              </option>
            ))}
          </select>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shrink-0 shadow-lg shadow-indigo-500/20"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {set ? "Regenerate AI Questions" : "Generate AI Questions"}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* Two-Column Responsive Layout: Left = AI Q&A Loop, Right = Curated Problem Track */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Column: AI Diagnostic & Answer Evaluation */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {generating && (
              <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3 border border-white/[0.06] rounded-2xl bg-white/[0.01]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <p className="text-sm font-medium text-slate-400">Retrieving academic corpus and drafting calibrated questions...</p>
              </div>
            )}

            {!set && !generating && (
              <div className="border border-white/[0.08] rounded-2xl p-6 sm:p-8 bg-[#111116] text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-base font-semibold text-slate-100">Ready to Test Your Concept Mastery?</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Click <span className="text-indigo-400 font-semibold">Generate AI Questions</span> above for theoretical diagnostic grading, or dive straight into verified coding problems on the right.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap justify-center gap-2">
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                    🎯 {diffProblems.easy.length} Easy Problems
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                    ⚡ {diffProblems.medium.length} Medium Problems
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                    🔥 {diffProblems.hard.length} Hard Problems
                  </span>
                </div>
              </div>
            )}

            {set && !generating && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  {set.questions.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveIndex(i)}
                      className={clsx(
                        "w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center border transition-colors",
                        i === activeIndex
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
                          : states[i]?.result
                            ? states[i].result!.correct
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                            : "bg-[#16161e] border-white/10 text-slate-500 hover:text-slate-300"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-2">
                    {set.difficulty} · sourced from {set.source_tier}
                    {set.grounded[activeIndex] === false && (
                      <span className="text-amber-400 ml-2">(grounding unverified)</span>
                    )}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIndex}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    className="bg-[#111116] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl shadow-black/40"
                  >
                    <p className="text-base text-slate-100 leading-relaxed font-medium">{set.questions[activeIndex]}</p>

                    <textarea
                      value={currentState?.answer || ""}
                      onChange={(e) =>
                        setStates((prev) => prev.map((s, i) => (i === activeIndex ? { ...s, answer: e.target.value } : s)))
                      }
                      disabled={!!currentState?.result}
                      rows={5}
                      placeholder="Type your explanation or algorithmic strategy..."
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 disabled:opacity-70 resize-none"
                    />

                    {!currentState?.result ? (
                      <button
                        onClick={() => handleSubmit(activeIndex)}
                        disabled={!currentState?.answer.trim() || currentState?.submitting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shadow-md shadow-indigo-600/30"
                      >
                        {currentState?.submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                        Submit Answer
                      </button>
                    ) : (
                      <FeedbackCard result={currentState.result} />
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Reinforce with Real LeetCode/GFG Problems after answering */}
                {currentState?.result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/5 to-transparent space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          Reinforce With Direct Coding Problems
                        </h4>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {currentState.result.correct ? "Next Level Challenge" : "Foundation Repair"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {currentState.result.correct
                        ? "Great work! Solidify your conceptual understanding by submitting code on these curated problems:"
                        : "Before moving on, practice these targeted problems to eliminate the diagnosed misconception:"}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {postAnswerProblems.map((p) => (
                        <ProblemCard key={p.id} problem={p} compact />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Next Question / Finish Actions */}
                <div className="flex items-center justify-between pt-2">
                  {currentState?.result && activeIndex < set.questions.length - 1 && (
                    <button
                      onClick={() => setActiveIndex(activeIndex + 1)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-slate-100 text-sm font-medium rounded-xl transition-colors ml-auto shadow-sm"
                    >
                      Next Question <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  {currentState?.result && activeIndex === set.questions.length - 1 && (
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors ml-auto shadow-md shadow-indigo-600/30"
                    >
                      <RefreshCw className="w-4 h-4" /> New Question Set
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Curated LeetCode & GFG Problem Track */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            <div className="border border-white/[0.08] bg-[#111116] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-orange-400" /> Curated Problem Set
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hand-picked for {formatTopic(topic)}
                  </p>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-400 border border-white/[0.06]">
                  {curatedProblems.length} Suggested
                </span>
              </div>

              <div className="space-y-2.5">
                {curatedProblems.length > 0 ? (
                  curatedProblems.map((p) => (
                    <ProblemCard key={p.id} problem={p} compact />
                  ))
                ) : (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No curated problems indexed for this specific filter yet.
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                <span className="text-slate-500">More on LeetCode:</span>
                <a
                  href={`https://leetcode.com/tag/${topic.replace(/_/g, "-")}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
                >
                  Browse {formatTopic(topic)} Tag <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function FeedbackCard({ result }: { result: SubmitAnswerResponse }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        "rounded-xl p-4 border space-y-3",
        result.correct ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {result.correct ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-400" />
          )}
          <span className={clsx("text-sm font-semibold", result.correct ? "text-emerald-400" : "text-rose-400")}>
            {result.correct ? "Correct" : "Needs Work"} — {(result.score * 100).toFixed(0)}%
          </span>
        </div>
        <span className="text-[10px] text-slate-500">mastery -&gt; {result.new_mastery.toFixed(2)}</span>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed">{result.feedback}</p>

      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <Metric label="Semantic Sim." value={`${(result.semantic_similarity * 100).toFixed(0)}%`} />
        <Metric label="Concept Coverage" value={`${(result.concept_coverage * 100).toFixed(0)}%`} />
        <Metric label="LLM Grade" value={`${result.llm_grade}/5`} />
      </div>

      {(result.matched_concepts.length > 0 || result.missed_concepts.length > 0) && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {result.matched_concepts.map((c) => (
            <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              ✓ {c}
            </span>
          ))}
          {result.missed_concepts.map((c) => (
            <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
              missed: {c}
            </span>
          ))}
        </div>
      )}

      {/* Misconception Detection UI */}
      {result.misconception && (
        <div className="mt-3 p-3 bg-rose-900/20 border border-rose-500/30 rounded-xl flex items-start gap-3">
          <div className="bg-rose-500/20 p-1.5 rounded-lg shrink-0 mt-0.5">
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-rose-300 uppercase tracking-wider mb-1">Detected Misconception</h4>
            <p className="text-xs text-rose-200/80 leading-relaxed font-mono bg-black/20 p-2 rounded">
              {result.misconception}
            </p>
            <p className="text-[10px] text-rose-400/60 mt-1.5">
              This specific error was diagnosed from your answer and logged to your forgetting curve.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/30 rounded-lg px-2 py-1.5 border border-white/5">
      <div className="text-slate-500">{label}</div>
      <div className="text-slate-200 font-semibold">{value}</div>
    </div>
  );
}
