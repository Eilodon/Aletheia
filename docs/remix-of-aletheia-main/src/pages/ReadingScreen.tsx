import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useReading, Symbol as ReadingSymbol } from "@/lib/reading-context";
import { useI18n } from "@/lib/i18n-context";
import ScreenContainer from "@/components/ScreenContainer";
import TarotFrame from "@/components/TarotFrame";
import Ornament from "@/components/Ornament";
import OrnateCorners from "@/components/OrnateCorners";
import AmbientParticles from "@/components/AmbientParticles";
import PageTransition from "@/components/PageTransition";
import TypewriterText from "@/components/TypewriterText";
import { Share2, Check, ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "situation" | "cards" | "ritual" | "passage";

// ═══ Symbol SVG Icons ═══
const SYMBOL_ICONS: Record<string, (props: { className?: string }) => JSX.Element> = {
  fire: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2C8 8 4 12 4 16a8 8 0 0016 0c0-4-4-8-8-14z" stroke="hsl(var(--gold))" strokeWidth="1" fill="hsl(var(--gold) / 0.05)" />
      <path d="M12 8c-2 3-4 5-4 7a4 4 0 008 0c0-2-2-4-4-7z" stroke="hsl(var(--gold) / 0.5)" strokeWidth="0.5" fill="hsl(var(--gold) / 0.08)" />
    </svg>
  ),
  water: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2C8 8 4 12 4 16a8 8 0 0016 0c0-4-4-8-8-14z" stroke="hsl(var(--mystic))" strokeWidth="1" fill="hsl(var(--mystic) / 0.05)" />
      <path d="M8 16c0 2 2 4 4 4s4-2 4-4" stroke="hsl(var(--mystic) / 0.4)" strokeWidth="0.5" fill="none" />
    </svg>
  ),
  mirror: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <ellipse cx="12" cy="12" rx="7" ry="9" stroke="hsl(var(--gold))" strokeWidth="1" fill="hsl(var(--gold) / 0.03)" />
      <ellipse cx="12" cy="12" rx="4" ry="6" stroke="hsl(var(--gold) / 0.3)" strokeWidth="0.5" fill="none" />
      <line x1="12" y1="21" x2="12" y2="23" stroke="hsl(var(--gold) / 0.5)" strokeWidth="1" />
      <line x1="8" y1="23" x2="16" y2="23" stroke="hsl(var(--gold) / 0.4)" strokeWidth="1" />
    </svg>
  ),
  root: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <line x1="12" y1="2" x2="12" y2="14" stroke="hsl(var(--gold))" strokeWidth="1" />
      <path d="M12 14 C12 18 6 22 4 22" stroke="hsl(var(--gold) / 0.6)" strokeWidth="0.8" fill="none" />
      <path d="M12 14 C12 20 18 22 20 22" stroke="hsl(var(--gold) / 0.6)" strokeWidth="0.8" fill="none" />
      <circle cx="12" cy="6" r="3" stroke="hsl(var(--gold) / 0.3)" strokeWidth="0.5" fill="hsl(var(--gold) / 0.05)" />
    </svg>
  ),
  moon: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M20 12A8 8 0 118 4c0 .5 0 1 .1 1.5A6 6 0 0018 12h2z" stroke="hsl(var(--gold))" strokeWidth="1" fill="hsl(var(--gold) / 0.05)" />
    </svg>
  ),
  door: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="6" y="2" width="12" height="20" rx="1" stroke="hsl(var(--gold))" strokeWidth="1" fill="hsl(var(--gold) / 0.03)" />
      <circle cx="15" cy="13" r="0.8" fill="hsl(var(--gold) / 0.5)" />
    </svg>
  ),
  serpent: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 18 C4 10 12 6 12 2 C12 6 20 10 20 18" stroke="hsl(var(--gold))" strokeWidth="1" fill="none" />
      <circle cx="10" cy="4" r="0.5" fill="hsl(var(--gold) / 0.5)" />
      <circle cx="14" cy="4" r="0.5" fill="hsl(var(--gold) / 0.5)" />
    </svg>
  ),
  chalice: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 4 L5 12 Q8 16 12 16 Q16 16 19 12 L17 4 Z" stroke="hsl(var(--gold))" strokeWidth="1" fill="hsl(var(--gold) / 0.04)" />
      <line x1="12" y1="16" x2="12" y2="20" stroke="hsl(var(--gold) / 0.6)" strokeWidth="0.8" />
      <line x1="8" y1="20" x2="16" y2="20" stroke="hsl(var(--gold) / 0.5)" strokeWidth="1" />
    </svg>
  ),
  star: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2 L14 9 L21 9 L15.5 13.5 L17.5 21 L12 16.5 L6.5 21 L8.5 13.5 L3 9 L10 9 Z"
        stroke="hsl(var(--gold))" strokeWidth="0.8" fill="hsl(var(--gold) / 0.05)" />
    </svg>
  ),
};

// ═══ Symbol Card (inline) ═══
function SymbolCard({
  symbol, displayName, flavorText, index, isRevealed, isSelected, onSelect,
}: {
  symbol: ReadingSymbol; displayName: string; flavorText: string;
  index: number; isRevealed: boolean; isSelected: boolean; onSelect: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const timer = setTimeout(() => setFlipped(true), 800 + index * 400);
    return () => clearTimeout(timer);
  }, [index]);

  const IconComponent = symbol.icon ? SYMBOL_ICONS[symbol.icon] : null;

  return (
    <motion.div
      className="flex-1 min-w-0 cursor-pointer"
      onClick={() => isRevealed && !isSelected && onSelect()}
      role="button"
      tabIndex={isRevealed && !isSelected ? 0 : -1}
      onKeyDown={e => e.key === "Enter" && isRevealed && !isSelected && onSelect()}
      aria-label={flipped ? t("wildcard.select", displayName) : t("wildcard.unflipped")}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.12, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="aspect-[2/3] relative" style={{ perspective: "1200px" }}>
        <div
          className="w-full h-full transition-transform relative"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            transitionDuration: "1s",
            transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Front — card back */}
          <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
            <TarotFrame className="w-full h-full">
              <div className="flex flex-col items-center justify-center h-full gap-2 py-6">
                <svg width="20" height="20" viewBox="0 0 28 28" fill="none" className="animate-glow-pulse" aria-hidden="true">
                  <circle cx="14" cy="14" r="10" stroke="hsl(var(--gold) / 0.2)" strokeWidth="0.4" />
                  <path d="M14 4 L16 12 L24 14 L16 16 L14 24 L12 16 L4 14 L12 12 Z"
                    stroke="hsl(var(--gold) / 0.2)" strokeWidth="0.4" fill="hsl(var(--gold) / 0.04)" />
                  <circle cx="14" cy="14" r="2" fill="hsl(var(--gold) / 0.2)" />
                </svg>
                <span className="text-[7px] text-muted-foreground/30 tracking-[0.25em] uppercase font-body">
                  {t("wildcard.touch")}
                </span>
              </div>
            </TarotFrame>
          </div>

          {/* Back — revealed */}
          <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <TarotFrame
              variant={isSelected ? "major" : "default"}
              glowing={isSelected}
              className={`w-full h-full transition-all duration-700
                ${isSelected ? "" : "hover:arcane-glow"}`}
            >
              <div className="flex flex-col items-center justify-between h-full py-4 px-2">
                {IconComponent ? (
                  <IconComponent className="w-7 h-7 opacity-60" />
                ) : (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={isSelected ? "opacity-70" : "opacity-25"} aria-hidden="true">
                    <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill="hsl(var(--gold))" />
                  </svg>
                )}
                <div className="flex flex-col items-center gap-2">
                  <span className={`text-base sm:text-lg tracking-wider font-serif
                    ${isSelected ? "text-gold-gradient" : "text-foreground"}`}>
                    {displayName}
                  </span>
                  <div className={`w-5 h-px ${isSelected ? "bg-gold/40" : "bg-gold/15"}`} aria-hidden="true" />
                </div>
                {flavorText && (
                  <span className={`text-[8px] sm:text-[9px] text-center leading-relaxed font-body italic tracking-wide
                    ${isSelected ? "text-gold/60" : "text-muted-foreground/50"}`}>
                    {flavorText}
                  </span>
                )}
              </div>
            </TarotFrame>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══ Ritual Overlay ═══
function RitualOverlay({ onComplete }: { onComplete: () => void }) {
  const { t, tArray } = useI18n();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const phrases = tArray("ritual.phrases");

  useEffect(() => {
    const t1 = setTimeout(() => setPhraseIndex(1), 1500);
    const t2 = setTimeout(() => setPhraseIndex(2), 2800);
    const t3 = setTimeout(() => onComplete(), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-center justify-center bg-background/95 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Expanding rings */}
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        {[0, 1, 2].map(i => (
          <motion.div key={i}
            className="absolute rounded-full"
            initial={{ width: 2, height: 2, opacity: 0 }}
            animate={{ width: (i + 1) * 80, height: (i + 1) * 80, opacity: 1 }}
            transition={{ duration: 2 + i * 0.3, delay: i * 0.2, ease: "easeOut" }}
            style={{
              border: `0.5px ${i % 2 === 0 ? 'solid' : 'dashed'}`,
              borderColor: `hsl(var(--gold) / ${0.12 - i * 0.03})`,
            }}
          />
        ))}
        <motion.div
          className="absolute rounded-full"
          initial={{ width: 0, height: 0, opacity: 0 }}
          animate={{ width: 80, height: 80, opacity: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          style={{
            background: "radial-gradient(circle, hsl(var(--gold) / 0.15) 0%, transparent 70%)",
          }}
        />
      </div>

      <motion.div
        className="flex flex-col items-center gap-4 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <h2 className="text-xl font-serif text-gold-gradient tracking-[0.2em] font-vi text-center">
          {phrases[phraseIndex] || "..."}
        </h2>
        <div className="flex items-center gap-4" aria-hidden="true">
          <div className="w-8 h-px shimmer-line" />
          <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
            <path d="M3 0 L5 3 L3 6 L1 3 Z" fill="hsl(var(--gold) / 0.3)" />
          </svg>
          <div className="w-8 h-px shimmer-line" />
        </div>
      </motion.div>

      <motion.button
        onClick={onComplete}
        className="absolute bottom-12 text-[10px] text-muted-foreground/30 font-body tracking-[0.15em] uppercase hover:text-gold/50 transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        {t("ritual.skip")}
      </motion.button>
    </motion.div>
  );
}

// ═══ Main ReadingScreen ═══
export default function ReadingScreen() {
  const { session, passage, selectedSymbol, aiResponse, isAILoading,
    startReading, chooseSymbol, requestAI, saveReading, reset,
    canRead, readingsRemaining } = useReading();
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("situation");
  const [situation, setSituation] = useState("");
  const [isRevealed, setIsRevealed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRitual, setShowRitual] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Start cards phase
  const handleStartCards = useCallback(() => {
    if (!canRead) return;
    startReading(situation.trim() || undefined);
    setPhase("cards");
    setTimeout(() => setIsRevealed(true), 2500);
  }, [canRead, startReading, situation]);

  // Select a card
  const handleSelectCard = useCallback((symbolId: string) => {
    setSelectedId(symbolId);
    chooseSymbol(symbolId, lang);
    // Show ritual overlay after short delay
    setTimeout(() => setShowRitual(true), 800);
  }, [chooseSymbol, lang]);

  // After ritual, show passage
  const handleRitualComplete = useCallback(() => {
    setShowRitual(false);
    setPhase("passage");
  }, []);

  // AI
  const handleRequestAI = async () => {
    setShowAI(true);
    await requestAI(lang);
  };

  // Share
  const handleShare = async () => {
    if (!passage) return;
    const shareText = `"${passage.text}"\n\n— ${passage.reference}\n\nvia Aletheia`;
    if (navigator.share) {
      try { await navigator.share({ text: shareText }); } catch {}
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success(t("passage.copied"), { description: t("passage.copiedDesc") });
    }
  };

  // Complete
  const symbolName = selectedSymbol ? t(`symbol.${selectedSymbol.i18nKey}`) : "";
  const handleComplete = () => {
    saveReading(symbolName);
    reset();
    navigate("/");
  };

  const handleBack = () => {
    if (phase === "passage") {
      // Can't go back from passage easily, go home
      reset();
      navigate("/");
    } else if (phase === "cards") {
      reset();
      setPhase("situation");
      setIsRevealed(false);
      setSelectedId(null);
    } else {
      navigate("/");
    }
  };

  return (
    <PageTransition>
      <ScreenContainer>
        <AmbientParticles count={12} />

        {/* Back button */}
        <motion.button
          onClick={handleBack}
          className="absolute top-6 left-6 z-20 p-3 rounded-sm glass text-muted-foreground hover:text-gold transition-all duration-300 focus-arcane"
          aria-label={t("common.back")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>

        {/* Daily limit */}
        {phase === "situation" && (
          <motion.div
            className="absolute top-6 right-6 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full glass"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex gap-1">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < readingsRemaining ? "bg-gold/70" : "bg-muted/30"}`} />
              ))}
            </div>
            <span className="text-[9px] text-muted-foreground/40 font-body tracking-wider">
              {readingsRemaining}
            </span>
          </motion.div>
        )}

        <div className="flex-1 flex flex-col max-w-md mx-auto w-full overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* ═══ PHASE 1: Situation ═══ */}
            {phase === "situation" && (
              <motion.div
                key="situation"
                className="flex-1 flex flex-col justify-between px-6 py-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex flex-col items-center gap-4 pt-16">
                  <Ornament variant="diamond" />
                  <h1 className="text-xl font-serif font-normal text-foreground text-center mt-2 tracking-wider font-vi">
                    {t("situation.title")}
                  </h1>
                  <p className="text-xs text-muted-foreground text-center max-w-[280px] leading-relaxed font-body italic">
                    {t("situation.desc")}
                  </p>
                </div>

                <div className="flex-1 flex flex-col justify-center px-1">
                  <div className="relative">
                    <textarea
                      value={situation}
                      onChange={e => setSituation(e.target.value)}
                      placeholder={t("situation.placeholder")}
                      maxLength={500}
                      rows={4}
                      className="w-full bg-surface/40 border border-gold/10 rounded-sm p-5
                                 text-sm text-foreground font-body italic
                                 placeholder:text-muted-foreground/25 resize-none
                                 focus:outline-none focus:border-gold/25 focus:arcane-glow
                                 transition-all duration-500 leading-relaxed tracking-wide"
                    />
                    <span className="absolute bottom-3 right-4 text-[10px] text-muted-foreground/25">
                      {situation.length}/500
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pb-8">
                  <motion.button
                    onClick={handleStartCards}
                    disabled={!canRead}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 rounded-sm border border-gold/40 focus-arcane
                               bg-gradient-to-b from-gold/15 to-gold/8
                               text-gold font-serif font-vi text-sm tracking-[0.2em] uppercase
                               hover:from-gold/22 hover:to-gold/12 hover:border-gold/60 hover:arcane-glow
                               disabled:opacity-30 disabled:cursor-not-allowed
                               transition-all duration-500"
                  >
                    {t("situation.continue")}
                  </motion.button>
                  <button
                    onClick={() => { setSituation(""); handleStartCards(); }}
                    disabled={!canRead}
                    className="py-2.5 text-xs text-muted-foreground hover:text-gold/70 transition-colors font-body italic tracking-wide disabled:opacity-30"
                  >
                    {t("situation.skip")}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ═══ PHASE 2: Cards ═══ */}
            {phase === "cards" && session && (
              <motion.div
                key="cards"
                className="flex-1 flex flex-col px-4 py-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex flex-col items-center gap-2 pt-14 pb-6">
                  <h1 className="text-lg font-serif font-normal text-foreground text-center tracking-[0.15em] font-vi">
                    {t("wildcard.title")}
                  </h1>
                  <p className="text-[10px] text-muted-foreground/50 text-center tracking-[0.1em] font-body italic">
                    {t("wildcard.waiting", session.symbols.length)}
                  </p>
                </div>

                {/* Cards */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex w-full gap-2 max-w-sm">
                    {session.symbols.map((symbol, index) => (
                      <SymbolCard
                        key={symbol.id}
                        symbol={symbol}
                        displayName={t(`symbol.${symbol.i18nKey}`)}
                        flavorText={t(`symbol.${symbol.i18nKey}.flavor`)}
                        index={index}
                        isRevealed={isRevealed}
                        isSelected={selectedId === symbol.id}
                        onSelect={() => handleSelectCard(symbol.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Auto-choose hint */}
                {isRevealed && !selectedId && (
                  <motion.div
                    className="flex flex-col items-center gap-3 pb-8 pt-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <p className="text-[10px] text-muted-foreground/40 tracking-[0.15em] uppercase font-body">
                      {t("wildcard.touch")}
                    </p>
                    <motion.button
                      onClick={() => {
                        if (!session) return;
                        const random = session.symbols[Math.floor(Math.random() * session.symbols.length)];
                        handleSelectCard(random.id);
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="py-2 px-5 rounded-sm glass text-[10px] text-gold/70 font-serif
                                 tracking-[0.15em] uppercase hover:arcane-glow hover:text-gold transition-all duration-500"
                    >
                      {t("wildcard.letUniverse")}
                    </motion.button>
                  </motion.div>
                )}
                {selectedId && (
                  <motion.p
                    className="text-sm text-gold/70 font-serif italic tracking-wider text-center pb-8"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {t("wildcard.opening")}
                  </motion.p>
                )}
              </motion.div>
            )}

            {/* ═══ PHASE 3: Passage ═══ */}
            {phase === "passage" && passage && session && (
              <motion.div
                key="passage"
                className="flex-1 flex flex-col px-5 py-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
              >
                {/* Header */}
                <motion.header className="flex flex-col items-center gap-2 pt-12 pb-5">
                  <Ornament variant="eye" size="sm" />
                  <p className="text-[10px] tracking-[0.3em] uppercase text-gold-gradient mt-2 font-serif">
                    {symbolName}
                  </p>
                  <div className="flex items-center gap-3 mt-1" aria-hidden="true">
                    <div className="w-6 h-px shimmer-line" />
                    <svg width="5" height="5" viewBox="0 0 5 5" fill="none">
                      <path d="M2.5 0 L4 2.5 L2.5 5 L1 2.5 Z" fill="hsl(var(--gold) / 0.3)" />
                    </svg>
                    <div className="w-6 h-px shimmer-line" />
                  </div>
                  <p className="text-[9px] text-muted-foreground/45 tracking-[0.2em] uppercase">
                    {t(session.sourceKey)}
                  </p>
                </motion.header>

                {/* Passage Card */}
                <motion.article
                  className="relative rounded-sm p-6 glass-arcane ornate-border parchment-texture mb-5"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.2 }}
                >
                  <OrnateCorners inset={6} intensity="medium" />
                  <blockquote className="text-base font-body font-normal text-foreground/90 leading-[2] text-center italic tracking-wide pt-2">
                    &ldquo;{passage.text}&rdquo;
                  </blockquote>
                  <div className="flex justify-center mt-5" aria-hidden="true">
                    <Ornament variant="line" />
                  </div>
                  <cite className="block text-[9px] text-muted-foreground/40 text-center mt-4 tracking-[0.15em] uppercase font-serif not-italic pb-1">
                    {passage.reference}
                  </cite>
                </motion.article>

                {/* AI Section */}
                <motion.div className="flex flex-col gap-3 mb-6"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  {!aiResponse && !showAI && (
                    <motion.button
                      onClick={handleRequestAI}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="mx-auto flex items-center gap-3 px-8 py-3 rounded-sm
                                 glass text-foreground/70 text-xs font-body italic tracking-wider
                                 border border-gold/20 hover:border-gold/40 hover:text-gold/80
                                 hover:bg-gold/5 transition-all duration-500"
                    >
                      <span className="text-sm text-gold/50">✦</span>
                      {t("passage.requestAI")}
                      <span className="text-sm text-gold/50">✦</span>
                    </motion.button>
                  )}
                  {showAI && isAILoading && (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <Ornament variant="sigil" size="sm" />
                      <p className="text-[10px] text-muted-foreground/40 font-body italic tracking-wider">
                        {t("passage.listening")}
                      </p>
                    </div>
                  )}
                  {aiResponse && (
                    <motion.div className="rounded-sm p-5 glass-arcane ornate-border"
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="flex items-center gap-2 mb-3">
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M4 0 L5 3 L8 4 L5 5 L4 8 L3 5 L0 4 L3 3 Z" fill="hsl(var(--gold) / 0.4)" />
                        </svg>
                        <p className="text-[9px] tracking-[0.25em] uppercase text-gold/60 font-serif">
                          {t("passage.interpretation")}
                        </p>
                      </div>
                      <TypewriterText text={aiResponse} className="text-xs text-foreground/70 leading-[1.9] font-body italic" />
                    </motion.div>
                  )}
                </motion.div>

                <div className="flex-1" />

                {/* Actions */}
                <motion.div className="flex flex-col gap-2.5 pb-6"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                  <motion.button
                    onClick={() => setShowConfirm(true)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-sm border border-gold/40
                               bg-gradient-to-b from-gold/15 to-gold/8
                               text-gold font-serif text-xs tracking-[0.2em] uppercase
                               hover:border-gold/60 hover:from-gold/22 hover:arcane-glow-intense
                               transition-all duration-500"
                  >
                    <Check className="w-3 h-3" />
                    {t("passage.complete")}
                  </motion.button>
                  <motion.button
                    onClick={handleShare}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-sm
                               border border-gold/15 text-muted-foreground/50 text-xs font-body italic tracking-wider
                               hover:text-gold/60 hover:border-gold/25 transition-all duration-300"
                  >
                    <Share2 className="w-3 h-3" />
                    {t("passage.share")}
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ritual overlay */}
          <AnimatePresence>
            {showRitual && <RitualOverlay onComplete={handleRitualComplete} />}
          </AnimatePresence>
        </div>

        {/* Confirm modal */}
        <AnimatePresence>
          {showConfirm && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center px-6"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
              <motion.div
                className="relative rounded-sm p-6 glass-arcane ornate-border max-w-sm w-full"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <Ornament variant="eye" size="sm" />
                <h2 className="text-sm font-serif text-gold-gradient tracking-[0.15em] mt-4 text-center font-vi">
                  {t("passage.confirmTitle")}
                </h2>
                <p className="text-xs text-muted-foreground/50 text-center mt-3 font-body italic leading-relaxed">
                  {t("passage.confirmDesc")}
                </p>
                <div className="flex gap-3 mt-6">
                  <motion.button
                    onClick={() => setShowConfirm(false)}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-2.5 rounded-sm glass text-foreground/50 text-xs font-body tracking-wider"
                  >
                    {t("passage.cancel")}
                  </motion.button>
                  <motion.button
                    onClick={handleComplete}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-2.5 rounded-sm border border-gold/40
                               bg-gradient-to-b from-gold/15 to-gold/8
                               text-gold text-xs font-serif tracking-[0.15em] uppercase"
                  >
                    {t("passage.confirmSave")}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </ScreenContainer>
    </PageTransition>
  );
}
