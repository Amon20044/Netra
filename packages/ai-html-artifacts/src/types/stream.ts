/**
 * The wire protocol shared by the server stream producer and the client
 * consumer. Every response begins with a `mode` event so the frontend knows
 * whether to render a markdown bubble or an artifact card.
 */

export type ArtifactMode = "markdown" | "artifact" | "generative_ui";
export type LegacyArtifactMode = "html_artifact";
export type AnyArtifactMode = ArtifactMode | LegacyArtifactMode;

/** The only artifact kind supported in v1. */
export type ArtifactKind = "html";

export interface ModeEvent {
  type: "mode";
  mode: ArtifactMode;
}

export interface MessageStartEvent {
  type: "message_start";
  messageId: string;
}

export interface MessageDeltaEvent {
  type: "message_delta";
  messageId: string;
  delta: string;
}

export interface MessageDoneEvent {
  type: "message_done";
  messageId: string;
  content: string;
}

export interface ArtifactStartEvent {
  type: "artifact_start";
  artifactId: string;
  title: string;
  artifactType: ArtifactKind;
  /** True when the client should render this with camouflage/seamless chrome. */
  camouflage?: boolean;
}

export interface ArtifactDeltaEvent {
  type: "artifact_delta";
  artifactId: string;
  delta: string;
}

export interface ArtifactSnapshotEvent {
  type: "artifact_snapshot";
  artifactId: string;
  html: string;
}

export interface ArtifactDoneEvent {
  type: "artifact_done";
  artifactId: string;
  html: string;
}

export interface ErrorEvent {
  type: "error";
  message: string;
  recoverable: boolean;
}

export interface DoneEvent {
  type: "done";
}

export type ArtifactStreamEvent =
  | ModeEvent
  | MessageStartEvent
  | MessageDeltaEvent
  | MessageDoneEvent
  | ArtifactStartEvent
  | ArtifactDeltaEvent
  | ArtifactSnapshotEvent
  | ArtifactDoneEvent
  | ErrorEvent
  | DoneEvent;

export type ArtifactStreamEventType = ArtifactStreamEvent["type"];
