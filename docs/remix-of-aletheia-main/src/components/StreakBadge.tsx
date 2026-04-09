import { useMemo } from "react";
import { useI18n } from "@/lib/i18n-context";
import { useReading } from "@/lib/reading-context";
import { motion } from "framer-motion";

function getStreak(readings: { createdAt: Date | string }[]): number {
  if (readings.length === 0) return 0;

  const days = new Set<string>();
  readings.forEach(r => {
    const d = new Date(r.createdAt);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  });

  const sorted = Array.from(days).sort().reverse();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  if (sorted[0] !== todayKey) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
    if (sorted[0] !== yKey) return 0;
  }

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 1.5) streak++;
    else break;
  }
  return streak;
}

/** Animated flame SVG with flickering particles */
function AnimatedFlame({ size = 16 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <motion.path
          d="M12 2C8 8 5 12 5 16a7 7 0 0014 0c0-4-3-8-7-14z"
          fill="url(#flameGrad)"
          animate={{
            d: [
              "M12 2C8 8 5 12 5 16a7 7 0 0014 0c0-4-3-8-7-14z",
              "M12 3C9 8 6 12 6 16a6 6 0 0012 0c0-4-3-8-6-13z",
              "M12 2C8 8 5 12 5 16a7 7 0 0014 0c0-4-3-8-7-14z",
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M12 8c-2 3-3.5 5-3.5 7a3.5 3.5 0 007 0c0-2-1.5-4-3.5-7z"
          fill="url(#flameInner)"
          animate={{
            d: [
              "M12 8c-2 3-3.5 5-3.5 7a3.5 3.5 0 007 0c0-2-1.5-4-3.5-7z",
              "M12 9c-1.5 2.5-3 4.5-3 6.5a3 3 0 006 0c0-2-1.5-4-3-6.5z",
              "M12 8c-2 3-3.5 5-3.5 7a3.5 3.5 0 007 0c0-2-1.5-4-3.5-7z",
            ],
          }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
        />
        <defs>
          <linearGradient id="flameGrad" x1="12" y1="2" x2="12" y2="23" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="hsl(var(--gold-glow))" stopOpacity="0.9" />
            <stop offset="50%" stopColor="hsl(var(--ember))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--ember-glow))" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="flameInner" x1="12" y1="8" x2="12" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="hsl(var(--gold-glow))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0.7" />
          </linearGradient>
        </defs>
      </svg>
      {/* Tiny ember particles rising */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-ember-glow"
          style={{ width: 2, height: 2, left: 6 + i * 3, bottom: size - 4 }}
          animate={{
            y: [-2, -14 - i * 4],
            x: [(i - 1) * 2, (i - 1) * 4],
            opacity: [0.8, 0],
            scale: [1, 0.3],
          }}
          transition={{
            duration: 1 + i * 0.3,
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

export default function StreakBadge() {
  const { savedReadings } = useReading();
  const { t } = useI18n();
  const streak = useMemo(() => getStreak(savedReadings), [savedReadings]);

  if (streak === 0) return null;

  return (
    <motion.div
      className="flex items-center gap-2 px-3.5 py-2 rounded-sm glass-arcane ornate-border text-gold/70"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 2.6, ease: [0.16, 1, 0.3, 1] }}
      title={t("streak.tooltip", streak)}
    >
      <AnimatedFlame size={16} />
      <span className="text-xs font-serif tracking-[0.1em]">
        {streak} {t("streak.days")}
      </span>
    </motion.div>
  );
}
