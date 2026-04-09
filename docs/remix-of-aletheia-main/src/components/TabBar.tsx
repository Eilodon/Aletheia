import { useNavigate, useLocation } from "react-router-dom";
import { Home, Settings } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { motion } from "framer-motion";

function MirrorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.2">
      <ellipse cx="8" cy="7" rx="5" ry="6.5" />
      <line x1="8" y1="13.5" x2="8" y2="15" />
      <line x1="5.5" y1="15" x2="10.5" y2="15" />
    </svg>
  );
}

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  const tabs = [
    { path: "/", label: t("tab.home"), icon: Home },
    { path: "/mirror", label: t("tab.mirror"), icon: MirrorIcon },
    { path: "/settings", label: t("tab.settings"), icon: Settings },
  ];

  const readingPaths = ["/reading", "/onboarding"];
  if (readingPaths.some(p => location.pathname.startsWith(p))) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none safe-bottom">
      <motion.nav
        className="pointer-events-auto"
        aria-label="Navigation"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative glass-arcane rounded-sm px-1.5 py-1.5 flex gap-1 ornate-border">
          {/* Subtle top edge highlight */}
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" aria-hidden="true" />

          {tabs.map(tab => {
            const isActive = location.pathname === tab.path;
            return (
              <motion.button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                whileTap={{ scale: 0.93 }}
                className={`
                  relative flex items-center justify-center px-6 py-3 rounded-sm transition-all duration-400 focus-arcane
                  ${isActive
                    ? "text-gold"
                    : "text-muted-foreground hover:text-gold/70"
                  }
                `}
                aria-current={isActive ? "page" : undefined}
                aria-label={tab.label}
              >
                {/* Active glow background with enhanced effect */}
                {isActive && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-sm bg-gold/8"
                      layoutId="tab-active"
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    />
                    {/* Glowing underline */}
                    <motion.div
                      className="absolute bottom-0.5 left-3 right-3 h-px"
                      layoutId="tab-underline"
                      style={{
                        background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.5), transparent)",
                      }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    />
                    {/* Top glow dot */}
                    <motion.div
                      className="absolute top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold/40"
                      layoutId="tab-dot"
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </>
                )}
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <motion.div
                    animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                    transition={isActive ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
                  >
                    <tab.icon className="w-4 h-4" aria-hidden="true" />
                  </motion.div>
                  <span className={`text-[8px] tracking-[0.1em] uppercase font-body leading-none
                    ${isActive ? "text-gold/80" : "text-muted-foreground/50"}`}>
                    {tab.label}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.nav>
    </div>
  );
}
