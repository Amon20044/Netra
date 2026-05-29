/**
 * Options that govern what the sanitizer is allowed to keep. Defaults are
 * static-only and script-free: see `constants/defaults`.
 */
export interface SanitizeOptions {
  /** Keep `<form>`, `<input>`, `<button>`, `<label>`, `<textarea>`, `<select>`. */
  allowForms?: boolean;
  /** Always coerced to `false`. Scripts are never permitted. */
  allowScripts?: false;
  /** Keep inline `style="..."` attributes. */
  allowInlineStyles?: boolean;
  /** Keep `<style>` tags. */
  allowStyleTags?: boolean;
  /** Keep inline `<svg>`. */
  allowSvg?: boolean;
  /** Permit `@import`/external font + stylesheet links. Off by default. */
  allowExternalFonts?: boolean;
}

/** Mode resolution strategy for the server helper. */
export type ArtifactModeOption =
  | "auto"
  | "markdown"
  | "artifact"
  | "generative_ui"
  /** @deprecated Use `artifact` or `generative_ui`. */
  | "html_artifact";
