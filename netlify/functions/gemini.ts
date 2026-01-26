import { Handler } from "@netlify/functions";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

export const handler: Handler = async (event, context) => {
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "GEMINI_API_KEY is not set on server" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { action, payload } = JSON.parse(event.body || "{}");
    const genAI = new GoogleGenerativeAI(apiKey);

    let result;
    if (action === "generateContent") {
      const model = genAI.getGenerativeModel({
        model: payload.model || "gemini-1.5-flash",
        generationConfig: payload.generationConfig,
        systemInstruction: payload.systemInstruction,
      });
      const response = await model.generateContent(payload.prompt);
      result = response.response.text();
    } else if (action === "chat") {
      const model = genAI.getGenerativeModel({
        model: payload.model || "gemini-1.5-flash",
        systemInstruction: payload.systemInstruction,
      });
      const chat = model.startChat({
        history: payload.history,
      });
      const response = await chat.sendMessage(payload.message);
      result = response.response.text();
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid action" }) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    };
  } catch (error: any) {
    console.error("Netlify Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
