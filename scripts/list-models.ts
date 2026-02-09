import { GoogleGenAI } from "@google/genai";
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

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("No API Key found.");
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

async function listModels() {
    console.log("Fetching models...");
    try {
        const response: any = await client.models.list();
        // Check if response has a direct array or property
        const data = JSON.stringify(response, null, 2);
        fs.writeFileSync('models_list.json', data);
        console.log("Saved to models_list.json");
    } catch (error: any) {
        console.error("Error listing models:", error);
    }
}

listModels();
