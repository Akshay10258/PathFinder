"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  UserCircle2, Target, Award, Flame, Trophy, Loader2, RefreshCw,
  Brain, AlertTriangle, Clock,
} from "lucide-react";
import clsx from "clsx";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/AuthProvider";
import type { ProfileResponse, StatsResponse } from "@/lib/types";
import { formatTopic, masteryColor, masteryLabel } from "@/lib/format";
import TrendChart from "@/components/TrendChart";

export default function ProfilePage() {
  const api = useApi();
  const { devMode, devStudentId } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([api.getProfile().catch(() => null), api.getStats().catch(() => null)])
      .then(([p, s]) => {
        setProfile(p);
        setStats(s);
      })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  // Cast stats to include enriched fields from the upgraded backend
  const enrichedStats = stats as (StatsResponse & {
    misconception_frequency?: { id: string; count: number }[];
  }) | null;

  return (
    <>
      <header className="px-4 py-4 sm:px-8 sm:py-5 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <UserCircle2 className="w-5 h-5 text-indigo-400" /> Profile & Progress
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Your practice history, forgetting curves, and misconception patterns</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium rounded-lg transition-colors border border-white/[0.06]"
        >
          <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-6">
        {loading && !stats ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm">Loading profile...</p>
          </div>
        ) : (
          <>
            {/* --- Identity Card --- */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 bg-[#111116] border border-white/[0.06] rounded-2xl p-5"
            >
              <span className="text-4xl leading-none">{profile?.avatar_emoji || "🧑‍💻"}</span>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold text-slate-100 truncate">
                  {profile?.display_name || (devMode ? devStudentId : "Student")}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {profile?.is_demo && (
                    <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                      Demo Account
                    </span>
                  )}
                  {stats && (
                    <span className={clsx("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", masteryColor(stats.avg_mastery).bg, masteryColor(stats.avg_mastery).text, masteryColor(stats.avg_mastery).border)}>
                      {masteryLabel(stats.avg_mastery)} overall
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* --- Summary Stats --- */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Target} label="Practice Attempts" value={String(stats.total_attempts)} color="text-indigo-400" delay={0} />
                <StatCard icon={Award} label="Overall Accuracy" value={`${(stats.overall_accuracy * 100).toFixed(0)}%`} color="text-cyan-400" delay={0.05} />
                <StatCard icon={Flame} label="Topics Practiced" value={String(stats.topics_practiced)} color="text-amber-400" delay={0.1} />
                <StatCard icon={Trophy} label="Topics Mastered" value={`${stats.topics_mastered} / ${stats.total_topics}`} color="text-emerald-400" delay={0.15} />
              </div>
            )}

            {/* --- Accuracy Trend Chart --- */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#111116] border border-white/[0.06] rounded-2xl p-5"
            >
              <div className="text-sm font-semibold text-slate-200 mb-1">Practice Accuracy Trend</div>
              <p className="text-xs text-slate-500 mb-4">
                Daily accuracy across your Practice Loop attempts (real interaction data)
              </p>
              <TrendChart data={stats?.trend || stats?.recent_trend || []} />
            </motion.div>

            {/* --- Misconception Frequency Chart --- */}
            {enrichedStats?.misconception_frequency && enrichedStats.misconception_frequency.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-[#111116] border border-white/[0.06] rounded-2xl p-5"
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span className="text-sm font-semibold text-slate-200">Detected Misconceptions</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 ml-auto">
                    Catalog-Matched
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Specific, named error patterns detected when you answered incorrectly — not just &quot;wrong&quot; but &quot;why.&quot;
                </p>
                <div className="space-y-2">
                  {enrichedStats.misconception_frequency.map((m, i) => {
                    const maxCount = enrichedStats.misconception_frequency![0].count;
                    const pct = (m.count / maxCount) * 100;
                    return (
                      <div key={m.id} className="flex items-center gap-3">
                        <span className="w-56 shrink-0 text-xs text-slate-300 truncate">
                          {m.id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                        <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400"
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-400 w-8 text-right">{m.count}×</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* --- Topic Breakdown Table --- */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#111116] border border-white/[0.06] rounded-2xl p-5"
            >
              <div className="text-sm font-semibold text-slate-200 mb-1">Topics Practiced</div>
              <p className="text-xs text-slate-500 mb-4">
                Every topic you&apos;ve attempted, with accuracy, mastery, and misconception count
              </p>

              {!stats || stats.topic_breakdown.length === 0 ? (
                <p className="text-sm text-slate-600 py-6 text-center">
                  No topics practiced yet — head to Practice to generate your first question.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {/* Table header */}
                  <div className="flex items-center gap-4 text-[9px] text-slate-500 uppercase tracking-wider font-semibold px-1">
                    <span className="w-40 shrink-0">Topic</span>
                    <span className="w-20 shrink-0">Attempts</span>
                    <span className="w-16 shrink-0">Accuracy</span>
                    <span className="flex-1">Mastery</span>
                    <span className="w-10 shrink-0 text-right">Misc.</span>
                  </div>
                  {stats.topic_breakdown.map((t, i) => {
                    const mc = masteryColor(t.mastery);
                    return (
                      <motion.div
                        key={t.topic}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className="flex items-center gap-4 text-sm"
                      >
                        <span className="w-40 shrink-0 text-slate-300 truncate text-xs">{formatTopic(t.topic)}</span>
                        <span className="w-20 shrink-0 text-xs text-slate-500 font-mono">
                          {t.attempts} attempt{t.attempts === 1 ? "" : "s"}
                        </span>
                        <span className="w-16 shrink-0 text-xs text-slate-400 font-mono">{(t.accuracy * 100).toFixed(0)}%</span>
                        <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden">
                          <div className={clsx("h-full rounded-full", mc.bar)} style={{ width: `${t.mastery * 100}%` }} />
                        </div>
                        <span className={clsx("w-10 shrink-0 text-right text-xs font-mono", mc.text)}>
                          {t.mastery.toFixed(2)}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </>
  );
}

function StatCard({
  icon: Icon, label, value, color, delay,
}: { icon: typeof Target; label: string; value: string; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[#111116] border border-white/[0.06] rounded-xl p-4 flex items-center gap-3"
    >
      <div className={clsx("p-2.5 rounded-lg bg-white/[0.04]", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium truncate">{label}</div>
        <div className="text-lg font-bold text-slate-100">{value}</div>
      </div>
    </motion.div>
  );
}
