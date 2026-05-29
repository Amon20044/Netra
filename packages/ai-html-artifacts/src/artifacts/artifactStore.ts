import { createHtmlArtifact, updateHtmlArtifact } from "./htmlArtifact.js";
import type { HtmlArtifact } from "../types/artifact.js";

/**
 * A tiny in-memory store keyed by artifact id. The client hook uses it to
 * reduce stream events into a stable `Record<id, HtmlArtifact>`.
 */
export class ArtifactStore {
  private map = new Map<string, HtmlArtifact>();

  has(id: string): boolean {
    return this.map.has(id);
  }

  get(id: string): HtmlArtifact | undefined {
    return this.map.get(id);
  }

  ensure(id: string, title?: string): HtmlArtifact {
    const existing = this.map.get(id);
    if (existing) return existing;
    const created = createHtmlArtifact({ id, title });
    this.map.set(id, created);
    return created;
  }

  update(
    id: string,
    patch: Partial<Omit<HtmlArtifact, "id" | "type" | "createdAt">>,
  ): HtmlArtifact {
    const current = this.ensure(id);
    const next = updateHtmlArtifact(current, patch);
    this.map.set(id, next);
    return next;
  }

  toRecord(): Record<string, HtmlArtifact> {
    return Object.fromEntries(this.map);
  }

  clear(): void {
    this.map.clear();
  }
}
