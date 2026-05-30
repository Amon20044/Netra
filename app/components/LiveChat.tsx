"use client";

import { useArtifactStream, STARTER_PROMPTS } from "netra-artifacts/client";
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Composer } from "./Composer";
import { ThinkingLoader } from "./ThinkingLoader";
import { ChatMessageRow } from "./ChatMessageRow";
import type { ChatMessage, HtmlArtifact } from "netra-artifacts/client";
import type { ProviderConfig } from "../lib/sessions";

interface LiveChatProps {
  sessionId: string;
  providerConfig: ProviderConfig | null;
  providerReady: boolean;
  greeting: string;
  userName: string;
  autoSend: string | null;
  onPersist: (id: string, messages: ChatMessage[], artifacts: Record<string, HtmlArtifact>) => void;
  onRequestProvider: (prompt: string) => void;
  onConfigure: () => void;
  onAutoSendConsumed: () => void;
}

export function LiveChat({
  sessionId,
  providerConfig,
  providerReady,
  greeting,
  userName,
  autoSend,
  onPersist,
  onRequestProvider,
  onConfigure,
  onAutoSendConsumed,
}: LiveChatProps) {
  const headers = useMemo(
    () =>
      providerConfig
        ? {
            "X-Provider": providerConfig.provider,
            "X-Api-Key": providerConfig.apiKey,
            "X-Model-Id": providerConfig.modelId,
          }
        : undefined,
    [providerConfig],
  );

  const { messages, artifacts, status, sendMessage, stop } = useArtifactStream({
    endpoint: "/api/chat",
    headers,
  });

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const prevCount = useRef(0);
  const autoSentRef = useRef(false);
  // Holds the body overrides (mode/game/allowVideoEmbeds…) for a starter prompt
  // that was clicked before a provider was connected, so the deferred auto-send
  // after the provider modal still requests the right feature.
  const pendingBodyRef = useRef<Record<string, unknown> | undefined>(undefined);
  const stickToBottomRef = useRef(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const busy = status === "submitted" || status === "streaming";
  const empty = messages.length === 0;

  // Show the "cooking" loader whenever Netra is working but nothing is visible
  // yet — before the message text or the HTML artifact has streamed in — so the
  // row never looks empty during generation.
  const last = messages[messages.length - 1];
  const lastArtifact = last?.artifactId ? artifacts[last.artifactId] : undefined;
  const lastHasContent =
    (last?.role === "assistant" && last.content.trim() !== "") ||
    !!(lastArtifact && (lastArtifact.html.trim() !== "" || lastArtifact.snapshot.trim() !== ""));
  const showCooking = busy && !lastHasContent;

  const send = (text: string, body?: Record<string, unknown>) => {
    if (!providerReady) {
      pendingBodyRef.current = body;
      onRequestProvider(text);
      return;
    }
    void sendMessage(text, body);
  };

  // Deferred send once a provider is connected via the modal.
  useEffect(() => {
    if (providerReady && autoSend && !autoSentRef.current) {
      autoSentRef.current = true;
      void sendMessage(autoSend, pendingBodyRef.current);
      pendingBodyRef.current = undefined;
      onAutoSendConsumed();
    }
  }, [providerReady, autoSend, sendMessage, onAutoSendConsumed]);

  // Persist whenever the conversation changes.
  useEffect(() => {
    if (messages.length > 0) onPersist(sessionId, messages, artifacts);
  }, [messages, artifacts, sessionId, onPersist]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
  };

  // The whole page scrolls. Stay pinned while the user is already near the
  // bottom; if they scroll up, show a down-arrow instead of yanking the page.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateScrollState = () => {
      const doc = document.documentElement;
      const distance = doc.scrollHeight - window.innerHeight - window.scrollY;
      const nearBottom = distance < 180;
      stickToBottomRef.current = nearBottom;
      setShowScrollBottom(!nearBottom);
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    scrollToBottom("smooth");
  }, [messages, artifacts, status]);

  // Hero entrance animation.
  useEffect(() => {
    if (!empty) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".lov-hero-el",
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" },
      );
    }, heroRef);
    return () => ctx.revert();
  }, [empty]);

  // Reveal each newly added message.
  useEffect(() => {
    if (messages.length > prevCount.current && scrollRef.current) {
      const items = scrollRef.current.querySelectorAll(".lov-msg");
      const last = items[items.length - 1];
      if (last) {
        gsap.fromTo(last, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
      }
    }
    prevCount.current = messages.length;
  }, [messages.length]);

  if (empty) {
    return (
      <div ref={heroRef} className="flex min-h-[100dvh] flex-col items-center justify-center px-5">
        <div className="w-full max-w-2xl">
          <div className="lov-hero-el mb-7 text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-[12.5px] font-medium text-white/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-fuchsia-400 to-orange-400" />
              Generative HTML UI · streamed live
            </div>
            <h1 className="bg-gradient-to-b from-white to-white/55 bg-clip-text text-[28px] font-semibold leading-tight tracking-tight text-transparent sm:text-[46px]">
              {greeting}, {userName}. What should we build?
            </h1>
          </div>

          <div className="lov-hero-el">
            <Composer
              autoFocus
              onSend={send}
              providerLabel={providerConfig ? providerConfig.modelId : "Connect model"}
              onConfigure={onConfigure}
              placeholder="Describe a UI — a pricing page, dashboard, invoice…"
            />
          </div>

          <div className="lov-hero-el mt-5 flex flex-wrap justify-center gap-2">
            {STARTER_PROMPTS.map((p) => (
              <button
                key={p.id}
                onClick={() => send(p.prompt, p.body)}
                title={p.hint}
                className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] text-white/65 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-white/25 hover:text-white"
              >
                <span aria-hidden="true">{p.emoji}</span>
                <span className="font-medium">{p.label}</span>
                <span className="hidden text-white/35 transition group-hover:text-white/55 sm:inline">
                  · {p.hint}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <div ref={scrollRef} className="mx-auto w-full max-w-3xl flex-1 px-2 pb-6 pt-16 sm:px-4 lg:pt-5">
        {messages.map((message) => (
          <ChatMessageRow
            key={message.id}
            message={message}
            artifact={message.artifactId ? artifacts[message.artifactId] : undefined}
          />
        ))}
        {showCooking && <ThinkingLoader />}
      </div>

      {/* Composer pinned to the viewport bottom while the page scrolls behind it. */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => {
            stickToBottomRef.current = true;
            setShowScrollBottom(false);
            scrollToBottom("smooth");
          }}
          className="fixed bottom-[116px] left-1/2 z-20 grid size-10 -translate-x-1/2 place-items-center rounded-full border border-white/12 bg-black/45 text-white/80 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl transition hover:border-white/25 hover:bg-black/55 hover:text-white sm:bottom-[122px]"
          aria-label="Scroll to bottom"
          title="Scroll to bottom"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}
      <div className="sticky bottom-0 z-10 px-3 pb-5 pt-3 sm:px-4">
        <div className="relative mx-auto w-full max-w-3xl">
          <Composer
            onSend={send}
            onStop={stop}
            busy={busy}
            providerLabel={providerConfig ? providerConfig.modelId : "Connect model"}
            onConfigure={onConfigure}
          />
        </div>
      </div>
    </div>
  );
}
