"use client";

import { useArtifactStream } from "netra-artifacts/client";
import { useState } from "react";
import { MessageList } from "./MessageList";

/**
 * Minimal example chat surface. The real, styled integration lives in the
 * host app (see `my-app/app/components/ChatDemo.tsx`); this one keeps the
 * wiring deliberately bare so the data flow is easy to read.
 */
export function ChatDemo() {
  const { messages, artifacts, status, sendMessage, stop } = useArtifactStream({
    endpoint: "/api/chat",
  });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 16 }}>
      <MessageList messages={messages} artifacts={artifacts} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = input;
          setInput("");
          void sendMessage(text);
        }}
        style={{ display: "flex", gap: 8, marginTop: 12 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything, or describe a UI…"
          style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
        />
        {busy ? (
          <button type="button" onClick={stop}>
            Stop
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()}>
            Send
          </button>
        )}
      </form>
    </div>
  );
}
