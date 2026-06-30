// src/components/LeaderboardTable.jsx
import { Trophy, AlertCircle, X } from 'lucide-react';
import { removeStudent } from '../services/students';

const RANK_STYLES = {
  1: { row: 'bg-gradient-to-r from-yellow-500/15 to-transparent border-l-4 border-yellow-400', badge: 'text-yellow-400' },
  2: { row: 'bg-gradient-to-r from-slate-400/15 to-transparent border-l-4 border-slate-300', badge: 'text-slate-300' },
  3: { row: 'bg-gradient-to-r from-orange-600/15 to-transparent border-l-4 border-orange-500', badge: 'text-orange-500' },
};

const SCOPE_COLUMNS = {
  total: { easy: 'easySolved', medium: 'mediumSolved', hard: 'hardSolved', metricLabel: 'Total Solved' },
  score: { easy: 'easySolved', medium: 'mediumSolved', hard: 'hardSolved', metricLabel: 'Score' },
  today: { easy: 'easyToday', medium: 'mediumToday', hard: 'hardToday', metricLabel: 'Solved Today' },
  week: { easy: 'easyWeek', medium: 'mediumWeek', hard: 'hardWeek', metricLabel: 'Solved This Week' },
};

function RankCell({ rank }) {
  const style = RANK_STYLES[rank];
  if (!style) return <span className="text-slate-400 font-medium pl-4">{rank}</span>;
  return (
    <span className={`flex items-center gap-1.5 font-bold ${style.badge}`}>
      <Trophy className="w-4 h-4" />
      {rank}
    </span>
  );
}

export default function LeaderboardTable({ students, activeTab, onChanged }) {
  const cols = SCOPE_COLUMNS[activeTab];

  async function handleRemove(id, username) {
    if (!confirm(`Remove ${username} from the leaderboard?`)) return;
    await removeStudent(id);
    onChanged?.();
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-900 text-slate-400 uppercase text-xs tracking-wider">
          <tr>
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">Student</th>
            <th className="px-4 py-3 text-center text-emerald-400">Easy</th>
            <th className="px-4 py-3 text-center text-amber-400">Medium</th>
            <th className="px-4 py-3 text-center text-rose-400">Hard</th>
            <th className="px-4 py-3 text-right">{cols.metricLabel}</th>
            <th className="px-2 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {students.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                No students yet — be the first to join above!
              </td>
            </tr>
          )}
          {students.map((student) => {
            const rowStyle = RANK_STYLES[student.rank]?.row ?? '';
            const hasDifficultyBreakdown =
              activeTab === 'today'
                ? student.hasTodayDifficultyBreakdown
                : activeTab === 'week'
                  ? student.hasWeekDifficultyBreakdown
                  : true;
            return (
              <tr key={student.id} className={`${rowStyle} hover:bg-slate-800/40 transition-colors group`}>
                <td className="px-4 py-3">
                  <RankCell rank={student.rank} />
                </td>
                <td className="px-4 py-3 font-medium text-slate-100">
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://leetcode.com/${student.username}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-indigo-400 transition"
                    >
                      {student.displayName || student.username}
                    </a>
                    {!student.hasData && (
                      <span title="No data yet — will appear after next sync">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-emerald-300">{hasDifficultyBreakdown ? student[cols.easy] : '-'}</td>
                <td className="px-4 py-3 text-center text-amber-300">{hasDifficultyBreakdown ? student[cols.medium] : '-'}</td>
                <td className="px-4 py-3 text-center text-rose-300">{hasDifficultyBreakdown ? student[cols.hard] : '-'}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-100">
                  {Number.isFinite(student.activeValue) ? student.activeValue : 0}
                </td>
                <td className="px-2 py-3">
                  <button
                    onClick={() => handleRemove(student.id, student.username)}
                    className="opacity-0 group-hover:opacity-100 transition text-slate-600 hover:text-red-400"
                    title="Remove from leaderboard"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
