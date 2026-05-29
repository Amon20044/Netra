"use client";

import * as React from "react";
import { useArtifactStyles } from "./styles.js";
import { StreamingHtmlProjector } from "../stream/assembleDocument.js";
import { DEFAULT_PREVIEW_OPTIONS } from "../constants/defaults.js";
import { mergeConfig } from "../utils/mergeConfig.js";
import type { HtmlArtifactPreviewOptions } from "../types/client.js";
import { buildSrcDoc, resolveSandbox } from "./iframeSrcDoc.js";
import { useIframeAutoSize } from "./iframeSizing.js";
import type { ArtifactTheme } from "../types/artifact.js";

export interface HtmlArtifactPreviewProps {
  html: string;
  streaming?: boolean;
  errored?: boolean;
  title?: string;
  options?: HtmlArtifactPreviewOptions;
  /** Host theme injected into the iframe so the artifact matches the site. */
  theme?: ArtifactTheme;
  /** Chromeless: transparent wrapper, no surface/skeleton box — for seamless mode. */
  bare?: boolean;
}

export function HtmlArtifactPreview(props: HtmlArtifactPreviewProps) {
  useArtifactStyles();
  const { html, streaming = false, errored = false, title, options, theme, bare = false } = props;

  const opts = React.useMemo(
    () => mergeConfig(DEFAULT_PREVIEW_OPTIONS, options),
    [options]
  );

  const { ref: iframeRef, height, onLoad, measure } = useIframeAutoSize({
    enabled: opts.autoResize,
    minHeight: opts.minHeight,
    maxHeight: opts.maxHeight,
  });

  const [srcDoc, setSrcDoc] = React.useState<string>("");

  // Tracks the last document we rendered and whether the iframe has loaded once.
  // Lets us update the *live* document in place while streaming instead of
  // reassigning `srcDoc` (which fully reloads the frame and flashes blank).
  const lastDocRef = React.useRef<string>("");
  const loadedRef = React.useRef(false);

  // One persistent parser for the whole stream: each frame feeds only the new
  // tail (O(n) total) instead of re-parsing the full accumulated HTML (O(n²)).
  const projectorRef = React.useRef<StreamingHtmlProjector | null>(null);

  // Latest inputs, read by the throttled flush without re-subscribing it.
  const stateRef = React.useRef({ html, streaming, opts });
  React.useLayoutEffect(() => {
    stateRef.current = { html, streaming, opts };
  }, [html, streaming, opts]);

  // Throttle bookkeeping: coalesce bursts of tokens into frame-aligned paints.
  const schedRef = React.useRef<{
    raf: number | null;
    timer: ReturnType<typeof setTimeout> | null;
    last: number;
  }>({ raf: null, timer: null, last: 0 });

  const handleLoad = React.useCallback(() => {
    loadedRef.current = true;
    onLoad();
  }, [onLoad]);

  // Commit a built document to the frame: patch the live DOM in place once the
  // frame has loaded (no reload, no flash), else seed it via `srcDoc`.
  const paint = React.useCallback(
    (doc: string) => {
      if (doc === lastDocRef.current) return;
      lastDocRef.current = doc;
      const iframe = iframeRef.current;
      if (loadedRef.current && iframe?.contentDocument) {
        try {
          patchIframeDocument(iframe.contentDocument, doc);
          measure();
          return;
        } catch {
          // Fall back to a full reload if in-place patching isn't possible.
        }
      }
      setSrcDoc(doc);
    },
    [iframeRef, measure],
  );

  // Build + paint from the newest inputs. Cheap parse work runs every call so
  // the projector stays in sync; the expensive sanitize+DOM write is gated by
  // the scheduler. Skipped frames are safe — the projector catches up the tail.
  const flush = React.useCallback(() => {
    schedRef.current.last = now();
    const { html, streaming, opts } = stateRef.current;
    if (!html) return;

    let finalHtml = html;
    if (streaming) {
      const projector =
        projectorRef.current ?? (projectorRef.current = new StreamingHtmlProjector());
      const assembled = projector.update(html);
      if (!assembled.renderable) return;
      finalHtml = assembled.html;
    }

    const doc = buildSrcDoc(finalHtml, {
      sanitize: opts.sanitize,
      seamless: true,
      camouflage: bare,
      theme,
      sanitizeOptions: opts,
    });
    paint(doc);
  }, [paint, theme, bare]);

  // Schedule a flush, throttled to at most once per `debounceMs` and aligned to
  // an animation frame so rapid SSE deltas don't trigger a render storm.
  const schedule = React.useCallback(() => {
    const sched = schedRef.current;
    if (sched.raf != null || sched.timer != null) return; // already pending
    const interval = stateRef.current.opts.debounceMs ?? 0;
    const wait = Math.max(0, interval - (now() - sched.last));
    const fire = () => {
      sched.timer = null;
      if (typeof requestAnimationFrame !== "undefined") {
        sched.raf = requestAnimationFrame(() => {
          sched.raf = null;
          flush();
        });
      } else {
        flush();
      }
    };
    if (wait <= 0) fire();
    else sched.timer = setTimeout(fire, wait);
  }, [flush]);

  React.useEffect(() => {
    if (!html) {
      lastDocRef.current = "";
      loadedRef.current = false;
      projectorRef.current?.reset();
      cancelScheduled(schedRef.current);
      return;
    }
    if (!streaming) {
      // Authoritative final document: paint immediately, skip the throttle.
      cancelScheduled(schedRef.current);
      flush();
      return;
    }
    schedule();
  }, [html, streaming, opts, flush, schedule]);

  // Cancel any pending paint on unmount.
  React.useEffect(() => () => cancelScheduled(schedRef.current), []);

  const sandbox = React.useMemo(() => resolveSandbox(opts), [opts]);

  // In bare/seamless mode the host surface shows through: no background, no
  // skeleton box, no progress bar — just the transparent artifact inline.
  const showSkeleton = !html && !errored && !bare;
  const minHeight = bare ? 0 : opts.minHeight;
  const iframeSrcDoc = html ? srcDoc : "";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        background: bare ? "transparent" : "var(--aha-bg)",
        minHeight,
        maxHeight: opts.autoResize ? undefined : opts.maxHeight,
        overflow: opts.autoResize ? "hidden" : "auto",
        transition: "height 0.15s ease-out",
        height: opts.autoResize ? height : undefined,
      }}
    >
      {streaming && !bare && <div className="aha-progress" aria-hidden />}

      <iframe
        ref={iframeRef}
        srcDoc={iframeSrcDoc}
        title={title || "Artifact preview"}
        sandbox={sandbox}
        onLoad={handleLoad}
        style={{
          display: "block",
          width: "100%",
          height: opts.autoResize ? height : "100%",
          minHeight,
          border: "none",
          background: "transparent",
          pointerEvents: streaming && !iframeSrcDoc ? "none" : "auto",
          opacity: showSkeleton ? 0 : 1,
          transition: "opacity 0.2s ease",
        }}
      />

      {showSkeleton && (
        <div className="aha-skel" style={{ minHeight: opts.minHeight }}>
          <div className="row" />
          <div className="row" />
          <div className="row" />
          <div className="row" />
          <div className="row" />
          <div className="row" />
        </div>
      )}

      {errored && (
        <div
          className="aha-overlay"
          style={{
            position: html ? "absolute" : "relative",
            inset: html ? 0 : undefined,
            minHeight: html ? undefined : opts.minHeight,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: "var(--aha-fg)", marginBottom: 4 }}>
              Preview unavailable
            </div>
            {html ? "Showing the last valid snapshot." : "The artifact could not be rendered."}
          </div>
        </div>
      )}
    </div>
  );
}

/** Monotonic-ish clock; falls back to Date.now where performance is absent. */
function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** Cancel any pending rAF/timeout held in the scheduler record. */
function cancelScheduled(sched: {
  raf: number | null;
  timer: ReturnType<typeof setTimeout> | null;
}): void {
  if (sched.raf != null && typeof cancelAnimationFrame !== "undefined") {
    cancelAnimationFrame(sched.raf);
  }
  if (sched.timer != null) clearTimeout(sched.timer);
  sched.raf = null;
  sched.timer = null;
}

/**
 * Apply an already-built, sanitized full document into a live same-origin iframe
 * without reloading it. We replace the `<head>` styles and `<body>` contents in
 * place; the `<body>` node itself persists, so the auto-size ResizeObserver keeps
 * firing and the frame never flashes blank. Parsing happens in the parent via
 * `DOMParser`, which never executes scripts.
 */
function patchIframeDocument(target: Document, fullDoc: string): void {
  if (typeof DOMParser === "undefined" || !target.body) {
    throw new Error("in-place patch unavailable");
  }
  const parsed = new DOMParser().parseFromString(fullDoc, "text/html");
  if (!parsed.body) throw new Error("no body in parsed document");

  if (target.head && parsed.head && target.head.innerHTML !== parsed.head.innerHTML) {
    target.head.innerHTML = parsed.head.innerHTML;
  }
  // Mirror body attributes (class/style may change between frames).
  for (const attr of Array.from(parsed.body.attributes)) {
    if (target.body.getAttribute(attr.name) !== attr.value) {
      target.body.setAttribute(attr.name, attr.value);
    }
  }
  if (target.body.innerHTML !== parsed.body.innerHTML) {
    target.body.innerHTML = parsed.body.innerHTML;
  }
}
