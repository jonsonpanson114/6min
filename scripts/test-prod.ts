
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const payloadPath = path.resolve(__dirname, '../test_payload.json');
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));

const PROD_URL = "https://6min.vercel.app/api/gemini";

console.log(`Testing Production URL: ${PROD_URL}`);
console.log(`Model: ${payload.payload?.model}`);

async function testProd() {
    try {
        const response = await fetch(PROD_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log(`Status: ${response.status} ${response.statusText}`);

        const text = await response.text();
        try {
            const data = JSON.parse(text);
            console.log('Response JSON:', JSON.stringify(data, null, 2));
        } catch (e) {
            console.log('Response Text:', text);
        }

    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

testProd();
