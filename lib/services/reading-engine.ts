/**
 * ReadingEngine Service - Core Reading Flow Orchestration
 * Handles: perform_reading, choose_symbol, complete_reading
 */

import { v4 as uuidv4 } from "uuid";
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
  FREE_AI_PER_DAY,
} from "@/lib/constants";
import { store } from "./store";
import { themeEngine } from "./theme-engine";
import { getUserInfo } from "@/lib/auth";

async function getCurrentUserId(): Promise<string> {
  const user = await getUserInfo();
  return user?.id?.toString() || "local-user";
}

class ReadingEngineService {
  async performReading(sourceId?: string, situationText?: string): Promise<ReadingSession> {
    try {
      // Get user state
      const userId = await getCurrentUserId();
      const userState = await store.getUserState(userId);

      // Check daily limit for Free tier
      if (userState.subscription_tier === SubscriptionTier.Free) {
        if (userState.readings_today >= FREE_READINGS_PER_DAY) {
          throw this.createError(
            ErrorCode.DailyLimitReached,
            `You've reached your daily limit of ${FREE_READINGS_PER_DAY} readings`,
            {
              used: userState.readings_today,
              limit: FREE_READINGS_PER_DAY,
            }
          );
        }
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
        source = await store.getRandomSource(premiumAllowed);
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

      const symbols = await themeEngine.randomThreeSymbols(theme.id);
      if (symbols.length !== 3) {
        throw this.createError(
          ErrorCode.SymbolInvalid,
          "Could not select 3 symbols"
        );
      }

      // Return session (not yet saved)
      const session: ReadingSession = {
        temp_id: uuidv4(),
        source,
        theme,
        symbols,
        situation_text: situationText,
        started_at: Date.now(),
      };

      return session;
    } catch (error) {
      if (error instanceof Error && "code" in error) {
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
    method: SymbolMethod
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
      if (error instanceof Error && "code" in error) {
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
      const userState = await store.getUserState(userId);

      await store.incrementReadingsToday(userId);
      if (reading.ai_interpreted) {
        await store.incrementAICallsToday(userId);
      }

      const saved_at = Date.now();

      return {
        reading_id: reading.id,
        saved_at,
      };
    } catch (error) {
      if (error instanceof Error && "code" in error) {
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
      if (error instanceof Error && "code" in error) {
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
