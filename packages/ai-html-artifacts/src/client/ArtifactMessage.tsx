"use client";

import * as React from "react";
import { MarkdownMessage } from "./MarkdownMessage.js";
import { HtmlArtifactCard } from "../iframe/HtmlArtifactCard.js";
import type { HtmlArtifact } from "../types/artifact.js";
import type { ChatMessage, HtmlArtifactCardProps } from "../types/client.js";

export interface ArtifactMessageProps {
  message: ChatMessage;
  /** The artifact for this message, if already resolved. */
  artifact?: HtmlArtifact;
  /** Or the full artifacts map — the message's `artifactId` is looked up. */
  artifacts?: Record<string, HtmlArtifact>;
  /** Forwarded to `HtmlArtifactCard`. */
  cardProps?: Partial<Omit<HtmlArtifactCardProps, "artifact">>;
  /**
   * Optional custom markdown renderer for assistant text. Supply a full
   * renderer (e.g. react-markdown + remark-gfm + remend) for complete GFM and
   * streaming-safe healing. Falls back to the built-in lightweight renderer.
   */
  renderMarkdown?: (content: string) => React.ReactNode;
}

/**
 * Renders a single chat message. User messages render as a bubble; assistant
 * messages render markdown plus, when present, the artifact card.
 */
export function ArtifactMessage(props: ArtifactMessageProps) {
  const { message, artifact, artifacts, cardProps, renderMarkdown } = props;
  const resolved =
    artifact ??
    (message.artifactId ? artifacts?.[message.artifactId] : undefined);

  if (message.role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", margin: "10px 0" }}>
        <div
          style={{
            maxWidth: "min(680px, 85%)",
            background: "var(--aha-user-bubble, #2563eb)",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: "16px 16px 4px 16px",
            fontSize: 14.5,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: "10px 0", display: "flex", flexDirection: "column", gap: 12 }}>
      {message.content.trim() !== "" &&
        (renderMarkdown ? (
          renderMarkdown(message.content)
        ) : (
          <MarkdownMessage content={message.content} />
        ))}
      {resolved && (
        <HtmlArtifactCard
          artifact={resolved}
          {...cardProps}
          presentation={resolved.camouflage ? "seamless" : cardProps?.presentation}
        />
      )}
    </div>
  );
}
