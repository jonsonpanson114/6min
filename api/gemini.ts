import { GoogleGenAI } from "@google/genai";
import { sendLog } from "./drive-logger";

export default async function handler(req: any, res: any) {
    // Vercel handles CORS and methods, but let's be explicit
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "APIキーが設定されていません。" });
    }

    const { action, payload } = req.body;
    const modelName = payload?.model || "gemini-flash-latest";
    const client = new GoogleGenAI({ apiKey });

    sendLog("INFO", `API呼出: ${action}`, { model: modelName });

    const executeWithRetry = async (currentModel: string, attempt: number = 1): Promise<string> => {
        try {
            console.log(`[VERCEL-NODE] Attempt ${attempt}: ${currentModel} | Action: ${action}`);
            let result;

            if (action === "generateContent") {
                const response = await client.models.generateContent({
                    model: currentModel,
                    contents: [{ role: "user", parts: [{ text: payload.prompt }] }],
                    config: {
                        systemInstruction: payload.systemInstruction,
                        responseMimeType: payload.generationConfig?.responseMimeType || "application/json",
                        responseSchema: payload.generationConfig?.responseSchema,
                        temperature: payload.generationConfig?.temperature,
                    }
                });
                result = response.text;
            } else if (action === "chat") {
                const response = await client.models.generateContent({
                    model: currentModel,
                    contents: [
                        ...(payload.history || []).map((h: any) => ({
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
                result = payload.text;
            } else {
                throw new Error(`Unknown action: ${action}`);
            }

            if (!result) throw new Error("AI returned an empty response.");
            return result;

        } catch (error: any) {
            console.error(`[VERCEL-FAIL] ${currentModel} error:`, error.message);
            sendLog(attempt < 3 ? "WARN" : "ERROR", `Gemini失敗: ${currentModel} (試行${attempt})`, { error: error.message, action });
            const isBusy = error.message?.includes("503") || error.message?.includes("busy") || error.message?.includes("overloaded") || error.message?.includes("429");

            if (isBusy && attempt < 3) {
                await new Promise(r => setTimeout(r, 2000 * attempt));
                return executeWithRetry(currentModel, attempt + 1);
            }
            // No complicated fallbacks for now, as most models are quota-limited. 
            // Better to fail fast if the main stable model is exhausted.
            throw error;
        }
    };

    try {
        const finalResult = await executeWithRetry(modelName);
        sendLog("INFO", `API成功: ${action}`, { model: modelName });
        return res.status(200).json({ result: finalResult });
    } catch (error: any) {
        sendLog("ERROR", `API最終エラー: ${action}`, { model: modelName, error: error.message });
        return res.status(500).json({
            error: "Vercel移転後のAPIエラーです。",
            details: error.message
        });
    }
}
