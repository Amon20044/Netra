"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AuroraBackground } from "./AuroraBackground";
import { Sidebar } from "./Sidebar";
import { LiveChat } from "./LiveChat";
import { StaticChat } from "./StaticChat";
import { ProviderModal } from "./ProviderModal";
import {
  deriveTitle,
  displayNameForProvider,
  greetingForNow,
  loadProvider,
  loadSessions,
  newId,
  saveProvider,
  saveSessions,
  type ChatMessage,
  type ChatSession,
  type ProviderConfig,
} from "../lib/sessions";
import type { HtmlArtifact } from "netra-artifacts/client";

export function ChatExperience() {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);
  const [activeId, setActiveId] = useState("");
  const [viewingId, setViewingId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  // Live source of truth; React state is committed on a throttle so streaming
  // deltas don't re-render the shell or thrash localStorage on every token.
  const sessionsRef = useRef<ChatSession[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // One-time hydration from localStorage (only available post-mount, so this
    // can't be lazy initial state without risking an SSR hydration mismatch).
    /* eslint-disable react-hooks/set-state-in-effect */
    const loaded = loadSessions();
    sessionsRef.current = loaded;
    setSessions(loaded);
    setProviderConfig(loadProvider());
    const id = newId();
    setActiveId(id);
    setViewingId(id);
    // Sidebar starts open on desktop, closed on phones/tablets (it's an overlay
    // drawer there, so a default-open sidebar would bury the chat).
    setSidebarOpen(window.innerWidth >= 1024);
    setMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, []);

  const commit = useCallback(() => {
    const snapshot = [...sessionsRef.current];
    setSessions(snapshot);
    saveSessions(snapshot);
  }, []);

  const onPersist = useCallback(
    (id: string, messages: ChatMessage[], artifacts: Record<string, HtmlArtifact>) => {
      const now = Date.now();
      const prev = sessionsRef.current;
      const existing = prev.find((s) => s.id === id);
      const session: ChatSession = {
        id,
        title: deriveTitle(messages),
        messages,
        artifacts,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      sessionsRef.current = [session, ...prev.filter((s) => s.id !== id)];
      if (!flushTimer.current) {
        flushTimer.current = setTimeout(() => {
          flushTimer.current = null;
          commit();
        }, 600);
      }
    },
    [commit],
  );

  // On phones/tablets the sidebar is an overlay, so collapse it once the user
  // picks or starts a chat to reveal the conversation underneath.
  const closeOnMobile = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  const newChat = useCallback(() => {
    const id = newId();
    setActiveId(id);
    setViewingId(id);
    setPendingPrompt(null);
    closeOnMobile();
  }, [closeOnMobile]);

  const selectSession = useCallback(
    (id: string) => {
      setViewingId(id);
      closeOnMobile();
    },
    [closeOnMobile],
  );

  const deleteSession = useCallback(
    (id: string) => {
      sessionsRef.current = sessionsRef.current.filter((s) => s.id !== id);
      commit();
      setViewingId((v) => (v === id ? activeId : v));
    },
    [commit, activeId],
  );

  const requestProvider = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
    setModalOpen(true);
  }, []);

  const onConnected = useCallback((config: ProviderConfig) => {
    saveProvider(config);
    setProviderConfig(config);
    setModalOpen(false);
  }, []);

  const onAutoSendConsumed = useCallback(() => setPendingPrompt(null), []);

  if (!mounted) {
    return (
      <div className="relative h-[100dvh] w-full overflow-hidden">
        <AuroraBackground />
      </div>
    );
  }

  const providerReady = !!providerConfig?.apiKey;
  const viewingActive = viewingId === activeId;
  const viewingSession = viewingActive ? null : sessions.find((s) => s.id === viewingId) ?? null;
  const userName = displayNameForProvider(providerConfig);
  const greeting = greetingForNow();

  return (
    <div className="relative flex min-h-[100dvh] w-full text-white">
      <AuroraBackground />

      <div className="relative z-10 flex w-full">
        <Sidebar
          sessions={sessions}
          activeId={activeId}
          viewingId={viewingId}
          open={sidebarOpen}
          onSelect={selectSession}
          onNew={newChat}
          onDelete={deleteSession}
          onToggle={() => setSidebarOpen(false)}
        />

        {/* Mobile-only scrim: tap anywhere off the drawer to close it. */}
        {sidebarOpen && (
          <button
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          />
        )}

        <main className="relative flex min-h-[100dvh] min-w-0 flex-1 flex-col">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed left-3 top-3 z-50 rounded-xl border border-white/10 bg-black/45 p-2 text-white/70 shadow-[0_10px_30px_-16px_rgba(0,0,0,0.9)] backdrop-blur-xl transition hover:border-white/20 hover:bg-black/55 hover:text-white"
              title="Show sidebar"
              aria-label="Show sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}

          {viewingActive ? (
            <LiveChat
              key={activeId}
              sessionId={activeId}
              providerConfig={providerConfig}
              providerReady={providerReady}
              greeting={greeting}
              userName={userName}
              autoSend={pendingPrompt}
              onPersist={onPersist}
              onRequestProvider={requestProvider}
              onConfigure={() => setModalOpen(true)}
              onAutoSendConsumed={onAutoSendConsumed}
            />
          ) : viewingSession ? (
            <StaticChat session={viewingSession} onContinue={newChat} />
          ) : null}
        </main>
      </div>

      <ProviderModal
        open={modalOpen}
        initial={providerConfig}
        pendingPrompt={pendingPrompt ?? undefined}
        onCancel={() => {
          setModalOpen(false);
          setPendingPrompt(null);
        }}
        onConnected={onConnected}
      />
    </div>
  );
}
