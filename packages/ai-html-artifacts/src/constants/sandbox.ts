/** Iframe sandbox tokens used by the preview. Scripts are opt-in only. */
export const SANDBOX_TOKENS = {
  FORMS: "allow-forms",
  POPUPS: "allow-popups",
  SAME_ORIGIN: "allow-same-origin",
  SCRIPTS: "allow-scripts",
} as const;

/**
 * Default sandbox: forms + same-origin + popups, but NO scripts. `allow-same-origin`
 * lets the parent measure the document so the iframe can auto-fit its content
 * height (no inner scrollbar). It is only dangerous when combined with
 * `allow-scripts`, so the script-enabled sandbox path deliberately omits it.
 */
export const DEFAULT_SANDBOX = `${SANDBOX_TOKENS.FORMS} ${SANDBOX_TOKENS.SAME_ORIGIN} ${SANDBOX_TOKENS.POPUPS}`;

/** Tokens that are forbidden regardless of configuration. */
export const FORBIDDEN_SANDBOX_TOKENS = [
  "allow-top-navigation",
  "allow-top-navigation-by-user-activation",
  "allow-modals",
] as const;
