/** True when running in an environment with a DOM. */
export const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";
