import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

export async function POST(req: Request) {
  try {
    const { provider, apiKey, modelId } = await req.json();
    let aiModel;

    switch (provider) {
      case "google":
        aiModel = createGoogleGenerativeAI({ apiKey })(modelId || "gemini-2.5-flash");
        break;
      case "anthropic":
        aiModel = createAnthropic({ apiKey })(modelId || "claude-3-5-sonnet-latest");
        break;
      case "openai":
        aiModel = createOpenAI({ apiKey }).chat(modelId || "gpt-4o");
        break;
      case "deepseek":
        aiModel = createDeepSeek({ apiKey })(modelId || "deepseek-chat");
        break;
      case "groq":
        aiModel = createGroq({ apiKey })(modelId || "llama-3.3-70b-versatile");
        break;
      case "openrouter":
        aiModel = createOpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1" }).chat(modelId || "google/gemini-2.5-flash");
        break;
      default:
        return new Response(JSON.stringify({ error: "Invalid provider" }), { status: 400 });
    }

    const result = await generateText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: aiModel as any,
      prompt: "hi",
    });

    if (result && result.text) {
      return new Response(JSON.stringify({ success: true, text: result.text }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Empty response" }), { status: 400 });
  } catch (err: unknown) {
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message || "Failed" }), { status: 400 });
  }
}
