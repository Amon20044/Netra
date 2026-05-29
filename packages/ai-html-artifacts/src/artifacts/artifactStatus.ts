import type { ArtifactStatus } from "../types/artifact.js";

export const ARTIFACT_STATUS = {
  IDLE: "idle",
  STREAMING: "streaming",
  COMPLETE: "complete",
  ERROR: "error",
} as const satisfies Record<string, ArtifactStatus>;

export function isTerminalStatus(status: ArtifactStatus): boolean {
  return status === "complete" || status === "error";
}
