/**
 * Ornate filigree corner decorations for cards — inspired by real tarot card borders.
 * Renders SVG scrollwork corners with optional animated entrance.
 */

interface OrnateCornersProps {
  /** Padding inset from card edges */
  inset?: number;
  /** Color opacity multiplier */
  intensity?: "subtle" | "medium" | "vivid";
}

export default function OrnateCorners({ inset = 8, intensity = "medium" }: OrnateCornersProps) {
  const o = intensity === "subtle" ? 0.12 : intensity === "vivid" ? 0.4 : 0.22;
  const oFaint = o * 0.5;

  const corner = (
    <g>
      {/* Main L-bracket */}
      <path d="M0 20 L0 0 L20 0" stroke={`hsl(var(--gold) / ${o})`} strokeWidth="0.8" fill="none" />
      {/* Inner L-bracket */}
      <path d="M3 15 L3 3 L15 3" stroke={`hsl(var(--gold) / ${oFaint})`} strokeWidth="0.4" fill="none" />
      {/* Scrollwork curl — top */}
      <path d="M20 0 Q24 0 24 4 Q24 8 20 8 Q16 8 16 4" 
        stroke={`hsl(var(--gold) / ${o})`} strokeWidth="0.5" fill="none" />
      {/* Scrollwork curl — left */}
      <path d="M0 20 Q0 24 4 24 Q8 24 8 20 Q8 16 4 16" 
        stroke={`hsl(var(--gold) / ${o})`} strokeWidth="0.5" fill="none" />
      {/* Corner dot cluster */}
      <circle cx="0" cy="0" r="1.5" fill={`hsl(var(--gold) / ${o * 1.2})`} />
      <circle cx="6" cy="0" r="0.6" fill={`hsl(var(--gold) / ${oFaint})`} />
      <circle cx="0" cy="6" r="0.6" fill={`hsl(var(--gold) / ${oFaint})`} />
      {/* Diagonal flourish */}
      <path d="M2 2 Q6 1 10 5" stroke={`hsl(var(--gold) / ${oFaint})`} strokeWidth="0.3" fill="none" />
    </g>
  );

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {/* Top Left */}
      <svg className="absolute" style={{ top: inset, left: inset, width: 28, height: 28 }} viewBox="0 0 28 28" fill="none">
        {corner}
      </svg>
      {/* Top Right */}
      <svg className="absolute" style={{ top: inset, right: inset, width: 28, height: 28 }} viewBox="0 0 28 28" fill="none"
        transform="scale(-1, 1)">
        {corner}
      </svg>
      {/* Bottom Left */}
      <svg className="absolute" style={{ bottom: inset, left: inset, width: 28, height: 28 }} viewBox="0 0 28 28" fill="none"
        transform="scale(1, -1)">
        {corner}
      </svg>
      {/* Bottom Right */}
      <svg className="absolute" style={{ bottom: inset, right: inset, width: 28, height: 28 }} viewBox="0 0 28 28" fill="none"
        transform="scale(-1, -1)">
        {corner}
      </svg>

      {/* Center top ornament — fleur de lis style */}
      <svg className="absolute left-1/2 -translate-x-1/2" style={{ top: inset - 1, width: 32, height: 12 }} viewBox="0 0 32 12" fill="none">
        <path d="M2 10 Q8 2 16 2 Q24 2 30 10" stroke={`hsl(var(--gold) / ${oFaint})`} strokeWidth="0.4" fill="none" />
        <path d="M12 4 L16 0 L20 4" stroke={`hsl(var(--gold) / ${o * 0.8})`} strokeWidth="0.5" fill="none" />
        <circle cx="16" cy="1" r="0.8" fill={`hsl(var(--gold) / ${o})`} />
      </svg>

      {/* Center bottom ornament */}
      <svg className="absolute left-1/2 -translate-x-1/2" style={{ bottom: inset - 1, width: 32, height: 12 }} viewBox="0 0 32 12" fill="none">
        <path d="M2 2 Q8 10 16 10 Q24 10 30 2" stroke={`hsl(var(--gold) / ${oFaint})`} strokeWidth="0.4" fill="none" />
        <path d="M12 8 L16 12 L20 8" stroke={`hsl(var(--gold) / ${o * 0.8})`} strokeWidth="0.5" fill="none" />
        <circle cx="16" cy="11" r="0.8" fill={`hsl(var(--gold) / ${o})`} />
      </svg>
    </div>
  );
}
