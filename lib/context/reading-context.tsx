/**
 * Reading Context - Manages reading session state and flow
 */

import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Alert } from "react-native";
import { useRouter, type Href } from "expo-router";
import {
  Reading,
  ReadingSession,
  ReadingState,
  SubscriptionTier,
  SymbolMethod,
  MoodTag,
  Passage,
  AletheiaError,
  ErrorCode,
  Symbol as AletheiaSymbol,
} from "@/lib/types";
import { dbInit } from "@/lib/services/db-init";
import {
  AUTO_SAVE_DELAY_MS,
  computePassageActionDelay,
  buildPassageRevealSteps,
} from "@/lib/reading/ritual";

import { coreStore } from "@/lib/services/core-store";
import { getCurrentUserId } from "@/lib/services/current-user-id";
import { generateId } from "@/lib/utils/id";
import { trackRitualEvent } from "@/lib/analytics";
import { captureException } from "@/lib/sentry";
import { interpretationOrchestrator } from "@/lib/services/interpretation-orchestrator";
import type { AIInterpretationResult } from "@/lib/services/ai-client";
import { showToast } from "@/components/toast";

interface ReadingContextType {
  // State
  currentState: ReadingState;
  session: ReadingSession | null;
  passage: Passage | null;
  selectedSymbolId: string | null;
  selectedSymbol: AletheiaSymbol | null;
  selectedMethod: SymbolMethod;
  visiblePassageText: string;
  passageActionsReady: boolean;
  aiResponse: string | null;
  isAIFallback: boolean;
  readingStartTime: number | null;
  error: AletheiaError | null;
  selectedMoodTag: MoodTag | null;
  isEphemeral: boolean;

  // Actions
  startReading: (sourceId?: string, situationText?: string, ephemeral?: boolean) => Promise<void>;
  selectAftertaste: (tag: MoodTag | null) => void;
  chooseSymbol: (symbolId: string, method: SymbolMethod) => Promise<void>;
  requestAIInterpretation: () => Promise<void>;
  cancelAIInterpretation: () => Promise<void>;
  saveReading: (moodTag?: MoodTag) => Promise<void>;
  completeReading: () => void;
  resetReading: () => void;
  clearError: () => void;
}

const ReadingContext = createContext<ReadingContextType | undefined>(undefined);
const PAYWALL_ROUTE: Href = "/paywall" as Href;

function confirmCloudAI(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      "Gửi lên AI cloud?",
      "Local AI chưa sẵn sàng. Nếu tiếp tục, đoạn trích, biểu tượng và tình huống của bạn sẽ được gửi để tạo phản chiếu.",
      [
        { text: "Ở lại local", style: "cancel", onPress: () => resolve(false) },
        { text: "Tiếp tục", onPress: () => resolve(true) },
      ],
    );
  });
}

export function ReadingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [currentState, setCurrentState] = useState<ReadingState>(ReadingState.Idle);
  const [session, setSession] = useState<ReadingSession | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [selectedSymbolId, setSelectedSymbolId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<SymbolMethod>(SymbolMethod.Manual);
  const [visiblePassageText, setVisiblePassageText] = useState("");
  const [passageActionsReady, setPassageActionsReady] = useState(false);
  const [aiResponse, setAIResponse] = useState<string | null>(null);
  const [isAIFallback, setIsAIFallback] = useState(false);
  const [readingStartTime, setReadingStartTime] = useState<number | null>(null);
  const [passageDisplayedAt, setPassageDisplayedAt] = useState<number | null>(null);
  const [aiRequestedAt, setAIRequestedAt] = useState<number | null>(null);
  const [hasSavedReading, setHasSavedReading] = useState(false);
  const [userTier, setUserTier] = useState<SubscriptionTier>(SubscriptionTier.Free);
  const [error, setError] = useState<AletheiaError | null>(null);
  const [selectedMoodTag, setSelectedMoodTag] = useState<MoodTag | null>(null);
  const [isEphemeral, setIsEphemeral] = useState(false);
  const activeAIStreamCancelRef = useRef<(() => Promise<boolean>) | null>(null);
  const lastAIInterpretationRef = useRef<AIInterpretationResult | null>(null);
  const passageRevealTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const passageActionsDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedSymbol = useMemo(
    () => session?.symbols.find((symbol) => symbol.id === selectedSymbolId) ?? null,
    [session, selectedSymbolId],
  );

  const selectAftertaste = useCallback((tag: MoodTag | null) => {
    setSelectedMoodTag(tag);
  }, []);

  const startReading = useCallback(async (sourceId?: string, situationText?: string, ephemeral = false) => {
    try {
      setError(null);
      setIsEphemeral(ephemeral);
      setSelectedMoodTag(null);
      setCurrentState(ReadingState.SituationInput);
      await dbInit.initialize();
      await coreStore.syncLocalDate().catch(() => {});

      // Load subscription tier fresh each reading — cheap, ensures paywall
      // purchases reflect immediately without requiring an app restart.
      const userId = await getCurrentUserId();
      const userState = await coreStore.getUserState(userId).catch(() => null);
      if (userState) setUserTier(userState.subscription_tier);

      const newSession = await coreStore.performReading(sourceId, situationText);
      trackRitualEvent("start", {
        source_id: newSession.source.id,
        has_situation: Boolean(situationText?.trim()),
        user_intent: newSession.user_intent,
      });

      setSession(newSession);
      setReadingStartTime(Date.now());
      setPassageDisplayedAt(null);
      setAIRequestedAt(null);
      setHasSavedReading(false);
      setCurrentState(ReadingState.WildcardReveal);
    } catch (err) {
      const aletheiaError = err as AletheiaError;
      
      // Trigger paywall when daily limit reached — pass context so paywall
      // can show the contemplative "sacred limit" header instead of generic upsell.
      if (aletheiaError.code === ErrorCode.DailyLimitReached) {
        trackRitualEvent("daily_limit_hit", {
          source_id: sourceId,
          has_situation: Boolean(situationText?.trim()),
        });
        router.push("/paywall?from=daily_limit" as Href);
        return;
      }

      trackRitualEvent("error", {
        step: "start",
        code: aletheiaError.code,
      });
      if (err instanceof Error) {
        captureException(err, { step: "start_reading" });
      }
      setError(aletheiaError);
      setCurrentState(ReadingState.Idle);
    }
  }, [router]);

  const chooseSymbol = useCallback(async (symbolId: string, method: SymbolMethod) => {
    try {
      if (!session) throw new Error("No active session");

      setError(null);
      setSelectedSymbolId(symbolId);
      setSelectedMethod(method);
      setVisiblePassageText("");
      setPassageActionsReady(false);
      setCurrentState(ReadingState.WildcardChosen);

      const newPassage = (await coreStore.chooseSymbol(session, symbolId, method)).passage as Passage;
      trackRitualEvent("symbol_chosen", {
        source_id: session.source.id,
        symbol_id: symbolId,
        method,
        theme_id: session.theme.id,
      });
      setPassage(newPassage);

      // Ritual animation
      setCurrentState(ReadingState.RitualAnimation);

      // Auto-advance after animation
      setTimeout(() => {
        setCurrentState(ReadingState.PassageDisplayed);
      }, 800);
    } catch (err) {
      const aletheiaError = err as AletheiaError;
      trackRitualEvent("error", {
        step: "choose_symbol",
        code: aletheiaError.code,
      });
      if (err instanceof Error) {
        captureException(err, { step: "choose_symbol" });
      }
      setError(aletheiaError);
      setCurrentState(ReadingState.Idle);
    }
  }, [session]);

  const requestAIInterpretation = useCallback(async () => {
    try {
      if (!session || !passage) throw new Error("No active reading");
      if (!selectedSymbol) {
        throw {
          code: ErrorCode.SymbolInvalid,
          message: "No symbol selected",
          context: undefined,
        } satisfies AletheiaError;
      }

      setError(null);
      setCurrentState(ReadingState.AiStreaming);
      setAIResponse("");
      setIsAIFallback(false);
      setAIRequestedAt((current) => current ?? Date.now());
      trackRitualEvent("ai_requested", {
        source_id: session.source.id,
        symbol_id: selectedSymbol.id,
        has_situation: Boolean(session.situation_text?.trim()),
        user_intent: session.user_intent,
      });

      const runStream = async (cloudConsent = false) => {
        const stream = interpretationOrchestrator.streamInterpretation(
          {
            passage,
            symbol: selectedSymbol,
            situationText: session.situation_text,
            resonanceContext: passage.resonance_context, // AI-05: inject hidden context
            sourceLanguage: session.source.language,
            sourceFallbackPrompts: session.source.fallback_prompts,
            userIntent: session.user_intent as "clarity" | "comfort" | "challenge" | "guidance" | undefined,
            useSonnet: userTier === SubscriptionTier.Pro,
            cloudConsent,
          },
          {
            onChunk: (fullText) => {
              setAIResponse(fullText);
            },
          },
        );
        activeAIStreamCancelRef.current = stream.cancel;
        return stream.promise;
      };

      let interpretation;
      try {
        interpretation = await runStream(false);
      } catch (streamError) {
        const maybeError = streamError as AletheiaError;
        if (
          maybeError.code === ErrorCode.InvalidInput &&
          maybeError.context &&
          maybeError.context.cloud_consent_required === true
        ) {
          const allowed = await confirmCloudAI();
          if (!allowed) {
            activeAIStreamCancelRef.current = null;
            lastAIInterpretationRef.current = null;
            setAIResponse(null);
            setCurrentState(ReadingState.PassageDisplayed);
            return;
          }
          setAIResponse("");
          interpretation = await runStream(true);
        } else {
          throw streamError;
        }
      }
      const finalInterpretationText =
        interpretation.chunks.length <= 1
          ? (interpretation.chunks[0] ?? "")
          : interpretation.chunks.join("");
      setAIResponse(finalInterpretationText);
      setIsAIFallback(interpretation.usedFallback);
      lastAIInterpretationRef.current = interpretation;
      activeAIStreamCancelRef.current = null;
      if (interpretation.usedFallback) {
        showToast("warn", "AI trực tuyến không sẵn sàng. Aletheia đang dùng phản chiếu dự phòng.");
      }
      trackRitualEvent("ai_completed", {
        source_id: session.source.id,
        symbol_id: selectedSymbol.id,
        used_fallback: interpretation.usedFallback,
        chunk_count: interpretation.chunks.length,
      });

      setCurrentState(
        interpretation.usedFallback ? ReadingState.AiFallback : ReadingState.PassageDisplayed,
      );
    } catch (err) {
      activeAIStreamCancelRef.current = null;
      lastAIInterpretationRef.current = null;
      const aletheiaError = err as AletheiaError;
      trackRitualEvent("error", {
        step: "ai_request",
        code: aletheiaError.code,
      });
      if (err instanceof Error) {
        captureException(err, { step: "request_ai" });
      }
      setError(aletheiaError);
      setCurrentState(ReadingState.PassageDisplayed);
    }
  }, [session, passage, selectedSymbol]);

  const cancelAIInterpretation = useCallback(async () => {
    try {
      const cancel = activeAIStreamCancelRef.current;
      if (!cancel) {
        return;
      }

      await cancel();
      activeAIStreamCancelRef.current = null;
      lastAIInterpretationRef.current = null;
      trackRitualEvent("ai_cancelled", {
        source_id: session?.source.id,
        symbol_id: selectedSymbol?.id,
      });
      setCurrentState(ReadingState.PassageDisplayed);
    } catch (err) {
      const aletheiaError = err as AletheiaError;
      setError(aletheiaError);
      setCurrentState(ReadingState.PassageDisplayed);
    }
  }, [selectedSymbol?.id, session?.source.id]);

  const saveReading = useCallback(async (moodTag?: MoodTag) => {
    if (isEphemeral) {
      setHasSavedReading(true);
      return;
    }
    try {
      if (!session || !passage) throw new Error("No active reading");

      setError(null);

      // ADR-V7-09: read_duration_s measures actual reading time = from passage display,
      // not from session start. Session start includes wildcard + ritual animation (~12-15s)
      // which overstates reading time by ~30%. passageDisplayedAt is set in onPassageDisplayed().
      // time_to_ai_request_s already uses passageDisplayedAt correctly — this now matches.
      const readDuration = passageDisplayedAt
        ? Math.floor((Date.now() - passageDisplayedAt) / 1000)
        : readingStartTime
          ? Math.floor((Date.now() - readingStartTime) / 1000)
          : 0;
      const timeToAIRequest =
        passageDisplayedAt && aiRequestedAt
          ? Math.max(0, Math.floor((aiRequestedAt - passageDisplayedAt) / 1000))
          : undefined;

      const reading: Reading = {
        id: generateId(),
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
        time_to_ai_request_s: timeToAIRequest,
        notification_opened: false,
        mood_tag: moodTag ?? selectedMoodTag ?? undefined,
        is_favorite: false,
        shared: false,
        user_intent: session.user_intent,
      };

      await coreStore.completeReading({
        ...reading,
        symbol_method: selectedMethod,
      });
      if (aiResponse?.trim()) {
        const interpretation = lastAIInterpretationRef.current;
        await coreStore.saveInterpretation({
          id: generateId(),
          reading_id: reading.id,
          created_at: Date.now(),
          mode: interpretation?.mode ?? (isAIFallback ? "fallback" : "unknown"),
          provider: interpretation?.provider ?? (isAIFallback ? "fallback" : undefined),
          model_id: interpretation?.modelId,
          prompt_version: "aletheia-v1",
          text: aiResponse,
          used_fallback: isAIFallback,
          safety_status: "passed",
          safety_reasons: [],
          input_tokens: undefined,
          output_tokens: undefined,
          latency_ms: undefined,
        });
      }
      trackRitualEvent("save_completed", {
        reading_id: reading.id,
        source_id: reading.source_id,
        symbol_id: reading.symbol_chosen,
        ai_interpreted: reading.ai_interpreted,
        ai_used_fallback: reading.ai_used_fallback,
        mood_tag: reading.mood_tag,
        read_duration_s: readDuration,
      });
      setHasSavedReading(true);
      setCurrentState(ReadingState.Complete);
    } catch (err) {
      const aletheiaError = err as AletheiaError;
      trackRitualEvent("error", {
        step: "save_reading",
        code: aletheiaError.code,
      });
      if (err instanceof Error) {
        captureException(err, { step: "save_reading" });
      }
      setError(aletheiaError);
    }
  }, [session, passage, aiResponse, isAIFallback, readingStartTime, selectedSymbolId, selectedMethod, passageDisplayedAt, aiRequestedAt]);

  useEffect(() => {
    passageRevealTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    passageRevealTimeoutsRef.current = [];

    if (passageActionsDelayRef.current !== null) {
      clearTimeout(passageActionsDelayRef.current);
      passageActionsDelayRef.current = null;
    }

    if (currentState !== ReadingState.PassageDisplayed || !passage) {
      return;
    }

    setPassageDisplayedAt(Date.now());
    setVisiblePassageText("");
    setPassageActionsReady(false);

    const steps = buildPassageRevealSteps(passage.text);
    let elapsed = 0;

    for (const step of steps) {
      elapsed += step.delayMs;
      const timeoutId = setTimeout(() => {
        setVisiblePassageText(step.text);
      }, elapsed);
      passageRevealTimeoutsRef.current.push(timeoutId);
    }

    passageActionsDelayRef.current = setTimeout(() => {
      setPassageActionsReady(true);
    }, elapsed + computePassageActionDelay(passage.text));

    return () => {
      passageRevealTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      passageRevealTimeoutsRef.current = [];
      if (passageActionsDelayRef.current !== null) {
        clearTimeout(passageActionsDelayRef.current);
        passageActionsDelayRef.current = null;
      }
    };
  }, [currentState, passage]);

  useEffect(() => {
    if (
      (currentState !== ReadingState.PassageDisplayed &&
        currentState !== ReadingState.AiFallback) ||
      hasSavedReading
    ) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void saveReading();
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentState, hasSavedReading, saveReading]);

  const completeReading = useCallback(() => {
    setCurrentState(ReadingState.Complete);
  }, []);

  const resetReading = useCallback(() => {
    void activeAIStreamCancelRef.current?.();
    activeAIStreamCancelRef.current = null;
    lastAIInterpretationRef.current = null;
    setCurrentState(ReadingState.Idle);
    setSession(null);
    setPassage(null);
    setSelectedSymbolId(null);
    setSelectedMethod(SymbolMethod.Manual);
    setVisiblePassageText("");
    setPassageActionsReady(false);
    setAIResponse(null);
    setIsAIFallback(false);
    setReadingStartTime(null);
    setPassageDisplayedAt(null);
    setAIRequestedAt(null);
    setHasSavedReading(false);
    setError(null);
    setSelectedMoodTag(null);
    setIsEphemeral(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: ReadingContextType = {
    currentState,
    session,
    passage,
    selectedSymbolId,
    selectedSymbol,
    selectedMethod,
    visiblePassageText,
    passageActionsReady,
    aiResponse,
    isAIFallback,
    readingStartTime,
    error,
    selectedMoodTag,
    isEphemeral,
    startReading,
    selectAftertaste,
    chooseSymbol,
    requestAIInterpretation,
    cancelAIInterpretation,
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
