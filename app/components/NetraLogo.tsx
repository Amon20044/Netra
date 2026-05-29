interface NetraLogoProps {
  size?: number;
  className?: string;
  /** Add a soft shadow so the mark separates from the background. */
  glow?: boolean;
}

/**
 * The Netra mark. Single source of truth: `public/Netra-white.svg` — imported
 * directly and auto-sized via the `size` prop. No duplicated inline artwork.
 */
export function NetraLogo({ size = 36, className, glow = true }: NetraLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/Netra-white.svg"
      alt="Netra"
      width={size}
      height={size}
      className={className}
      style={glow ? { filter: "drop-shadow(0 1px 6px rgba(0,0,0,0.45))" } : undefined}
    />
  );
}
