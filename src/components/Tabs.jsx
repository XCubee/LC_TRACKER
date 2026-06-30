// src/components/Tabs.jsx
import { Trophy, ListOrdered, Sun, CalendarDays } from 'lucide-react';

const TABS = [
  { key: 'score', label: 'Weighted Score', icon: Trophy },
  { key: 'total', label: 'Total Solved', icon: ListOrdered },
  { key: 'today', label: 'Today', icon: Sun },
  { key: 'week', label: 'This Week', icon: CalendarDays },
];

export default function Tabs({ activeTab, setActiveTab }) {
  return (
    <div className="flex gap-1 mb-6 border-b border-slate-700 overflow-x-auto bg-slate-900/70 rounded-t-xl px-1 py-1 shadow-sm">
      {TABS.map(({ key, label, icon: Icon }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-t-lg transition border-b-2 -mb-px whitespace-nowrap
              ${
                isActive
                  ? 'text-indigo-300 border-indigo-400 bg-slate-800 shadow-sm'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/70'
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
