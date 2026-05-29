import { ARTIFACT_STATUS } from "./artifactStatus.js";
import type { HtmlArtifact, ArtifactStatus } from "../types/artifact.js";

/** Create a fresh artifact record in the `streaming` state. */
export function createHtmlArtifact(params: {
  id: string;
  title?: string;
  status?: ArtifactStatus;
  camouflage?: boolean;
}): HtmlArtifact {
  const now = Date.now();
  return {
    id: params.id,
    title: params.title ?? "Untitled artifact",
    type: "html",
    html: "",
    snapshot: "",
    camouflage: params.camouflage,
    status: params.status ?? ARTIFACT_STATUS.STREAMING,
    createdAt: now,
    updatedAt: now,
  };
}

/** Immutably apply a partial update, refreshing `updatedAt`. */
export function updateHtmlArtifact(
  artifact: HtmlArtifact,
  patch: Partial<Omit<HtmlArtifact, "id" | "type" | "createdAt">>,
): HtmlArtifact {
  return { ...artifact, ...patch, updatedAt: Date.now() };
}
