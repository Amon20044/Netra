"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

// Playful, progressive status lines that rotate while Netra works — so the
// chat never looks empty during the gap before visible HTML streams in.
const PHRASES = [
  "Netra is cooking",
  "Synchronising emotions",
  "Composing the layout",
  "Choosing a palette",
  "Building something special",
  "Fetching the good data",
  "Sketching the structure",
  "Tuning the vibe",
  "Balancing the whitespace",
  "Polishing the pixels",
  "Arranging the details",
  "Almost there",
];

export function ThinkingLoader() {
  const [idx, setIdx] = useState(0);
  const textRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((prev) => {
        let next = prev;
        while (next === prev) next = Math.floor(Math.random() * PHRASES.length);
        return next;
      });
    }, 2100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!textRef.current) return;
    gsap.fromTo(
      textRef.current,
      { opacity: 0, y: 7, filter: "blur(3px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.5, ease: "power2.out" },
    );
  }, [idx]);

  return (
    <div className="lov-msg my-3 flex items-center gap-3">
      {/* Spinning conic ring around a pulsing brand dot */}
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0_300deg,#e879f9_360deg)] animate-[lov-spin_1.2s_linear_infinite]" />
        <span className="absolute inset-[2px] rounded-full bg-[#0b0b12]" />
        <span className="relative h-2 w-2 animate-pulse rounded-full bg-gradient-to-r from-fuchsia-400 to-orange-400" />
      </div>

      <span
        key={idx}
        ref={textRef}
        className="lov-shimmer-text text-[15px] font-medium tracking-tight"
      >
        {PHRASES[idx]}…
      </span>
    </div>
  );
}
