import type { ArtifactErrorCode } from "../types/errors.js";

/**
 * Raised when classification fails. Always recoverable — the server falls back
 * to heuristic rules and ultimately to markdown.
 */
export class ClassificationError extends Error {
  readonly code: ArtifactErrorCode = "CLASSIFICATION_ERROR";
  readonly recoverable = true;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ClassificationError";
  }
}
