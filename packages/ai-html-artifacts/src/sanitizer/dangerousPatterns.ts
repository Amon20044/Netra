/**
 * Regex building blocks for the static-HTML sanitizer. These are deliberately
 * conservative: the sanitizer's job is to guarantee that no JavaScript can run
 * inside the artifact iframe, regardless of how creative the model gets.
 *
 * The sanitizer is regex-based on purpose: it must run identically on the
 * server (Node) and the client (browser) with zero DOM dependency.
 */

/** `<script>...</script>`, including attributes and across newlines. */
export const SCRIPT_BLOCK = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;
/** A dangling/self-closed `<script ...>` with no closing tag. */
export const SCRIPT_OPEN = /<script\b[^>]*\/?>/gi;

/** `<iframe>`, `<object>`, `<embed>`, `<base>`, `<frame>`, `<frameset>`. */
export const EMBED_BLOCK =
  /<(iframe|object|embed|frame|frameset)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
export const EMBED_OPEN =
  /<(iframe|object|embed|frame|frameset|base)\b[^>]*\/?>/gi;

/** `<meta http-equiv="refresh" ...>` — used for redirect/navigation tricks. */
export const META_REFRESH = /<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi;

/**
 * Inline event-handler attributes (`onclick`, `onload`, `onerror`, ...).
 * Matches quoted, single-quoted, and unquoted values.
 */
export const EVENT_HANDLER_ATTR =
  /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/** `javascript:` / `vbscript:` / `data:text/html` protocol URLs in attributes. */
export const DANGEROUS_URL_ATTR =
  /\s+(href|src|action|formaction|xlink:href|background|poster)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*'|\s*(?:javascript|vbscript):[^\s>]*)/gi;

/** `style="...:expression(...)..."` — legacy IE script-in-CSS vector. */
export const CSS_EXPRESSION = /expression\s*\(/gi;

/** External stylesheet links: `<link rel="stylesheet" ...>`. */
export const STYLESHEET_LINK =
  /<link\b[^>]*rel\s*=\s*["']?stylesheet["']?[^>]*>/gi;
/** Any `<link>` pointing at an http(s) resource (fonts, preconnect, etc.). */
export const EXTERNAL_LINK = /<link\b[^>]*>/gi;

/** `@import url(...)` inside CSS. */
export const CSS_IMPORT = /@import\b[^;]+;?/gi;

/** `<style>...</style>` blocks. */
export const STYLE_BLOCK = /<style\b[^>]*>[\s\S]*?<\/style\s*>/gi;

/** Inline `style="..."` attributes. */
export const INLINE_STYLE_ATTR = /\s+style\s*=\s*(?:"[^"]*"|'[^']*')/gi;

/** `<svg>...</svg>` blocks. */
export const SVG_BLOCK = /<svg\b[^>]*>[\s\S]*?<\/svg\s*>/gi;

/** Form-related tags (open + close), used when forms are disallowed. */
export const FORM_TAGS =
  /<\/?(form|input|button|label|textarea|select|option|fieldset|legend|datalist|output)\b[^>]*>/gi;
