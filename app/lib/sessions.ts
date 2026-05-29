import type { ChatMessage, HtmlArtifact } from "netra/client";

export type { ChatMessage, HtmlArtifact };

export interface ProviderConfig {
  provider: string;
  apiKey: string;
  modelId: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  artifacts: Record<string, HtmlArtifact>;
  createdAt: number;
  updatedAt: number;
}

const SESSIONS_KEY = "netra.sessions.v1";
const PROVIDER_KEY = "netra.provider.v1";

export function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const raw = (firstUser?.content ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return "Untitled chat";
  return raw.length > 48 ? `${raw.slice(0, 48)}…` : raw;
}

export function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    /* quota / serialization — non-fatal for a demo */
  }
}

export function loadProvider(): ProviderConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROVIDER_KEY);
    return raw ? (JSON.parse(raw) as ProviderConfig) : null;
  } catch {
    return null;
  }
}

export function saveProvider(config: ProviderConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROVIDER_KEY, JSON.stringify(config));
  } catch {
    /* non-fatal */
  }
}

export const PROVIDERS: { id: string; name: string; defaultModel: string; hint: string }[] = [
  { id: "google", name: "Google Gemini", defaultModel: "gemini-2.5-flash", hint: "AI…studio key" },
  { id: "anthropic", name: "Anthropic Claude", defaultModel: "claude-sonnet-4-6", hint: "sk-ant-…" },
  { id: "openai", name: "OpenAI", defaultModel: "gpt-4o", hint: "sk-…" },
  { id: "deepseek", name: "DeepSeek", defaultModel: "deepseek-chat", hint: "sk-…" },
  { id: "openrouter", name: "OpenRouter", defaultModel: "google/gemini-2.5-flash", hint: "sk-or-…" },
];
