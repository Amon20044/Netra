import { sanitizeHtml } from "../sanitizer/sanitizeHtml.js";
import { cleanArtifactHtml } from "../artifacts/artifactEnvelope.js";
import type { HtmlArtifactPreviewOptions } from "../types/client.js";
import type { ArtifactTheme } from "../types/artifact.js";
import { DEFAULT_SANDBOX, FORBIDDEN_SANDBOX_TOKENS } from "../constants/sandbox.js";

/**
 * Minimal reset injected for the framed (pure artifact) path: margin/box-sizing
 * only. It must NOT force a background — a standalone artifact owns its own
 * background (often set inline on <html>/<body>), and an !important transparent
 * rule here would override it and reveal the card surface (a white sheet in
 * light mode). Camouflage transparency is handled separately by
 * {@link inlineCamouflageHtml}.
 */
const SEAMLESS_BASE = `<style>html,body{margin:0;padding:0;}*{box-sizing:border-box;}</style>`;

const LIGHT_COLOR =
  /(?:#fff(?:fff)?\b|#f[0-9a-f]{2}f[0-9a-f]{2}f[0-9a-f]{2}\b|#(?:f8fafc|f9fafb|f8f9fa|f5f5f5|f4f4f5|f3f4f6|f1f5f9|fafafa|fcfcfd|fdfdfd)\b|white\b|rgba?\(\s*(?:23[0-9]|24[0-9]|25[0-5])\s*,\s*(?:23[0-9]|24[0-9]|25[0-5])\s*,\s*(?:23[0-9]|24[0-9]|25[0-5])(?:\s*,\s*(?:0?\.[5-9]\d*|1(?:\.0+)?))?\s*\)|hsla?\(\s*(?:0|[12]?\d{1,2}|3[0-5]\d|360)\s*,\s*(?:0|[1-9]\d?|100)%\s*,\s*(?:8[8-9]|9\d|100)%[^)]*\))/i;
const LIGHT_GRADIENT =
  /(?:linear|radial|conic)-gradient\([^;}]*(?:#fff(?:fff)?\b|white\b|rgba?\(\s*255\s*,\s*255\s*,\s*255)[^;}]*\)/i;

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
    "color:var(--foreground,#f4f4f8)!important",
    theme?.fontFamily ? "font-family:var(--font)!important" : "",
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
    "color:var(--foreground,#f4f4f8)!important",
    theme?.fontFamily ? "font-family:var(--font)!important" : "",
  ]
    .filter(Boolean)
    .join(";");
  const blockStyle = [
    "background-color:transparent!important",
    "background-image:none!important",
    "box-sizing:border-box",
    "color:var(--foreground,#f4f4f8)!important",
    "border-color:var(--border,rgba(255,255,255,0.12))!important",
  ].join(";");

  return html.replace(CAMOUFLAGE_TAGS, (tag, name: string, attrs: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName === "html") return `<${name}${appendInlineStyle(attrs, rootStyle)}>`;
    if (lowerName === "body") return `<${name}${appendInlineStyle(attrs, bodyStyle)}>`;
    return `<${name}${appendInlineStyle(attrs, blockStyle)}>`;
  });
}

function normalizeInlineCamouflageStyle(style: string): string {
  return style
    .split(";")
    .map((declaration) => normalizeCamouflageDeclaration(declaration))
    .filter(Boolean)
    .join(";");
}

function normalizeCamouflageCss(css: string): string {
  return css
    .replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selector: string, body: string) => {
      const normalizedBody = body
        .split(";")
        .map((declaration) =>
          normalizeCamouflageDeclaration(
            declaration,
            /\b(html|body)\b/i.test(selector),
          ),
        )
        .filter(Boolean)
        .join(";");
      return normalizedBody ? `${selector}{${normalizedBody}}` : rule;
    });
}

function normalizeCamouflageDeclaration(
  declaration: string,
  forceTransparent = false,
): string {
  const trimmed = declaration.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^(-?[\w-]+)\s*:\s*([\s\S]+)$/);
  if (!match) return trimmed;

  const property = match[1]?.toLowerCase() ?? "";
  const value = match[2] ?? "";
  const important = /!important/i.test(value) ? " !important" : "";
  const cleanValue = value.replace(/!important/gi, "").trim();

  if (property === "background-image" && (forceTransparent || LIGHT_GRADIENT.test(cleanValue) || LIGHT_COLOR.test(cleanValue))) {
    return `${property}:none${important}`;
  }

  if (property.startsWith("--") && LIGHT_COLOR.test(cleanValue)) {
    return `${property}:transparent`;
  }

  if (property === "background" || property === "background-color") {
    if (forceTransparent) return `${property}:transparent${important}`;
    if (LIGHT_COLOR.test(cleanValue) || LIGHT_GRADIENT.test(cleanValue)) {
      return `${property}:transparent${important}`;
    }
  }

  if (property === "color" && LIGHT_COLOR.test(cleanValue)) {
    return `${property}:var(--foreground,#f4f4f8)${important}`;
  }

  return trimmed;
}

export interface BuildSrcDocOptions {
  sanitize?: boolean;
  seamless?: boolean;
  /** Force the document + any single full-page wrapper transparent (camouflage). */
  camouflage?: boolean;
  /** Host theme injected as CSS variables + base color/font into the iframe. */
  theme?: ArtifactTheme;
  sanitizeOptions?: Pick<
    HtmlArtifactPreviewOptions,
    | "allowForms"
    | "allowInlineStyles"
    | "allowStyleTags"
    | "allowSvg"
    | "allowExternalFonts"
  >;
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
  const { sanitize = true, seamless = true, camouflage = false, theme, sanitizeOptions } = options;

  let html = cleanArtifactHtml(rawHtml ?? "");
  if (sanitize) {
    html = sanitizeHtml(html, { ...sanitizeOptions, allowScripts: false }).html;
  }
  if (camouflage) {
    html = normalizeCamouflageHtml(html);
  }

  const themeStyles = theme && !camouflage ? themeToCss(theme) : "";
  const injection = `<base target="_blank" />${seamless && !camouflage ? SEAMLESS_BASE : ""}${themeStyles}`;

  let doc: string;
  if (isFullDocument(html)) {
    doc = injectIntoHead(html, injection);
  } else {
    doc = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />${injection}</head><body>${html}</body></html>`;
  }

  return camouflage ? inlineCamouflageHtml(doc, theme) : doc;
}

/**
 * Resolve the sandbox attribute. An explicit `sandbox` wins; otherwise we build
 * a minimal token set from the flags. Forbidden tokens (notably `allow-scripts`)
 * are stripped no matter what.
 */
export function resolveSandbox(options: {
  sandbox?: string;
  allowForms?: boolean;
}): string {
  const explicit = options.sandbox;
  if (explicit !== undefined) {
    return explicit
      .split(/\s+/)
      .filter(Boolean)
      .filter((t) => !FORBIDDEN_SANDBOX_TOKENS.includes(t as never))
      .join(" ");
  }
  return options.allowForms === false ? "" : DEFAULT_SANDBOX;
}
