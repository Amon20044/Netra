"use client";

import * as React from "react";
import { useArtifactStyles } from "./styles.js";

export interface HtmlArtifactModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /**
   * Called when the view should re-run the artifact — on the Re-run button and
   * automatically whenever the device width changes (so games/responsive layouts
   * re-initialise at the new size). Wire this to the card's re-run signal.
   */
  onViewChange?: () => void;
}

type Device = "mobile" | "tablet" | "desktop";

const DEVICES: { id: Device; label: string; width: number | null; icon: React.ReactNode }[] = [
  {
    id: "mobile",
    label: "Mobile",
    width: 390,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="3" width="10" height="18" rx="2" /><line x1="11" y1="18" x2="13" y2="18" /></svg>
    ),
  },
  {
    id: "tablet",
    label: "Tablet",
    width: 834,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" /><line x1="11" y1="18" x2="13" y2="18" /></svg>
    ),
  },
  {
    id: "desktop",
    label: "Desktop",
    width: null,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="13" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
    ),
  },
];

/**
 * Premium fullscreen viewer with a responsive testbench: switch the artifact
 * between phone / tablet / desktop widths (its own media queries then react —
 * navs collapse to burgers, grids reflow), and an "invert" view that flips
 * light↔dark (hue-preserving) so a transparent, light-on-dark camouflage
 * artifact is crystal-clear on a light surface too.
 */
export function HtmlArtifactModal({ open, onClose, title, children, onViewChange }: HtmlArtifactModalProps) {
  useArtifactStyles();
  const [device, setDevice] = React.useState<Device>("desktop");
  const [inverted, setInverted] = React.useState(false);

  // Switching device width must re-run the artifact so games/responsive layouts
  // re-initialise to the new viewport (e.g. a game re-frames for 9:16 mobile).
  const changeDevice = React.useCallback(
    (id: Device) => {
      setDevice((prev) => {
        if (prev !== id) onViewChange?.();
        return id;
      });
    },
    [onViewChange],
  );

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

  const width = DEVICES.find((d) => d.id === device)?.width ?? null;

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
          "radial-gradient(120% 120% at 50% 0%, rgba(10,10,14,.55), rgba(10,10,14,.78))",
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
          maxWidth: 1280,
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

          {/* Responsive viewport switcher (auto re-runs on change) */}
          <div className="aha-seg" role="tablist" aria-label="Preview width">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={device === d.id}
                data-active={device === d.id}
                onClick={() => changeDevice(d.id)}
                title={d.label}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {d.icon}
                <span className="aha-seg-label" style={{ fontSize: 12 }}>{d.label}</span>
              </button>
            ))}
          </div>

          {/* Re-run the artifact (restart games, re-render) */}
          {onViewChange && (
            <button
              type="button"
              className="aha-iconbtn"
              onClick={() => onViewChange()}
              title="Re-run"
              aria-label="Re-run artifact"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          )}

          {/* Invert (light↔dark) for a clear view of transparent artifacts */}
          <button
            type="button"
            className="aha-iconbtn"
            onClick={() => setInverted((v) => !v)}
            title={inverted ? "Normal colors" : "Invert (light view)"}
            aria-label="Invert colors"
            data-active={inverted}
            style={inverted ? { background: "var(--aha-hover)", color: "var(--aha-fg)" } : undefined}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none" />
            </svg>
          </button>

          <button type="button" className="aha-iconbtn" onClick={onClose} aria-label="Close" style={{ fontSize: 18 }}>
            ×
          </button>
        </div>

        {/* Stage: centered, width-constrained, optional inverted surface */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            display: "flex",
            justifyContent: "center",
            padding: width ? "clamp(12px,2vw,28px)" : 0,
            background: inverted
              ? "#ffffff"
              : "repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0 10px, transparent 10px 20px)",
            transition: "background .25s ease",
          }}
        >
          <div
            style={{
              width: width ?? "100%",
              maxWidth: "100%",
              flex: width ? "0 0 auto" : "1 1 auto",
              minHeight: 0,
              alignSelf: "stretch",
              borderRadius: width ? 16 : 0,
              overflow: "hidden",
              boxShadow: width ? "0 20px 60px -20px rgba(0,0,0,.6)" : "none",
              // Hue-preserving light/dark flip — light-on-dark artifacts become
              // dark-on-light without scrambling brand hues.
              filter: inverted ? "invert(1) hue-rotate(180deg)" : "none",
              transition: "width .3s cubic-bezier(.4,0,.2,1)",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
