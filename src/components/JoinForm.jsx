// src/components/JoinForm.jsx
import { useState } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import { registerStudent } from '../services/students';

export default function JoinForm({ onJoined }) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registerStudent(username, displayName);
      setUsername('');
      setDisplayName('');
      onJoined?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 flex flex-col sm:flex-row gap-3 sm:items-end"
    >
      <label className="flex-1 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-300">LeetCode Username *</span>
        <input
          type="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. neal_wu"
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </label>
      <label className="flex-1 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-300">Display Name (optional)</span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="How it shows on the board"
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 transition px-4 py-2 rounded-lg font-medium text-sm h-[42px]"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        {loading ? 'Joining...' : 'Join Leaderboard'}
      </button>
      {error && <p className="text-sm text-red-400 sm:basis-full">{error}</p>}
    </form>
  );
}
