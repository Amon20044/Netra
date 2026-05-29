"use client";

import { HtmlArtifactCard } from "netra/client";
import type { HtmlArtifact } from "netra/client";

/**
 * Optional split-pane layout: render the latest artifact in a dedicated panel
 * instead of inline. Pass the most recent artifact from `useArtifactStream`.
 */
export function ArtifactPanel({ artifact }: { artifact?: HtmlArtifact }) {
  if (!artifact) {
    return (
      <div style={{ padding: 24, color: "#9ca3af", fontSize: 14 }}>
        Artifacts will appear here.
      </div>
    );
  }
  return (
    <HtmlArtifactCard
      artifact={artifact}
      variant="glass"
      radius="2xl"
      shadow="medium"
      defaultTab="preview"
    />
  );
}
