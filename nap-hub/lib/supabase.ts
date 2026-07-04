import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-side admin client (service role). Only used in API routes / server
// components — never shipped to the browser. Returns null if not configured,
// so the site still renders before Supabase is connected.
export function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
