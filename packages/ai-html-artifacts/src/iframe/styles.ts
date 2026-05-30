"use client";

import * as React from "react";

const STYLE_ID = "aha-artifact-styles";

/**
 * Self-contained, premium chrome styles for the artifact card. Injected once
 * into <head> so components can use hover/focus/dark states without depending
 * on the host app's CSS. Uses the CSS `light-dark()` function (the card sets
 * `color-scheme: light dark`) so it adapts to the OS theme automatically.
 */
export const ARTIFACT_CSS = `
.aha-scope{
  color-scheme: light dark;
  --aha-bg: light-dark(#fbfbfc, #0c0c0f);
  --aha-elev: light-dark(#ffffff, #161619);
  --aha-fg: light-dark(#15161a, #f4f4f6);
  --aha-muted: light-dark(#6b7280, #9aa0ab);
  --aha-faint: light-dark(#9ca3af, #6b7280);
  --aha-hairline: light-dark(rgba(0,0,0,.07), rgba(255,255,255,.08));
  --aha-ring: light-dark(oklch(0 0 0 / .08), oklch(1 0 0 / .11));
  --aha-hover: light-dark(rgba(0,0,0,.05), rgba(255,255,255,.07));
  --aha-accent: light-dark(#3b3bff, #8aa0ff);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* The premium ring + border + layered shadow treatment (no flat white box). */
.aha-card{
  position: relative;
  border-radius: var(--aha-radius, 22px);
  background: var(--aha-bg);
  color: var(--aha-fg);
  overflow: hidden;
  box-shadow:
    0 0 0 1px var(--aha-ring),
    light-dark(oklch(0 0 0 / .04), oklch(0 0 0 / .20)) 0px 2px 2px -1px,
    light-dark(oklch(0 0 0 / .035), oklch(0 0 0 / .22)) 0px 10px 20px -6px,
    light-dark(oklch(0 0 0 / .05), oklch(0 0 0 / .35)) 0px 30px 60px -18px;
  transition: box-shadow .25s ease, transform .25s ease;
}
.aha-card[data-variant="glass"]{
  background: light-dark(rgba(255,255,255,.72), rgba(22,22,26,.66));
  backdrop-filter: blur(20px) saturate(140%);
}

.aha-toolbar{
  display:flex; align-items:center; gap:10px;
  flex-wrap: wrap; row-gap: 8px;
  padding: 9px 10px 9px 14px;
  background: light-dark(rgba(252,252,253,.82), rgba(20,20,24,.7));
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--aha-hairline);
  position: relative; z-index: 2;
}
/* Fullscreen toolbar must never overflow on small screens: drop the device
   labels and tighten spacing so the controls wrap instead of clipping. */
@media (max-width: 560px){
  .aha-toolbar{ gap:6px; padding:8px 8px 8px 12px; }
  .aha-seg-label{ display:none; }
  .aha-seg button{ padding:6px 9px; }
}
.aha-dots{ display:inline-flex; gap:6px; margin-right:4px; }
.aha-dot{ width:11px; height:11px; border-radius:50%; }
.aha-title{
  font-size:13px; font-weight:600; letter-spacing:-0.01em;
  color: var(--aha-fg);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  min-width:0; flex: 0 1 auto;
}
.aha-stream-dot{
  width:7px;height:7px;border-radius:50%;flex:none;
  background:#22c55e; box-shadow:0 0 0 0 rgba(34,197,94,.55);
  animation: aha-pulse 1.5s infinite;
}

.aha-seg{
  display:inline-flex; padding:3px; gap:2px; border-radius:11px;
  background: light-dark(rgba(0,0,0,.05), rgba(255,255,255,.06));
  box-shadow: inset 0 0 0 1px var(--aha-ring);
}
.aha-seg button{
  appearance:none; border:none; cursor:pointer;
  font-size:12px; font-weight:600; letter-spacing:-0.01em;
  padding:5px 13px; border-radius:8px; color: var(--aha-muted);
  background:transparent; transition: all .15s ease;
}
.aha-seg button[data-active="true"]{
  color: var(--aha-fg);
  background: var(--aha-elev);
  box-shadow: 0 1px 2px light-dark(rgba(0,0,0,.10), rgba(0,0,0,.4)), 0 0 0 .5px var(--aha-ring);
}

.aha-iconbtn{
  display:inline-flex; align-items:center; justify-content:center;
  width:32px; height:32px; border-radius:999px; flex:none;
  border:none; cursor:pointer; padding:0;
  color: var(--aha-muted); background:transparent;
  transition: background .15s ease, color .15s ease, transform .1s ease;
}
.aha-iconbtn:hover{ background: var(--aha-hover); color: var(--aha-fg); }
.aha-iconbtn:active{ transform: scale(.94); }

/* Seamless ("camouflage") presentation: chromeless, transparent, inline. The
   action row stays invisible until hover so the surface reads as native UI. */
.aha-seamless{ position:relative; }
.aha-seamless-actions{
  position:absolute; top:8px; right:8px; z-index:4;
  display:flex; gap:4px; padding:3px; border-radius:999px;
  background: color-mix(in srgb, var(--aha-bg) 70%, transparent);
  border:1px solid var(--aha-border);
  backdrop-filter: blur(8px);
  opacity:0; transform: translateY(-2px);
  transition: opacity .18s ease, transform .18s ease;
}
.aha-seamless:hover .aha-seamless-actions,
.aha-seamless:focus-within .aha-seamless-actions{ opacity:1; transform: translateY(0); }

/* Streaming progress shimmer along the top edge of the preview. */
.aha-progress{
  position:absolute; top:0; left:0; right:0; height:2px; z-index:3;
  background: linear-gradient(90deg, transparent, var(--aha-accent), transparent);
  background-size: 40% 100%;
  animation: aha-progress 1.1s linear infinite;
}

.aha-frame{ display:block; width:100%; border:none; background:transparent; }
.aha-frame[data-fade="in"]{ animation: aha-fade .45s ease both; }

.aha-skel{
  display:grid; gap:14px; padding:26px;
  background: light-dark(linear-gradient(180deg,#fcfcfd,#f4f5f7), linear-gradient(180deg,#121215,#0d0d10));
}
.aha-skel .row{
  height:16px; border-radius:8px;
  background: light-dark(
    linear-gradient(90deg, rgba(0,0,0,.05) 25%, rgba(0,0,0,.10) 37%, rgba(0,0,0,.05) 63%),
    linear-gradient(90deg, rgba(255,255,255,.05) 25%, rgba(255,255,255,.10) 37%, rgba(255,255,255,.05) 63%));
  background-size: 400% 100%;
  animation: aha-shimmer 1.4s ease infinite;
  opacity:0; animation-fill-mode: both;
}
/* Stagger the skeleton in so it reads as a layout being built up. */
.aha-skel .row:nth-child(1){ width:42%; animation-delay:0s,.0s; }
.aha-skel .row:nth-child(2){ width:88%; }
.aha-skel .row:nth-child(3){ width:74%; }
.aha-skel .row:nth-child(4){ height:130px; }
.aha-skel .row:nth-child(5){ width:60%; }
.aha-skel .row:nth-child(6){ width:80%; }
.aha-skel .row{ animation: aha-shimmer 1.4s ease infinite, aha-rise .5s ease both; }
.aha-skel .row:nth-child(2){ animation-delay: 0s, .07s; }
.aha-skel .row:nth-child(3){ animation-delay: 0s, .14s; }
.aha-skel .row:nth-child(4){ animation-delay: 0s, .21s; }
.aha-skel .row:nth-child(5){ animation-delay: 0s, .28s; }
.aha-skel .row:nth-child(6){ animation-delay: 0s, .35s; }

.aha-overlay{
  display:flex; align-items:center; justify-content:center; text-align:center;
  padding:24px; color: var(--aha-muted); font-size:13px;
  background: light-dark(rgba(255,255,255,.82), rgba(12,12,15,.82));
  backdrop-filter: blur(3px);
}

@keyframes aha-pulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.5)}70%{box-shadow:0 0 0 6px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
@keyframes aha-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
@keyframes aha-progress{0%{background-position:120% 0}100%{background-position:-20% 0}}
@keyframes aha-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes aha-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){
  .aha-frame[data-fade="in"], .aha-skel .row, .aha-progress, .aha-stream-dot{ animation: none !important; }
  .aha-skel .row{ opacity:1; }
}
`;

let injected = false;

/** Inject the artifact stylesheet once per document. */
export function useArtifactStyles(): void {
  React.useEffect(() => {
    if (injected || typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) {
      injected = true;
      return;
    }
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = ARTIFACT_CSS;
    document.head.appendChild(el);
    injected = true;
  }, []);
}
