import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useReading, SavedReading } from "@/lib/reading-context";
import { useI18n } from "@/lib/i18n-context";
import ScreenContainer from "@/components/ScreenContainer";
import Ornament from "@/components/Ornament";
import AmbientParticles from "@/components/AmbientParticles";
import PageTransition from "@/components/PageTransition";
import ShareCard from "@/components/ShareCard";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Trash2, Share2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

function ReadingCard({ reading, index, onDelete, onShare }: {
  reading: SavedReading;
  index: number;
  onDelete: (id: string) => void;
  onShare: (reading: SavedReading) => void;
}) {
  const { lang, t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const date = new Date(reading.createdAt);
  const dateStr = date.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <motion.article
      className="relative rounded-sm p-5 sm:p-6 glass-arcane ornate-border
                 hover:arcane-glow transition-all duration-500 group"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      layout
    >
      {/* Actions — always visible on mobile */}
      <div className="absolute top-3 right-3 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
        <motion.button
          onClick={() => onShare(reading)}
          whileTap={{ scale: 0.9 }}
          className="p-2 text-muted-foreground/40 hover:text-gold/60 transition-colors"
          aria-label={t("passage.share")}
        >
          <Share2 className="w-3.5 h-3.5" />
        </motion.button>
        <motion.button
          onClick={() => onDelete(reading.id)}
          whileTap={{ scale: 0.9 }}
          className="p-2 text-muted-foreground/40 hover:text-destructive/60 transition-colors"
          aria-label={t("mirror.delete")}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      <div className="flex items-center justify-between mb-3 sm:mb-4 pr-16">
        <div className="flex items-center gap-2">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
            <path d="M4 0 L5.2 2.8 L8 4 L5.2 5.2 L4 8 L2.8 5.2 L0 4 L2.8 2.8 Z"
              fill="hsl(var(--gold) / 0.35)" />
          </svg>
          <span className={`text-xs tracking-[0.1em] text-foreground/80 ${lang === "vi" ? "font-vi" : "font-serif"}`}>
            {reading.symbolName || reading.symbol.i18nKey}
          </span>
        </div>
        <time className="text-[9px] text-muted-foreground/30 font-body" dateTime={date.toISOString()}>
          {dateStr}
        </time>
      </div>

      <blockquote className={`text-xs sm:text-sm font-body italic text-foreground/60 leading-[1.8] sm:leading-[1.9] tracking-wide ${expanded ? "" : "line-clamp-3"}`}>
        &ldquo;{reading.passage.text}&rdquo;
      </blockquote>

      <div className="flex items-center gap-2 mt-3 sm:mt-4" aria-hidden="true">
        <div className="w-4 h-px bg-gold/15" />
        <cite className="text-[8px] sm:text-[9px] text-muted-foreground/30 tracking-[0.1em] uppercase font-serif not-italic">
          {reading.passage.reference}
        </cite>
      </div>

      {reading.aiResponse && expanded && (
        <motion.p
          className="text-[11px] sm:text-xs text-foreground/50 leading-relaxed mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gold/5 font-body italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {reading.aiResponse}
        </motion.p>
      )}

      {/* Expand/collapse toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 flex items-center gap-1.5 text-[10px] text-gold/50 hover:text-gold/70 font-body italic tracking-wider transition-colors"
        aria-label={expanded ? t("mirror.collapse") : t("mirror.expand")}
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? t("mirror.collapse") : t("mirror.expand")}
      </button>
    </motion.article>
  );
}

export default function MirrorScreen() {
  const { savedReadings, deleteReading } = useReading();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [shareReading, setShareReading] = useState<SavedReading | null>(null);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return savedReadings;
    const q = searchQuery.toLowerCase();
    return savedReadings.filter(r =>
      r.passage.text.toLowerCase().includes(q) ||
      r.symbolName.toLowerCase().includes(q) ||
      r.passage.reference.toLowerCase().includes(q) ||
      (r.aiResponse && r.aiResponse.toLowerCase().includes(q))
    );
  }, [savedReadings, searchQuery]);

  const handleDelete = (id: string) => {
    deleteReading(id);
    toast.success(t("mirror.deleted"));
  };

  return (
    <PageTransition variant="mirror">
      <ScreenContainer>
        <AmbientParticles count={8} />

        <div className="flex-1 flex flex-col px-5 sm:px-6 py-8 max-w-md mx-auto w-full pb-28 overflow-y-auto">
          {/* Header */}
          <motion.header
            className="flex flex-col items-center gap-4 sm:gap-5 pt-8 sm:pt-10 pb-4 sm:pb-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Ornament variant="eye" />
            <h1 className="text-xl sm:text-2xl font-serif font-normal text-gold-gradient tracking-[0.2em] font-vi">
              {t("mirror.title")}
            </h1>
            <Ornament variant="line" />
            <p className="text-[9px] sm:text-[10px] text-muted-foreground/35 text-center tracking-[0.2em] uppercase font-body font-vi">
              {savedReadings.length > 0
                ? t("mirror.saved", savedReadings.length)
                : t("mirror.empty")
              }
            </p>
          </motion.header>

          {/* Search bar */}
          {savedReadings.length > 0 && (
            <motion.div
              className="relative mb-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("mirror.search")}
                className="w-full pl-9 pr-9 py-2.5 rounded-sm bg-surface/30 border border-border/20
                           text-xs font-body text-foreground/70 placeholder:text-muted-foreground/25
                           focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/10
                           transition-all duration-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-foreground/50 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          )}

          {/* Readings */}
          {savedReadings.length === 0 ? (
            <motion.div
              className="flex-1 flex flex-col items-center justify-center gap-5 sm:gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              role="status"
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-0 -m-8 rounded-full"
                  style={{
                    background: "radial-gradient(circle, hsl(var(--mystic) / 0.06) 0%, transparent 70%)",
                  }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
                {[0, 1, 2].map(i => (
                  <motion.div key={i}
                    className="absolute rounded-full border"
                    style={{
                      borderColor: `hsl(var(--gold) / ${0.08 - i * 0.02})`,
                      inset: -(12 + i * 14),
                    }}
                    animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                    transition={{ duration: 60 + i * 20, repeat: Infinity, ease: "linear" }}
                  />
                ))}
                <Ornament variant="sigil" size="lg" />
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground/35 text-center leading-relaxed max-w-[260px] sm:max-w-xs font-body italic tracking-wide mt-6">
                {t("mirror.emptyDesc")}
              </p>
              <motion.button
                onClick={() => navigate("/reading")}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="mt-3 sm:mt-4 px-6 sm:px-8 py-2.5 sm:py-3 rounded-sm ornate-border focus-arcane
                           bg-gradient-to-b from-gold/10 to-transparent
                           text-gold font-serif text-xs sm:text-sm tracking-[0.2em] uppercase
                           hover:arcane-glow transition-all duration-500"
              >
                {t("mirror.startCta")}
              </motion.button>
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.p
              className="text-xs text-muted-foreground/35 text-center py-12 font-body italic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {t("mirror.noResults")}
            </motion.p>
          ) : (
            <div className="flex flex-col gap-3 sm:gap-4" role="feed" aria-label="Reflections">
              <AnimatePresence mode="popLayout">
                {filtered.map((reading, i) => (
                  <ReadingCard
                    key={reading.id}
                    reading={reading}
                    index={i}
                    onDelete={handleDelete}
                    onShare={setShareReading}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Share card modal */}
        {shareReading && (
          <ShareCard
            passage={shareReading.passage}
            symbolName={shareReading.symbolName}
            open={!!shareReading}
            onClose={() => setShareReading(null)}
          />
        )}
      </ScreenContainer>
    </PageTransition>
  );
}
