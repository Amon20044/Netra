# Netra

Predictive HTML parser built for AI-generated interfaces. Experimental, tested
with the Vercel AI SDK, and designed for apps that want to stream static HTML
artifacts into sandboxed iframes while the model is still writing.

The high-level backend helper is Vercel AI SDK-first today. A provider-agnostic
text stream helper is also included for LangChain or any other library that can
produce an `AsyncIterable<string>`.

This repository contains:

- `packages/ai-html-artifacts`: the reusable package source (published as `netra-artifacts`)
- `app/api/chat/route.ts`: a Next.js backend example
- `app/components/ChatDemo.tsx`: a frontend chat demo
- `/`: a documentation page for Netra
- `/demo`: the live chat demo

## What Netra Does

AI models stream HTML in awkward pieces:

```html
<!DOCTYPE html
```

then:

```html
><html><head><style>...</style></head><body><form>
```

then later:

```html
<input type="email" required />
```

A browser iframe needs a valid document to render. Netra keeps the raw HTML
stream as truth, but creates a temporary render projection by predicting the
missing closing tags. The raw stream is never polluted with predicted tags.

That means the iframe can progressively paint:

```html
<form></form>
```

and then correctly repaint as:

```html
<form><input type="email" required /></form>
```

when the next chunk arrives.

## Install

```bash
npm install netra-artifacts ai @ai-sdk/google
```

Use any Vercel AI SDK provider. The local example uses `@ai-sdk/google`.

## Backend Usage

Create a route that returns the package SSE response.

```ts
// app/api/chat/route.ts
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createArtifactStreamResponse } from "netra-artifacts/server";
import type { ModelMessage } from "ai";

export const dynamic = "force-dynamic";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

interface ChatRequestBody {
  messages: ModelMessage[];
}

export async function POST(req: Request) {
  const { messages } = (await req.json()) as ChatRequestBody;

  return createArtifactStreamResponse({
    model: google("gemini-2.5-flash"),
    messages,
    mode: "auto",
    allowExternalFonts: true,
    snapshotIntervalMs: 0,
    styleProfile: {
      mood: "premium",
      density: "comfortable",
      radius: "2xl",
      visualComplexity: "rich",
    },
  });
}
```

## LangChain Or Any Text Stream

Netra's packaged route helper uses the Vercel AI SDK because it gives a clean
`LanguageModel` and `textStream`. For LangChain, stream text from your chain,
map chunks to strings, and pass that iterable to the provider-agnostic helper.

```ts
import {
  HTML_ARTIFACT_SYSTEM_PROMPT,
  createSseResponse,
  event,
  streamHtmlArtifactFromTextStream,
} from "netra-artifacts/server";

const sanitize = {
  allowForms: true,
  allowScripts: false,
  allowInlineStyles: true,
  allowStyleTags: true,
  allowSvg: true,
  allowExternalFonts: false,
};

async function* toText(chunks: AsyncIterable<unknown>) {
  for await (const chunk of chunks) {
    // LangChain chunks vary by model/provider. Normalize here.
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

    const langChainStream = await model.stream([
      ["system", HTML_ARTIFACT_SYSTEM_PROMPT],
      ...messages.map((m: { role: string; content: string }) => [
        m.role,
        m.content,
      ]),
    ]);

    await streamHtmlArtifactFromTextStream(
      {
        textStream: toText(langChainStream),
        sanitize,
        snapshotIntervalMs: 0,
      },
      emit,
    );

    emit(event.done());
  });
}
```

This keeps LangChain support adapter-based instead of forcing a LangChain
dependency into the core package.

### Backend Options

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `model` | `LanguageModel` | required | Vercel AI SDK generation model |
| `messages` | `ModelMessage[]` | required | Chat history |
| `mode` | `"auto" \| "markdown" \| "html_artifact"` | `"auto"` | Route text vs HTML artifact |
| `classifierModel` | `LanguageModel` | `model` | Optional cheaper router model |
| `styleProfile` | `ArtifactStyleProfile` | none | Creative direction for HTML artifacts |
| `allowForms` | `boolean` | `true` | Keep native form markup |
| `allowInlineStyles` | `boolean` | `true` | Keep inline style attributes |
| `allowStyleTags` | `boolean` | `true` | Keep `<style>` blocks |
| `allowSvg` | `boolean` | `true` | Keep inline SVG |
| `allowExternalFonts` | `boolean` | `false` | Keep approved Google Fonts links |
| `temperature` | `number` | provider default | Model temperature |
| `snapshotIntervalMs` | `number` | `0` | Snapshot cadence; `0` means every renderable delta |
| `abortSignal` | `AbortSignal` | none | Cancel model generation |

## Frontend Usage

Use the hook and message component.

```tsx
"use client";

import { ArtifactMessage, useArtifactStream } from "netra-artifacts/client";

export function Chat() {
  const { messages, artifacts, status, sendMessage, stop, reset } =
    useArtifactStream({ endpoint: "/api/chat" });

  const busy = status === "submitted" || status === "streaming";

  return (
    <main>
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
              minHeight: 360,
              maxHeight: 100000,
              debounceMs: 0,
            },
          }}
        />
      ))}

      <button disabled={busy} onClick={() => sendMessage("Create a sign-up form")}>
        Generate
      </button>
      <button onClick={stop}>Stop</button>
      <button onClick={reset}>Reset</button>
    </main>
  );
}
```

Or use the prebuilt chat:

```tsx
import { ArtifactChat } from "netra-artifacts/client";

export default function Page() {
  return <ArtifactChat endpoint="/api/chat" />;
}
```

## Streaming Protocol

The backend emits Server-Sent Events. Each frame uses `event: artifact` and a
JSON payload.

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

Important events:

- `artifact_delta`: raw model HTML chunk, used as source truth
- `artifact_snapshot`: sanitized predictive projection, ready for iframe render
- `artifact_done`: final sanitized HTML after full parse

## Test The Backend

Start the app:

```bash
npm run dev
```

Then stream the API:

```bash
curl -N http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Create a sign-up form with email and password"}]}'
```

If your dev server is on another port, replace `3000`.

## Predictive Parser

Direct parser usage:

```ts
import { PredictiveHtmlParser } from "netra-artifacts/stream";

const parser = new PredictiveHtmlParser();

parser.push("<section><form>");
// "<section><form></form></section>"

parser.committedHtml;
// "<section><form>"

parser.push('<input type="email" required />');
// '<section><form><input type="email" required /></form></section>'
```

One-shot assembly:

```ts
import { assembleStreamingHtml } from "netra-artifacts/stream";

const frame = assembleStreamingHtml("<html><body><main><h1>Hello");

frame.html;
// "<html><body><main><h1>Hello</h1></main></body></html>"

frame.renderable;
// true
```

## Safety Model

Netra is built around static artifacts:

- No JavaScript in artifacts
- No `allow-scripts` in iframe sandbox
- Sanitizer strips scripts, event handlers, dangerous URLs, embeds, and refreshes
- Google Fonts can be allowed, other external CSS is stripped by default
- The iframe isolates artifact CSS from the host app

The generated HTML should be treated as untrusted input. Netra makes it inert
and isolated before it reaches the preview.

## Run Checks

```bash
npm run lint
npm run build --workspace netra-artifacts
npm test --workspace netra-artifacts
npm run build
```

## Status

Netra is experimental. It is useful for:

- AI design assistants
- HTML artifact previews
- Chat-based UI generation
- Static dashboards, forms, invoices, resumes, pricing pages, and landing pages
- Safe previews for model-generated HTML/CSS

It is not meant to execute app logic inside artifacts. Keep artifacts static.
