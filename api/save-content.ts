const GAS_URL = process.env.VITE_GAS_URL || "";
const AUTH_TOKEN = process.env.GAS_AUTH_TOKEN || "jonsonpanson";
const APP_NAME = "6min";

function saveContent(contentType: string, title: string, content: string) {
    fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            auth_token: AUTH_TOKEN,
            app_name: APP_NAME,
            action: "content",
            content_type: contentType,
            title,
            content,
        }),
    }).catch((e) => {
        console.warn("[DriveLogger] Failed to save content:", e);
    });
}

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
