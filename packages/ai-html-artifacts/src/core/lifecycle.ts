import { event } from "../stream/events.js";
import { createArtifactId, createMessageId } from "./createIds.js";
import type { ArtifactStreamEvent } from "../types/stream.js";

/** A sink for protocol events. Implementations write to an SSE stream. */
export type Emit = (event: ArtifactStreamEvent) => void;

/** A function that drives a full response by emitting protocol events. */
export type ArtifactStreamProducer = (emit: Emit) => Promise<void>;

/**
 * Helper that manages a single assistant message's lifecycle, accumulating
 * content so `done` can carry the full text without the caller re-tracking it.
 */
export class MessageLifecycle {
  readonly id: string;
  private content = "";
  private started = false;
  private finished = false;

  constructor(
    private readonly emit: Emit,
    id: string = createMessageId(),
  ) {
    this.id = id;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.emit(event.messageStart(this.id));
  }

  delta(text: string): void {
    if (!text || this.finished) return;
    if (!this.started) this.start();
    this.content += text;
    this.emit(event.messageDelta(this.id, text));
  }

  /** Idempotent — emits `message_done` at most once. */
  done(finalContent?: string): string {
    if (this.finished) return this.content;
    if (!this.started) this.start();
    if (finalContent !== undefined && this.content === "") {
      this.content = finalContent;
    }
    this.finished = true;
    this.emit(event.messageDone(this.id, this.content));
    return this.content;
  }
}

/** Helper managing one artifact's lifecycle (start → deltas → snapshots → done). */
export class ArtifactLifecycle {
  readonly id: string;
  private started = false;
  private finished = false;

  constructor(
    private readonly emit: Emit,
    id: string = createArtifactId(),
  ) {
    this.id = id;
  }

  start(title: string): void {
    if (this.started) return;
    this.started = true;
    this.emit(event.artifactStart(this.id, title, "html"));
  }

  delta(html: string): void {
    if (!html || this.finished) return;
    this.emit(event.artifactDelta(this.id, html));
  }

  snapshot(html: string): void {
    if (this.finished) return;
    this.emit(event.artifactSnapshot(this.id, html));
  }

  /** Idempotent — emits `artifact_done` at most once. */
  done(html: string): void {
    if (this.finished) return;
    if (!this.started) this.start("Untitled artifact");
    this.finished = true;
    this.emit(event.artifactDone(this.id, html));
  }
}
