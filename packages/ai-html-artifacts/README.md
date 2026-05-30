# Netra Predictive HTML Parser

Experimental dependency-free package for streaming AI-generated HTML into
sandboxed iframe previews. Bring any model SDK that can produce text chunks.

The high-level server helper is provider-agnostic: pass a
`generateTextStream(args) => AsyncIterable<string>` adapter. For lower-level
integrations, `streamHtmlArtifactFromTextStream` accepts raw text chunks
directly.

Netra keeps two versions of streamed HTML:

- **Raw HTML:** the exact model output, never mutated by predictions
- **Snapshot HTML:** a temporary, sanitized, iframe-safe projection with missing
  closing tags predicted from the parser stack

This lets a frontend render partial HTML while the model is still producing the
document.

## Install

```bash
npm install netra-artifacts
```

Add whatever provider SDK you want:

```bash
npm install @ai-sdk/google
```

## Backend

```ts
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, streamText } from "ai";
import { createArtifactStreamResponse } from "netra-artifacts/server";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  const model = google("gemini-2.5-flash");

  return createArtifactStreamResponse({
    messages,
    generateTextStream: (args) => streamText({ model, ...args }).textStream,
    generateText: async (args) => (await generateText({ model, ...args })).text,
    mode: "auto",
    snapshotIntervalMs: 0,
    allowExternalFonts: true,
  });
}
```

## LangChain Adapter Pattern

```ts
import {
  HTML_ARTIFACT_SYSTEM_PROMPT,
  createSseResponse,
  event,
  streamHtmlArtifactFromTextStream,
} from "netra-artifacts/server";

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

    const stream = await model.stream([
      ["system", HTML_ARTIFACT_SYSTEM_PROMPT],
      ...messages.map((m: { role: string; content: string }) => [
        m.role,
        m.content,
      ]),
    ]);

    await streamHtmlArtifactFromTextStream(
      {
        textStream: toText(stream),
        sanitize: {
          allowForms: true,
          allowScripts: false,
          allowInlineStyles: true,
          allowStyleTags: true,
          allowSvg: true,
          allowExternalFonts: false,
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

## Frontend

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
        <ArtifactMessage
          key={message.id}
          message={message}
          artifacts={artifacts}
          cardProps={{
            variant: "glass",
            previewOptions: {
              allowExternalFonts: true,
              autoResize: true,
              debounceMs: 0,
            },
          }}
        />
      ))}

      <button
        disabled={status === "submitted" || status === "streaming"}
        onClick={() => sendMessage("Create a sign-up form")}
      >
        Generate
      </button>
    </div>
  );
}
```

## Direct Parser Usage

```ts
import { PredictiveHtmlParser } from "netra-artifacts/stream";

const parser = new PredictiveHtmlParser();

const frameA = parser.push("<body><form>");
// "<body><form></form></body>"

parser.committedHtml;
// "<body><form>"

const frameB = parser.push('<input type="email" />');
// '<body><form><input type="email" /></form></body>'
```

## One-Shot Assembly

```ts
import { assembleStreamingHtml } from "netra-artifacts/stream";

const result = assembleStreamingHtml("<html><body><main><h1>Hello");

result.html;
// "<html><body><main><h1>Hello</h1></main></body></html>"

result.renderable;
// true
```

## Exports

| Import | Purpose |
| --- | --- |
| `netra-artifacts` | Isomorphic helpers, types, parser, sanitizer |
| `netra-artifacts/server` | Server response helpers for SSE |
| `netra-artifacts/client` | React hook and UI components |
| `netra-artifacts/iframe` | Iframe card and preview primitives |
| `netra-artifacts/stream` | Parser, SSE, buffering utilities |
| `netra-artifacts/sanitizer` | Sanitizer helpers |
| `netra-artifacts/classifier` | Auto-mode classifier |
| `netra-artifacts/types` | Public types |

## Protocol

```ts
type ArtifactStreamEvent =
  | { type: "mode"; mode: "markdown" | "html_artifact" }
  | { type: "message_start"; messageId: string }
  | { type: "message_delta"; messageId: string; delta: string }
  | { type: "message_done"; messageId: string; content: string }
  | { type: "artifact_start"; artifactId: string; title: string; artifactType: "html" }
  | { type: "artifact_delta"; artifactId: string; delta: string }
  | { type: "artifact_snapshot"; artifactId: string; html: string }
  | { type: "artifact_done"; artifactId: string; html: string }
  | { type: "error"; message: string; recoverable: boolean }
  | { type: "done" };
```

## Security

Artifacts are static HTML/CSS by default:

- Scripts are stripped unless `allowScripts` is explicitly enabled
- Event handler attributes are stripped
- Dangerous URLs are stripped
- Iframes, embeds, object tags, and refresh meta tags are stripped unless `allowVideoEmbeds` keeps a normalized trusted YouTube iframe
- `<script type="importmap">` is stripped unless `allowModuleImports` is set, and then only mappings that resolve to a trusted, version-pinned ESM CDN survive — enabling single-file ESM games (e.g. three.js) with a defense-in-depth CSP on the frame
- The preview iframe receives `allow-scripts` only for opt-in inline scripts, trusted video embeds, or module-import games, and that script-capable path omits `allow-same-origin`
- `allowExternalFonts` only keeps approved Google Fonts hosts

Use Netra's default mode for safe previews of generated static HTML. Opt into
scripts only for artifacts you are comfortable executing in an isolated iframe.

## Checks

```bash
npm run typecheck
npm run build
npm test
```

## Status

Experimental. The parser is intentionally conservative and optimized for AI
HTML streaming, especially full-document artifacts with `<head>`, `<style>`,
`<body>`, forms, SVG, charts, and layout sections.
