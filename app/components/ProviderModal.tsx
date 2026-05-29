"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { NetraLogo } from "./NetraLogo";
import { PROVIDERS, type ProviderConfig } from "../lib/sessions";

interface ProviderModalProps {
  open: boolean;
  initial?: ProviderConfig | null;
  /** The prompt the user is waiting to send, shown for context. */
  pendingPrompt?: string;
  onCancel: () => void;
  onConnected: (config: ProviderConfig) => void;
}

export function ProviderModal({ open, initial, pendingPrompt, onCancel, onConnected }: ProviderModalProps) {
  const [provider, setProvider] = useState(initial?.provider ?? "google");
  const [modelId, setModelId] = useState(initial?.modelId ?? PROVIDERS[0].defaultModel);
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? "");
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");

  const cardRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // Clear any stale error from a previous open, then play the entrance.
    /* eslint-disable react-hooks/set-state-in-effect */
    setError("");
    setProvider(initial?.provider ?? "google");
    setModelId(initial?.modelId ?? PROVIDERS[0].defaultModel);
    setApiKey(initial?.apiKey ?? "");
    setDisplayName(initial?.displayName ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
    const ctx = gsap.context(() => {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" });
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 24, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.5)" },
      );
      gsap.fromTo(
        ".lov-modal-field",
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, delay: 0.12, ease: "power2.out" },
      );
    });
    return () => ctx.revert();
  }, [open, initial]);

  if (!open) return null;

  const activeProvider = PROVIDERS.find((p) => p.id === provider);

  const onSelectProvider = (id: string) => {
    setProvider(id);
    const match = PROVIDERS.find((p) => p.id === id);
    if (match) setModelId(match.defaultModel);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || testing) return;
    setTesting(true);
    setError("");
    const config: ProviderConfig = {
      provider,
      apiKey: apiKey.trim(),
      modelId: modelId.trim(),
      displayName: displayName.trim() || undefined,
    };
    try {
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        onConnected(config);
      } else {
        setError(data.error ? `Key rejected: ${String(data.error).slice(0, 120)}` : "API key not valid or blocked.");
      }
    } catch {
      setError("Could not reach the provider. Check your network and try again.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden p-4"
      style={{ background: "rgba(4,4,8,0.6)", backdropFilter: "blur(6px)" }}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current && !testing) onCancel();
      }}
    >
      <div
        ref={cardRef}
        className="lov-depth my-auto w-full max-w-md p-6 text-white sm:p-7"
        style={{ ["--lov-radius" as string]: "28px" }}
      >
        <div className="lov-modal-field mb-5">
          <div className="flex items-center gap-2.5">
            <NetraLogo size={36} />
            <div className="leading-tight">
              <h2 className="text-[17px] font-semibold tracking-tight">Connect your model</h2>
              <p className="text-[12.5px] text-white/55">Bring your own key — it stays in this browser.</p>
            </div>
          </div>
        </div>

        {pendingPrompt && (
          <div className="lov-modal-field mb-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] text-white/70">
            <span className="text-white/40">Will build: </span>
            <span className="text-white/90">{pendingPrompt}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="lov-modal-field">
            <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-white/45">
              Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectProvider(p.id)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-[13px] font-medium transition-all ${
                    provider === p.id
                      ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-white shadow-[0_0_20px_-6px_rgba(236,72,153,0.6)]"
                      : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white/90"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="lov-modal-field">
            <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-white/45">
              Model ID
            </label>
            <input
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder={activeProvider?.defaultModel}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-[14px] text-white outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-500/20"
            />
          </div>

          <div className="lov-modal-field">
            <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-white/45">
              Your name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What should Netra call you?"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-[14px] text-white outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-500/20"
            />
          </div>

          <div className="lov-modal-field">
            <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-white/45">
              API key
            </label>
            <input
              type="password"
              autoFocus
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={activeProvider?.hint ?? "your key"}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-[14px] text-white outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-500/20"
            />
          </div>

          {error && (
            <div className="lov-modal-field rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-[13px] font-medium text-rose-200">
              {error}
            </div>
          )}

          <div className="lov-modal-field flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={testing}
              className="rounded-xl border border-white/10 px-4 py-3 text-[14px] font-medium text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={testing || !apiKey.trim()}
              className="group relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-orange-400 px-4 py-3 text-[14px] font-semibold text-white shadow-[0_8px_30px_-8px_rgba(236,72,153,0.7)] transition-all hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
            >
              {testing ? (
                <>
                  <span className="h-4 w-4 animate-[lov-spin_0.7s_linear_infinite] rounded-full border-2 border-white/30 border-t-white" />
                  Testing key…
                </>
              ) : (
                "Connect & build"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
