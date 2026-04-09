import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReading } from "@/lib/reading-context";
import { useI18n } from "@/lib/i18n-context";
import type { UserIntent } from "@/lib/reading-types";
import ScreenContainer from "@/components/ScreenContainer";
import AmbientParticles from "@/components/AmbientParticles";
import Ornament from "@/components/Ornament";
import { motion, AnimatePresence } from "framer-motion";

const INTENT_OPTIONS: { key: UserIntent; icon: string }[] = [
  { key: "clarity", icon: "🔮" },
  { key: "comfort", icon: "🌿" },
  { key: "challenge", icon: "⚡" },
  { key: "guidance", icon: "🌟" },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [selectedIntent, setSelectedIntent] = useState<UserIntent | null>(null);
  const { completeOnboarding } = useReading();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
    } else {
      completeOnboarding(selectedIntent || "clarity");
      navigate("/");
    }
  };

  const handleSkip = () => {
    completeOnboarding("clarity");
    navigate("/");
  };

  return (
    <ScreenContainer>
      <AmbientParticles count={8} />

      <div className="flex-1 flex flex-col items-center justify-between px-6 py-12 max-w-md mx-auto w-full min-h-0">
        {/* Top: Skip + Step indicators */}
        <div className="w-full flex items-center justify-between shrink-0">
          <div className="flex gap-2">
            {[0, 1].map(i => (
              <div
                key={i}
                className={`w-8 h-0.5 rounded-full transition-all duration-500 ${
                  i <= step ? "bg-gold/60" : "bg-muted/20"
                }`}
              />
            ))}
          </div>
          <motion.button
            onClick={handleSkip}
            className="text-[10px] text-muted-foreground/50 font-body tracking-[0.15em] uppercase
                       hover:text-gold/60 transition-colors"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {t("onboarding.skip")}
          </motion.button>
        </div>

        {/* Center: Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="flex flex-col items-center gap-4 text-center w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Step 0: Welcome + Language */}
            {step === 0 && (
              <>
                <Ornament variant="eye" size="lg" />
                <h1 className="text-2xl font-serif text-gold-gradient tracking-[0.2em] font-vi mt-2">
                  ALETHEIA
                </h1>
                <p className="text-sm text-foreground/70 font-body italic leading-relaxed max-w-[280px]">
                  {t("onboarding.welcome")}
                </p>
                <div className="flex gap-3 w-full max-w-[240px] mt-1">
                  {(["vi", "en"] as const).map(l => (
                    <motion.button
                      key={l}
                      onClick={() => setLang(l)}
                      whileTap={{ scale: 0.97 }}
                      className={`flex-1 py-2.5 rounded-sm border transition-all duration-300
                        ${lang === l
                          ? "border-gold/40 bg-gold/10 text-gold"
                          : "border-border/20 text-muted-foreground/50 hover:border-gold/20"
                        } font-serif text-sm tracking-wider`}
                    >
                      {l === "vi" ? "Tiếng Việt" : "English"}
                    </motion.button>
                  ))}
                </div>
              </>
            )}

            {/* Step 1: Choose intent */}
            {step === 1 && (
              <>
                <Ornament variant="sigil" size="sm" />
                <h2 className="text-lg font-serif text-foreground tracking-[0.15em] font-vi mt-1">
                  {t("onboarding.intentTitle")}
                </h2>
                <p className="text-xs text-muted-foreground/50 font-body italic max-w-[280px]">
                  {t("onboarding.intentDesc")}
                </p>
                <div className="grid grid-cols-2 gap-2.5 w-full max-w-[300px] mt-1">
                  {INTENT_OPTIONS.map(opt => (
                    <motion.button
                      key={opt.key}
                      onClick={() => setSelectedIntent(opt.key)}
                      whileTap={{ scale: 0.97 }}
                      className={`flex flex-col items-center gap-2 p-3.5 rounded-sm border transition-all duration-300
                        ${selectedIntent === opt.key
                          ? "border-gold/40 bg-gold/10 arcane-glow"
                          : "border-border/20 glass hover:border-gold/20"
                        }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className={`text-xs tracking-wider ${
                        selectedIntent === opt.key ? "text-gold" : "text-foreground/60"
                      } font-serif font-vi`}>
                        {t(`onboarding.intent.${opt.key}`)}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bottom: Continue button */}
        <motion.button
          onClick={handleNext}
          disabled={step === 1 && !selectedIntent}
          className="w-full max-w-[280px] py-3.5 rounded-sm border border-gold/40 shrink-0
                     bg-gradient-to-b from-gold/15 to-gold/8
                     text-gold font-serif text-sm tracking-[0.2em] uppercase
                     hover:from-gold/22 hover:to-gold/12 hover:border-gold/60 hover:arcane-glow
                     disabled:opacity-30 disabled:cursor-not-allowed
                     transition-all duration-500 focus-arcane font-vi"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          {step === 1 ? t("onboarding.begin") : t("onboarding.next")}
        </motion.button>
      </div>
    </ScreenContainer>
  );
}
