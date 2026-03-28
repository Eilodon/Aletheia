/**
 * Reading Context - Manages reading session state and flow
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Reading,
  ReadingSession,
  ReadingState,
  SymbolMethod,
  Passage,
  AletheiaError,
} from "@/lib/types";
import { readingEngine } from "@/lib/services/reading-engine";
import { aiClient } from "@/lib/services/ai-client";

interface ReadingContextType {
  // State
  currentState: ReadingState;
  session: ReadingSession | null;
  passage: Passage | null;
  selectedSymbolId: string | null;
  selectedMethod: SymbolMethod;
  aiResponse: string | null;
  isAIFallback: boolean;
  readingStartTime: number | null;
  error: AletheiaError | null;

  // Actions
  startReading: (sourceId?: string, situationText?: string) => Promise<void>;
  chooseSymbol: (symbolId: string, method: SymbolMethod) => Promise<void>;
  requestAIInterpretation: () => Promise<void>;
  saveReading: (moodTag?: string) => Promise<void>;
  completeReading: () => void;
  resetReading: () => void;
  clearError: () => void;
}

const ReadingContext = createContext<ReadingContextType | undefined>(undefined);

export function ReadingProvider({ children }: { children: React.ReactNode }) {
  const [currentState, setCurrentState] = useState<ReadingState>(ReadingState.Idle);
  const [session, setSession] = useState<ReadingSession | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [selectedSymbolId, setSelectedSymbolId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<SymbolMethod>(SymbolMethod.Manual);
  const [aiResponse, setAIResponse] = useState<string | null>(null);
  const [isAIFallback, setIsAIFallback] = useState(false);
  const [readingStartTime, setReadingStartTime] = useState<number | null>(null);
  const [error, setError] = useState<AletheiaError | null>(null);

  const startReading = useCallback(async (sourceId?: string, situationText?: string) => {
    try {
      setError(null);
      setCurrentState(ReadingState.SituationInput);

      const newSession = await readingEngine.performReading(sourceId, situationText);
      setSession(newSession);
      setReadingStartTime(Date.now());
      setCurrentState(ReadingState.SourceSelection);
    } catch (err) {
      const aletheiaError = err as AletheiaError;
      setError(aletheiaError);
      setCurrentState(ReadingState.Idle);
    }
  }, []);

  const chooseSymbol = useCallback(async (symbolId: string, method: SymbolMethod) => {
    try {
      if (!session) throw new Error("No active session");

      setError(null);
      setSelectedSymbolId(symbolId);
      setSelectedMethod(method);
      setCurrentState(ReadingState.WildcardChosen);

      const { passage: newPassage } = await readingEngine.chooseSymbol(session, symbolId, method);
      setPassage(newPassage);

      // Ritual animation
      setCurrentState(ReadingState.RitualAnimation);

      // Auto-advance after animation
      setTimeout(() => {
        setCurrentState(ReadingState.PassageDisplayed);
      }, 800);
    } catch (err) {
      const aletheiaError = err as AletheiaError;
      setError(aletheiaError);
      setCurrentState(ReadingState.Idle);
    }
  }, [session]);

  const requestAIInterpretation = useCallback(async () => {
    try {
      if (!session || !passage) throw new Error("No active reading");

      setError(null);
      setCurrentState(ReadingState.AiStreaming);
      setAIResponse("");

      // Use AI client service with UniFFI integration
      const interpretation = await aiClient.requestInterpretation({
        passage,
        symbol: session.symbols[0], // TODO: pass selected symbol
        situationText: session.situation_text,
      });
      setAIResponse(interpretation.join("\n\n"));
      setIsAIFallback(!aiClient.isReady());

      setCurrentState(ReadingState.AiFallback);
    } catch (err) {
      const aletheiaError = err as AletheiaError;
      setError(aletheiaError);
      setCurrentState(ReadingState.PassageDisplayed);
    }
  }, [session, passage]);

  const saveReading = useCallback(async (moodTag?: string) => {
    try {
      if (!session || !passage) throw new Error("No active reading");

      setError(null);

      const readDuration = readingStartTime ? Math.floor((Date.now() - readingStartTime) / 1000) : 0;

      const reading: Reading = {
        id: uuidv4(),
        created_at: Date.now(),
        source_id: session.source.id,
        passage_id: passage.id,
        theme_id: session.theme.id,
        symbol_chosen: selectedSymbolId || "",
        symbol_method: selectedMethod,
        situation_text: session.situation_text,
        ai_interpreted: !!aiResponse,
        ai_used_fallback: isAIFallback,
        read_duration_s: readDuration,
        mood_tag: moodTag as any,
        is_favorite: false,
        shared: false,
      };

      await readingEngine.completeReading(reading);
      setCurrentState(ReadingState.Complete);
    } catch (err) {
      const aletheiaError = err as AletheiaError;
      setError(aletheiaError);
    }
  }, [session, passage, aiResponse, isAIFallback, readingStartTime, selectedSymbolId, selectedMethod]);

  const completeReading = useCallback(() => {
    setCurrentState(ReadingState.Complete);
  }, []);

  const resetReading = useCallback(() => {
    setCurrentState(ReadingState.Idle);
    setSession(null);
    setPassage(null);
    setSelectedSymbolId(null);
    setSelectedMethod(SymbolMethod.Manual);
    setAIResponse(null);
    setIsAIFallback(false);
    setReadingStartTime(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: ReadingContextType = {
    currentState,
    session,
    passage,
    selectedSymbolId,
    selectedMethod,
    aiResponse,
    isAIFallback,
    readingStartTime,
    error,
    startReading,
    chooseSymbol,
    requestAIInterpretation,
    saveReading,
    completeReading,
    resetReading,
    clearError,
  };

  return <ReadingContext.Provider value={value}>{children}</ReadingContext.Provider>;
}

export function useReading(): ReadingContextType {
  const context = useContext(ReadingContext);
  if (!context) {
    throw new Error("useReading must be used within ReadingProvider");
  }
  return context;
}
