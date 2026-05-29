import type { ArtifactKind } from "./stream.js";

/** Lifecycle state of a single artifact on the client. */
export type ArtifactStatus = "idle" | "streaming" | "complete" | "error";

/**
 * A client-side, reconstructed view of an HTML artifact. `html` is the raw
 * aggregated stream output; `snapshot` is the last sanitized, render-safe
 * version actually shown in the iframe.
 */
export interface HtmlArtifact {
  id: string;
  title: string;
  type: ArtifactKind;
  /** Latest aggregated raw HTML received from the stream. */
  html: string;
  /** Last valid sanitized snapshot suitable for rendering. */
  snapshot: string;
  /**
   * True when this artifact should render as seamless/camouflaged UI: a
   * transparent root document blended into the host surface. Standalone
   * artifacts leave this false/undefined and keep their authored background.
   */
  camouflage?: boolean;
  status: ArtifactStatus;
  createdAt: number;
  updatedAt: number;
}

export type ArtifactAesthetic =
  | "minimal"
  | "glass"
  | "luxury"
  | "startup"
  | "developer"
  | "playful"
  | "enterprise"
  | "dark"
  | "editorial";

export type ArtifactMood =
  | "calm"
  | "premium"
  | "bold"
  | "friendly"
  | "technical"
  | "energetic";

export type ArtifactDensity = "compact" | "comfortable" | "spacious";
export type ArtifactRadius = "sm" | "md" | "xl" | "2xl" | "3xl";
export type ArtifactFont = "system" | "serif" | "mono" | "rounded";
export type ArtifactColorScheme = "auto" | "light" | "dark";
export type ArtifactVisualComplexity = "simple" | "balanced" | "rich";

/**
 * Server-side generation hints. These are injected into the HTML generation
 * prompt so the model produces CSS that matches the requested look and feel.
 */
export interface ArtifactStyleProfile {
  aesthetic?: ArtifactAesthetic;
  mood?: ArtifactMood;
  density?: ArtifactDensity;
  radius?: ArtifactRadius;
  font?: ArtifactFont;
  colorScheme?: ArtifactColorScheme;
  visualComplexity?: ArtifactVisualComplexity;
}

/**
 * How an artifact is presented in the host UI.
 * - `card`: a framed, windowed iframe with a toolbar (the default).
 * - `seamless`: a chromeless, transparent iframe that sits inline in the chat
 *   as if it were native content — no border, no window, no background. Use this
 *   when the host wants artifacts to blend into a consistent UI ("camouflage").
 */
export type ArtifactPresentation = "card" | "seamless";

/**
 * The host application's theme. Passed to the server it is injected into the
 * generation prompt so the model produces artifacts that match the site exactly
 * (instead of inventing an unrelated palette). Passed to the client it is
 * injected into the iframe as CSS custom properties + sensible base styles, so
 * artifacts inherit the host's colours and type — essential for seamless mode.
 */
export interface ArtifactTheme {
  /** `dark` or `light` — anchors the model's contrast decisions. */
  colorScheme?: "light" | "dark";
  /** Page background. In seamless mode the iframe stays transparent regardless. */
  background?: string;
  /** Primary text colour. */
  foreground?: string;
  /** Brand / primary accent colour. */
  primary?: string;
  /** Secondary accent colour. */
  accent?: string;
  /** Muted/secondary text colour. */
  muted?: string;
  /** Hairline / border colour. */
  border?: string;
  /** Surface/card colour for raised elements. */
  surface?: string;
  /** Base corner radius, e.g. "16px". */
  radius?: string;
  /** Font family stack to match the host. */
  fontFamily?: string;
  /** Freeform extra brand guidance for the model (tone, do/don't). */
  notes?: string;
}

/** Result of parsing a model envelope into an assistant message + artifact. */
export interface ParsedArtifactEnvelope {
  assistantMessage: string;
  title: string;
  html: string;
  /** True when a well-formed `<html_artifact>` block was found. */
  hasArtifact: boolean;
}
