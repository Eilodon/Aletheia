/**
 * Film grain overlay — CSS-based for better performance.
 * Uses a noise texture via SVG filter instead of canvas rendering.
 */
export default function FilmGrain({ opacity = 0.04 }: { opacity?: number }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[3]"
      style={{ opacity, mixBlendMode: "overlay" }}
      aria-hidden="true"
    >
      <svg className="w-full h-full">
        <filter id="grain-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-noise)" />
      </svg>
    </div>
  );
}
