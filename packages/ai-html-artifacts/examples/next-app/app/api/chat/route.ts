import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createArtifactStreamResponse } from "netra-artifacts/server";
import type { ModelMessage } from "ai";

export const dynamic = "force-dynamic";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: ModelMessage[] };

  return createArtifactStreamResponse({
    model: google("gemini-2.5-flash"),
    messages,
    mode: "auto",
    styleProfile: {
      aesthetic: "glass",
      mood: "premium",
      density: "comfortable",
      visualComplexity: "rich",
    },
  });
}
