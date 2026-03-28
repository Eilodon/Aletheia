/**
 * AI Client Service - Interfaces with Rust Core via UniFFI
 * Handles AI interpretation requests with multi-provider failover
 */

import { Passage, Symbol, AletheiaError, ErrorCode } from "@/lib/types";

// TODO: Import from generated UniFFI bindings once available
// import { AletheiaCore } from "@/lib/aletheia-core";

interface AIRequest {
  passage: Passage;
  symbol: Symbol;
  situationText?: string;
}

class AIClientService {
  // TODO: Uncomment when UniFFI bindings are generated
  // private core: AletheiaCore | null = null;
  private initialized = false;

  /**
   * Initialize the AI client with Rust Core
   * Call this once on app startup after dbInit
   */
  async initialize(dbPath: string, giftBackendUrl: string): Promise<void> {
    try {
      // TODO: Uncomment when UniFFI bindings are generated
      // this.core = new AletheiaCore(dbPath, giftBackendUrl);
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
  async requestInterpretation(request: AIRequest): Promise<string[]> {
    if (!this.initialized) {
      console.warn("[AI Client] Not initialized, using fallback");
      return this.getFallbackInterpretation(request);
    }

    try {
      // TODO: Uncomment when UniFFI bindings are generated
      // const result = await this.core.request_interpretation(
      //   request.passage,
      //   request.symbol,
      //   request.situationText
      // );
      // return result;

      // Temporary: use fallback until UniFFI is ready
      console.log("[AI Client] UniFFI not ready, using fallback");
      return this.getFallbackInterpretation(request);
    } catch (error) {
      console.error("[AI Client] Request failed:", error);
      // Fallback to prompts on error
      return this.getFallbackInterpretation(request);
    }
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
    return this.initialized;
  }
}

export const aiClient = new AIClientService();
