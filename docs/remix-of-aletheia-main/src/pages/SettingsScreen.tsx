import { useState } from "react";
import { useI18n } from "@/lib/i18n-context";
import { useReading } from "@/lib/reading-context";
import { ALL_SOURCES } from "@/lib/passages-data";
import ScreenContainer from "@/components/ScreenContainer";
import AmbientParticles from "@/components/AmbientParticles";
import Ornament from "@/components/Ornament";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Trash2, BookOpen, Compass, ChevronDown, ChevronRight, Info, X } from "lucide-react";
import { toast } from "sonner";

const TRADITION_ICONS: Record<string, string> = {
  chinese: "☯", christian: "✝", islamic: "☪", sufi: "❋", stoic: "⚔", universal: "✦",
};

function SettingRow({ icon: Icon, label, description, action, danger = false }: {
  icon: React.ElementType; label: string; description?: string; action: React.ReactNode; danger?: boolean;
}) {
  return (
    <motion.div
      className="flex items-center justify-between gap-4 py-4 border-b border-border/20 last:border-b-0"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-start gap-3 min-w-0">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${danger ? "text-destructive/70" : "text-gold/50"}`} />
        <div className="min-w-0">
          <p className={`text-xs sm:text-sm font-body tracking-wide ${danger ? "text-destructive/80" : "text-foreground/80"}`}>
            {label}
          </p>
          {description && (
            <p className="text-[10px] text-muted-foreground/40 mt-0.5 font-body">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </motion.div>
  );
}

export default function SettingsScreen() {
  const { lang, setLang, t } = useI18n();
  const { savedReadings, clearAllReadings, readingsRemaining, aiRemaining,
    selectedSource, selectSource, preferredSourceId, setPreferredSource } = useReading();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const handleClearData = () => {
    clearAllReadings();
    setShowDeleteConfirm(false);
    toast.success(t("settings.cleared"), { description: t("settings.clearedDesc") });
  };

  const currentSourceName = preferredSourceId
    ? t(ALL_SOURCES.find(s => s.id === preferredSourceId)?.i18nKey || "source.aletheia")
    : t("settings.sourceRandom");

  return (
    <PageTransition>
      <ScreenContainer>
        <AmbientParticles count={6} />

        <div className="flex-1 flex flex-col px-5 sm:px-6 py-8 max-w-md mx-auto w-full pb-28 overflow-y-auto">
          {/* Header */}
          <motion.header
            className="flex flex-col items-center gap-4 pt-8 pb-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Ornament variant="sigil" size="sm" />
            <h1 className="text-xl sm:text-2xl font-serif font-normal text-gold-gradient tracking-[0.2em] font-vi">
              {t("settings.title")}
            </h1>
            <Ornament variant="line" />
          </motion.header>

          {/* Settings list */}
          <motion.section
            className="rounded-sm p-5 sm:p-6 glass-arcane ornate-border"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Language */}
            <SettingRow
              icon={Globe}
              label={t("settings.language")}
              description={t("settings.languageDesc")}
              action={
                <div className="flex gap-1 rounded-sm overflow-hidden border border-border/30">
                  {(["vi", "en"] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase font-serif transition-all duration-300
                        ${lang === l ? "bg-gold/15 text-gold" : "text-muted-foreground/40 hover:text-foreground/60"}`}
                    >
                      {l === "vi" ? "VI" : "EN"}
                    </button>
                  ))}
                </div>
              }
            />

            {/* Source preference */}
            <SettingRow
              icon={Compass}
              label={t("settings.sourcePreference")}
              description={t("settings.sourcePreferenceDesc")}
              action={
                <motion.button
                  onClick={() => setShowSourcePicker(!showSourcePicker)}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border/30
                             text-[10px] text-foreground/60 font-serif tracking-wider
                             hover:border-gold/30 hover:text-gold/70 transition-all duration-300"
                >
                  {currentSourceName}
                  <ChevronDown className={`w-3 h-3 transition-transform ${showSourcePicker ? "rotate-180" : ""}`} />
                </motion.button>
              }
            />

            {/* Source picker dropdown */}
            <AnimatePresence>
              {showSourcePicker && (
                <motion.div
                  className="pb-4 border-b border-border/20"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {/* Random option */}
                    <motion.button
                      onClick={() => { setPreferredSource(null); setShowSourcePicker(false); }}
                      whileTap={{ scale: 0.97 }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-sm border transition-all duration-300
                        ${!preferredSourceId
                          ? "border-gold/40 bg-gold/10 text-gold"
                          : "border-border/20 glass hover:border-gold/20 text-foreground/60"
                        }`}
                    >
                      <span className="text-lg opacity-60">🎲</span>
                      <span className="text-[9px] font-body tracking-wider">{t("settings.sourceRandom")}</span>
                    </motion.button>

                    {ALL_SOURCES.map(source => (
                      <motion.button
                        key={source.id}
                        onClick={() => { setPreferredSource(source.id); setShowSourcePicker(false); }}
                        whileTap={{ scale: 0.97 }}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-sm border transition-all duration-300
                          ${preferredSourceId === source.id
                            ? "border-gold/40 bg-gold/10 text-gold"
                            : "border-border/20 glass hover:border-gold/20 text-foreground/60"
                          }`}
                      >
                        <span className="text-lg opacity-60">{TRADITION_ICONS[source.tradition] || "✦"}</span>
                        <span className="text-[9px] font-body tracking-wider">{t(source.i18nKey)}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* About */}
            <SettingRow
              icon={Info}
              label={t("settings.about")}
              description={t("settings.aboutDesc")}
              action={
                <motion.button
                  onClick={() => setShowAbout(true)}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 text-muted-foreground/40 hover:text-gold/60 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </motion.button>
              }
            />

            {/* Reading count */}
            <SettingRow
              icon={BookOpen}
              label={t("settings.readings")}
              description={t("settings.readingsDesc", savedReadings.length)}
              action={
                <span className="text-xs text-gold/50 font-serif">{savedReadings.length}</span>
              }
            />

            {/* Clear data */}
            <SettingRow
              icon={Trash2}
              label={t("settings.clearData")}
              description={t("settings.clearDataDesc")}
              danger
              action={
                <motion.button
                  onClick={() => setShowDeleteConfirm(true)}
                  whileTap={{ scale: 0.95 }}
                  disabled={savedReadings.length === 0}
                  className="px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase font-serif
                             text-destructive/60 border border-destructive/20 rounded-sm
                             hover:bg-destructive/10 hover:text-destructive/80
                             disabled:opacity-30 disabled:cursor-not-allowed
                             transition-all duration-300"
                >
                  {t("settings.clear")}
                </motion.button>
              }
            />
          </motion.section>

          {/* Version */}
          <motion.p
            className="text-[9px] text-muted-foreground/25 text-center mt-6 tracking-[0.2em] uppercase font-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Aletheia v2.0 · {t("settings.madeWith")}
          </motion.p>
        </div>

        {/* Delete confirmation modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center px-6"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
              <motion.div
                className="relative rounded-sm p-6 glass-arcane ornate-border max-w-sm w-full"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <Ornament variant="eye" size="sm" />
                <h2 className="text-sm font-serif text-gold-gradient tracking-[0.15em] mt-4 text-center font-vi">
                  {t("settings.confirmTitle")}
                </h2>
                <p className="text-xs text-muted-foreground/50 text-center mt-3 font-body italic leading-relaxed">
                  {t("settings.confirmDesc", savedReadings.length)}
                </p>
                <div className="flex gap-3 mt-6">
                  <motion.button
                    onClick={() => setShowDeleteConfirm(false)}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-2.5 rounded-sm glass text-foreground/50 text-xs font-body tracking-wider"
                  >
                    {t("settings.cancel")}
                  </motion.button>
                  <motion.button
                    onClick={handleClearData}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-2.5 rounded-sm bg-destructive/20 border border-destructive/30
                               text-destructive text-xs font-serif tracking-[0.1em] uppercase"
                  >
                    {t("settings.confirmDelete")}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* About modal */}
        <AnimatePresence>
          {showAbout && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center px-6"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={() => setShowAbout(false)} />
              <motion.div
                className="relative rounded-sm p-6 glass-arcane ornate-border max-w-sm w-full max-h-[80vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <motion.button
                  onClick={() => setShowAbout(false)}
                  className="absolute top-4 right-4 p-1 text-muted-foreground/40 hover:text-gold/60 transition-colors z-10"
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>

                <div className="flex flex-col items-center gap-3 mb-5">
                  <Ornament variant="eye" size="sm" />
                  <h2 className="text-lg font-display font-normal tracking-[0.25em] text-gold-gradient">ALETHEIA</h2>
                  <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/40 font-body">{t("home.tagline")}</p>
                  <Ornament variant="line" />
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-[10px] font-serif text-gold/70 tracking-[0.2em] uppercase mb-2">{t("about.whatTitle")}</h3>
                    <p className="text-xs text-foreground/60 font-body italic leading-[1.9]">{t("about.whatText1")}</p>
                    <p className="text-xs text-foreground/60 font-body italic leading-[1.9] mt-2">{t("about.whatText2")}</p>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-serif text-gold/70 tracking-[0.2em] uppercase mb-2">{t("about.sourcesTitle")}</h3>
                    <p className="text-xs text-foreground/60 font-body italic leading-[1.9]">{t("about.sourcesText")}</p>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-serif text-gold/70 tracking-[0.2em] uppercase mb-2">{t("about.privacyTitle")}</h3>
                    <p className="text-xs text-foreground/60 font-body italic leading-[1.9]">{t("about.privacyText")}</p>
                  </div>
                  <div className="rounded-sm p-4 glass-arcane ornate-border text-center">
                    <p className="text-xs text-foreground/70 font-body italic leading-[1.9]">{t("about.meaningText")}</p>
                    <p className="text-[9px] text-muted-foreground/30 mt-2 tracking-[0.2em] uppercase font-serif">{t("about.meaningSource")}</p>
                  </div>
                </div>

                <p className="text-[9px] text-muted-foreground/25 text-center mt-5 tracking-[0.2em] uppercase font-body">
                  {t("about.footer")}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </ScreenContainer>
    </PageTransition>
  );
}
