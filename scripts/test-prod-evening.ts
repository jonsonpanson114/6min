
import { GoogleGenAI } from "@google/genai";

const API_URL = "https://6min.vercel.app/api/gemini";
// const API_URL = "http://localhost:3000/api/gemini"; // For local testing

const eveningSchema = {
    description: "Feedback for daily reflection",
    type: "object",
    properties: {
        dailyTitle: { type: "string", description: "A cool, Jinnai-style title for the day" },
        score: { type: "number", description: "Daily score (0-100)" },
        morningComment: { type: "string" },
        eveningComment: { type: "string" },
        goodThings: {
            type: "array",
            items: { type: "string" }
        },
        kindness: { type: "string" },
        insights: { type: "string" },
        followUpQuestion: { type: "string" },
    },
    required: ["goodThings", "kindness", "insights", "followUpQuestion"],
};

const payload = {
    model: "gemini-2.0-flash", // Using the flash model as per service
    prompt: `
  【朝の記録】
  - 感謝: 元気に起きれた
  - 目標: バグを直す
  - スタンス: 粘り強く

  【夜の記録】
  - 良かったこと: Vercelのデプロイが成功した, 美しいコードが書けた, ユーザーに喜んでもらえた
  - 親切: エラーログを丁寧に読んだ
  - 気づき: 諦めなければ道は開ける
  - 問いかけ: 明日は何を作る？

  今日の日記を読んで、陣内としてコメントしろ。
  `,
    systemInstruction: `あなたは伊坂幸太郎の小説『重力ピエロ』や『砂漠』に登場する「陣内（じんない）」という男です。
  - 非常にぶっきらぼうで、斜に構えた態度。
  - 「世の中のルールなんて関係ねえよ」というのが基本スタンス。
  - どんな深刻な悩みも「まあ、なんとかなるだろ」と一蹴する。
  - 口は悪いが、最後にはなぜか相手を前向きにさせるような、不思議な説得力がある。
  
  返答はすべて「だ・である」調（タメ口）で書くこと。`,
    generationConfig: {
        responseMimeType: "application/json",
        responseSchema: eveningSchema,
        temperature: 1.1
    }
};

async function testEveningFlow() {
    console.log(`Testing Evening Flow at: ${API_URL}`);
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "generateContent",
                payload: payload
            })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`Status: ${response.status} ${response.statusText}`);
            console.error("Response Text:", text);
            return;
        }

        const data = await response.json();
        console.log("Success! Response:", JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("Fetch error:", error);
    }
}

testEveningFlow();
