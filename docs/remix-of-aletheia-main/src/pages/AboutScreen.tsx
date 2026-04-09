import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n-context";
import ScreenContainer from "@/components/ScreenContainer";
import AmbientParticles from "@/components/AmbientParticles";
import Ornament from "@/components/Ornament";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section className="mb-6 sm:mb-8" {...fadeUp}>
      <h2 className="text-xs sm:text-sm font-serif text-gold/70 tracking-[0.2em] uppercase mb-3 font-vi">{title}</h2>
      <div className="text-xs sm:text-sm text-foreground/60 font-body italic leading-[1.9] sm:leading-[2] space-y-3">
        {children}
      </div>
    </motion.section>
  );
}

export default function AboutScreen() {
  const navigate = useNavigate();
  const { t } = useI18n();

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
            <motion.button
              onClick={() => navigate(-1)}
              className="self-start flex items-center gap-2 text-muted-foreground/50 hover:text-gold/60 transition-colors text-xs font-body tracking-wider focus-arcane rounded-sm px-1 py-0.5"
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {t("common.back")}
            </motion.button>

            <Ornament variant="eye" size="sm" />
            
            <h1 className="text-2xl sm:text-3xl font-display font-normal tracking-[0.25em] text-gold-gradient">
              ALETHEIA
            </h1>
            
            <p className="text-[9px] tracking-[0.4em] uppercase text-muted-foreground/40 font-body">
              {t("home.tagline")}
            </p>
            
            <Ornament variant="line" />
          </motion.header>

          {/* Content */}
          <motion.div variants={stagger} initial="initial" animate="animate">
            <Section title={t("about.whatTitle")}>
              <p>{t("about.whatText1")}</p>
              <p>{t("about.whatText2")}</p>
            </Section>

            <Section title={t("about.howTitle")}>
              <div className="space-y-2">
                {[1, 2, 3, 4].map(step => (
                  <div key={step} className="flex gap-3 items-start">
                    <span className="text-gold/30 text-[10px] font-serif mt-0.5 shrink-0">{step}.</span>
                    <p className="text-foreground/55">{t(`about.step${step}`)}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title={t("about.sourcesTitle")}>
              <p>{t("about.sourcesText")}</p>
            </Section>

            <Section title={t("about.privacyTitle")}>
              <p>{t("about.privacyText")}</p>
            </Section>

            <Section title={t("about.meaningTitle")}>
              <motion.div
                className="rounded-sm p-5 glass-arcane ornate-border text-center"
                {...fadeUp}
              >
                <p className="text-sm sm:text-base text-foreground/70 font-body italic leading-[2]">
                  {t("about.meaningText")}
                </p>
                <p className="text-[9px] text-muted-foreground/30 mt-3 tracking-[0.2em] uppercase font-serif">
                  {t("about.meaningSource")}
                </p>
              </motion.div>
            </Section>
          </motion.div>

          {/* Footer */}
          <motion.footer
            className="flex flex-col items-center gap-3 pt-4 pb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Ornament variant="cross" size="sm" />
            <p className="text-[9px] text-muted-foreground/30 tracking-[0.2em] uppercase font-body">
              {t("about.footer")}
            </p>
          </motion.footer>
        </div>
      </ScreenContainer>
    </PageTransition>
  );
}
