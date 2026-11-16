"use client";

import { ExternalLink, Code2 } from "lucide-react";
import clsx from "clsx";
import type { Problem } from "@/lib/problems";

interface ProblemCardProps {
  problem: Problem;
  compact?: boolean;
  className?: string;
}

const PLATFORM_STYLE = {
  leetcode: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    text: "text-orange-400",
    label: "LC",
  },
  gfg: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    label: "GFG",
  },
} as const;

const DIFFICULTY_STYLE = {
  easy: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  medium: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  hard: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
} as const;

/** Compact inline chip — used in tutor message bubbles */
export function ProblemChip({ problem }: { problem: Problem }) {
  const p = PLATFORM_STYLE[problem.platform];
  const d = DIFFICULTY_STYLE[problem.difficulty];
  return (
    <a
      href={problem.url}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all hover:scale-[1.02] hover:shadow-sm cursor-pointer",
        p.bg, p.border, p.text
      )}
      title={problem.why}
    >
      <span className={clsx("font-bold text-[10px] px-1 py-0.5 rounded", d.bg, d.text)}>{problem.difficulty[0].toUpperCase()}</span>
      {problem.title}
      {problem.lcNumber && <span className="opacity-60">#{problem.lcNumber}</span>}
      <ExternalLink className="w-3 h-3 opacity-60" />
    </a>
  );
}

/** Full card — used in Practice page sidebar and post-answer panel */
export default function ProblemCard({ problem, compact = false, className }: ProblemCardProps) {
  const p = PLATFORM_STYLE[problem.platform];
  const d = DIFFICULTY_STYLE[problem.difficulty];

  if (compact) {
    return (
      <a
        href={problem.url}
        target="_blank"
        rel="noopener noreferrer"
        className={clsx(
          "flex items-center gap-3 p-2.5 rounded-xl border transition-all hover:border-white/20 hover:bg-white/[0.03] group",
          "border-white/[0.06] bg-black/20",
          className
        )}
      >
        <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold", p.bg, p.text)}>
          {p.label}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-200 truncate group-hover:text-white transition-colors">
              {problem.title}
              {problem.lcNumber && <span className="ml-1 text-slate-500 font-normal">#{problem.lcNumber}</span>}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={clsx("text-[10px] font-semibold px-1.5 py-0.5 rounded-md border", d.bg, d.text, d.border)}>
              {problem.difficulty}
            </span>
            {problem.tags.slice(0, 2).map(t => (
              <span key={t} className="text-[10px] text-slate-600 bg-white/[0.04] px-1.5 py-0.5 rounded">{t}</span>
            ))}
          </div>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
      </a>
    );
  }

  return (
    <a
      href={problem.url}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        "block p-4 rounded-xl border transition-all hover:border-white/20 hover:bg-white/[0.03] group",
        "border-white/[0.06] bg-black/20",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={clsx("text-[10px] font-bold px-2 py-1 rounded-lg border", p.bg, p.text, p.border)}>
            {p.label}
          </span>
          <span className={clsx("text-[10px] font-semibold px-2 py-1 rounded-lg border", d.bg, d.text, d.border)}>
            {problem.difficulty}
          </span>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 shrink-0 mt-0.5 transition-colors" />
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-200 group-hover:text-white transition-colors leading-snug">
        {problem.title}
        {problem.lcNumber && (
          <span className="ml-1.5 text-[11px] text-slate-500 font-normal">#{problem.lcNumber}</span>
        )}
      </p>
      <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed line-clamp-2">{problem.why}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {problem.tags.map(t => (
          <span key={t} className="text-[10px] text-slate-600 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.04]">{t}</span>
        ))}
      </div>
    </a>
  );
}

/** Section header used above problem lists */
export function ProblemSectionHeader({ count, topic, mastery }: { count: number; topic: string; mastery?: number }) {
  const level = mastery === undefined ? "" : mastery < 0.4 ? "Easy" : mastery < 0.7 ? "Medium" : "Hard";
  return (
    <div className="flex items-center gap-2 mb-2">
      <Code2 className="w-3.5 h-3.5 text-indigo-400" />
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        {count} Curated Problem{count !== 1 ? "s" : ""}{level ? ` · ${level} Focus` : ""}
      </span>
    </div>
  );
}
