import {
  CLASSIFIER_SYSTEM_PROMPT,
  buildClassifierUserPrompt,
} from "./classifierPrompt.js";
import { classifyByRules } from "./rules.js";
import { safeJsonParse } from "../utils/safeJsonParse.js";
import type { AnyArtifactMode, ArtifactMode } from "../types/stream.js";
import type { GenerateText } from "../types/server.js";

export interface ClassificationResult {
  mode: ArtifactMode;
  reason: string;
  /** Whether the decision came from the model or the heuristic fallback. */
  source: "model" | "rules";
}

export interface ClassifyModeParams {
  query: string;
  generateText?: GenerateText;
  temperature?: number;
  abortSignal?: AbortSignal;
}

/**
 * Classify a request as `markdown`, `artifact`, or `generative_ui`. Tries the
 * model first and fails open to deterministic rules on any error or malformed output.
 * Never throws — routing must always resolve.
 */
export async function classifyMode(
  params: ClassifyModeParams,
): Promise<ClassificationResult> {
  const { generateText, query, temperature = 0, abortSignal } = params;
  const fallback = classifyByRules(query);

  if (
    (fallback.mode === "artifact" || fallback.mode === "generative_ui") &&
    fallback.confidence >= 0.65
  ) {
    return { ...fallback, source: "rules" };
  }

  if (!generateText) return { ...fallback, source: "rules" };

  try {
    const text = await generateText({
      temperature,
      system: CLASSIFIER_SYSTEM_PROMPT,
      prompt: buildClassifierUserPrompt(query),
      abortSignal,
    });

    const parsed = safeJsonParse<{ mode?: string; reason?: string }>(text, {});
    const parsedMode = normalizeClassificationMode(parsed.mode);
    if (parsedMode) {
      return {
        mode: parsedMode,
        reason: parsed.reason?.slice(0, 200) ?? "model classification",
        source: "model",
      };
    }

    return { ...fallback, source: "rules" };
  } catch {
    return { ...fallback, source: "rules" };
  }
}

function normalizeClassificationMode(mode: unknown): ArtifactMode | null {
  if (
    mode === "markdown" ||
    mode === "artifact" ||
    mode === "generative_ui"
  ) {
    return mode;
  }
  if ((mode as AnyArtifactMode) === "html_artifact") return "artifact";
  return null;
}
