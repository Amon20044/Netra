---
name: responsive-html-css-nojs
description: Generate lean, fully responsive HTML+CSS that works on every screen with no JavaScript. Use whenever building web UI, components, pages, emails, landing pages, dashboards, cards, navs, modals, tabs, accordions, or any layout that must adapt across mobile/tablet/desktop. Trigger this for grid/flex layouts, fluid typography, pure-CSS interactions, or when asked to minimize markup, avoid JS, or keep output token-light. Also use when emitting UI as structured JSON.
---

# Responsive HTML/CSS, No JS

Goal: maximum responsive output, minimum markup, zero JavaScript, zero bloat. Every interaction below is pure CSS/HTML.

## Core rules (always)

1. **Mobile-first.** Base styles = smallest screen. Add complexity upward only via `min-width` queries or intrinsic sizing.
2. **Prefer intrinsic > queries.** Most "responsive" needs no media query. Reach for `clamp()`, `minmax()`, `auto-fit`, `flex-wrap` first. Media queries are the last resort, not the first.
3. **One viewport meta, always:** `<meta name="viewport" content="width=device-width,initial-scale=1">`.
4. **`box-sizing:border-box` globally** (`*,*::before,*::after`). Non-negotiable.
5. **No fixed widths/heights** on content. Use `max-width`, `min()`, `%`, `fr`, `ch`. Heights grow with content.
6. **Relative units:** `rem` for spacing/type, `%`/`fr`/`vw` for layout, `ch` for text measure, `px` only for borders/hairlines.
7. **Semantic tags = free a11y + less CSS:** `header main nav section article aside footer button a ul li figure`. Don't `<div>` what a tag already names.
8. **Less markup wins.** No wrapper unless it earns its keep (it creates a formatting context, a flex/grid parent, or a paint boundary). Style children directly via `>` and gap, not via inner spacer divs.

## Sandboxed chat artifacts (hybrid: one shared `<style>` + inline)

Some renderers (e.g. sandboxed, streamed chat artifacts) run **one tiny shared `<style>` design system** plus **inline `style=""`** for everything else, inside a no-JS sandbox. This keeps output token-light and consistent while the body still streams and paints element-by-element. Rules:

- **One small `<style>` in `<head>`** (~20 flat lines). Put ONLY what repeats:
  - Reset: `*,*::before,*::after{box-sizing:border-box}`.
  - A fluid type+space **scale** as variables on `html`, each a single `clamp()` — so one document is compact on phones and comfortable on desktop with no breakpoints: `html{--s0:clamp(13px,.55vw+11.5px,16px);--h1:clamp(28px,4vw+12px,56px);--gap:clamp(14px,2.5vw,30px);--pad:clamp(16px,3.5vw,36px);font-size:var(--s0);line-height:1.5}`.
  - **Element defaults** so children inherit instead of being restyled: `h1/h2/h3` sized from `--h*`, `p{margin:0}`, `table{width:100%;border-collapse:collapse}`, `img,svg{display:block;max-width:100%}`.
  - A few **utility classes**: `.wrap .stack .grid .row .card .control .scroll-x`.
- **Color/radius tokens inline on the root:** `<html style="--bg:#0f121b;--fg:#e0e7ff;--surface:rgba(255,255,255,.05);--border:rgba(255,255,255,.1);--radius:14px">` (streams first, lets a host theme apply); the `<style>` references them via `var()`.
- **Style everything else inline** — per-element colors, weights, one-off sizes, SVG attrs, the actual values. Structure via the utility classes; inline only for what's unique to that element.
- **Optional 3rd tier — 1–2 `@media` breakpoints** *inside* the one `<style>*, only for true layout shifts the clamp scale can't express (e.g. 2-col → stacked, drop a side column). The artifact is measured by its **iframe's** width, so width queries behave like container queries.
- **Tier order:** inline per-element (1) → shared clamp scale + utilities (2) → `@media` for structural shifts (3).
- **Transparent / embedded ("camouflage") contexts:** only the PAGE (html/body + the single outer wrapper) is transparent so the artifact blends into the host — but every DATA CARD / PANEL still needs its OWN visible surface (a subtle filled/gradient `--surface` + a 1px hairline border). Never leave content floating on the bare background; give cards depth for readability and vary fill strength by importance.
- **No horizontal overflow, ever:** containers `max-width:100%`/`min(100%,…)`, never fixed px; text `overflow-wrap:break-word`; wide tables/charts → `.scroll-x` wrapper.
- **Navs can't be burgers** (no JS toggle) → a single **wrapping or horizontally-scrolling** `.row`.
- **No bare browser-default controls:** filters, dropdowns, selects, and buttons must look designed, not like tiny OS default boxes. Add a `.control` utility or equivalent inline styles with `min-height:44px`, filled/gradient surface, 1px border, inherited font, comfortable padding, and token radius. For select arrows, use a Unicode glyph sibling (`▼`) inside a `position:relative` wrapper or leave the native arrow; never a CSS data-URI arrow in `style=""`.
- **Fonts:** at most **3 styles** total (one display + one body, ≤2 weights). **Motion:** none (no `@keyframes`/`:hover`) — win with static depth.

### Three failure modes that break these artifacts (avoid always)
- **The artifact is AUTO-SIZED to its content** — the iframe resizes to the document height. So NEVER set `height`/`min-height` to `100%`, `100vh`, or `100dvh` on `<html>`/`<body>`, and never vertically center the whole document against the viewport (`body{min-height:100vh;display:flex;justify-content:center}`). A viewport-relative ROOT height has no fixed height to resolve against and collapses the frame to ~0 — the artifact renders blank. Let content define the page height; give explicit heights only to individual inner boxes (e.g. a chart container).
- **No `position:sticky` / `position:fixed`.** In a sandboxed/transparent ("camouflage") iframe a sticky/fixed bar ghosts over content as it scrolls or detaches from layout (its background is often forced transparent). Keep headers/navs in normal document flow.
- **Never backslash-escape quotes in an attribute, and never put a data-URI `<svg>` inside `style=""`.** In HTML attributes `\"` is *not* an escape — the first inner double-quote closes the attribute and the rest of the CSS leaks onto the page as visible text. For select arrows/icons use a Unicode glyph (`▾ ✓ →`) or a real inline `<svg>` sibling element, not a CSS `background-image` data-URI.

**Why this still streams fast:** the `<head>` stays tiny (one short `<style>`), so the body streams and **paints element-by-element as it arrives**. Keep `<head>` to `<meta>` + one optional font `<link>` + the shared `<style>`; write the body top-to-bottom in visual order so the first tokens already render something.

### Polished filter/select pattern

Use this whenever the UI needs dropdown-like filters such as "30 Days", "All Assets (5)", or "All Segments":

```html
<style>
.row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.control{min-height:44px;padding:.62em 2.2em .62em .9em;border-radius:calc(var(--radius,16px)*.75);border:1px solid var(--border,rgba(255,255,255,.14));background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.035));color:var(--fg);font:inherit}
</style>
<div class="row">
  <label style="position:relative;display:inline-flex;align-items:center">
    <span style="position:absolute;left:-9999px">Time range</span>
    <select class="control" style="appearance:none;-webkit-appearance:none;min-width:132px"><option>30 Days</option><option>90 Days</option></select>
    <span aria-hidden="true" style="position:absolute;right:12px;color:var(--muted);pointer-events:none">▼</span>
  </label>
  <button class="control" type="button" style="padding-right:.9em">All Assets (5)</button>
  <button class="control" type="button" style="padding-right:.9em">All Segments</button>
</div>
```

Do not emit naked `<select>`/`<button>` controls like default browser widgets.

## The 5 layout primitives (memorize these)

### 1. RAM — Repeat-Auto-Minmax (the responsive grid, no media queries)
```css
.grid{display:grid;gap:1rem;
  grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));}
```
- `auto-fit` collapses empty tracks → items stretch to fill. `auto-fill` keeps empty tracks → items keep their size.
- `min(100%,16rem)` is the key: prevents overflow on screens narrower than the min track. **Always wrap the minmax floor in `min(100%, …)`.**
- This single rule = cards/galleries/feature-grids responsive everywhere. No breakpoints needed.

### 2. Holy-grail / sidebar that wraps without a query
```css
.with-sidebar{display:flex;flex-wrap:wrap;gap:1rem;}
.with-sidebar > .side{flex:1 1 14rem;}      /* grows, ideal basis 14rem */
.with-sidebar > .main{flex:999 1 60%;}       /* hogs space, drops below side when cramped */
```
High `flex-grow` on main + small basis on side = auto reflow to one column when narrow.

### 3. Auto rows (masonry-ish / dense)
```css
.auto-rows{display:grid;gap:1rem;
  grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));
  grid-auto-rows:minmax(8rem,auto);   /* uniform-ish rows, grow with content */
  grid-auto-flow:dense;}              /* backfill gaps */
.span-2{grid-column:span 2;grid-row:span 2;}  /* feature tiles */
```

### 4. Center anything
```css
.center{display:grid;place-items:center;min-height:100svh;}        /* full-screen center */
.stack-center{display:flex;flex-direction:column;align-items:center;gap:1rem;}
```

### 5. The Stack (vertical rhythm with no margins)
```css
.stack{display:flex;flex-direction:column;}
.stack > * + *{margin-block-start:1rem;}   /* owl: space between, not around */
/* or simply: .stack{display:grid;gap:1rem;} — gap never collapses, no last-child fixes */
```
Prefer `gap` over margins everywhere — no collapsing, no `:last-child` cleanup.

## Fluid sizing without media queries

```css
:root{
  --step-0: clamp(1rem, 0.9rem + 0.5vw, 1.25rem);     /* body */
  --step-1: clamp(1.25rem, 1rem + 1.2vw, 2rem);       /* h3 */
  --step-2: clamp(1.6rem, 1.1rem + 2.5vw, 3rem);      /* h2/hero */
  --space: clamp(1rem, 0.5rem + 2vw, 2.5rem);         /* section padding */
}
body{font-size:var(--step-0);line-height:1.5;}
h2{font-size:var(--step-2);line-height:1.1;text-wrap:balance;}
p{max-width:65ch;text-wrap:pretty;}                    /* readable measure */
section{padding:var(--space);}
img,svg,video{max-width:100%;height:auto;display:block;}
```
`clamp(MIN, PREFERRED, MAX)` = fluid between two viewport sizes, no breakpoints. This replaces 90% of media queries for type and spacing.

## Container queries (component responds to its box, not viewport)
```css
.card-area{container-type:inline-size;}
@container (min-width:30rem){
  .card{grid-template-columns:auto 1fr;}   /* horizontal only when the CARD is wide */
}
```
Use when the same component lives in both a narrow sidebar and a wide main — viewport queries can't tell the difference; container queries can.

## Media queries — only for true layout shifts
```css
/* Mobile-first: add at breakpoints, never subtract */
@media (min-width:48em){ /* ~768px */ }
@media (min-width:64em){ /* ~1024px */ }
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;}}
@media (prefers-color-scheme:dark){:root{--bg:#111;--fg:#eee;}}
```
Use `em` for query units (respects user zoom). Keep breakpoints to 1–2.

## Pure-CSS interactions (NO JS)

Pick by need; each is self-contained markup + CSS.

**Accordion / disclosure — use native `<details>`:**
```html
<details><summary>Title</summary><p>Body</p></details>
```
```css
details{border:1px solid #ddd;border-radius:.5rem;padding:.75rem 1rem;}
summary{cursor:pointer;font-weight:600;list-style:none;}
summary::after{content:"＋";float:right;}
details[open] summary::after{content:"－";}
```
Zero JS, keyboard-accessible, animatable in modern browsers via `interpolate-size:allow-keywords` + `transition`.

**Tabs — `:checked` radio hack:**
```html
<div class="tabs">
  <input type="radio" name="t" id="t1" checked><label for="t1">One</label>
  <input type="radio" name="t" id="t2"><label for="t2">Two</label>
  <div class="panel" data-for="t1">Panel one</div>
  <div class="panel" data-for="t2">Panel two</div>
</div>
```
```css
.tabs input{position:absolute;opacity:0;}        /* hide, keep focusable */
.tabs label{display:inline-block;padding:.5rem 1rem;cursor:pointer;border-bottom:2px solid transparent;}
.tabs input:checked + label{border-color:currentColor;font-weight:600;}
.panel{display:none;}
#t1:checked ~ [data-for="t1"],#t2:checked ~ [data-for="t2"]{display:block;}
```

**Modal / dialog — `:target` (or native `<dialog>` if any JS allowed):**
```html
<a href="#m">Open</a>
<div id="m" class="modal"><div class="box"><a href="#" class="x">×</a>Hi</div></div>
```
```css
.modal{position:fixed;inset:0;display:none;place-items:center;background:#0008;}
.modal:target{display:grid;}
.box{background:#fff;padding:1.5rem;border-radius:.75rem;max-width:min(90vw,28rem);}
```

**Dropdown / menu — `:focus-within` or `:hover`:**
```css
.menu ul{display:none;}
.menu:hover ul,.menu:focus-within ul{display:block;}  /* focus-within = keyboard works */
```

**Tooltip — `:hover`/`:focus` + attr:**
```css
[data-tip]{position:relative;}
[data-tip]:hover::after,[data-tip]:focus-visible::after{
  content:attr(data-tip);position:absolute;bottom:100%;left:0;
  background:#222;color:#fff;padding:.25rem .5rem;border-radius:.25rem;white-space:nowrap;}
```

**Mobile nav toggle — checkbox hack:**
```html
<input type="checkbox" id="nav" hidden>
<label for="nav" class="burger">☰</label>
<nav class="links">…</nav>
```
```css
.links{display:none;}
#nav:checked ~ .links{display:flex;flex-direction:column;}
@media(min-width:48em){.burger{display:none;}.links{display:flex;}}
```

**Carousel — scroll-snap (no JS):**
```css
.carousel{display:flex;gap:1rem;overflow-x:auto;scroll-snap-type:x mandatory;}
.carousel > *{flex:0 0 80%;scroll-snap-align:center;}
```

## Edge cases per screen (checklist)

- **Tiny phones (<360px):** test at 320px. Floor grid tracks with `min(100%, …)`. Never set `width` in px on text containers.
- **Long words / URLs overflow:** `overflow-wrap:break-word;` on text blocks; `hyphens:auto` for prose.
- **Notch / safe areas (iOS):** `padding:env(safe-area-inset-top) … ` and `viewport-fit=cover` in meta.
- **Mobile 100vh bug:** use `100svh`/`100dvh`/`100lvh` instead of `100vh` for full-height.
- **Tap targets:** min `2.75rem` (44px) for interactive elements.
- **Landscape short screens:** avoid `min-height:100vh` on content that scrolls; prefer `min-height:100dvh` + allow scroll.
- **Sticky header overlap:** add `scroll-margin-top` to anchors equal to header height.
- **Images:** always `max-width:100%;height:auto`. Use `aspect-ratio` to reserve space and prevent layout shift: `img{aspect-ratio:16/9;object-fit:cover;}`.
- **Tables on mobile:** wrap in `<div style="overflow-x:auto">` so they scroll instead of breaking layout.
- **Print:** `@media print{nav,.no-print{display:none;}}`.
- **RTL:** use logical props (`margin-inline`, `padding-block`, `inset`, `text-align:start`) so it mirrors free.
- **High zoom / 200%:** `em`-based queries + rem sizing keep layout intact.

## UI/UX defaults that ship quality

- **Spacing scale:** one variable set (`.25 .5 1 1.5 2 3rem`). Consistency > cleverness.
- **Type scale:** 4–5 steps max, all from `clamp()`. Line-height 1.5 body / 1.1–1.2 headings.
- **Measure:** body text `max-width:65ch`. Centered with `margin-inline:auto`.
- **Contrast:** body text ≥ 4.5:1, large text ≥ 3:1 (WCAG AA).
- **States, always:** `:hover :focus-visible :active :disabled`. Never remove `:focus` outline without replacing it — `:focus-visible{outline:2px solid;outline-offset:2px;}`.
- **Motion:** `transition:.2s ease` on color/transform only (cheap to paint). Respect `prefers-reduced-motion`.
- **Touch + mouse:** `cursor:pointer` on actionables; large hit areas via padding not margin.
- **Color via tokens:** `--bg --fg --accent --muted --border`. Theme/dark mode = swap variables, not rules.
- **Don't animate layout props** (width/height/top); animate `transform`/`opacity`.

## Token-lean output discipline

- Inline a single `:root` token block once; reference everywhere. No repeated magic numbers.
- Group selectors: `h1,h2,h3{…}` over three rules.
- Use shorthands: `inset:0`, `flex:1`, `gap`, `place-items`, `margin-inline:auto`.
- One utility beats five wrappers: `.stack{display:grid;gap:1rem}` replaces dozens of margins.
- No vendor prefixes (modern targets), no resets longer than: `*{margin:0;box-sizing:border-box}img,svg{display:block;max-width:100%}body{line-height:1.5;-webkit-font-smoothing:antialiased}`.
- Don't emit empty `<div>`s, ARIA that semantic tags already provide, or comments restating the obvious.

## Minimal page skeleton (copy-paste base)
```html
<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>…</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0}
:root{--fg:#1a1a1a;--bg:#fff;--accent:#2563eb;--border:#e5e5e5;
 --s1:clamp(1rem,.9rem+.5vw,1.25rem);--h:clamp(1.6rem,1.1rem+2.5vw,3rem);--pad:clamp(1rem,.5rem+2vw,2.5rem)}
@media(prefers-color-scheme:dark){:root{--fg:#eee;--bg:#111;--border:#333}}
html{color:var(--fg);background:var(--bg);font:var(--s1)/1.5 system-ui,sans-serif}
img,svg,video{display:block;max-width:100%;height:auto}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.wrap{max-width:72rem;margin-inline:auto;padding:var(--pad)}
.grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))}
.stack{display:grid;gap:1rem}
</style></head>
<body><main class="wrap"><h1>…</h1></main></body></html>
```

## When emitting UI as JSON

If the deliverable is structured (design tokens, component spec, a layout the consumer renders):

- **Stable shape.** Same keys every time; never rename or reorder between outputs. Optional fields present as `null`, not omitted, unless the schema says omit.
- **Flat over deep.** Prefer `"padding": {"x": "1rem", "y": ".5rem"}` over 4 nested levels. Keep nesting ≤ 3.
- **Tokens, not literals.** Reference `"color": "accent"` resolving to a `tokens` map, not hex scattered everywhere. One source of truth.
- **Responsive as data:** express breakpoints as a map, not prose — `"cols": {"base": 1, "md": 2, "lg": 3}`.
- **Types honest:** numbers as numbers (`"gap": 16`) or unit-strings (`"gap": "1rem"`) — pick one convention and hold it. Booleans for flags, not `"true"`.
- **Output rules:** raw JSON only — no Markdown fences, no preamble, no trailing comments — when the JSON is consumed by a program. Valid against the schema; arrays default to `[]`, never absent.
- **Self-describing:** include a `"version"` or `"schema"` field so consumers can branch safely.

Example component spec:
```json
{
  "schema": "ui.card/1",
  "layout": "grid",
  "cols": {"base": 1, "md": 2, "lg": 3},
  "gap": "1rem",
  "items": [
    {"title": "…", "body": "…", "media": null, "accent": "accent"}
  ],
  "tokens": {"accent": "#2563eb", "border": "#e5e5e5", "radius": "0.5rem"}
}
```

## Decision order (fast path)

1. Can `clamp()` / `min()` / `max()` solve it? → use it, no query.
2. Many similar items? → RAM grid (`auto-fit minmax`).
3. Two regions reflowing? → flex-wrap with lopsided `flex-grow`.
4. Component-context dependent? → container query.
5. Needs a true structural change? → one `min-width` media query.
6. Interaction? → `details` > `:checked` > `:target` > `:focus-within`/`:hover`. JS never required for the above.
