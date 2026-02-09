import handler from '../api/gemini.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

// Mock Request and Response
const mockRes = {
    status: (code: number) => {
        console.log(`[Response Status]: ${code}`);
        return mockRes;
    },
    json: (data: any) => {
        console.log('[Response JSON]:', JSON.stringify(data, null, 2));
        return mockRes;
    },
    end: () => {
        console.log('[Response End]');
        return mockRes;
    }
};

const payloadPath = path.resolve(__dirname, '../test_payload.json');
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));

const mockReq = {
    method: 'POST',
    body: payload
};

console.log("--- Starting Local API Test (Simulation Mode) ---");
console.log(`Action: ${mockReq.body.action}`);
console.log(`Model: ${mockReq.body.payload?.model}`);

// In a real scenario, we'd call the handler. 
// But to prove the "code works if API returns 200 OK", we can inspect the handler logic or force a mock success.
// Since we can't easily force the Google SDK to return success without a valid key/quota,
// I will wrap the handler call and showing what SHOULD happen if allow.

// However, user wants to know if "REALLY" enabling API works. 
// The best proof is that the current error is SPECIFICALLY "Quota Exceeded".
// It's not "Bad Request" (code wrong), not "Unauthorized" (key wrong - although key is right, just quota empty).
// It IS "Resource Exhausted".

handler(mockReq, mockRes).catch(err => {
    console.error("Handler Error:", err);
});
