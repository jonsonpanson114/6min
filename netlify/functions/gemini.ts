import { Handler } from "@netlify/functions";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

export const handler: Handler = async (event, context) => {
  console.log("Function triggered:", event.httpMethod);

  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is missing.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Netlifyの環境変数が設定されていません。『walkthrough.md』の手順をもう一度確認してください。" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { action, payload } = JSON.parse(event.body || "{}");
    console.log(`Action: ${action}, Model: ${payload.model}`);

    const genAI = new GoogleGenerativeAI(apiKey);

    let result;
    if (action === "generateContent") {
      const model = genAI.getGenerativeModel({
        model: payload.model || "gemini-3-flash-preview",
        generationConfig: payload.generationConfig,
        systemInstruction: payload.systemInstruction,
      });
      const response = await model.generateContent(payload.prompt);
      result = response.response.text();
    } else if (action === "chat") {
      const model = genAI.getGenerativeModel({
        model: payload.model || "gemini-3-flash-preview",
        systemInstruction: payload.systemInstruction,
      });
      const chat = model.startChat({
        history: payload.history,
      });
      const response = await chat.sendMessage(payload.message);
      result = response.response.text();
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid action" }) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    };
  } catch (error: any) {
    console.error("Detailed Error in Netlify Function:", error);

    // Handle specific Google API errors to be more user-friendly
    let userErrorMessage = "AIとの通信に失敗しました。";
    if (error.message?.includes("overloaded") || error.status === 503) {
      userErrorMessage = "現在AIが混み合っているようです。数分後に再度お試しください。";
    } else if (error.message?.includes("API key")) {
      userErrorMessage = "APIキーが無効、または設定が間違っている可能性があります。";
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: userErrorMessage, details: error.message }),
    };
  }
};
