import { encodeSseEventBytes } from "../stream/encoder.js";
import { event } from "../stream/events.js";
import type { ArtifactStreamProducer, Emit } from "./lifecycle.js";

/**
 * Turn an event-emitting producer into an SSE byte stream. The producer is
 * responsible for emitting its own `done` event on success; this wrapper
 * guarantees the stream is always closed and that an uncaught producer error
 * becomes a terminal `error` + `done` pair rather than a hung connection.
 */
export function createArtifactStream(
  producer: ArtifactStreamProducer,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit: Emit = (e) => {
        if (closed) return;
        controller.enqueue(encodeSseEventBytes(e, encoder));
      };

      try {
        await producer(emit);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        emit(event.error(message, false));
        emit(event.done());
      } finally {
        closed = true;
        controller.close();
      }
    },
  });
}
