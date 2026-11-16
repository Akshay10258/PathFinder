"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BrainCircuit, MessageSquare, Dumbbell, LayoutDashboard,
  Map, UserCircle2, FlaskConical, GitCompare, LogOut, Zap,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/lib/AuthProvider";
import { useApi } from "@/lib/useApi";
import type { ProfileResponse } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/tutor", label: "Tutor", icon: MessageSquare, description: "Ask anything DSA" },
  { href: "/practice", label: "Practice", icon: Dumbbell, description: "Adaptive questions" },
  { href: "/dashboard", label: "Mastery", icon: LayoutDashboard, description: "Knowledge map" },
  { href: "/roadmap", label: "Roadmap", icon: Map, description: "Study plan" },
  { href: "/profile", label: "Profile", icon: UserCircle2, description: "Your progress" },
  { href: "/comparison", label: "Live Compare", icon: GitCompare, description: "A/B responses" },
  { href: "/evidence", label: "Evidence", icon: FlaskConical, description: "Research metrics" },
];

/* Technique pills shown below the logo — communicates what's running under the hood */
const TECHNIQUES = ["SAKT", "RAG", "Forgetting Curve", "Misconception Detection"];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, devMode, devStudentId } = useAuth();
  const api = useApi();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    api.getProfile().then(setProfile).catch(() => {});
    // Ping backend health to show the status indicator
    fetch((process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000") + "/api/health")
      .then((r) => setBackendOnline(r.ok))
      .catch(() => setBackendOnline(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="w-full md:w-[272px] border-b md:border-b-0 md:border-r border-white/[0.06] bg-[#0c0c10] flex max-h-[9.5rem] md:max-h-none flex-col shrink-0 md:h-full">
      {/* --- Brand Header --- */}
      <div className="p-3 pb-2 sm:p-5 sm:pb-4">
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500/25 to-cyan-500/15 rounded-xl border border-indigo-500/20">
            <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent leading-tight">
              PathFinder
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-[0.15em] font-medium">
              Mastery-Adaptive DSA Tutor
            </p>
          </div>
        </div>

        {/* Technique pills — reviewer awareness */}
        <div className="hidden sm:flex flex-wrap gap-1 mb-3">
          {TECHNIQUES.map((t) => (
            <span
              key={t}
              className="text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/8 text-indigo-400/70 border border-indigo-500/10"
            >
              {t}
            </span>
          ))}
        </div>

        {/* System status */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className={clsx(
            "w-1.5 h-1.5 rounded-full",
            backendOnline ? "bg-emerald-400 shadow-[0_0_4px_theme(colors.emerald.400)]" : "bg-rose-400"
          )} />
          <span className="text-slate-500">
            {backendOnline ? "System Active" : "Backend Offline"}
          </span>
          <span className="ml-auto text-slate-600 font-mono">v2.0</span>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* --- Navigation --- */}
      <nav className="flex-1 flex md:block min-w-0 overflow-x-auto overscroll-x-contain px-2 py-1.5 md:py-3 space-x-1 md:space-x-0 md:space-y-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative flex shrink-0 items-center gap-2 md:gap-3 px-2.5 md:px-3 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all duration-200",
                active ? "text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
              )}
            >
              {active && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 bg-gradient-to-r from-indigo-500/15 to-violet-500/10 border border-indigo-500/25 rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <Icon className="w-4 h-4 relative z-10" />
              <div className="relative z-10 min-w-0">
                <span className="block leading-tight">{item.label}</span>
                <span className="hidden md:block text-[10px] text-slate-500 font-normal leading-tight">{item.description}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between px-3 py-1.5 md:hidden">
        <Link href="/profile" className="flex min-w-0 items-center gap-2 text-xs text-slate-300">
          <span className="text-lg leading-none">{profile?.avatar_emoji || "🧑‍💻"}</span>
          <span className="max-w-[9rem] truncate">{profile?.display_name || (devMode ? devStudentId : "Profile")}</span>
        </Link>
        {!devMode && (
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/[0.03] hover:text-rose-400"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* --- User Footer --- */}
      <div className="hidden md:block p-3">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-2.5 py-2 mb-1.5 rounded-xl hover:bg-white/[0.03] transition-colors"
        >
          <span className="text-2xl leading-none">{profile?.avatar_emoji || "🧑‍💻"}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-slate-200 truncate">
              {profile?.display_name || (devMode ? devStudentId : "...")}
            </div>
            {profile?.is_demo && (
              <span className="text-[9px] text-amber-400 uppercase tracking-wider font-semibold">Demo Account</span>
            )}
            {devMode && !profile?.is_demo && (
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">Local Dev</span>
            )}
          </div>
        </Link>
        {!devMode && (
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-white/[0.03]"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        )}
      </div>
    </div>
  );
}
