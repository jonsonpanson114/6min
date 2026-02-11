import { sendLog } from "./drive-logger";

export default async function handler(req: any, res: any) {
    try {
        console.log("Attempting to send log...");
        // Await it this time to catch errors, even though real app doesn't await
        // But wait, real app DOESN'T await. So we should test that behavior?
        // Let's try to simulate the real app: fire and forget, then return.

        sendLog("INFO", "Verify Logger Test", { timestamp: Date.now() });

        // Slight delay to allow fetch to initiate
        await new Promise(r => setTimeout(r, 100));

        res.status(200).json({
            status: "Log initiated (fire-and-forget)",
            nodeVersion: process.version
        });
    } catch (error: any) {
        res.status(500).json({ error: error.toString() });
    }
}
