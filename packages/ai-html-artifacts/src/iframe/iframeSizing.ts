import { useCallback, useEffect, useRef, useState } from "react";

export interface AutoSizeOptions {
  enabled?: boolean;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * Auto-size an iframe to its full content height so the artifact never shows an
 * inner scrollbar — the page provides the single scroll. This requires reading
 * the framed document, which works when the sandbox includes `allow-same-origin`
 * (the default static path). Script-enabled previews are isolated without
 * same-origin, so measurement gracefully falls back to the configured minimum.
 *
 * Measurement is resilient: it re-measures on load, on every content reflow
 * (ResizeObserver), and after web fonts finish loading (which changes height).
 * If the document is cross-origin/opaque it falls back to `minHeight`.
 */
/**
 * Seed height used when `minHeight` is 0 (seamless/camouflage previews). Starting
 * the iframe at 0 makes its viewport 0-tall, so any content sized by viewport or
 * percentage height resolves to 0 → `scrollHeight` is 0 → the resize bridge never
 * reports a height and the artifact stays hidden (seen on freshly-mounted saved
 * generative-UI chats). A non-zero seed gives the first layout a real viewport;
 * the measurement then converges to the true content height (and may shrink below
 * the seed, since the clamp floor is `minHeight`).
 */
const MEASURE_SEED = 280;

export function useIframeAutoSize(options: AutoSizeOptions = {}) {
  const { enabled = true, minHeight = 420, maxHeight = 900 } = options;
  const ref = useRef<HTMLIFrameElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState<number>(
    minHeight > 0 ? minHeight : MEASURE_SEED,
  );

  const measure = useCallback(() => {
    if (!enabled) return;
    const iframe = ref.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      const body = doc?.body;
      const root = doc?.documentElement;
      if (!body || !root) return; // opaque origin — keep min height
      const measured = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        root.scrollHeight,
        Math.ceil(root.getBoundingClientRect().height),
      );
      if (!measured) return;
      const clamped = Math.min(Math.max(measured, minHeight), maxHeight);
      setHeight((prev) => (Math.abs(prev - clamped) > 1 ? clamped : prev));
    } catch {
      // Cross-origin / sandboxed without same-origin — leave at min height.
    }
  }, [enabled, minHeight, maxHeight]);

  const onLoad = useCallback(() => {
    const iframe = ref.current;
    measure();

    // Track reflow inside the frame (content streaming in, font swaps, etc.).
    try {
      const doc = iframe?.contentDocument;
      const root = doc?.documentElement;
      observerRef.current?.disconnect();
      if (root && typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => measure());
        ro.observe(root);
        if (doc?.body) ro.observe(doc.body);
        observerRef.current = ro;
      }
      // Re-measure once web fonts have loaded (height usually grows).
      const fonts = (doc as Document & { fonts?: FontFaceSet })?.fonts;
      fonts?.ready?.then(() => measure()).catch(() => {});
    } catch {
      /* opaque origin */
    }

    // A couple of delayed passes catch late layout (images, slow fonts).
    const t1 = setTimeout(measure, 60);
    const t2 = setTimeout(measure, 240);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [measure]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const onMessage = (event: MessageEvent) => {
      const iframe = ref.current;
      if (!iframe || event.source !== iframe.contentWindow) return;
      const data = event.data as { type?: unknown; height?: unknown } | null;
      if (!data || data.type !== "netra-artifact:resize") return;
      const measured = Number(data.height);
      if (!Number.isFinite(measured) || measured <= 0) return;
      const clamped = Math.min(Math.max(Math.ceil(measured), minHeight), maxHeight);
      setHeight((prev) => (Math.abs(prev - clamped) > 1 ? clamped : prev));
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [enabled, minHeight, maxHeight]);

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  return { ref, height, onLoad, measure } as const;
}
