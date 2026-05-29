import { SseDecoder } from "./decoder.js";
import type { ArtifactStreamEvent } from "../types/stream.js";

/**
 * Consume a `fetch` Response body as a stream of protocol events. Yields each
 * decoded {@link ArtifactStreamEvent} as it arrives.
 */
export async function* readArtifactStream(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<ArtifactStreamEvent, void, unknown> {
  if (!response.body) {
    throw new Error("Response has no readable body");
  }

  const reader = response.body.getReader();
  const textDecoder = new TextDecoder();
  const sseDecoder = new SseDecoder();

  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      const text = textDecoder.decode(value, { stream: true });
      for (const event of sseDecoder.push(text)) {
        yield event;
      }
    }
    for (const event of sseDecoder.flush()) {
      yield event;
    }
  } finally {
    reader.releaseLock();
  }
}
