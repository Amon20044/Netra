import type { ArtifactErrorCode } from "../types/errors.js";

/** Raised on transport/streaming failures. May or may not be recoverable. */
export class StreamError extends Error {
  readonly code: ArtifactErrorCode = "STREAM_ERROR";
  readonly recoverable: boolean;

  constructor(
    message: string,
    options?: { cause?: unknown; recoverable?: boolean },
  ) {
    super(message, options);
    this.name = "StreamError";
    this.recoverable = options?.recoverable ?? false;
  }
}
