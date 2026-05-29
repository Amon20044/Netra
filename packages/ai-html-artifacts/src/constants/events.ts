import type { ArtifactStreamEventType } from "../types/stream.js";

/** Canonical event-type strings, handy for switch exhaustiveness and tests. */
export const STREAM_EVENT = {
  MODE: "mode",
  MESSAGE_START: "message_start",
  MESSAGE_DELTA: "message_delta",
  MESSAGE_DONE: "message_done",
  ARTIFACT_START: "artifact_start",
  ARTIFACT_DELTA: "artifact_delta",
  ARTIFACT_SNAPSHOT: "artifact_snapshot",
  ARTIFACT_DONE: "artifact_done",
  ERROR: "error",
  DONE: "done",
} as const satisfies Record<string, ArtifactStreamEventType>;

/** Single SSE `event:` field name used for the whole protocol. */
export const SSE_EVENT_NAME = "artifact";
