import { createClient } from "@supabase/supabase-js";

const buildSupabaseUrl = typeof __SUPABASE_URL__ === "string" ? __SUPABASE_URL__ : "";
const buildSupabaseAnonKey = typeof __SUPABASE_ANON_KEY__ === "string" ? __SUPABASE_ANON_KEY__ : "";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL ?? buildSupabaseUrl;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  buildSupabaseAnonKey;

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
export const isSupabaseConfigured = Boolean(supabase);
export const supabaseConfigStatus = {
  configured: isSupabaseConfigured,
  hasUrl: Boolean(supabaseUrl),
  hasKey: Boolean(supabaseAnonKey),
};
