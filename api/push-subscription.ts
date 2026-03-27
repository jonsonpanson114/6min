const GAS_URL = process.env.VITE_GAS_URL || "";
const AUTH_TOKEN = process.env.GAS_AUTH_TOKEN || "jonsonpanson";
const APP_NAME = "6min";

export default async function handler(req: any, res: any) {
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const payload = req.body;
        const action = payload.action || 'subscribe';

        // Check if it's a subscription or a ping
        if (action === 'subscribe' && (!payload || !payload.endpoint)) {
            return res.status(400).json({ error: "Missing subscription data" });
        }

        // Save subscription or ping GAS
        const response = await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                auth_token: AUTH_TOKEN,
                app_name: APP_NAME,
                action: action,
                subscription: action === 'subscribe' ? JSON.stringify(payload) : undefined,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GAS returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error: any) {
        console.error("Subscription/Ping error:", error);
        return res.status(500).json({ error: error.message });
    }
}
