// src/services/settings.js
import { getSupabase } from './supabaseClient';

export async function fetchSettings() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
  if (error) throw error;
  return {
    easy: Number(data.easy_weight),
    medium: Number(data.medium_weight),
    hard: Number(data.hard_weight),
  };
}

export async function saveSettings(weights) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('settings')
    .update({
      easy_weight: weights.easy,
      medium_weight: weights.medium,
      hard_weight: weights.hard,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);
  if (error) throw error;
}
