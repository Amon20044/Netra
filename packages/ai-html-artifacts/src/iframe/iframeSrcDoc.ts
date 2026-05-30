import { sanitizeHtml } from "../sanitizer/sanitizeHtml.js";
import { cleanArtifactHtml } from "../artifacts/artifactEnvelope.js";
import type { HtmlArtifactPreviewOptions } from "../types/client.js";
import type { ArtifactTheme } from "../types/artifact.js";
import {
  DEFAULT_SANDBOX,
  FORBIDDEN_SANDBOX_TOKENS,
  SANDBOX_TOKENS,
} from "../constants/sandbox.js";
import { trustedModuleCdnOrigins } from "../constants/trustedCdnHosts.js";

/**
 * Minimal reset injected for the framed (pure artifact) path: margin/box-sizing
 * only. It must NOT force a background — a standalone artifact owns its own
 * background (often set inline on <html>/<body>), and an !important transparent
 * rule here would override it and reveal the card surface (a white sheet in
 * light mode). Camouflage transparency is handled separately by
 * {@link inlineCamouflageHtml}.
 */
// The `height:auto/min-height:0 !important` neutralizes viewport-relative root
// heights (height:100%, min-height:100vh) an artifact may set: the preview iframe
// auto-sizes to content, so those would otherwise collapse the frame to ~0 and
// nothing would show. `!important` is required to beat an inline <html style="">.
const SEAMLESS_BASE = `<style>html,body{margin:0;padding:0;height:auto!important;min-height:0!important;}*{box-sizing:border-box;}</style>`;

// Custom, theme-aware scrollbars for any scroll containers INSIDE the artifact
// (e.g. .scroll-x wide tables). The host page's scrollbar CSS can't reach into
// the iframe document, so we inject our own — tinted from the artifact's
// --foreground so it matches whatever palette the artifact/theme uses, with a
// neutral fallback when no theme variable is present.
const SCROLLBAR_CSS = `<style>
*{scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--foreground,var(--fg,#9aa0ab)) 28%,transparent) transparent}
*::-webkit-scrollbar{width:10px;height:10px}
*::-webkit-scrollbar-track{background:transparent}
*::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--foreground,var(--fg,#9aa0ab)) 28%,transparent);border-radius:999px;border:2px solid transparent;background-clip:content-box}
*::-webkit-scrollbar-thumb:hover{background:color-mix(in srgb,var(--foreground,var(--fg,#9aa0ab)) 48%,transparent);background-clip:content-box}
*::-webkit-scrollbar-corner{background:transparent}
</style>`;

const RESIZE_BRIDGE_SCRIPT = `<script>
(() => {
  const type = "netra-artifact:resize";
  const measure = () => {
    try {
      const body = document.body;
      const root = document.documentElement;
      if (!body || !root) return;
      const height = Math.ceil(Math.max(
        body.scrollHeight,
        body.offsetHeight,
        root.scrollHeight,
        root.getBoundingClientRect().height
      ));
      if (height > 0) parent.postMessage({ type, height }, "*");
    } catch {}
  };
  const start = () => {
    measure();
    try {
      const ro = new ResizeObserver(measure);
      ro.observe(document.documentElement);
      if (document.body) ro.observe(document.body);
    } catch {}
    // Late layout settles after the final <style>, web fonts and images: keep
    // re-measuring for a short window so the host locks to the final height.
    [60, 240, 600, 1200].forEach((ms) => setTimeout(measure, ms));
    try { document.fonts && document.fonts.ready.then(measure); } catch {}
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
  window.addEventListener("load", measure);
})();
</script>`;

/**
 * Render a host {@link ArtifactTheme} into a `<style>` block exposing its values
 * as CSS custom properties inside the iframe, plus sensible base color/font so
 * artifacts inherit the host look. Background is intentionally left transparent
 * (the host surface shows through — essential for seamless mode).
 */
export function themeToCss(theme: ArtifactTheme): string {
  const vars: string[] = [];
  const push = (name: string, value?: string) => {
    if (value) vars.push(`${name}:${value}`);
  };
  push("--background", theme.background);
  push("--foreground", theme.foreground);
  push("--primary", theme.primary);
  push("--accent", theme.accent);
  push("--muted", theme.muted);
  push("--border", theme.border);
  push("--surface", theme.surface);
  push("--radius", theme.radius);
  push("--font", theme.fontFamily);

  const root = vars.length ? `:root{${vars.join(";")}}` : "";
  const base: string[] = [];
  if (theme.foreground) base.push("color:var(--foreground)");
  if (theme.fontFamily) base.push("font-family:var(--font)");
  const baseRule = base.length ? `html,body{${base.join(";")}}` : "";
  if (!root && !baseRule) return "";
  return `<style>${root}${baseRule}</style>`;
}

/** True if the string already looks like a full HTML document. */
function isFullDocument(html: string): boolean {
  return /<html[\s>]/i.test(html) || /<!DOCTYPE/i.test(html);
}

function injectIntoHead(doc: string, injection: string): string {
  if (/<\/head\s*>/i.test(doc)) {
    return doc.replace(/<\/head\s*>/i, `${injection}</head>`);
  }
  if (/<head[^>]*>/i.test(doc)) {
    return doc.replace(/<head([^>]*)>/i, `<head$1>${injection}`);
  }
  if (/<html[^>]*>/i.test(doc)) {
    return doc.replace(/<html([^>]*)>/i, `<html$1><head>${injection}</head>`);
  }
  return injection + doc;
}

function themeToInlineVars(theme?: ArtifactTheme): string {
  if (!theme) return "";
  const vars: string[] = [];
  const push = (name: string, value?: string) => {
    if (value) vars.push(`${name}:${value}`);
  };
  push("--background", theme.background);
  push("--foreground", theme.foreground);
  push("--primary", theme.primary);
  push("--accent", theme.accent);
  push("--muted", theme.muted);
  push("--border", theme.border);
  push("--surface", theme.surface);
  push("--radius", theme.radius);
  push("--font", theme.fontFamily);
  return vars.join(";");
}

function normalizeCamouflageHtml(html: string): string {
  return html
    .replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_tag, attrs: string, css: string) => {
      return `<style${attrs}>${normalizeCamouflageCss(css)}</style>`;
    })
    .replace(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi, (_attr, quote: string, css: string) => {
      const normalized = normalizeInlineCamouflageStyle(css);
      return normalized ? ` style=${quote}${normalized}${quote}` : "";
    });
}

const CAMOUFLAGE_TAGS = /<(html|body|main|section|article|aside|header|footer|nav|form|div)\b([^>]*)>/gi;

function appendInlineStyle(attrs: string, style: string): string {
  if (!style) return attrs;
  const styleAttr = attrs.match(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/i);
  if (!styleAttr) return `${attrs} style="${style}"`;

  const quote = styleAttr[1] ?? `"`;
  const existing = styleAttr[2]?.trim();
  const merged = existing ? `${existing};${style}` : style;
  return attrs.replace(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/i, ` style=${quote}${merged}${quote}`);
}

function inlineCamouflageHtml(html: string, theme?: ArtifactTheme): string {
  const themeVars = themeToInlineVars(theme);
  const rootStyle = [
    themeVars,
    "margin:0!important",
    "padding:0!important",
    "background:transparent!important",
    "background-color:transparent!important",
    "background-image:none!important",
    "color-scheme:normal!important",
    "box-sizing:border-box",
    // Inline artifacts are auto-sized to their CONTENT; viewport-relative root
    // heights (height:100%, min-height:100vh) would collapse the frame to ~0.
    "height:auto!important",
    "min-height:0!important",
    "color:var(--foreground,#f4f4f8)!important",
  ]
    .filter(Boolean)
    .join(";");
  const bodyStyle = [
    "margin:0!important",
    "padding:0!important",
    "background:transparent!important",
    "background-color:transparent!important",
    "background-image:none!important",
    "box-sizing:border-box",
    "height:auto!important",
    "min-height:0!important",
    "color:var(--foreground,#f4f4f8)!important",
  ]
    .filter(Boolean)
    .join(";");
  return html.replace(CAMOUFLAGE_TAGS, (tag, name: string, attrs: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName === "html") return `<${name}${appendInlineStyle(attrs, rootStyle)}>`;
    if (lowerName === "body") return `<${name}${appendInlineStyle(attrs, bodyStyle)}>`;
    // Inner blocks keep their OWN surfaces, gradients, text and border colours so
    // data cards stay clearly visible — camouflage only makes the PAGE transparent.
    return tag;
  });
}

function normalizeInlineCamouflageStyle(style: string): string {
  return style
    .split(";")
    .map((declaration) => normalizeCamouflageDeclaration(declaration))
    .filter(Boolean)
    .join(";");
}

// Conditional group at-rules whose CONTENTS are nested style rules we still
// want to normalize (e.g. @media breakpoints). Other at-rules (@keyframes,
// @font-face, @page) are passed through verbatim — their bodies aren't plain
// style declarations and must not be touched.
const NESTED_AT_RULE = /^(media|supports|container)\b/i;

/**
 * Normalize the CSS inside a `<style>` block for camouflage (light → transparent
 * backgrounds, light text → host foreground). Brace-aware: it tracks nesting so
 * conditional group rules like `@media (...) { .x{...} }` are preserved and
 * their inner rules normalized recursively, instead of being mangled by a flat
 * regex. Malformed/partial CSS (mid-stream) is emitted as-is.
 */
function normalizeCamouflageCss(css: string): string {
  let out = "";
  let i = 0;
  const n = css.length;

  while (i < n) {
    const open = css.indexOf("{", i);
    if (open === -1) {
      out += css.slice(i);
      break;
    }

    // Walk to the brace that closes this block, respecting nesting.
    let depth = 1;
    let j = open + 1;
    for (; j < n && depth > 0; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
    }
    // `j` now points just past the matching `}` (or end of string if partial).
    const close = depth === 0 ? j - 1 : n;
    const prelude = css.slice(i, open);
    const inner = css.slice(open + 1, close);
    const selector = prelude.trim();
    const atRule = selector.startsWith("@")
      ? selector.slice(1).match(/^[\w-]+/)?.[0] ?? ""
      : "";

    if (atRule && NESTED_AT_RULE.test(atRule)) {
      out += `${prelude}{${normalizeCamouflageCss(inner)}}`;
    } else if (atRule) {
      out += `${prelude}{${inner}}`;
    } else {
      const normalizedBody = inner
        .split(";")
        .map((declaration) =>
          normalizeCamouflageDeclaration(
            declaration,
            /\b(html|body)\b/i.test(selector),
          ),
        )
        .filter(Boolean)
        .join(";");
      out += normalizedBody ? `${selector}{${normalizedBody}}` : `${prelude}{${inner}}`;
    }

    i = close + 1;
  }

  return out;
}

function normalizeCamouflageDeclaration(
  declaration: string,
  forceTransparent = false,
): string {
  const trimmed = declaration.trim();
  if (!trimmed) return "";

  // Inner content (cards, sections, inline styles) is left untouched so its own
  // surfaces, gradients, text and border colours stay intact — camouflage only
  // makes the PAGE transparent. `forceTransparent` is set only for html/body.
  if (!forceTransparent) return trimmed;

  const match = trimmed.match(/^(-?[\w-]+)\s*:\s*([\s\S]+)$/);
  if (!match) return trimmed;

  const property = match[1]?.toLowerCase() ?? "";
  const value = match[2] ?? "";
  const important = /!important/i.test(value) ? " !important" : "";

  if (property === "background-image") return `background-image:none${important}`;
  if (property === "background" || property === "background-color") {
    return `${property}:transparent${important}`;
  }
  return trimmed;
}

export interface BuildSrcDocOptions {
  sanitize?: boolean;
  seamless?: boolean;
  /** Inject a postMessage auto-resize bridge for isolated script-capable frames. */
  resizeBridge?: boolean;
  /** Force the document + any single full-page wrapper transparent (camouflage). */
  camouflage?: boolean;
  /** Host theme injected as CSS variables + base color/font into the iframe. */
  theme?: ArtifactTheme;
  sanitizeOptions?: Pick<
    HtmlArtifactPreviewOptions,
    | "allowForms"
    | "allowScripts"
    | "allowInlineStyles"
    | "allowStyleTags"
    | "allowSvg"
    | "allowExternalFonts"
    | "allowVideoEmbeds"
    | "allowModuleImports"
  >;
}

/**
 * Defense-in-depth CSP for game frames. The sandbox (no `allow-same-origin`)
 * is the primary boundary; this `<meta>` additionally pins script/connect/worker
 * sources to the trusted ESM CDNs so a stray import can't reach an arbitrary
 * host. Asset hosts (img/media/font) stay open so games can use textures/audio.
 */
function buildModuleCspMeta(): string {
  const cdns = trustedModuleCdnOrigins();
  const directives = [
    "default-src 'none'",
    `script-src 'unsafe-inline' 'wasm-unsafe-eval' ${cdns} blob:`,
    "worker-src blob:",
    "child-src blob:",
    "style-src 'unsafe-inline'",
    "img-src * data: blob:",
    "media-src * data: blob:",
    "font-src * data:",
    `connect-src ${cdns} data: blob:`,
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
    "base-uri 'none'",
  ];
  return `<meta http-equiv="Content-Security-Policy" content="${directives.join("; ")}" />`;
}

/**
 * Produce the final `srcDoc` string for the preview iframe: sanitized (by
 * default), wrapped into a complete document if needed, with seamless base
 * styles and `<base target="_blank">` so any links open in a new tab.
 */
export function buildSrcDoc(
  rawHtml: string,
  options: BuildSrcDocOptions = {},
): string {
  const {
    sanitize = true,
    seamless = true,
    resizeBridge,
    camouflage = false,
    theme,
    sanitizeOptions,
  } = options;

  let html = cleanArtifactHtml(rawHtml ?? "");
  if (sanitize) {
    html = sanitizeHtml(html, sanitizeOptions).html;
  }
  if (camouflage) {
    html = normalizeCamouflageHtml(html);
  }

  const themeStyles = theme && !camouflage ? themeToCss(theme) : "";
  const needsResizeBridge =
    resizeBridge ??
    Boolean(
      sanitizeOptions?.allowScripts ||
        sanitizeOptions?.allowVideoEmbeds ||
        sanitizeOptions?.allowModuleImports,
    );
  // Only games (documents with a trusted importmap) get the strict module CSP —
  // a normal artifact must not be constrained by it. The importmap has already
  // survived sanitize at this point, so its presence reliably marks a game.
  const hasImportmap = /<script\b[^>]*\btype\s*=\s*["']?importmap/i.test(html);
  const cspMeta =
    sanitizeOptions?.allowModuleImports && hasImportmap ? buildModuleCspMeta() : "";
  const injection = `${cspMeta}<base target="_blank" />${SCROLLBAR_CSS}${seamless && !camouflage ? SEAMLESS_BASE : ""}${themeStyles}${needsResizeBridge ? RESIZE_BRIDGE_SCRIPT : ""}`;

  let doc: string;
  if (isFullDocument(html)) {
    doc = injectIntoHead(html, injection);
  } else {
    doc = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />${injection}</head><body>${html}</body></html>`;
  }

  return camouflage ? inlineCamouflageHtml(doc, theme) : doc;
}

/**
 * Resolve the sandbox attribute. An explicit `sandbox` wins, then still passes
 * through the safety filter. When scripts or trusted video embeds need script
 * execution, `allow-same-origin` is removed so generated code cannot run with
 * the host page's origin.
 */
export function resolveSandbox(options: {
  sandbox?: string;
  allowForms?: boolean;
  allowScripts?: boolean;
  allowVideoEmbeds?: boolean;
  allowModuleImports?: boolean;
}): string {
  const explicit = options.sandbox;
  if (explicit !== undefined) {
    return normalizeSandboxTokens(explicit.split(/\s+/)).join(" ");
  }
  const needsScripts =
    options.allowScripts || options.allowVideoEmbeds || options.allowModuleImports;
  if (options.allowForms === false && !needsScripts) return "";
  if (!needsScripts) return DEFAULT_SANDBOX;

  return normalizeSandboxTokens([
    options.allowForms === false ? "" : SANDBOX_TOKENS.FORMS,
    SANDBOX_TOKENS.POPUPS,
    SANDBOX_TOKENS.SCRIPTS,
  ]).join(" ");
}

function normalizeSandboxTokens(tokens: string[]): string[] {
  const filtered = tokens
    .filter(Boolean)
    .filter((token) => !FORBIDDEN_SANDBOX_TOKENS.includes(token as never));
  const unique = Array.from(new Set(filtered));
  if (!unique.includes(SANDBOX_TOKENS.SCRIPTS)) return unique;
  return unique.filter((token) => token !== SANDBOX_TOKENS.SAME_ORIGIN);
}
