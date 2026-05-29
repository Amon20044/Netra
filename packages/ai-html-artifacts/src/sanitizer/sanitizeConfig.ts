import { DEFAULT_SANITIZE_OPTIONS } from "../constants/defaults.js";
import { mergeConfig } from "../utils/mergeConfig.js";
import type { SanitizeOptions } from "../types/config.js";

/** Resolve partial sanitize options against the static-safe defaults. */
export function resolveSanitizeOptions(
  options?: SanitizeOptions,
): Required<SanitizeOptions> {
  const merged = mergeConfig(DEFAULT_SANITIZE_OPTIONS, options);
  // Scripts are never allowed, no matter what a caller passes.
  merged.allowScripts = false;
  return merged;
}
