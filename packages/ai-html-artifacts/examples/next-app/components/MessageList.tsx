"use client";

import { ArtifactMessage } from "netra-artifacts/client";
import type { ChatMessage, HtmlArtifact } from "netra-artifacts/client";

export function MessageList({
  messages,
  artifacts,
}: {
  messages: ChatMessage[];
  artifacts: Record<string, HtmlArtifact>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {messages.map((message) => (
        <ArtifactMessage
          key={message.id}
          message={message}
          artifacts={artifacts}
          cardProps={{ variant: "elevated" }}
        />
      ))}
    </div>
  );
}
