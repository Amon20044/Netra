"use client";

import * as React from "react";
import { HtmlArtifactToolbar } from "./HtmlArtifactToolbar.js";
import { HtmlArtifactPreview } from "./HtmlArtifactPreview.js";
import { HtmlArtifactCodeView } from "./HtmlArtifactCodeView.js";
import { HtmlArtifactModal } from "./HtmlArtifactModal.js";
import { buildSrcDoc } from "./iframeSrcDoc.js";
import { useArtifactStyles } from "./styles.js";
import type {
  ArtifactTab,
  CardRadius,
  HtmlArtifactCardProps,
} from "../types/client.js";

const RADIUS: Record<CardRadius, number> = { md: 14, xl: 18, "2xl": 22, "3xl": 28 };

/**
 * The seamless artifact card: a refined header (window dots, segmented
 * preview/code tabs, pill copy/download/fullscreen actions), a sandboxed iframe
 * preview that streams in layer-by-layer, and a premium ring + layered-shadow
 * frame. No flat white box, no host-CSS dependency.
 */
export function HtmlArtifactCard(props: HtmlArtifactCardProps) {
  useArtifactStyles();
  const {
    artifact,
    variant = "elevated",
    radius = "2xl",
    showToolbar = true,
    defaultTab = "preview",
    allowFullscreen = true,
    allowCopy = true,
    allowDownload = true,
    allowPdf = true,
    presentation = "card",
    theme,
    previewOptions,
    className,
  } = props;
  const effectivePresentation = artifact.camouflage ? "seamless" : presentation;

  const [tab, setTab] = React.useState<ArtifactTab>(defaultTab);
  const [copied, setCopied] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);

  const streaming = artifact.status === "streaming";
  const errored = artifact.status === "error";
  // While streaming, feed the raw growing HTML to the preview's progressive
  // balancer (it repairs each partial frame into a valid, renderable document).
  // The accumulated raw stream beats the server's coarser snapshots here; we
  // fall back to a snapshot only if no raw deltas have arrived (buffered model).
  const previewHtml = streaming
    ? artifact.html || artifact.snapshot
    : artifact.html || artifact.snapshot;
  const sourceHtml = artifact.html || artifact.snapshot;

  const onCopy = React.useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(sourceHtml).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      },
      () => {},
    );
  }, [sourceHtml]);

  const onDownload = React.useCallback(() => {
    if (typeof document === "undefined") return;
    const blob = new Blob([sourceHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName =
      artifact.title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "artifact";
    a.href = url;
    a.download = `${safeName}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [sourceHtml, artifact.title]);

  // Export to PDF via the browser's native print pipeline ("Save as PDF").
  // Renders the sanitized artifact into a hidden, same-origin iframe and prints
  // just that frame — no extra dependencies, no scripts in the printed output.
  const onDownloadPdf = React.useCallback(() => {
    if (typeof document === "undefined" || !sourceHtml) return;
    const printable = buildSrcDoc(sourceHtml, {
      sanitize: true,
      seamless: false,
      sanitizeOptions: previewOptions,
    });
    const frame = document.createElement("iframe");
    Object.assign(frame.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "0",
      opacity: "0",
    } satisfies Partial<CSSStyleDeclaration>);
    frame.setAttribute("aria-hidden", "true");
    frame.title = `${artifact.title} (PDF)`;
    frame.srcdoc = printable;

    const remove = () => {
      if (document.body.contains(frame)) frame.remove();
    };
    frame.onload = () => {
      const win = frame.contentWindow;
      if (!win) return remove();
      win.addEventListener?.("afterprint", () => setTimeout(remove, 300));
      try {
        win.focus();
        win.print();
      } catch {
        remove();
      }
      // Safety net if afterprint never fires (some browsers).
      setTimeout(remove, 60_000);
    };
    document.body.appendChild(frame);
  }, [sourceHtml, artifact.title, previewOptions]);

  // Seamless ("camouflage") presentation: a transparent, chromeless iframe that
  // sits inline like native chat content — no card frame, no window, no border.
  // A faint action row appears only on hover so the clean UI stays clean.
  if (effectivePresentation === "seamless") {
    return (
      <div className={`aha-scope${className ? ` ${className}` : ""}`}>
        <div className="aha-seamless">
          <HtmlArtifactPreview
            html={previewHtml}
            streaming={streaming}
            errored={errored}
            title={artifact.title}
            theme={theme}
            bare
            options={{ minHeight: 0, ...previewOptions }}
          />
          {showToolbar && !streaming && (
            <div className="aha-seamless-actions">
              {allowCopy && (
                <button type="button" className="aha-iconbtn" onClick={onCopy} title="Copy HTML" aria-label="Copy HTML">
                  {copied ? CHECK_ICON : COPY_ICON}
                </button>
              )}
              {allowPdf && (
                <button type="button" className="aha-iconbtn" onClick={onDownloadPdf} title="Download PDF" aria-label="Download PDF">
                  {PDF_ICON}
                </button>
              )}
              {allowFullscreen && (
                <button type="button" className="aha-iconbtn" onClick={() => setFullscreen(true)} title="Fullscreen" aria-label="Fullscreen">
                  {EXPAND_ICON}
                </button>
              )}
            </div>
          )}
        </div>

        {allowFullscreen && (
          <HtmlArtifactModal open={fullscreen} onClose={() => setFullscreen(false)} title={artifact.title}>
            <HtmlArtifactPreview
              html={previewHtml}
              streaming={streaming}
              errored={errored}
              title={artifact.title}
              theme={theme}
              options={{ ...previewOptions, autoResize: false, minHeight: 640, maxHeight: 100000 }}
            />
          </HtmlArtifactModal>
        )}
      </div>
    );
  }

  return (
    <div className={`aha-scope${className ? ` ${className}` : ""}`}>
      <div
        className="aha-card"
        data-variant={variant}
        style={{ ["--aha-radius" as string]: `${RADIUS[radius]}px` }}
      >
        {showToolbar && (
          <HtmlArtifactToolbar
            title={artifact.title}
            tab={tab}
            onTabChange={setTab}
            allowCopy={allowCopy}
            allowDownload={allowDownload}
            allowPdf={allowPdf}
            allowFullscreen={allowFullscreen}
            copied={copied}
            streaming={streaming}
            onCopy={onCopy}
            onDownload={onDownload}
            onDownloadPdf={onDownloadPdf}
            onFullscreen={() => setFullscreen(true)}
          />
        )}

        {tab === "preview" ? (
          <HtmlArtifactPreview
            html={previewHtml}
            streaming={streaming}
            errored={errored}
            title={artifact.title}
            theme={theme}
            options={previewOptions}
          />
        ) : (
          <HtmlArtifactCodeView
            html={sourceHtml}
            maxHeight={previewOptions?.maxHeight ?? 900}
          />
        )}
      </div>

      {allowFullscreen && (
        <HtmlArtifactModal
          open={fullscreen}
          onClose={() => setFullscreen(false)}
          title={artifact.title}
        >
          <HtmlArtifactPreview
            html={previewHtml}
            streaming={streaming}
            errored={errored}
            title={artifact.title}
            theme={theme}
            options={{
              ...previewOptions,
              autoResize: false,
              minHeight: 640,
              maxHeight: 100000,
            }}
          />
        </HtmlArtifactModal>
      )}
    </div>
  );
}

const COPY_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="9" y="9" width="13" height="13" rx="2.5" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const CHECK_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const EXPAND_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);
const PDF_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15h1.2a1.3 1.3 0 0 0 0-2.6H9V18" /><path d="M15.5 12.4H14V18" /><path d="M14 15.4h1.3" />
  </svg>
);
