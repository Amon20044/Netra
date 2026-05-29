import { DEFAULT_SNAPSHOT_INTERVAL_MS } from "../constants/defaults.js";
import { MARKDOWN_SYSTEM_PROMPT } from "../prompts/markdownPrompt.js";
import { buildHtmlArtifactPrompt } from "../prompts/htmlArtifactPrompt.js";
import type {
  CoreMessage,
  CreateArtifactStreamResponseOptions,
  ResolvedServerConfig,
} from "../types/server.js";

/** Fill in defaults and precompute the prompts for a request. */
export function resolveServerConfig(
  options: CreateArtifactStreamResponseOptions,
): ResolvedServerConfig {
  const allowForms = options.allowForms ?? true;
  const allowInlineStyles = options.allowInlineStyles ?? true;
  const allowStyleTags = options.allowStyleTags ?? true;
  const allowSvg = options.allowSvg ?? true;
  const allowExternalFonts = options.allowExternalFonts ?? false;

  const htmlSystemPrompt =
    options.htmlSystemPrompt ??
    buildHtmlArtifactPrompt({
      styleProfile: options.styleProfile,
      allowExternalFonts,
      allowForms,
      theme: options.theme,
      presentation: options.presentation,
    });

  return {
    messages: options.messages,
    generateTextStream: options.generateTextStream,
    mode: options.mode ?? "auto",
    generateText: options.generateText,
    classify: options.classify,
    system: options.system,
    markdownSystemPrompt: options.markdownSystemPrompt ?? MARKDOWN_SYSTEM_PROMPT,
    htmlSystemPrompt,
    styleProfile: options.styleProfile,
    sanitize: {
      allowForms,
      allowScripts: false,
      allowInlineStyles,
      allowStyleTags,
      allowSvg,
      allowExternalFonts,
    },
    temperature: options.temperature,
    snapshotIntervalMs:
      options.snapshotIntervalMs ?? DEFAULT_SNAPSHOT_INTERVAL_MS,
    abortSignal: options.abortSignal,
  };
}

/** Extract the latest user message text for classification. */
export function latestUserText(messages: CoreMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!message || message.role !== "user") continue;
    return messageToText(message.content);
  }
  return "";
}

function messageToText(content: CoreMessage["content"]): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "object" && part && "text" in part
          ? String((part as { text: unknown }).text ?? "")
          : "",
      )
      .join(" ")
      .trim();
  }
  return "";
}
