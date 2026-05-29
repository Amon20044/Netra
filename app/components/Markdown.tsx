"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remend from "remend";
import { useMemo } from "react";

/**
 * Full GFM markdown renderer for streamed assistant text. `remend` heals
 * incomplete markdown (unclosed **bold**, partial [links](…), etc.) every
 * frame so streaming text never renders broken, then react-markdown +
 * remark-gfm renders tables, task lists, strikethrough, code, and the rest.
 * Styling lives in the `.aha-md` scope in globals.css (readable light & dark).
 */
export function Markdown({ content }: { content: string }) {
  const healed = useMemo(() => {
    try {
      return remend(content);
    } catch {
      return content;
    }
  }, [content]);

  return (
    <div className="aha-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => (
            <a target="_blank" rel="noreferrer noopener" {...props} />
          ),
        }}
      >
        {healed}
      </ReactMarkdown>
    </div>
  );
}
