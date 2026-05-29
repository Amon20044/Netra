import { cleanArtifactHtml } from "../artifacts/artifactEnvelope.js";
import { assembleStreamingHtml } from "./assembleDocument.js";

/**
 * Accumulates streamed artifact deltas and tracks the last *renderable*
 * snapshot. Partial HTML mid-stream is frequently broken; the predictive parser
 * repairs the current frontier into a temporary valid projection, while keeping
 * the raw stream as the source of truth for final output and code view.
 */
export class ArtifactBuffer {
  private chunks: string[] = [];
  private joined = "";
  private dirty = false;
  private _lastValidSnapshot = "";

  /** Append a streamed delta. */
  append(delta: string): void {
    if (!delta) return;
    this.chunks.push(delta);
    this.dirty = true;
  }

  /** The full aggregated raw HTML received so far. */
  get raw(): string {
    if (this.dirty) {
      this.joined = this.chunks.join("");
      this.dirty = false;
    }
    return this.joined;
  }

  /** The last snapshot that passed the renderable heuristic. */
  get lastValidSnapshot(): string {
    return this._lastValidSnapshot;
  }

  /**
   * Promote the current buffer to a snapshot if the predictive parser says
   * there is visible body content. Returns the snapshot that should be
   * displayed (new one if renderable, else the last good one). Pass an explicit
   * `html` to commit a known-good final document.
   */
  commit(html?: string): string {
    const candidate = cleanArtifactHtml(html ?? this.raw);
    if (html !== undefined) {
      this._lastValidSnapshot = candidate;
      return this._lastValidSnapshot;
    }

    const assembled = assembleStreamingHtml(candidate);
    if (assembled.renderable) {
      this._lastValidSnapshot = assembled.html;
    }
    return this._lastValidSnapshot;
  }

  /** Force-set the final snapshot (used on `artifact_done`). */
  finalize(html: string): string {
    const finalHtml = cleanArtifactHtml(html);
    this._lastValidSnapshot = finalHtml;
    this.chunks = [finalHtml];
    this.joined = finalHtml;
    this.dirty = false;
    return finalHtml;
  }

  reset(): void {
    this.chunks = [];
    this.joined = "";
    this.dirty = false;
    this._lastValidSnapshot = "";
  }
}

/**
 * Heuristic: is this partial HTML safe enough to drop into an iframe without
 * obvious breakage? We require that we are not in the middle of an open tag,
 * not inside an unterminated `<style>` block, and not mid-way through an HTML
 * entity. This is intentionally conservative — false negatives just mean we
 * wait for the next chunk.
 */
export function looksRenderable(html: string): boolean {
  if (!html) return false;

  // Don't render while sitting inside an unclosed tag: last '<' after last '>'.
  const lastOpen = html.lastIndexOf("<");
  const lastClose = html.lastIndexOf(">");
  if (lastOpen > lastClose) return false;

  // Balanced <style> blocks.
  const styleOpen = countMatches(html, /<style[\s>]/gi);
  const styleClose = countMatches(html, /<\/style>/gi);
  if (styleOpen !== styleClose) return false;

  // Not mid-entity (e.g. "&amp" without ";").
  const trailingEntity = /&[a-z0-9#]*$/i.test(html);
  if (trailingEntity) return false;

  return true;
}

function countMatches(input: string, pattern: RegExp): number {
  const matches = input.match(pattern);
  return matches ? matches.length : 0;
}
