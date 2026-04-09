import { useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { useReading } from "@/lib/reading-context";
import { useI18n } from "@/lib/i18n-context";
import ScreenContainer from "@/components/ScreenContainer";
import AmbientParticles from "@/components/AmbientParticles";
import DailyPassage from "@/components/DailyPassage";
import StreakBadge from "@/components/StreakBadge";
import PageTransition from "@/components/PageTransition";
import GatewayReveal from "@/components/GatewayReveal";
import Ornament from "@/components/Ornament";
import { motion } from "framer-motion";

function LetterReveal({ text, className }: { text: string; className?: string }) {
  return (
    <h1 className={className} aria-label={text}>
      {text.split("").map((char, i) => (
        <motion.span key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.5 + i * 0.055, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block"
        >{char}</motion.span>
      ))}
    </h1>
  );
}

function HeroEye() {
  return (
    <motion.div className="relative flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      style={{ width: 160, height: 160 }}
    >
      <motion.div className="absolute" animate={{ rotate: -360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none">
          <circle cx="80" cy="80" r="76" stroke="hsl(var(--gold) / 0.06)" strokeWidth="0.3" strokeDasharray="2 8" />
          <circle cx="80" cy="80" r="72" stroke="hsl(var(--gold) / 0.04)" strokeWidth="0.3" strokeDasharray="1 12" />
          {[0, 90, 180, 270].map(deg => (
            <circle key={deg} cx={80 + 76 * Math.cos(deg * Math.PI / 180)} cy={80 + 76 * Math.sin(deg * Math.PI / 180)}
              r="1" fill="hsl(var(--gold) / 0.15)" />
          ))}
        </svg>
      </motion.div>

      <motion.div className="absolute" animate={{ rotate: 360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}>
        <svg width="130" height="130" viewBox="0 0 130 130" fill="none">
          <circle cx="65" cy="65" r="60" stroke="hsl(var(--gold) / 0.08)" strokeWidth="0.4" />
          <circle cx="65" cy="65" r="56" stroke="hsl(var(--gold) / 0.05)" strokeWidth="0.3" strokeDasharray="4 6" />
          {Array.from({ length: 12 }, (_, i) => {
            const deg = i * 30;
            return <line key={i} x1={65 + 60 * Math.cos(deg * Math.PI / 180)} y1={65 + 60 * Math.sin(deg * Math.PI / 180)}
              x2={65 + 55 * Math.cos(deg * Math.PI / 180)} y2={65 + 55 * Math.sin(deg * Math.PI / 180)}
              stroke="hsl(var(--gold) / 0.1)" strokeWidth="0.3" />;
          })}
        </svg>
      </motion.div>

      <motion.div className="absolute rounded-full"
        style={{ width: 120, height: 120, background: "radial-gradient(circle, hsl(var(--gold) / 0.1) 0%, hsl(var(--mystic) / 0.04) 40%, transparent 70%)" }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div className="absolute rounded-full"
        style={{ width: 90, height: 90, background: "radial-gradient(circle, hsl(var(--gold) / 0.15) 0%, transparent 60%)" }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      <svg width="88" height="56" viewBox="0 0 88 56" fill="none" className="relative z-10">
        {[-28, -20, -12, -4, 4, 12, 20, 28].map((offset, i) => {
          const x = 44 + offset;
          const angle = offset * 0.02;
          const len = 4 + Math.abs(Math.cos(i * 0.8)) * 5;
          const startY = 28 - Math.sqrt(Math.max(0, 900 - offset * offset)) * 26 / 30;
          return (
            <motion.line key={`lash-${i}`} x1={x} y1={startY}
              x2={x + Math.sin(angle) * 2} y2={startY - len}
              stroke="hsl(var(--gold) / 0.2)" strokeWidth="0.4" strokeLinecap="round"
              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
              transition={{ delay: 0.8 + i * 0.05, duration: 0.5 }}
            />
          );
        })}
        <motion.path d="M4 28 Q16 6 44 6 Q72 6 84 28 Q72 50 44 50 Q16 50 4 28Z"
          stroke="hsl(var(--gold) / 0.5)" strokeWidth="0.7" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
        <path d="M10 28 Q20 10 44 10 Q68 10 78 28 Q68 46 44 46 Q20 46 10 28Z"
          stroke="hsl(var(--gold) / 0.2)" strokeWidth="0.4" fill="none" />
        <circle cx="44" cy="28" r="12" stroke="hsl(var(--gold) / 0.45)" strokeWidth="0.6" fill="url(#irisGradient)" />
        <motion.circle cx="44" cy="28" r="10" stroke="hsl(var(--gold) / 0.25)" strokeWidth="0.3" fill="none"
          strokeDasharray="1.5 2" animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "44px 28px" }}
        />
        <motion.circle cx="44" cy="28" r="8" stroke="hsl(var(--ember) / 0.2)" strokeWidth="0.3" fill="none"
          strokeDasharray="1 3" animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "44px 28px" }}
        />
        {Array.from({ length: 24 }, (_, i) => {
          const deg = i * 15;
          return <line key={`iris-${i}`}
            x1={44 + 5 * Math.cos(deg * Math.PI / 180)} y1={28 + 5 * Math.sin(deg * Math.PI / 180)}
            x2={44 + 11 * Math.cos(deg * Math.PI / 180)} y2={28 + 11 * Math.sin(deg * Math.PI / 180)}
            stroke={`hsl(var(--gold) / ${0.08 + (i % 3) * 0.04})`} strokeWidth="0.25" />;
        })}
        <motion.circle cx="44" cy="28" r="4.5" fill="hsl(var(--void) / 0.8)"
          stroke="hsl(var(--gold) / 0.5)" strokeWidth="0.4"
          animate={{ r: [4.5, 3.8, 4.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <circle cx="41" cy="25.5" r="1.2" fill="hsl(var(--gold) / 0.35)" />
        <circle cx="46.5" cy="26.5" r="0.6" fill="hsl(var(--gold) / 0.2)" />
        <motion.circle cx="44" cy="28" r="1.5" fill="hsl(var(--gold) / 0.7)"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <line x1="44" y1="0" x2="44" y2="5" stroke="hsl(var(--gold) / 0.2)" strokeWidth="0.3" />
        <line x1="36" y1="1" x2="38" y2="6" stroke="hsl(var(--gold) / 0.15)" strokeWidth="0.3" />
        <line x1="52" y1="1" x2="50" y2="6" stroke="hsl(var(--gold) / 0.15)" strokeWidth="0.3" />
        <defs>
          <radialGradient id="irisGradient" cx="44" cy="28" r="12" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="hsl(var(--gold) / 0.15)" />
            <stop offset="40%" stopColor="hsl(var(--gold) / 0.08)" />
            <stop offset="80%" stopColor="hsl(var(--mystic) / 0.04)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
      </svg>
    </motion.div>
  );
}

function haptic(ms = 10) { try { navigator?.vibrate?.(ms); } catch {} }

export default function HomeScreen() {
  const navigate = useNavigate();
  const { totalReadings, isOnboardingComplete, readingsRemaining, canRead } = useReading();
  const { t } = useI18n();
  const [showGateway, setShowGateway] = useState(true);

  // Redirect to onboarding if not completed
  const handleGatewayComplete = useCallback(() => {
    setShowGateway(false);
    if (!isOnboardingComplete) {
      navigate("/onboarding");
    }
  }, [isOnboardingComplete, navigate]);

  // (handleGatewayComplete moved above)

  return (
    <>
      {showGateway && <GatewayReveal onComplete={handleGatewayComplete} />}
      <PageTransition>
        <ScreenContainer>
          <AmbientParticles count={18} />
          <motion.div className="absolute top-5 right-5 z-10"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.6 }}>
            <StreakBadge />
          </motion.div>

          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(var(--gold) / 0.04) 0%, transparent 55%)" }} aria-hidden="true" />

          <div className="relative flex-1 flex flex-col items-center justify-center px-6 pb-20 max-w-md mx-auto w-full overflow-y-auto">
            <motion.header className="flex flex-col items-center gap-5 mb-10"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <HeroEye />
              <div className="h-3" />
              <LetterReveal text="ALETHEIA"
                className="text-[2.5rem] sm:text-5xl font-display font-normal tracking-[0.28em] text-gold-gradient leading-none" />
              <motion.div className="flex items-center gap-3 mt-1"
                initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.7, delay: 1.1 }}>
                <div className="w-12 h-px shimmer-line" />
                <svg width="6" height="6" viewBox="0 0 6 6" fill="none" aria-hidden="true">
                  <path d="M3 0 L5 3 L3 6 L1 3 Z" fill="hsl(var(--gold) / 0.4)" />
                </svg>
                <div className="w-12 h-px shimmer-line" />
              </motion.div>
              <motion.p className="text-[13px] tracking-[0.25em] uppercase text-foreground/70 font-body"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}>
                {t("home.tagline")}
              </motion.p>
            </motion.header>

            <motion.div className="flex flex-col items-center gap-5 mb-10"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}>
              <motion.button
                onClick={() => { haptic(); navigate("/reading"); }}
                className="group relative px-12 py-4.5 rounded-sm ornate-border focus-arcane
                  bg-gradient-to-b from-gold/12 via-gold/5 to-transparent
                  text-gold font-serif font-vi text-lg tracking-[0.18em] uppercase
                  animate-breathe transition-all duration-500
                  hover:from-gold/18 hover:arcane-glow-intense"
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                aria-label={t("home.cta")}>
                <span className="relative z-10">{t("home.cta")}</span>
              </motion.button>
              <motion.p className="text-sm text-foreground/60 italic font-body text-center max-w-[260px] leading-relaxed"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.5 }}>
                {t("home.ctaDesc")}
              </motion.p>
            </motion.div>

            <motion.div className="w-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.7 }}>
              <DailyPassage />
            </motion.div>

            <motion.footer className="flex flex-col items-center gap-3 mt-8"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.6 }}>
              {totalReadings > 0 && (
                <p className="text-xs text-gold/50 tracking-[0.15em] font-body">
                  {t("home.reflections", totalReadings)}
                </p>
              )}
              <Ornament variant="dot" size="sm" />
            </motion.footer>
          </div>
        </ScreenContainer>
      </PageTransition>
    </>
  );
}