interface OrnamentProps {
  variant?: "line" | "diamond" | "dot" | "star" | "sigil" | "compass" | "cross" | "eye";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function Ornament({ variant = "line", className = "", size = "md" }: OrnamentProps) {
  const s = size === "sm" ? 0.7 : size === "lg" ? 1.4 : 1;

  switch (variant) {
    case "eye":
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <svg width={48 * s} height={28 * s} viewBox="0 0 48 28" fill="none">
            {/* Eye shape */}
            <path d="M2 14 Q12 2 24 2 Q36 2 46 14 Q36 26 24 26 Q12 26 2 14Z"
              stroke="hsl(var(--gold) / 0.4)" strokeWidth="0.6" fill="none" />
            <path d="M6 14 Q14 5 24 5 Q34 5 42 14 Q34 23 24 23 Q14 23 6 14Z"
              stroke="hsl(var(--gold) / 0.2)" strokeWidth="0.4" fill="none" />
            {/* Iris */}
            <circle cx="24" cy="14" r="6" stroke="hsl(var(--gold) / 0.4)" strokeWidth="0.5" fill="hsl(var(--gold) / 0.05)" />
            <circle cx="24" cy="14" r="3" stroke="hsl(var(--gold) / 0.5)" strokeWidth="0.4" fill="hsl(var(--gold) / 0.1)" />
            {/* Pupil */}
            <circle cx="24" cy="14" r="1.5" fill="hsl(var(--gold) / 0.5)" />
            {/* Rays above */}
            <line x1="24" y1="0" x2="24" y2="4" stroke="hsl(var(--gold) / 0.2)" strokeWidth="0.3" />
            <line x1="18" y1="1" x2="20" y2="5" stroke="hsl(var(--gold) / 0.15)" strokeWidth="0.3" />
            <line x1="30" y1="1" x2="28" y2="5" stroke="hsl(var(--gold) / 0.15)" strokeWidth="0.3" />
          </svg>
        </div>
      );

    case "cross":
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <svg width={24 * s} height={24 * s} viewBox="0 0 24 24" fill="none">
            <line x1="12" y1="2" x2="12" y2="22" stroke="hsl(var(--gold) / 0.3)" strokeWidth="0.5" />
            <line x1="2" y1="12" x2="22" y2="12" stroke="hsl(var(--gold) / 0.3)" strokeWidth="0.5" />
            <circle cx="12" cy="12" r="4" stroke="hsl(var(--gold) / 0.25)" strokeWidth="0.4" fill="none" />
            <circle cx="12" cy="12" r="1.2" fill="hsl(var(--gold) / 0.4)" />
            {/* Fleur tips */}
            <circle cx="12" cy="2" r="1" fill="hsl(var(--gold) / 0.2)" />
            <circle cx="12" cy="22" r="1" fill="hsl(var(--gold) / 0.2)" />
            <circle cx="2" cy="12" r="1" fill="hsl(var(--gold) / 0.2)" />
            <circle cx="22" cy="12" r="1" fill="hsl(var(--gold) / 0.2)" />
          </svg>
        </div>
      );

    case "sigil":
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <svg width={56 * s} height={56 * s} viewBox="0 0 56 56" fill="none"
            className="animate-sacred-spin" style={{ animationDuration: "60s" }}>
            <circle cx="28" cy="28" r="24" stroke="hsl(var(--gold) / 0.15)" strokeWidth="0.4" />
            <circle cx="28" cy="28" r="20" stroke="hsl(var(--gold) / 0.1)" strokeWidth="0.3" strokeDasharray="2 4" />
            {/* Inner triangle up */}
            <path d="M28 10 L42 38 L14 38 Z" stroke="hsl(var(--gold) / 0.2)" strokeWidth="0.5" fill="none" />
            {/* Inner triangle down */}
            <path d="M28 46 L42 18 L14 18 Z" stroke="hsl(var(--gold) / 0.15)" strokeWidth="0.4" fill="none" />
            {/* Center */}
            <circle cx="28" cy="28" r="5" stroke="hsl(var(--gold) / 0.3)" strokeWidth="0.5" fill="hsl(var(--gold) / 0.05)" />
            <circle cx="28" cy="28" r="1.5" fill="hsl(var(--gold) / 0.5)" />
          </svg>
        </div>
      );

    case "compass":
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <svg width={64 * s} height={64 * s} viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="hsl(var(--gold) / 0.1)" strokeWidth="0.4" strokeDasharray="3 5" />
            <circle cx="32" cy="32" r="22" stroke="hsl(var(--gold) / 0.15)" strokeWidth="0.4" />
            {/* N-S-E-W lines */}
            <line x1="32" y1="4" x2="32" y2="60" stroke="hsl(var(--gold) / 0.08)" strokeWidth="0.3" />
            <line x1="4" y1="32" x2="60" y2="32" stroke="hsl(var(--gold) / 0.08)" strokeWidth="0.3" />
            {/* Diamond center */}
            <path d="M32 18 L42 32 L32 46 L22 32 Z" stroke="hsl(var(--gold) / 0.25)" strokeWidth="0.5" fill="hsl(var(--gold) / 0.02)" />
            <path d="M32 24 L38 32 L32 40 L26 32 Z" stroke="hsl(var(--gold) / 0.15)" strokeWidth="0.3" fill="none" />
            <circle cx="32" cy="32" r="3" fill="hsl(var(--gold) / 0.15)" stroke="hsl(var(--gold) / 0.3)" strokeWidth="0.4" />
            {/* Cardinal points */}
            <path d="M32 4 L34 10 L30 10 Z" fill="hsl(var(--gold) / 0.25)" />
            <path d="M32 60 L34 54 L30 54 Z" fill="hsl(var(--gold) / 0.15)" />
          </svg>
        </div>
      );

    case "diamond":
      return (
        <div className={`flex items-center gap-5 ${className}`}>
          <div className="w-14 h-px bg-gradient-to-r from-transparent to-gold/25" />
          <svg width={14 * s} height={14 * s} viewBox="0 0 14 14" fill="none">
            <path d="M7 1 L12 7 L7 13 L2 7 Z" stroke="hsl(var(--gold) / 0.5)" strokeWidth="0.6" fill="hsl(var(--gold) / 0.06)" />
            <path d="M7 3.5 L10 7 L7 10.5 L4 7 Z" stroke="hsl(var(--gold) / 0.25)" strokeWidth="0.4" fill="none" />
          </svg>
          <div className="w-14 h-px bg-gradient-to-l from-transparent to-gold/25" />
        </div>
      );

    case "star":
      return (
        <div className={`flex items-center gap-5 ${className}`}>
          <div className="w-16 h-px bg-gradient-to-r from-transparent to-gold/20" />
          <svg width={18 * s} height={18 * s} viewBox="0 0 18 18" fill="none" className="animate-glow-pulse">
            <path d="M9 1 L10.5 7 L17 9 L10.5 11 L9 17 L7.5 11 L1 9 L7.5 7 Z"
              stroke="hsl(var(--gold) / 0.5)" strokeWidth="0.5" fill="hsl(var(--gold) / 0.1)" />
            <circle cx="9" cy="9" r="1.5" fill="hsl(var(--gold) / 0.4)" />
          </svg>
          <div className="w-16 h-px bg-gradient-to-l from-transparent to-gold/20" />
        </div>
      );

    case "dot":
      return (
        <div className={`flex items-center gap-3 ${className}`}>
          <div className="w-1 h-1 rounded-full bg-gold/15" />
          <div className="w-1.5 h-1.5 rounded-full bg-gold/30 animate-glow-pulse" />
          <div className="w-1 h-1 rounded-full bg-gold/15" />
        </div>
      );

    default: // line
      return (
        <div className={`flex items-center gap-2 ${className}`}>
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold/12 to-gold/20" />
          <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
            <path d="M3 0 L5 3 L3 6 L1 3 Z" fill="hsl(var(--gold) / 0.25)" />
          </svg>
          <div className="w-16 h-px bg-gradient-to-l from-transparent via-gold/12 to-gold/20" />
        </div>
      );
  }
}
