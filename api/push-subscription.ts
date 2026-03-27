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
        const subscription = req.body;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: "Missing subscription data" });
        }

        // Save subscription to GAS
        const response = await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                auth_token: AUTH_TOKEN,
                app_name: APP_NAME,
                action: "subscribe",
                subscription: JSON.stringify(subscription),
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to save subscription to GAS");
        }

        return res.status(200).json({ ok: true });
    } catch (error: any) {
        console.error("Subscription error:", error);
        return res.status(500).json({ error: error.message });
    }
}
