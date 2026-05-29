"use client";

import { ChatMessageRow } from "./ChatMessageRow";
import type { ChatSession } from "../lib/sessions";

interface StaticChatProps {
  session: ChatSession;
  onContinue: () => void;
}

/**
 * Read-only viewer for a saved chat (full fidelity from persisted artifacts).
 * Live continuation would need the stream hook to rehydrate artifacts, so we
 * offer a clear "continue in a new chat" affordance instead.
 */
export function StaticChat({ session, onContinue }: StaticChatProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <div className="sticky top-0 z-10 mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2 px-4 pb-2 pt-4 pl-14 lg:pl-4">
        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[12px] font-medium text-white/55">
          Saved chat
        </span>
        <span className="truncate text-[13px] text-white/40">{session.title}</span>
        <button
          onClick={onContinue}
          className="ml-auto rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-orange-400 px-4 py-1.5 text-[12.5px] font-semibold text-white shadow-[0_6px_24px_-8px_rgba(236,72,153,0.7)] transition hover:scale-[1.02]"
        >
          + New chat to continue
        </button>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-2 pb-10 pt-4 sm:px-4">
        {session.messages.map((message) => (
          <ChatMessageRow
            key={message.id}
            message={message}
            artifact={message.artifactId ? session.artifacts[message.artifactId] : undefined}
          />
        ))}
      </div>
    </div>
  );
}
