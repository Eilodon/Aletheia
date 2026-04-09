import React, { createContext, useContext, useState, useCallback } from "react";
import type { Symbol, Passage, ReadingSession, SavedReading, UserState, UserIntent, MoodTag, ReadingState, Source } from "./reading-types";
import { FREE_READINGS_PER_DAY, FREE_AI_PER_DAY } from "./reading-types";
import { ALL_SYMBOLS, PASSAGES_VI, PASSAGES_EN, AI_RESPONSES_VI, AI_RESPONSES_EN, ALL_SOURCES, getRandomPassageFromSource } from "./passages-data";

export type { Symbol, Passage, ReadingSession, SavedReading, Source };

// ═══ Storage ═══
const STORAGE_KEY = "aletheia-readings";
const STORAGE_VERSION_KEY = "aletheia-storage-version";
const USER_STATE_KEY = "aletheia-user-state";
const PREFERRED_SOURCE_KEY = "aletheia-preferred-source";
const CURRENT_VERSION = 2;

function getToday(): string {
  return new Date().toLocaleDateString("en-CA");
}

function loadUserState(): UserState {
  try {
    const raw = localStorage.getItem(USER_STATE_KEY);
    if (!raw) return defaultUserState();
    const state: UserState = JSON.parse(raw);
    if (state.lastReadingDate !== getToday()) {
      state.readingsToday = 0;
      state.aiCallsToday = 0;
      state.lastReadingDate = null;
    }
    return state;
  } catch {
    return defaultUserState();
  }
}

function defaultUserState(): UserState {
  return {
    readingsToday: 0,
    aiCallsToday: 0,
    lastReadingDate: null,
    onboardingComplete: false,
    userIntent: null,
    sessionCount: 0,
  };
}

function saveUserState(state: UserState) {
  localStorage.setItem(USER_STATE_KEY, JSON.stringify(state));
}

function migrateStorage(): SavedReading[] {
  try {
    const version = parseInt(localStorage.getItem(STORAGE_VERSION_KEY) || "0", 10);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    let data = JSON.parse(raw);
    if (version < 1) {
      data = data.map((r: any) => ({
        ...r,
        id: r.id || crypto.randomUUID(),
        symbolName: r.symbolName || r.symbol?.i18nKey || "",
      }));
    }
    localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_VERSION));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  } catch {
    return [];
  }
}

function pickRandomSymbols(): Symbol[] {
  const shuffled = [...ALL_SYMBOLS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

export function getPassages(lang: "vi" | "en"): Record<string, Passage> {
  return lang === "en" ? PASSAGES_EN : PASSAGES_VI;
}

export function getAIResponse(symbolId: string, lang: "vi" | "en"): string {
  const responses = lang === "en" ? AI_RESPONSES_EN : AI_RESPONSES_VI;
  return responses[symbolId] || (lang === "en" ? "Contemplating..." : "Đang suy ngẫm...");
}

interface ReadingContextType {
  session: ReadingSession | null;
  passage: Passage | null;
  selectedSymbol: Symbol | null;
  selectedSource: Source | null;
  aiResponse: string | null;
  isAILoading: boolean;
  readingState: ReadingState;
  savedReadings: SavedReading[];
  totalReadings: number;
  userState: UserState;
  canRead: boolean;
  canUseAI: boolean;
  readingsRemaining: number;
  aiRemaining: number;
  preferredSourceId: string | null;

  selectSource: (sourceId: string) => void;
  setPreferredSource: (sourceId: string | null) => void;
  startReading: (situation?: string) => void;
  chooseSymbol: (symbolId: string, lang: "vi" | "en") => void;
  requestAI: (lang: "vi" | "en") => Promise<void>;
  saveReading: (symbolName: string, moodTag?: MoodTag) => void;
  clearAllReadings: () => void;
  deleteReading: (id: string) => void;
  reset: () => void;
  completeOnboarding: (intent: UserIntent) => void;
  isOnboardingComplete: boolean;
}

const ReadingContext = createContext<ReadingContextType | null>(null);

export function ReadingProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ReadingSession | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol | null>(null);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [readingState, setReadingState] = useState<ReadingState>("idle");
  const [savedReadings, setSavedReadings] = useState<SavedReading[]>(migrateStorage);
  const [userState, setUserState] = useState<UserState>(loadUserState);
  const [preferredSourceId, setPreferredSourceId] = useState<string | null>(() => {
    try { return localStorage.getItem(PREFERRED_SOURCE_KEY); } catch { return null; }
  });

  const totalReadings = savedReadings.length;
  const canRead = userState.readingsToday < FREE_READINGS_PER_DAY;
  const canUseAI = userState.aiCallsToday < FREE_AI_PER_DAY;
  const readingsRemaining = Math.max(0, FREE_READINGS_PER_DAY - userState.readingsToday);
  const aiRemaining = Math.max(0, FREE_AI_PER_DAY - userState.aiCallsToday);

  const updateUserState = useCallback((updater: (prev: UserState) => UserState) => {
    setUserState(prev => {
      const next = updater(prev);
      saveUserState(next);
      return next;
    });
  }, []);

  const setPreferredSource = useCallback((sourceId: string | null) => {
    setPreferredSourceId(sourceId);
    if (sourceId) {
      localStorage.setItem(PREFERRED_SOURCE_KEY, sourceId);
      const source = ALL_SOURCES.find(s => s.id === sourceId);
      if (source) setSelectedSource(source);
    } else {
      localStorage.removeItem(PREFERRED_SOURCE_KEY);
      setSelectedSource(null);
    }
  }, []);

  const selectSource = useCallback((sourceId: string) => {
    const source = ALL_SOURCES.find(s => s.id === sourceId);
    if (source) {
      setSelectedSource(source);
      setReadingState("source_selection");
    }
  }, []);

  const startReading = useCallback((situation?: string) => {
    const symbols = pickRandomSymbols();

    // Use preferred source or random
    let source: Source;
    if (preferredSourceId) {
      source = ALL_SOURCES.find(s => s.id === preferredSourceId) || ALL_SOURCES[Math.floor(Math.random() * ALL_SOURCES.length)];
    } else {
      source = ALL_SOURCES[Math.floor(Math.random() * ALL_SOURCES.length)];
    }

    setSelectedSource(source);
    setSession({
      id: crypto.randomUUID(),
      sourceKey: source.i18nKey,
      sourceId: source.id,
      themeKey: "theme.contemplation",
      symbols,
      situation,
      userIntent: userState.userIntent || undefined,
      createdAt: new Date(),
    });
    setPassage(null);
    setSelectedSymbol(null);
    setAiResponse(null);
    setReadingState("wildcard_reveal");

    updateUserState(prev => ({
      ...prev,
      readingsToday: prev.readingsToday + 1,
      lastReadingDate: getToday(),
      sessionCount: prev.sessionCount + 1,
    }));
  }, [preferredSourceId, userState.userIntent, updateUserState]);

  const chooseSymbol = useCallback((symbolId: string, lang: "vi" | "en") => {
    const symbol = ALL_SYMBOLS.find(s => s.id === symbolId);
    if (!symbol || !session) return;
    setSelectedSymbol(symbol);
    setReadingState("wildcard_chosen");
    const sourcePassage = getRandomPassageFromSource(session.sourceId, lang);
    if (sourcePassage) {
      setPassage(sourcePassage);
    } else {
      setPassage(getPassages(lang)[symbolId]);
    }
  }, [session]);

  const requestAI = useCallback(async (lang: "vi" | "en") => {
    if (!selectedSymbol) return;
    if (!canUseAI) {
      setAiResponse(lang === "en"
        ? "You've used your free AI interpretation for today. Come back tomorrow for a new one. ✦"
        : "Bạn đã dùng hết lượt diễn giải AI miễn phí hôm nay. Hãy quay lại ngày mai. ✦"
      );
      return;
    }
    setIsAILoading(true);
    setReadingState("ai_streaming");
    updateUserState(prev => ({ ...prev, aiCallsToday: prev.aiCallsToday + 1 }));
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
    setAiResponse(getAIResponse(selectedSymbol.id, lang));
    setIsAILoading(false);
    setReadingState("passage_displayed");
  }, [selectedSymbol, canUseAI, updateUserState]);

  const saveReading = useCallback((symbolName: string, moodTag?: MoodTag) => {
    if (!passage || !selectedSymbol || !session) return;
    const reading: SavedReading = {
      id: crypto.randomUUID(),
      passage,
      symbol: selectedSymbol,
      symbolName,
      aiResponse: aiResponse || undefined,
      situation: session.situation,
      source: session.sourceKey,
      sourceId: session.sourceId,
      moodTag,
      userIntent: session.userIntent,
      createdAt: new Date(),
    };
    const updated = [reading, ...savedReadings];
    setSavedReadings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setReadingState("complete");
  }, [passage, selectedSymbol, session, aiResponse, savedReadings]);

  const clearAllReadings = useCallback(() => {
    setSavedReadings([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const deleteReading = useCallback((id: string) => {
    const updated = savedReadings.filter(r => r.id !== id);
    setSavedReadings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [savedReadings]);

  const reset = useCallback(() => {
    setSession(null);
    setPassage(null);
    setSelectedSymbol(null);
    setSelectedSource(null);
    setAiResponse(null);
    setReadingState("idle");
  }, []);

  const completeOnboarding = useCallback((intent: UserIntent) => {
    updateUserState(prev => ({ ...prev, onboardingComplete: true, userIntent: intent }));
  }, [updateUserState]);

  return (
    <ReadingContext.Provider value={{
      session, passage, selectedSymbol, selectedSource, aiResponse, isAILoading, readingState,
      savedReadings, totalReadings, userState,
      canRead, canUseAI, readingsRemaining, aiRemaining,
      preferredSourceId,
      selectSource, setPreferredSource, startReading, chooseSymbol, requestAI, saveReading,
      clearAllReadings, deleteReading, reset,
      completeOnboarding, isOnboardingComplete: userState.onboardingComplete,
    }}>
      {children}
    </ReadingContext.Provider>
  );
}

export function useReading() {
  const ctx = useContext(ReadingContext);
  if (!ctx) throw new Error("useReading must be used within ReadingProvider");
  return ctx;
}
