import { useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n-context";
import { Passage } from "@/lib/reading-context";
import Ornament from "@/components/Ornament";
import OrnateCorners from "@/components/OrnateCorners";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share2 } from "lucide-react";
import { toast } from "sonner";

interface ShareCardProps {
  passage: Passage;
  symbolName: string;
  open: boolean;
  onClose: () => void;
}

export default function ShareCard({ passage, symbolName, open, onClose }: ShareCardProps) {
  const { t } = useI18n();
  const cardRef = useRef<HTMLDivElement>(null);

  const handleShare = useCallback(async () => {
    const shareText = `"${passage.text}"\n\n— ${passage.reference}\n\n✦ ${symbolName} · Aletheia`;

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success(t("passage.copied"), { description: t("passage.copiedDesc") });
    }
  }, [passage, symbolName, t]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-void/85 backdrop-blur-md" onClick={onClose} />

          <motion.div
            className="relative w-full max-w-sm"
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Close button */}
            <motion.button
              onClick={onClose}
              className="absolute -top-10 right-0 text-muted-foreground/40 hover:text-foreground/60 transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5" />
            </motion.button>

            {/* The shareable card — premium design */}
            <div
              ref={cardRef}
              className="relative rounded-sm overflow-hidden"
            >
              {/* Gradient mesh background */}
              <div className="absolute inset-0"
                style={{
                  background: `
                    radial-gradient(ellipse at 20% 20%, hsl(var(--mystic) / 0.08) 0%, transparent 50%),
                    radial-gradient(ellipse at 80% 80%, hsl(var(--gold) / 0.06) 0%, transparent 50%),
                    radial-gradient(ellipse at 50% 50%, hsl(var(--ember) / 0.03) 0%, transparent 60%),
                    linear-gradient(135deg, hsl(var(--background)), hsl(var(--card)))
                  `,
                }}
              />

              {/* Watermark pattern */}
              <div className="absolute inset-0 opacity-[0.02]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 5 L23 17 L35 20 L23 23 L20 35 L17 23 L5 20 L17 17 Z' fill='%23C9922B' fill-opacity='0.5'/%3E%3C/svg%3E")`,
                  backgroundSize: "40px 40px",
                }}
              />

              <div className="relative p-8 sm:p-10 glass-arcane ornate-border parchment-texture">
                <OrnateCorners inset={6} intensity="subtle" />

                {/* Top decoration */}
                <div className="flex justify-center mb-5">
                  <Ornament variant="eye" size="sm" />
                </div>

                {/* Symbol name with decorative flanking */}
                <div className="flex items-center justify-center gap-3 mb-5">
                  <div className="w-8 h-px bg-gradient-to-r from-transparent to-gold/25" />
                  <p className="text-[10px] tracking-[0.3em] uppercase text-gold/50 font-serif">
                    {symbolName}
                  </p>
                  <div className="w-8 h-px bg-gradient-to-l from-transparent to-gold/25" />
                </div>

                {/* Passage */}
                <blockquote className="text-sm sm:text-base font-body italic text-foreground/80 leading-[2] text-center tracking-wide">
                  &ldquo;{passage.text}&rdquo;
                </blockquote>

                {/* Reference */}
                <div className="flex justify-center mt-5" aria-hidden="true">
                  <Ornament variant="line" />
                </div>
                <cite className="block text-[9px] text-muted-foreground/35 text-center mt-3 tracking-[0.15em] uppercase font-serif not-italic">
                  {passage.reference}
                </cite>

                {/* Branding with decorative border */}
                <div className="flex items-center justify-center gap-3 mt-7">
                  <div className="w-6 h-px bg-gold/10" />
                  <p className="text-[8px] text-muted-foreground/25 tracking-[0.4em] uppercase font-display">
                    ALETHEIA
                  </p>
                  <div className="w-6 h-px bg-gold/10" />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-4">
              <motion.button
                onClick={handleShare}
                whileTap={{ scale: 0.97 }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-sm ornate-border
                           bg-gradient-to-b from-gold/12 to-gold/5
                           text-gold text-xs font-serif tracking-[0.15em] uppercase
                           hover:arcane-glow transition-all duration-500"
              >
                <Share2 className="w-3.5 h-3.5" />
                {t("passage.share")}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
