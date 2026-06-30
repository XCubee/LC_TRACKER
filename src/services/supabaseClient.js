// src/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError =
  !url || !anonKey
    ? 'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your project values.'
    : null;

if (supabaseConfigError) {
  console.error(supabaseConfigError);
}

export const supabase = supabaseConfigError ? null : createClient(url, anonKey);

export function getSupabase() {
  if (!supabase) {
    throw new Error(supabaseConfigError);
  }
  return supabase;
}
