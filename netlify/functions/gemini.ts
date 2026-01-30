import { Handler } from "@netlify/functions";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

const FALLBACK_MODELS: Record<string, string> = {
  "gemini-1.5-pro": "gemini-1.5-flash",
  "gemini-2.0-flash-exp": "gemini-1.5-flash",
};

export const handler: Handler = async (event, context) => {
  console.log("Function triggered:", event.httpMethod);

  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is missing.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Netlifyの環境変数が設定されていません。" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { action, payload } = JSON.parse(event.body || "{}");
  // Normalize model names to ensure existence and stability
  let primaryModelName = payload.model || "gemini-1.5-flash";
  if (primaryModelName.includes("gemini-3") || primaryModelName.includes("gemini-2.5")) {
    primaryModelName = primaryModelName.includes("pro") ? "gemini-1.5-pro" : "gemini-1.5-flash";
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const executeWithRetry = async (modelName: string, attempt: number = 1): Promise<string> => {
    try {
      console.log(`Attempt ${attempt}: Calling ${modelName} for action ${action}`);
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
        // Simple fallback for speech until direct multimodal binary support is fully stabilized in this env
        result = payload.text;
      } else {
        throw new Error(`Invalid action: ${action}`);
      }
      return result;
    } catch (error: any) {
      console.error(`Error on attempt ${attempt} with ${modelName}:`, error.message);

      const isOverloaded = error.message?.includes("overloaded") || error.status === 503 || error.message?.includes("503");
      const isDeadlineExceeded = error.message?.includes("deadline") || error.status === 504;
      const canRetry = attempt < 2;

      if ((isOverloaded || isDeadlineExceeded) && canRetry) {
        console.log("Service busy, retrying in 1.5s...");
        await new Promise(resolve => setTimeout(resolve, 1500));
        return executeWithRetry(modelName, attempt + 1);
      }

      if (FALLBACK_MODELS[modelName] && modelName !== FALLBACK_MODELS[modelName]) {
        console.log(`Switching to fallback model: ${FALLBACK_MODELS[modelName]}`);
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
        error: "AIとの通信に失敗しました。時間をおいて再試行してください。",
        details: error.message
      }),
    };
  }
};
