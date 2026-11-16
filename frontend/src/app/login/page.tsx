"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BrainCircuit, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { DEMO_ACCOUNTS } from "@/lib/demoAccounts";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, devMode } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      router.push("/tutor");
    }
  };

  const loginAsDemo = async (demoEmail: string, demoPassword: string) => {
    setLoading(true);
    setError("");
    const { error } = await signIn(demoEmail, demoPassword);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      router.push("/tutor");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a] text-slate-200 p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
            <BrainCircuit className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Welcome back to PathFinder
          </h1>
          <p className="text-sm text-slate-500 text-center">Sign in to continue where your mastery left off.</p>
        </div>

        {devMode ? (
          <div className="mb-5 space-y-4">
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm text-indigo-200">
              <p className="font-semibold mb-1">Local Demo Mode Active</p>
              <p className="text-xs text-indigo-300/80">The system is running on local storage with pre-seeded demo data (276 practice attempts, 13 mastered topics).</p>
            </div>
            <button
              onClick={() => loginAsDemo("demo@example.com", "password")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enter Interactive Demo"}
            </button>
          </div>
        ) : (
          <div className="mb-5 space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider text-center">Try it instantly</p>
            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map((demo) => (
                <button
                  key={demo.email}
                  onClick={() => loginAsDemo(demo.email, demo.password)}
                  disabled={loading}
                  className="flex items-center justify-between px-4 py-2.5 bg-[#111116] border border-white/10 hover:border-indigo-500/40 rounded-xl transition-colors text-left disabled:opacity-50"
                >
                  <span className="flex items-center gap-2 text-sm text-slate-200">
                    <span>{demo.emoji}</span> {demo.label}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] text-slate-600 uppercase">or sign in</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          </div>
        )}

        {!devMode && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#16161e] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#16161e] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
            />

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-slate-500 mt-6">
          New here?{" "}
          <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Create an account
          </Link>
        </p>
        <p className="text-center text-xs text-slate-600 mt-2">
          <Link href="/">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  );
}
