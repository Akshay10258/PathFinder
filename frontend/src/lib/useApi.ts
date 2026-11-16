"use client";

import { useAuth } from "./AuthProvider";
import { createApiClient } from "./api";

/** The one place a page should get its API client from — attaches whichever
 * auth header backend/auth.py currently accepts (real session, or the
 * dev-mode header before Supabase is configured) automatically. Building
 * the client is cheap (a plain headers object), so this deliberately isn't
 * memoized — that's what conflicted with React Compiler's own inference
 * here (its dependency tracking on `session` didn't match the narrower
 * `session?.access_token` this depended on). */
export function useApi() {
  const { session, devMode, devStudentId } = useAuth();

  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  if (devMode && devStudentId) {
    headers["X-Dev-Student-Id"] = devStudentId;
  }
  return createApiClient(headers);
}
