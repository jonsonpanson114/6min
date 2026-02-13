// Inline helper to avoid Vercel import issues
const GAS_URL = "https://script.google.com/macros/s/AKfycbzCQPNsL18vEfa5_8UXFr3phUJG-FarqCn3vbslVSzlet_cok1N5s3D4fpfNTWW8-Npww/exec";
const AUTH_TOKEN = "jonsonpanson";
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
