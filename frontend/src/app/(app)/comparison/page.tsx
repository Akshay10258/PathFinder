"use client";

import { useState } from "react";
import { FlaskConical, Loader2, Play, CheckCircle2, Circle } from "lucide-react";
import { useApi } from "@/lib/useApi";
import type { ComparisonResponse } from "@/lib/types";
import ChatMarkdown from "@/components/ChatMarkdown";

const STEPS = ["queued", "retrieving", "generating_pathfinder", "generating_baseline", "done"];
const LABELS: Record<string, string> = { queued: "Queued", retrieving: "Retrieving grounded context", generating_pathfinder: "Generating PathFinder answer", generating_baseline: "Generating direct LLM baseline", done: "Comparison ready" };

export default function ComparisonPage() {
  const api = useApi();
  const [query, setQuery] = useState("Explain why Dijkstra's algorithm cannot handle negative edge weights.");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState<ComparisonResponse | null>(null);
  const [error, setError] = useState("");

  const run = async () => {
    setError(""); setResult(null); setStatus("queued");
    try {
      const job = await api.startCompare(query.trim());
      let current = await api.getCompare(job.job_id);
      let polls = 0;
      while (current.status !== "done" && polls < 120) {
        setStatus(current.status);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        current = await api.getCompare(job.job_id);
        polls += 1;
      }
      if (current.status !== "done") throw new Error("Comparison timed out. Please try a shorter query.");
      setStatus("done"); setResult(current as ComparisonResponse);
    } catch (err) { setError(err instanceof Error ? err.message : "Comparison failed"); setStatus("error"); }
  };

  return <>
    <header className="border-b border-white/[0.06] px-4 py-4 sm:px-8 sm:py-5"><h2 className="flex items-center gap-2 text-base font-semibold text-slate-100"><FlaskConical className="h-5 w-5 text-cyan-400" /> Live Comparison</h2><p className="mt-1 text-xs text-slate-500">Run the same query through the complete PathFinder pipeline and a direct LLM baseline.</p></header>
    <main className="flex-1 overflow-y-auto p-4 sm:p-8"><div className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.03] p-5"><div className="flex flex-col gap-3 sm:flex-row"><textarea rows={3} value={query} onChange={(e) => setQuery(e.target.value)} className="min-h-20 flex-1 resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400/50" placeholder="Ask a DSA question..." /><button onClick={run} disabled={!query.trim() || ["queued", "retrieving", "generating_pathfinder", "generating_baseline"].includes(status)} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"><Play className="h-4 w-4" /> Run comparison</button></div></section>
      {status !== "idle" && <section className="rounded-2xl border border-white/[0.06] bg-[#111116] p-5"><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-200">Pipeline progress</h3><span className="text-xs text-cyan-400">{LABELS[status] || status}</span></div><div className="grid gap-2 sm:grid-cols-5">{STEPS.map((step, index) => { const active = STEPS.indexOf(status) >= index; return <div key={step} className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${active ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200" : "border-white/[0.06] text-slate-600"}`}>{active ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <Circle className="h-3.5 w-3.5 shrink-0" />}<span>{LABELS[step]}</span></div>; })}</div>{status !== "done" && status !== "error" && <Loader2 className="mt-4 h-4 w-4 animate-spin text-cyan-400" />}</section>}
      {error && <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-4 text-xs text-rose-300">{error}</div>}
      {result && <><div className="grid gap-4 lg:grid-cols-2"><Answer title="A · Full PathFinder" answer={result.condition_a.answer} accent="text-cyan-300" meta={`${result.condition_a.metadata.mastery_label} · ${result.condition_a.retrieval_stats.chunks_found} chunks`} /><Answer title="D · Direct LLM baseline" answer={result.condition_d.answer} accent="text-rose-300" meta="No retrieval · no mastery adaptation" /></div><Metrics result={result} /></>}
      {result && <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] text-slate-500 space-y-1"><p><strong>Fair comparison design:</strong> The evaluator receives both answers anonymously (labeled &quot;Answer 1&quot; and &quot;Answer 2&quot; in random order) to reduce bias toward either system.</p><p><strong>Note on groundedness:</strong> Only PathFinder has retrieved context available, so groundedness is evaluated for PathFinder only. For the baseline, groundedness is marked N/A.</p><p><strong>Diagnostic only:</strong> This is an automated LLM-judge evaluation, not independent human validation. Use it to explore, not as definitive evidence.</p></div>}
    </div></main>
  </>;
}

function Answer({ title, answer, accent, meta }: { title: string; answer: string; accent: string; meta: string }) { return <section className="min-w-0 rounded-2xl border border-white/[0.06] bg-[#111116] p-5"><h3 className={`text-sm font-semibold ${accent}`}>{title}</h3><p className="mt-1 text-[10px] text-slate-500">{meta}</p><div className="mt-4 max-h-[28rem] overflow-y-auto text-sm leading-relaxed text-slate-300"><ChatMarkdown content={answer} /></div></section>; }

function Metrics({ result }: { result: ComparisonResponse }) {
  const quality = result.metrics.quality;
  const a = quality.pathfinder;
  const d = quality.baseline;
  const rows: Array<[string, number | null, number | null]> = [
    ["Overall quality", a.overall, d.overall],
    ["Relevance", a.relevance, d.relevance],
    ["Factual accuracy", a.factual_accuracy, d.factual_accuracy],
    ["Completeness", a.completeness, d.completeness],
    ["Clarity", a.clarity, d.clarity],
    ["Groundedness", a.groundedness, d.groundedness],
  ];
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#111116] p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-sm font-semibold text-slate-200">Answer quality comparison</h3><p className="mt-1 text-xs text-slate-500">Automated LLM-as-judge evaluation. Answers presented anonymously to reduce bias. Not human-validated.</p></div><span className="text-xs font-mono text-cyan-300">PathFinder {a.overall.toFixed(1)} · Baseline {d.overall.toFixed(1)}</span></div>
      <div className="space-y-3">{rows.map(([label, valueA, valueD]) => <div key={label}><div className="mb-1 flex justify-between text-xs"><span className="text-slate-400">{label}</span><span className="font-mono">{valueA === null ? <span className="text-slate-600 italic">N/A</span> : <span className="text-cyan-300">{valueA}/5</span>}<span className="mx-2 text-slate-700">vs</span>{valueD === null ? <span className="text-slate-600 italic">N/A</span> : <span className="text-rose-300">{valueD}/5</span>}</span></div><div className="grid grid-cols-2 gap-1"><div className="h-2 rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-cyan-400" style={{ width: valueA === null ? 0 : `${valueA * 20}%` }} /></div>{valueD === null ? <div className="h-2 rounded-full bg-white/[0.06] opacity-30"><div className="h-full rounded-full bg-slate-600" style={{ width: "100%" }} /></div> : <div className="h-2 rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-rose-400" style={{ width: `${valueD * 20}%` }} /></div>}</div></div>)}</div>
      <div className="mt-5 grid gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-2"><div><div className="text-[10px] uppercase tracking-wider text-cyan-400">PathFinder evaluator note</div><p className="mt-1 text-xs leading-relaxed text-slate-400">{a.reason}</p></div><div><div className="text-[10px] uppercase tracking-wider text-rose-400">Baseline evaluator note</div><p className="mt-1 text-xs leading-relaxed text-slate-400">{d.reason}</p></div></div>
    </section>
  );
}
/*
  const a = result.metrics.condition_a;
  const d = result.metrics.condition_d;
  const tierAllocation = ["T1", "T2", "T3"]
    .map((tier) => `${tier} ${a.tier_distribution[tier as keyof typeof a.tier_distribution] ?? 0}`)
    .join(" · ");
  const verification = a.faithfulness === null && a.completeness === null
    ? "Not evaluated"
    : `${a.faithfulness ?? "-"} / ${a.completeness ?? "-"} (1-5)`;
  const rows: Array<[string, string, string]> = [
    ["Mastery used", a.mastery_used === null ? "N/A" : `${Math.round(a.mastery_used * 100)}%`, "N/A"],
    ["Retrieved chunks", String(a.chunks_found), "0"],
    ["Knowledge sources", String(a.source_count), "0"],
    ["Retrieval confidence", a.retrieval_confidence === null ? "N/A" : `${Math.round(a.retrieval_confidence * 100)}%`, "N/A"],
    ["PathFinder", a.pathfinder?.escalated ? "Escalated" : "Direct", "N/A"],
    ["Tier allocation", tierAllocation, "None"],
    ["Faithfulness / completeness", verification, "Not evaluated"],
    ["Answer length", `${a.answer_characters.toLocaleString()} chars`, `${d.answer_characters.toLocaleString()} chars`],
  ];
  return (
    <section className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#111116]">
      <div className="min-w-[520px]">
        <div className="grid grid-cols-[1.5fr_1fr_1fr] border-b border-white/[0.06] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500"><span>Metric</span><span className="text-cyan-400">PathFinder</span><span className="text-rose-400">Baseline</span></div>
        {rows.map(([label, valueA, valueD]) => <div key={label} className="grid grid-cols-[1.5fr_1fr_1fr] border-b border-white/[0.04] px-5 py-3 text-xs last:border-0"><span className="text-slate-400">{label}</span><span className="font-mono text-slate-200">{valueA}</span><span className="font-mono text-slate-500">{valueD}</span></div>)}
      </div>
    </section>
  );
}*/