import type { LanguageModel, ModelMessage } from "ai";
import type {
  ArtifactPresentation,
  ArtifactStyleProfile,
  ArtifactTheme,
} from "./artifact.js";
import type { ArtifactModeOption } from "./config.js";

/**
 * Options for {@link createArtifactStreamResponse}. `model` and `messages`
 * are the standard Vercel AI SDK primitives; everything else tunes
 * classification, prompting, and what the generated artifact may contain.
 */
export interface CreateArtifactStreamResponseOptions {
  /** The Vercel AI SDK language model used for generation. */
  model: LanguageModel;
  /** Conversation history in AI SDK message form. */
  messages: ModelMessage[];

  /** `auto` (default) classifies first; otherwise forces a mode. */
  mode?: ArtifactModeOption;
  /** Optional cheaper/faster model for classification. Defaults to `model`. */
  classifierModel?: LanguageModel;

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
  model: LanguageModel;
  messages: ModelMessage[];
  mode: ArtifactModeOption;
  classifierModel: LanguageModel;
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
