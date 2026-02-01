import { GoogleGenAI } from "@google/genai";

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
    const modelName = payload?.model || "gemini-3-flash-preview";
    const client = new GoogleGenAI({ apiKey });

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
            const isBusy = error.message?.includes("503") || error.message?.includes("busy") || error.message?.includes("overloaded");

            if (isBusy && attempt < 3) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
                return executeWithRetry(currentModel, attempt + 1);
            }

            const FALLBACK_MODELS: Record<string, string> = {
                "gemini-3-pro-preview": "gemini-3-flash-preview",
                "gemini-3-flash-preview": "gemini-2.0-flash",
            };

            if (FALLBACK_MODELS[currentModel]) {
                return executeWithRetry(FALLBACK_MODELS[currentModel], 1);
            }
            throw error;
        }
    };

    try {
        const finalResult = await executeWithRetry(modelName);
        return res.status(200).json({ result: finalResult });
    } catch (error: any) {
        return res.status(500).json({
            error: "Vercel移転後のAPIエラーです。",
            details: error.message
        });
    }
}
