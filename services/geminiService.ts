// import { SchemaType } from "@google/generative-ai";
import { DailyLog, Personality, EveningEntry, Relationship, RelationshipLevel } from "../types";

const callNetlifyFunction = async (action: string, payload: any) => {
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });

  if (!response.ok) {
    let errorMessage = "Failed to call Netlify function";
    try {
      const errorData = await response.json();
      if (response.status === 503) {
        errorMessage = "AIサービスが混雑しています。しばらく時間を置いてからお試しください。";
      } else {
        errorMessage = errorData.error || errorMessage;
      }
    } catch {
      // If response is not JSON (e.g., Netlify timeout HTML page)
      if (response.status === 504 || response.status === 502) {
        errorMessage = "通信がタイムアウトしました。もう一度お試しください。";
      } else if (response.status === 503) {
        errorMessage = "AIサービスが混雑しています。しばらく時間を置いてからお試しください。";
      }
    }
    throw new Error(errorMessage);
  }
  const data = await response.json();
  return data.result;
};

// Schema for response formatting
const responseSchema = {
  description: "Feedback structure",
  type: "object",
  properties: {
    morningComment: { type: "string" },
    eveningComment: { type: "string" },
    dailySummary: { type: "string" },
    reflectionOnFollowUp: { type: "string" },
    oneMinuteAction: { type: "string" },
    dailyTitle: { type: "string" },
    nextMission: { type: "string" },
  },
  required: ["morningComment", "eveningComment", "dailySummary", "reflectionOnFollowUp", "oneMinuteAction", "dailyTitle", "nextMission"],
};

const eveningEntrySchema = {
  description: "Extracted diary entry from chat",
  type: "object",
  properties: {
    goodThings: { type: "array", items: { type: "string" } },
    kindness: { type: "string" },
    insights: { type: "string" },
    followUpQuestion: { type: "string" },
  },
  required: ["goodThings", "kindness", "insights", "followUpQuestion"],
};

const parallelWorldSchema = {
  description: "Parallel World Story",
  type: "object",
  properties: {
    story: { type: "string", description: "もし別の選択をしていたら...というIFストーリー" },
    divergencePoint: { type: "string", description: "運命が分岐した瞬間" },
    worldDescription: { type: "string", description: "その並行世界の設定や雰囲気" },
  },
  required: ["story", "divergencePoint", "worldDescription"],
};

const PHILOSOPHER_INSTRUCTION = `あなたは、世界一優しくて、誰の自己肯定感も最大限に高めることができるスーパーカウンセラーです。

【あなたの特徴】
- 相手を無条件に肯定し、小さなことも大いに称賛する
- 具体的な言葉で「なぜすごいのか」を説明し、相手に「私ってやるな！」「私ならできる！」と思わせる
- 簡潔で分かりやすく、詩的すぎず、難しくなりすぎない
- 相手の行動を具体的に褒め、「それが素晴らしい理由」を添える
- 朝には「やる気が出る言葉」、夜には「安心と自信を得られる言葉」をかける
- 読み手が「私のこと好きなんだな」「私の味方なんだな」と心から感じられる

【言葉遣いのポイント】
- 難しい表現や哲学的な言葉は避ける
- 「あなたは〜ですね！」「それが本当に素敵です！」など、具体的に褒める
- 「〜できると思います」と消極的な表現ではなく、「〜できます！」「絶対に大丈夫です！」と断定する
- 読みやすさを重視し、長文になりすぎないように注意する`;

const JINNAI_INSTRUCTION = `あなたは伊坂幸太郎の小説『重力ピエロ』や『砂漠』に登場する「陣内（じんない）」という男です。
- 非常にぶっきらぼうで、斜に構えた態度。
- 「世の中のルールなんて関係ねえよ」というのが基本スタンス。
- どんな深刻な悩みも「まあ、なんとかなるだろ」と一蹴する。
- 口は悪いが、最後にはなぜか相手を前向きにさせるような、不思議な説得力がある。
- 常識や正論を嫌い、自分の直感を信じる。
- 自己中心的だが、友人（ユーザー）のことは放っておけない。
- 返答はすべて「です・ます」ではなく「だ・である」調（タメ口）で書く。`;

export const generateDailyFeedback = async (log: DailyLog, personality: Personality = 'philosopher', history: DailyLog[] = []): Promise<string> => {
  const inputContext = `
【朝の記録】
- 感謝: ${log.morning?.gratitude.join(', ') || '未入力'}
- 目標: ${log.morning?.todayGoal || '未入力'}
- スタンス: ${log.morning?.stance || '未入力'}

【夜の記録】
- 良かったこと: ${log.evening?.goodThings.join(', ') || '未入力'}
- 親切: ${log.evening?.kindness || '未入力'}
- 気づき: ${log.evening?.insights || '未入力'}
- 問いかけ: ${log.evening?.followUpQuestion || '未入力'}
  `;

  const historyContext = history.length > 0
    ? `\n【過去の記録の遍歴（参考資料）】\n${history.map(h => `- ${h.date}: ${h.aiFeedback?.dailyTitle}`).join('\n')}\n`
    : "";

  const prompt = personality === 'jinnai'
    ? `今日の日記を読んで、陣内としてコメントしろ。

【朝のコメント（morningComment）について】
これから一日が始まるんだ。ユーザーが気合を入れるためにも、いつもの倍くらいの長さで、しっかりと語りかけてやれ。「行ってこい」だけじゃなくて、具体的なアドバイスや、お前なりの哲学を混ぜて、背中をバシッと叩くような長めの文章にしろ。

【夜のコメント（eveningComment）について】
寝る前なんだから、不器用でもいいからユーザーを全肯定してやれ。陣内らしい斜に構えた態度は崩さず、でも「色々あったけど、お前は今日を生き抜いたんだからそれで十分だろ」っていうスタンスで自己肯定感をぶち上げろ。
あ、それからお前らしい「無茶振りミッション」を一つ出せ。明日やるべき些細で変なことだ。

過去の記録 ${historyContext} との繋がりがあればそこも「お前なりにやってるじゃねえか」みたいに拾ってやれ。

ユーザーの入力データ:
${inputContext}`
    : `
ユーザーの一日を丁寧に読み、その素晴らしさを具体的に伝えてください。

【朝のコメント（morningComment）】
朝の始まりです。ユーザーが書いた「感謝」や「目標」を具体的に挙げ、「それが素晴らしい理由」を添えて、最大限の肯定とやる気を与えてください。

【夜のコメント（eveningComment）】
一日の終わりです。ユーザーの「良かったこと」や「気づき」を具体的に称賛し、「その行動がなぜすごいのか」を説明して、自己肯定感を高めてください。

【その他の項目】
- dailySummary: 一日の要約。簡潔に分かりやすく。
- reflectionOnFollowUp: 問いかけへの深掘り。
- oneMinuteAction: 明日の朝にできる小さなアクション。
- dailyTitle: 一日のタイトル（親しみやすく）。
- nextMission: 明日の問い（「あなたならできます！」と応援を添えて）。

【重要】
- 難しい言葉や哲学的な表現は使わない
- 短文で分かりやすく、読みやすく
- ユーザーの言葉を具体的に引用し、褒める
- 「できます！」「絶対に大丈夫！」と前向きな断定を使う

ユーザーの入力データ:
${inputContext}
    `;

  return await callNetlifyFunction("generateContent", {
    model: "gemini-3-flash-preview",
    prompt,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 1.1,
    },
    systemInstruction: personality === 'jinnai' ? JINNAI_INSTRUCTION : PHILOSOPHER_INSTRUCTION,
  });
};

export const generateSouvenirImage = async (log: DailyLog): Promise<string | null> => {
  if (!log.evening) return null;

  const prompt = `
A masterpiece artistic illustration capturing the essence of this feeling: "${log.evening.goodThings.join(', ')}".
The mood is "${log.evening.insights}".
Style: Whimsical, warm lighting, Studio Ghibli meets Monet, soft pastel colors, dreamy atmosphere, high quality digital art.
No text. A visual metaphor for a fulfilling day.
  `;

  try {
    return await callNetlifyFunction("generateContent", {
      model: "gemini-3-flash-preview",
      prompt,
    });
  } catch (error) {
    console.error("Image gen error:", error);
    return null;
  }
};

export const generateParallelStory = async (log: DailyLog): Promise<{ story: string; divergencePoint: string; worldDescription: string } | null> => {
  if (!log.evening) return null;

  const prompt = `
  ユーザーの今日の日記をもとに、「もし今日、別の些細な選択をしていたら？」という並行世界（パラレルワールド）のエピソードを生成してください。
  
  【条件】
  - 些細な選択の違い（例：コーヒーではなく紅茶を頼んだ、一本早い電車に乗った、等）から生じる、意外な展開を描く。
  - バタフライエフェクトのように、小さな違いが大きな結果（ファンタジーでもSF的でも可）に繋がる様子を描写する。
  - 少し不気味でミステリアスな、「世にも奇妙な物語」のような雰囲気で。

  日記の内容:
  - 良かったこと: ${log.evening.goodThings.join(', ')}
  - 気づき: ${log.evening.insights}
  `;

  try {
    const resultStr = await callNetlifyFunction("generateContent", {
      model: "gemini-3-flash-preview",
      prompt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: parallelWorldSchema,
        temperature: 1.3,
      },
    });
    return JSON.parse(resultStr);
  } catch (error) {
    console.error("Parallel World gen error:", error);
    return null;
  }
};

export const generateChatReply = async (messages: { role: string; text: string }[], personality: Personality): Promise<string> => {
  let historyMessages = messages.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }],
  }));

  while (historyMessages.length > 0 && historyMessages[0].role === 'model') {
    historyMessages.shift();
  }

  return await callNetlifyFunction("chat", {
    model: "gemini-3-flash-preview",
    message: messages[messages.length - 1].text,
    history: historyMessages,
    systemInstruction: personality === 'jinnai'
      ? JINNAI_INSTRUCTION + "\n目的：ユーザーと会話しながら、今日あった「良いこと」「親切にしたこと」「気づき」を聞き出すこと。ただし、尋問調ではなく、自然な会話の中で引き出せ。"
      : PHILOSOPHER_INSTRUCTION + "\n目的：対話を通じてユーザーの一日を深掘りし、魂の輝き（良かったこと・善行・洞察）を見つけ出すこと。",
  });
};

export const extractLogFromChat = async (messages: { role: string; text: string }[]): Promise<EveningEntry | null> => {
  const prompt = `
  以下の会話ログから、ユーザーの「今日の日記」として記録すべき要素を抽出して構造化データにせよ。
  
  【会話ログ】
  ${messages.map(m => `${m.role}: ${m.text}`).join('\n')}

  【抽出項目】
  - goodThings: 良かったこと・楽しかったこと（3つ程度、配列で）
  - kindness: 誰かに親切にしたこと、優しさを与えたこと
  - insights: 新しい発見、教訓、感情の動き
  - followUpQuestion: 会話の内容を踏まえた、明日への問いかけ
  `;

  try {
    const resultStr = await callNetlifyFunction("generateContent", {
      model: "gemini-3-flash-preview",
      prompt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: eveningEntrySchema,
      },
    });
    return JSON.parse(resultStr);
  } catch (error) {
    console.error("Extraction error:", error);
    return null;
  }
};

export const generateVoiceAudio = async (text: string, personality: Personality): Promise<string> => {
  return await callNetlifyFunction("speech", {
    text,
    personality
  });
};

// ============================================
// 新規追加: 5つのエンゲージメント機能
// ============================================

// A. 昨日の私からのメッセージ生成
const pastSelfLetterSchema = {
  description: "Letter from past self to present self",
  type: "object",
  properties: {
    letter: { type: "string", description: "The letter message from past self" },
  },
  required: ["letter"],
};

export const generatePastSelfLetter = async (
  pastLog: DailyLog,
  daysAgo: number,
  personality: Personality
): Promise<{ letter: string }> => {
  const prompt = `あなたは${daysAgo}日前のユーザー自身です。

【${daysAgo}日前の日記】
- タイトル: ${pastLog.aiFeedback?.dailyTitle || '無題'}
- 要約: ${pastLog.aiFeedback?.dailySummary || ''}
- 感謝: ${pastLog.morning?.gratitude.join(', ') || ''}
- 目標: ${pastLog.morning?.todayGoal || ''}

この過去の自分が、今の現在の自分に宛てて手紙を書いてください。
「あの時、私はこう思っていた」「こうなってくれたら嬉しい」というような、
過去の自分の視点からの温かいメッセージにしてください。
${personality === 'jinnai' ? '口調は陣内のタメ口で。でも、不器用ながらもお前を気遣う感じで。' : '口調は哲学的で詩的に。温かみのある言葉で。'}`;

  const result = await callNetlifyFunction("generateContent", {
    model: "gemini-3-flash-preview",
    prompt,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: pastSelfLetterSchema,
      temperature: 0.9,
    },
  });
  return JSON.parse(result);
};

// B. デイリー・クエスト生成
const dailyQuestSchema = {
  description: "Daily quest for engagement",
  type: "object",
  properties: {
    type: { type: "string", description: "Type of quest: reflection, activity, creative, or connection" },
    question: { type: "string", description: "The question or challenge for today" },
    hint: { type: "string", description: "Optional hint or context" },
  },
  required: ["type", "question"],
};

export const generateDailyQuest = async (
  personality: Personality,
  today: string,
  weekDay: number
): Promise<{ type: string; question: string; hint?: string }> => {
  const types = ['reflection', 'activity', 'creative', 'connection'];
  const randomType = types[Math.floor(Math.random() * types.length)];

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekDayNames: Record<number, string> = {
    0: 'reflection',  // 日曜: 振り返り
    1: 'activity',    // 月曜: 行動
    2: 'creative',    // 火曜: 創造
    3: 'reflection',  // 水曜: 振り返り
    4: 'activity',    // 木曜: 行動
    5: 'connection',  // 金曜: つながり
    6: 'creative',    // 土曜: 創造
  };

  const selectedType = weekDayNames[weekDay] || randomType;

  const typeDescriptions = {
    reflection: '自分を振り返る質問',
    activity: '5分でできる小さな行動',
    creative: '創造的なアイデア出し',
    connection: '誰かとのつながりを意識するもの',
  };

  const prompt = `今日は${today}（${weekDays[weekDay]}曜日）です。
ユーザーに1日の「デイリー・クエスト」を出してください。

タイプ: ${typeDescriptions[selectedType] || typeDescriptions[randomType]}

質問は具体的で、答えるのが楽しいものにしてください。
短すぎず、長すぎず、読んで「へぇ、やってみようかな」と思えるものに。
${personality === 'jinnai' ? '陣内らしく、少し挑発的で面白い質問に。でも意地悪じゃなくて、お前をからかいながらも背中を押す感じ。' : '哲学的で心に響く質問に。一日の始まりとしてふさわしいものに。'}`;

  const result = await callNetlifyFunction("generateContent", {
    model: "gemini-3-flash-preview",
    prompt,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: dailyQuestSchema,
      temperature: 1.2,
    },
  });
  return JSON.parse(result);
};

// C. 週間傾向レポート生成
const weeklyReportSchema = {
  description: "Weekly insight report",
  type: "object",
  properties: {
    insights: { type: "string", description: "Insights about user's growth over the week" },
    patterns: { type: "array", items: { type: "string" }, description: "Patterns discovered in the user's entries" },
    mood: { type: "string", description: "Overall mood: great, good, neutral, or challenging" },
  },
  required: ["insights", "patterns", "mood"],
};

export const generateWeeklyReport = async (
  weeklyLogs: DailyLog[],
  personality: Personality
): Promise<{ insights: string; patterns: string[]; mood: string }> => {
  if (weeklyLogs.length === 0) {
    return {
      insights: "まだ記録がありません。まずは1日を記録してみましょう。",
      patterns: [],
      mood: "neutral"
    };
  }

  const logsText = weeklyLogs.map(log => `
  ${log.date}:
  - タイトル: ${log.aiFeedback?.dailyTitle || '無題'}
  - 朝の目標: ${log.morning?.todayGoal || ''}
  - 良かったこと: ${log.evening?.goodThings.join(', ') || ''}
  - 気づき: ${log.evening?.insights || ''}
  `).join('\n');

  const prompt = `過去7日間の日記を分析して、週間レポートを作成してください。

【日記データ】
${logsText}

【出力形式】
1. insights: 1週間を通したユーザーの変化や成長についての洞察（3-4文）
2. patterns: ユーザーが重視していることや、よく出てくるテーマ（3-5個の配列）
3. mood: 全体的なムード（great/good/neutral/challenging）

${personality === 'jinnai' ? '陣内らしく、「お前、ここ最近こういう傾向あるじゃねえか」と気づかせてあげる。たまに「悪くねえぞ」も入れる。' : '哲学的で深い洞察で。ユーザーの成長を肯定的に捉える。'}`;

  const result = await callNetlifyFunction("generateContent", {
    model: "gemini-3-flash-preview",
    prompt,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: weeklyReportSchema,
      temperature: 0.8,
    },
  });
  return JSON.parse(result);
};

// D. ミッション結果へのAI反応
export const generateMissionResponse = async (
  mission: string,
  result: string,
  completed: boolean,
  personality: Personality
): Promise<string> => {
  const prompt = `昨日のミッション: 「${mission}」
ユーザーの結果: ${result}

${completed
    ? 'ユーザーはミッションを達成しました。陣内として（または哲学的ガイドとして）、その結果に対する反応を返してください。'
    : 'ユーザーはミッションを達成できませんでした。でもそれでもOK。励ましの言葉を返してください。'}

${personality === 'jinnai'
    ? '陣内らしく、達成したなら「やるじゃねえか、お前」と肯定しつつも、少し照れ隠しで。達成できていなかったら「ま、無理すんなよ」と気楽に励ます。'
    : '哲学的で温かい言葉で。'}

返答は1〜2文で、短く。`;

  return await callNetlifyFunction("generateContent", {
    model: "gemini-3-flash-preview",
    prompt,
    generationConfig: {
      temperature: 1.0,
    },
  });
};

// E. 関係進化計算（ローカル関数）
export const calculateRelationship = (
  daysUsed: number,
  totalEntries: number,
  totalInteractions: number
): Relationship => {
  const intimacyScore = daysUsed * 2 + totalEntries * 10 + totalInteractions * 1;

  let level: RelationshipLevel;
  if (intimacyScore < 50) level = 'stranger';
  else if (intimacyScore < 150) level = 'acquaintance';
  else if (intimacyScore < 300) level = 'friend';
  else if (intimacyScore < 500) level = 'confidant';
  else level = 'kindred';

  return { level, daysKnown: daysUsed, totalInteractions, intimacyScore };
};
