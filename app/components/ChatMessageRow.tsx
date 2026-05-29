"use client";

import { HtmlArtifactCard } from "netra/client";
import type { ChatMessage, HtmlArtifact, HtmlArtifactCardProps } from "netra/client";
import { Markdown } from "./Markdown";
import { NetraLogo } from "./NetraLogo";
import { SITE_THEME } from "../lib/theme";

const CARD_PROPS: Omit<HtmlArtifactCardProps, "artifact"> = {
  presentation: "seamless",
  theme: SITE_THEME,
  radius: "2xl",
  previewOptions: {
    allowExternalFonts: true,
    autoResize: true,
    minHeight: 0,
    maxHeight: 100000,
    debounceMs: 0,
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
        <div className="max-w-[82%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-md border border-white/10 bg-white/[0.07] px-4 py-2.5 text-[14.5px] leading-relaxed text-white/90 shadow-sm backdrop-blur">
          {message.content}
        </div>
      </div>
    );
  }

  const hasText = message.content.trim() !== "";

  return (
    <div className="lov-msg flex gap-3 py-3">
      <div className="mt-0.5 shrink-0">
        <NetraLogo size={28} />
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        {hasText && (
          <div className="text-white/85">
            <Markdown content={message.content} />
          </div>
        )}
        {artifact && <HtmlArtifactCard artifact={artifact} {...CARD_PROPS} />}
      </div>
    </div>
  );
}
