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
const VIDEO_EMBED_PLACEHOLDER = "\uE000netra-video-embed:";
const VIDEO_EMBED_END = "\uE001";
const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{6,64}$/;
const SAFE_YOUTUBE_PARAMS = new Set([
  "autoplay",
  "controls",
  "loop",
  "modestbranding",
  "mute",
  "playsinline",
  "playlist",
  "rel",
  "si",
  "start",
]);

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

    // 2. Nested browsing contexts & navigation tricks. Trusted YouTube video
    // iframes are normalized when explicitly enabled; everything else is stripped.
    const videoEmbeds = opts.allowVideoEmbeds
      ? protectTrustedVideoEmbeds(html)
      : undefined;
    html = (videoEmbeds?.html ?? html)
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
    if (videoEmbeds) {
      html = restoreTrustedVideoEmbeds(html, videoEmbeds.embeds);
    }

    return { html, modified: html !== before, failedOpen: false };
  } catch {
    return {
      html: `<pre>${escapeHtml(String(input))}</pre>`,
      modified: true,
      failedOpen: true,
    };
  }
}

function protectTrustedVideoEmbeds(input: string): {
  html: string;
  embeds: string[];
} {
  const embeds: string[] = [];
  const protect = (tag: string, name: string): string => {
    if (name.toLowerCase() !== "iframe") return "";
    const iframe = normalizeTrustedVideoIframe(tag);
    if (!iframe) return "";
    const index = embeds.push(iframe) - 1;
    return `${VIDEO_EMBED_PLACEHOLDER}${index}${VIDEO_EMBED_END}`;
  };

  const html = input
    .replace(EMBED_BLOCK, (tag, name: string) => protect(tag, name))
    .replace(EMBED_OPEN, (tag, name: string) => protect(tag, name));
  return { html, embeds };
}

function restoreTrustedVideoEmbeds(input: string, embeds: string[]): string {
  return input.replace(
    new RegExp(`${VIDEO_EMBED_PLACEHOLDER}(\\d+)${VIDEO_EMBED_END}`, "g"),
    (_match, index: string) => embeds[Number(index)] ?? "",
  );
}

function normalizeTrustedVideoIframe(tag: string): string | null {
  const src = readAttribute(tag, "src");
  const embedUrl = normalizeYouTubeEmbedUrl(src);
  if (!embedUrl) return null;

  const title = readAttribute(tag, "title") || "YouTube video player";
  const width = readDimensionAttribute(tag, "width") ?? "560";
  const height = readDimensionAttribute(tag, "height") ?? "315";

  return [
    `<iframe width="${width}" height="${height}"`,
    `src="${escapeHtmlAttribute(embedUrl)}"`,
    `title="${escapeHtmlAttribute(title)}"`,
    `loading="lazy"`,
    `frameborder="0"`,
    `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"`,
    `referrerpolicy="strict-origin-when-cross-origin"`,
    `allowfullscreen></iframe>`,
  ].join(" ");
}

function normalizeYouTubeEmbedUrl(src: string | null): string | null {
  if (!src) return null;

  let url: URL;
  try {
    url = new URL(src, "https://www.youtube.com");
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let id = "";
  if (host === "youtu.be") {
    id = url.pathname.split("/").filter(Boolean)[0] ?? "";
  } else if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
      id = parts[1] ?? "";
    } else if (url.pathname === "/watch") {
      id = url.searchParams.get("v") ?? "";
    }
  }

  if (!YOUTUBE_VIDEO_ID.test(id)) return null;

  const out = new URL(`https://www.youtube.com/embed/${id}`);
  for (const [key, value] of url.searchParams) {
    if (key === "v" || key === "t") continue;
    if (SAFE_YOUTUBE_PARAMS.has(key)) out.searchParams.set(key, value);
  }
  const start =
    url.searchParams.get("start") ?? parseYouTubeTimestamp(url.searchParams.get("t"));
  if (start) out.searchParams.set("start", start);
  return out.toString();
}

function parseYouTubeTimestamp(value: string | null): string | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) return value;
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/i);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? String(total) : null;
}

function readAttribute(tag: string, name: string): string | null {
  const pattern = new RegExp(
    `\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const match = tag.match(pattern);
  return match ? match[1] ?? match[2] ?? match[3] ?? "" : null;
}

function readDimensionAttribute(tag: string, name: string): string | null {
  const value = readAttribute(tag, name);
  if (!value || !/^\d{1,5}$/.test(value)) return null;
  return value;
}

function escapeHtmlAttribute(input: string): string {
  return escapeHtml(input).replace(/`/g, "&#96;");
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
