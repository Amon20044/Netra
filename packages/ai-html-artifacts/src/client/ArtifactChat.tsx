"use client";

import * as React from "react";
import { useArtifactStream } from "./useArtifactStream.js";
import { ArtifactMessage } from "./ArtifactMessage.js";
import type { HtmlArtifactCardProps, UseArtifactStreamOptions } from "../types/client.js";

export interface ArtifactChatProps extends UseArtifactStreamOptions {
  placeholder?: string;
  emptyState?: React.ReactNode;
  cardProps?: Partial<Omit<HtmlArtifactCardProps, "artifact">>;
  className?: string;
}

/**
 * A batteries-included chat surface: message list, streaming status, and a
 * composer. Drop it in with just an `endpoint` to get the full experience, or
 * compose `useArtifactStream` + `ArtifactMessage` yourself for custom layouts.
 */
export function ArtifactChat(props: ArtifactChatProps) {
  const { placeholder = "Ask anything, or describe a UI to generate…", emptyState, cardProps, className, ...streamOptions } = props;
  const { messages, artifacts, status, sendMessage, stop } =
    useArtifactStream(streamOptions);

  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const busy = status === "submitted" || status === "streaming";

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, artifacts]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input;
    setInput("");
    void sendMessage(text);
  };

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: "var(--aha-fg, #1f2430)",
      }}
    >
      <div
        ref={scrollRef}
        style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 4px" }}
      >
        {messages.length === 0 &&
          (emptyState ?? (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: "48px 16px", fontSize: 14 }}>
              Start the conversation — try “explain CSS grid” or “a pricing page for a SaaS”.
            </div>
          ))}

        {messages.map((message) => (
          <ArtifactMessage
            key={message.id}
            message={message}
            artifacts={artifacts}
            cardProps={cardProps}
          />
        ))}

        {status === "submitted" && (
          <div style={{ color: "#9ca3af", fontSize: 13, padding: "6px 2px" }}>
            Thinking…
          </div>
        )}
      </div>

      <form
        onSubmit={submit}
        style={{
          display: "flex",
          gap: 8,
          padding: 10,
          borderTop: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          aria-label="Message"
          style={{
            flex: 1,
            border: "1px solid rgba(0,0,0,0.14)",
            borderRadius: 12,
            padding: "11px 14px",
            fontSize: 14.5,
            outline: "none",
            background: "#fff",
          }}
        />
        {busy ? (
          <button type="button" onClick={stop} style={btn("#ef4444")}>
            Stop
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()} style={btn("#2563eb", !input.trim())}>
            Send
          </button>
        )}
      </form>
    </div>
  );
}

function btn(bg: string, disabled = false): React.CSSProperties {
  return {
    border: "none",
    borderRadius: 12,
    padding: "0 18px",
    fontSize: 14.5,
    fontWeight: 600,
    color: "#fff",
    background: bg,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}
