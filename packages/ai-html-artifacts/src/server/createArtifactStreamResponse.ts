import { classifyMode } from "../classifier/classifyMode.js";
import { CircuitBreaker } from "../circuit-breaker/circuitBreaker.js";
import { event } from "../stream/events.js";
import type { ArtifactStreamProducer, Emit } from "../core/lifecycle.js";
import { latestUserText, resolveServerConfig } from "./config.js";
import { createSseResponse } from "./createSseResponse.js";
import { streamHtmlArtifact } from "./createHtmlArtifactStream.js";
import { streamMarkdown } from "./createMarkdownStream.js";
import type {
  CreateArtifactStreamResponseOptions,
  ResolvedServerConfig,
} from "../types/server.js";
import type { ArtifactMode } from "../types/stream.js";

// Shared breaker (process-memory). Falls back to markdown when HTML generation
// keeps failing, so a broken model/prompt doesn't repeatedly burn tokens.
const htmlBreaker = new CircuitBreaker({ key: "html_artifact" });

/**
 * The package's primary server entry point. Classifies the request (unless a
 * mode is forced), emits a `mode` event, then streams the appropriate response
 * as Server-Sent Events. Returns a `Response` ready to return from a Next.js
 * route handler (or any Web-standard handler).
 */
export function createArtifactStreamResponse(
  options: CreateArtifactStreamResponseOptions,
): Response {
  const config = resolveServerConfig(options);

  const producer: ArtifactStreamProducer = async (emit: Emit) => {
    const mode = await resolveMode(config.mode, config);
    emit(event.mode(mode));

    if (mode === "markdown") {
      await streamMarkdown(config, emit);
      emit(event.done());
      return;
    }

    try {
      await streamHtmlArtifact(config, emit);
      htmlBreaker.recordSuccess();
    } catch (err) {
      htmlBreaker.recordFailure();
      const message = err instanceof Error ? err.message : String(err);
      // Recoverable: the client keeps the last valid snapshot it received.
      emit(event.error(`Artifact generation failed: ${message}`, true));
    }

    emit(event.done());
  };

  return createSseResponse(producer);
}

async function resolveMode(
  requested: CreateArtifactStreamResponseOptions["mode"],
  config: ResolvedServerConfig,
): Promise<ArtifactMode> {
  if (requested === "markdown") return "markdown";
  if (requested === "html_artifact") {
    // Honor an explicit request, but still respect an open circuit.
    return htmlBreaker.allowRequest() ? "html_artifact" : "markdown";
  }

  // auto
  const query = latestUserText(config.messages);
  const classification = config.classify
    ? await config.classify({
        query,
        messages: config.messages,
        abortSignal: config.abortSignal,
      })
    : await classifyMode({
        generateText: config.generateText,
        query,
        abortSignal: config.abortSignal,
      });
  const mode = typeof classification === "string" ? classification : classification.mode;

  if (mode === "html_artifact" && !htmlBreaker.allowRequest()) {
    return "markdown";
  }
  return mode;
}
