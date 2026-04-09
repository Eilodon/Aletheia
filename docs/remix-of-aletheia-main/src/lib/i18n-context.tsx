import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { translations } from "./translations";

export type Lang = "vi" | "en";

type TranslationValue = string | ((...args: any[]) => string) | readonly string[];

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, ...args: any[]) => string;
  tArray: (key: string) => string[];
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem("aletheia-lang");
      return (saved === "en" || saved === "vi") ? saved : "vi";
    } catch { return "vi"; }
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("aletheia-lang", l);
    document.documentElement.lang = l;
    // Update document title based on language
    document.title = l === "en"
      ? "Aletheia — Not a fortune. A mirror."
      : "Aletheia — Không phải bói toán. Là gương soi.";
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = lang === "en"
      ? "Aletheia — Not a fortune. A mirror."
      : "Aletheia — Không phải bói toán. Là gương soi.";
  }, [lang]);

  const t = useCallback((key: string, ...args: any[]): string => {
    const val = (translations[lang] as unknown as Record<string, TranslationValue>)[key];
    if (typeof val === "function") return val(...args);
    if (typeof val === "string") return val;
    return key;
  }, [lang]);

  const tArray = useCallback((key: string): string[] => {
    const val = (translations[lang] as unknown as Record<string, TranslationValue>)[key];
    if (Array.isArray(val)) return [...val];
    return [];
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, tArray }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
