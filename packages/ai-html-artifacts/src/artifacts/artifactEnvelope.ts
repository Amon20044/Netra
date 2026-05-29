import type { ParsedArtifactEnvelope } from "../types/artifact.js";

const MSG_OPEN = "<assistant_message>";
const MSG_CLOSE = "</assistant_message>";
const ART_OPEN = "<html_artifact";
const ART_CLOSE = "</html_artifact>";

const GUARD = Math.max(
  MSG_OPEN.length,
  MSG_CLOSE.length,
  ART_OPEN.length,
  ART_CLOSE.length,
);

/** Strip a leading/trailing markdown code fence if the model wrapped output. */
export function stripOuterFence(input: string): string {
  const trimmed = input.trim();
  const fence = /^```[a-z]*\n([\s\S]*?)\n```$/i.exec(trimmed);
  return fence?.[1] ?? input;
}

/**
 * Clean common model wrapping around artifact HTML. This only trims code fences
 * at the boundary of the artifact, so literal backticks inside the document are
 * left alone.
 */
export function cleanArtifactHtml(input: string): string {
  let html = input.trim();
  html = html.replace(/^```(?:html)?[ \t]*\r?\n/i, "");
  html = html.replace(/\r?\n```[ \t]*$/i, "");
  return html.trim();
}

function parseTitle(openTag: string): string {
  const match = /title\s*=\s*("([^"]*)"|'([^']*)')/i.exec(openTag);
  return (match?.[2] ?? match?.[3] ?? "Untitled artifact").trim();
}

/**
 * Final, non-streaming parse of a model envelope. Fail-open: it never throws,
 * and degrades gracefully when tags are missing or malformed. This is the
 * authoritative parser used to produce the final artifact.
 */
export function parseArtifactEnvelope(raw: string): ParsedArtifactEnvelope {
  const empty: ParsedArtifactEnvelope = {
    assistantMessage: "",
    title: "Untitled artifact",
    html: "",
    hasArtifact: false,
  };

  if (typeof raw !== "string" || raw.trim() === "") return empty;

  try {
    const source = stripOuterFence(raw);

    const msgMatch = /<assistant_message>([\s\S]*?)<\/assistant_message>/i.exec(
      source,
    );
    const artMatch =
      /<html_artifact\b([^>]*)>([\s\S]*?)<\/html_artifact>/i.exec(source);

    if (artMatch) {
      const title = parseTitle(`<html_artifact${artMatch[1] ?? ""}>`);
      const html = cleanArtifactHtml(artMatch[2] ?? "");
      const assistantMessage = (msgMatch?.[1] ?? deriveMessage(source, artMatch.index)).trim();
      return {
        assistantMessage,
        title,
        html,
        hasArtifact: html.length > 0,
      };
    }

    // No artifact tag: try to recover a bare HTML document.
    const recovered = recoverBareHtml(source);
    if (recovered) {
      return {
        assistantMessage: (msgMatch?.[1] ?? "Here is the generated artifact.").trim(),
        title: "Untitled artifact",
        html: recovered,
        hasArtifact: true,
      };
    }

    // Pure text — treat as the assistant message.
    return {
      assistantMessage: (msgMatch?.[1] ?? source).trim(),
      title: "Untitled artifact",
      html: "",
      hasArtifact: false,
    };
  } catch {
    return { ...empty, assistantMessage: raw };
  }
}

function deriveMessage(source: string, artifactIndex: number): string {
  const before = source.slice(0, artifactIndex).trim();
  return before || "Here is the generated artifact.";
}

function recoverBareHtml(source: string): string | null {
  const cleaned = cleanArtifactHtml(stripOuterFence(source));
  const doctype = cleaned.search(/<!DOCTYPE html>/i);
  if (doctype !== -1) return cleanArtifactHtml(cleaned.slice(doctype));
  const htmlTag = cleaned.search(/<html[\s>]/i);
  if (htmlTag !== -1) return cleanArtifactHtml(cleaned.slice(htmlTag));
  return null;
}

export type EnvelopeStreamEvent =
  | { kind: "message"; delta: string }
  | { kind: "artifact_open"; title: string }
  | { kind: "artifact"; delta: string };

type ParserState =
  | "before_message"
  | "in_message"
  | "before_artifact"
  | "in_artifact"
  | "done";

/**
 * Incremental envelope parser for live streaming. Feed it model-text chunks;
 * it emits message/artifact deltas as they become safe to forward (holding
 * back a small tail so partial delimiters are never emitted as content).
 *
 * The server still re-parses the full output at the end with
 * {@link parseArtifactEnvelope} for the authoritative final artifact, so this
 * parser only needs to be good enough for smooth live updates.
 */
export class StreamingEnvelopeParser {
  private buf = "";
  private cursor = 0;
  private state: ParserState = "before_message";
  private artifactOpened = false;

  feed(chunk: string): EnvelopeStreamEvent[] {
    this.buf += chunk;
    return this.process(false);
  }

  flush(): EnvelopeStreamEvent[] {
    return this.process(true);
  }

  get hasOpenedArtifact(): boolean {
    return this.artifactOpened;
  }

  private safeEnd(isFinal: boolean): number {
    return isFinal ? this.buf.length : Math.max(this.cursor, this.buf.length - GUARD);
  }

  private process(isFinal: boolean): EnvelopeStreamEvent[] {
    const out: EnvelopeStreamEvent[] = [];

    // Guard against unbounded loops.
    for (let guard = 0; guard < 10_000; guard++) {
      if (this.state === "done") break;

      if (this.state === "before_message") {
        const iMsg = this.buf.indexOf(MSG_OPEN, this.cursor);
        const iArt = this.buf.indexOf(ART_OPEN, this.cursor);
        const iBare = findBareHtmlStart(this.buf, this.cursor);
        if (iMsg !== -1 && (iArt === -1 || iMsg < iArt)) {
          this.cursor = iMsg + MSG_OPEN.length;
          this.state = "in_message";
          continue;
        }
        if (iArt !== -1) {
          this.state = "before_artifact";
          continue;
        }
        if (iBare !== -1) {
          const prefix = cleanStreamingPrefix(this.buf.slice(this.cursor, iBare));
          if (prefix) out.push({ kind: "message", delta: prefix });
          out.push({ kind: "artifact_open", title: "Untitled artifact" });
          this.artifactOpened = true;
          this.cursor = iBare;
          this.state = "in_artifact";
          continue;
        }
        break; // wait for an opener
      }

      if (this.state === "in_message") {
        const iClose = this.buf.indexOf(MSG_CLOSE, this.cursor);
        if (iClose !== -1) {
          if (iClose > this.cursor) {
            out.push({ kind: "message", delta: this.buf.slice(this.cursor, iClose) });
          }
          this.cursor = iClose + MSG_CLOSE.length;
          this.state = "before_artifact";
          continue;
        }
        const end = this.safeEnd(isFinal);
        if (end > this.cursor) {
          out.push({ kind: "message", delta: this.buf.slice(this.cursor, end) });
          this.cursor = end;
        }
        break;
      }

      if (this.state === "before_artifact") {
        const iArt = this.buf.indexOf(ART_OPEN, this.cursor);
        if (iArt === -1) break;
        const iGt = this.buf.indexOf(">", iArt);
        if (iGt === -1) break; // wait for full open tag
        const title = parseTitle(this.buf.slice(iArt, iGt + 1));
        out.push({ kind: "artifact_open", title });
        this.artifactOpened = true;
        this.cursor = iGt + 1;
        this.state = "in_artifact";
        continue;
      }

      if (this.state === "in_artifact") {
        const iClose = this.buf.indexOf(ART_CLOSE, this.cursor);
        if (iClose !== -1) {
          if (iClose > this.cursor) {
            out.push({ kind: "artifact", delta: this.buf.slice(this.cursor, iClose) });
          }
          this.cursor = iClose + ART_CLOSE.length;
          this.state = "done";
          continue;
        }
        const end = this.safeEnd(isFinal);
        if (end > this.cursor) {
          out.push({ kind: "artifact", delta: this.buf.slice(this.cursor, end) });
          this.cursor = end;
        }
        break;
      }
    }

    return out;
  }
}

function findBareHtmlStart(input: string, from: number): number {
  const slice = input.slice(from);
  const doctype = slice.search(/<!DOCTYPE html>/i);
  const html = slice.search(/<html[\s>]/i);
  if (doctype === -1) return html === -1 ? -1 : from + html;
  if (html === -1) return from + doctype;
  return from + Math.min(doctype, html);
}

function cleanStreamingPrefix(input: string): string {
  return input
    .replace(/```(?:html)?[ \t]*\r?\n?/gi, "")
    .trim();
}
