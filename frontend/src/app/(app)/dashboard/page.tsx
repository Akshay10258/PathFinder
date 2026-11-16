"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Loader2, RefreshCw, TrendingUp, TrendingDown,
  Gauge, LayoutGrid, AlertTriangle, Clock, Eye, Brain, BarChart3,
} from "lucide-react";
import clsx from "clsx";
import { useApi } from "@/lib/useApi";
import { formatTopic, masteryColor, masteryLabel } from "@/lib/format";
import DecayChart, { DecayBars } from "@/components/DecayChart";
import TrendChart from "@/components/TrendChart";
import type { RecommendationResponse, StatsResponse } from "@/lib/types";

type SortMode = "weakest" | "strongest" | "due_for_review" | "alphabetical";
type ViewMode = "grid" | "graph";

/* Detail object returned by the enriched /api/mastery endpoint */
type TopicDetail = {
  mastery: number;
  raw_mastery: number;
  effective_mastery: number;
  days_since_last_practice: number;
  half_life_days: number;
  observations: number;
};
type Recommendation = { topic: string; reason: string; priority: string };

export default function DashboardPage() {
  const api = useApi();
  const [scores, setScores] = useState<Record<string, number> | null>(null);
  const [details, setDetails] = useState<Record<string, TopicDetail> | null>(null);
  const [recs, setRecs] = useState<RecommendationResponse | null>(null);
  const [practiceStats, setPracticeStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("due_for_review");
  const [view, setView] = useState<ViewMode>("grid");

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getMastery().then((res) => {
        setScores(res.concept_scores);
        if (res.concept_details) setDetails(res.concept_details);
      }),
      api.getRecommendations().then((res) => setRecs(res)).catch(() => {}),
      api.getStats().then(setPracticeStats).catch(() => {})
    ]).finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  /* Sort entries based on the selected mode */
  const entries = useMemo(() => {
    if (!scores) return [];
    const arr = Object.entries(scores);
    switch (sort) {
      case "weakest":
        arr.sort((a, b) => a[1] - b[1]);
        break;
      case "strongest":
        arr.sort((a, b) => b[1] - a[1]);
        break;
      case "due_for_review":
        // Sort by largest gap between raw and effective mastery (most forgotten first)
        arr.sort((a, b) => {
          const gapA = details ? (details[a[0]]?.raw_mastery ?? 0) - (details[a[0]]?.effective_mastery ?? 0) : 0;
          const gapB = details ? (details[b[0]]?.raw_mastery ?? 0) - (details[b[0]]?.effective_mastery ?? 0) : 0;
          return gapB - gapA;
        });
        break;
      case "alphabetical":
        arr.sort((a, b) => a[0].localeCompare(b[0]));
        break;
    }
    return arr;
  }, [scores, sort, details]);

  /* Summary statistics */
  const stats = useMemo(() => {
    if (!scores) return null;
    const values = Object.values(scores);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const weak = values.filter((v) => v < 0.4).length;
    const mastered = values.filter((v) => v >= 0.75).length;
    // Count topics where forgetting has caused >10% drop
    const dueForReview = details
      ? Object.values(details).filter((d) => d.raw_mastery - d.effective_mastery > 0.1 && d.observations > 0).length
      : 0;
    return { avg, weak, mastered, total: values.length, dueForReview };
  }, [scores, details]);

  return (
    <>
      <header className="px-4 sm:px-8 py-4 sm:py-5 border-b border-white/[0.06] flex items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-indigo-400" /> Mastery Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Live SAKT-predicted mastery with forgetting-curve decay across all 34 canonical DSA topics
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium rounded-lg transition-colors border border-white/[0.06]"
        >
          <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8 max-w-6xl mx-auto w-full">
        {loading && !scores ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm">Computing mastery across all topics...</p>
          </div>
        ) : (
          <>
            {/* --- What Should I Do Next? --- */}
            {recs && recs.suggested_topics?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 bg-indigo-500/[0.04] border border-indigo-500/20 rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Brain className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-indigo-300">Intelligent Recommendations</h3>
                    <p className="text-xs text-indigo-400/60 mt-0.5">{recs.next_action_reason}</p>
                  </div>
                  <a
                    href={`/practice?topic=${recs.suggested_topics[0].topic}`}
                    className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Start Recommended Practice &rarr;
                  </a>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {recs.suggested_topics.map((t: Recommendation, i: number) => (
                    <div key={i} className="bg-black/30 border border-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-200">{formatTopic(t.topic)}</span>
                        <span className={clsx(
                          "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                          t.priority === "urgent" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          t.priority === "high" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        )}>
                          {t.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{t.reason}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* --- Summary Cards --- */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard icon={Gauge} label="Average Mastery" value={`${(stats.avg * 100).toFixed(0)}%`} color="text-indigo-400" />
                <StatCard icon={TrendingDown} label="Weak Topics" value={`${stats.weak}`} sub={`of ${stats.total}`} color="text-rose-400" />
                <StatCard icon={TrendingUp} label="Mastered" value={`${stats.mastered}`} sub={`of ${stats.total}`} color="text-emerald-400" />
                <StatCard icon={Clock} label="Due for Review" value={`${stats.dueForReview}`} sub="forgetting detected" color="text-amber-400" />
              </div>
            )}

            {/* --- Due for Review Alert (forgetting curve visibility) --- */}
            {details && stats && stats.dueForReview > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-300">Forgetting Curve Alert</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 ml-auto">
                    Half-Life Regression Model
                  </span>
                </div>
                <p className="text-xs text-amber-200/70 mb-3">
                  These topics show significant mastery decay since you last practiced them.
                  Your raw mastery (what you once knew) is higher than your effective mastery (accounting for time-based forgetting).
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(details)
                    .filter(([, d]) => d.raw_mastery - d.effective_mastery > 0.1 && d.observations > 0)
                    .sort(([, a], [, b]) => (b.raw_mastery - b.effective_mastery) - (a.raw_mastery - a.effective_mastery))
                    .map(([topic, d]) => (
                      <span key={topic} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-black/30 border border-amber-500/15 text-amber-200/80">
                        {formatTopic(topic)}
                        <span className="text-amber-400 font-mono">
                          {d.raw_mastery.toFixed(2)} → {d.effective_mastery.toFixed(2)}
                        </span>
                        <span className="text-amber-500/60">({Math.round(d.days_since_last_practice)}d ago)</span>
                      </span>
                    ))}
                </div>
              </motion.div>
            )}

            {/* --- View + Sort Controls --- */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mr-1">View</span>
                {([
                  { mode: "grid" as ViewMode, label: "Cards", icon: LayoutGrid },
                  { mode: "graph" as ViewMode, label: "Decay Curves", icon: TrendingDown },
                ] as const).map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    onClick={() => setView(mode)}
                    className={clsx(
                      "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors",
                      view === mode
                        ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                        : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>

              {view === "grid" && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mr-1">Sort</span>
                  {(["due_for_review", "weakest", "strongest", "alphabetical"] as SortMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSort(mode)}
                      className={clsx(
                        "text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize",
                        sort === mode
                          ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                          : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {mode.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* --- Decay Curves View --- */}
            {view === "graph" && details ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-4">
                  <section className="bg-[#111116] border border-white/[0.06] rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div><h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-amber-400" /> Retention curve</h3><p className="text-xs text-slate-500 mt-1">Predicted retention as time passes after practice</p></div>
                      <span className="text-[10px] text-slate-500 font-mono">solid = effective · dashed = retained</span>
                    </div>
                    <DecayChart data={Object.entries(details).filter(([, d]) => d.observations > 0).map(([topic, d]) => ({ topic, days: d.days_since_last_practice, raw: d.raw_mastery, effective: d.effective_mastery, halfLife: d.half_life_days })).sort((a, b) => a.days - b.days)} />
                  </section>
                  <section className="bg-[#111116] border border-white/[0.06] rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-1"><BarChart3 className="w-4 h-4 text-amber-400" /> Topics due for review</h3>
                    <p className="text-xs text-slate-500 mb-5">The largest gaps between retained and effective mastery</p>
                    <DecayBars data={Object.entries(details).filter(([, d]) => d.observations > 0).map(([topic, d]) => ({ topic, days: d.days_since_last_practice, raw: d.raw_mastery, effective: d.effective_mastery, halfLife: d.half_life_days })).sort((a, b) => (b.raw - b.effective) - (a.raw - a.effective))} />
                  </section>
                </div>
                {practiceStats && <section className="bg-[#111116] border border-white/[0.06] rounded-2xl p-5"><div className="flex items-center justify-between mb-1"><h3 className="text-sm font-semibold text-slate-200">Accuracy trend</h3><span className="text-xs text-cyan-400 font-mono">{practiceStats.total_attempts} total attempts</span></div><p className="text-xs text-slate-500 mb-3">Practice performance that feeds the mastery model</p><TrendChart data={practiceStats.trend} /></section>}
              </div>
            ) : (
              /* --- Rich Topic Cards View --- */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {entries.map(([topic, mastery], i) => {
                  const mc = masteryColor(mastery);
                  const d = details?.[topic];
                  const decayGap = d ? d.raw_mastery - d.effective_mastery : 0;
                  const hasDecay = decayGap > 0.05 && (d?.observations ?? 0) > 0;

                  return (
                    <motion.div
                      key={topic}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.015, 0.3) }}
                      className={clsx(
                        "bg-[#111116] border rounded-xl p-4 transition-colors",
                        hasDecay ? "border-amber-500/20" : "border-white/[0.06]"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-sm font-medium text-slate-200">{formatTopic(topic)}</span>
                        <div className="flex items-center gap-2">
                          {d && d.observations > 0 && (
                            <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                              <Eye className="w-2.5 h-2.5" /> {d.observations} obs
                            </span>
                          )}
                          <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full border", mc.bg, mc.text, mc.border)}>
                            {masteryLabel(mastery)}
                          </span>
                        </div>
                      </div>

                      {/* Main mastery bar */}
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="flex-1 h-2.5 bg-black/40 rounded-full overflow-hidden relative">
                          {/* Raw mastery (ghost bar behind) — shows what you once knew */}
                          {d && hasDecay && (
                            <div
                              className="absolute inset-y-0 left-0 bg-white/[0.06] rounded-full"
                              style={{ width: `${d.raw_mastery * 100}%` }}
                            />
                          )}
                          {/* Effective mastery (solid bar) */}
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${mastery * 100}%` }}
                            transition={{ duration: 0.6, delay: Math.min(i * 0.015, 0.3) }}
                            className={clsx("h-full rounded-full relative z-10", mc.bar)}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-400 w-10 text-right">{mastery.toFixed(2)}</span>
                      </div>

                      {/* Forgetting curve detail row */}
                      {d && d.observations > 0 && (
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                          {hasDecay && (
                            <span className="text-amber-400 flex items-center gap-1">
                              <TrendingDown className="w-3 h-3" />
                              Raw {d.raw_mastery.toFixed(2)} → Effective {d.effective_mastery.toFixed(2)}
                            </span>
                          )}
                          {d.days_since_last_practice > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {d.days_since_last_practice < 1
                                ? "Today"
                                : `${Math.round(d.days_since_last_practice)}d ago`}
                            </span>
                          )}
                          {d.half_life_days > 0 && (
                            <span className="flex items-center gap-1 ml-auto">
                              <Brain className="w-3 h-3" />
                              t½ = {d.half_life_days.toFixed(0)}d
                            </span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function StatCard({
  icon: Icon, label, value, sub, color,
}: { icon: typeof Gauge; label: string; value: string; sub?: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111116] border border-white/[0.06] rounded-xl p-4 flex items-center gap-3"
    >
      <div className={clsx("p-2.5 rounded-lg bg-white/[0.04]", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{label}</div>
        <div className="text-xl font-bold text-slate-100">
          {value}
          {sub && <span className="text-xs font-normal text-slate-500 ml-1">{sub}</span>}
        </div>
      </div>
    </motion.div>
  );
}
