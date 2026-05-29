"use client";

import { useState } from "react";

interface ComposerProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  busy?: boolean;
  placeholder?: string;
  providerLabel?: string;
  onConfigure?: () => void;
  autoFocus?: boolean;
}

export function Composer({
  onSend,
  onStop,
  busy = false,
  placeholder = "Ask Netra to generate a UI…",
  providerLabel,
  onConfigure,
  autoFocus,
}: ComposerProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    setValue("");
    onSend(text);
  };

  return (
    <div className="lov-depth p-2 pl-4" style={{ ["--lov-radius" as string]: "24px" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2"
      >
        <textarea
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={placeholder}
          className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent py-3 text-[15px] leading-relaxed text-white outline-none placeholder:text-white/35"
          style={{ scrollbarWidth: "thin" }}
        />

        <div className="flex items-center gap-2 pb-1">
          {onConfigure && (
            <button
              type="button"
              onClick={onConfigure}
              title="Model settings"
              className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[12.5px] font-medium text-white/55 transition hover:border-white/20 hover:text-white/85 sm:flex"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              {providerLabel ?? "Configure"}
            </button>
          )}

          {busy ? (
            <button
              type="button"
              onClick={onStop}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              title="Stop"
              aria-label="Stop"
            >
              <span className="h-3 w-3 rounded-[3px] bg-white" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!value.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-white to-white/85 text-black shadow-[0_4px_20px_-4px_rgba(255,255,255,0.5)] transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
              title="Send"
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
