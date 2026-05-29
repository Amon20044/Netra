import { safeJsonParse } from "../utils/safeJsonParse.js";
import { isArtifactStreamEvent } from "./events.js";
import type { ArtifactStreamEvent } from "../types/stream.js";

/**
 * Incremental SSE decoder. Feed it raw text chunks; it returns any complete
 * protocol events found so far. Frames are separated by a blank line and the
 * payload lives on `data:` lines (concatenated per the SSE spec).
 */
export class SseDecoder {
  private buffer = "";

  /** Push a chunk of text and drain any complete events. */
  push(chunk: string): ArtifactStreamEvent[] {
    this.buffer += chunk;
    const events: ArtifactStreamEvent[] = [];

    // Normalize CRLF so the split is reliable across platforms.
    let separatorIndex: number;
    while ((separatorIndex = this.indexOfFrameEnd()) !== -1) {
      const rawFrame = this.buffer.slice(0, separatorIndex);
      this.buffer = this.buffer.slice(separatorIndex + this.frameSeparatorLen);
      const parsed = this.parseFrame(rawFrame);
      if (parsed) events.push(parsed);
    }

    return events;
  }

  /** Drain any trailing buffered frame at end-of-stream. */
  flush(): ArtifactStreamEvent[] {
    const remaining = this.buffer.trim();
    this.buffer = "";
    if (!remaining) return [];
    const parsed = this.parseFrame(remaining);
    return parsed ? [parsed] : [];
  }

  private frameSeparatorLen = 2;

  private indexOfFrameEnd(): number {
    const lf = this.buffer.indexOf("\n\n");
    const crlf = this.buffer.indexOf("\r\n\r\n");
    if (crlf !== -1 && (lf === -1 || crlf < lf)) {
      this.frameSeparatorLen = 4;
      return crlf;
    }
    if (lf !== -1) {
      this.frameSeparatorLen = 2;
      return lf;
    }
    return -1;
  }

  private parseFrame(frame: string): ArtifactStreamEvent | null {
    const dataLines: string[] = [];
    for (const rawLine of frame.split(/\r?\n/)) {
      const line = rawLine;
      if (line.startsWith(":")) continue; // comment / heartbeat
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).replace(/^ /, ""));
      }
    }
    if (dataLines.length === 0) return null;

    const payload = dataLines.join("\n");
    const parsed = safeJsonParse<unknown>(payload, null);
    if (!isArtifactStreamEvent(parsed)) return null;
    if (
      parsed.type === "mode" &&
      (parsed as { mode?: unknown }).mode === "html_artifact"
    ) {
      return { type: "mode", mode: "artifact" };
    }
    return parsed;
  }
}
