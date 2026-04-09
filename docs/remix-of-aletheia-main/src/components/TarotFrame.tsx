/**
 * Phase 2: Tarot frame with 3D shadow depth.
 */
interface TarotFrameProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "major" | "reading";
  glowing?: boolean;
}

export default function TarotFrame({ children, className = "", variant = "default", glowing = false }: TarotFrameProps) {
  const borderColor = "hsl(var(--gold) / 0.35)";
  const borderFaint = "hsl(var(--gold) / 0.12)";
  const cornerColor = "hsl(var(--gold) / 0.5)";
  const bgFill = variant === "major" ? "hsl(var(--gold) / 0.03)" : "hsl(var(--surface) / 0.5)";

  return (
    <div className={`relative card-3d-shadow ${glowing ? "arcane-glow" : ""} ${className}`}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 300" preserveAspectRatio="none">
        <rect x="4" y="4" width="192" height="292" rx="8" fill={bgFill} />
        <rect x="4" y="4" width="192" height="292" rx="8" stroke={borderColor} strokeWidth="0.8" fill="none" />
        <rect x="12" y="12" width="176" height="276" rx="4" stroke={borderFaint} strokeWidth="0.4" fill="none" />
        <path d="M12 28 L12 12 L28 12" stroke={cornerColor} strokeWidth="1" fill="none" />
        <path d="M16 24 L16 16 L24 16" stroke={borderFaint} strokeWidth="0.5" fill="none" />
        <circle cx="12" cy="12" r="2" fill={cornerColor} />
        <path d="M172 12 L188 12 L188 28" stroke={cornerColor} strokeWidth="1" fill="none" />
        <path d="M176 16 L184 16 L184 24" stroke={borderFaint} strokeWidth="0.5" fill="none" />
        <circle cx="188" cy="12" r="2" fill={cornerColor} />
        <path d="M12 272 L12 288 L28 288" stroke={cornerColor} strokeWidth="1" fill="none" />
        <path d="M16 276 L16 284 L24 284" stroke={borderFaint} strokeWidth="0.5" fill="none" />
        <circle cx="12" cy="288" r="2" fill={cornerColor} />
        <path d="M188 272 L188 288 L172 288" stroke={cornerColor} strokeWidth="1" fill="none" />
        <path d="M184 276 L184 284 L176 284" stroke={borderFaint} strokeWidth="0.5" fill="none" />
        <circle cx="188" cy="288" r="2" fill={cornerColor} />
        <line x1="60" y1="12" x2="80" y2="12" stroke={borderFaint} strokeWidth="0.3" />
        <line x1="120" y1="12" x2="140" y2="12" stroke={borderFaint} strokeWidth="0.3" />
        <path d="M90 8 L100 3 L110 8 L100 13 Z" stroke={cornerColor} strokeWidth="0.6" fill="hsl(var(--gold) / 0.06)" />
        <path d="M90 292 L100 287 L110 292 L100 297 Z" stroke={cornerColor} strokeWidth="0.6" fill="hsl(var(--gold) / 0.06)" />
        <circle cx="4" cy="150" r="1.5" fill={borderFaint} />
        <circle cx="196" cy="150" r="1.5" fill={borderFaint} />
        {variant === "major" && (
          <>
            <path d="M40 20 L100 20" stroke={borderFaint} strokeWidth="0.3" strokeDasharray="1 3" />
            <path d="M100 20 L160 20" stroke={borderFaint} strokeWidth="0.3" strokeDasharray="1 3" />
            <path d="M40 280 L100 280" stroke={borderFaint} strokeWidth="0.3" strokeDasharray="1 3" />
            <path d="M100 280 L160 280" stroke={borderFaint} strokeWidth="0.3" strokeDasharray="1 3" />
            <path d="M100 28 L102 34 L108 36 L102 38 L100 44 L98 38 L92 36 L98 34 Z"
              stroke={cornerColor} strokeWidth="0.5" fill="hsl(var(--gold) / 0.08)" />
          </>
        )}
      </svg>
      <div className="relative z-10">{children}</div>
    </div>
  );
}