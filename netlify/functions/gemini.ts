import { Handler } from "@netlify/functions";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

const FALLBACK_MODELS: Record<string, string> = {
  "gemini-3-pro-preview": "gemini-3-flash-preview",
  "gemini-3-flash-preview": "gemini-2.0-flash",
};

export const handler: Handler = async (event, context) => {
  console.log("Function triggered:", event.httpMethod);

  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is missing.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "APIキーが設定されていません。" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { action, payload } = JSON.parse(event.body || "{}");
  // ALWAYS trust the requested model if it's latest, or use gemini-3-flash as default
  const primaryModelName = payload.model || "gemini-3-flash-preview";
  const genAI = new GoogleGenerativeAI(apiKey);

  const executeWithRetry = async (modelName: string, attempt: number = 1): Promise<string> => {
    try {
      console.log(`[LATEST] Attempt ${attempt}: Calling ${modelName} for action ${action}`);
      let result;
      if (action === "generateContent") {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: payload.generationConfig,
          systemInstruction: payload.systemInstruction,
        });
        const response = await model.generateContent(payload.prompt);
        result = response.response.text();
      } else if (action === "chat") {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: payload.systemInstruction,
        });
        const chat = model.startChat({
          history: payload.history,
        });
        const response = await chat.sendMessage(payload.message);
        result = response.response.text();
      } else if (action === "speech") {
        // High-end speech generation should also use gemini-2.0 or 3 multimodal
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const response = await model.generateContent([
          { text: `Read this as Jinnai (rough, casual, but caring hidden): ${payload.text}` },
          { text: "Output high quality audio narration." }
        ]);
        result = response.response.text(); // Placeholder for actual audio stream handling
      } else {
        throw new Error(`Invalid action: ${action}`);
      }
      return result;
    } catch (error: any) {
      console.error(`[FAIL] ${modelName} (Attempt ${attempt}):`, error.message);

      const isRecoverable = error.message?.includes("overloaded") ||
        error.message?.includes("503") ||
        error.message?.includes("deadline") ||
        error.status === 504 ||
        error.status === 503;

      const canRetry = attempt < 3; // Retry more persistently for latest models

      if (isRecoverable && canRetry) {
        const delay = 1000 * attempt;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeWithRetry(modelName, attempt + 1);
      }

      // Latest-to-Latest fallback only
      if (FALLBACK_MODELS[modelName] && modelName !== FALLBACK_MODELS[modelName]) {
        console.log(`[FALLBACK] Switching ${modelName} -> ${FALLBACK_MODELS[modelName]}`);
        return executeWithRetry(FALLBACK_MODELS[modelName], 1);
      }

      throw error;
    }
  };

  try {
    const result = await executeWithRetry(primaryModelName);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    };
  } catch (error: any) {
    console.error("Final Error in Netlify Function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "最新AIとの通信に失敗しました。この2026年でも過負荷はあるようです。再試行してください。",
        details: error.message
      }),
    };
  }
};
