import React, { useState, useEffect } from 'react';
import { Sun, Moon, Sparkles, CheckCircle2, Plus } from 'lucide-react';
import { MorningEntry, EveningEntry } from '../types';

interface QuickModeFormProps {
  type: 'morning' | 'evening';
  entry?: MorningEntry | EveningEntry;
  onSubmit: (entry: MorningEntry | EveningEntry) => void;
  onCancel: () => void;
}

export const QuickModeForm: React.FC<QuickModeFormProps> = ({ type, entry, onSubmit, onCancel }) => {
  const [gratitude, setGratitude] = useState('');
  const [secondQuestion, setSecondQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // エントリーがある場合はプリフィル
  useEffect(() => {
    if (entry) {
      if (type === 'morning') {
        const morningEntry = entry as MorningEntry;
        setGratitude(morningEntry.gratitude?.[0] || '');
        setSecondQuestion(morningEntry.todayGoal || '');
      } else {
        const eveningEntry = entry as EveningEntry;
        setGratitude(eveningEntry.goodThings?.[0] || '');
        setSecondQuestion(eveningEntry.kindness || '');
      }
    }
  }, [entry, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (type === 'morning') {
      const entry: MorningEntry = {
        gratitude: [gratitude].filter(g => g.trim()),
        todayGoal: secondQuestion
      };
      await onSubmit(entry);
    } else {
      const entry: EveningEntry = {
        goodThings: [gratitude].filter(g => g.trim()),
        kindness: secondQuestion
      };
      await onSubmit(entry);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-6 fade-in duration-700">
      <div className="glass-panel p-8 md:p-10 rounded-[3rem] relative space-y-8">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-200 to-teal-200 rounded-t-[3rem] opacity-50" />

        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-300 to-teal-400 rounded-2xl text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-200 rotate-6 transform transition-transform hover:rotate-12">
            {type === 'morning' ? <Sun size={32} strokeWidth={2.5} /> : <Moon size={32} strokeWidth={2.5} />}
          </div>
          <h2 className="text-2xl font-black text-slate-800 pt-2 tracking-tight">
            {type === 'morning' ? 'クイック・モーニング' : 'クイック・イブニング'}
          </h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">
            {type === 'morning' ? 'Quick Morning' : 'Quick Evening'}
          </p>
          <p className="text-sm text-slate-500 mt-2">
            {type === 'morning'
              ? '1分で、今日の感謝と意図をセットしよう 💚'
              : '今日を振り返って、自分を労わろう 💙'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest ml-4">
              {type === 'morning'
                ? <>☀ 今朝、最初に感じた感謝は？</>
                : <>✨ 今日、心に残った瞬間は？</>
              }
            </label>
            <input
              type="text"
              placeholder={type === 'morning' ? '例：朝のコーヒーの香り' : '例：夕日の美しい空'}
              className="w-full px-6 py-4 rounded-2xl glass-input outline-none font-bold text-slate-700 placeholder:text-slate-300/80 shadow-sm"
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest ml-4">
              {type === 'morning'
                ? <>🌱 今日をどう過ごしたい？</>
                : <>💙 自分への優しい言葉は？</>
              }
            </label>
            <input
              type="text"
              placeholder={type === 'morning' ? '例：穏やかな気持ちで' : '例：今日もよく頑張ったね'}
              className="w-full px-6 py-4 rounded-2xl glass-input outline-none font-bold text-slate-700 placeholder:text-slate-300/80 shadow-sm"
              value={secondQuestion}
              onChange={(e) => setSecondQuestion(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-sm hover:bg-slate-200 transition-colors"
            >
              もっと書きたい
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !gratitude.trim() || !secondQuestion.trim()}
              className={`flex-1 py-4 bg-gradient-to-r ${
                type === 'morning'
                  ? 'from-amber-400 to-orange-500'
                  : 'from-indigo-500 to-purple-600'
              } text-white rounded-[2rem] font-black text-sm shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  <span>これだけで十分</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Encouragement Message */}
      <div className="glass-panel p-6 rounded-[2rem] text-center space-y-3">
        <p className="text-sm text-slate-600 leading-relaxed">
          {type === 'morning'
            ? '小さな1歩から、大きな変化が始まる。\nあなたの心がけることが、すべてです。✨'
            : '今日を生き抜いた自分を、心から褒めてあげて。\n静かな夜、あなたの存在だけで十分です。🌙'
          }
        </p>
      </div>
    </div>
  );
};
