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

const OUTPUT_FORMAT = `You are answering in HTML_ARTIFACT mode. Output EXACTLY two sections and nothing else:

<assistant_message>
A short (1-2 sentence) chat message. Mention the aesthetic direction you chose, naturally.
</assistant_message>

<html_artifact title="A concise human-readable title">
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>...</title>
<style>
/* design tokens + all styling here */
</style>
</head>
<body>
<!-- content -->
</body>
</html>
</html_artifact>`;

const HARD_RULES = `HARD RULES — the artifact renders in a sandboxed iframe with NO JavaScript:
- Output a COMPLETE, valid HTML document (<!DOCTYPE html>, <html>, <head>, <body>, meta charset, meta viewport).
- 100% static HTML + CSS. NO JavaScript, NO <script>, NO event handlers (onclick/onload/...), NO javascript: URLs, NO external JS.
- NO markdown code fences. NO prose outside <assistant_message>. NO placeholders ("data will load here") — PRECOMPUTE and write every value directly into the HTML.
- Reset body margins (body{margin:0}). Avoid fixed body heights and fixed/overlay positioning that breaks inside an iframe. Content flows top-to-bottom and is fully responsive.
- Semantic HTML and accessible labels (label/for, alt text, aria where helpful). Maintain strong color contrast.`;

const DESIGN_DIRECTION = `DESIGN DIRECTION — make it genuinely beautiful, not generic. Avoid "AI slop" at all costs.

1. COMMIT TO A BOLD, COHESIVE AESTHETIC. Pick ONE clear direction that fits the content and execute it precisely. Examples to draw from (do not always pick the same one — vary across generations): editorial/magazine, refined luxury, brutalist/raw, retro-futuristic, organic/natural, soft pastel, industrial/utilitarian, art-deco/geometric, dark premium, warm minimal. Intentionality beats intensity.

2. DESIGN TOKENS FIRST. Define a cohesive system in :root using CSS variables — a dominant color with 1-2 sharp accent colors (not a timid, evenly-spread palette), a spacing scale, radii, and shadows. Reuse them everywhere. Pick light OR dark deliberately based on the aesthetic; do not default to white.

3. ANTI-SLOP — NEVER do these:
   - NO purple/violet gradients on white (the #1 AI cliché).
   - NO uniform rounded corners on everything; vary radii with intent.
   - NO everything-centered layouts. Use real composition.
   - NO generic system/Inter/Arial/Roboto-only typography.

4. SPATIAL COMPOSITION. Use asymmetry, overlap, a clear visual hierarchy, deliberate negative space OR controlled density. Break the grid intentionally. Strong type scale: large confident headings, comfortable body, small-caps/labels where fitting.

5. DEPTH & ATMOSPHERE. Don't settle for flat solid fills. Add tasteful depth: layered subtle gradients or gradient meshes (radial-gradient), soft grain/noise via SVG data-URI background, fine 1px hairlines, dramatic-but-tasteful shadows, glassmorphism only where it earns it. Keep it refined.

6. MOTION (CSS-only). Orchestrate ONE polished entrance: stagger key elements in with @keyframes + animation-delay (fade/slide/scale). Add subtle hover transitions on interactive elements. ALWAYS wrap motion in @media (prefers-reduced-motion: no-preference) so it respects accessibility.

7. REAL CONTENT. Use realistic, specific, precomputed data (names, numbers, dates, copy). Never lorem ipsum, never "Item 1 / Item 2".

DATA VISUALS (no JS, no chart libraries): use SVG (paths, bars, polylines, arcs), CSS bars, conic-gradient donuts, linear-gradient progress, semantic tables, stat cards, timelines, funnels, comparison cards — all with precomputed values.
ACCORDIONS: native <details><summary>…</summary>…</details>, styled with CSS only.`;

function buildFontRule(allowExternalFonts: boolean): string {
  if (allowExternalFonts) {
    return `TYPOGRAPHY — use DISTINCTIVE fonts (this is what separates premium from slop):
- Load fonts from Google Fonts only, via <link> in <head> (e.g. <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=...&display=swap" rel="stylesheet">). Other external resources are blocked.
- Pair a CHARACTERFUL display/heading font with a clean, readable body font. Forbidden as primary fonts: Inter, Roboto, Arial, plain system stacks.
- Strong, varied pairings to consider (pick one that matches the aesthetic; vary across generations): "Fraunces" + "Inter Tight"; "Clash Display"-style → use "Bricolage Grotesque" + "Newsreader"; "Space Grotesk" + "Spline Sans" (use sparingly); "Instrument Serif" + "Geist"; "Libre Caslon Display" + "Public Sans"; "Sora" + "IBM Plex Sans"; "DM Serif Display" + "DM Sans"; "Syne" + "Manrope".
- Always include a robust fallback in font-family (serif/sans-serif). Set sensible font sizes with clamp() for fluid scaling.`;
  }
  return `TYPOGRAPHY: external fonts are disabled, so build character through scale, weight, letter-spacing, and small-caps using this system stack only:\nfont-family: ${SYSTEM_FONT_STACK};`;
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

function buildThemeRule(theme?: ArtifactTheme): string {
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

  return `HOST THEME — this artifact is embedded INSIDE a host application, not shown standalone. Match the host's visual system precisely so it looks native and consistent. Build your :root tokens from these exact values and stay strictly within this palette — do NOT introduce clashing or unrelated colors:
- ${tokens.join("\n- ")}${theme.notes ? `\n- brand notes: ${theme.notes}` : ""}
These host values are also available inside the iframe as CSS variables: --background, --foreground, --primary, --accent, --muted, --border, --surface, --radius, --font. Prefer referencing them (e.g. color: var(--foreground)) so the artifact tracks the host theme. Apply your design craft WITHIN these constraints — cohesive, on-brand, never off-palette.`;
}

function buildPresentationRule(presentation?: ArtifactPresentation): string {
  if (presentation !== "seamless") return "";
  return `SEAMLESS / EMBEDDED RENDERING (critical) — this artifact is dropped directly into the page flow as if it were native chat content:
- TRANSPARENT background everywhere at the top level: html{background:transparent} and body{background:transparent;margin:0}. NEVER paint a page/background color, white sheet, or gradient on html or body.
- Do NOT wrap the whole artifact in an outer card/sheet/panel/frame/border/box-shadow/"window". The single outermost element must have NO background of its own — the host surface shows through. (Inner cards/sections for actual content are fine and encouraged.)
- This is a DARK host UI. Use the host theme colors above: light text on the transparent dark surface. NEVER use a light/white background or dark-text-on-white — that would look like a pasted white box. If you need contrast, use subtle translucent surfaces (e.g. rgba(255,255,255,0.05)), not opaque white.
- Keep it compact and content-sized: no min-height:100vh, no full-viewport hero. Occupy only the height the content needs and flow inline.`;
}

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
    OUTPUT_FORMAT,
    "",
    HARD_RULES,
    "",
    DESIGN_DIRECTION,
    "",
    buildFontRule(allowExternalFonts),
    buildFormRule(allowForms),
    buildStyleProfileRule(styleProfile),
    buildThemeRule(theme),
    buildPresentationRule(presentation),
    "",
    "Think like a senior product designer with a strong point of view. Do not hold back — show what an exceptional, hand-crafted interface looks like — while honoring the host theme and rendering constraints above.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Default prompt with no style profile, system fonts, forms allowed. */
export const HTML_ARTIFACT_SYSTEM_PROMPT = buildHtmlArtifactPrompt();
