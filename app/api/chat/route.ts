import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createArtifactStreamResponse } from 'netra-artifacts/server';
import { generateText, streamText } from 'ai';
import type { CoreMessage, GenerateText, GenerateTextStream } from 'netra-artifacts/server';
import { SITE_THEME } from '../../lib/theme';

export const dynamic = 'force-dynamic';

interface ChatRequestBody {
  messages: CoreMessage[];
}

type VercelLanguageModel = Parameters<typeof streamText>[0]['model'];

export async function POST(req: Request) {
  const { messages } = (await req.json()) as ChatRequestBody;

  const provider = req.headers.get('X-Provider') || 'google';
  const apiKey = req.headers.get('X-Api-Key') || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
  const modelId = req.headers.get('X-Model-Id') || 'gemini-2.5-flash';

  let aiModel: unknown;

  switch (provider) {
    case 'google':
      aiModel = createGoogleGenerativeAI({ apiKey })(modelId);
      break;
    case 'anthropic':
      aiModel = createAnthropic({ apiKey })(modelId);
      break;
    case 'openai':
      aiModel = createOpenAI({ apiKey })(modelId);
      break;
    case 'deepseek':
      aiModel = createDeepSeek({ apiKey })(modelId);
      break;
    case 'openrouter':
      aiModel = createOpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' })(modelId);
      break;
    default:
      aiModel = createGoogleGenerativeAI({ apiKey })(modelId);
      break;
  }

  const generateTextStream: GenerateTextStream = async (args) => {
    let streamError: unknown = null;
    const result = streamText({
      model: aiModel as VercelLanguageModel,
      system: args.system,
      // The app stores text-only chat messages, which are a compatible subset
      // of the Vercel AI SDK's ModelMessage shape.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: args.messages as any,
      temperature: args.temperature,
      abortSignal: args.abortSignal,
      onError: ({ error }) => {
        streamError = error;
      },
    });

    async function* textStream() {
      for await (const delta of result.textStream) {
        yield delta;
      }
      if (streamError) {
        throw streamError instanceof Error ? streamError : new Error(String(streamError));
      }
    }

    return textStream();
  };

  const classifyWithModel: GenerateText = async (args) => {
    const result = await generateText({
      model: aiModel as VercelLanguageModel,
      system: args.system,
      prompt: args.prompt,
      temperature: args.temperature,
      abortSignal: args.abortSignal,
    });
    return result.text;
  };

  return createArtifactStreamResponse({
    messages,
    generateTextStream,
    generateText: classifyWithModel,
    mode: 'auto',
    // Theme/style hints are used only when auto resolves to generative UI.
    // Standalone artifacts stay self-contained and render with their own background.
    theme: SITE_THEME,
    styleProfile: {
      aesthetic: 'dark',
      mood: 'premium',
      density: 'comfortable',
      radius: '2xl',
      colorScheme: 'dark',
      visualComplexity: 'rich',
    },
    allowExternalFonts: true,
    allowVideoEmbeds: true,
    allowScripts: true,
    temperature: 0.7,
    snapshotIntervalMs: 0,
  });
}
