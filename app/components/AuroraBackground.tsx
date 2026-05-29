"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * The Lovable-style aurora: a few large, blurred colour blobs drifting slowly
 * behind everything. GSAP animates their transforms on an infinite, yoyoing
 * timeline so the field feels alive without ever distracting.
 */
export function AuroraBackground() {
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const blobs = gsap.utils.toArray<HTMLElement>(".lov-blob");
      blobs.forEach((blob, i) => {
        gsap.to(blob, {
          xPercent: gsap.utils.random(-18, 18),
          yPercent: gsap.utils.random(-16, 16),
          scale: gsap.utils.random(0.95, 1.25),
          duration: gsap.utils.random(9, 15),
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: i * 0.4,
        });
      });
      // Gentle hue rotation over the whole field.
      gsap.to(root.current, {
        filter: "hue-rotate(22deg)",
        duration: 18,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <>
      <div ref={root} className="lov-aurora" aria-hidden>
        <div
          className="lov-blob"
          style={{ top: "-12%", left: "-8%", width: "55vw", height: "55vw", background: "var(--lov-indigo)" }}
        />
        <div
          className="lov-blob"
          style={{ top: "-6%", right: "-10%", width: "50vw", height: "50vw", background: "var(--lov-blue)", opacity: 0.5 }}
        />
        <div
          className="lov-blob"
          style={{ top: "18%", left: "28%", width: "46vw", height: "46vw", background: "var(--lov-violet)" }}
        />
        <div
          className="lov-blob"
          style={{ bottom: "-18%", left: "8%", width: "52vw", height: "52vw", background: "var(--lov-magenta)" }}
        />
        <div
          className="lov-blob"
          style={{ bottom: "-22%", right: "-6%", width: "48vw", height: "48vw", background: "var(--lov-amber)", opacity: 0.45 }}
        />
        {/* Darkening vignette so foreground glass reads clearly. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 30%, transparent 30%, rgba(7,7,11,0.55) 78%, rgba(7,7,11,0.9) 100%)",
          }}
        />
      </div>
      <div className="lov-grain" aria-hidden />
    </>
  );
}
