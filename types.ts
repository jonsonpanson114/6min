
export interface MorningEntry {
  gratitude: string[];
  todayGoal: string;
  stance: string;
}

export interface EveningEntry {
  goodThings: string[];
  kindness: string;
  insights: string;
  followUpQuestion: string;
}

export interface AIFeedback {
  morningComment: string;
  eveningComment: string;
  dailySummary: string;
  reflectionOnFollowUp: string;
  oneMinuteAction: string;
  dailyTitle: string;
  nextMission?: string; // 次回ミッション
}

export interface DailyLog {
  date: string;
  morning?: MorningEntry;
  evening?: EveningEntry;
  aiFeedback?: AIFeedback;
  souvenirImageUrl?: string;
  isMissionCompleted?: boolean; // ミッション達成フラグ
  updatedAt: number;
}

export interface UserStats {
  xp: number;
  streak: number;
  totalEntries: number;
  lastEntryDate?: string;
}

export const GROWTH_LEVELS = [
  { level: 1, name: "はじまりの双葉", minXp: 0, color: "text-emerald-500", icon: "🌱" },
  { level: 2, name: "期待の蕾", minXp: 300, color: "text-lime-500", icon: "🌿" },
  { level: 3, name: "希望の開花", minXp: 1000, color: "text-rose-400", icon: "🌸" },
  { level: 4, name: "実りの果実", minXp: 2500, color: "text-orange-400", icon: "🍎" },
  { level: 5, name: "豊かな大樹", minXp: 5000, color: "text-indigo-500", icon: "🌳" },
];

export type Personality = 'philosopher' | 'jinnai';

export interface UserSettings {
  personality: Personality;
}

// A. 昨日の私からのメッセージ
export interface PastSelfLetter {
  pastDate: string;           // 過去の日付
  presentDate: string;        // 表示した日付
  letter: string;             // 手紙の内容
  pastTitle: string;          // 過去の日のタイトル
  isRead: boolean;
}

// B. デイリー・クエスト
export type QuestType = 'reflection' | 'activity' | 'creative' | 'connection';

export interface DailyQuest {
  date: string;
  type: QuestType;
  question: string;           // 今日の質問
  hint?: string;             // ヒント
  isCompleted: boolean;
  xpReward: number;          // 回答時のXP
}

// C. 週間レポート
export interface WeeklyReport {
  startDate: string;
  endDate: string;
  insights: string;          // AI分析
  patterns: string[];        // パターン発見
  mood: 'great' | 'good' | 'neutral' | 'challenging';
}

// D. ミッション結果
export interface MissionResult {
  date: string;
  mission: string;           // その日のミッション
  result: 'not_attempted' | 'completed' | 'partial' | 'skipped';
  details?: string;          // ユーザーの詳細報告
  aiResponse?: string;       // AIからの反応
}

// E. AI関係進化
export type RelationshipLevel = 'stranger' | 'acquaintance' | 'friend' | 'confidant' | 'kindred';

export interface Relationship {
  level: RelationshipLevel;
  daysKnown: number;         // 利用日数
  totalInteractions: number;  // 総インタラクション数
  intimacyScore: number;      // 親密さスコア
}

// UserStatsを拡張
export interface UserStats {
  xp: number;
  streak: number;
  totalEntries: number;
  lastEntryDate?: string;
  // 新規追加
  relationship?: Relationship;      // E用
  weeklyReportDate?: string;       // C用（最後に生成したレポートの日）
  questCompletedCount?: number;    // B用（週のクエスト完了数）
}
