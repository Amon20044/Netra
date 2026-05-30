# Changelog

All notable changes to `netra-artifacts` are documented here. This project
adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Starter prompt templates.** `STARTER_PROMPTS` (exported from
  `netra-artifacts/client`) ships 8 prebuilt templates — each a short show
  `label` plus a rich `prompt` actually sent to the model — covering an HTML
  artifact, markdown answer, three.js game, generative-UI-from-JSON, image-rich
  page, YouTube video page, pricing page, and sign-up form. `ArtifactChat`
  renders them as chips below the composer; each carries per-request `body`
  overrides (`mode`/`game`/`allowVideoEmbeds`/…) now merged by `sendMessage`'s
  new second argument. Pass `starterPrompts={[]}` to hide them.
- **Single-file three.js games.** New `allowModuleImports` sanitize/preview flag
  keeps a `<script type="importmap">` whose targets resolve to a trusted,
  version-pinned ESM CDN (`esm.sh`, `cdn.jsdelivr.net`, `unpkg.com`,
  `cdn.skypack.dev`), so a self-contained game can `import … from "three"` with
  no build step. The game frame runs in the isolated `allow-scripts` sandbox
  (no `allow-same-origin`) with a defense-in-depth CSP pinning script/connect to
  those CDNs. New `game` server option switches the HTML prompt to a dedicated
  three.js game builder (pinned import map + module + fixed-timestep loop) and
  implies `allowModuleImports`. New `threejs-games` agent skill + single-file
  setup guidance in `threejs-fundamentals`.

### Changed

- Trusted YouTube embeds and inline JavaScript are now explicit opt-ins. The
  script-capable iframe sandbox omits `allow-same-origin`, and an internal
  postMessage resize bridge keeps isolated video/script previews auto-sized.
- HTML-artifact prompt reworked to a **hybrid styling model**: one small shared
  `<style>` design system (box-sizing reset + fluid `clamp()` type/space scale +
  element defaults + `.wrap/.stack/.grid/.row/.card/.scroll-x` utility classes)
  plus inline `style=""` for per-element specifics, with an optional 1–2 `@media`
  breakpoints as a third tier. Cuts repeated inline markup and yields
  compact-on-mobile, comfortable-on-desktop layouts. (`<style>` was always
  sanitizer-allowed; the prompt previously forbade it for streaming reasons.)
- Camouflage/seamless rendering now **preserves inner card surfaces**: only
  `html`/`body` are forced transparent so the page blends into the host, while
  data cards keep their own backgrounds, gradients, text, and border colours
  (previously every block element was force-transparented, flattening the UI).
  The seamless prompt now requires visible card surfaces.

### Fixed

- Artifacts that pinned the root to the viewport (`height:100%`,
  `min-height:100vh`) collapsed to ~0 height in the auto-sizing iframe and
  rendered blank. `SEAMLESS_BASE` and the camouflage pass now force
  `html,body{height:auto;min-height:0}`, and the prompt forbids viewport-relative
  root heights (the artifact is auto-sized to content).
- `position:sticky`/`position:fixed` ghosting over scrolled content, and CSS
  leaking as visible text when a data-URI `<svg>` (or backslash-escaped quotes)
  was placed inside a `style` attribute — both now hard rules in the prompt and
  the `html-practices` skill.
- Camouflage CSS normalizer is now brace-aware: nested `@media`/`@supports`/
  `@container` blocks are preserved and their inner rules normalized, instead of
  being mangled by a flat regex.
- Theme-aware custom scrollbars are injected into the artifact iframe (tinted
  from `--foreground`/`--fg`), so inner scroll containers match the palette.

## [0.1.0] - 2026-05-29

### Added

- Initial experimental release.
- `createArtifactStreamResponse()` server helper — auto-classifies a request as
  `markdown` or `html_artifact`, then streams an SSE response over the
  `ArtifactStreamEvent` protocol.
- Vercel AI SDK integration via `streamText` / `generateText` (no RSC, no `streamUI`).
- Mode classifier with model-based classification and a heuristic rule fallback.
- `<assistant_message>` / `<html_artifact>` envelope parser with fail-open behavior.
- Static-only HTML sanitizer (strips `<script>`, event handlers, `javascript:`
  URLs, external CSS/JS; preserves inline styles, `<style>`, SVG, and forms).
- `useArtifactStream()` React hook plus `ArtifactChat`, `ArtifactMessage`,
  `MarkdownMessage` components.
- Seamless sandboxed iframe rendering: `HtmlArtifactCard`, `HtmlArtifactPreview`,
  `HtmlArtifactModal`, `HtmlArtifactToolbar`, `HtmlArtifactCodeView`.
- Snapshot buffering that keeps the last valid snapshot while partial HTML streams.
- In-memory circuit breaker that falls back to markdown after repeated failures.
- Dual ESM + CJS builds with subpath exports.
