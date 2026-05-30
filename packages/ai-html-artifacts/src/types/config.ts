/**
 * Options that govern what the sanitizer is allowed to keep. Defaults are
 * static-only and script-free by default: see `constants/defaults`.
 */
export interface SanitizeOptions {
  /** Keep `<form>`, `<input>`, `<button>`, `<label>`, `<textarea>`, `<select>`. */
  allowForms?: boolean;
  /** Keep inline `<script>` blocks. Off by default; external script URLs stay blocked. */
  allowScripts?: boolean;
  /** Keep inline `style="..."` attributes. */
  allowInlineStyles?: boolean;
  /** Keep `<style>` tags. */
  allowStyleTags?: boolean;
  /** Keep inline `<svg>`. */
  allowSvg?: boolean;
  /** Permit `@import`/external font + stylesheet links. Off by default. */
  allowExternalFonts?: boolean;
  /**
   * Keep trusted video embeds. Currently this is intentionally narrow:
   * YouTube/youtu.be URLs are normalized to youtube.com/embed/* and all other
   * nested browsing contexts are stripped.
   */
  allowVideoEmbeds?: boolean;
}

/** Mode resolution strategy for the server helper. */
export type ArtifactModeOption =
  | "auto"
  | "markdown"
  | "artifact"
  | "generative_ui"
  /** @deprecated Use `artifact` or `generative_ui`. */
  | "html_artifact";
