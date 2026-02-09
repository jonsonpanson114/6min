import { saveContent } from "./drive-logger";

export default async function handler(req: any, res: any) {
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { contentType, title, content } = req.body;

        if (!contentType || !title || !content) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        saveContent(contentType, title, content);

        return res.status(200).json({ ok: true });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
