import { SchemaType } from "@google/generative-ai";
import { DailyLog, Personality, EveningEntry } from "../types";

const callNetlifyFunction = async (action: string, payload: any) => {
  const response = await fetch("/.netlify/functions/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });

  if (!response.ok) {
    let errorMessage = "Failed to call Netlify function";
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // If response is not JSON (e.g., Netlify timeout HTML page)
      if (response.status === 504 || response.status === 502) {
        errorMessage = "通信がタイムアウトしました。もう一度お試しください。";
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
  type: SchemaType.OBJECT,
  properties: {
    morningComment: { type: SchemaType.STRING },
    eveningComment: { type: SchemaType.STRING },
    dailySummary: { type: SchemaType.STRING },
    reflectionOnFollowUp: { type: SchemaType.STRING },
    oneMinuteAction: { type: SchemaType.STRING },
    dailyTitle: { type: SchemaType.STRING },
  },
  required: ["morningComment", "eveningComment", "dailySummary", "reflectionOnFollowUp", "oneMinuteAction", "dailyTitle"],
};

const eveningEntrySchema = {
  description: "Extracted diary entry from chat",
  type: SchemaType.OBJECT,
  properties: {
    goodThings: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    kindness: { type: SchemaType.STRING },
    insights: { type: SchemaType.STRING },
    followUpQuestion: { type: SchemaType.STRING },
  },
  required: ["goodThings", "kindness", "insights", "followUpQuestion"],
};

const parallelWorldSchema = {
  description: "Parallel World Story",
  type: SchemaType.OBJECT,
  properties: {
    story: { type: SchemaType.STRING, description: "もし別の選択をしていたら...というIFストーリー" },
    divergencePoint: { type: SchemaType.STRING, description: "運命が分岐した瞬間" },
    worldDescription: { type: SchemaType.STRING, description: "その並行世界の設定や雰囲気" },
  },
  required: ["story", "divergencePoint", "worldDescription"],
};

const PHILOSOPHER_INSTRUCTION = "あなたは、人間の魂の深淵を見つめ、そこに眠る宝石を言葉で磨き上げる「魂の記述者（ソウル・スクライブ）」です。格調高く、詩的で哲学的な言葉を使ってください。";
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
表面的な褒め言葉はいらねえ。「お前、昨日はこんなこと書いてたのに今日はこれかよ」みたいな、過去の記録 ${historyContext} との繋がりがあればそこも突っ込め。
とにかくお前らしい、ぶっきらぼうだが本質を突いた言葉を頼むぜ。

ユーザーの入力データ:
${inputContext}`
    : `
ユーザーの日記を読み解き、その一日の固有の美しさを哲学的な言葉で伝えてください。
過去の遍歴 ${historyContext} を踏まえ、ユーザーの魂がどう進化しているか深く洞察してください。

【執筆の掟】
1. **具体性の徹底:** ユーザーが書いた「具体的な言葉」を必ず引用してください。
2. **物語の結合:** 朝の意図と夜の結果を繋ぎ、一日のストーリーを完結させてください。

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
