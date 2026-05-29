import { resolveSanitizeOptions } from "./sanitizeConfig.js";
import {
  CSS_EXPRESSION,
  CSS_IMPORT,
  DANGEROUS_URL_ATTR,
  EMBED_BLOCK,
  EMBED_OPEN,
  EVENT_HANDLER_ATTR,
  EXTERNAL_LINK,
  FORM_TAGS,
  INLINE_STYLE_ATTR,
  META_REFRESH,
  SCRIPT_BLOCK,
  SCRIPT_OPEN,
  STYLE_BLOCK,
  STYLESHEET_LINK,
  SVG_BLOCK,
} from "./dangerousPatterns.js";
import type { SanitizeOptions } from "../types/config.js";

// A <link> is kept under allowExternalFonts only if its href starts with a
// Google Fonts host (covers stylesheet links and preconnect hints).
const ALLOWED_FONT_LINK =
  /href\s*=\s*["']https:\/\/fonts\.(googleapis|gstatic)\.com/i;
// An @import is kept only if it targets the Google Fonts CSS host.
const ALLOWED_FONT_IMPORT =
  /@import\s+(?:url\()?\s*["']?https:\/\/fonts\.googleapis\.com/i;

export interface SanitizeResult {
  html: string;
  /** True if any dangerous content was stripped. */
  modified: boolean;
  /** True if the sanitizer crashed and returned an escaped fallback. */
  failedOpen: boolean;
}

/**
 * Strip everything that could execute or load JavaScript from an HTML string,
 * keeping static markup, CSS, SVG, and forms according to `options`.
 *
 * Fail-open: if anything throws, we return the input HTML-escaped inside a
 * `<pre>` so the iframe shows inert text rather than crashing the render.
 */
export function sanitizeHtml(
  input: string,
  options?: SanitizeOptions,
): SanitizeResult {
  const opts = resolveSanitizeOptions(options);

  try {
    if (typeof input !== "string") {
      return { html: "", modified: false, failedOpen: false };
    }

    let html = input;
    const before = html;

    // 1. Scripts — always removed.
    html = html.replace(SCRIPT_BLOCK, "").replace(SCRIPT_OPEN, "");

    // 2. Nested browsing contexts & navigation tricks — always removed.
    html = html
      .replace(EMBED_BLOCK, "")
      .replace(EMBED_OPEN, "")
      .replace(META_REFRESH, "");

    // 3. Inline event handlers — always removed.
    html = html.replace(EVENT_HANDLER_ATTR, "");

    // 4. javascript:/vbscript:/data:text/html URLs — always removed.
    html = html.replace(DANGEROUS_URL_ATTR, "");

    // 5. CSS expression() — always removed.
    html = html.replace(CSS_EXPRESSION, "void(");

    // 6. External CSS / fonts.
    if (opts.allowExternalFonts) {
      // Keep ONLY links/imports pointing at the Google Fonts hosts; strip the
      // rest. This permits distinctive typography without opening a hole for
      // arbitrary external stylesheets.
      html = html
        .replace(EXTERNAL_LINK, (tag) =>
          ALLOWED_FONT_LINK.test(tag) ? tag : "",
        )
        .replace(CSS_IMPORT, (imp) =>
          ALLOWED_FONT_IMPORT.test(imp) ? imp : "",
        );
    } else {
      html = html.replace(STYLESHEET_LINK, "").replace(CSS_IMPORT, "");
      // Remove any remaining <link> (preconnect/font links) too.
      html = html.replace(EXTERNAL_LINK, "");
    }

    // 7. Optional element classes.
    if (!opts.allowStyleTags) html = html.replace(STYLE_BLOCK, "");
    if (!opts.allowInlineStyles) html = html.replace(INLINE_STYLE_ATTR, "");
    if (!opts.allowSvg) html = html.replace(SVG_BLOCK, "");
    if (!opts.allowForms) html = html.replace(FORM_TAGS, "");

    return { html, modified: html !== before, failedOpen: false };
  } catch {
    return {
      html: `<pre>${escapeHtml(String(input))}</pre>`,
      modified: true,
      failedOpen: true,
    };
  }
}

/** Convenience wrapper returning only the sanitized string. */
export function sanitize(input: string, options?: SanitizeOptions): string {
  return sanitizeHtml(input, options).html;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
