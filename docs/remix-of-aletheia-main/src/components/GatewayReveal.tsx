import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n-context";

const INTRO_SEEN_KEY = "aletheia-intro-seen";

/**
 * Gateway reveal — full intro on first visit, fast fade on subsequent visits.
 */
export default function GatewayReveal({ onComplete }: { onComplete: () => void }) {
  const hasSeenBefore = !!localStorage.getItem(INTRO_SEEN_KEY);
  const [phase, setPhase] = useState(0);
  const { t } = useI18n();

  const handleSkip = useCallback(() => {
    localStorage.setItem(INTRO_SEEN_KEY, "1");
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    // Returning users: quick 800ms fade
    if (hasSeenBefore) {
      const t1 = setTimeout(() => setPhase(4), 600);
      const t2 = setTimeout(() => onComplete(), 800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }

    // First visit: full 3.5s reveal
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => setPhase(3), 2200);
    const t4 = setTimeout(() => setPhase(4), 3000);
    const t5 = setTimeout(() => {
      localStorage.setItem(INTRO_SEEN_KEY, "1");
      onComplete();
    }, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [onComplete, hasSeenBefore]);

  return (
    <AnimatePresence>
      {phase < 4 && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer"
          style={{ background: "hsl(var(--void))" }}
          exit={{ opacity: 0 }}
          transition={{ duration: hasSeenBefore ? 0.4 : 0.8, ease: [0.16, 1, 0.3, 1] }}
          onClick={handleSkip}
          role="button"
          aria-label="Skip intro"
        >
          {!hasSeenBefore && (
            <>
              {[0, 1, 2, 3].map(i => (
                <motion.div key={i} className="absolute rounded-full border"
                  style={{ borderColor: `hsl(var(--gold) / ${0.18 - i * 0.03})` }}
                  initial={{ width: 0, height: 0, opacity: 0 }}
                  animate={phase >= 1 ? { width: (i + 1) * 100, height: (i + 1) * 100, opacity: 1 } : {}}
                  transition={{ duration: 1.4 + i * 0.2, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}

              <motion.div className="absolute rounded-full"
                initial={{ width: 0, height: 0, opacity: 0 }}
                animate={phase >= 1 ? { width: 220, height: 220, opacity: 1 } : {}}
                transition={{ duration: 2, ease: "easeOut" }}
                style={{ background: "radial-gradient(circle, hsl(var(--gold) / 0.15) 0%, hsl(var(--mystic) / 0.06) 50%, transparent 100%)" }}
              />
            </>
          )}

          <motion.div className="absolute"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={phase >= 1 || hasSeenBefore ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: hasSeenBefore ? 0.3 : 1, delay: hasSeenBefore ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <svg width="64" height="38" viewBox="0 0 48 28" fill="none">
              <motion.path d="M2 14 Q12 2 24 2 Q36 2 46 14 Q36 26 24 26 Q12 26 2 14Z"
                stroke="hsl(var(--gold))" strokeWidth="0.8" fill="none"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: hasSeenBefore ? 0.4 : 1.4, delay: hasSeenBefore ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.circle cx="24" cy="14" r="6" stroke="hsl(var(--gold))" strokeWidth="0.6"
                fill="hsl(var(--gold) / 0.1)" initial={{ scale: 0 }}
                animate={phase >= 2 || hasSeenBefore ? { scale: 1 } : {}}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.circle cx="24" cy="14" r="2" fill="hsl(var(--gold))"
                initial={{ scale: 0 }} animate={phase >= 2 || hasSeenBefore ? { scale: 1 } : {}}
                transition={{ duration: 0.3, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
          </motion.div>

          {!hasSeenBefore && (
            <>
              <motion.div className="absolute flex flex-col items-center gap-3"
                style={{ top: "calc(50% + 50px)" }}
                initial={{ opacity: 0, y: 10 }}
                animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1 className="text-xl font-display tracking-[0.4em] text-gold-gradient uppercase">ALETHEIA</h1>
                <motion.p className="text-[10px] text-muted-foreground/50 tracking-[0.3em] uppercase font-body"
                  initial={{ opacity: 0 }} animate={phase >= 3 ? { opacity: 1 } : {}}
                  transition={{ duration: 0.6 }}
                >
                  {t("home.tagline")}
                </motion.p>
              </motion.div>

              <motion.p className="absolute bottom-8 text-[9px] text-muted-foreground/40 tracking-[0.2em] uppercase font-body"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.5 }}
              >
                tap to skip
              </motion.p>

              <motion.div className="absolute w-px bg-gradient-to-b from-transparent via-gold/30 to-transparent"
                initial={{ height: 0, opacity: 0 }}
                animate={phase >= 3 ? { height: "100vh", opacity: 1 } : {}}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{ left: "50%" }}
              />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
