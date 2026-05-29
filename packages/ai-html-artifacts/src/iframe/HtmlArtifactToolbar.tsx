"use client";

import * as React from "react";
import type { ArtifactTab } from "../types/client.js";

export interface HtmlArtifactToolbarProps {
  title: string;
  tab: ArtifactTab;
  onTabChange: (tab: ArtifactTab) => void;
  allowCopy?: boolean;
  allowDownload?: boolean;
  allowPdf?: boolean;
  allowFullscreen?: boolean;
  copied?: boolean;
  onCopy?: () => void;
  onDownload?: () => void;
  onDownloadPdf?: () => void;
  onFullscreen?: () => void;
  streaming?: boolean;
  /** Show macOS-style window dots on the left. */
  showDots?: boolean;
}

const Icon = {
  copy: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2.5" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  download: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  expand: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ),
  pdf: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15h1.2a1.3 1.3 0 0 0 0-2.6H9V18" /><path d="M15.5 12.4H14V18" /><path d="M14 15.4h1.3" />
    </svg>
  ),
};

export function HtmlArtifactToolbar(props: HtmlArtifactToolbarProps) {
  const {
    title,
    tab,
    onTabChange,
    allowCopy = true,
    allowDownload = true,
    allowPdf = true,
    allowFullscreen = true,
    copied = false,
    onCopy,
    onDownload,
    onDownloadPdf,
    onFullscreen,
    streaming = false,
    showDots = true,
  } = props;

  return (
    <div className="aha-toolbar">
      {showDots && (
        <span className="aha-dots" aria-hidden>
          <span className="aha-dot" style={{ background: "#ff5f57" }} />
          <span className="aha-dot" style={{ background: "#febc2e" }} />
          <span className="aha-dot" style={{ background: "#28c840" }} />
        </span>
      )}
      {streaming && <span className="aha-stream-dot" aria-label="streaming" />}
      <span className="aha-title" title={title}>
        {title}
      </span>

      <div style={{ flex: 1 }} />

      <div className="aha-seg" role="tablist" aria-label="Artifact view">
        <button type="button" role="tab" aria-selected={tab === "preview"} data-active={tab === "preview"} onClick={() => onTabChange("preview")}>
          Preview
        </button>
        <button type="button" role="tab" aria-selected={tab === "code"} data-active={tab === "code"} onClick={() => onTabChange("code")}>
          Code
        </button>
      </div>

      {allowCopy && (
        <button type="button" className="aha-iconbtn" onClick={onCopy} title="Copy HTML" aria-label="Copy HTML">
          {copied ? Icon.check : Icon.copy}
        </button>
      )}
      {allowDownload && (
        <button type="button" className="aha-iconbtn" onClick={onDownload} title="Download HTML" aria-label="Download HTML">
          {Icon.download}
        </button>
      )}
      {allowPdf && (
        <button type="button" className="aha-iconbtn" onClick={onDownloadPdf} title="Download PDF" aria-label="Download PDF">
          {Icon.pdf}
        </button>
      )}
      {allowFullscreen && (
        <button type="button" className="aha-iconbtn" onClick={onFullscreen} title="Fullscreen" aria-label="Open fullscreen">
          {Icon.expand}
        </button>
      )}
    </div>
  );
}
