
import React, { useState, useEffect, useMemo } from 'react';
import { DailyLog, MorningEntry, EveningEntry, AIFeedback, UserStats, GROWTH_LEVELS, UserSettings } from './types';
import { generateDailyFeedback, generateSouvenirImage, generateParallelStory, generateVoiceAudio } from './services/geminiService';
import { MusicService } from './services/musicService';
import { InterrogationRoom } from './components/InterrogationRoom';
import {
  Sun, Moon, History, CheckCircle2, Heart, Smile, Star,
  Coffee, Zap, MessageCircle, Loader2, ChevronRight,
  Trophy, TrendingUp, Sparkles, Flame, Image as ImageIcon,
  Wind, Cloud, X, Calendar, PenTool, BookOpen, Settings,
  Music, Mic, Globe
} from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'morning' | 'evening' | 'history' | 'interrogation'>('morning');
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  const [stats, setStats] = useState<UserStats>({ xp: 0, streak: 0, totalEntries: 0 });
  const [loading, setLoading] = useState(false);
  const [todayStr] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [settings, setSettings] = useState<UserSettings>({ personality: 'philosopher' });
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [parallelStory, setParallelStory] = useState<{ story: string; divergencePoint: string; worldDescription: string } | null>(null);
  const [isParallelLoading, setIsParallelLoading] = useState(false);

  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem('ai_diary_logs');
      const savedStats = localStorage.getItem('ai_diary_stats');
      const savedSettings = localStorage.getItem('ai_diary_settings');
      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs);
        if (parsedLogs && typeof parsedLogs === 'object') setLogs(parsedLogs);
      }
      if (savedStats) {
        const parsedStats = JSON.parse(savedStats);
        if (parsedStats) setStats(parsedStats);
      }
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings) setSettings(parsedSettings);
      }
    } catch (e) {
      console.error("Failed to load data", e);
    }
  }, []);

  const currentLevel = useMemo(() => {
    return [...GROWTH_LEVELS].reverse().find(l => stats.xp >= l.minXp) || GROWTH_LEVELS[0];
  }, [stats.xp]);

  const nextLevel = useMemo(() => GROWTH_LEVELS.find(l => l.minXp > stats.xp), [stats.xp]);
  const progressToNext = useMemo(() => {
    if (!nextLevel) return 100;
    return Math.min(100, ((stats.xp - currentLevel.minXp) / (nextLevel.minXp - currentLevel.minXp)) * 100);
  }, [stats.xp, currentLevel, nextLevel]);

  const updateData = (newLogs: Record<string, DailyLog>, xpGain: number = 0) => {
    setLogs(newLogs);
    localStorage.setItem('ai_diary_logs', JSON.stringify(newLogs));
    if (xpGain > 0) {
      const newStats = { ...stats, xp: stats.xp + xpGain, totalEntries: stats.totalEntries + 1 };
      const today = new Date();
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      if (stats.lastEntryDate === yesterdayStr) newStats.streak += 1;
      else if (stats.lastEntryDate !== todayStr) newStats.streak = 1;
      newStats.lastEntryDate = todayStr;
      setStats(newStats);
      localStorage.setItem('ai_diary_stats', JSON.stringify(newStats));
    }
  };

  const updateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem('ai_diary_settings', JSON.stringify(newSettings));
  };

  const currentLog: DailyLog = logs[todayStr] || { date: todayStr, updatedAt: Date.now() };

  const triggerAIFeedback = async (log: DailyLog, withImage: boolean) => {
    setLoading(true);
    try {
      // Get recent history for personalization
      const history = (Object.values(logs) as DailyLog[])
        .filter(l => l.date !== todayStr)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3);

      const jsonStr = await generateDailyFeedback(log, settings.personality, history);
      const feedback: AIFeedback = JSON.parse(jsonStr);
      let imageUrl = log.souvenirImageUrl;

      if (withImage && !imageUrl) {
        imageUrl = (await generateSouvenirImage(log)) || undefined;
      }

      const newLogs = {
        ...logs,
        [todayStr]: { ...log, aiFeedback: feedback, souvenirImageUrl: imageUrl, updatedAt: Date.now() }
      };

      // Auto-play voice if it's jinnai personality and it's evening feedback
      if (settings.personality === 'jinnai' && feedback.eveningComment) {
        // Voice playback logic will be handled here or via a dedicated button
      }

      updateData(newLogs, withImage ? 100 : 50);
    } catch (error) {
      console.error("AI Error:", error);
      alert("AIとの通信に失敗しました。時間をおいて再試行してください。");
    } finally {
      setLoading(false);
    }
  };

  const showParallelWorld = async () => {
    if (!currentLog.evening) {
      alert("パラレルワールドを観測するには、夜の日記が必要です。");
      return;
    }
    setIsParallelLoading(true);
    try {
      const story = await generateParallelStory(currentLog);
      setParallelStory(story);
    } catch (e) {
      console.error(e);
      alert("観測に失敗しました。");
    } finally {
      setIsParallelLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-800 font-sans selection:bg-rose-200 relative overflow-hidden flex flex-col">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-rose-200/50 rounded-full blur-[100px] animate-blob mix-blend-multiply" />
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-indigo-200/50 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply" />
        <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-amber-100/60 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply" />
        <div className="absolute top-[40%] right-[30%] w-72 h-72 bg-purple-200/40 rounded-full blur-[80px] animate-pulse-glow mix-blend-multiply" />
      </div>

      {/* Header */}
      <header className="glass-panel sticky top-4 mx-4 mt-4 rounded-3xl z-40 transition-all duration-300">
        <div className="px-6 py-4 max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3 drop-shadow-sm">
              <Sparkles className="text-amber-400 animate-spin-slow" size={26} fill="currentColor" />
              Soul Canvas
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateSettings({ ...settings, personality: settings.personality === 'philosopher' ? 'jinnai' : 'philosopher' })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${settings.personality === 'jinnai'
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-white/50 border-rose-100 text-slate-600'
                  } shadow-sm backdrop-blur-sm group`}
                title={settings.personality === 'jinnai' ? '陣内モード中' : '哲学者モード中'}
              >
                <Settings size={14} className={`transition-transform duration-500 ${settings.personality === 'jinnai' ? 'rotate-90 text-amber-400' : 'text-slate-400'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {settings.personality === 'jinnai' ? 'JINNAI' : 'NORMAL'}
                </span>
              </button>
              <div className="flex items-center gap-1.5 bg-white/50 px-3 py-1.5 rounded-full border border-rose-100 shadow-sm backdrop-blur-sm">
                <Flame className="text-orange-500 animate-pulse" size={16} fill="currentColor" />
                <span className="text-xs font-black text-slate-700">{stats.streak} <span className="text-[10px] text-slate-500 font-bold uppercase">日連続</span></span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl filter drop-shadow-md transform hover:scale-125 transition-transform cursor-default">{currentLevel.icon}</span>
                <span className={`text-xs font-black uppercase tracking-widest ${currentLevel.color}`}>
                  {currentLevel.name} <span className="opacity-60 text-slate-400">LV.{currentLevel.level}</span>
                </span>
              </div>
              <span className="text-xs font-black text-slate-400">{stats.xp} <span className="text-[10px]">XP</span></span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-rose-400 via-indigo-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${progressToNext}%` }}
              >
                <div className="absolute inset-0 bg-white/30 w-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-8 relative z-10 pb-32">
        {activeTab === 'morning' && (
          <MorningForm
            entry={currentLog.morning}
            onSubmit={(e) => {
              const newLogs = { ...logs, [todayStr]: { ...currentLog, morning: e, updatedAt: Date.now() } };
              updateData(newLogs, !currentLog.morning ? 50 : 0);
              triggerAIFeedback(newLogs[todayStr], false);
            }}
            feedback={currentLog.aiFeedback?.morningComment}
            isLoading={loading}
          />
        )}
        {activeTab === 'evening' && (
          <EveningForm
            entry={currentLog.evening}
            onSubmit={(e) => {
              const newLogs = { ...logs, [todayStr]: { ...currentLog, evening: e, updatedAt: Date.now() } };
              updateData(newLogs, !currentLog.evening ? 50 : 0);
              triggerAIFeedback(newLogs[todayStr], true);
            }}
            feedback={currentLog.aiFeedback?.eveningComment}
            isLoading={loading}
          />
        )}
        {activeTab === 'history' && (
          <HistoryView logs={logs} onSelectLog={setSelectedLog} />
        )}
        {activeTab === 'interrogation' && (
          <InterrogationRoom
            personality={settings.personality}
            onComplete={(e) => {
              const newLogs = { ...logs, [todayStr]: { ...currentLog, evening: e, updatedAt: Date.now() } };
              updateData(newLogs, !currentLog.evening ? 50 : 0);
              triggerAIFeedback(newLogs[todayStr], true);
              setActiveTab('evening'); // Show the results in evening view
            }}
          />
        )}

        {/* AI Insight Card */}
        {currentLog.aiFeedback && activeTab !== 'history' && (
          <div className="mt-12 glass-panel p-8 rounded-[2.5rem] relative overflow-hidden group animate-in slide-in-from-bottom-8 duration-1000">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-300 via-rose-300 to-indigo-300" />

            <div className="text-center space-y-4 relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-amber-100 to-amber-50 rounded-full shadow-sm border border-amber-100">
                <Trophy size={14} className="text-amber-600" />
                <span className="text-xs font-black text-amber-800 tracking-widest uppercase">{currentLog.aiFeedback.dailyTitle}</span>
              </div>

              <div className="py-2">
                <h3 className="text-lg font-bold text-slate-800 mb-2 opacity-80">今日、あなたが描いた色彩</h3>
                <p className="text-2xl font-serif text-slate-700 italic leading-relaxed">
                  "{currentLog.aiFeedback.dailySummary}"
                </p>
              </div>
            </div>

            {currentLog.souvenirImageUrl && (
              <div className="mt-8 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white/50 relative group cursor-pointer transform hover:scale-[1.01] transition-all duration-500">
                <img src={currentLog.souvenirImageUrl} className="w-full h-auto object-cover" alt="Daily souvenir" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-6">
                  <p className="text-white font-bold flex items-center gap-2"><ImageIcon size={18} /> 今日の心象風景を見る</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-3xl text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={64} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2 block">1 Minute Seed</span>
                <p className="font-bold text-lg leading-tight relative z-10">{currentLog.aiFeedback.oneMinuteAction}</p>
              </div>

              {currentLog.aiFeedback.reflectionOnFollowUp && (
                <div className="bg-white/60 p-5 rounded-3xl border border-rose-100 shadow-sm relative overflow-hidden">
                  <div className="absolute -bottom-2 -right-2 text-rose-100"><Heart size={64} /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2 block">Connection Magic</span>
                  <p className="text-slate-700 font-medium text-sm leading-relaxed relative z-10">{currentLog.aiFeedback.reflectionOnFollowUp}</p>
                </div>
              )}
            </div>

            {/* Mission Section */}
            {currentLog.aiFeedback.nextMission && (
              <div className="mt-6 glass-panel p-6 rounded-3xl border-2 border-amber-200 bg-amber-50/30 animate-in zoom-in-95 duration-500">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap size={20} className="text-amber-500 animate-pulse" />
                    <span className="text-xs font-black text-amber-600 uppercase tracking-widest leading-none">Jinnai's Mission</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const audioData = await generateVoiceAudio(currentLog.aiFeedback!.eveningComment, settings.personality);
                          // For now, use Web Speech API with styled parameters if raw audio is TBD
                          const uttr = new SpeechSynthesisUtterance(currentLog.aiFeedback!.eveningComment);
                          uttr.pitch = 0.8;
                          uttr.rate = 0.9;
                          uttr.lang = 'ja-JP';
                          window.speechSynthesis.speak(uttr);
                        } catch (e) {
                          console.error("Voice error:", e);
                        }
                      }}
                      className="p-2 bg-white rounded-full shadow-sm text-indigo-500 hover:scale-110 transition-transform"
                      title="陣内の声を聴く"
                    >
                      <Music size={16} />
                    </button>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded-md border-amber-300 text-amber-500 focus:ring-amber-200"
                        checked={currentLog.isMissionCompleted}
                        onChange={(e) => {
                          const newLogs = {
                            ...logs,
                            [todayStr]: { ...currentLog, isMissionCompleted: e.target.checked, updatedAt: Date.now() }
                          };
                          updateData(newLogs, e.target.checked ? 150 : -150); // Mission bonus
                        }}
                      />
                      <span className="text-xs font-bold text-slate-500 group-hover:text-amber-600 transition-colors">達成！</span>
                    </label>
                  </div>
                </div>
                <p className="text-slate-800 font-black text-lg leading-snug">
                  「{currentLog.aiFeedback.nextMission}」
                </p>
                <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {currentLog.isMissionCompleted ? "✨ ミッション達成！ +150 XP" : "明日これをこなせば XP を弾んでやるぜ。"}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Parallel World Modal */}
      {parallelStory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-indigo-950/80 backdrop-blur-md" onClick={() => setParallelStory(null)} />
          <div className="bg-[#0f172a] text-slate-200 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[2rem] shadow-2xl relative animate-in zoom-in-95 duration-500 border border-slate-700">
            <button onClick={() => setParallelStory(null)} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>

            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3 text-indigo-400">
                <Globe size={24} />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Parallel Timeline</span>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">分岐点 / Divergence Point</p>
                <p className="font-bold text-lg text-emerald-400">{parallelStory.divergencePoint}</p>
              </div>

              <div className="space-y-4">
                <p className="leading-relaxed font-serif text-lg text-slate-300 italic">
                  "{parallelStory.story}"
                </p>
              </div>

              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 text-sm text-slate-400">
                <strong className="text-slate-300 block mb-1 text-xs uppercase">World Description</strong>
                {parallelStory.worldDescription}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass-nav px-6 pb-6 pt-4 flex justify-around items-end md:static md:bg-transparent md:border-none md:max-w-xl md:mx-auto md:pb-12 md:pt-0 z-50">
        <NavButton active={activeTab === 'morning'} onClick={() => setActiveTab('morning')} icon={<Sun size={24} />} label="MORNING" color="text-amber-500" />
        <NavButton active={activeTab === 'interrogation'} onClick={() => setActiveTab('interrogation')} icon={<Mic size={24} />} label="INTERROGATE" color="text-slate-500" />
        <NavButton active={activeTab === 'evening'} onClick={() => setActiveTab('evening')} icon={<Moon size={24} />} label="EVENING" color="text-indigo-500" />
        <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<BookOpen size={24} />} label="LOG" color="text-rose-500" />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; color: string }> = ({ active, onClick, icon, label, color }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-2 transition-all duration-300 group ${active ? 'scale-110 -translate-y-2' : 'scale-100 opacity-60 hover:opacity-100'}`}
  >
    <div className={`p-4 rounded-full transition-all duration-500 shadow-sm ${active ? 'bg-white shadow-xl rotate-0' : 'bg-transparent shadow-none hover:bg-white/50'}`}>
      <div className={`${active ? color : 'text-slate-500'} transition-colors`}>{icon}</div>
    </div>
    <span className={`text-[10px] font-black tracking-widest uppercase ${active ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
    {active && <div className={`w-1 h-1 rounded-full ${color.replace('text', 'bg')} mt-1 animate-ping`} />}
  </button>
);

const MorningForm: React.FC<{ entry?: MorningEntry; onSubmit: (e: MorningEntry) => void; feedback?: string; isLoading: boolean }> = ({ entry, onSubmit, feedback, isLoading }) => {
  const [gratitude, setGratitude] = useState(entry?.gratitude || ['', '', '']);
  const [goal, setGoal] = useState(entry?.todayGoal || '');
  const [stance, setStance] = useState(entry?.stance || '');

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-6 fade-in duration-700">
      <div className="glass-panel p-8 md:p-10 rounded-[3rem] relative space-y-8">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-200 to-orange-200 rounded-t-[3rem] opacity-50" />

        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-300 to-orange-400 rounded-2xl text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-200 rotate-6 transform transition-transform hover:rotate-12">
            <Sun size={32} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 pt-2 tracking-tight">光を受け取る時間</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Morning Awakening</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ gratitude: gratitude.filter(g => g.trim()), todayGoal: goal, stance }); }} className="space-y-8">
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest ml-4">
              <Heart size={14} className="text-rose-400" /> 今、ここにある感謝
            </label>
            {gratitude.map((val, idx) => (
              <input
                key={idx}
                type="text"
                placeholder={`感謝の種 ${idx + 1}`}
                className="w-full px-6 py-4 rounded-2xl glass-input outline-none font-bold text-slate-700 placeholder:text-slate-300/80 shadow-sm"
                value={val}
                onChange={(e) => { const newG = [...gratitude]; newG[idx] = e.target.value; setGratitude(newG); }}
              />
            ))}
          </div>
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest ml-4">
              <TrendingUp size={14} className="text-emerald-400" /> 今日の十分な一歩
            </label>
            <input type="text" placeholder="何ができたら最高ですか？" className="w-full px-6 py-4 rounded-2xl glass-input outline-none font-bold text-slate-700 placeholder:text-slate-300/80 shadow-sm" value={goal} onChange={(e) => setGoal(e.target.value)} />
          </div>
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest ml-4">
              <Zap size={14} className="text-amber-400" /> 今日の魂のスタンス
            </label>
            <input type="text" placeholder="どんな自分で在りたいですか？" className="w-full px-6 py-4 rounded-2xl glass-input outline-none font-bold text-slate-700 placeholder:text-slate-300/80 shadow-sm" value={stance} onChange={(e) => setStance(e.target.value)} />
          </div>
          <button type="submit" disabled={isLoading} className="group w-full py-5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-orange-200/50 hover:shadow-orange-300/60 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : <Sparkles className="group-hover:animate-spin-slow" size={24} />}
            <span>目覚めを刻む</span>
          </button>
        </form>
      </div>

      {feedback && (
        <div className="glass-panel p-8 rounded-[2.5rem] flex gap-6 animate-in zoom-in-95 duration-1000 items-start">
          <div className="shrink-0 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-500 shadow-sm border border-amber-200">
            <Coffee size={24} />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Guide's Whisper</p>
            <p className="text-slate-700 leading-relaxed font-medium text-lg italic font-serif">"{feedback}"</p>
          </div>
        </div>
      )}
    </div>
  );
};

const EveningForm: React.FC<{ entry?: EveningEntry; onSubmit: (e: EveningEntry) => void; feedback?: string; isLoading: boolean }> = ({ entry, onSubmit, feedback, isLoading }) => {
  const [goodThings, setGoodThings] = useState(entry?.goodThings || ['', '', '']);
  const [kindness, setKindness] = useState(entry?.kindness || '');
  const [insights, setInsights] = useState(entry?.insights || '');
  const [fq, setFq] = useState(entry?.followUpQuestion || '');

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-6 fade-in duration-700">
      <div className="glass-panel p-8 md:p-10 rounded-[3rem] relative space-y-8">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-300 to-purple-300 rounded-t-[3rem] opacity-50" />

        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-200 -rotate-6 transform transition-transform hover:-rotate-12">
            <Moon size={32} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 pt-2 tracking-tight">自分を愛でる時間</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Evening Serenity</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ goodThings: goodThings.filter(g => g.trim()), kindness, insights, followUpQuestion: fq }); }} className="space-y-8">
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest ml-4">
              <Star size={14} className="text-amber-400" /> 心に灯った小さな光
            </label>
            {goodThings.map((val, idx) => (
              <input key={idx} type="text" placeholder={`今日の宝石 ${idx + 1}`} className="w-full px-6 py-4 rounded-2xl glass-input outline-none font-bold text-slate-700 placeholder:text-slate-300/80 shadow-sm" value={val} onChange={(e) => { const newG = [...goodThings]; newG[idx] = e.target.value; setGoodThings(newG); }} />
            ))}
          </div>
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest ml-4">
              <Smile size={14} className="text-rose-400" /> 誰かに届けた優しさ
            </label>
            <input type="text" placeholder="どんな光を分け合いましたか？" className="w-full px-6 py-4 rounded-2xl glass-input outline-none font-bold text-slate-700 placeholder:text-slate-300/80 shadow-sm" value={kindness} onChange={(e) => setKindness(e.target.value)} />
          </div>
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest ml-4">
              <Zap size={14} className="text-indigo-400" /> 魂が震えた気づき
            </label>
            <input type="text" placeholder="自分への新発見を教えてください" className="w-full px-6 py-4 rounded-2xl glass-input outline-none font-bold text-slate-700 placeholder:text-slate-300/80 shadow-sm" value={insights} onChange={(e) => setInsights(e.target.value)} />
          </div>
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest ml-4">
              <MessageCircle size={14} className="text-indigo-400" /> 愛のフォローアップ
            </label>
            <input type="text" placeholder="誰に問いかけをしましたか？" className="w-full px-6 py-4 rounded-2xl glass-input outline-none font-bold text-slate-700 placeholder:text-slate-300/80 shadow-sm" value={fq} onChange={(e) => setFq(e.target.value)} />
          </div>
          <button type="submit" disabled={isLoading} className="group w-full py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-200/50 hover:shadow-indigo-300/60 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 className="group-hover:scale-110 transition-transform" size={24} />}
            <span>眠りにつく準備を完了</span>
          </button>
        </form>
      </div>

      {feedback && (
        <div className="glass-panel p-8 rounded-[2.5rem] flex gap-6 animate-in zoom-in-95 duration-1000 items-start">
          <div className="shrink-0 w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-200">
            <Moon size={24} />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Guide's Blessing</p>
            <p className="text-slate-700 leading-relaxed font-medium text-lg italic font-serif">"{feedback}"</p>
          </div>
        </div>
      )}
    </div>
  );
};

const HistoryView: React.FC<{ logs: Record<string, DailyLog>, onSelectLog: (log: DailyLog) => void }> = ({ logs, onSelectLog }) => {
  const sortedDates = Object.keys(logs).sort((a, b) => b.localeCompare(a));

  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-40 space-y-6 animate-in fade-in zoom-in-95 duration-1000 opacity-60">
        <div className="w-24 h-24 bg-white/50 rounded-full flex items-center justify-center mx-auto text-slate-300 shadow-sm">
          <PenTool size={32} />
        </div>
        <p className="font-bold text-slate-400 tracking-[0.2em] uppercase text-sm">物語はここから始まります</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 px-2">
        <History size={24} className="text-rose-400" />
        <span className="bg-gradient-to-r from-slate-700 to-slate-500 bg-clip-text text-transparent">積み重ねてきた宝石箱</span>
      </h2>
      <div className="grid grid-cols-1 gap-6">
        {sortedDates.map((date, index) => {
          const log = logs[date];
          return (
            <div
              key={date}
              onClick={() => onSelectLog(log)}
              className="glass-panel p-6 rounded-[2.5rem] flex flex-col gap-4 hover:shadow-2xl hover:bg-white/80 hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden relative"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-5">
                  <div className="bg-white/80 w-16 h-16 rounded-[1.2rem] flex flex-col items-center justify-center shadow-sm text-slate-500 border border-white">
                    <span className="text-[10px] font-black uppercase tracking-wider">{date.split('-')[1]}月</span>
                    <span className="text-2xl font-black leading-none text-slate-800">{date.split('-')[2]}</span>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-700 text-lg line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {log.aiFeedback?.dailyTitle || "無題の物語"}
                    </h3>
                    <div className="flex gap-2 mt-2">
                      {log.morning && <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />}
                      {log.evening && <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]" />}
                    </div>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:bg-white transition-all">
                  <ChevronRight size={20} />
                </div>
              </div>

              {log.souvenirImageUrl && (
                <div className="w-full h-32 rounded-2xl overflow-hidden mt-2 relative">
                  <img src={log.souvenirImageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]" alt="Souvenir" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LogDetailModal: React.FC<{ log: DailyLog; onClose: () => void }> = ({ log, onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-500" onClick={onClose} />
      <div className="bg-[#fdfbfb] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl relative animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 flex flex-col no-scrollbar">

        <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-white/80 backdrop-blur rounded-full shadow-lg z-20 text-slate-400 hover:text-slate-800 transition-colors hover:scale-110">
          <X size={24} />
        </button>

        {log.souvenirImageUrl && (
          <div className="w-full h-72 md:h-96 shrink-0 relative">
            <img src={log.souvenirImageUrl} className="w-full h-full object-cover" alt="Detail Cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#fdfbfb] via-transparent to-transparent opacity-90" />
            <div className="absolute bottom-8 left-8 right-8">
              <div className="inline-block px-4 py-1.5 bg-white/90 backdrop-blur rounded-full text-xs font-black text-slate-500 mb-3 shadow-sm border border-white">
                {log.date.replace(/-/g, '/')}
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-800 leading-tight drop-shadow-sm tracking-tight">
                {log.aiFeedback?.dailyTitle}
              </h2>
            </div>
          </div>
        )}

        <div className="p-8 md:p-10 space-y-10">
          {!log.souvenirImageUrl && (
            <div className="space-y-4 border-b border-slate-100 pb-8">
              <div className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest"><Calendar size={16} /> {log.date}</div>
              <h2 className="text-4xl font-black text-slate-800">{log.aiFeedback?.dailyTitle || "記録の詳細"}</h2>
            </div>
          )}

          {log.aiFeedback ? (
            <>
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="w-12 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent rounded-full" />
                </div>
                <p className="text-xl md:text-2xl font-serif text-slate-600 italic leading-relaxed text-center px-4">
                  "{log.aiFeedback.dailySummary}"
                </p>
                <div className="flex justify-center">
                  <div className="w-12 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent rounded-full" />
                </div>
              </div>

              <div className="grid gap-6">
                {log.aiFeedback.morningComment && (
                  <div className="bg-amber-50/80 p-8 rounded-[2.5rem] border border-amber-100 space-y-4 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 text-amber-100 opacity-50"><Sun size={80} /></div>
                    <div className="flex items-center gap-2 text-amber-600 font-black text-xs uppercase tracking-widest">
                      Morning Whisper
                    </div>
                    <p className="text-slate-700 leading-relaxed font-medium text-lg relative z-10">
                      {log.aiFeedback.morningComment}
                    </p>
                  </div>
                )}

                {log.aiFeedback.eveningComment && (
                  <div className="bg-indigo-50/80 p-8 rounded-[2.5rem] border border-indigo-100 space-y-4 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 text-indigo-100 opacity-50"><Moon size={80} /></div>
                    <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
                      Evening Blessing
                    </div>
                    <p className="text-slate-700 leading-relaxed font-medium text-lg relative z-10">
                      {log.aiFeedback.eveningComment}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-100/50 rounded-[2.5rem] space-y-6">
                <h3 className="font-black text-slate-400 text-xs uppercase tracking-[0.2em] text-center">あなたの言葉</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-600">
                  {log.morning && (
                    <div className="bg-white p-6 rounded-[1.5rem] shadow-sm space-y-3">
                      <strong className="block text-amber-500 uppercase tracking-wider text-xs font-black">Morning</strong>
                      <div className="space-y-2">
                        <div className="flex gap-2 items-start"><div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-amber-300 shrink-0" /><p>{log.morning.todayGoal}</p></div>
                        <div className="flex gap-2 items-start"><div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-amber-300 shrink-0" /><p>{log.morning.stance}</p></div>
                      </div>
                    </div>
                  )}
                  {log.evening && (
                    <div className="bg-white p-6 rounded-[1.5rem] shadow-sm space-y-3">
                      <strong className="block text-indigo-500 uppercase tracking-wider text-xs font-black">Evening</strong>
                      <div className="space-y-2">
                        <div className="flex gap-2 items-start"><div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-indigo-300 shrink-0" /><p>{log.evening.kindness}</p></div>
                        <div className="flex gap-2 items-start"><div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-indigo-300 shrink-0" /><p>{log.evening.insights}</p></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-slate-300" size={32} />
              <p>魂の言葉を紡いでいます...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
