"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AuroraBackground } from "./AuroraBackground";
import { NetraLogo } from "./NetraLogo";
import { Interfaces, Misc, Files, Objects, type DoodleIcon } from "doodle-icons";

const SERVER_CODE = `// app/api/chat/route.ts
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, streamText } from "ai";
import { createArtifactStreamResponse } from "netra/server";

export const dynamic = "force-dynamic";
const google = createGoogleGenerativeAI();

export async function POST(req: Request) {
  const { messages } = await req.json();
  const model = google("gemini-2.5-flash");

  // Streams markdown OR a sandboxed HTML artifact — automatically.
  return createArtifactStreamResponse({
    messages,
    generateTextStream: (args) =>
      streamText({ model, ...args }).textStream,
    generateText: async (args) =>
      (await generateText({ model, ...args })).text,
    mode: "auto",
  });
}`;

const CLIENT_CODE = `// components/Chat.tsx
"use client";
import { useArtifactStream, ArtifactMessage } from "netra/client";

export function Chat() {
  const { messages, artifacts, sendMessage } = useArtifactStream({
    endpoint: "/api/chat",
  });

  return (
    <>
      {messages.map((m) => (
        <ArtifactMessage key={m.id} message={m} artifacts={artifacts} />
      ))}
      <button onClick={() => sendMessage("A pricing page for a SaaS")}>
        Generate UI
      </button>
    </>
  );
}`;

const EVENTS = [
  "mode",
  "message_start",
  "message_delta",
  "artifact_start",
  "artifact_delta",
  "artifact_snapshot",
  "artifact_done",
  "done",
];

const WHY: { Icon: DoodleIcon; title: string; body: string }[] = [
  {
    Icon: Interfaces.Globe,
    title: "The browser is already HTML",
    body: "Every device ships a world-class HTML/CSS engine. Netra streams straight into it — no bespoke component runtime, no React-over-the-wire, no translation layer between the model and the pixels.",
  },
  {
    Icon: Interfaces.Shield,
    title: "Rendered directly in a safe sandbox",
    body: "Artifacts mount in a sandboxed iframe with scripts forbidden (allow-scripts is stripped, always). Model HTML is sanitized and isolated — it can never touch your app's DOM, cookies, or state.",
  },
  {
    Icon: Interfaces.Zap,
    title: "Safe render-viewing = a lighter client",
    body: "Each frame is balanced once by the predictive parser and patched into the live iframe in place — no re-mounting React trees per token, no virtual-DOM diffing of streamed markup. Far less main-thread work.",
  },
  {
    Icon: Interfaces.Stopwatch,
    title: "Your frontend never hangs",
    body: "Parsing is incremental (O(n)), paints are throttled to animation frames, and the iframe is never reloaded mid-stream. The UI builds up smoothly while the main thread stays free to scroll, type, and click.",
  },
];

const FEATURES: { Icon: DoodleIcon; title: string; body: string }[] = [
  {
    Icon: Interfaces.MagicWand,
    title: "Predictive HTML parser",
    body: "Incomplete model output is projected into a valid document by predicting closing tags — the raw stream stays the source of truth.",
  },
  {
    Icon: Files.FileCode,
    title: "Markdown or HTML, automatically",
    body: "An auto classifier streams plain markdown when text suffices, or a rich HTML artifact when the answer deserves a visual.",
  },
  {
    Icon: Interfaces.Shield2,
    title: "Sandboxed, no-JS artifacts",
    body: "Every artifact renders in a sandboxed iframe with scripts forbidden. Charts are CSS/SVG, accordions are <details>, forms are native.",
  },
  {
    Icon: Interfaces.Sync,
    title: "O(n) incremental streaming",
    body: "One persistent parser feeds only new tokens; frame-throttled, in-place iframe patches mean the UI builds smoothly with no reload flash.",
  },
  {
    Icon: Files.FilePdf,
    title: "Copy, download & PDF",
    body: "Each artifact card ships copy-HTML, download-HTML and native print-to-PDF — no extra dependencies.",
  },
  {
    Icon: Interfaces.Key,
    title: "Bring your own key",
    body: "Google, Anthropic, OpenAI, DeepSeek and OpenRouter all work through the same SSE protocol and provider headers.",
  },
];

/** Scattered decorative doodles for the whole page — [Icon, top%, left%, size, rotate]. */
const DECOR: { Icon: DoodleIcon; top: string; left: string; size: number; rotate: number }[] = [
  { Icon: Misc.Rocket, top: "8%", left: "84%", size: 64, rotate: 14 },
  { Icon: Interfaces.Bulb, top: "20%", left: "6%", size: 52, rotate: -10 },
  { Icon: Interfaces.Star, top: "44%", left: "92%", size: 40, rotate: 8 },
  { Icon: Objects.PaintBrush, top: "38%", left: "3%", size: 56, rotate: 18 },
  { Icon: Misc.Chip, top: "60%", left: "88%", size: 58, rotate: -12 },
  { Icon: Interfaces.Heart, top: "70%", left: "9%", size: 44, rotate: 10 },
  { Icon: Files.FileCode, top: "82%", left: "85%", size: 54, rotate: -8 },
  { Icon: Interfaces.MagicWand, top: "90%", left: "12%", size: 50, rotate: 16 },
  { Icon: Interfaces.Globe, top: "30%", left: "50%", size: 46, rotate: -6 },
  { Icon: Interfaces.Send, top: "54%", left: "46%", size: 42, rotate: 12 },
];

export function Landing() {
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-el",
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.09, ease: "power3.out" },
      );
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 34 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 86%" },
          },
        );
      });
      // The skeleton bars in the hero mock "stream" forever.
      gsap.to(".mock-bar", {
        scaleX: 1,
        transformOrigin: "left",
        duration: 0.9,
        stagger: { each: 0.25, repeat: -1, yoyo: true },
        ease: "power1.inOut",
      });
      // Floating, drifting doodle decorations.
      gsap.utils.toArray<HTMLElement>(".doodle-float").forEach((el, i) => {
        gsap.to(el, {
          y: gsap.utils.random(-26, 26),
          x: gsap.utils.random(-16, 16),
          rotation: `+=${gsap.utils.random(-16, 16)}`,
          duration: gsap.utils.random(6, 11),
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: i * 0.25,
        });
      });
      // Doodles also fade + parallax-drift as you scroll.
      gsap.utils.toArray<HTMLElement>(".doodle-float").forEach((el) => {
        gsap.fromTo(
          el,
          { yPercent: -10 },
          {
            yPercent: 14,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 1 },
          },
        );
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="relative min-h-[100dvh] w-full overflow-x-hidden text-white">
      <AuroraBackground />

      {/* Scattered doodle decorations across the whole page */}
      <div className="pointer-events-none absolute inset-0 z-[2] hidden md:block" aria-hidden>
        {DECOR.map((d, i) => (
          <span
            key={i}
            className="doodle-float absolute"
            style={{ top: d.top, left: d.left, transform: `rotate(${d.rotate}deg)`, opacity: 0.12 }}
          >
            <d.Icon width={d.size} height={d.size} fill="#ffffff" />
          </span>
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
        {/* Nav */}
        <header className="flex items-center justify-between py-5">
          <div className="flex items-center gap-2.5">
            <NetraLogo size={34} />
            <span className="text-[16px] font-semibold tracking-tight">Netra</span>
          </div>
          <nav className="flex items-center gap-1 text-[14px]">
            <a href="#why" className="rounded-full px-3.5 py-2 text-white/65 transition hover:text-white">
              Why HTML
            </a>
            <a href="#usage" className="rounded-full px-3.5 py-2 text-white/65 transition hover:text-white">
              Usage
            </a>
            <a href="#protocol" className="rounded-full px-3.5 py-2 text-white/65 transition hover:text-white">
              Protocol
            </a>
            <Link
              href="/demo"
              className="ml-1 rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-orange-400 px-4 py-2 font-semibold text-white shadow-[0_8px_30px_-8px_rgba(236,72,153,0.7)] transition hover:scale-[1.03]"
            >
              Open demo
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <div className="hero-el mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-1.5 text-[12.5px] font-medium text-white/75 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-fuchsia-400 to-orange-400" />
              Experimental · v0.1 alpha · Vercel AI SDK adapter
            </div>
            <h1 className="hero-el bg-gradient-to-b from-white to-white/55 bg-clip-text text-[44px] font-semibold leading-[1.05] tracking-tight text-transparent sm:text-[58px]">
              Stream AI-generated HTML into live, sandboxed previews.
            </h1>
            <p className="hero-el mt-6 max-w-xl text-[17px] leading-relaxed text-white/65">
              Netra is a predictive HTML parser and streaming toolkit for the Vercel
              AI SDK. It balances unfinished documents for instant iframe rendering
              while keeping the model stream as the source of truth — so generative
              UI builds up smoothly instead of popping in at the end.
            </p>
            <div className="hero-el mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/demo"
                className="rounded-2xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-orange-400 px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_36px_-10px_rgba(236,72,153,0.8)] transition hover:scale-[1.02]"
              >
                Try the live demo →
              </Link>
              <CopyPill text="npm install netra ai @ai-sdk/google" />
            </div>
          </div>

          {/* Hero mock: a streaming projection card */}
          <div className="hero-el lov-depth p-3" style={{ ["--lov-radius" as string]: "26px" }}>
            <div className="flex items-center gap-2 px-2 pb-3 pt-1">
              <span className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              </span>
              <span className="ml-2 font-mono text-[12px] text-white/45">netra · streaming</span>
              <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> live
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <div className="mb-4 h-3 w-28 rounded-full bg-gradient-to-r from-fuchsia-400 to-orange-400" />
              <div className="space-y-3">
                <div className="mock-bar h-9 origin-left scale-x-50 rounded-xl border border-white/10 bg-white/[0.06]" />
                <div className="mock-bar h-9 origin-left scale-x-50 rounded-xl border border-white/10 bg-white/[0.06]" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="mock-bar h-20 origin-left scale-x-50 rounded-xl border border-white/10 bg-white/[0.06]" />
                  <div className="mock-bar h-20 origin-left scale-x-50 rounded-xl border border-white/10 bg-white/[0.06]" />
                </div>
                <div className="mock-bar h-11 origin-left scale-x-50 rounded-xl bg-gradient-to-r from-indigo-500/70 to-fuchsia-500/70" />
              </div>
            </div>
          </div>
        </section>

        {/* Experimental callout */}
        <section className="reveal lov-depth mb-6 flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:gap-6" style={{ ["--lov-radius" as string]: "22px" }}>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-[12.5px] font-semibold text-amber-200">
            ⚠ Experimental
          </span>
          <p className="text-[14.5px] leading-relaxed text-white/70">
            Netra is in an early research phase. The packaged backend helper targets
            the <span className="font-medium text-white">Vercel AI SDK only</span> for
            now. A lower-level, provider-agnostic adapter
            (<code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[12.5px] text-white/85">streamHtmlArtifactFromTextStream</code>)
            exists for other runtimes, but APIs may still change between alpha releases.
          </p>
        </section>

        {/* Why HTML */}
        <section id="why" className="py-16">
          <div className="reveal max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-wider text-fuchsia-300/80">
              Why HTML
            </p>
            <h2 className="mt-2 text-[34px] font-semibold leading-tight tracking-tight sm:text-[40px]">
              Because the web is already HTML — so render it natively, safely.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-white/60">
              Markdown caps you at text and tables. Custom component runtimes ship a
              renderer and diff every token. HTML needs neither: stream it straight
              into a sandboxed iframe with safe-render techniques that keep the client
              light and the main thread free.
            </p>
          </div>

          <div className="reveal mt-9 grid gap-4 sm:grid-cols-2">
            {WHY.map((w) => (
              <div key={w.title} className="group lov-depth p-6" style={{ ["--lov-radius" as string]: "20px" }}>
                <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <w.Icon width={28} height={28} fill="#ffffff" />
                </div>
                <h3 className="text-[16px] font-semibold tracking-tight text-white">{w.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-white/60">{w.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Usage */}
        <section id="usage" className="py-16">
          <div className="reveal max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-wider text-fuchsia-300/80">
              Server + client
            </p>
            <h2 className="mt-2 text-[34px] font-semibold leading-tight tracking-tight sm:text-[40px]">
              Two short files. That&apos;s the whole integration.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-white/60">
              Wrap a Vercel AI SDK model on the server, render the stream on the
              client. The parser, sanitizer, SSE protocol and iframe runtime are all
              handled for you.
            </p>
          </div>

          <div className="reveal mt-9 grid gap-5 lg:grid-cols-2">
            <CodeCard title="route.ts — server" badge="netra/server" code={SERVER_CODE} />
            <CodeCard title="Chat.tsx — client" badge="netra/client" code={CLIENT_CODE} />
          </div>
        </section>

        {/* Protocol */}
        <section id="protocol" className="py-16">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="reveal">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-fuchsia-300/80">
                Streaming protocol
              </p>
              <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight sm:text-[38px]">
                Raw deltas for truth. Snapshots for pixels.
              </h2>
              <p className="mt-4 text-[15.5px] leading-relaxed text-white/60">
                <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[12.5px] text-white/85">artifact_delta</code>{" "}
                carries the exact model output.{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[12.5px] text-white/85">artifact_snapshot</code>{" "}
                is the parser-balanced, sanitized frame ready for the iframe.{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[12.5px] text-white/85">artifact_done</code>{" "}
                is the final, authoritative document.
              </p>
            </div>
            <div className="reveal grid grid-cols-2 gap-2.5 sm:grid-cols-2">
              {EVENTS.map((e, i) => (
                <div
                  key={e}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 backdrop-blur"
                >
                  <div className="font-mono text-[11px] text-white/35">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="mt-1 font-mono text-[13.5px] font-medium text-white/85">{e}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16">
          <h2 className="reveal max-w-2xl text-[32px] font-semibold leading-tight tracking-tight sm:text-[38px]">
            Built for AI apps that need safe, beautiful visual output.
          </h2>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group reveal lov-depth p-6"
                style={{ ["--lov-radius" as string]: "20px" }}
              >
                <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <f.Icon width={28} height={28} fill="#ffffff" />
                </div>
                <h3 className="text-[16px] font-semibold tracking-tight text-white">{f.title}</h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-white/60">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA + footer */}
        <section className="reveal lov-depth relative my-10 flex flex-col items-center gap-5 overflow-hidden p-10 text-center" style={{ ["--lov-radius" as string]: "30px" }}>
          <span className="doodle-float pointer-events-none absolute left-6 top-6 opacity-25" aria-hidden>
            <Misc.Rocket width={48} height={48} fill="#ffffff" />
          </span>
          <span className="doodle-float pointer-events-none absolute bottom-6 right-7 opacity-25" aria-hidden>
            <Interfaces.MagicWand width={44} height={44} fill="#ffffff" />
          </span>
          <h2 className="max-w-xl text-[30px] font-semibold leading-tight tracking-tight sm:text-[36px]">
            See partial HTML become a live UI.
          </h2>
          <Link
            href="/demo"
            className="rounded-2xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-orange-400 px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_36px_-10px_rgba(236,72,153,0.8)] transition hover:scale-[1.03]"
          >
            Open the demo →
          </Link>
        </section>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-8 text-[13px] text-white/40 sm:flex-row">
          <span className="flex items-center gap-2.5">
            <NetraLogo size={22} glow={false} />
            Netra · experimental predictive HTML parser for AI
          </span>
          <span className="font-mono">v0.1.0-alpha · MIT</span>
        </footer>
      </div>
    </div>
  );
}

function CopyPill({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          },
          () => {},
        );
      }}
      className="group flex items-center gap-3 rounded-2xl border border-white/12 bg-black/30 px-4 py-3.5 font-mono text-[13.5px] text-white/75 backdrop-blur transition hover:border-white/25"
      title="Copy"
    >
      <span className="text-white/35">$</span>
      {text}
      <span className="text-white/40 transition group-hover:text-white/80">
        {copied ? "copied ✓" : "⧉"}
      </span>
    </button>
  );
}

function CodeCard({ title, badge, code }: { title: string; badge: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="lov-depth overflow-hidden" style={{ ["--lov-radius" as string]: "20px" }}>
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="ml-1.5 font-mono text-[12px] text-white/55">{title}</span>
        <span className="ml-auto rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 font-mono text-[11px] text-fuchsia-200/80">
          {badge}
        </span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(code).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              },
              () => {},
            );
          }}
          className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white/85"
          title="Copy code"
          aria-label="Copy code"
        >
          {copied ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2.5" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-5 text-[12.5px] leading-[1.7]">
        <code className="font-mono text-white/80">{code}</code>
      </pre>
    </div>
  );
}
