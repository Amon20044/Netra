/** SSE response headers tuned to defeat proxy buffering. */
export const SSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  // Disable nginx buffering so events flush immediately.
  "X-Accel-Buffering": "no",
};

/** Wrap an SSE byte stream in a `Response` with the correct headers. */
export function createArtifactResponse(
  stream: ReadableStream<Uint8Array>,
  init?: ResponseInit,
): Response {
  return new Response(stream, {
    status: init?.status ?? 200,
    headers: { ...SSE_HEADERS, ...(init?.headers as Record<string, string>) },
  });
}
