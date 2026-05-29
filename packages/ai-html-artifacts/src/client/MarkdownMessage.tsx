"use client";

import * as React from "react";

export interface MarkdownMessageProps {
  content: string;
  className?: string;
}

/**
 * A tiny, dependency-free markdown renderer covering the common subset used in
 * chat: headings, bold/italic, inline + fenced code, links, and lists. It never
 * uses `dangerouslySetInnerHTML` — everything is built as React nodes, so the
 * model's text cannot inject markup.
 */
export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  const blocks = React.useMemo(() => renderBlocks(content), [content]);
  return (
    <div
      className={className}
      style={{
        fontSize: 14.5,
        lineHeight: 1.7,
        // Inherit the host's text color so it stays readable on light OR dark.
        color: "inherit",
        wordBreak: "break-word",
      }}
    >
      {blocks}
    </div>
  );
}

function renderBlocks(src: string): React.ReactNode[] {
  const lines = (src ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Fenced code block
    const fence = /^```(\w+)?\s*$/.exec(line);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i] ?? "")) {
        code.push(lines[i] ?? "");
        i++;
      }
      i++; // closing fence
      out.push(
        <pre key={key++} style={codeBlock}>
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Heading
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      const sizes = [22, 19, 17, 15.5, 14.5, 14];
      out.push(
        <div
          key={key++}
          style={{
            fontSize: sizes[level - 1],
            fontWeight: 700,
            margin: "14px 0 6px",
            color: "inherit",
            letterSpacing: "-0.01em",
          }}
        >
          {renderInline(heading[2] ?? "")}
        </div>,
      );
      i++;
      continue;
    }

    // Unordered / ordered list
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      const ordered = /^\s*\d+\.\s+/.test(line);
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i] ?? "")) {
        const text = (lines[i] ?? "").replace(/^\s*([-*+]|\d+\.)\s+/, "");
        items.push(<li key={items.length}>{renderInline(text)}</li>);
        i++;
      }
      const listStyle: React.CSSProperties = { margin: "6px 0", paddingLeft: 22 };
      out.push(
        ordered ? (
          <ol key={key++} style={listStyle}>
            {items}
          </ol>
        ) : (
          <ul key={key++} style={listStyle}>
            {items}
          </ul>
        ),
      );
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph (gather consecutive non-blank, non-special lines)
    const para: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() !== "" &&
      !/^```/.test(lines[i] ?? "") &&
      !/^(#{1,6})\s+/.test(lines[i] ?? "") &&
      !/^\s*([-*+]|\d+\.)\s+/.test(lines[i] ?? "")
    ) {
      para.push(lines[i] ?? "");
      i++;
    }
    out.push(
      <p key={key++} style={{ margin: "6px 0" }}>
        {renderInline(para.join(" "))}
      </p>,
    );
  }

  return out;
}

const codeBlock: React.CSSProperties = {
  margin: "8px 0",
  padding: 12,
  borderRadius: 10,
  background: "var(--aha-code-bg, #0d1117)",
  color: "var(--aha-code-fg, #e6edf3)",
  fontSize: 12.5,
  lineHeight: 1.55,
  overflowX: "auto",
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
};

const inlineCode: React.CSSProperties = {
  padding: "1px 5px",
  borderRadius: 5,
  // Adapts to light/dark by tinting from the inherited text color.
  background: "color-mix(in srgb, currentColor 12%, transparent)",
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  fontSize: "0.9em",
};

/** Inline formatting: `code`, **bold**, *italic*, [text](url). */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];

    if (token.startsWith("`")) {
      nodes.push(
        <code key={key++} style={inlineCode}>
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else {
      const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      if (link) {
        nodes.push(
          <a
            key={key++}
            href={link[2]}
            target="_blank"
            rel="noreferrer noopener"
            style={{ color: "var(--aha-link, #2563eb)", textDecoration: "underline" }}
          >
            {link[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }
    last = m.index + token.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
