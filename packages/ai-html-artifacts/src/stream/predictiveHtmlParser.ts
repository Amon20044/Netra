/**
 * Predictive HTML parser for streaming AI output.
 *
 * The core idea: keep the real streamed HTML as the immutable *truth*, but for
 * rendering produce a temporary *projection* that predicts the missing closing
 * tags from the current parser stack. The model can stream
 *
 *     <section><div><h2>Hello
 *
 * and the renderer receives a valid document:
 *
 *     <section><div><h2>Hello</h2></div></section>
 *
 * When the real `</h2></div></section>` arrives later, the stack matches them
 * and nothing is duplicated — predicted closings are never written back into
 * the committed truth.
 *
 * The parser is incremental: feed it chunks with {@link push}; it carries
 * partial tokens (tags, comments, raw-text close) across chunk boundaries. It
 * handles void elements, self-closing tags, quoted attributes containing
 * `<`/`>`, comments, doctype, raw-text elements (`<style>`/`<script>`/… whose
 * bodies aren't markup), implicit closing (`<li>`, `<td>`, `<p>`, …), and
 * mis-nested close tags (`<div><p>x</div>` → closes `p` before `div`).
 *
 * It is purely structural — it does NOT sanitize or style. Run the output
 * through the sanitizer before rendering (the iframe pipeline does this).
 *
 * Fail-open: malformed input degrades to text rather than throwing.
 */

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

// Elements whose content is text, not markup. An unclosed one would otherwise
// swallow everything after it; we consume to the real closer instead.
const RAW_TEXT_TAGS = new Set(["script", "style", "textarea", "title"]);

// When the key element is open and one of its value elements opens, the key is
// implicitly closed first (mirrors the HTML parsing spec, pragmatically).
const IMPLICIT_CLOSE_RULES: Record<string, Set<string>> = {
  p: new Set([
    "p", "div", "section", "article", "main", "header", "footer", "nav",
    "aside", "ul", "ol", "dl", "table", "form", "blockquote", "pre",
    "h1", "h2", "h3", "h4", "h5", "h6", "figure", "hr",
  ]),
  li: new Set(["li"]),
  dt: new Set(["dt", "dd"]),
  dd: new Set(["dt", "dd"]),
  tr: new Set(["tr", "tbody", "tfoot", "thead"]),
  td: new Set(["td", "th", "tr", "tbody", "tfoot", "thead"]),
  th: new Set(["td", "th", "tr", "tbody", "tfoot", "thead"]),
  thead: new Set(["tbody", "tfoot"]),
  tbody: new Set(["tbody", "tfoot"]),
  option: new Set(["option", "optgroup"]),
};

export class PredictiveHtmlParser {
  private committed = "";
  private pending = "";
  private stack: string[] = [];
  private insideRawText: string | null = null;
  private htmlClosed = false;

  /** Feed a chunk; returns the current renderable projection. */
  push(chunk: string): string {
    if (typeof chunk === "string" && chunk.length > 0) {
      try {
        this.process(this.pending + chunk);
      } catch {
        // Fail open: keep whatever we had, treat the chunk as text.
        this.pending = "";
        this.committed += chunk;
      }
    }
    return this.render();
  }

  /** The current renderable projection: committed + predicted closings. */
  render(): string {
    let html = this.committed;
    const stack = [...this.stack];
    if (this.insideRawText === "script") {
      const open = html.toLowerCase().lastIndexOf("<script");
      if (open !== -1) html = html.slice(0, open);
      const scriptIndex = stack.lastIndexOf("script");
      if (scriptIndex !== -1) stack.splice(scriptIndex, 1);
    }
    // Only append the held tail if it's plain text (CSS/text), never a partial
    // tag fragment like "<div cla" or "</sty".
    if (this.pending && !this.pending.startsWith("<") && this.insideRawText !== "script") {
      html += this.pending;
    }
    for (let i = stack.length - 1; i >= 0; i--) {
      html += `</${stack[i]}>`;
    }
    return html;
  }

  /** The immutable, never-predicted truth committed so far. */
  get committedHtml(): string {
    return this.committed;
  }

  /** True once a real `</html>` has balanced the document. */
  get complete(): boolean {
    return this.htmlClosed;
  }

  /** Is there visible body content worth rendering yet? */
  isRenderable(): boolean {
    const body = /<body\b[^>]*>([\s\S]*)$/i.exec(this.committed);
    if (body) return /\S/.test(body[1] ?? "");
    return /<(?:div|section|main|header|footer|h[1-6]|p|ul|ol|li|table|article|nav|svg|img|button|form|span|a|figure|blockquote)\b/i.test(
      this.committed,
    );
  }

  reset(): void {
    this.committed = "";
    this.pending = "";
    this.stack = [];
    this.insideRawText = null;
    this.htmlClosed = false;
  }

  private process(buf: string): void {
    this.pending = "";
    const n = buf.length;
    let i = 0;

    while (i < n) {
      // Inside a raw-text element: consume verbatim until its real closer.
      if (this.insideRawText) {
        const tag = this.insideRawText;
        const re = new RegExp(`</${tag}\\s*>`, "i");
        const m = re.exec(buf.slice(i));
        if (m) {
          const end = i + m.index + m[0].length;
          this.committed += buf.slice(i, end);
          const idx = this.stack.lastIndexOf(tag);
          if (idx !== -1) this.stack.length = idx;
          this.insideRawText = null;
          i = end;
          continue;
        }
        // Closer not here yet: commit what we safely can, hold back enough to
        // catch a closer split across the boundary (e.g. "</styl").
        const holdback = `</${tag}>`.length - 1;
        const safeEnd = Math.max(i, n - holdback);
        if (safeEnd > i) this.committed += buf.slice(i, safeEnd);
        this.pending = buf.slice(safeEnd);
        return;
      }

      const lt = buf.indexOf("<", i);
      if (lt === -1) {
        this.committed += buf.slice(i);
        return;
      }
      if (lt > i) this.committed += buf.slice(i, lt);

      // Comment.
      if (buf.startsWith("<!--", lt)) {
        const end = buf.indexOf("-->", lt + 4);
        if (end === -1) {
          this.pending = buf.slice(lt);
          return;
        }
        this.committed += buf.slice(lt, end + 3);
        i = end + 3;
        continue;
      }

      // Doctype / declaration / processing instruction.
      if (buf.startsWith("<!", lt) || buf.startsWith("<?", lt)) {
        const end = buf.indexOf(">", lt + 2);
        if (end === -1) {
          this.pending = buf.slice(lt);
          return;
        }
        this.committed += buf.slice(lt, end + 1);
        i = end + 1;
        continue;
      }

      const gt = findTagEnd(buf, lt);
      if (gt === -1) {
        // Incomplete tag at the frontier — hold it for the next chunk.
        this.pending = buf.slice(lt);
        return;
      }

      const raw = buf.slice(lt, gt + 1);
      const name = tagName(raw);
      if (!name) {
        // Not a real tag ("<>" or "< x"); treat literally as text.
        this.committed += raw;
        i = gt + 1;
        continue;
      }

      if (raw[1] === "/") this.handleClose(name, raw);
      else this.handleOpen(name, raw);
      i = gt + 1;
    }
  }

  private handleOpen(name: string, raw: string): void {
    this.autoCloseImplicit(name);
    this.committed += raw;

    const selfClosing = /\/\s*>$/.test(raw);
    if (VOID_TAGS.has(name) || selfClosing) return;

    this.stack.push(name);
    if (RAW_TEXT_TAGS.has(name)) this.insideRawText = name;
  }

  private handleClose(name: string, raw: string): void {
    const idx = this.stack.lastIndexOf(name);
    if (idx === -1) return; // orphan close — ignore

    // Close any unclosed descendants opened after the matched element.
    while (this.stack.length > idx + 1) {
      const node = this.stack.pop()!;
      this.committed += `</${node}>`;
    }
    this.stack.pop();
    this.committed += raw;
    if (name === "html") this.htmlClosed = true;
  }

  private autoCloseImplicit(newTag: string): void {
    // A chain may close several elements (e.g. <td>…<tr> closes td then tr).
    for (;;) {
      const top = this.stack[this.stack.length - 1];
      if (!top) return;
      const rule = IMPLICIT_CLOSE_RULES[top];
      if (rule && rule.has(newTag)) {
        this.stack.pop();
        this.committed += `</${top}>`;
      } else {
        return;
      }
    }
  }
}

/** Index of the `>` ending the tag opening at `lt`, skipping quoted attrs. */
function findTagEnd(input: string, lt: number): number {
  let quote: string | null = null;
  for (let i = lt + 1; i < input.length; i++) {
    const c = input[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === ">") {
      return i;
    }
  }
  return -1;
}

/** Lowercase element name from a tag string, or "" if not a real tag. */
function tagName(tag: string): string {
  const m = /^<\/?\s*([a-zA-Z][a-zA-Z0-9:-]*)/.exec(tag);
  return m ? m[1]!.toLowerCase() : "";
}
