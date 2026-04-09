import { useMemo } from "react";
import { useI18n } from "@/lib/i18n-context";
import { getPassages } from "@/lib/reading-context";
import OrnateCorners from "@/components/OrnateCorners";
import { motion } from "framer-motion";

/**
 * Shows a "Passage of the Day" based on the current date.
 * Elegant, minimal card design with ornate filigree.
 */
export default function DailyPassage() {
  const { t, lang } = useI18n();

  const daily = useMemo(() => {
    const passages = getPassages(lang);
    const keys = Object.keys(passages);
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const index = seed % keys.length;
    const key = keys[index];
    return { passage: passages[key], symbolKey: key };
  }, [lang]);

  return (
    <motion.div
      className="relative rounded-sm px-5 py-5 sm:px-6 sm:py-6 glass-arcane ornate-border parchment-texture"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 2.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <OrnateCorners inset={4} intensity="subtle" />

      {/* Label */}
      <p className="text-[10px] tracking-[0.3em] uppercase text-gold/50 font-serif mb-3">
        {t("daily.title")}
      </p>

      {/* Quote */}
      <blockquote className="text-[15px] sm:text-base font-body italic text-foreground/80 leading-[1.85] tracking-wide">
        &ldquo;{daily.passage.text}&rdquo;
      </blockquote>

      {/* Source */}
      <div className="flex items-center gap-2 mt-3">
        <div className="w-5 h-px bg-gold/25" />
        <cite className="text-[11px] text-foreground/40 tracking-[0.12em] uppercase font-serif not-italic">
          {daily.passage.reference}
        </cite>
      </div>
    </motion.div>
  );
}
