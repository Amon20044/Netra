import { classifyMode } from "../classifier/classifyMode.js";
import { classifyByRules } from "../classifier/rules.js";
import { CircuitBreaker } from "../circuit-breaker/circuitBreaker.js";
import { event } from "../stream/events.js";
import type { ArtifactStreamProducer, Emit } from "../core/lifecycle.js";
import { latestUserText, resolveServerConfig } from "./config.js";
import { createSseResponse } from "./createSseResponse.js";
import { streamHtmlArtifact } from "./createHtmlArtifactStream.js";
import { streamMarkdown } from "./createMarkdownStream.js";
import { buildHtmlArtifactPrompt } from "../prompts/htmlArtifactPrompt.js";
import type {
  CreateArtifactStreamResponseOptions,
  ResolvedServerConfig,
} from "../types/server.js";
import type { ArtifactMode } from "../types/stream.js";
import type { ArtifactPresentation } from "../types/artifact.js";

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
      await streamHtmlArtifact(resolveHtmlConfigForMode(config, mode), emit);
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
  if (requested === "artifact" || requested === "html_artifact") {
    // Honor an explicit request, but still respect an open circuit.
    return htmlBreaker.allowRequest() ? "artifact" : "markdown";
  }
  if (requested === "generative_ui") {
    return htmlBreaker.allowRequest() ? "generative_ui" : "markdown";
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
  let mode = normalizeMode(
    typeof classification === "string" ? classification : classification.mode,
  );

  // Deterministic override: if the request explicitly signals an inline /
  // camouflage / generative-UI intent, prefer that over a model "artifact" pick
  // (the model often labels a UI showcase as a standalone document). This is
  // what keeps "generative UI", "camouflage", "showcase", etc. transparent.
  if (mode === "artifact" && classifyByRules(query).mode === "generative_ui") {
    mode = "generative_ui";
  }

  if ((mode === "artifact" || mode === "generative_ui") && !htmlBreaker.allowRequest()) {
    return "markdown";
  }
  return mode;
}

function normalizeMode(mode: ArtifactMode | "html_artifact"): ArtifactMode {
  return mode === "html_artifact" ? "artifact" : mode;
}

function resolveHtmlConfigForMode(
  config: ResolvedServerConfig,
  mode: ArtifactMode,
): ResolvedServerConfig {
  const presentation: ArtifactPresentation =
    mode === "generative_ui" ? "seamless" : "card";
  const seamless = presentation === "seamless";

  if (config.htmlSystemPromptOverride) {
    return { ...config, presentation };
  }

  return {
    ...config,
    htmlSystemPrompt: buildHtmlArtifactPrompt({
      // Camouflage must match the host (theme + style profile). A standalone
      // artifact is its OWN world: give it full creative freedom — no host
      // theme and no imposed style profile, so it picks the best design
      // (any palette, light/dark/vivid) per the request.
      styleProfile: seamless ? config.styleProfile : undefined,
      allowExternalFonts: config.sanitize.allowExternalFonts,
      allowVideoEmbeds: config.sanitize.allowVideoEmbeds,
      allowForms: config.sanitize.allowForms,
      theme: seamless ? config.theme : undefined,
      presentation,
    }),
    presentation,
  };
}
