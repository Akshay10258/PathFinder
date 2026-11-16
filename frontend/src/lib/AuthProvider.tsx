"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase";

const DEV_STUDENT_ID_KEY = "pathfinder_dev_student_id";

type AuthState = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  /** True when NEXT_PUBLIC_SUPABASE_* isn't set — falls back to a local
   * per-browser dev identity, mirroring the backend's ALLOW_ANONYMOUS_DEV_MODE
   * escape hatch (backend/auth.py) so the app keeps working before a
   * Supabase project exists. */
  devMode: boolean;
  devStudentId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [devStudentId, setDevStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      // Force 'demo_user' to connect to the rich seeded local database
      const id = "demo_user";
      window.localStorage.setItem(DEV_STUDENT_ID_KEY, id);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDevStudentId(id);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      // In dev mode without Supabase, any login is a no-op that just succeeds.
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    if (!supabase) {
      return { error: null };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        user: session?.user ?? null,
        session,
        devMode: !supabaseConfigured,
        devStudentId,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
