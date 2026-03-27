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
        const body = req.body;
        const { action, subscription, settings } = body;

        // Save subscription to GAS
        const response = await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                auth_token: AUTH_TOKEN,
                app_name: APP_NAME,
                action: action || "subscribe",
                subscription: subscription ? JSON.stringify(subscription) : undefined,
                settings: settings, // Passes { morningHour, morningMinute, ... }
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
