"use client";

import { HtmlArtifactCard } from "netra-artifacts/client";
import type { ChatMessage, HtmlArtifact, HtmlArtifactCardProps } from "netra-artifacts/client";
import { Markdown } from "./Markdown";
import { NetraLogo } from "./NetraLogo";
import { SITE_THEME } from "../lib/theme";

// Artifacts use the HYBRID styling model: ONE small shared <style> design system
// (box-sizing reset + clamp type/space scale + element defaults + .wrap/.stack/
// .grid/.row/.card utility classes) PLUS inline style="" for per-element specifics.
// So <style> MUST be allowed — stripping it removes every utility class and the
// scale, collapsing layout (grids stack to one column, cards lose their surface).
// The sanitizer still cleans <style> contents (no @import except fonts, no
// expression()), so this stays static-safe.
const CARD_PROPS: Omit<HtmlArtifactCardProps, "artifact"> = {
  // Pure artifact: its own self-contained world in a clean rounded glass frame.
  variant: "glass",
  radius: "3xl",
  previewOptions: {
    allowExternalFonts: true,
    autoResize: true,
    maxHeight: 100000,
    debounceMs: 0,
    allowStyleTags: true,
    allowInlineStyles: true,
  },
};

// Camouflage: transparent, host-themed, sits inline on the chat.
const SEAMLESS_PROPS: Omit<HtmlArtifactCardProps, "artifact"> = {
  ...CARD_PROPS,
  presentation: "seamless",
  theme: SITE_THEME,
  previewOptions: {
    ...CARD_PROPS.previewOptions,
    minHeight: 0,
  },
};

/**
 * One chat message, rendered by role. User messages are a right-aligned glass
 * bubble; assistant messages get a Netra avatar, optional markdown, and the
 * artifact rendered seamlessly (transparent, chromeless) so it sits inline.
 */
export function ChatMessageRow({
  message,
  artifact,
}: {
  message: ChatMessage;
  artifact?: HtmlArtifact;
}) {
  if (message.role === "user") {
    return (
      <div className="lov-msg flex justify-end py-2.5">
        <div className="max-w-[82%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-md border border-white/[0.12] bg-gradient-to-b from-[#2d2d34] to-[#161619] px-4 py-2.5 text-[14.5px] leading-relaxed text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-1px_0_rgba(0,0,0,0.4),0_10px_26px_-12px_rgba(0,0,0,0.75)]">
          {message.content}
        </div>
      </div>
    );
  }

  const hasText = message.content.trim() !== "";
  const hasArtifact = Boolean(
    artifact && (artifact.html.trim() !== "" || artifact.snapshot.trim() !== ""),
  );

  return (
    <div className="lov-msg flex gap-2 py-2 sm:gap-3 sm:py-3">
      {/* Avatar is hidden on phones so the AI output spans the full width. */}
      <div className="mt-0.5 hidden shrink-0 sm:block">
        <NetraLogo size={28} />
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        {hasText && (
          <div className="text-white/85">
            <Markdown content={message.content} />
          </div>
        )}
        {hasArtifact && artifact && (
          // Every chat artifact renders seamless/transparent (camouflage) so it
          // blends into the chat with NO opaque dark card box. Camouflage only
          // transparentizes the PAGE — inner cards/charts keep their surfaces.
          <HtmlArtifactCard artifact={artifact} {...SEAMLESS_PROPS} />
        )}
      </div>
    </div>
  );
}
