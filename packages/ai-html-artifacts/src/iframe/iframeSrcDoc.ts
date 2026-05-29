import { sanitizeHtml } from "../sanitizer/sanitizeHtml.js";
import { cleanArtifactHtml } from "../artifacts/artifactEnvelope.js";
import type { HtmlArtifactPreviewOptions } from "../types/client.js";
import type { ArtifactTheme } from "../types/artifact.js";
import { DEFAULT_SANDBOX, FORBIDDEN_SANDBOX_TOKENS } from "../constants/sandbox.js";

/** Minimal base styles injected for seamless rendering (transparent, reset). */
const SEAMLESS_BASE = `<style>html,body{margin:0;padding:0;background:transparent!important;}*{box-sizing:border-box;}</style>`;

/**
 * Camouflage enforcement: even if the model paints a page/wrapper background,
 * force the document and any single full-page wrapper transparent so the
 * artifact truly melts into the host surface. `:only-child` targets the classic
 * "one outer card" case without flattening intentional inner cards in a
 * multi-element layout. `!important` wins over the model's plain declarations.
 */
const CAMOUFLAGE_OVERRIDE = `<style>
html,body{background:transparent!important;background-color:transparent!important;background-image:none!important;}
body{color:var(--foreground,#f4f4f8)!important;}
body :where(main,section,article,aside,header,footer,nav,form,div){
  background-image:none!important;
}
body :where(main,section,article,aside,header,footer,nav,form,div)[class]{
  background-color:var(--surface,rgba(255,255,255,0.055))!important;
  color:var(--foreground,#f4f4f8)!important;
  border-color:var(--border,rgba(255,255,255,0.12))!important;
}
body :where(button,a)[class]{
  color:inherit;
}
body>:only-child,
body>:only-child[class]{
  background:transparent!important;
  background-color:transparent!important;
  background-image:none!important;
  box-shadow:none!important;
  border-color:transparent!important;
}
body>:only-child:is(main,section,article,div){
  min-height:auto!important;
}
</style>`;

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

  const themeStyles = theme ? themeToCss(theme) : "";
  // Theme + camouflage come last so their (important) rules win over model CSS.
  const injection = `<base target="_blank" />${seamless ? SEAMLESS_BASE : ""}${themeStyles}${camouflage ? CAMOUFLAGE_OVERRIDE : ""}`;

  if (isFullDocument(html)) {
    return injectIntoHead(html, injection);
  }

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />${injection}</head><body>${html}</body></html>`;
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
