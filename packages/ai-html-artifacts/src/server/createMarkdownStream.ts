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
  const textStream = await config.generateTextStream({
    system: composeSystem(config.system, config.markdownSystemPrompt),
    messages: config.messages,
    temperature: config.temperature,
    abortSignal: config.abortSignal,
  });

  return streamMarkdownFromTextStream({ textStream }, emit, messageId);
}

export interface MarkdownTextStreamOptions {
  textStream: AsyncIterable<string>;
}

/** Provider-agnostic markdown streamer for any source of text chunks. */
export async function streamMarkdownFromTextStream(
  options: MarkdownTextStreamOptions,
  emit: Emit,
  messageId?: string,
): Promise<string> {
  const message = new MessageLifecycle(emit, messageId);
  message.start();

  for await (const delta of options.textStream) {
    message.delta(delta);
  }

  return message.done();
}
