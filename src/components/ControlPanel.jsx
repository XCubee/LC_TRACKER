// src/components/ControlPanel.jsx
import { Settings2, Save, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { saveSettings } from '../services/settings';

export default function ControlPanel({ weights, setWeights }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (key) => (e) => {
    const value = e.target.value;
    const parsed = value === '' ? '' : Math.max(0, Number(value));
    setWeights((prev) => ({ ...prev, [key]: parsed }));
  };

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await saveSettings({
        easy: Number(weights.easy) || 0,
        medium: Number(weights.medium) || 0,
        hard: Number(weights.hard) || 0,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { key: 'easy', label: 'Easy Weight', color: 'text-emerald-400', ring: 'focus:ring-emerald-500' },
    { key: 'medium', label: 'Medium Weight', color: 'text-amber-400', ring: 'focus:ring-amber-500' },
    { key: 'hard', label: 'Hard Weight', color: 'text-rose-400', ring: 'focus:ring-rose-500' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-slate-400" />
          <h2 className="text-slate-200 font-semibold text-lg">Scoring Configuration</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 transition px-3 py-1.5 rounded-lg text-slate-300"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Saved!' : 'Save for everyone'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {fields.map(({ key, label, color, ring }) => (
          <label key={key} className="flex flex-col gap-1.5">
            <span className={`text-sm font-medium ${color}`}>{label}</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={weights[key]}
              onChange={handleChange(key)}
              className={`bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 outline-none focus:ring-2 ${ring} transition`}
            />
          </label>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-3">
        Score = (Easy × {weights.easy || 0}) + (Medium × {weights.medium || 0}) + (Hard × {weights.hard || 0}).
        Weights update the leaderboard instantly; "Save for everyone" persists them to Supabase so all students see the same config.
      </p>
    </div>
  );
}
