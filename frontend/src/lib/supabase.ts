import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Used only for auth (sign up / sign in / session management). All data
// operations go through the FastAPI backend (see lib/api.ts), which uses
// the service role key server-side — the frontend never queries the
// database directly. See DATABASE.md.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const supabaseConfigured = Boolean(url && anonKey);
