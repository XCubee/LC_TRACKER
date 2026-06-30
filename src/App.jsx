// src/App.jsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import { RefreshCw, Code2 } from 'lucide-react';
import { fetchLeaderboardData, syncAllStudents } from './services/students';
import { fetchSettings } from './services/settings';
import { rankStudents } from './utils/scoring';
import { supabase, supabaseConfigError } from './services/supabaseClient';
import JoinForm from './components/JoinForm';
import Tabs from './components/Tabs';
import LeaderboardTable from './components/LeaderboardTable';

const DEFAULT_WEIGHTS = { easy: 1, medium: 3, hard: 5 };

export default function App() {
  const [students, setStudents] = useState([]);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [activeTab, setActiveTab] = useState('score');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(supabaseConfigError);

  const loadData = useCallback(async () => {
    setError(null);
    const data = await fetchLeaderboardData();
    setStudents(data);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [savedWeights] = await Promise.all([fetchSettings(), loadData()]);
        setWeights(savedWeights);
      } catch (err) {
        setError(err.message || 'Failed to load leaderboard data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData]);

  // Live-update the board whenever students join/leave or new snapshots
  // land (e.g. another student's "Refresh All" click, or the cron job).
  useEffect(() => {
    if (!supabase) return undefined;

    const channel = supabase
      .channel('leaderboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'snapshots' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  async function handleRefreshAll() {
    setSyncing(true);
    setError(null);
    try {
      await syncAllStudents();
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to refresh leaderboard data.');
    } finally {
      setSyncing(false);
    }
  }

  const normalizedWeights = useMemo(
    () => ({
      easy: Number(weights.easy) || 0,
      medium: Number(weights.medium) || 0,
      hard: Number(weights.hard) || 0,
    }),
    [weights]
  );

  const rankedStudents = useMemo(
    () => rankStudents(students, normalizedWeights, activeTab),
    [students, normalizedWeights, activeTab]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/15 p-2.5 rounded-xl">
              <Code2 className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">LeetCode Class Leaderboard</h1>
              <p className="text-slate-400 text-sm">Self-serve, live, and updates for everyone in real time</p>
            </div>
          </div>

          <button
            onClick={handleRefreshAll}
            disabled={syncing}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-400 transition px-4 py-2 rounded-lg font-medium text-sm self-start sm:self-auto text-white"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Refreshing...' : 'Refresh All'}
          </button>
        </header>

        <JoinForm onJoined={loadData} />

        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading leaderboard...</div>
        ) : (
          <>
            <LeaderboardTable students={rankedStudents} activeTab={activeTab} onChanged={loadData} />
            <div className="flex flex-wrap items-center justify-between gap-2 mt-4 text-xs text-slate-400">
              <span>{lastUpdated && `Last refreshed ${lastUpdated.toLocaleTimeString()}`}</span>
              <span>{students.length} student{students.length === 1 ? '' : 's'} on the board</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
