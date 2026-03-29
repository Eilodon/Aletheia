/**
 * AI Client Service - Interfaces with Rust Core via UniFFI
 * Handles AI interpretation requests with multi-provider failover
 */

import { Passage, Symbol } from "@/lib/types";
import { aletheiaNativeClient } from "@/lib/native/aletheia-core";
import {
  unwrapNativeCancelInterpretationResponse,
  unwrapNativeInterpretationStreamState,
  unwrapNativeFallbackPromptsResponse,
  unwrapNativeRequestInterpretationResponse,
  unwrapNativeStartInterpretationStreamResponse,
} from "@/lib/native/bridge";
import { initializeAletheiaNative, shouldUseAletheiaNative } from "@/lib/native/runtime";

interface AIRequest {
  passage: Passage;
  symbol: Symbol;
  situationText?: string;
  /** Hidden context injected into AI prompt, not shown to user (AI-05) */
  resonanceContext?: string;
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

  /**
   * Initialize the AI client with Rust Core
   * Call this once on app startup after dbInit
   */
  async initialize(dbPath: string, giftBackendUrl: string): Promise<void> {
    try {
      if (shouldUseAletheiaNative()) {
        await aletheiaNativeClient.init({ dbPath, giftBackendUrl });
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
      // TODO: Uncomment when UniFFI bindings are generated
      // this.core?.set_ai_api_key(provider, key);
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
    try {
      if (shouldUseAletheiaNative()) {
        await initializeAletheiaNative();
        const response = await aletheiaNativeClient.requestInterpretation(
          request.passage,
          request.symbol,
          request.situationText,
        );
        const interpretation = unwrapNativeRequestInterpretationResponse(response);
        return {
          chunks: interpretation.chunks,
          usedFallback: interpretation.used_fallback,
        };
      }

      if (!this.initialized) {
        console.warn("[AI Client] Not initialized, using fallback");
      }

      return {
        chunks: this.getFallbackInterpretation(request),
        usedFallback: true,
      };
    } catch (error) {
      console.error("[AI Client] Request failed:", error);
      // Fallback to prompts on error
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
    if (!shouldUseAletheiaNative()) {
      return {
        promise: this.requestInterpretation(request),
        cancel: async () => false,
      };
    }

    let requestId: string | null = null;
    let cancelled = false;

    const promise = (async () => {
      await initializeAletheiaNative();
      requestId = unwrapNativeStartInterpretationStreamResponse(
        await aletheiaNativeClient.startInterpretationStream(
          request.passage,
          request.symbol,
          request.situationText,
        ),
      );

      const chunks: string[] = [];

      while (true) {
        const state = unwrapNativeInterpretationStreamState(
          await aletheiaNativeClient.pollInterpretationStream(requestId),
        );

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

        await new Promise((resolve) => setTimeout(resolve, 120));
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
    // Return the source's fallback prompts
    return request.passage.context 
      ? [request.passage.context] 
      : ["Take a moment to reflect on this passage."];
  }

  /**
   * Check if AI client is ready
   */
  isReady(): boolean {
    return false;
  }
}

export const aiClient = new AIClientService();
