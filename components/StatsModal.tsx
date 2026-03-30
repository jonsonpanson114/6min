import React from 'react';
import { X, Flame, Trophy, TrendingUp } from 'lucide-react';
import { UserStats, GROWTH_LEVELS } from '../types';

interface StatsViewModalProps {
  stats: UserStats;
  isOpen: boolean;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsViewModalProps> = ({ stats, isOpen, onClose }) => {
  if (!isOpen) return null;

  const currentLevel = [...GROWTH_LEVELS].reverse().find(l => stats.xp >= l.minXp) || GROWTH_LEVELS[0];
  const nextLevel = GROWTH_LEVELS.find(l => l.minXp > stats.xp);
  const progressToNext = nextLevel
    ? Math.min(100, ((stats.xp - currentLevel.minXp) / (nextLevel.minXp - currentLevel.minXp)) * 100)
    : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel rounded-[3rem] p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-slate-800">あなたの歩み</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Level Card */}
          <div className="glass-input p-4 rounded-2xl text-center space-y-2">
            <span className="text-4xl filter drop-shadow-md">{currentLevel.icon}</span>
            <p className={`text-sm font-black uppercase tracking-widest ${currentLevel.color}`}>
              {currentLevel.name}
            </p>
            <p className="text-xs text-slate-500">LV.{currentLevel.level}</p>
          </div>

          {/* Streak Card */}
          <div className="glass-input p-4 rounded-2xl text-center space-y-2">
            <Flame size={32} className="text-orange-500 mx-auto animate-pulse" fill="currentColor" />
            <p className="text-2xl font-black text-slate-800">{stats.streak}</p>
            <p className="text-xs text-slate-500 font-bold uppercase">日連続</p>
          </div>
        </div>

        {/* XP Progress */}
        <div className="glass-input p-6 rounded-2xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-700">総経験値</span>
            <span className="text-2xl font-black text-slate-800">{stats.xp} <span className="text-sm text-slate-500">XP</span></span>
          </div>
          {nextLevel && (
            <>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-rose-400 via-indigo-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${progressToNext}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 w-full animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>次のレベルまで</span>
                <span className="font-bold">{Math.round(progressToNext)}%</span>
              </div>
            </>
          )}
        </div>

        {/* Total Entries */}
        <div className="glass-input p-4 rounded-2xl mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy size={24} className="text-amber-500" />
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">総エントリー数</p>
              <p className="text-xl font-black text-slate-800">{stats.totalEntries}</p>
            </div>
          </div>
          <TrendingUp size={20} className="text-emerald-500" />
        </div>

        {/* Skips This Month */}
        {stats.skipsThisMonth !== undefined && (
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-500">
              今月のスキップ: <span className="font-bold text-slate-700">{stats.skipsThisMonth}/3</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
