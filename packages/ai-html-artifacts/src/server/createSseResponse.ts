import { createArtifactStream } from "../core/createArtifactStream.js";
import { createArtifactResponse } from "../core/createArtifactResponse.js";
import type { ArtifactStreamProducer } from "../core/lifecycle.js";

/**
 * Compose a producer into a ready-to-return SSE `Response`. This is the bridge
 * between the framework-agnostic core stream and a route handler's return.
 */
export function createSseResponse(
  producer: ArtifactStreamProducer,
  init?: ResponseInit,
): Response {
  const stream = createArtifactStream(producer);
  return createArtifactResponse(stream, init);
}
