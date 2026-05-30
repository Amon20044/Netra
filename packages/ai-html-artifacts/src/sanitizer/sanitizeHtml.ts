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
import { isTrustedModuleUrl } from "../constants/trustedCdnHosts.js";

// A <link> is kept under allowExternalFonts only if its href starts with a
// Google Fonts host (covers stylesheet links and preconnect hints).
const ALLOWED_FONT_LINK =
  /href\s*=\s*["']https:\/\/fonts\.(googleapis|gstatic)\.com/i;
// An @import is kept only if it targets the Google Fonts CSS host.
const ALLOWED_FONT_IMPORT =
  /@import\s+(?:url\()?\s*["']?https:\/\/fonts\.googleapis\.com/i;
const VIDEO_EMBED_PLACEHOLDER = "\uE000netra-video-embed:";
const VIDEO_EMBED_END = "\uE001";
const SCRIPT_PLACEHOLDER = "\uE002netra-script:";
const SCRIPT_END = "\uE003";
const IMPORTMAP_PLACEHOLDER = "\uE004netra-importmap:";
const IMPORTMAP_END = "\uE005";
/** `<script type="importmap">...</script>` blocks (kept under allowModuleImports). */
const IMPORTMAP_BLOCK =
  /<script\b[^>]*\btype\s*=\s*["']?importmap["']?[^>]*>[\s\S]*?<\/script\s*>/gi;
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

    // 0. Importmaps — kept only when allowModuleImports is on, and only after
    // their targets are filtered down to trusted, version-pinned CDN URLs. This
    // must run BEFORE the inline-script protection/strip so the importmap block
    // isn't matched and removed by the generic <script> handling below.
    const importmaps = opts.allowModuleImports
      ? protectAllowedImportmaps(html)
      : undefined;
    html = importmaps?.html ?? html;

    // 1. Scripts — removed by default; only final inline blocks may be kept
    // when the caller opts into scripts, or module game code under
    // allowModuleImports (the importmap above is useless without it).
    const scripts =
      opts.allowScripts || opts.allowModuleImports
        ? protectAllowedInlineScripts(html)
        : undefined;
    html = (scripts?.html ?? html).replace(SCRIPT_BLOCK, "").replace(SCRIPT_OPEN, "");

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
    if (scripts) {
      html = restoreAllowedInlineScripts(html, scripts.scripts);
    }
    if (videoEmbeds) {
      html = restoreTrustedVideoEmbeds(html, videoEmbeds.embeds);
    }
    if (importmaps) {
      html = restoreAllowedImportmaps(html, importmaps.maps);
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

function protectAllowedInlineScripts(input: string): {
  html: string;
  scripts: string[];
} {
  const scripts: string[] = [];
  const html = input.replace(SCRIPT_BLOCK, (tag) => {
    const script = normalizeAllowedInlineScript(tag);
    if (!script) return "";
    const index = scripts.push(script) - 1;
    return `${SCRIPT_PLACEHOLDER}${index}${SCRIPT_END}`;
  });
  return { html, scripts };
}

function restoreAllowedInlineScripts(input: string, scripts: string[]): string {
  return input.replace(
    new RegExp(`${SCRIPT_PLACEHOLDER}(\\d+)${SCRIPT_END}`, "g"),
    (_match, index: string) => scripts[Number(index)] ?? "",
  );
}

function protectAllowedImportmaps(input: string): {
  html: string;
  maps: string[];
} {
  const maps: string[] = [];
  const html = input.replace(IMPORTMAP_BLOCK, (tag) => {
    const map = normalizeAllowedImportmap(tag);
    if (!map) return "";
    const index = maps.push(map) - 1;
    return `${IMPORTMAP_PLACEHOLDER}${index}${IMPORTMAP_END}`;
  });
  return { html, maps };
}

function restoreAllowedImportmaps(input: string, maps: string[]): string {
  return input.replace(
    new RegExp(`${IMPORTMAP_PLACEHOLDER}(\\d+)${IMPORTMAP_END}`, "g"),
    (_match, index: string) => maps[Number(index)] ?? "",
  );
}

/**
 * Validate an `<script type="importmap">` block: parse its JSON and keep only
 * mappings whose targets resolve to a trusted, version-pinned ESM CDN. Drops the
 * block entirely if it has no surviving mappings or is malformed. Returns a
 * re-serialized, minimal importmap so nothing but vetted URLs reach the iframe.
 */
function normalizeAllowedImportmap(tag: string): string | null {
  const match = tag.match(/^<script\b[^>]*>([\s\S]*?)<\/script\s*>$/i);
  if (!match) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse((match[1] ?? "").trim());
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const source = parsed as Record<string, unknown>;
  const out: { imports?: Record<string, string>; scopes?: Record<string, Record<string, string>> } = {};

  const imports = filterImportMapping(source.imports);
  if (imports) out.imports = imports;

  if (source.scopes && typeof source.scopes === "object") {
    const scopes: Record<string, Record<string, string>> = {};
    for (const [scope, mapping] of Object.entries(source.scopes as Record<string, unknown>)) {
      const filtered = filterImportMapping(mapping);
      if (filtered) scopes[scope] = filtered;
    }
    if (Object.keys(scopes).length) out.scopes = scopes;
  }

  if (!out.imports && !out.scopes) return null;
  return `<script type="importmap">${JSON.stringify(out)}</script>`;
}

/** Keep only `specifier -> url` entries whose url is a trusted module URL. */
function filterImportMapping(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object") return null;
  const kept: Record<string, string> = {};
  for (const [specifier, target] of Object.entries(value as Record<string, unknown>)) {
    if (typeof target === "string" && isTrustedModuleUrl(target)) {
      kept[specifier] = target;
    }
  }
  return Object.keys(kept).length ? kept : null;
}

function normalizeAllowedInlineScript(tag: string): string | null {
  const match = tag.match(/^<script\b([^>]*)>([\s\S]*?)<\/script\s*>$/i);
  if (!match) return null;

  const attrs = match[1] ?? "";
  if (/\ssrc\s*=/i.test(attrs) || /\son[a-z]+\s*=/i.test(attrs)) return null;

  const type = readAttribute(`<script${attrs}>`, "type");
  if (
    type &&
    !/^(?:module|text\/javascript|application\/javascript)$/i.test(type.trim())
  ) {
    return null;
  }

  const typeAttr = type?.trim().toLowerCase() === "module" ? ' type="module"' : "";
  return `<script${typeAttr}>${match[2] ?? ""}</script>`;
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
