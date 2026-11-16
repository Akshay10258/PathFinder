"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FlaskConical, Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Terminal,
} from "lucide-react";
import clsx from "clsx";
import { useApi } from "@/lib/useApi";
import { formatTopic } from "@/lib/format";
import type { EvidenceResponse, CalibrationSummary, AblationFile } from "@/lib/types";
import EvidenceBarChart, { type EvidenceBarGroup } from "@/components/EvidenceBarChart";

const CONDITION_COLORS: Record<string, string> = {
  A: "#818cf8", B: "#fbbf24", C: "#94a3b8", D: "#fb7185",
};
const CONDITION_LABELS: Record<string, string> = {
  A: "Full PathFinder", B: "No Tier Weighting", C: "Prompt Only", D: "Naive Baseline",
};

export default function EvidencePage() {
  const api = useApi();
  const [evidence, setEvidence] = useState<EvidenceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getEvidence().then(setEvidence).finally(() => setLoading(false));
  };

  // Standard fetch-on-mount pattern, same as every other page in this app.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(load, []);

  return (
    <>
      <header className="px-4 py-4 sm:px-8 border-b border-white/[0.06] shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-indigo-400" /> Research Evidence
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Four testable claims, measured — not asserted. See RESEARCH_ADVANCEMENTS.md §1.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium rounded-lg transition-colors border border-white/[0.06]"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
          </button>
        </div>
        {/* The 4 research claims as compact pills */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { num: "1", claim: "Retrieval-grounded answers are more faithful", test: "A vs D: Faithfulness" },
            { num: "2", claim: "Mastery-adaptive retrieval beats prompt-only", test: "C vs D: Mastery Adaptation" },
            { num: "3", claim: "System detects and corrects for forgetting", test: "Forgetting Curve KT" },
            { num: "4", claim: "Misconceptions are identified, not just errors", test: "Catalog Agreement Rate" },
          ].map((c) => (
            <div key={c.num} className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2">
              <div className="text-[9px] font-bold text-indigo-400 mb-0.5">CLAIM {c.num}</div>
              <div className="text-[10px] text-slate-300 leading-tight">{c.claim}</div>
              <div className="text-[9px] text-slate-500 mt-0.5 font-mono">{c.test}</div>
            </div>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
        {loading && !evidence ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        ) : (
          <>
            <AblationSection ablation={evidence?.ablation} />
            <CalibrationSection calibration={evidence?.calibration} />
            <NotRunSection
              title="Pathfinder Confidence-Gate Validation"
              available={!!evidence?.pathfinder?.available}
              description="Does retrieval_confidence actually predict answer quality? Correlates it against faithfulness, and isolates what the escalation retry contributes."
              command="cd evaluation && python eval_pathfinder.py --queries 8 --masteries 0.2 0.5 0.8"
            />
            <NotRunSection
              title="Adaptive Roadmap Ablation"
              available={!!evidence?.roadmap_ablation?.available}
              description="Full System vs No-LLM-Ordering vs No-Graph-Constraint — isolates what the LLM's reasoning and the prerequisite graph each contribute."
              command="cd evaluation && python eval_roadmap.py --personas 3 --hours 10"
            />
            <NotRunSection
              title="Answer Evaluator Gold-Set Validation"
              available={!!evidence?.answer_evaluator?.available}
              description="Correlates AnswerEvaluator's correct/incorrect signal — the only thing Knowledge Tracing ever sees — against hand-labeled ground truth."
              command="cd evaluation && python eval_answer_evaluator.py"
            />
            <NotRunSection
              title="End-to-End Closed Loop (flagship experiment)"
              available={!!evidence?.end_to_end?.available}
              description="Does predicted mastery track a real, evolving simulated learner's scripted ability over a multi-turn session, not just react to a manually-set slider?"
              command="cd evaluation && python eval_end_to_end.py --sessions 2 --turns 8 --topic dynamic_programming"
            />
          </>
        )}
      </div>
    </>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111116] border border-white/10 rounded-2xl p-5"
    >
      {children}
    </motion.div>
  );
}

function NotRunSection({
  title, available, description, command,
}: { title: string; available: boolean; description: string; command: string }) {
  if (available) return null; // real data renders via its own dedicated section instead
  return (
    <SectionCard>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
          Not run yet
        </span>
      </div>
      <p className="text-sm text-slate-500 leading-relaxed mb-3">{description}</p>
      <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-lg px-3 py-2 font-mono text-xs text-slate-400 overflow-x-auto">
        <Terminal className="w-3.5 h-3.5 shrink-0 text-slate-600" />
        <code>{command}</code>
      </div>
    </SectionCard>
  );
}

function AblationSection({ ablation }: { ablation?: { available: boolean; data: AblationFile | null } }) {
  if (!ablation?.available || !ablation.data) {
    return (
      <NotRunSection
        title="Ablation Study — A (Full RAG) vs B (No Tier) vs C (Prompt Only) vs D (Naive Baseline)"
        available={false}
        description="Includes the required external-baseline comparison (Condition D) against the actual free alternative — see RESEARCH_ADVANCEMENTS.md §3."
        command="cd evaluation && python eval_comprehensive.py --queries 15 --masteries 0.2 0.5 0.8"
      />
    );
  }

  const { analysis, timestamp, n_queries, masteries } = ablation.data;
  const s = analysis.summary;

  const qualityGroups: EvidenceBarGroup[] = [
    {
      label: "Answer Relevancy (1-5)",
      bars: ["A", "B", "C", "D"].map((c) => ({
        key: c, label: c, color: CONDITION_COLORS[c], value: s[c]?.answer_relevancy?.mean ?? 0,
      })),
    },
    {
      label: "Completeness (1-5)",
      bars: ["A", "B", "C", "D"].map((c) => ({
        key: c, label: c, color: CONDITION_COLORS[c], value: s[c]?.completeness?.mean ?? 0,
      })),
    },
    {
      label: "Faithfulness vs given context (1-5) — A/B only, C/D have no context",
      bars: ["A", "B"].map((c) => ({
        key: c, label: c, color: CONDITION_COLORS[c], value: s[c]?.faithfulness_score?.mean ?? 0,
      })),
    },
    {
      label: "Factual Accuracy vs judge's own knowledge (1-5) — C/D only",
      bars: ["C", "D"].map((c) => ({
        key: c, label: c, color: CONDITION_COLORS[c], value: s[c]?.factual_accuracy_score?.mean ?? 0,
      })),
    },
  ];

  const baseline = analysis.baseline_comparisons || {};

  return (
    <SectionCard>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-200">Ablation Study</h3>
        <span className="text-[10px] text-slate-600">
          {n_queries} queries × {masteries.join("/")} mastery · {new Date(timestamp).toLocaleDateString()}
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        {Object.entries(CONDITION_LABELS).map(([k, v], i) => (
          <span key={k}>
            {i > 0 && " · "}
            <span className="font-bold" style={{ color: CONDITION_COLORS[k] }}>{k}</span> {v}
          </span>
        ))}
      </p>

      <EvidenceBarChart groups={qualityGroups} maxValue={5} />

      <div className="mt-6 pt-5 border-t border-white/5">
        <div className="text-xs font-semibold text-rose-300 mb-1">A vs D — the comparison that matters most</div>
        <p className="text-[11px] text-slate-500 mb-3">
          D is the same LLM with zero mastery input, zero persona engineering, zero retrieval — the actual free
          alternative already open in another tab. If A doesn&apos;t measurably beat D here, the system&apos;s
          central claim is unproven.
        </p>
        <div className="space-y-1.5">
          {Object.entries(baseline).map(([metric, comp]) => {
            if (metric === "mastery_adaptation") {
              const ma = comp as { A_mean: number; D_mean: number };
              return (
                <div key={metric} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Mastery Adaptation</span>
                  <span className="font-mono text-slate-300">A={ma.A_mean.toFixed(3)} vs D={ma.D_mean.toFixed(3)}</span>
                </div>
              );
            }
            const c = comp as { cohens_d: number; effect_size: string; win_tie_loss: { wins: number; ties: number; losses: number } };
            return (
              <div key={metric} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{formatTopic(metric)}</span>
                <span className="flex items-center gap-2">
                  <span className={clsx("font-mono", c.cohens_d > 0 ? "text-emerald-400" : "text-rose-400")}>
                    d={c.cohens_d > 0 ? "+" : ""}{c.cohens_d.toFixed(2)} ({c.effect_size})
                  </span>
                  <span className="text-slate-600 font-mono">
                    W/T/L {c.win_tie_loss.wins}/{c.win_tie_loss.ties}/{c.win_tie_loss.losses}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

function CalibrationSection({ calibration }: { calibration?: { available: boolean; data: CalibrationSummary | null } }) {
  if (!calibration?.available || !calibration.data) {
    return (
      <NotRunSection
        title="Knowledge Tracing Calibration"
        available={false}
        description="Pure-PyTorch calibration checks against synthetic personas with known ground truth."
        command="cd knowledge_tracing && python export_calibration_summary.py"
      />
    );
  }

  const d = calibration.data;

  return (
    <SectionCard>
      <h3 className="text-sm font-semibold text-slate-200 mb-1">Knowledge Tracing Calibration</h3>
      <p className="text-xs text-slate-500 mb-4">
        Pass/fail assertions against synthetic personas with known intended mastery — no LLM calls, pure PyTorch.
      </p>

      <div className="grid grid-cols-3 gap-2 mb-5">
        <PassBadge label="Cold Start" pass={d.cold_start.pass} detail={`${d.cold_start.predicted_mastery} == ${d.cold_start.expected}`} />
        <PassBadge label="Trend Direction" pass={d.trend_test.pass} detail={`improving ${d.trend_test.improving_mastery} > regressing ${d.trend_test.regressing_mastery}`} />
        <PassBadge label="Rank Correlation" pass={d.rank_correlation.pass} detail={`Spearman ρ = ${d.rank_correlation.spearman_rho}`} />
      </div>

      <div className="text-xs font-semibold text-slate-300 mb-2">Per-Persona Weak-Topic Classification</div>
      <div className="space-y-2 mb-5">
        {d.personas.filter((p) => p.checks.length > 0).map((persona) => (
          <div key={persona.name} className="bg-black/30 border border-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-200">{formatTopic(persona.name)}</span>
              {persona.known_limitation && (
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Known limitation</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mb-2">{persona.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {persona.checks.map((c) => (
                <span
                  key={c.topic}
                  className={clsx(
                    "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border",
                    c.pass ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  )}
                >
                  {c.pass ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                  {formatTopic(c.topic)}: {c.predicted_mastery}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {d.known_limitations.length > 0 && (
        <>
          <div className="text-xs font-semibold text-amber-300 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Documented Limitations — Not Hidden
          </div>
          <div className="space-y-2">
            {d.known_limitations.map((lim) => (
              <div key={lim.id} className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-200/90 leading-relaxed">
                {lim.explanation as string}
              </div>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  );
}

function PassBadge({ label, pass, detail }: { label: string; pass: boolean; detail: string }) {
  return (
    <div className={clsx("rounded-lg p-2.5 border", pass ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20")}>
      <div className="flex items-center gap-1.5 mb-0.5">
        {pass ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-rose-400" />}
        <span className="text-[10px] font-bold text-slate-300">{label}</span>
      </div>
      <div className="text-[10px] text-slate-500 font-mono truncate">{detail}</div>
    </div>
  );
}
