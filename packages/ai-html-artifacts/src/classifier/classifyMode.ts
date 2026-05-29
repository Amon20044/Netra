import {
  CLASSIFIER_SYSTEM_PROMPT,
  buildClassifierUserPrompt,
} from "./classifierPrompt.js";
import { classifyByRules } from "./rules.js";
import { safeJsonParse } from "../utils/safeJsonParse.js";
import type { ArtifactMode } from "../types/stream.js";
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
 * Classify a request as `markdown` or `html_artifact`. Tries the model first
 * and fails open to deterministic rules on any error or malformed output.
 * Never throws — routing must always resolve.
 */
export async function classifyMode(
  params: ClassifyModeParams,
): Promise<ClassificationResult> {
  const { generateText, query, temperature = 0, abortSignal } = params;
  const fallback = classifyByRules(query);

  if (fallback.mode === "html_artifact" && fallback.confidence >= 0.65) {
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
    if (parsed.mode === "markdown" || parsed.mode === "html_artifact") {
      return {
        mode: parsed.mode,
        reason: parsed.reason?.slice(0, 200) ?? "model classification",
        source: "model",
      };
    }

    return { ...fallback, source: "rules" };
  } catch {
    return { ...fallback, source: "rules" };
  }
}
