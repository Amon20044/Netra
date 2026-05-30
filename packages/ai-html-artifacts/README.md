<div align="center">

# Netra — `netra-artifacts`

### Don't stream Markdown. Stream **UI**.

**Netra tokenises HTML UI components on the fly.** Point any LLM at it and your
agent stops returning walls of text and starts returning *beautiful, live,
self-building interfaces* — dashboards, ticket cards, weather layouts, pricing
pages, 3D games, full artifacts — rendered token-by-token as the model thinks.

Arguably the first **Predictive HTML Parser** tailored for AI-generated UIs.

[Live demo](https://artifacts-by-netra.vercel.app) ·
[GitHub](https://github.com/Amon20044/Netra) ·
[npm](https://npmjs.com/package/netra-artifacts)

</div>

---

> *"Just asked my AI agent for a 7-day forecast and the delivery status of my
> headphones. Instead of streaming Markdown, it converted the JSON into streamed
> HTML and returned something I'd happily ship as a product screen. Guys — this
> is JARVIS-adjacent."*

Current generative-UI tooling makes you wire up **predefined components**. Real
users don't need the same 50 blocks every time. One asks for a custom dashboard,
the next a ticket card, the next an immersive game. **Let the LLM define the UI,
and let the user watch it being built live.**

---

## The concept — a stack-based predictive parser

Netra is a **stack-based predictive parser** that remembers which HTML tags are
currently open while it streams LLM output, *briefly closes them* so the browser
can render a valid frame **right now**, then discards those predictions when the
model's real tags arrive. No waiting for the model to finish. No duplicated
markup.

Suppose the model has streamed this far:

```html
<section><div><h2>Hello
```

Netra predicts the missing structure and shows a valid UI **immediately**:

```html
<section><div><h2>Hello</h2></div></section>
```

When the real closing tags arrive, there is **no duplication** — the predicted
tags were never committed.

Netra always keeps two views of the stream:

- **Raw HTML** — the exact model output, never mutated by predictions.
- **Snapshot HTML** — a temporary, sanitized, iframe-safe projection with the
  missing closing tags predicted off the parser stack.

That split is what lets a frontend paint partial HTML while the model is still
producing the document.

It's **fully open source**, dependency-free, framework-agnostic, and works with
**any** LLM provider (Vercel AI SDK, LangChain/LangGraph, the raw Anthropic /
OpenAI / Google SDKs — anything that yields text chunks).

---

## Table of contents

1. [Install](#install)
2. [Quick start](#quick-start) — backend + frontend in ~40 lines
3. [`createArtifactStreamResponse` — the one initializer](#createartifactstreamresponse--the-one-initializer)
4. [Styling & keeping the output consistent](#styling--keeping-the-output-consistent) — every knob a developer can turn
5. [Modes & the classifier](#modes--the-classifier)
6. [Frontend — `useArtifactStream`, `ArtifactMessage`, `HtmlArtifactCard`](#frontend)
7. [Provider-agnostic: JSON → streaming HTML, LangChain & LangGraph](#provider-agnostic-json--streaming-html-langchain--langgraph)
8. [Skills — make even small models design well](#skills--make-even-small-models-design-well)
9. [Security model](#security-model)
10. [The wire protocol](#the-wire-protocol)
11. [Package exports](#package-exports)
12. [Roadmap & optimization scope](#roadmap--optimization-scope)
13. [Contributing — we're inviting you](#contributing--were-inviting-you)

---

## Install

```bash
npm install netra-artifacts
```

Bring whatever provider SDK you like — Netra never imports one for you:

```bash
npm install @ai-sdk/google ai        # or @ai-sdk/anthropic, @ai-sdk/openai, langchain, …
```

React (`>=18`) and `react-dom` are **optional** peer deps — only the
`netra-artifacts/client` and `/iframe` surfaces need them. The server and core
parser run anywhere (Node `>=18.18`, edge runtimes, workers).

---

## Quick start

### Backend — one route handler

```ts
// app/api/chat/route.ts  (Next.js App Router — or any Web-standard handler)
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, streamText } from "ai";
import { createArtifactStreamResponse } from "netra-artifacts/server";

export const dynamic = "force-dynamic";

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY });

export async function POST(req: Request) {
  // Spread the body first so per-request fields the client sends
  // (mode, game, allowVideoEmbeds, …) — e.g. from the built-in starter
  // prompts — are forwarded straight into the options.
  const body = await req.json();
  const model = google("gemini-2.5-flash");

  return createArtifactStreamResponse({
    ...body,

    // The ONLY hard requirement: hand Netra an async iterable of text chunks.
    generateTextStream: (args) => streamText({ model, ...args }).textStream,

    // Optional but recommended: a one-shot text fn used by the auto-classifier
    // to decide markdown vs. artifact vs. generative-UI.
    generateText: async (args) => (await generateText({ model, ...args })).text,

    mode: body.mode ?? "auto",
    snapshotIntervalMs: 0,   // repaint on every renderable delta (smoothest)
  });
}
```

That returns a ready-to-go **Server-Sent Events** `Response`.

### Frontend — one hook + one component

```tsx
"use client";

import { ArtifactMessage, useArtifactStream } from "netra-artifacts/client";

export function Chat() {
  const { messages, artifacts, status, sendMessage } = useArtifactStream({
    endpoint: "/api/chat",
  });

  return (
    <div>
      {messages.map((message) => (
        <ArtifactMessage key={message.id} message={message} artifacts={artifacts} />
      ))}

      <button
        disabled={status === "submitted" || status === "streaming"}
        onClick={() => sendMessage("Create a premium analytics dashboard")}
      >
        Generate
      </button>
    </div>
  );
}
```

The hook reduces the SSE event protocol into `messages` + `artifacts`;
`ArtifactMessage` renders the assistant text and, when present, the live artifact
card. That's the whole loop.

---

## `createArtifactStreamResponse` — the one initializer

This is the package's primary server entry point. It **classifies** the request
(unless you force a mode), emits a `mode` event, then streams the right response
as SSE. A shared in-process **circuit breaker** automatically falls back to
markdown if HTML generation keeps failing, so a broken prompt/model can't burn
tokens in a loop.

Every option, with what it does and its default:

```ts
import { createArtifactStreamResponse } from "netra-artifacts/server";

createArtifactStreamResponse({
  // ─── REQUIRED ──────────────────────────────────────────────────────────────
  /** Conversation history in a tiny provider-neutral shape:
   *  { role: "user" | "assistant" | "system" | "tool", content: string | parts }. */
  messages,

  /** Produce the assistant response as text chunks. The model never needs to
   *  know about Netra — Netra prompts it to emit the artifact envelope and
   *  parses the stream. Return AsyncIterable<string> (or a Promise of one). */
  generateTextStream: (args) => streamText({ model, ...args }).textStream,

  // ─── MODE & CLASSIFICATION ───────────────────────────────────────────────────
  /** "auto" (default) classifies first; or force one of:
   *  "markdown" | "artifact" | "generative_ui" | "html_artifact". */
  mode: "auto",

  /** One-shot text generator the auto-classifier uses. Omit it and Netra falls
   *  back to a fast, dependency-free regex heuristic (classifyByRules). */
  generateText: async (args) => (await generateText({ model, ...args })).text,

  /** Replace classification entirely with your own logic. Overrides generateText.
   *  ({ query, messages, abortSignal }) => mode | { mode, reason?, source? } */
  classify: undefined,

  // ─── PROMPTS (override only if you need full control) ────────────────────────
  /** Prepended to EVERY generation (markdown and HTML). Great place to inject a
   *  skill, brand voice, or domain knowledge — see "Skills" below. */
  system: undefined,
  /** Override the markdown-mode system prompt outright. */
  markdownSystemPrompt: undefined,
  /** Override the HTML-artifact system prompt outright. Doing so disables Netra's
   *  built-in style/theme/presentation prompt assembly — you own it all. */
  htmlSystemPrompt: undefined,

  // ─── STYLING & BRAND (the consistency knobs — see next section) ──────────────
  styleProfile: { aesthetic: "glass", mood: "premium", density: "comfortable",
                  visualComplexity: "rich" },
  theme: { colorScheme: "dark", background: "#0b0d12", foreground: "#e6e9ef",
           primary: "#6366f1", border: "rgba(255,255,255,.1)", radius: "16px" },
  /** "card" (default, framed window) | "seamless" (transparent, blends inline). */
  presentation: "card",

  // ─── SANITIZER / CAPABILITY FLAGS (security defaults are conservative) ────────
  allowForms: true,          // native form controls (default true)
  allowScripts: false,       // opt-in inline JS in an isolated frame (default false)
  allowInlineStyles: true,   // inline style="" (default true — Netra streams with these!)
  allowStyleTags: true,      // the single final <style> block (default true)
  allowSvg: true,            // inline SVG charts/icons (default true)
  allowExternalFonts: false, // approved Google Fonts only (default false)
  allowVideoEmbeds: false,   // one trusted, normalized YouTube iframe (default false)
  allowModuleImports: false, // pinned-CDN importmap for ESM (default false; implied by game)
  game: false,               // single-file three.js game builder (implies allowModuleImports)

  // ─── STREAM TUNING ───────────────────────────────────────────────────────────
  temperature: undefined,
  /** ms between sanitized artifact_snapshot repaints. 0 (default) = every
   *  renderable delta → the smoothest live build. Raise it to throttle. */
  snapshotIntervalMs: 0,

  abortSignal: undefined,    // forwarded to the model calls
});
```

> **Note on `model:`** — Netra deliberately does **not** take a `model` object.
> You wrap your provider in `generateTextStream` / `generateText`, which keeps
> the package provider-agnostic and zero-dependency.

---

## Styling & keeping the output consistent

The whole point of generative UI is that the model invents the layout — but
unbounded freedom means every answer looks like a different app. Netra gives you
**three layers of control**, from "loose creative brief" to "exact brand
lock-in," so you can dial in *how consistent* the output is.

### How Netra styles a streamed artifact (the model)

Netra prompts the model into a strict **body-first** styling model so the UI is
usable *before the stream finishes*:

1. **Design tokens inline on `<html style="--bg:…;--fg:…;--accent:…">`** — these
   stream first, so colours apply to everything that follows.
2. **Critical inline `style=""` on every important element** — layout, spacing,
   colour, radius, typography. The UI looks right the instant each element
   arrives.
3. **Exactly one final `<style>` block** at the end of `<body>` — *enhancement
   only*: resets, fluid type scale, `@media` breakpoints, `:hover`/`:focus`,
   popovers, scrollbars, light `@keyframes`. The page still looks good if it
   never arrives.

You don't write this — Netra's prompt enforces it. What you *do* control is the
brief.

### Layer 1 — `styleProfile` (creative brief)

The loosest knob. Seven optional fields nudge the aesthetic while leaving the
model room to be inventive. Omit it and the model picks a bold, context-aware
look itself.

| Field | Values |
| --- | --- |
| `aesthetic` | `minimal` `glass` `luxury` `startup` `developer` `playful` `enterprise` `dark` `editorial` |
| `mood` | `calm` `premium` `bold` `friendly` `technical` `energetic` |
| `density` | `compact` `comfortable` `spacious` |
| `radius` | `sm` `md` `xl` `2xl` `3xl` |
| `font` | `system` `serif` `mono` `rounded` |
| `colorScheme` | `auto` `light` `dark` |
| `visualComplexity` | `simple` `balanced` `rich` |

```ts
styleProfile: { aesthetic: "editorial", mood: "calm", density: "spacious",
                colorScheme: "light", visualComplexity: "balanced" }
```

### Layer 2 — `theme` (brand lock-in)

The tightest knob: pass your host app's exact palette and the model is told to
**stay strictly within it** — no clashing or invented colours. This is what makes
artifacts look *native* to your product.

```ts
theme: {
  colorScheme: "dark",
  background: "#0b0d12",
  foreground: "#e6e9ef",
  primary:    "#6366f1",
  accent:     "#22d3ee",
  muted:      "#8b93a7",
  border:     "rgba(255,255,255,.10)",
  surface:    "rgba(255,255,255,.04)",
  radius:     "16px",
  fontFamily: "'Inter', system-ui, sans-serif",
  notes:      "Calm, premium fintech. Avoid playful or neon.",  // freeform guidance
}
```

The same `theme` object can be passed **to the client** too (on
`HtmlArtifactCard` / `HtmlArtifactPreview`), where it's injected into the iframe
as CSS custom properties (`--background`, `--foreground`, `--primary`, …). Pass
it on both sides and your artifacts track the host theme exactly — essential for
seamless mode.

### Layer 3 — `presentation` (where it lives)

- **`card`** (default) — a framed, windowed iframe with a toolbar. The artifact
  is its **own world**: full creative freedom, its own background. Best for
  standalone documents (landing pages, resumes, full dashboards).
- **`seamless`** — a chromeless, **transparent** iframe that sits inline in the
  chat as if it were native content. The model is forced to keep the page
  transparent and match the host theme — this is "camouflage" / generative UI.

> When `mode` resolves to `generative_ui`, Netra automatically switches to
> `seamless` presentation **and** passes your `theme`/`styleProfile` through so
> the artifact blends in. A standalone `artifact` deliberately gets full creative
> freedom (no imposed theme) so it can choose the best design for the request.

### How many developers can "enter styles"? — consistency strategy

There's no per-user limit — these are **server-side knobs you own**. The pattern
for a *consistent* product is:

- Set **one** `theme` + `styleProfile` at the route level → every artifact across
  every user shares your brand. **This is the consistency lever.**
- Let individual requests pass *small* overrides (e.g. a starter prompt sending
  `{ mode: "generative_ui" }`) via the spread-the-body pattern.
- Only reach for `htmlSystemPrompt` when you want to replace Netra's entire
  design system. (Doing so opts you out of the automatic theme/presentation
  assembly — you become responsible for the body-first streaming contract.)

**Best practices for consistent generative UI:**

- ✅ Lock `theme` once at the route; vary only `mode`/capability flags per request.
- ✅ Keep `snapshotIntervalMs: 0` for the smoothest live build; raise it only if
  you're rendering many artifacts at once and want to throttle repaints.
- ✅ Prefer `styleProfile` over free-text prompt edits — it's structured and
  stays inside Netra's anti-"AI-slop" guardrails.
- ✅ Pass the **same `theme` to client and server** for seamless artifacts.
- ⚠️ Avoid overriding `htmlSystemPrompt` unless you truly need to — you lose the
  streaming-safety and responsive guardrails baked into the default prompt.

---

## Modes & the classifier

`mode: "auto"` runs a two-stage decision:

1. A cheap, **dependency-free regex heuristic** (`classifyByRules`) — exported,
   so you can use it standalone.
2. If you supplied `generateText`, a **model-backed classifier** refines it.

It resolves to one of:

| Mode | What you get | Presentation |
| --- | --- | --- |
| `markdown` | A clean written/text answer | — |
| `artifact` | A standalone HTML/CSS document | `card` |
| `generative_ui` | Inline UI that blends into the host chat | `seamless` |

Force a mode to skip classification entirely (`mode: "artifact"`), supply your
own `classify` handler, or let `auto` decide. A deterministic override ensures
requests that clearly signal "generative UI / camouflage / showcase" render
transparent even when a model labels them a standalone document.

```ts
import { classifyByRules } from "netra-artifacts";

classifyByRules("Build me a pricing page");
// → { mode: "artifact", reason: "Matched 1 visual signal(s)", confidence: … }
```

---

## Frontend

### `useArtifactStream` — the hook

Drives a chat against your Netra SSE endpoint and reduces the event protocol into
state. Markdown answers update a message; HTML answers also build an artifact
record.

```tsx
const {
  messages,    // ChatMessage[] — user + assistant turns
  artifacts,   // Record<id, HtmlArtifact> — live, with raw `html` + sanitized `snapshot`
  status,      // "idle" | "submitted" | "streaming" | "done" | "error"
  mode,        // the resolved ArtifactMode for the current turn
  error,
  sendMessage, // (text, bodyOverrides?) => Promise<void>
  stop,        // abort the in-flight stream, keep history
  reset,       // abort + clear everything
} = useArtifactStream({
  endpoint: "/api/chat",
  body: { theme: myTheme },          // merged into every POST body
  headers: { Authorization: "…" },
  initialMessages: [],
  onError: (e) => console.error(e),
});

// Per-request overrides (e.g. force a mode or a game):
sendMessage("Make me a 3D game", { game: true });
```

### `ArtifactMessage` — the renderer

Renders one chat turn: a user bubble, or assistant markdown **plus** the artifact
card when present. Customize it freely:

```tsx
<ArtifactMessage
  message={message}
  artifacts={artifacts}

  // Forward props straight to the underlying HtmlArtifactCard:
  cardProps={{
    variant: "glass",            // "plain" | "glass" | "elevated" | "minimal"
    density: "comfortable",
    radius: "2xl",
    shadow: "medium",
    showToolbar: true,
    allowFullscreen: true,
    allowCopy: true,
    allowDownload: true,
    allowPdf: true,              // native print-to-PDF
    theme: myTheme,              // injected into the iframe as CSS variables
    previewOptions: {
      autoResize: true,          // size the iframe to its content height
      debounceMs: 0,             // repaint throttle; 0 ≈ 60fps live build
      allowExternalFonts: true,
      minHeight: 0,
      maxHeight: 1600,
      fallbackMode: "last-valid-snapshot",  // what to show if a frame is unparseable
    },
  }}

  // Swap in a full GFM renderer (react-markdown + remark-gfm + remend) for
  // assistant text; falls back to the built-in lightweight renderer.
  renderMarkdown={(content) => <MyMarkdown>{content}</MyMarkdown>}
/>
```

Seamless/camouflaged artifacts automatically render chromeless and transparent —
`ArtifactMessage` reads the artifact's `camouflage` flag and forces `seamless`
presentation for them, regardless of `cardProps`.

### Build your own UI

Don't like the components? Use the hook's `artifacts` map directly, or drop down
to the iframe primitives (`HtmlArtifactCard`, `HtmlArtifactPreview`,
`HtmlArtifactModal`, `HtmlArtifactToolbar`, `HtmlArtifactCodeView`) from
`netra-artifacts/iframe`. Or skip React entirely and drive the parser yourself:

```ts
import { PredictiveHtmlParser, assembleStreamingHtml } from "netra-artifacts/stream";

const parser = new PredictiveHtmlParser();
parser.push("<body><form>");          // → "<body><form></form></body>" (renderable frame)
parser.committedHtml;                 // → "<body><form>" (raw, never mutated)

// Or one-shot:
assembleStreamingHtml("<html><body><main><h1>Hello");
// → { html: "<html><body><main><h1>Hello</h1></main></body></html>", renderable: true }
```

### Starter prompts (optional)

`STARTER_PROMPTS` ships natural-language example chips (dashboard, explainer, 3D
game, JSON→card, travel page, video page, pricing, sign-up) — each carries the
right `body` overrides. Render them under your composer and pass
`prompt.body` as the `bodyOverrides` to `sendMessage`. *(For the overrides to take
effect, your route must spread `req.json()` into the options — the quick-start
pattern.)*

---

## Provider-agnostic: JSON → streaming HTML, LangChain & LangGraph

Netra never imports a provider. Anything that yields an `AsyncIterable<string>`
works. This is exactly what makes **"JSON → streamed HTML"** trivial inside an
agentic workflow: your graph produces structured data, you ask the model to
render it, and Netra streams the live UI.

The low-level streamer, `streamHtmlArtifactFromTextStream`, takes raw text chunks
and emits the full artifact lifecycle. Pair it with `createSseResponse` and you
have a route handler for **any** framework.

### LangChain / LangGraph adapter

```ts
import {
  HTML_ARTIFACT_SYSTEM_PROMPT,   // the same design-system prompt Netra uses internally
  createSseResponse,
  streamHtmlArtifactFromTextStream,
} from "netra-artifacts/server";
import { event } from "netra-artifacts/stream";   // SSE event builders

// LangChain message chunks → plain strings
async function* toText(chunks: AsyncIterable<unknown>) {
  for await (const chunk of chunks) {
    if (typeof chunk === "string") yield chunk;
    else if (chunk && typeof chunk === "object" && "content" in chunk) {
      yield String((chunk as { content: unknown }).content ?? "");
    }
  }
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  return createSseResponse(async (emit) => {
    emit(event.mode("html_artifact"));

    // ── This is where LangGraph fits ────────────────────────────────────────
    // Run your graph to produce structured JSON (tools, retrieval, planning),
    // then hand the model that JSON and ask it to render a UI. The graph's
    // final node simply needs to STREAM text — Netra parses it live.
    const dataFromGraph = await myLangGraphApp.invoke({ messages });

    const stream = await model.stream([
      ["system", HTML_ARTIFACT_SYSTEM_PROMPT],
      ["user", `Render this data as a beautiful UI:\n\n${JSON.stringify(dataFromGraph)}`],
    ]);

    await streamHtmlArtifactFromTextStream(
      {
        textStream: toText(stream),
        sanitize: {
          allowForms: true, allowScripts: false, allowInlineStyles: true,
          allowStyleTags: true, allowSvg: true, allowExternalFonts: false,
          allowVideoEmbeds: false,
        },
        snapshotIntervalMs: 0,
      },
      emit,
    );

    emit(event.done());
  });
}
```

**Can it integrate into a LangGraph / agentic workflow easily?** Yes. Netra is a
**presentation layer**, not an agent runtime — it sits at the *edge* of your
graph. Two clean patterns:

1. **Final-node renderer** (above): the graph reasons in JSON; the last node
   streams HTML through Netra. The user sees a live UI instead of JSON.
2. **Tool / sub-agent**: expose "render UI" as a tool. When the agent decides a
   visual answer helps, it calls the tool, which runs
   `streamHtmlArtifactFromTextStream` and streams the artifact back into the same
   SSE channel.

Because the contract is just `AsyncIterable<string>`, the same approach works
with the raw Anthropic, OpenAI, Google, or Mistral SDKs, with CrewAI, with your
own orchestrator — anything that can stream tokens.

---

## Skills — make even small models design well

Netra ships a library of **agent skills** under
[`agent-instructions/skills/`](./agent-instructions/skills) — focused Markdown
playbooks (`SKILL.md`) for things like `frontend-design`, `brand-guidelines`,
`canvas-design`, `algorithmic-art`, `claude-api`, and more. They help even
low-performance models display data effectively and hallucinate less while
generating UI.

Skills are **prompt augmentations**, not a runtime — wire one in by appending its
guidance to the `system` option:

```ts
import { readFile } from "node:fs/promises";

const brand = await readFile(
  "node_modules/netra-artifacts/agent-instructions/skills/brand-guidelines/SKILL.md",
  "utf8",
);

createArtifactStreamResponse({
  ...body,
  generateTextStream,
  system: brand,            // prepended to every generation, on top of Netra's prompt
  theme: myBrandTheme,
});
```

**Add your own skill** by writing a `SKILL.md` (tables, charts, a domain
component vocabulary, do/don'ts, real example data) and injecting it the same
way. Keep them declarative and example-rich: precomputed sample data and explicit
"never do X" rules are what curb hallucination on smaller models. Combine a skill
(*how to design*) with a `theme` (*exact brand values*) for the most consistent
results.

---

## Security model

Artifacts are **static HTML/CSS by default**, sanitized before they ever touch an
iframe:

- Scripts are **stripped** unless `allowScripts` is explicitly enabled.
- Event-handler attributes (`onclick`, `onload`, …) are stripped.
- Dangerous URLs (`javascript:`, …) are stripped.
- Iframes, embeds, `<object>`, and refresh-meta tags are stripped — unless
  `allowVideoEmbeds` keeps a single **normalized, trusted YouTube** iframe.
- `<script type="importmap">` is stripped unless `allowModuleImports` is set, and
  then only mappings resolving to a **trusted, version-pinned ESM CDN** survive —
  enabling single-file ESM games (e.g. three.js) with a defense-in-depth CSP on
  the frame.
- The preview iframe gets `allow-scripts` **only** for opt-in inline scripts,
  trusted video embeds, or module-import games — and that script-capable path
  **omits `allow-same-origin`**.
- `allowExternalFonts` keeps approved Google Fonts hosts only.

Use the default mode for safe previews of generated static HTML. Opt into scripts
only for artifacts you're comfortable executing in an isolated iframe.

---

## The wire protocol

The SSE stream is a small, stable event union — read it yourself if you're not
using the React hook:

```ts
type ArtifactStreamEvent =
  | { type: "mode"; mode: "markdown" | "html_artifact" }
  | { type: "message_start"; messageId: string }
  | { type: "message_delta"; messageId: string; delta: string }
  | { type: "message_done"; messageId: string; content: string }
  | { type: "artifact_start"; artifactId: string; title: string; artifactType: "html" }
  | { type: "artifact_delta"; artifactId: string; delta: string }
  | { type: "artifact_snapshot"; artifactId: string; html: string }  // sanitized, render-safe
  | { type: "artifact_done"; artifactId: string; html: string }
  | { type: "error"; message: string; recoverable: boolean }
  | { type: "done" };
```

`artifact_delta` carries raw model tokens; `artifact_snapshot` carries the
sanitized, predictively-closed frame you actually paint.

---

## Package exports

| Import | Purpose | Needs React |
| --- | --- | --- |
| `netra-artifacts` | Isomorphic helpers, types, parser, sanitizer, classifier | — |
| `netra-artifacts/server` | SSE response helpers, prompt builders, low-level streamers | — |
| `netra-artifacts/client` | React hook + UI components | ✅ |
| `netra-artifacts/iframe` | Iframe card & preview primitives | ✅ |
| `netra-artifacts/stream` | Predictive parser, SSE, buffering, assembly | — |
| `netra-artifacts/sanitizer` | Sanitizer helpers | — |
| `netra-artifacts/classifier` | Auto-mode classifier | — |
| `netra-artifacts/types` | Public types | — |

Ships dual ESM + CJS builds with full `.d.ts` types.

---

## Roadmap & optimization scope

Netra is **experimental** and moving fast. The parser is intentionally
conservative and tuned for AI HTML streaming — full documents with `<head>`,
`<style>`, `<body>`, forms, SVG, charts, and layout sections. Where it's headed:

**Parser & rendering**
- Even cheaper snapshot diffing — patch the iframe DOM instead of rewriting
  `srcDoc`, to cut repaint cost on long documents.
- Smarter predictive heuristics for partially-streamed attributes and
  mid-token CSS (less flicker on the very first frames).
- Streaming-aware sanitizer fast-path so large artifacts don't re-sanitize from
  scratch on every delta.

**Generation quality**
- A growing skill library and a community skill registry.
- Tighter "anti-AI-slop" design guardrails and per-domain component vocabularies.
- Better small-model performance (the whole point of skills) — measured against a
  public artifact benchmark.

**Integrations**
- First-class LangGraph / CrewAI / Vercel AI SDK adapters in the box.
- A "render UI" tool definition you can drop straight into a tool-calling agent.
- Framework starters beyond Next.js (Remix, SvelteKit host, plain Node/Express).

**The big prediction** — *AI's job is more than answers; it's creating an
experience.* We think token-by-token **predictive UI** becomes the default way
agents respond, the way Markdown is today. Netra is a bet on that future: a
streaming HTML powerhouse that lets any LLM build any interface a user can
imagine, live, with no fixed component system in the way.

---

## Contributing — we're inviting you

Netra is **fully open source (MIT)** and we'd love your help. Whether you want to
sharpen the predictive parser, add a skill, write a framework adapter, or just
test it on a wild prompt and file what breaks — you're welcome.

- ⭐ Star & explore: <https://github.com/Amon20044/Netra>
- 📦 npm: <https://npmjs.com/package/netra-artifacts>
- 🚀 Live demo: <https://artifacts-by-netra.vercel.app>

Local checks before a PR:

```bash
npm run typecheck
npm run build
npm test
```

> Don't give your users normal textual output with zero UI. Generate any data
> into beautiful layouts, dynamic dashboards, and immersive experiences — on the
> fly, with any model. **Don't stream Markdown. Use Netra.**

---

<div align="center">
<sub>MIT · built by <a href="https://github.com/Amon20044">Amon</a> and contributors</sub>
</div>
