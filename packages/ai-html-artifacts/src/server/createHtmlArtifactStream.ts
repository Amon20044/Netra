import {
  ArtifactLifecycle,
  MessageLifecycle,
  type Emit,
} from "../core/lifecycle.js";
import { StreamingEnvelopeParser } from "../artifacts/artifactEnvelope.js";
import { parseArtifactEnvelope } from "../artifacts/artifactEnvelope.js";
import { ArtifactBuffer } from "../stream/buffering.js";
import { sanitizeHtml } from "../sanitizer/sanitizeHtml.js";
import type { ResolvedServerConfig } from "../types/server.js";

function composeSystem(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join("\n\n");
}

export interface HtmlArtifactStreamResult {
  messageId: string;
  artifactId: string;
  finalHtml: string;
}

export interface HtmlArtifactTextStreamOptions {
  /** Raw model text chunks, already prompted to emit the Netra envelope. */
  textStream: AsyncIterable<string>;
  /** Sanitizer config used for snapshots and final HTML. */
  sanitize: ResolvedServerConfig["sanitize"];
  /** Snapshot cadence in milliseconds. Use 0 for every renderable delta. */
  snapshotIntervalMs?: number;
}

/**
 * Generate an HTML artifact. Streams a short assistant message, then the
 * artifact: `artifact_start`, buffered `artifact_delta`s, periodic sanitized
 * `artifact_snapshot`s, and finally a sanitized `artifact_done` derived from an
 * authoritative full-text parse.
 */
export async function streamHtmlArtifact(
  config: ResolvedServerConfig,
  emit: Emit,
): Promise<HtmlArtifactStreamResult> {
  const textStream = await config.generateTextStream({
    system: composeSystem(config.system, config.htmlSystemPrompt),
    messages: config.messages,
    temperature: config.temperature,
    abortSignal: config.abortSignal,
  });

  return streamHtmlArtifactFromTextStream(
    {
      textStream,
      sanitize: config.sanitize,
      snapshotIntervalMs: config.snapshotIntervalMs,
    },
    emit,
  );
}

/**
 * Provider-agnostic artifact streamer. Use this when a framework such as
 * LangChain gives you an `AsyncIterable<string>`. The caller is responsible
 * for prompting the model with
 * `HTML_ARTIFACT_SYSTEM_PROMPT` (or equivalent) before passing chunks here.
 */
export async function streamHtmlArtifactFromTextStream(
  options: HtmlArtifactTextStreamOptions,
  emit: Emit,
): Promise<HtmlArtifactStreamResult> {
  const message = new MessageLifecycle(emit);
  const artifact = new ArtifactLifecycle(emit);
  const parser = new StreamingEnvelopeParser();
  const buffer = new ArtifactBuffer();
  const snapshotIntervalMs = options.snapshotIntervalMs ?? 0;

  message.start();

  let rawText = "";
  let artifactStarted = false;
  let lastSnapshotAt = 0;

  const maybeSnapshot = (force = false) => {
    const now = Date.now();
    if (!force && now - lastSnapshotAt < snapshotIntervalMs) return;
    const candidate = buffer.commit();
    if (!candidate) return;
    lastSnapshotAt = now;
    const { html } = sanitizeHtml(candidate, options.sanitize);
    artifact.snapshot(html);
  };

  for await (const chunk of options.textStream) {
    rawText += chunk;
    for (const ev of parser.feed(chunk)) {
      if (ev.kind === "message") {
        message.delta(ev.delta);
      } else if (ev.kind === "artifact_open") {
        // The short message ends as soon as the artifact begins.
        message.done();
        artifact.start(ev.title);
        artifactStarted = true;
      } else {
        buffer.append(ev.delta);
        artifact.delta(ev.delta);
        maybeSnapshot();
      }
    }
  }

  // Drain any buffered tail.
  for (const ev of parser.flush()) {
    if (ev.kind === "message") message.delta(ev.delta);
    else if (ev.kind === "artifact_open") {
      message.done();
      artifact.start(ev.title);
      artifactStarted = true;
    } else {
      buffer.append(ev.delta);
      artifact.delta(ev.delta);
    }
  }

  // Authoritative final parse over the entire model output.
  const parsed = parseArtifactEnvelope(rawText);

  if (!artifactStarted) {
    // The streaming split never opened an artifact; recover from the final parse.
    message.done(parsed.assistantMessage || undefined);
    artifact.start(parsed.title);
  } else {
    message.done();
  }

  const finalSource = parsed.hasArtifact ? parsed.html : buffer.raw;
  const { html: finalHtml } = sanitizeHtml(finalSource, options.sanitize);
  artifact.done(finalHtml);

  return {
    messageId: message.id,
    artifactId: artifact.id,
    finalHtml,
  };
}
