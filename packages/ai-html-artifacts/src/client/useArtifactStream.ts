"use client";

import * as React from "react";
import { readArtifactStream } from "../stream/sse.js";
import { createMessageId } from "../core/createIds.js";
import type { HtmlArtifact } from "../types/artifact.js";
import type {
  ArtifactStreamStatus,
  ChatMessage,
  UseArtifactStreamOptions,
  UseArtifactStreamReturn,
} from "../types/client.js";
import type { ArtifactMode } from "../types/stream.js";

/**
 * Drives a chat against an `netra` SSE endpoint. Reduces the event
 * protocol into `messages` + `artifacts`, exposing `sendMessage`, `stop`, and
 * `reset`. Markdown answers update a message; HTML answers also build an
 * artifact record consumed by `HtmlArtifactCard`.
 */
export function useArtifactStream(
  options: UseArtifactStreamOptions,
): UseArtifactStreamReturn {
  const { endpoint, body, headers, initialMessages, onError } = options;

  const [messages, setMessages] = React.useState<ChatMessage[]>(
    initialMessages ?? [],
  );
  const [artifacts, setArtifacts] = React.useState<Record<string, HtmlArtifact>>(
    {},
  );
  const [status, setStatus] = React.useState<ArtifactStreamStatus>("idle");
  const [mode, setMode] = React.useState<ArtifactMode | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  const abortRef = React.useRef<AbortController | null>(null);
  const messagesRef = React.useRef<ChatMessage[]>(messages);

  React.useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const patchArtifact = React.useCallback(
    (id: string, patch: Partial<HtmlArtifact>) => {
      setArtifacts((prev) => {
        const now = Date.now();
        const existing =
          prev[id] ??
          ({
            id,
            title: "Untitled artifact",
            type: "html",
            html: "",
            snapshot: "",
            status: "streaming",
            createdAt: now,
            updatedAt: now,
          } satisfies HtmlArtifact);
        return { ...prev, [id]: { ...existing, ...patch, updatedAt: now } };
      });
    },
    [],
  );

  const patchMessage = React.useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      );
    },
    [],
  );

  const stop = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const reset = React.useCallback(() => {
    stop();
    setMessages([]);
    setArtifacts({});
    setStatus("idle");
    setMode(null);
    setError(null);
  }, [stop]);

  const sendMessage = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || status === "streaming" || status === "submitted") return;

      setError(null);
      setMode(null);

      const userMessage: ChatMessage = {
        id: createMessageId(),
        role: "user",
        content: trimmed,
      };
      const history = [...messagesRef.current, userMessage];
      setMessages(history);
      setStatus("submitted");

      const controller = new AbortController();
      abortRef.current = controller;

      let assistantId: string | null = null;
      let currentMode: ArtifactMode | null = null;

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({
            ...body,
            messages: history.map(({ role, content }) => ({ role, content })),
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        setStatus("streaming");

        for await (const ev of readArtifactStream(response, controller.signal)) {
          switch (ev.type) {
            case "mode": {
              currentMode = ev.mode;
              setMode(ev.mode);
              break;
            }
            case "message_start": {
              assistantId = ev.messageId;
              setMessages((prev) => [
                ...prev,
                {
                  id: ev.messageId,
                  role: "assistant",
                  content: "",
                  mode: currentMode ?? undefined,
                },
              ]);
              break;
            }
            case "message_delta": {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === ev.messageId
                    ? { ...m, content: m.content + ev.delta }
                    : m,
                ),
              );
              break;
            }
            case "message_done": {
              patchMessage(ev.messageId, { content: ev.content });
              break;
            }
            case "artifact_start": {
              patchArtifact(ev.artifactId, {
                title: ev.title,
                status: "streaming",
              });
              if (assistantId) {
                patchMessage(assistantId, { artifactId: ev.artifactId });
              }
              break;
            }
            case "artifact_delta": {
              setArtifacts((prev) => {
                const existing = prev[ev.artifactId];
                if (!existing) return prev;
                return {
                  ...prev,
                  [ev.artifactId]: {
                    ...existing,
                    html: existing.html + ev.delta,
                    updatedAt: Date.now(),
                  },
                };
              });
              break;
            }
            case "artifact_snapshot": {
              patchArtifact(ev.artifactId, { snapshot: ev.html });
              break;
            }
            case "artifact_done": {
              patchArtifact(ev.artifactId, {
                html: ev.html,
                snapshot: ev.html,
                status: "complete",
              });
              break;
            }
            case "error": {
              const err = new Error(ev.message);
              setError(err);
              onError?.(err);
              if (!ev.recoverable) setStatus("error");
              break;
            }
            case "done": {
              break;
            }
          }
        }

        setStatus((s) => (s === "error" ? s : "done"));
      } catch (err) {
        if (controller.signal.aborted) {
          setStatus("idle");
          return;
        }
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        onError?.(e);
        setStatus("error");
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [endpoint, headers, body, status, patchArtifact, patchMessage, onError],
  );

  return {
    messages,
    artifacts,
    status,
    mode,
    error,
    sendMessage,
    reset,
    stop,
  };
}
