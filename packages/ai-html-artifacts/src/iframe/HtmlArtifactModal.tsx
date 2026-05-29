"use client";

import * as React from "react";
import { useArtifactStyles } from "./styles.js";

export interface HtmlArtifactModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/** A premium fullscreen overlay used by the card's fullscreen button. */
export function HtmlArtifactModal({
  open,
  onClose,
  title,
  children,
}: HtmlArtifactModalProps) {
  useArtifactStyles();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="aha-scope"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Artifact"}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        display: "flex",
        flexDirection: "column",
        padding: "clamp(8px, 3vw, 44px)",
        background:
          "radial-gradient(120% 120% at 50% 0%, rgba(10,10,14,.55), rgba(10,10,14,.72))",
        backdropFilter: "blur(8px)",
        animation: "aha-fade .2s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="aha-card"
        style={{
          ["--aha-radius" as string]: "18px",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          margin: "0 auto",
          width: "100%",
          maxWidth: 1180,
        }}
      >
        <div className="aha-toolbar">
          <span className="aha-dots" aria-hidden>
            <span className="aha-dot" style={{ background: "#ff5f57" }} />
            <span className="aha-dot" style={{ background: "#febc2e" }} />
            <span className="aha-dot" style={{ background: "#28c840" }} />
          </span>
          <strong className="aha-title">{title ?? "Artifact"}</strong>
          <div style={{ flex: 1 }} />
          <button type="button" className="aha-iconbtn" onClick={onClose} aria-label="Close" style={{ fontSize: 18 }}>
            ×
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
