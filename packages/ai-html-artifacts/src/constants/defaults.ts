import type {
  HtmlArtifactPreviewOptions,
} from "../types/client.js";
import type { SanitizeOptions } from "../types/config.js";
import { DEFAULT_SANDBOX } from "./sandbox.js";

/** System font stack used by default in generated artifacts and the UI. */
export const SYSTEM_FONT_STACK =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/** Sanitizer defaults: static-only, script-free. */
export const DEFAULT_SANITIZE_OPTIONS: Required<SanitizeOptions> = {
  allowForms: true,
  allowScripts: false,
  allowInlineStyles: true,
  allowStyleTags: true,
  allowSvg: true,
  allowExternalFonts: false,
  allowVideoEmbeds: false,
  allowModuleImports: false,
};

/** Preview defaults for the iframe card. */
export const DEFAULT_PREVIEW_OPTIONS: Required<HtmlArtifactPreviewOptions> = {
  sandbox: DEFAULT_SANDBOX,
  allowForms: true,
  allowScripts: false,
  allowInlineStyles: true,
  allowStyleTags: true,
  allowSvg: true,
  allowExternalFonts: false,
  allowVideoEmbeds: false,
  allowModuleImports: false,
  sanitize: true,
  seamless: true,
  minHeight: 420,
  maxHeight: 900,
  autoResize: true,
  debounceMs: 32,
  fallbackMode: "last-valid-snapshot",
};

/** Emit an `artifact_snapshot` for every renderable streamed HTML delta. */
export const DEFAULT_SNAPSHOT_INTERVAL_MS = 0;

/** Circuit-breaker tuning. */
export const CIRCUIT_BREAKER_DEFAULTS = {
  failureThreshold: 3,
  windowMs: 60_000,
  cooldownMs: 30_000,
} as const;
