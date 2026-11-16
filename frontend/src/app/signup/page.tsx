"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BrainCircuit, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";

export default function SignupPage() {
  const { signUp, devMode } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await signUp(email, password, displayName);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a] text-slate-200 p-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-sm space-y-4">
          <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 inline-flex">
            <BrainCircuit className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-lg font-bold text-slate-100">Check your inbox</h1>
          <p className="text-sm text-slate-400">
            We sent a confirmation link to <span className="text-slate-200">{email}</span>. Once confirmed, sign in
            to start your mastery journey.
          </p>
          <Link href="/login" className="inline-block text-sm text-indigo-400 hover:text-indigo-300 font-medium">
            Go to sign in →
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a] text-slate-200 p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
            <BrainCircuit className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Start your mastery journey
          </h1>
          <p className="text-sm text-slate-500 text-center">
            A free account that remembers your progress across every session.
          </p>
        </div>

        {devMode && (
          <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            Running in local dev mode — no Supabase project is configured yet, so sign-up is a no-op. See
            DATABASE.md.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-[#16161e] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
          />
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
            minLength={6}
            placeholder="Password (min. 6 characters)"
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Sign in
          </Link>
        </p>
        <p className="text-center text-xs text-slate-600 mt-2">
          <Link href="/">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  );
}
