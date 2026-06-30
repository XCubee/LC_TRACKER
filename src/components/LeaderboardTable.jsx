// src/components/LeaderboardTable.jsx
import { Trophy, AlertCircle } from 'lucide-react';

const RANK_STYLES = {
  1: { row: 'bg-gradient-to-r from-amber-400/20 via-yellow-300/10 to-transparent border-l-4 border-amber-400 shadow-[inset_0_0_20px_rgba(251,191,36,0.12)]', badge: 'text-amber-300' },
  2: { row: 'bg-gradient-to-r from-slate-400/20 via-slate-300/10 to-transparent border-l-4 border-slate-300 shadow-[inset_0_0_20px_rgba(203,213,225,0.1)]', badge: 'text-slate-300' },
  3: { row: 'bg-gradient-to-r from-orange-400/20 via-orange-300/10 to-transparent border-l-4 border-orange-400 shadow-[inset_0_0_20px_rgba(249,115,22,0.12)]', badge: 'text-orange-300' },
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

export default function LeaderboardTable({ students, activeTab }) {
  const cols = SCOPE_COLUMNS[activeTab];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/90 shadow-2xl shadow-slate-950/40">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-800/90 text-slate-300 uppercase text-xs tracking-wider">
          <tr>
            <th className="px-4 py-3 font-semibold">Rank</th>
            <th className="px-4 py-3 font-semibold">Student</th>
            <th className="px-4 py-3 text-center font-semibold text-emerald-400">Easy</th>
            <th className="px-4 py-3 text-center font-semibold text-amber-400">Medium</th>
            <th className="px-4 py-3 text-center font-semibold text-rose-400">Hard</th>
            <th className="px-4 py-3 text-right font-semibold">{cols.metricLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {students.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
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
              <tr key={student.id} className={`${rowStyle} hover:bg-slate-800/70 transition-colors`}>
                <td className="px-4 py-3">
                  <RankCell rank={student.rank} />
                </td>
                <td className="px-4 py-3 font-semibold text-slate-100">
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://leetcode.com/${student.username}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-100 hover:text-indigo-400 transition font-semibold"
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
                <td className="px-4 py-3 text-center font-semibold text-emerald-300">{hasDifficultyBreakdown ? student[cols.easy] : '-'}</td>
                <td className="px-4 py-3 text-center font-semibold text-amber-300">{hasDifficultyBreakdown ? student[cols.medium] : '-'}</td>
                <td className="px-4 py-3 text-center font-semibold text-rose-300">{hasDifficultyBreakdown ? student[cols.hard] : '-'}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-100">
                  {Number.isFinite(student.activeValue) ? student.activeValue : 0}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
