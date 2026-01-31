import { Handler } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

const FALLBACK_MODELS: Record<string, string> = {
  "gemini-3-pro-preview": "gemini-3-flash-preview",
  "gemini-3-flash-preview": "gemini-2.0-flash",
};

export const handler: Handler = async (event, context) => {
  console.log("[2026-ARCH] Netlify Function triggered via Next-Gen SDK");

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "APIキーが設定されていません。" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { action, payload } = JSON.parse(event.body || "{}");
  const modelName = payload.model || "gemini-3-flash-preview";

  // Initialize Next-Gen Client
  const client = new GoogleGenAI({ apiKey });

  const executeWithRetry = async (currentModel: string, attempt: number = 1): Promise<string> => {
    try {
      console.log(`[SDK-GENAI] Attempt ${attempt}: ${currentModel} | Action: ${action}`);

      let result;
      if (action === "generateContent") {
        const response = await client.models.generateContent({
          model: currentModel,
          contents: [{ role: "user", parts: [{ text: payload.prompt }] }],
          config: {
            systemInstruction: payload.systemInstruction,
            ...payload.generationConfig,
            // Map common keys if payload uses old SDK format
            responseMimeType: payload.generationConfig?.responseMimeType || "application/json",
            responseSchema: payload.generationConfig?.responseSchema,
            temperature: payload.generationConfig?.temperature,
          }
        });
        result = response.text;
      } else if (action === "chat") {
        // Chat in @google/genai is also handled via generateContent or startChat
        // For robustness, we use the standard contents based approach
        const response = await client.models.generateContent({
          model: currentModel,
          contents: [
            ...payload.history.map((h: any) => ({
              role: h.role === "model" ? "model" : "user",
              parts: [{ text: h.parts[0].text }]
            })),
            { role: "user", parts: [{ text: payload.message }] }
          ],
          config: {
            systemInstruction: payload.systemInstruction
          }
        });
        result = response.text;
      } else if (action === "speech") {
        result = payload.text; // Native TTS fallback
      } else {
        throw new Error(`Unknown action: ${action}`);
      }

      if (!result) throw new Error("AI returned an empty response.");
      return result;

    } catch (error: any) {
      console.error(`[SDK-FAIL] ${currentModel} error:`, error.message);

      const isBusy = error.message?.includes("503") || error.message?.includes("busy") || error.message?.includes("overloaded");
      const canRetry = attempt < 3;

      if (isBusy && canRetry) {
        const backoff = 1000 * attempt;
        await new Promise(r => setTimeout(r, backoff));
        return executeWithRetry(currentModel, attempt + 1);
      }

      // Fallback Strategy
      if (FALLBACK_MODELS[currentModel]) {
        console.log(`[SDK-FALLBACK] ${currentModel} -> ${FALLBACK_MODELS[currentModel]}`);
        return executeWithRetry(FALLBACK_MODELS[currentModel], 1);
      }

      throw error;
    }
  };

  try {
    const finalResult = await executeWithRetry(modelName);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: finalResult }),
    };
  } catch (error: any) {
    console.error("[CRITICAL-API-ERROR]", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "最新SDKでも通信に失敗しました。2026年のネット環境を再確認してください。",
        details: error.message
      }),
    };
  }
};
