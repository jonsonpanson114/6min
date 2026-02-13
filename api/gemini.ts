import { GoogleGenAI } from "@google/genai";

// Inline helper to avoid Vercel import issues
const GAS_URL = "https://script.google.com/macros/s/AKfycbzCQPNsL18vEfa5_8UXFr3phUJG-FarqCn3vbslVSzlet_cok1N5s3D4fpfNTWW8-Npww/exec";
const AUTH_TOKEN = "jonsonpanson";
const APP_NAME = "6min";

function sendLog(level: string, message: string, details?: any) {
    // Fire and forget fetch to GAS
    fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            auth_token: AUTH_TOKEN,
            app_name: APP_NAME,
            level,
            message,
            details,
        }),
    }).catch((e) => {
        console.warn("[DriveLogger] Failed to send log:", e);
    });
}

export default async function handler(req: any, res: any) {
    try {
        console.log("[VERCEL] Request received");

        // Vercel handles CORS and methods, but let's be explicit
        if (req.method === "OPTIONS") {
            return res.status(200).end();
        }

        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method Not Allowed" });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("[VERCEL] GEMINI_API_KEY is missing");
            return res.status(500).json({ error: "APIキーが設定されていません (Server Config Error)" });
        }

        let body = req.body;
        // Handle case where body might be a string (sometimes happens in Vercel if content-type isn't perfect)
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                console.error("[VERCEL] Failed to parse body", e);
                return res.status(400).json({ error: "Invalid JSON body" });
            }
        }

        const { action, payload } = body || {};
        if (!action || !payload) {
            return res.status(400).json({ error: "Missing action or payload" });
        }

        const modelName = payload?.model || "gemini-flash-latest";
        console.log(`[VERCEL] Processing action: ${action}, model: ${modelName}`);

        const client = new GoogleGenAI({ apiKey });

        // sendLog is fire-and-forget, wrap it to not crash main thread
        try { sendLog("INFO", `API呼出: ${action}`, { model: modelName, payload }); } catch (e) { console.error("Log error", e); }

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
                try { sendLog(attempt < 3 ? "WARN" : "ERROR", `Gemini失敗: ${currentModel} (試行${attempt})`, { error: error.message, action }); } catch { }

                const isBusy = error.message?.includes("503") || error.message?.includes("busy") || error.message?.includes("overloaded") || error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED");

                if (isBusy && attempt < 3) {
                    await new Promise(r => setTimeout(r, 2000 * attempt));
                    return executeWithRetry(currentModel, attempt + 1);
                }
                throw error;
            }
        };

        const finalResult = await executeWithRetry(modelName);
        try { sendLog("INFO", `API成功: ${action}`, { model: modelName }); } catch { }

        return res.status(200).json({ result: finalResult });

    } catch (error: any) {
        console.error("[VERCEL CRITICAL ERROR]", error);
        try { sendLog("ERROR", "API Critical Error", { error: error.toString(), stack: error.stack }); } catch { }

        return res.status(500).json({
            error: "Internal Server Error (Wrapped)",
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
