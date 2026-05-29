# Netra Predictive HTML Parser

Experimental package for streaming AI-generated HTML into sandboxed iframe
previews. Built for AI apps, tested with the Vercel AI SDK.

The high-level server helper is Vercel AI SDK-first. For LangChain or any other
provider that can produce an `AsyncIterable<string>`, use
`streamHtmlArtifactFromTextStream`.

Netra keeps two versions of streamed HTML:

- **Raw HTML:** the exact model output, never mutated by predictions
- **Snapshot HTML:** a temporary, sanitized, iframe-safe projection with missing
  closing tags predicted from the parser stack

This lets a frontend render partial HTML while the model is still producing the
document.

## Install

```bash
npm install netra ai
```

Add a provider:

```bash
npm install @ai-sdk/google
```

## Backend

```ts
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createArtifactStreamResponse } from "netra/server";
import type { ModelMessage } from "ai";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: ModelMessage[] };

  return createArtifactStreamResponse({
    model: google("gemini-2.5-flash"),
    messages,
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
} from "netra/server";

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

import { ArtifactMessage, useArtifactStream } from "netra/client";

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
import { PredictiveHtmlParser } from "netra/stream";

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
import { assembleStreamingHtml } from "netra/stream";

const result = assembleStreamingHtml("<html><body><main><h1>Hello");

result.html;
// "<html><body><main><h1>Hello</h1></main></body></html>"

result.renderable;
// true
```

## Exports

| Import | Purpose |
| --- | --- |
| `netra` | Isomorphic helpers, types, parser, sanitizer |
| `netra/server` | Server response helpers for SSE |
| `netra/client` | React hook and UI components |
| `netra/iframe` | Iframe card and preview primitives |
| `netra/stream` | Parser, SSE, buffering utilities |
| `netra/sanitizer` | Sanitizer helpers |
| `netra/classifier` | Auto-mode classifier |
| `netra/types` | Public types |

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

Artifacts are static HTML/CSS:

- Scripts are stripped
- Event handler attributes are stripped
- Dangerous URLs are stripped
- Iframes, embeds, object tags, and refresh meta tags are stripped
- The preview iframe never receives `allow-scripts`
- `allowExternalFonts` only keeps approved Google Fonts hosts

Use Netra for safe previews of generated static HTML, not for executing
generated application logic.

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
