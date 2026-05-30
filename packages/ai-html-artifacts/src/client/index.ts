"use client";

export { useArtifactStream } from "./useArtifactStream.js";
export { ArtifactChat, type ArtifactChatProps } from "./ArtifactChat.js";
export { ArtifactMessage, type ArtifactMessageProps } from "./ArtifactMessage.js";
export { MarkdownMessage, type MarkdownMessageProps } from "./MarkdownMessage.js";
export { STARTER_PROMPTS, type StarterPrompt } from "./starterPrompts.js";

// Re-export the iframe surface for convenience from the client entry.
export {
  HtmlArtifactCard,
  HtmlArtifactPreview,
  HtmlArtifactModal,
  HtmlArtifactToolbar,
  HtmlArtifactCodeView,
} from "../iframe/index.js";

export type {
  ChatMessage,
  ArtifactStreamStatus,
  UseArtifactStreamOptions,
  UseArtifactStreamReturn,
  HtmlArtifactCardProps,
  HtmlArtifactPreviewOptions,
} from "../types/client.js";
export type {
  HtmlArtifact,
  ArtifactTheme,
  ArtifactPresentation,
} from "../types/artifact.js";
