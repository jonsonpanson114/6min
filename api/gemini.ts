import { GoogleGenAI } from "@google/genai";

export const config = {
    maxDuration: 60, // Vercel Pro/Hobby limits
};

export default async function handler(req: Request) {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: "APIキーが設定されていません。" }), { status: 500 });
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const { action, payload } = body;
    const modelName = payload?.model || "gemini-3-flash-preview";
    const client = new GoogleGenAI({ apiKey });

    const executeWithRetry = async (currentModel: string, attempt: number = 1): Promise<string> => {
        try {
            console.log(`[VERCEL-EDGE] Attempt ${attempt}: ${currentModel} | Action: ${action}`);
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
        return new Response(JSON.stringify({ result: finalResult }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({
            error: "Vercel移転後のAPIエラーです。",
            details: error.message
        }), { status: 500 });
    }
}
