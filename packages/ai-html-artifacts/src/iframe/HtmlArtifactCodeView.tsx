"use client";

import * as React from "react";

export interface HtmlArtifactCodeViewProps {
  html: string;
  maxHeight?: number;
}

const pre: React.CSSProperties = {
  margin: 0,
  padding: "18px 20px",
  overflow: "auto",
  fontSize: 12.5,
  lineHeight: 1.65,
  fontFamily:
    'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  color: "#cdd6e4",
  background:
    "radial-gradient(1200px 400px at 0% 0%, #11151c 0%, #0b0d12 60%, #090a0e 100%)",
  whiteSpace: "pre",
  tabSize: 2,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
};

/** Read-only source view of the artifact HTML. */
export function HtmlArtifactCodeView({
  html,
  maxHeight = 900,
}: HtmlArtifactCodeViewProps) {
  return (
    <pre style={{ ...pre, maxHeight }}>
      <code>{html}</code>
    </pre>
  );
}
