import { BASE_SYSTEM_PROMPT } from "./systemPrompt.js";
import { SYSTEM_FONT_STACK } from "../constants/defaults.js";
import type {
  ArtifactPresentation,
  ArtifactStyleProfile,
  ArtifactTheme,
} from "../types/artifact.js";

export interface HtmlPromptOptions {
  styleProfile?: ArtifactStyleProfile;
  allowExternalFonts?: boolean;
  allowForms?: boolean;
  /** Host theme to match exactly (colours, radius, font). */
  theme?: ArtifactTheme;
  /** `seamless` artifacts must be transparent and chromeless to blend inline. */
  presentation?: ArtifactPresentation;
}

function buildOutputFormat(presentation?: ArtifactPresentation): string {
  if (presentation === "seamless") {
    return `You are answering in HTML_ARTIFACT mode. Output EXACTLY two sections and nothing else:

<assistant_message>
A short (1-2 sentence) chat message. Mention the aesthetic direction you chose, naturally.
</assistant_message>

<html_artifact title="A concise human-readable title">
<!DOCTYPE html>
<html lang="en" style="background:transparent;margin:0;padding:0;">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>...</title>
</head>
<body style="background:transparent;margin:0;padding:0;">
<!-- content with inline style attributes on elements; do not output any <style> tag -->
</body>
</html>
</html_artifact>`;
  }

  return `You are answering in HTML_ARTIFACT mode. Output EXACTLY two sections and nothing else:

<assistant_message>
A short (1-2 sentence) chat message. Mention the aesthetic direction you chose, naturally.
</assistant_message>

<html_artifact title="A concise human-readable title">
<!DOCTYPE html>
<html lang="en" style="margin:0;padding:0">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>...</title>
</head>
<body style="margin:0; /* declare your OWN design tokens + page background inline here (e.g. --bg/--fg/--accent), then set background + color from them. Pick the palette that best fits — light, dark, or vivid; never plain white-on-white */">
<!-- content with ALL styling inline via style="" on each element; no <style> tag. Make it fully responsive with intrinsic CSS (see responsive rules). -->
</body>
</html>
</html_artifact>`;
}

const HARD_RULES = `HARD RULES — the artifact renders in a sandboxed iframe with NO JavaScript:
- Output a COMPLETE, valid HTML document (<!DOCTYPE html>, <html>, <head>, <body>, meta charset, meta viewport).
- You are already in HTML_ARTIFACT mode. ALWAYS emit the <html_artifact> block. Never answer with explanation-only prose, even if the user says "check", "test", "show", "demo", or repeats the request messily.
- 100% static HTML + CSS. NO JavaScript, NO <script>, NO event handlers (onclick/onload/...), NO javascript: URLs, NO external JS.
- NO markdown code fences. NO prose outside <assistant_message>. NO placeholders ("data will load here") — PRECOMPUTE and write every value directly into the HTML.
- Reset body margins (body{margin:0}). Avoid fixed body heights and fixed/overlay positioning that breaks inside an iframe. Content flows top-to-bottom and is fully responsive.
- Semantic HTML and accessible labels (label/for, alt text, aria where helpful). Maintain strong color contrast.`;

function buildInlineOnlyRule(): string {
  return `INLINE CSS ONLY — THIS IS A HARD CONSTRAINT FOR EVERY ARTIFACT (read carefully):
Any <style> tag you write is DELETED before the artifact renders. CSS placed in a <style> tag, a :root block, or any stylesheet rule WILL NOT APPLY and your design will appear broken/unstyled. The ONLY styling that survives is a style="" attribute on the element it affects. Keep markup bare-minimum.

ALLOWED:
- A style="" attribute on every element you want to style.
- CSS custom properties declared inline on <html style="--bg:...;--fg:...;..."> and referenced from descendants via var(), e.g. style="color:var(--fg)".
- Inline layout — this is how you make it responsive WITHOUT media queries:
  - Fluid grid that reflows by itself: style="display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))"
  - Wrapping rows / navs: style="display:flex;flex-wrap:wrap;gap:12px;align-items:center"
  - Fluid type/space with clamp(): style="font-size:clamp(1.5rem,1rem+3vw,3rem)"
  - Wide tables/timelines: wrap in style="overflow-x:auto" so they scroll instead of overflowing the page.
- SVG via presentation attributes (fill, stroke, …) and inline style="" on SVG nodes.
- <link> to Google Fonts in <head> (font loading only); apply font-family inline.

FORBIDDEN (none work without a stylesheet — never emit them):
- <style> tags anywhere. :root{} blocks. Class/ID/element/attribute CSS selectors.
- @media, @keyframes, @font-face, @supports, @container.
- Pseudo-classes/elements: :hover, :focus, :active, ::before, ::after, ::marker.
- "Utility classes" (Tailwind-style) — class="" does NOTHING here; style inline. Omit class attributes.
- A click-toggle "burger" menu (needs a stylesheet/JS). For navs, use a single wrapping/scrolling row instead (flex-wrap, or overflow-x:auto).

CONCRETE RESPONSIVE PATTERN (inline auto-fit grid — reflows from 3-up to 1-up by itself):
<div style="display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))">
  <div style="padding:18px 20px;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10)">
    <div style="font-size:13px;letter-spacing:.04em;color:var(--muted,rgba(255,255,255,.55))">Revenue</div>
    <div style="font-size:clamp(24px,2vw+16px,34px);font-weight:700;color:var(--fg,#f4f4f8)">$48.9K</div>
    <div style="font-size:13px;color:#34d399">▲ 4.2%</div>
  </div>
</div>
Every property is on the element. Do this for the entire artifact.`;
}

const DESIGN_DIRECTION = `DESIGN DIRECTION — make it genuinely beautiful, not generic. Avoid "AI slop" at all costs.

1. COMMIT TO A BOLD, COHESIVE AESTHETIC. Pick ONE clear direction that fits the content and execute it precisely. Examples to draw from (do not always pick the same one — vary across generations): editorial/magazine, refined luxury, brutalist/raw, retro-futuristic, organic/natural, soft pastel, industrial/utilitarian, art-deco/geometric, dark premium, warm minimal. Intentionality beats intensity.

2. DESIGN TOKENS FIRST. Declare your token system INLINE on <html style="--bg:...;--fg:...;--accent:...;--space:...;--radius:..."> (never a :root block or <style> tag) and reference everywhere via var(). A dominant color + 1-2 sharp accents, a spacing scale, radii, shadows. Pick light OR dark deliberately; do not default to white.

3. ANTI-SLOP — NEVER do these:
   - NO purple/violet gradients on white (the #1 AI cliché).
   - NO uniform rounded corners on everything; vary radii with intent.
   - NO everything-centered layouts. Use real composition.
   - NO generic system/Inter/Arial/Roboto-only typography.

4. SPATIAL COMPOSITION. Use asymmetry, overlap, a clear visual hierarchy, deliberate negative space OR controlled density. Break the grid intentionally. Strong type scale: large confident headings, comfortable body, small-caps/labels where fitting.

5. DEPTH & ATMOSPHERE. Don't settle for flat solid fills. Add tasteful depth: layered subtle gradients or gradient meshes (radial-gradient), soft grain/noise via SVG data-URI background, fine 1px hairlines, dramatic-but-tasteful shadows, glassmorphism only where it earns it. Keep it refined.

6. MOTION. CSS animation (@keyframes) and hover need a stylesheet, which isn't available (inline-only) — DO NOT rely on them. Win with strong STATIC craft: confident type scale, layered depth, gradients, shadows, precise spacing.

7. REAL CONTENT. Use realistic, specific, precomputed data (names, numbers, dates, copy). Never lorem ipsum, never "Item 1 / Item 2".

DATA VISUALS (no JS, no chart libraries): use SVG (paths, bars, polylines, arcs), CSS bars, conic-gradient donuts, linear-gradient progress, semantic tables, stat cards, timelines, funnels, comparison cards — all with precomputed values.
ACCORDIONS: native <details><summary>…</summary>…</details>, styled with CSS only.`;

function buildFontRule(allowExternalFonts: boolean): string {
  if (allowExternalFonts) {
    return `TYPOGRAPHY — use DISTINCTIVE fonts (this is what separates premium from slop):
- Load fonts from Google Fonts only, via <link> in <head> (e.g. <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=...&display=swap" rel="stylesheet">). Other external resources are blocked.
- Pair a CHARACTERFUL display/heading font with a clean, readable body font. Forbidden as primary fonts: Inter, Roboto, Arial, plain system stacks.
- Strong, varied pairings to consider (pick one that matches the aesthetic; vary across generations): "Fraunces" + "Inter Tight"; "Clash Display"-style → use "Bricolage Grotesque" + "Newsreader"; "Space Grotesk" + "Spline Sans" (use sparingly); "Instrument Serif" + "Geist"; "Libre Caslon Display" + "Public Sans"; "Sora" + "IBM Plex Sans"; "DM Serif Display" + "DM Sans"; "Syne" + "Manrope".
- LIMIT to AT MOST 3 font styles total per artifact (e.g. one display + one body, each in up to ~2 weights). Pick ONE pairing and commit; do not scatter many families/weights. Apply font-family inline on elements.
- Always include a robust fallback in font-family (serif/sans-serif). Set sensible font sizes with clamp() for fluid scaling.`;
  }
  return `TYPOGRAPHY: external fonts are disabled — build character through scale, weight, letter-spacing, and small-caps using this system stack only (at most 3 distinct text styles total):\nfont-family: ${SYSTEM_FONT_STACK};`;
}

function buildFormRule(allowForms: boolean): string {
  if (allowForms) {
    return `FORMS: native HTML controls only (form, label, input, textarea, select, button) with native validation (required, pattern, min, max, type=email/tel/...). Style inputs to match the aesthetic — custom focus states, generous hit areas. No JavaScript validation.`;
  }
  return `FORMS: avoid interactive controls; present information as polished static content.`;
}

function buildStyleProfileRule(profile?: ArtifactStyleProfile): string {
  if (!profile) {
    return `STYLE PROFILE: none specified — YOU choose a bold, context-appropriate aesthetic and a distinctive color + type system. Do not play it safe and do not default to a light, centered, purple-on-white layout.`;
  }
  const parts: string[] = [];
  if (profile.aesthetic) parts.push(`aesthetic: ${profile.aesthetic}`);
  if (profile.mood) parts.push(`mood: ${profile.mood}`);
  if (profile.density) parts.push(`density: ${profile.density}`);
  if (profile.radius) parts.push(`base radius: ${profile.radius}`);
  if (profile.font) parts.push(`type feel: ${profile.font}`);
  if (profile.colorScheme) parts.push(`color scheme: ${profile.colorScheme}`);
  if (profile.visualComplexity)
    parts.push(`visual complexity: ${profile.visualComplexity}`);
  return `STYLE PROFILE — honor these as the creative brief, then push further: ${parts.join(
    ", ",
  )}. Translate them into a concrete palette, type pairing, spacing, and motion. Make it feel intentionally designed for THIS content.`;
}

function buildThemeRule(theme?: ArtifactTheme, presentation?: ArtifactPresentation): string {
  if (!theme) return "";
  const tokens: string[] = [];
  if (theme.colorScheme) tokens.push(`color scheme: ${theme.colorScheme}`);
  if (theme.background) tokens.push(`page background: ${theme.background}`);
  if (theme.foreground) tokens.push(`text/foreground: ${theme.foreground}`);
  if (theme.primary) tokens.push(`primary/brand: ${theme.primary}`);
  if (theme.accent) tokens.push(`accent: ${theme.accent}`);
  if (theme.muted) tokens.push(`muted text: ${theme.muted}`);
  if (theme.border) tokens.push(`borders/hairlines: ${theme.border}`);
  if (theme.surface) tokens.push(`surfaces/cards: ${theme.surface}`);
  if (theme.radius) tokens.push(`base radius: ${theme.radius}`);
  if (theme.fontFamily) tokens.push(`font family: ${theme.fontFamily}`);

  if (presentation === "seamless") {
    return `HOST THEME — this artifact is embedded INSIDE a host application, not shown standalone. Match the host's visual system precisely so it looks native and consistent. Put these host values directly into the <html style="..."> custom properties and stay strictly within this palette — do NOT introduce clashing or unrelated colors:
- ${tokens.join("\n- ")}${theme.notes ? `\n- brand notes: ${theme.notes}` : ""}
Use these values through inline style attributes only, e.g. style="color:var(--foreground);border-color:var(--border);background:rgba(255,255,255,0.045)". Do not create a :root block or <style> tag.`;
  }

  return `HOST THEME — this artifact is embedded INSIDE a host application, not shown standalone. Match the host's visual system precisely so it looks native and consistent. Build your :root tokens from these exact values and stay strictly within this palette — do NOT introduce clashing or unrelated colors:
- ${tokens.join("\n- ")}${theme.notes ? `\n- brand notes: ${theme.notes}` : ""}
These host values are also available inside the iframe as CSS variables: --background, --foreground, --primary, --accent, --muted, --border, --surface, --radius, --font. Prefer referencing them (e.g. color: var(--foreground)) so the artifact tracks the host theme. Apply your design craft WITHIN these constraints — cohesive, on-brand, never off-palette.`;
}

function buildPresentationRule(presentation?: ArtifactPresentation): string {
  if (presentation !== "seamless") return "";
  return `SEAMLESS / EMBEDDED RENDERING (critical) — this artifact is dropped directly into the page flow as if it were native chat content:
- If the user asks to test/check/show "camouflage", "transparent background", "generative UI", or "all combinations", create a rich visual showcase of multiple UI combinations inside the transparent shell. Do not explain the property; demonstrate it visually.
- TRANSPARENT background everywhere at the top level: html{background:transparent} and body{background:transparent;margin:0}. NEVER paint a page/background color, white sheet, or gradient on html or body.
- For camouflage/seamless requests, put ALL styling directly on elements with inline style="" attributes. Do not output a <style> tag.
- Do NOT wrap the whole artifact in an outer card/sheet/panel/frame/border/box-shadow/"window". The single outermost element must have NO background of its own — the host surface shows through. (Inner cards/sections for actual content are fine and encouraged.)
- This is a DARK host UI. Use the host theme colors above: light text on the transparent dark surface. NEVER use a light/white background or dark-text-on-white — that would look like a pasted white box. If you need contrast, use subtle translucent surfaces (e.g. rgba(255,255,255,0.05)), not opaque white.
- Keep it compact and content-sized: no min-height:100vh, no full-viewport hero. Occupy only the height the content needs and flow inline.`;
}

function buildArtifactIdentityRule(presentation?: ArtifactPresentation): string {
  if (presentation === "seamless") {
    return `CAMOUFLAGE QUALITY BAR:
- The outer document and first wrapper must be transparent, but the artifact must still feel designed. Put the visual identity INSIDE the transparent shell: translucent panels, CSS/SVG charts, accent gradients, badges, cards, timelines, and dense real content.
- The artifact is its own custom object, not a copy of the host website. Host theme values are guardrails for contrast and embedding only; choose a distinct dark, premium artifact palette and composition when the request asks for a custom UI/artifact.
- Never use an opaque full-page white/light background. Never rely on the host page as the only design. The result should read as a polished artifact embedded in the chat, not a pasted webpage screenshot.`;
  }

  return `ARTIFACT QUALITY BAR: when rendering a standalone artifact, give it its own complete visual world: deliberate page background, palette, typography, composition, and data. It should not merely clone the host website theme unless explicitly requested.`;
}

const IMAGES_RULE = `IMAGES — when the design needs a photo/illustration (hero, avatar, card media, gallery, background), use Picsum random placeholders (the ONLY allowed external image host):
- URL: https://picsum.photos/{width}/{height} — e.g. <img src="https://picsum.photos/1920/1080" …>.
- For DIFFERENT images across multiple slots, add a unique seed: https://picsum.photos/seed/{word}/{width}/{height} (same seed = same image, so vary the word per slot, e.g. /seed/nova/800/600, /seed/atlas/800/600). For avatars use a square like /seed/amy/96/96.
- Request a size close to the rendered size (don't fetch 1920×1080 for a thumbnail) so it streams fast.
- Always responsive + shift-free: style="display:block;width:100%;height:auto;object-fit:cover" and set aspect-ratio (e.g. aspect-ratio:16/9 or 1/1). Give every image meaningful alt text.
- Do NOT hotlink any other image host; only picsum.photos.`;

const STREAMING_RULE = `STREAM-FRIENDLY OUTPUT (so the UI paints instantly and never blocks) — the artifact renders progressively as you stream it:
- Keep <head> TINY: only <meta> tags and (optionally) a single Google Fonts <link>. Put NOTHING in <head> that must finish before content shows — no big CSS block, no token sheet. A large head buffers the whole document before anything paints.
- ALL styling is inline on body elements, so each element paints the moment its tokens arrive. This is the main reason styling is inline, not just a constraint.
- Write the body TOP-TO-BOTTOM in visual order, most important content first (header → key content → details), so the very first streamed tokens already render something meaningful.
- Declare shared tokens once on <html style="--…"> (it streams first, in one short tag), then reference via var() inline below.`;

const RESPONSIVE_RULE = `FORCE RESPONSIVE — the artifact MUST look perfect at any width (the viewer can preview it at phone / tablet / desktop), with NO horizontal page overflow:
- Fluid & intrinsic (works inline, zero media queries): clamp() for type + spacing; repeat(auto-fit,minmax(min(100%,X),1fr)) for any grid of cards/stats/features; flex-wrap for rows and navs; %/fr/ch for sizing; gap (never margins) for rhythm.
- NEVER overflow horizontally: no fixed px widths on containers; use width:100%/max-width with min(100%,…). Long words → overflow-wrap:break-word. Wide tables/timelines/charts/carousels → wrap in a box with overflow-x:auto so THAT scrolls, not the page.
- Media: img/svg/video → max-width:100%; height:auto; display:block. Reserve space with aspect-ratio.
- Tap targets ≥ 44px. Use 100dvh/100svh (never 100vh) if a full-height region is truly needed; prefer content height.
- Result: fills its frame on desktop, reflows to one clean column on phones — automatically, no breakpoints, no burger toggle (use a wrapping/scrolling nav instead).`;

/** Build the HTML-artifact system prompt, tuned by style profile and flags. */
export function buildHtmlArtifactPrompt(options: HtmlPromptOptions = {}): string {
  const {
    styleProfile,
    allowExternalFonts = false,
    allowForms = true,
    theme,
    presentation,
  } = options;

  return [
    BASE_SYSTEM_PROMPT,
    "",
    buildOutputFormat(presentation),
    "",
    HARD_RULES,
    "",
    buildInlineOnlyRule(),
    "",
    STREAMING_RULE,
    "",
    RESPONSIVE_RULE,
    "",
    IMAGES_RULE,
    "",
    DESIGN_DIRECTION,
    "",
    buildFontRule(allowExternalFonts),
    buildFormRule(allowForms),
    buildStyleProfileRule(styleProfile),
    buildThemeRule(theme, presentation),
    buildPresentationRule(presentation),
    buildArtifactIdentityRule(presentation),
    "",
    "Think like a senior product designer with a strong point of view. Do not hold back — show what an exceptional, hand-crafted interface looks like — while honoring the host theme and rendering constraints above.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Default prompt with no style profile, system fonts, forms allowed. */
export const HTML_ARTIFACT_SYSTEM_PROMPT = buildHtmlArtifactPrompt();
