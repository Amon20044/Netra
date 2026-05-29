import { generateText } from "ai";
import type { LanguageModel } from "ai";
import {
  CLASSIFIER_SYSTEM_PROMPT,
  buildClassifierUserPrompt,
} from "./classifierPrompt.js";
import { classifyByRules } from "./rules.js";
import { safeJsonParse } from "../utils/safeJsonParse.js";
import type { ArtifactMode } from "../types/stream.js";

export interface ClassificationResult {
  mode: ArtifactMode;
  reason: string;
  /** Whether the decision came from the model or the heuristic fallback. */
  source: "model" | "rules";
}

export interface ClassifyModeParams {
  model: LanguageModel;
  query: string;
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
  const { model, query, temperature = 0, abortSignal } = params;
  const fallback = classifyByRules(query);

  try {
    const { text } = await generateText({
      model,
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
