import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createArtifactStreamResponse } from 'netra/server';
import type { ModelMessage } from 'ai';
import { SITE_THEME } from '../../lib/theme';

export const dynamic = 'force-dynamic';

interface ChatRequestBody {
  messages: ModelMessage[];
}

export async function POST(req: Request) {
  const { messages } = (await req.json()) as ChatRequestBody;

  const provider = req.headers.get('X-Provider') || 'google';
  const apiKey = req.headers.get('X-Api-Key') || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
  const modelId = req.headers.get('X-Model-Id') || 'gemini-2.5-flash';

  let aiModel;

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

  return createArtifactStreamResponse({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: aiModel as any,
    messages,
    mode: 'auto',
    // Generate transparent, chromeless artifacts that match the host theme so
    // they sit inline in the chat ("camouflage"), instead of standalone cards.
    presentation: 'seamless',
    theme: SITE_THEME,
    styleProfile: {
      mood: 'premium',
      density: 'comfortable',
      radius: '2xl',
      visualComplexity: 'rich',
    },
    allowExternalFonts: true,
    temperature: 0.7,
    snapshotIntervalMs: 0,
  });
}