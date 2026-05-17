/**
 * ReadingEngine Service - Core Reading Flow Orchestration
 * Handles: perform_reading, choose_symbol, complete_reading
 * Web-only orchestration path. Android beta must use the Rust core.
 */

import {
  Reading,
  ReadingSession,
  SymbolMethod,
  SubscriptionTier,
  ErrorCode,
  AletheiaError,
  Passage,
} from "@/lib/types";
import {
  FREE_READINGS_PER_DAY,
} from "@/lib/constants";
import { store } from "./store";
import { themeEngine } from "./theme-engine";
import { getCurrentUserId } from "@/lib/services/current-user-id";
import { generateId } from "@/lib/utils/id";


class ReadingEngineService {
  private isAletheiaError(error: unknown): error is AletheiaError {
    return typeof error === "object" && error !== null && "code" in error && "message" in error;
  }

  // ARCH-06: Helper to shuffle array (Fisher-Yates)
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  async performReading(sourceId?: string, situationText?: string): Promise<ReadingSession> {
    try {
      // Get user state
      const userId = await getCurrentUserId();
      const userState = await store.getUserState(userId);

      if (
        userState.subscription_tier === SubscriptionTier.Free &&
        userState.readings_today >= FREE_READINGS_PER_DAY
      ) {
        throw this.createError(
          ErrorCode.DailyLimitReached,
          `Daily reading limit reached for ${userState.last_reading_date ?? "today"}`
        );
      }

      // Resolve source
      let source;
      if (sourceId) {
        source = await store.getSource(sourceId);
        if (!source) {
          throw this.createError(ErrorCode.SourceNotFound, `Source not found: ${sourceId}`);
        }
      } else {
        const premiumAllowed = userState.subscription_tier === SubscriptionTier.Pro;
        source = await store.getRandomSource(
          premiumAllowed,
          userState.preferred_language,
        );
        if (!source) {
          throw this.createError(ErrorCode.SourceNotFound, "No sources available");
        }
      }

      // Get theme and symbols
      const premiumAllowed = userState.subscription_tier === SubscriptionTier.Pro;
      const theme = await themeEngine.getRandomTheme(premiumAllowed);
      if (!theme) {
        throw this.createError(ErrorCode.ThemeNotFound, "No themes available");
      }

      // ARCH-06: Use symbols from theme (already loaded) instead of separate DB query
      const symbols = this.shuffleArray([...theme.symbols]).slice(0, 3);
      if (symbols.length !== 3) {
        throw this.createError(
          ErrorCode.SymbolInvalid,
          "Could not select 3 symbols"
        );
      }

      // Return session (not yet saved)
      const session: ReadingSession = {
        temp_id: generateId(),
        source,
        theme,
        symbols,
        situation_text: situationText,
        user_intent: userState.user_intent,
        started_at: Date.now(),
      };

      return session;
    } catch (error) {
      if (this.isAletheiaError(error)) {
        throw error;
      }
      throw this.createError(
        ErrorCode.InvalidInput,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async chooseSymbol(
    session: ReadingSession,
    symbolId: string,
    _method: SymbolMethod
  ): Promise<{ passage: Passage; reading_id: string }> {
    try {
      // Validate symbol
      const symbolExists = session.symbols.some((s) => s.id === symbolId);
      if (!symbolExists) {
        throw this.createError(
          ErrorCode.SymbolInvalid,
          `Symbol not found: ${symbolId}`
        );
      }

      // Get random passage
      const passage = await store.getRandomPassage(session.source.id);
      if (!passage) {
        throw this.createError(
          ErrorCode.PassageEmpty,
          `No passages available for source: ${session.source.id}`
        );
      }

      return {
        passage,
        reading_id: session.temp_id,
      };
    } catch (error) {
      if (this.isAletheiaError(error)) {
        throw error;
      }
      throw this.createError(
        ErrorCode.InvalidInput,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async completeReading(reading: Reading): Promise<{ reading_id: string; saved_at: number }> {
    try {
      // Validate
      if (!reading.passage_id) {
        throw this.createError(ErrorCode.InvalidInput, "Passage ID is required");
      }
      if (!reading.symbol_chosen) {
        throw this.createError(ErrorCode.InvalidInput, "Symbol is required");
      }

      // Insert to DB
      await store.insertReading(reading);

      // Update user state
      const userId = await getCurrentUserId();
      await store.getUserState(userId);

      await store.incrementReadingsToday(userId);
      await store.incrementSessionCount(userId);
      if (reading.ai_interpreted) {
        await store.incrementAICallsToday(userId);
      }

      const saved_at = Date.now();

      return {
        reading_id: reading.id,
        saved_at,
      };
    } catch (error) {
      if (this.isAletheiaError(error)) {
        throw error;
      }
      if (error instanceof Error && error.message.includes("database")) {
        throw this.createError(ErrorCode.StorageWriteFail, "Failed to save reading");
      }
      throw this.createError(
        ErrorCode.InvalidInput,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async getFallbackPrompts(sourceId: string): Promise<string[]> {
    try {
      const source = await store.getSource(sourceId);
      if (!source) {
        throw this.createError(ErrorCode.SourceNotFound, `Source not found: ${sourceId}`);
      }

      return source.fallback_prompts;
    } catch (error) {
      if (this.isAletheiaError(error)) {
        throw error;
      }
      throw this.createError(
        ErrorCode.InvalidInput,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  private createError(code: ErrorCode, message: string, context?: Record<string, unknown>): AletheiaError {
    return {
      code,
      message,
      context,
    };
  }
}

export const readingEngine = new ReadingEngineService();
