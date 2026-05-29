import type {
  ArtifactPresentation,
  ArtifactStyleProfile,
  ArtifactTheme,
} from "./artifact.js";
import type { ArtifactModeOption } from "./config.js";
import type { ArtifactMode } from "./stream.js";

export type CoreMessageRole = "system" | "user" | "assistant" | "tool";

export interface CoreTextPart {
  type?: string;
  text?: string;
}

export type CoreMessageContent =
  | string
  | CoreTextPart[]
  | Record<string, unknown>[]
  | null
  | undefined;

export interface CoreMessage {
  role: CoreMessageRole;
  content: CoreMessageContent;
}

export interface GenerateTextStreamOptions {
  system?: string;
  messages: CoreMessage[];
  temperature?: number;
  abortSignal?: AbortSignal;
}

export type GenerateTextStream = (
  options: GenerateTextStreamOptions,
) => AsyncIterable<string> | Promise<AsyncIterable<string>>;

export interface GenerateTextOptions {
  system?: string;
  prompt: string;
  temperature?: number;
  abortSignal?: AbortSignal;
}

export type GenerateText = (
  options: GenerateTextOptions,
) => string | Promise<string>;

export interface ClassifyRequest {
  query: string;
  messages: CoreMessage[];
  abortSignal?: AbortSignal;
}

export interface ClassificationDecision {
  mode: ArtifactMode;
  reason?: string;
  source?: string;
}

export type ClassifyRequestHandler = (
  request: ClassifyRequest,
) => ArtifactMode | ClassificationDecision | Promise<ArtifactMode | ClassificationDecision>;

/**
 * Options for {@link createArtifactStreamResponse}. Provider SDKs stay outside
 * the package; pass their streaming text output through `generateTextStream`.
 */
export interface CreateArtifactStreamResponseOptions {
  /** Conversation history in a small provider-neutral message shape. */
  messages: CoreMessage[];
  /** Generate the assistant response as plain text chunks. */
  generateTextStream: GenerateTextStream;

  /** `auto` (default) classifies first; otherwise forces a mode. */
  mode?: ArtifactModeOption;
  /** Optional model-backed text generator for automatic classification. */
  generateText?: GenerateText;
  /** Optional fully custom classifier. Overrides `generateText` classification. */
  classify?: ClassifyRequestHandler;

  /** Overrides the base system prompt prepended to every generation. */
  system?: string;
  /** Overrides the markdown-mode system prompt. */
  markdownSystemPrompt?: string;
  /** Overrides the html-artifact-mode system prompt. */
  htmlSystemPrompt?: string;

  /** Visual hints injected into the HTML generation prompt. */
  styleProfile?: ArtifactStyleProfile;
  /** Host theme injected into the prompt so artifacts match the site exactly. */
  theme?: ArtifactTheme;
  /**
   * How artifacts are presented. `seamless` tells the model to emit a
   * transparent, chromeless document so it blends inline in the host UI.
   * Defaults to `card`.
   */
  presentation?: ArtifactPresentation;

  allowForms?: boolean;
  allowInlineStyles?: boolean;
  allowStyleTags?: boolean;
  allowSvg?: boolean;
  allowExternalFonts?: boolean;

  temperature?: number;

  /**
   * How often (ms) to emit an `artifact_snapshot` while streaming.
   * Defaults to 0, meaning every renderable HTML delta gets a fresh predictive
   * snapshot for immediate iframe repainting.
   */
  snapshotIntervalMs?: number;

  /** AbortSignal forwarded to the model calls. */
  abortSignal?: AbortSignal;
}

/** Internal, fully-resolved configuration used by the stream builders. */
export interface ResolvedServerConfig {
  messages: CoreMessage[];
  generateTextStream: GenerateTextStream;
  mode: ArtifactModeOption;
  generateText?: GenerateText;
  classify?: ClassifyRequestHandler;
  system?: string;
  markdownSystemPrompt: string;
  htmlSystemPrompt: string;
  styleProfile?: ArtifactStyleProfile;
  sanitize: {
    allowForms: boolean;
    allowScripts: false;
    allowInlineStyles: boolean;
    allowStyleTags: boolean;
    allowSvg: boolean;
    allowExternalFonts: boolean;
  };
  temperature?: number;
  snapshotIntervalMs: number;
  abortSignal?: AbortSignal;
}
