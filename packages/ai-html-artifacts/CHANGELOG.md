# Changelog

All notable changes to `netra-artifacts` are documented here. This project
adheres to [Semantic Versioning](https://semver.org/).

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
