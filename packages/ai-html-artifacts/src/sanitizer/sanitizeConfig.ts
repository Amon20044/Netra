import { DEFAULT_SANITIZE_OPTIONS } from "../constants/defaults.js";
import { mergeConfig } from "../utils/mergeConfig.js";
import type { SanitizeOptions } from "../types/config.js";

/** Resolve partial sanitize options against the static-safe defaults. */
export function resolveSanitizeOptions(
  options?: SanitizeOptions,
): Required<SanitizeOptions> {
  return mergeConfig(DEFAULT_SANITIZE_OPTIONS, options);
}
