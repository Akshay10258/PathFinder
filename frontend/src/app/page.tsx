"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  ArrowRight,
  MessageSquare,
  Dumbbell,
  LayoutDashboard,
  Map,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "A tutor that reads the room",
    body: "The same question retrieves different source material — and a different explanation — for a beginner versus an advanced student. Not tone dressed up by a prompt: the retrieval pipeline itself shifts between formal, practical, and intuitive sources.",
    tier: "T1 · T2 · T3",
  },
  {
    icon: Dumbbell,
    title: "Practice that actually grades itself",
    body: "Generated questions are verified answerable from real course material before you ever see them. Your answers are graded by fusing semantic similarity, concept coverage, and holistic judgment — not a keyword match.",
    tier: "Grounded",
  },
  {
    icon: LayoutDashboard,
    title: "Mastery that updates as you go",
    body: "A Self-Attentive Knowledge Tracing model tracks what you actually know, per topic — not a slider you set yourself. It transfers what it learns across related concepts, the same way a real tutor would.",
    tier: "SAKT",
  },
  {
    icon: Map,
    title: "A roadmap that respects prerequisites",
    body: "An LLM reasons over a real prerequisite graph to sequence what to study next, grounds every step in your actual course material, and checks its own work before showing it to you.",
    tier: "Self-correcting",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-slate-200">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 md:px-10 py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
            <BrainCircuit className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="font-bold text-slate-100">PathFinder</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 md:px-10 pt-16 pb-20 max-w-4xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 mb-6">
            <Sparkles className="w-3 h-3" /> Mastery-adaptive tutoring for Data Structures & Algorithms
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-50 leading-tight tracking-tight mb-6">
            Most tutors adjust their <span className="text-indigo-400">tone</span>.
            <br />
            PathFinder adjusts <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">what it retrieves</span>.
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A closed loop: retrieval and explanations adapt to a mastery score that Knowledge Tracing
            updates from your real practice answers — which a self-correcting roadmap then uses to decide
            what you study next. Every piece feeds the next.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
            >
              Start learning <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-slate-200 font-medium rounded-xl transition-colors border border-white/10"
            >
              Try a demo account
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Feature grid */}
      <section className="px-6 md:px-10 py-16 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-[#111116] border border-white/10 rounded-2xl p-6 hover:border-indigo-500/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                    <Icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{f.tier}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-100 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.body}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Trust strip */}
      <section className="px-6 md:px-10 py-12 max-w-4xl mx-auto">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs">Every answer is grounded in CLRS, GeeksForGeeks, and MIT OCW — never unconstrained model knowledge</span>
          </div>
        </div>
      </section>

      <footer className="px-6 md:px-10 py-8 max-w-6xl mx-auto flex items-center justify-between border-t border-white/5 text-xs text-slate-600">
        <span>PathFinder — a mastery-adaptive tutoring system for DSA</span>
        <span>Grounded retrieval · Knowledge Tracing · Adaptive Practice · Personalized Roadmap</span>
      </footer>
    </div>
  );
}
