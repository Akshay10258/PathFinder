"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, devMode } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !devMode && !user) {
      router.replace("/login");
    }
  }, [loading, devMode, user, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!devMode && !user) {
    return null; // redirecting
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col md:flex-row bg-[#0a0a0a] text-slate-200 overflow-hidden selection:bg-indigo-500/30">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#13131a] via-[#0a0a0a] to-[#0a0a0a]">
        {children}
      </div>
    </div>
  );
}
