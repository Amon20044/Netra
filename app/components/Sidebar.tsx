"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { NetraLogo } from "./NetraLogo";
import type { ChatSession } from "../lib/sessions";

interface SidebarProps {
  sessions: ChatSession[];
  activeId: string;
  viewingId: string;
  open: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onToggle: () => void;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export function Sidebar({ sessions, activeId, viewingId, open, onSelect, onNew, onDelete, onToggle }: SidebarProps) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".lov-chat-item",
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.35, stagger: 0.035, ease: "power2.out" },
      );
    }, listRef);
    return () => ctx.revert();
  }, [open, sessions.length]);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-[100dvh] w-[280px] max-w-[85vw] shrink-0 flex-col overflow-hidden transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:z-auto lg:max-w-none lg:transition-[width] ${
        open
          ? "translate-x-0 lg:w-[280px]"
          : "-translate-x-full lg:w-0 lg:translate-x-0"
      }`}
    >
      <div className="flex h-full w-[280px] max-w-[85vw] flex-col gap-3 border-r border-white/[0.08] bg-[linear-gradient(180deg,#17172033,#0c0c14_42%,#08080d)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_-1px_0_0_rgba(255,255,255,0.04),12px_0_40px_-18px_rgba(0,0,0,0.85)] backdrop-blur-2xl lg:max-w-none">
        <div className="flex items-center gap-2.5 px-2 pt-1">
          <NetraLogo size={30} />
          <span className="text-[15px] font-semibold tracking-tight text-white">Netra</span>
          <button
            onClick={onToggle}
            className="ml-auto rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white/80"
            title="Hide sidebar"
            aria-label="Hide sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>

        <button
          onClick={onNew}
          className="group flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-[14px] font-medium text-white/85 transition-all hover:border-white/20 hover:bg-white/[0.08]"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New chat
        </button>

        <div className="px-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-white/30">
          Your chats
        </div>

        <div ref={listRef} className="-mr-1 flex-1 space-y-1 overflow-y-auto pr-1">
          {sessions.length === 0 ? (
            <div className="px-2 py-6 text-[13px] leading-relaxed text-white/30">
              No saved chats yet. What you build shows up here automatically.
            </div>
          ) : (
            sessions.map((s) => {
              const selected = s.id === viewingId;
              return (
                <div
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={`lov-chat-item group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 transition-colors ${
                    selected ? "bg-white/[0.09]" : "hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`truncate text-[13.5px] font-medium ${selected ? "text-white" : "text-white/75"}`}>
                        {s.title}
                      </span>
                      {s.id === activeId && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                      )}
                    </div>
                    <span className="text-[11.5px] text-white/30">{timeAgo(s.updatedAt)}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(s.id);
                    }}
                    className="rounded-md p-1 text-white/0 transition group-hover:text-white/35 hover:!text-rose-300"
                    title="Delete chat"
                    aria-label="Delete chat"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="px-2 pb-1 text-[11px] text-white/25">
          Predictive HTML Parser · sandboxed · no JS
        </div>
      </div>
    </aside>
  );
}
