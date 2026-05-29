import type { ArtifactErrorCode } from "../types/errors.js";

/** Raised when the model envelope cannot be parsed. Always recoverable. */
export class ArtifactParseError extends Error {
  readonly code: ArtifactErrorCode = "ARTIFACT_PARSE_ERROR";
  readonly recoverable = true;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ArtifactParseError";
  }
}
