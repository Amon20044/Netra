/**
 * Throws when `condition` is falsy. Narrows types for the caller. Keep
 * messages short — they may surface in server logs.
 */
export function invariant(
  condition: unknown,
  message = "Invariant failed",
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
