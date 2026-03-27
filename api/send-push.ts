import webpush from 'web-push';

const GAS_URL = process.env.VITE_GAS_URL || "";
const AUTH_TOKEN = process.env.GAS_AUTH_TOKEN || "jonsonpanson";
const APP_NAME = "6min";

// VAPID keys from environment
const publicKey = process.env.VITE_VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    'mailto:example@example.com', // Replace with actual email if needed
    publicKey,
    privateKey
  );
}

export default async function handler(req: any, res: any) {
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { title, body, date, type } = req.body;

        // 1. Fetch all subscriptions from GAS
        const gasResponse = await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                auth_token: AUTH_TOKEN,
                app_name: APP_NAME,
                action: "getSubscriptions",
            }),
        });

        if (!gasResponse.ok) {
            throw new Error("Failed to fetch subscriptions from GAS");
        }

        const { subscriptions } = await gasResponse.json();

        if (!subscriptions || !Array.isArray(subscriptions)) {
            return res.status(200).json({ ok: true, message: "No subscriptions found" });
        }

        const results = await Promise.allSettled(
            subscriptions.map(async (subStr: string) => {
                const sub = JSON.parse(subStr);
                console.log(`[Push] Sending push to endpoint: ${sub.endpoint.substring(0, 30)}...`);
                return webpush.sendNotification(
                    sub,
                    JSON.stringify({ title, body, date, type })
                );
            })
        );

        const successes = results.filter(r => r.status === 'fulfilled').length;
        const failures = results.filter(r => r.status === 'rejected').length;

        return res.status(200).json({ 
            ok: true, 
            message: `Sent ${successes} notifications, ${failures} failed.` 
        });
    } catch (error: any) {
        console.error("Send push error:", error);
        return res.status(500).json({ error: error.message });
    }
}
