import type {
  ArtifactKind,
  ArtifactMode,
  ArtifactStreamEvent,
} from "../types/stream.js";

/**
 * Typed factory helpers for every protocol event. Using these keeps the
 * server producer honest and gives the client exhaustive types.
 */
export const event = {
  mode: (mode: ArtifactMode): ArtifactStreamEvent => ({ type: "mode", mode }),

  messageStart: (messageId: string): ArtifactStreamEvent => ({
    type: "message_start",
    messageId,
  }),

  messageDelta: (messageId: string, delta: string): ArtifactStreamEvent => ({
    type: "message_delta",
    messageId,
    delta,
  }),

  messageDone: (messageId: string, content: string): ArtifactStreamEvent => ({
    type: "message_done",
    messageId,
    content,
  }),

  artifactStart: (
    artifactId: string,
    title: string,
    artifactType: ArtifactKind = "html",
  ): ArtifactStreamEvent => ({
    type: "artifact_start",
    artifactId,
    title,
    artifactType,
  }),

  artifactDelta: (artifactId: string, delta: string): ArtifactStreamEvent => ({
    type: "artifact_delta",
    artifactId,
    delta,
  }),

  artifactSnapshot: (artifactId: string, html: string): ArtifactStreamEvent => ({
    type: "artifact_snapshot",
    artifactId,
    html,
  }),

  artifactDone: (artifactId: string, html: string): ArtifactStreamEvent => ({
    type: "artifact_done",
    artifactId,
    html,
  }),

  error: (message: string, recoverable = true): ArtifactStreamEvent => ({
    type: "error",
    message,
    recoverable,
  }),

  done: (): ArtifactStreamEvent => ({ type: "done" }),
};

/** Runtime guard that an unknown value is a protocol event. */
export function isArtifactStreamEvent(
  value: unknown,
): value is ArtifactStreamEvent {
  if (typeof value !== "object" || value === null) return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === "mode" ||
    type === "message_start" ||
    type === "message_delta" ||
    type === "message_done" ||
    type === "artifact_start" ||
    type === "artifact_delta" ||
    type === "artifact_snapshot" ||
    type === "artifact_done" ||
    type === "error" ||
    type === "done"
  );
}
