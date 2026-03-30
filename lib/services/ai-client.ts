/**
 * AI Client Service - Interfaces with Rust Core via UniFFI
 * Handles AI interpretation requests with multi-provider failover
 */

import { Passage, Symbol } from "@/lib/types";
import { aletheiaNativeClient } from "@/lib/native/aletheia-core";
import {
  unwrapNativeCancelInterpretationResponse,
  unwrapNativeInterpretationStreamState,
  unwrapNativeRequestInterpretationResponse,
  unwrapNativeSetApiKeyResponse,
  unwrapNativeStartInterpretationStreamResponse,
} from "@/lib/native/bridge";
import { initializeAletheiaNative, shouldUseAletheiaNative } from "@/lib/native/runtime";

interface AIRequest {
  passage: Passage;
  symbol: Symbol;
  situationText?: string;
  /** Hidden context injected into AI prompt, not shown to user (AI-05) */
  resonanceContext?: string;
  sourceLanguage?: string;
  sourceFallbackPrompts?: string[];
}

interface AIInterpretationResult {
  chunks: string[];
  usedFallback: boolean;
}

interface AIStreamHandlers {
  onChunk?: (fullText: string, chunk: string) => void;
}

type AIStreamSession = {
  promise: Promise<AIInterpretationResult>;
  cancel: () => Promise<boolean>;
};

class AIClientService {
  private initialized = false;
  private isNativePath(): boolean {
    return shouldUseAletheiaNative();
  }

  /**
   * Initialize the AI client with Rust Core
   * Call this once on app startup after dbInit
   */
  async initialize(_dbPath: string, _giftBackendUrl: string): Promise<void> {
    try {
      if (this.isNativePath()) {
        await initializeAletheiaNative();
        this.initialized = true;
        return;
      }

      this.initialized = true;
      console.log("[AI Client] Initialized successfully");
    } catch (error) {
      console.error("[AI Client] Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * Set API key for a specific provider
   */
  async setApiKey(provider: "claude" | "gpt4" | "gemini", key: string): Promise<void> {
    try {
      if (this.isNativePath()) {
        await initializeAletheiaNative();
        await unwrapNativeSetApiKeyResponse(
          await aletheiaNativeClient.setApiKey({ provider, key }),
        );
        return;
      }

      console.log(`[AI Client] API key set for ${provider}`);
    } catch (error) {
      console.error("[AI Client] Failed to set API key:", error);
      throw error;
    }
  }

  /**
   * Request AI interpretation for a passage
   * Uses multi-provider failover (Claude → GPT4 → Gemini)
   */
  async requestInterpretation(request: AIRequest): Promise<AIInterpretationResult> {
    if (this.isNativePath()) {
      await initializeAletheiaNative();
      const passage = {
        ...request.passage,
        resonance_context: request.resonanceContext ?? request.passage.resonance_context,
      };
      const response = await aletheiaNativeClient.requestInterpretation(
        passage,
        request.symbol,
        request.situationText,
      );
      const interpretation = unwrapNativeRequestInterpretationResponse(response);
      return {
        chunks: interpretation.chunks,
        usedFallback: interpretation.used_fallback,
      };
    }

    try {
      if (!this.initialized) {
        console.warn("[AI Client] Not initialized, using fallback");
      }

      return {
        chunks: this.getFallbackInterpretation(request),
        usedFallback: true,
      };
    } catch (error) {
      console.error("[AI Client] Request failed:", error);
      return {
        chunks: this.getFallbackInterpretation(request),
        usedFallback: true,
      };
    }
  }

  streamInterpretation(
    request: AIRequest,
    handlers: AIStreamHandlers = {},
  ): AIStreamSession {
    if (!this.isNativePath()) {
      return {
        promise: this.requestInterpretation(request),
        cancel: async () => false,
      };
    }

    let requestId: string | null = null;
    let cancelled = false;

    const promise = (async () => {
      await initializeAletheiaNative();
      const passage = {
        ...request.passage,
        resonance_context: request.resonanceContext ?? request.passage.resonance_context,
      };
      requestId = unwrapNativeStartInterpretationStreamResponse(
        await aletheiaNativeClient.startInterpretationStream(
          passage,
          request.symbol,
          request.situationText,
        ),
      );

      const chunks: string[] = [];

      // Adaptive polling with exponential backoff
      let pollIntervalMs = 80;          // Start fast for first chunks
      const MIN_POLL_MS = 80;
      const MAX_POLL_MS = 500;
      const BACKOFF_FACTOR = 1.5;
      let idlePolls = 0;                // Consecutive polls with no new chunks

      while (true) {
        const state = unwrapNativeInterpretationStreamState(
          await aletheiaNativeClient.pollInterpretationStream(requestId),
        );

        const hadNewChunks = state.new_chunks.length > 0;

        for (const chunk of state.new_chunks) {
          chunks.push(chunk);
          handlers.onChunk?.(chunks.join(""), chunk);
        }

        if (state.done) {
          return {
            chunks: state.full_text ? [state.full_text] : chunks,
            usedFallback: state.used_fallback,
          };
        }

        if (state.cancelled || cancelled) {
          return {
            chunks: state.full_text ? [state.full_text] : chunks,
            usedFallback: state.used_fallback,
          };
        }

        // Adaptive backoff: reset on activity, back off on silence
        if (hadNewChunks) {
          pollIntervalMs = MIN_POLL_MS;  // Got data — poll fast again
          idlePolls = 0;
        } else {
          idlePolls++;
          if (idlePolls > 3) {
            // No data for 3+ polls — slow down
            pollIntervalMs = Math.min(
              Math.floor(pollIntervalMs * BACKOFF_FACTOR),
              MAX_POLL_MS,
            );
          }
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }
    })();

    return {
      promise,
      cancel: async () => {
        cancelled = true;
        if (!requestId) {
          return false;
        }
        return unwrapNativeCancelInterpretationResponse(
          await aletheiaNativeClient.cancelInterpretationStream(requestId),
        );
      },
    };
  }

  /**
   * Get fallback interpretation based on source
   * Used when AI is unavailable or on first launch
   */
  private getFallbackInterpretation(request: AIRequest): string[] {
    // Prefer source-specific fallback prompts (CONTENT-03)
    if (request.sourceFallbackPrompts && request.sourceFallbackPrompts.length > 0) {
      const idx = Math.floor(Math.random() * request.sourceFallbackPrompts.length);
      return [request.sourceFallbackPrompts[idx]];
    }

    // Language-aware generic fallback — never show English to Vietnamese users
    if (request.sourceLanguage === "en") {
      return ["Take a moment to sit with these words. What do they stir in you?"];
    }
    return ["Hãy để những lời này lắng xuống một chút. Điều gì đang dấy lên trong bạn?"];
  }

  /**
   * Check if AI client is ready
   */
  isReady(): boolean {
    return this.isNativePath() || this.initialized;
  }
}

export const aiClient = new AIClientService();
