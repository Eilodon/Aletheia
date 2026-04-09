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

export interface AIRuntimeRequest {
  passage: Passage;
  symbol: Symbol;
  situationText?: string;
  resonanceContext?: string;
  userIntent?: "clarity" | "comfort" | "challenge" | "guidance";
}

export interface AIRuntimeInterpretationResult {
  chunks: string[];
  usedFallback: boolean;
}

export interface AIRuntimeStreamState {
  newChunks: string[];
  fullText?: string;
  done: boolean;
  cancelled: boolean;
  usedFallback: boolean;
}

function withRuntimePassage(request: AIRuntimeRequest) {
  return {
    ...request.passage,
    resonance_context: request.resonanceContext ?? request.passage.resonance_context,
  };
}

class AIRuntimeService {
  isNativeAvailable(): boolean {
    return shouldUseAletheiaNative();
  }

  async ensureReady(): Promise<boolean> {
    if (!this.isNativeAvailable()) {
      return false;
    }

    await initializeAletheiaNative();
    return true;
  }

  async setApiKey(provider: "claude" | "gpt4" | "gemini", key: string): Promise<boolean> {
    if (!(await this.ensureReady())) {
      return false;
    }

    await unwrapNativeSetApiKeyResponse(
      await aletheiaNativeClient.setApiKey({ provider, key }),
    );
    return true;
  }

  async requestInterpretation(
    request: AIRuntimeRequest,
  ): Promise<AIRuntimeInterpretationResult | null> {
    if (!(await this.ensureReady())) {
      return null;
    }

    const interpretation = unwrapNativeRequestInterpretationResponse(
      await aletheiaNativeClient.requestInterpretation(
        withRuntimePassage(request),
        request.symbol,
        request.situationText,
      ),
    );

    return {
      chunks: interpretation.chunks,
      usedFallback: interpretation.used_fallback,
    };
  }

  async startInterpretationStream(request: AIRuntimeRequest): Promise<string | null> {
    if (!(await this.ensureReady())) {
      return null;
    }

    return unwrapNativeStartInterpretationStreamResponse(
      await aletheiaNativeClient.startInterpretationStream(
        withRuntimePassage(request),
        request.symbol,
        request.situationText,
        request.userIntent,
      ),
    );
  }

  async pollInterpretationStream(requestId: string): Promise<AIRuntimeStreamState> {
    const state = unwrapNativeInterpretationStreamState(
      await aletheiaNativeClient.pollInterpretationStream(requestId),
    );

    return {
      newChunks: state.new_chunks,
      fullText: state.full_text,
      done: state.done,
      cancelled: state.cancelled,
      usedFallback: state.used_fallback,
    };
  }

  async cancelInterpretationStream(requestId: string): Promise<boolean> {
    return unwrapNativeCancelInterpretationResponse(
      await aletheiaNativeClient.cancelInterpretationStream(requestId),
    );
  }
}

export const aiRuntime = new AIRuntimeService();
