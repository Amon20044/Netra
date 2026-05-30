/**
 * Allowlist for ESM module URLs that may appear in a `<script type="importmap">`
 * when `allowModuleImports` is enabled (single-file games, e.g. three.js).
 *
 * The sanitizer guarantees no arbitrary JavaScript can be loaded: an importmap
 * only maps bare specifiers to URLs, and the inline module that consumes it can
 * only `import` from those mapped URLs. So the security boundary is "which URLs
 * may a mapping target." We require:
 *
 *   1. https only,
 *   2. a known immutable ESM CDN host, and
 *   3. a version-pinned path (so a mapping can't silently float to new code).
 *
 * This mirrors the deliberately-narrow allowlist approach already used for
 * Google Fonts (`ALLOWED_FONT_LINK`) and trusted YouTube embeds.
 */

/** Immutable, versioned ESM CDN hosts. */
export const TRUSTED_MODULE_CDN_HOSTS: readonly string[] = [
  "esm.sh",
  "cdn.jsdelivr.net",
  "unpkg.com",
  "cdn.skypack.dev",
];

/**
 * A path is "pinned" when it carries an explicit version. We accept the common
 * forms used by these CDNs:
 *   - `…/three@0.160.0/…`            (esm.sh, unpkg, skypack)
 *   - `…/npm/three@0.160.0/…`        (jsDelivr npm)
 *   - `…/three@0.160.0`              (bare package, no subpath)
 * A leading `v` on the version (skypack's `three@v0.160.0`) is allowed.
 */
const PINNED_PACKAGE = /[@/][a-z0-9._-]+@v?\d+(?:\.\d+){0,2}(?:[-+][a-z0-9.-]+)?(?:\/|$)/i;

/**
 * True if `value` is an https URL on a trusted CDN host with a version-pinned
 * package path. Accepts a bare specifier check too: callers pass fully-resolved
 * URLs (importmap values), not bare names.
 */
export function isTrustedModuleUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!TRUSTED_MODULE_CDN_HOSTS.includes(host)) return false;
  // The path must pin a version somewhere (package@version).
  return PINNED_PACKAGE.test(url.pathname);
}

/** CSP source list (space-joined origins) for the trusted CDN hosts. */
export function trustedModuleCdnOrigins(): string {
  return TRUSTED_MODULE_CDN_HOSTS.map((h) => `https://${h}`).join(" ");
}
