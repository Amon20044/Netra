import { streamText } from "ai";
import { MessageLifecycle, type Emit } from "../core/lifecycle.js";
import type { ResolvedServerConfig } from "../types/server.js";

function composeSystem(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join("\n\n");
}

/**
 * Stream a plain markdown answer, emitting `message_start` / `message_delta` /
 * `message_done`. Returns the full assistant text.
 */
export async function streamMarkdown(
  config: ResolvedServerConfig,
  emit: Emit,
  messageId?: string,
): Promise<string> {
  const message = new MessageLifecycle(emit, messageId);
  message.start();

  // The AI SDK's `textStream` swallows errors by default; capture and rethrow
  // so the orchestrator can surface them instead of emitting an empty message.
  let streamError: unknown = null;
  const result = streamText({
    model: config.model,
    system: composeSystem(config.system, config.markdownSystemPrompt),
    messages: config.messages,
    temperature: config.temperature,
    abortSignal: config.abortSignal,
    onError: ({ error }) => {
      streamError = error;
    },
  });

  for await (const delta of result.textStream) {
    message.delta(delta);
  }

  if (streamError) {
    throw streamError instanceof Error ? streamError : new Error(String(streamError));
  }

  return message.done();
}
