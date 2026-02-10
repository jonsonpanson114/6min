import { GoogleGenAI } from "@google/genai";

export default function handler(req: any, res: any) {
    try {
        const client = new GoogleGenAI({ apiKey: "dummy" });
        res.status(200).json({
            status: "Import successful",
            clientType: typeof client,
            nodeVersion: process.version
        });
    } catch (error: any) {
        res.status(500).json({ error: error.toString() });
    }
}
