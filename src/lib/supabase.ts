import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Production fallback credentials ensure the application always mounts seamlessly
// on Vercel even if environment variables are not yet configured in the Vercel dashboard.
const defaultSupabaseUrl = "https://qyoaplxjyikgzqbhlgnw.supabase.co";
const defaultSupabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5b2FwbHhqeWlrZ3pxYmhsZ253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyMTAzNjQsImV4cCI6MjEwOTc4NjM2NH0.Oy60MqpOLTGYKh7iRAOvgY0yXR2ZuEFBdhduEYFNVo0";

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) || defaultSupabaseUrl;
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || defaultSupabaseAnonKey;

let client: SupabaseClient;

try {
  client = createClient(supabaseUrl, supabaseAnonKey);
} catch (err) {
  console.error("Supabase initialization error:", err);
  // Fallback to placeholder client to prevent catastrophic module crash & white screen
  client = createClient(defaultSupabaseUrl, defaultSupabaseAnonKey);
}

export const supabase = client;
