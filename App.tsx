
import React, { useState, useEffect, useMemo } from 'react';
import { DailyLog, MorningEntry, EveningEntry, AIFeedback, UserStats, GROWTH_LEVELS, UserSettings, PastSelfLetter, DailyQuest, WeeklyReport, MissionResult, Relationship, RelationshipLevel, QuestType, NotificationSettings } from './types';
import { generateDailyFeedback, generateSouvenirImage, generateParallelStory, generateVoiceAudio, generatePastSelfLetter, generateDailyQuest as generateDailyQuestAI, generateWeeklyReport, generateMissionResponse, calculateRelationship } from './services/geminiService';
import { MusicService } from './services/musicService';
import { InterrogationRoom } from './components/InterrogationRoom';
import SettingsModal from './components/SettingsModal';
import { scheduleNotifications, clearScheduledNotifications, getDefaultNotificationSettings, subscribeToPushNotifications } from './services/notificationService';
import {
  Sun, Moon, History, CheckCircle2, Heart, Smile, Star,
  Coffee, Zap, MessageCircle, Loader2, ChevronRight, ChevronLeft,
  Trophy, TrendingUp, Sparkles, Flame, Image as ImageIcon,
  Wind, Cloud, X, Calendar, PenTool, BookOpen, Settings,
  Music, Mic, Globe, Clock, Target, Mail
} from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'morning' | 'evening' | 'calendar' | 'interrogation' | 'quest'>('morning');
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  const [stats, setStats] = useState<UserStats>({ xp: 0, streak: 0, totalEntries: 0 });
  const [loading, setLoading] = useState(false);
  const [todayStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    personality: 'philosopher',
    notifications: {
      enabled: false,
      morning: { enabled: false, hour: 6, minute: 30 },
      evening: { enabled: false, hour: 22, minute: 0 },
      permissionRequested: false
    }
  });
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [parallelStory, setParallelStory] = useState<{ story: string; divergencePoint: string; worldDescription: string } | null>(null);
  const [isParallelLoading, setIsParallelLoading] = useState(false);

  // 新規追加: 5つのエンゲージメント機能のState
  const [pastSelfLetter, setPastSelfLetter] = useState<PastSelfLetter | null>(null);
  const [dailyQuest, setDailyQuest] = useState<DailyQuest | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [missionResultModal, setMissionResultModal] = useState<{date: string, mission: string} | null>(null);
  const [missionResponse, setMissionResponse] = useState<{text: string, completed: boolean} | null>(null);

  // Notification settings
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem('ai_diary_logs');
      const savedStats = localStorage.getItem('ai_diary_stats');
      const savedSettings = localStorage.getItem('ai_diary_settings');
      // 新規追加: 5つのエンゲージメント機能のlocalStorage
      const savedPastSelfLetter = localStorage.getItem('ai_diary_past_self_letter');
      const savedDailyQuest = localStorage.getItem('ai_diary_daily_quest');
      const savedWeeklyReport = localStorage.getItem('ai_diary_weekly_report');

      if (savedLogs) {
        try {
          const parsedLogs = JSON.parse(savedLogs);
          if (parsedLogs && typeof parsedLogs === 'object') setLogs(parsedLogs);
        } catch(e) { console.error("Logs parse error", e); }
      }
      if (savedStats) {
        try {
          const parsedStats = JSON.parse(savedStats);
          if (parsedStats && typeof parsedStats === 'object') {
            setStats({
              xp: parsedStats.xp || 0,
              streak: parsedStats.streak || 0,
              totalEntries: parsedStats.totalEntries || 0,
              lastEntryDate: parsedStats.lastEntryDate,
              relationship: parsedStats.relationship,
              weeklyReportDate: parsedStats.weeklyReportDate,
              questCompletedCount: parsedStats.questCompletedCount
            });
          }
        } catch(e) { console.error("Stats parse error", e); }
      }
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          if (parsedSettings) {
            // マイグレーション: 通知設定がない場合はデフォルト値を設定
            if (!parsedSettings.notifications) {
              parsedSettings.notifications = getDefaultNotificationSettings();
            }
            setSettings(parsedSettings);
          }
        } catch(e) { console.error("Settings parse error", e); }
      } else {
        // 初回アクセス: デフォルト設定を保存
        const defaultSettings = {
          personality: 'philosopher' as const,
          notifications: getDefaultNotificationSettings()
        };
        setSettings(defaultSettings);
        localStorage.setItem('ai_diary_settings', JSON.stringify(defaultSettings));
      }
      // 新規追加のロード
      if (savedPastSelfLetter) {
        try {
          const parsed = JSON.parse(savedPastSelfLetter);
          if (parsed && !parsed.isRead) setPastSelfLetter(parsed);
        } catch(e) { console.error("Letter parse error", e); }
      }
      if (savedDailyQuest) {
        try {
          const parsed = JSON.parse(savedDailyQuest);
          if (parsed && parsed.date === todayStr) setDailyQuest(parsed);
        } catch(e) { console.error("Quest parse error", e); }
      }
      if (savedWeeklyReport) {
        try {
          const parsed = JSON.parse(savedWeeklyReport);
          if (parsed) setWeeklyReport(parsed);
        } catch(e) { console.error("Report parse error", e); }
      }
    } catch (e) {
      console.error("Failed to load data", e);
    }
  }, [todayStr]);

  // 通知スケジュールの管理
  useEffect(() => {
    console.log("[App] 通知Effect起動。有効状態:", settings.notifications.enabled);
    if (settings.notifications.enabled) {
      scheduleNotifications(
        settings.notifications,
        () => setActiveTab('morning'),
        () => setActiveTab('evening')
      );

      // Web Pushの購読を確実にする（権限がある場合）
      if (Notification.permission === 'granted') {
        console.log("[App] 権限あり。プッシュ購読開始...");
        subscribeToPushNotifications().catch(e => {
            console.error("Mount subscription failed", e);
            alert("起動時の通知購読に失敗: " + e.message);
        });
      } else {
        console.log("[App] 通知権限の状態:", Notification.permission);
      }
    }

    return () => {
      clearScheduledNotifications();
    };
  }, [settings.notifications.enabled]);

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

      // Google Driveにコンテンツ保存
      const todayLog = newLogs[todayStr];
      if (todayLog) {
        saveDiaryToDrive(todayLog);
      }
    }
  };

  const saveDiaryToDrive = (log: DailyLog) => {
    const markdown = formatDailyLogAsMarkdown(log);
    fetch('/api/save-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentType: 'diary',
        title: log.aiFeedback?.dailyTitle || log.date,
        content: markdown,
      }),
    }).catch(e => console.warn('Failed to save to Drive:', e));
  };

  const formatDailyLogAsMarkdown = (log: DailyLog): string => {
    let md = `# ${log.aiFeedback?.dailyTitle || log.date}\n\n`;

    if (log.morning) {
      md += `## 🌅 Morning\n`;
      md += `### 感謝\n${log.morning.gratitude.map(g => `- ${g}`).join('\n')}\n\n`;
      md += `### 今日の目標\n${log.morning.todayGoal}\n\n`;
      md += `### スタンス\n${log.morning.stance}\n\n`;
    }

    if (log.evening) {
      md += `## 🌙 Evening\n`;
      md += `### 良かったこと\n${log.evening.goodThings.map(g => `- ${g}`).join('\n')}\n\n`;
      md += `### 優しさ\n${log.evening.kindness}\n\n`;
      md += `### 気づき\n${log.evening.insights}\n\n`;
      if (log.evening.followUpQuestion) {
        md += `### フォローアップ\n${log.evening.followUpQuestion}\n\n`;
      }
    }

    if (log.aiFeedback) {
      md += `## 🤖 AI Feedback\n`;
      md += `### Summary\n> ${log.aiFeedback.dailySummary}\n\n`;
      if (log.aiFeedback.morningComment) md += `### Morning Comment\n${log.aiFeedback.morningComment}\n\n`;
      if (log.aiFeedback.eveningComment) md += `### Evening Comment\n${log.aiFeedback.eveningComment}\n\n`;
      if (log.aiFeedback.oneMinuteAction) md += `### 1 Minute Action\n${log.aiFeedback.oneMinuteAction}\n\n`;
      if (log.aiFeedback.nextMission) md += `### Mission\n${log.aiFeedback.nextMission}\n\n`;
    }

    return md;
  };

  const updateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem('ai_diary_settings', JSON.stringify(newSettings));
  };

  const updateNotificationSettings = (newNotificationSettings: NotificationSettings) => {
    const newSettings = { ...settings, notifications: newNotificationSettings };
    setSettings(newSettings);
    localStorage.setItem('ai_diary_settings', JSON.stringify(newSettings));
  };

  // ============================================
  // 新規追加: ヘルパー関数とトリガー関数
  // ============================================

  // 日付計算ヘルパー
  const getDaysDiff = (dateStr1: string, dateStr2: string): number => {
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    const diffTime = d2.getTime() - d1.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const isOneWeekPassed = (dateStr: string | undefined): boolean => {
    if (!dateStr) return true;
    return getDaysDiff(dateStr, todayStr) >= 7;
  };

  // 関係進化ヘルパー
  const getRelationshipIcon = (level: RelationshipLevel): string => {
    const icons = { stranger: '👤', acquaintance: '👋', friend: '🤝', confidant: '💫', kindred: '🌟' };
    return icons[level] || '👤';
  };

  const getRelationshipLabel = (level: RelationshipLevel): string => {
    const labels = { stranger: '知らない人', acquaintance: '顔なじみ', friend: '友人', confidant: '親友', kindred: '魂の共鳴' };
    return labels[level] || '知らない人';
  };

  // A. 昨日の私からのメッセージチェック
  useEffect(() => {
    const checkPastSelfLetter = async () => {
      const dates = Object.keys(logs).filter(d => d < todayStr);
      if (dates.length === 0) return;

      // 直近7日前の日記を探す
      const targetDate = dates.find(d => getDaysDiff(d, todayStr) >= 7);
      if (!targetDate) return;

      // 既に表示済みならスキップ
      const shownDates = JSON.parse(localStorage.getItem('ai_diary_past_self_shown') || '{}');
      if (shownDates[targetDate]) return;

      // 手紙を生成
      try {
        const pastLog = logs[targetDate];
        if (pastLog?.aiFeedback) {
          const result = await generatePastSelfLetter(pastLog, getDaysDiff(targetDate, todayStr), settings.personality);
          const letter: PastSelfLetter = {
            pastDate: targetDate,
            presentDate: todayStr,
            letter: result.letter,
            pastTitle: pastLog.aiFeedback?.dailyTitle || '無題',
            isRead: false
          };
          setPastSelfLetter(letter);
          localStorage.setItem('ai_diary_past_self_letter', JSON.stringify(letter));
        }
      } catch (e) {
        console.error("Failed to generate past self letter", e);
      }
    };

    checkPastSelfLetter();
  }, [logs, todayStr, settings.personality]);

  // B. デイリー・クエスト生成（朝のタブがアクティブな時）
  useEffect(() => {
    if (activeTab !== 'morning') return;

    const generateQuest = async () => {
      // 今日のクエストが既にあるか確認
      const saved = localStorage.getItem('ai_diary_daily_quest');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === todayStr) {
          setDailyQuest(parsed);
          return;
        }
      }

      // 新規クエストを生成
      try {
        const d = new Date();
        const questData = await generateDailyQuestAI(settings.personality, todayStr, d.getDay());
        const quest: DailyQuest = {
          ...questData,
          type: questData.type as QuestType,
          date: todayStr,
          isCompleted: false,
          xpReward: 30
        };
        setDailyQuest(quest);
        localStorage.setItem('ai_diary_daily_quest', JSON.stringify(quest));
      } catch (e) {
        console.error("Failed to generate daily quest", e);
      }
    };

    generateQuest();
  }, [activeTab, todayStr, settings.personality]);

  // C. 週間レポートチェック
  useEffect(() => {
    if (!isOneWeekPassed(stats.weeklyReportDate)) return;

    const generateReport = async () => {
      // 過去7日間のログを取得
      const sortedDates = Object.keys(logs).sort().reverse();
      const recentLogs = sortedDates.slice(0, 7).map(d => logs[d]).filter(Boolean);

      if (recentLogs.length < 3) return; // データ不足

      try {
        const report = await generateWeeklyReport(recentLogs, settings.personality);
        setWeeklyReport(report);

        // ステータスを更新
        const newStats = { ...stats, weeklyReportDate: todayStr };
        setStats(newStats);
        localStorage.setItem('ai_diary_stats', JSON.stringify(newStats));
        localStorage.setItem('ai_diary_weekly_report', JSON.stringify(report));
      } catch (e) {
        console.error("Failed to generate weekly report", e);
      }
    };

    generateReport();
  }, [logs, todayStr, stats.weeklyReportDate, settings.personality]);

  // E. 関係進化計算 (useMemo で常に最新の値を計算するように変更)
  const relationship = useMemo(() => {
    const daysUsed = Object.keys(logs).length;
    const totalInteractions = (stats.totalEntries || 0) * 3; // 見積もり
    return calculateRelationship(daysUsed, stats.totalEntries || 0, totalInteractions);
  }, [logs, stats.totalEntries]);

  // デイリー・クエスト完了
  const completeQuest = () => {
    if (!dailyQuest || dailyQuest.isCompleted) return;
    const completedQuest = { ...dailyQuest, isCompleted: true };
    setDailyQuest(completedQuest);
    localStorage.setItem('ai_diary_daily_quest', JSON.stringify(completedQuest));
    updateData(logs, dailyQuest.xpReward);
  };

  // D. ミッション結果報告
  const submitMissionResult = async (result: string, completed: boolean) => {
    if (!missionResultModal) return;

    try {
      const response = await generateMissionResponse(missionResultModal.mission, result, completed, settings.personality);
      setMissionResponse({ text: response, completed });
      setMissionResultModal(null);

      // 経験値を追加
      if (completed) {
        updateData(logs, 50);
      }
    } catch (e) {
      console.error("Failed to generate mission response", e);
      alert("エラーが発生しました。");
    }
  };

  const currentLog: DailyLog = logs[selectedDate] || { date: selectedDate, updatedAt: Date.now() };

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
        [selectedDate]: { ...log, aiFeedback: feedback, souvenirImageUrl: imageUrl, updatedAt: Date.now() }
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

              {/* Notification Settings Button */}
              <button
                onClick={() => setSettingsModalOpen(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
                  settings.notifications.enabled
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white/50 border-slate-100 text-slate-600'
                } shadow-sm backdrop-blur-sm relative`}
                title="通知設定"
              >
                <Mail size={14} />
                {settings.notifications.enabled && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></span>
                )}
              </button>
              {/* E. AI関係進化表示 */}
                <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-full border border-slate-100 shadow-sm backdrop-blur-sm">
                  <span className="text-lg">{getRelationshipIcon(relationship.level)}</span>
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    {getRelationshipLabel(relationship.level)}
                  </span>
                </div>
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
        {/* B. デイリー・クエスト表示（Morningタブの上部） */}
        {dailyQuest && !dailyQuest.isCompleted && activeTab === 'morning' && (
          <div className="glass-panel p-6 rounded-[2rem] border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 mb-8 animate-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-2 mb-3">
              <Target className="text-amber-500" size={20} />
              <span className="text-xs font-black text-amber-600 uppercase tracking-widest">Today's Quest</span>
              <span className="text-[10px] text-amber-400 font-medium ml-auto">+{dailyQuest.xpReward} XP</span>
            </div>
            <p className="font-bold text-lg text-slate-800 mb-3 leading-relaxed">{dailyQuest.question}</p>
            {dailyQuest.hint && (
              <p className="text-sm text-slate-500 mb-5 italic">{dailyQuest.hint}</p>
            )}
            <button
              onClick={completeQuest}
              className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-[1.5rem] font-bold text-base shadow-lg shadow-amber-200/50 hover:shadow-amber-300/70 hover:-translate-y-0.5 active:scale-95 transition-all"
            >
              クエストを完了する
            </button>
          </div>
        )}

        {activeTab === 'morning' && (
          <MorningForm
            entry={currentLog.morning}
            onSubmit={(e) => {
              const newLogs = { ...logs, [selectedDate]: { ...currentLog, morning: e, updatedAt: Date.now() } };
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
              const newLogs = { ...logs, [selectedDate]: { ...currentLog, evening: e, updatedAt: Date.now() } };
              updateData(newLogs, !currentLog.evening ? 50 : 0);
              triggerAIFeedback(newLogs[todayStr], false);
            }}
            feedback={currentLog.aiFeedback?.eveningComment}
            isLoading={loading}
          />
        )}
        {activeTab === 'calendar' && (
          <CalendarView logs={logs} todayStr={todayStr} selectedDate={selectedDate} weeklyReport={weeklyReport} onSelectDate={setSelectedDate} onSelectLog={setSelectedLog} onNavigateToTab={setActiveTab} />
        )}
        {activeTab === 'interrogation' && (
          <InterrogationRoom
            personality={settings.personality}
            onComplete={(e) => {
              const newLogs = { ...logs, [selectedDate]: { ...currentLog, evening: e, updatedAt: Date.now() } };
              updateData(newLogs, !currentLog.evening ? 50 : 0);
              triggerAIFeedback(newLogs[todayStr], false);
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
                <p className="font-bold text-lg leading-tight relative z-10">{currentLog.aiFeedback?.oneMinuteAction}</p>
              </div>

              {currentLog.aiFeedback?.reflectionOnFollowUp && (
                <div className="bg-white/60 p-5 rounded-3xl border border-rose-100 shadow-sm relative overflow-hidden">
                  <div className="absolute -bottom-2 -right-2 text-rose-100"><Heart size={64} /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2 block">Connection Magic</span>
                  <p className="text-slate-700 font-medium text-sm leading-relaxed relative z-10">{currentLog.aiFeedback.reflectionOnFollowUp}</p>
                </div>
              )}
            </div>

            {/* Mission Section */}
            {currentLog.aiFeedback?.nextMission && (
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
                            [selectedDate]: { ...currentLog, isMissionCompleted: e.target.checked, updatedAt: Date.now() }
                          };
                          updateData(newLogs, e.target.checked ? 150 : -150); // Mission bonus
                        }}
                      />
                      <span className="text-xs font-bold text-slate-500 group-hover:text-amber-600 transition-colors">達成！</span>
                    </label>
                  </div>
                </div>
                <p className="text-slate-800 font-black text-lg leading-snug">
                  「{currentLog.aiFeedback?.nextMission}」
                </p>
                <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {currentLog.isMissionCompleted ? "✨ ミッション達成！ +150 XP" : "明日これをこなせば XP を弾んでやるぜ。"}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* A. 昨日の私からのメッセージModal */}
      {pastSelfLetter && !pastSelfLetter.isRead && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-rose-900/30 backdrop-blur-sm" />
          <div className="bg-[#fdf6f0] w-full max-w-md max-h-[85vh] overflow-y-auto rounded-[3rem] shadow-2xl relative animate-in zoom-in-95 duration-500 p-8 border border-rose-200">
            <div className="text-center mb-6">
              <span className="text-6xl">💌</span>
              <p className="text-xs text-rose-400 font-black uppercase tracking-widest mt-3">From Your Past Self</p>
              <p className="text-sm text-rose-500 font-medium mt-1">{pastSelfLetter.pastDate?.replace(/-/g, '/')}のあなたから</p>
            </div>
            <div className="bg-white/60 p-6 rounded-2xl mb-6 border border-rose-100">
              <p className="text-slate-700 leading-relaxed text-sm font-serif italic whitespace-pre-wrap">
                {pastSelfLetter.letter}
              </p>
            </div>
            <button
              onClick={() => {
                setPastSelfLetter({ ...pastSelfLetter, isRead: true });
                localStorage.setItem('ai_diary_past_self_letter', JSON.stringify({ ...pastSelfLetter, isRead: true }));
                localStorage.setItem('ai_diary_past_self_shown', JSON.stringify({ ...JSON.parse(localStorage.getItem('ai_diary_past_self_shown') || '{}'), [pastSelfLetter.pastDate]: true }));
              }}
              className="w-full py-4 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-[2rem] font-bold text-base shadow-lg shadow-rose-200/50 hover:shadow-rose-300/70 hover:-translate-y-0.5 active:scale-95 transition-all"
            >
              受け取る
            </button>
          </div>
        </div>
      )}

      {/* D. ミッション結果報告Modal */}
      {missionResultModal && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMissionResultModal(null)} />
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative animate-in zoom-in-95 duration-500 p-8">
            <button onClick={() => setMissionResultModal(null)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>

            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Target className="text-indigo-500" size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">ミッション結果を報告</h3>
                <p className="text-slate-500 text-sm">「{missionResultModal.mission}」</p>
              </div>

              {missionResponse ? (
                <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                  <p className="text-slate-700 text-sm font-medium italic">{missionResponse.text}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    placeholder="どのようにこなしましたか？"
                    className="w-full p-4 rounded-2xl glass-input outline-none text-slate-700 placeholder:text-slate-300 resize-none h-32"
                    onChange={(e) => setMissionResponse({ text: e.target.value, completed: false })}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => submitMissionResult(missionResponse?.text || '', true)}
                      className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold text-sm"
                    >
                      達成しました！
                    </button>
                    <button
                      onClick={() => submitMissionResult('達成できませんでした', false)}
                      className="px-4 py-3 bg-slate-200 text-slate-600 rounded-xl font-bold text-sm"
                    >
                      できませんでした
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Settings Modal */}
      {settingsModalOpen && (
        <SettingsModal
          settings={settings.notifications}
          onClose={() => setSettingsModalOpen(false)}
          onSave={updateNotificationSettings}
        />
      )}

      {/* Detail Modal */}
      {selectedLog && <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass-nav px-6 pb-6 pt-4 flex justify-around items-end md:static md:bg-transparent md:border-none md:max-w-xl md:mx-auto md:pb-12 md:pt-0 z-50">
        <NavButton active={activeTab === 'morning'} onClick={() => setActiveTab('morning')} icon={<Sun size={24} />} label="MORNING" color="text-amber-500" />
        <NavButton active={activeTab === 'interrogation'} onClick={() => setActiveTab('interrogation')} icon={<Mic size={24} />} label="INTERROGATE" color="text-slate-500" />
        <NavButton active={activeTab === 'evening'} onClick={() => setActiveTab('evening')} icon={<Moon size={24} />} label="EVENING" color="text-indigo-500" />
        <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<Calendar size={24} />} label="LOG" color="text-rose-500" />
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
    {active && <div className={`w-1 h-1 rounded-full ${color?.replace('text', 'bg')} mt-1 animate-ping`} />}
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

// Calendar utility functions
const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const formatDateKey = (year: number, month: number, day: number): string => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const isToday = (dateStr: string, todayStr: string): boolean => {
  return dateStr === todayStr;
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
                {log.date?.replace(/-/g, '/')}
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

                {/* Mission Section in Modal */}
                {log.aiFeedback.nextMission && (
                  <div className="bg-amber-50/50 p-6 rounded-[2.5rem] border border-amber-100 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap size={18} className="text-amber-500" />
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Mission Archive</span>
                      </div>
                      <button
                        onClick={() => {
                          const uttr = new SpeechSynthesisUtterance(log.aiFeedback!.eveningComment);
                          uttr.pitch = 0.8;
                          uttr.rate = 0.9;
                          uttr.lang = 'ja-JP';
                          window.speechSynthesis.speak(uttr);
                        }}
                        className="p-2 bg-white rounded-full shadow-sm text-indigo-500 hover:scale-110 transition-transform"
                      >
                        <Music size={14} />
                      </button>
                    </div>
                    <p className="text-slate-800 font-bold leading-snug">「{log.aiFeedback.nextMission}」</p>
                    {log.isMissionCompleted && <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 rounded text-[10px] font-black text-emerald-700 uppercase">Completed</div>}
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

// Calendar components
interface CalendarDayCellProps {
  day: number;
  dateStr: string;
  log?: DailyLog;
  isToday: boolean;
  onClick: () => void;
  isCurrentMonth: boolean;
}

const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  day,
  dateStr,
  log,
  isToday,
  onClick,
  isCurrentMonth,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={!isCurrentMonth}
      className={`
        aspect-square rounded-xl md:rounded-2xl flex flex-col items-center justify-center relative cursor-pointer
        transition-all duration-300 hover:scale-105 hover:shadow-lg
        ${isToday
          ? 'bg-gradient-to-br from-purple-100 to-indigo-100 ring-2 ring-purple-300'
          : 'bg-white/40 hover:bg-white/80'
        }
        ${!isCurrentMonth ? 'opacity-40 pointer-events-none' : ''}
      `}
    >
      <span className={`text-sm md:text-lg font-bold ${isToday ? 'text-purple-700' : 'text-slate-700'}`}>
        {day}
      </span>
      <div className="flex gap-1 mt-1">
        {log?.morning && (
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
        )}
        {log?.evening && (
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
        )}
      </div>
    </button>
  );
};

interface CalendarViewProps {
  logs: Record<string, DailyLog>;
  todayStr: string;
  selectedDate: string;
  weeklyReport: WeeklyReport | null;
  onSelectDate: (date: string) => void;
  onSelectLog: (log: DailyLog) => void;
  onNavigateToTab: (tab: 'morning' | 'evening') => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ logs, todayStr, selectedDate, weeklyReport, onSelectDate, onSelectLog, onNavigateToTab }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const formatMonthYear = (date: Date): string => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}年 ${month}月`;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const handleDateClick = (dateStr: string) => {
    onSelectDate(dateStr);
    const log = logs[dateStr];
    if (log) {
      onSelectLog(log);
    } else {
      // Navigate to appropriate form for new entry
      const currentHour = new Date().getHours();
      const targetTab = (dateStr === todayStr && currentHour >= 12)
        ? 'evening'
        : 'morning';
      onNavigateToTab(targetTab);
    }
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInMonth = getDaysInMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);

    const cells: React.ReactNode[] = [];

    // Weekday header
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    cells.push(
      ...weekdays.map((day, idx) => (
        <div key={`weekday-${idx}`} className="text-center py-2">
          <span className={`text-xs font-bold uppercase tracking-wider ${
            idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-slate-400'
          }`}>
            {day}
          </span>
        </div>
      ))
    );

    // Empty cells for previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const dateStr = formatDateKey(year, month - 1, day);
      cells.push(
        <CalendarDayCell
          key={`prev-${day}`}
          day={day}
          dateStr={dateStr}
          isToday={isToday(dateStr, todayStr)}
          onClick={() => handleDateClick(dateStr)}
          isCurrentMonth={false}
        />
      );
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateKey(year, month, day);
      cells.push(
        <CalendarDayCell
          key={day}
          day={day}
          dateStr={dateStr}
          log={logs[dateStr]}
          isToday={isToday(dateStr, todayStr)}
          onClick={() => handleDateClick(dateStr)}
          isCurrentMonth={true}
        />
      );
    }

    // Empty cells for next month
    const totalCells = firstDay + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
      const dateStr = formatDateKey(year, month + 1, day);
      cells.push(
        <CalendarDayCell
          key={`next-${day}`}
          day={day}
          dateStr={dateStr}
          isToday={isToday(dateStr, todayStr)}
          onClick={() => handleDateClick(dateStr)}
          isCurrentMonth={false}
        />
      );
    }

    return cells;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 px-2">
        <Calendar size={24} className="text-rose-400" />
        <span className="bg-gradient-to-r from-slate-700 to-slate-500 bg-clip-text text-transparent">カレンダー</span>
      </h2>
      <div className="glass-panel p-6 md:p-8 rounded-[3rem] animate-in fade-in zoom-in-95 duration-700">
        {/* Calendar header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={goToPreviousMonth}
            className="p-2 md:p-3 rounded-full bg-white/50 hover:bg-white/80 transition-all hover:scale-110"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-4">
            <h3 className="text-xl md:text-2xl font-black text-slate-800">
              {formatMonthYear(currentMonth)}
            </h3>
            <button
              onClick={goToToday}
              className="px-3 py-1 md:px-4 md:py-2 text-xs font-bold uppercase tracking-widest bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200 transition-all"
            >
              今日
            </button>
          </div>
          <button
            onClick={goToNextMonth}
            className="p-2 md:p-3 rounded-full bg-white/50 hover:bg-white/80 transition-all hover:scale-110"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 md:gap-3">
          {renderCalendar()}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          <span className="font-bold">朝の記録</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
          <span className="font-bold">夜の記録</span>
        </div>
      </div>

      {/* Weekly Report */}
      {weeklyReport && (
        <div className="glass-panel p-6 md:p-8 rounded-[3rem] animate-in fade-in zoom-in-95 duration-700">
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="text-indigo-500" size={32} />
              </div>
              <h3 className="text-xl font-black bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent mb-2">Weekly Insight</h3>
              <p className="text-slate-400 text-xs">{weeklyReport.startDate?.replace(/-/g, '/')} 〜 {weeklyReport.endDate?.replace(/-/g, '/')}</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-100">
              <p className="text-slate-700 leading-relaxed text-sm font-medium">{weeklyReport.insights}</p>
            </div>

            {weeklyReport.patterns.length > 0 && (
              <div>
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Your Patterns</p>
                <div className="space-y-3">
                  {weeklyReport.patterns.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 text-slate-600 bg-white/60 p-4 rounded-xl border border-slate-100">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full shrink-0" />
                      <span className="text-sm">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 py-3 bg-slate-50 rounded-2xl">
              <span className="text-3xl">
                {weeklyReport.mood === 'great' ? '🌟' : weeklyReport.mood === 'good' ? '😊' : weeklyReport.mood === 'neutral' ? '😐' : '💪'}
              </span>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">This Week's Mood</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
