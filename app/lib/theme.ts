import type { ArtifactTheme } from "netra-artifacts/client";

/**
 * The host site's theme. Passed to the chat route it is injected into the
 * generation prompt so artifacts match this palette; passed to the artifact
 * card it is injected into the iframe as CSS variables so seamless artifacts
 * inherit the site's colours and type and melt into the chat.
 */
export const SITE_THEME: ArtifactTheme = {
  colorScheme: "dark",
  background: "#0b0b12",
  foreground: "#f4f4f8",
  primary: "#a855f7",
  accent: "#ec4899",
  muted: "rgba(244,244,248,0.55)",
  border: "rgba(255,255,255,0.10)",
  surface: "rgba(255,255,255,0.045)",
  radius: "16px",
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  notes:
    "Dark, glassy, premium. Indigo → fuchsia → orange accents on near-black, subtle hairline borders and soft depth. Never use pure-white or light backgrounds; keep it cohesive with this aurora palette.",
};
