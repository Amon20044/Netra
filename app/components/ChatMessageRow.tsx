"use client";

import { useEffect, useRef, useState } from "react";
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
    allowVideoEmbeds: true,
    allowScripts: true,
    // Single-file three.js games: keeps the pinned-CDN importmap so the game
    // loads. Safe — the sanitizer only allows trusted, version-pinned CDNs.
    allowModuleImports: true,
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

function UserMessageBubble({ content }: { content: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const updateOverflow = () => {
      const styles = getComputedStyle(node);
      const fontSize = Number.parseFloat(styles.fontSize) || 14.5;
      const lineHeight = Number.parseFloat(styles.lineHeight) || fontSize * 1.625;
      setCanExpand(node.scrollHeight > lineHeight * 7 + 1);
    };

    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(node);
    return () => observer.disconnect();
  }, [content, expanded]);

  return (
    <div className="relative max-w-[82%] rounded-[20px] rounded-br-md border border-white/[0.12] bg-gradient-to-b from-[#2d2d34] to-[#161619] px-4 py-2.5 text-[14.5px] leading-relaxed text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-1px_0_rgba(0,0,0,0.4),0_10px_26px_-12px_rgba(0,0,0,0.75)]">
      <div
        ref={contentRef}
        className={`whitespace-pre-wrap break-words transition-[max-height] duration-200 ease-out ${
          canExpand ? "pr-7" : ""
        }`}
        style={{ maxHeight: expanded ? "none" : "calc(7 * 1.625em)", overflow: "hidden" }}
      >
        {content}
      </div>
      {canExpand && (
        <>
          {!expanded && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-[20px] bg-gradient-to-t from-[#161619] via-[#161619]/85 to-transparent" />
          )}
          <button
            type="button"
            aria-label={expanded ? "Collapse message" : "Expand message"}
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            className="absolute bottom-1.5 right-2.5 grid size-6 place-items-center rounded-full border border-white/10 bg-black/25 text-white/80 shadow-sm transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/65"
          >
            <span
              aria-hidden="true"
              className={`block size-2.5 border-b-2 border-r-2 border-current transition-transform ${
                expanded ? "-translate-y-0.5 rotate-[225deg]" : "translate-y-[-1px] rotate-45"
              }`}
            />
          </button>
        </>
      )}
    </div>
  );
}

/**
 * One chat message, rendered by role. User messages are a right-aligned glass
 * bubble; assistant messages get a Netra avatar, optional markdown, and the
 * artifact rendered either as a normal framed artifact or, for generative UI,
 * as a seamless transparent camouflage surface.
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
        <UserMessageBubble content={message.content} />
      </div>
    );
  }

  const hasText = message.content.trim() !== "";
  const hasArtifact = Boolean(
    artifact && (artifact.html.trim() !== "" || artifact.snapshot.trim() !== ""),
  );
  const camouflage = artifact?.camouflage ?? message.mode === "generative_ui";
  const artifactProps =
    camouflage ? SEAMLESS_PROPS : CARD_PROPS;

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
          // Only generative UI uses camouflage. Standalone artifacts keep their
          // authored document background and render inside the normal artifact frame.
          <HtmlArtifactCard artifact={artifact} {...artifactProps} />
        )}
      </div>
    </div>
  );
}
