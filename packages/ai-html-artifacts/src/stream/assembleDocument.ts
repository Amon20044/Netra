import { cleanArtifactHtml } from "../artifacts/artifactEnvelope.js";
import { PredictiveHtmlParser } from "./predictiveHtmlParser.js";

/**
 * Stateless one-shot wrapper over {@link PredictiveHtmlParser}. Given the full
 * partial HTML received so far, it returns an always-valid, renderable document
 * by predicting the missing closing tags. Equivalent in output to feeding the
 * same bytes incrementally — use the parser directly for true incremental
 * streaming (carrying state across chunks).
 *
 * Fail-open: never throws; returns the input untouched on error.
 */
export interface AssembledDocument {
  /** A document/fragment safe to drop into an iframe right now. */
  html: string;
  /** True once a closing `</html>` has been seen (model finished). */
  complete: boolean;
  /** True when there is visible body content worth rendering. */
  renderable: boolean;
}

export function assembleStreamingHtml(partial: string): AssembledDocument {
  if (typeof partial !== "string") {
    return { html: "", complete: false, renderable: false };
  }
  const source = cleanArtifactHtml(partial);
  if (source.trim() === "") {
    return { html: "", complete: false, renderable: false };
  }
  try {
    const parser = new PredictiveHtmlParser();
    const html = parser.push(source);
    return {
      html,
      complete: parser.complete,
      renderable: parser.isRenderable(),
    };
  } catch {
    return { html: partial, complete: false, renderable: true };
  }
}

/**
 * Incremental, stateful counterpart to {@link assembleStreamingHtml}. Holds one
 * {@link PredictiveHtmlParser} across the whole stream and feeds it only the
 * newly-arrived tail on each {@link update}, so total parse cost is O(n) over
 * the stream instead of O(n²) (one-shot re-parses everything every frame).
 *
 * Pass the full accumulated raw HTML received so far on every call — the
 * projector slices off whatever it hasn't consumed yet, so skipped/throttled
 * frames are fine: the next call simply catches up on the larger tail. The
 * input is expected to be append-only; if a shorter, non-prefix string arrives
 * (a reset/new artifact) the projector re-syncs from scratch.
 */
export class StreamingHtmlProjector {
  private parser = new PredictiveHtmlParser();
  /** Offset in the raw stream where real content begins (-1 = undecided). */
  private start = -1;
  /** Chars of the content region (raw.slice(start)) already pushed. */
  private fed = 0;
  private lastRaw = "";

  /** Feed the full accumulated raw HTML; returns the current projection. */
  update(raw: string): AssembledDocument {
    if (typeof raw !== "string" || raw === "") {
      return { html: "", complete: false, renderable: false };
    }

    // Re-sync if the stream isn't an append of what we've seen (reset/replace).
    if (!raw.startsWith(this.lastRaw)) this.reset();
    this.lastRaw = raw;

    if (this.start === -1) {
      const resolved = resolveContentStart(raw);
      if (resolved === -1) {
        // Leading whitespace/fence not yet resolvable — nothing safe to render.
        return { html: "", complete: false, renderable: false };
      }
      this.start = resolved;
    }

    const content = raw.slice(this.start);
    if (content.length > this.fed) {
      const delta = content.slice(this.fed);
      this.fed = content.length;
      try {
        this.parser.push(delta);
      } catch {
        // PredictiveHtmlParser fails open internally; guard defensively.
      }
    }

    return {
      html: this.parser.render(),
      complete: this.parser.complete,
      renderable: this.parser.isRenderable(),
    };
  }

  reset(): void {
    this.parser.reset();
    this.start = -1;
    this.fed = 0;
    this.lastRaw = "";
  }
}

/**
 * Where real artifact content starts in the raw stream: past leading
 * whitespace, and past a single opening ```/```html code fence if the model
 * wrapped its output. Returns -1 while the answer can't be determined yet
 * (buffer is all whitespace, or a fence opener whose newline hasn't arrived).
 */
function resolveContentStart(raw: string): number {
  let i = 0;
  while (i < raw.length && /\s/.test(raw[i]!)) i++;
  if (i >= raw.length) return -1; // all whitespace so far — wait
  if (raw.startsWith("```", i)) {
    const nl = raw.indexOf("\n", i);
    if (nl === -1) return -1; // fence opener incomplete — wait
    return nl + 1;
  }
  return i;
}
