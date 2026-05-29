"use client";

export function ThinkingLoader() {
  return (
    <div className="lov-msg my-3 flex items-center gap-3.5">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-black/40">
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_280deg,#e879f9_360deg)] animate-[lov-spin_1.4s_linear_infinite]" />
        <div className="absolute inset-[2.5px] flex items-center justify-center rounded-full bg-[#0b0b10]">
          <span className="h-2 w-2 animate-ping rounded-full bg-fuchsia-400" />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="bg-gradient-to-r from-white to-fuchsia-300 bg-clip-text text-[14px] font-semibold text-transparent">
          Netra is thinking
        </span>
        <div className="mt-1 flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1 w-1 animate-bounce rounded-full bg-fuchsia-400/80"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: "0.8s" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
