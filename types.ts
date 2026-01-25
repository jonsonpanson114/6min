
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
  dailyTitle: string; // 今日の称号
}

export interface DailyLog {
  date: string;
  morning?: MorningEntry;
  evening?: EveningEntry;
  aiFeedback?: AIFeedback;
  souvenirImageUrl?: string; // AIが生成した画像
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
