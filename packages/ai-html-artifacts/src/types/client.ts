import type { HtmlArtifact, ArtifactPresentation, ArtifactTheme } from "./artifact.js";
import type { ArtifactMode } from "./stream.js";

export type ChatRole = "user" | "assistant" | "system";

/** A single chat message tracked by the client hook. */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Present on assistant messages once the mode is known. */
  mode?: ArtifactMode;
  /** Links an assistant message to the artifact it produced. */
  artifactId?: string;
}

/** Overall status of the streaming connection. */
export type ArtifactStreamStatus =
  | "idle"
  | "submitted"
  | "streaming"
  | "done"
  | "error";

export interface UseArtifactStreamOptions {
  /** SSE endpoint that returns the `ArtifactStreamEvent` protocol. */
  endpoint: string;
  /** Extra fields merged into the POST body alongside `messages`. */
  body?: Record<string, unknown>;
  /** Extra request headers. */
  headers?: Record<string, string>;
  /** Initial messages to seed the conversation. */
  initialMessages?: ChatMessage[];
  /** Called whenever a fatal error event or transport error occurs. */
  onError?: (error: Error) => void;
}

export interface UseArtifactStreamReturn {
  messages: ChatMessage[];
  artifacts: Record<string, HtmlArtifact>;
  status: ArtifactStreamStatus;
  mode: ArtifactMode | null;
  error: Error | null;
  /** Append a user message and start streaming the assistant response. */
  sendMessage: (text: string) => Promise<void>;
  /** Abort any in-flight stream and clear all state. */
  reset: () => void;
  /** Abort the in-flight stream without clearing history. */
  stop: () => void;
}

export type CardVariant = "plain" | "glass" | "elevated" | "minimal";
export type CardDensity = "compact" | "comfortable" | "spacious";
export type CardRadius = "md" | "xl" | "2xl" | "3xl";
export type CardShadow = "none" | "soft" | "medium";
export type ArtifactTab = "preview" | "code";

export type PreviewFallbackMode =
  | "last-valid-snapshot"
  | "static-error"
  | "raw-html";

/** Per-iframe rendering options for {@link HtmlArtifactPreview}. */
export interface HtmlArtifactPreviewOptions {
  /** Explicit sandbox attribute. Overrides the allow* flags if provided. */
  sandbox?: string;
  allowForms?: boolean;
  /** Keep inline scripts and use an isolated `allow-scripts` iframe sandbox. Default false. */
  allowScripts?: boolean;
  allowInlineStyles?: boolean;
  allowStyleTags?: boolean;
  allowSvg?: boolean;
  allowExternalFonts?: boolean;
  allowVideoEmbeds?: boolean;
  /** Keep trusted, version-pinned `<script type="importmap">` for ESM games (e.g. three.js). Default false. */
  allowModuleImports?: boolean;
  /** Run the sanitizer before writing srcDoc. Default true. */
  sanitize?: boolean;
  /** Remove iframe chrome so it blends into the card. Default true. */
  seamless?: boolean;
  minHeight?: number;
  maxHeight?: number;
  /** Auto-size the iframe to its content height. Default true. */
  autoResize?: boolean;
  /**
   * Minimum interval (ms) between streamed repaints — a throttle, not a
   * trailing debounce, so a continuous stream still renders steadily. Paints
   * are also aligned to an animation frame. `0` means "every frame" (~60fps).
   * Default 32 (~30fps).
   */
  debounceMs?: number;
  fallbackMode?: PreviewFallbackMode;
}

export interface HtmlArtifactCardProps {
  artifact: HtmlArtifact;
  variant?: CardVariant;
  density?: CardDensity;
  radius?: CardRadius;
  shadow?: CardShadow;
  showToolbar?: boolean;
  defaultTab?: ArtifactTab;
  allowFullscreen?: boolean;
  allowCopy?: boolean;
  allowDownload?: boolean;
  /** Show the "Download PDF" action (native print-to-PDF). Default true. */
  allowPdf?: boolean;
  /**
   * `card` (default) renders a framed, windowed iframe with a toolbar.
   * `seamless` renders a chromeless, transparent iframe inline ("camouflage").
   */
  presentation?: ArtifactPresentation;
  /** Host theme injected into the iframe so the artifact matches the site. */
  theme?: ArtifactTheme;
  previewOptions?: HtmlArtifactPreviewOptions;
  className?: string;
}
