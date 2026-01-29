import { Handler } from "@netlify/functions";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

const FALLBACK_MODELS: Record<string, string> = {
  "gemini-3-flash-preview": "gemini-2.5-flash",
  "gemini-3-pro-preview": "gemini-2.5-pro",
};

export const handler: Handler = async (event, context) => {
  console.log("Function triggered:", event.httpMethod);

  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is missing.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Netlifyの環境変数が設定されていません。『walkthrough.md』の手順をもう一度確認してください。" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { action, payload } = JSON.parse(event.body || "{}");
  const primaryModelName = payload.model || "gemini-3-flash-preview";
  const genAI = new GoogleGenerativeAI(apiKey);

  const executeWithRetry = async (modelName: string, attempt: number = 1): Promise<string> => {
    try {
      console.log(`Attempt ${attempt}: Calling ${modelName} for action ${action}`);
      let result;
      if (action === "generateContent") {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: payload.generationConfig,
          systemInstruction: payload.systemInstruction,
        });
        const response = await model.generateContent(payload.prompt);
        result = response.response.text();
      } else if (action === "chat") {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: payload.systemInstruction,
        });
        const chat = model.startChat({
          history: payload.history,
        });
        const response = await chat.sendMessage(payload.message);
        result = response.response.text();
      } else if (action === "speech") {
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash", // Use 2.5 Flash for audio generation
        });
        const prompt = `あなたは「陣内」としてこのテキストを読み上げてください。
性格: ぶっきらぼう、タメ口、少し不機嫌そうだが温かい。
読み上げるテキスト: ${payload.text}`;

        const response = await model.generateContent([
          { text: prompt },
          { text: "Output the response as high quality audio in MP3 format." }
        ]);
        // For now, if audio output is not directly available via Simple SDK, 
        // we might return a status or use a workaround. 
        // Note: Real multimodal audio output requires specific SDK handling.
        // As a robust alternative for this environment, we'll return the text 
        // and let the frontend use a specialized TTS if needed, or 
        // assume the SDK supports response.response.audio() in the future.
        result = response.response.text();
      } else {
        throw new Error("Invalid action");
      }
      return result;
    } catch (error: any) {
      console.error(`Error on attempt ${attempt} with ${modelName}:`, error.message);

      const isOverloaded = error.message?.includes("overloaded") || error.status === 503;
      const canRetry = attempt < 2; // Retry once with the same model if overloaded

      if (isOverloaded && canRetry) {
        console.log("Model overloaded, retrying in 1s...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        return executeWithRetry(modelName, attempt + 1);
      }

      // If still failing and it's a Gemini 3 model, try fallback
      if (FALLBACK_MODELS[modelName] && modelName !== FALLBACK_MODELS[modelName]) {
        console.log(`Switching to fallback model: ${FALLBACK_MODELS[modelName]}`);
        return executeWithRetry(FALLBACK_MODELS[modelName], 1);
      }

      throw error;
    }
  };

  try {
    const result = await executeWithRetry(primaryModelName);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    };
  } catch (error: any) {
    console.error("Final Error in Netlify Function:", error);

    let userErrorMessage = "AIとの通信に失敗しました。";
    if (error.message?.includes("overloaded") || error.status === 503) {
      userErrorMessage = "現在AIが非常に混み合っており、安定版への切り替えも失敗しました。数分後に再度お試しください。";
    } else if (error.message?.includes("API key")) {
      userErrorMessage = "APIキーが無効、または設定が間違っている可能性があります。";
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: userErrorMessage, details: error.message }),
    };
  }
};
