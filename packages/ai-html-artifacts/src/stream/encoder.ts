import { SSE_EVENT_NAME } from "../constants/events.js";
import type { ArtifactStreamEvent } from "../types/stream.js";

/**
 * Serialize a protocol event into a single SSE frame. The whole protocol uses
 * one named event (`artifact`) and JSON-encodes the payload on the `data:`
 * line, which keeps multi-line HTML safe (no raw newlines reach the wire).
 */
export function encodeSseEvent(event: ArtifactStreamEvent): string {
  const data = JSON.stringify(event);
  return `event: ${SSE_EVENT_NAME}\ndata: ${data}\n\n`;
}

/** Encode an event directly to bytes for a `ReadableStream<Uint8Array>`. */
export function encodeSseEventBytes(
  event: ArtifactStreamEvent,
  encoder: TextEncoder = new TextEncoder(),
): Uint8Array {
  return encoder.encode(encodeSseEvent(event));
}

/** A comment frame used as a keep-alive heartbeat. */
export function encodeSseComment(text = "keep-alive"): string {
  return `: ${text}\n\n`;
}
