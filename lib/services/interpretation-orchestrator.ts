import { getApiBaseUrl } from "@/constants/oauth";
import { aiClient, type AIInterpretationResult, type AIRequest, type AIStreamSession } from "./ai-client";
import { getAletheiaCoreModule } from "@/modules/aletheia-core-module";
import { determineInferenceMode } from "@/hooks/use-local-model";
import { trackInferenceMode, trackLocalModelEvent } from "@/lib/analytics";

type InterpretationMode = "auto" | "quality" | "local";

type InterpretationRequestPayload = AIRequest & {
  mode?: InterpretationMode;
};

type ServerStreamEvent =
  | { type: "chunk"; chunk: string }
  | {
      type: "done";
      text: string;
      usedFallback: boolean;
      mode: "local" | "cloud" | "fallback";
      provider: "ollama" | "openai" | "gemini" | "fallback";
      model: string;
    };

type StreamHandlers = {
  onChunk?: (fullText: string, chunk: string) => void;
};

type InferenceModeSelection = {
  mode: "local" | "cloud" | "fallback" | "offline";
  localReady: boolean;
  localSupported: boolean;
};

async function parseServerStream(
  response: Response,
  handlers: StreamHandlers,
): Promise<AIInterpretationResult> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Interpretation stream body is unavailable.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  const chunks: string[] = [];
  let fallback = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) {
        break;
      }

      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (!line) {
        continue;
      }

      const event = JSON.parse(line) as ServerStreamEvent;
      if (event.type === "chunk") {
        chunks.push(event.chunk);
        handlers.onChunk?.(chunks.join(""), event.chunk);
        continue;
      }

      fallback = event.usedFallback;
      return {
        chunks: event.text ? [event.text] : chunks,
        usedFallback: fallback,
      };
    }
  }

  if (chunks.length === 0) {
    throw new Error("Interpretation stream ended without content.");
  }

  return {
    chunks,
    usedFallback: fallback,
  };
}

class InterpretationOrchestratorService {
  private getServerUrl(): string {
    return getApiBaseUrl();
  }

  private shouldUseServer(): boolean {
    return this.getServerUrl().length > 0;
  }

  /**
   * Determine inference mode based on device capability and model status
   * Priority: local > cloud > fallback
   */
  private async selectInferenceMode(requestedMode?: InterpretationMode): Promise<InferenceModeSelection> {
    const module = getAletheiaCoreModule();
    
    // If user explicitly requested local mode
    if (requestedMode === "local") {
      const status = await module.getLocalModelStatus();
      const capability = await module.checkDeviceCapability();
      const localReady = status.model_info?.status === "ready";
      const localSupported = capability.capability?.supported ?? false;
      
      return {
        mode: localReady && localSupported ? "local" : "offline",
        localReady,
        localSupported,
      };
    }

    // If user explicitly requested quality mode, use cloud
    if (requestedMode === "quality") {
      return {
        mode: "cloud",
        localReady: false,
        localSupported: false,
      };
    }

    // Auto mode: check local availability first
    try {
      const [capabilityResponse, modelStatusResponse] = await Promise.all([
        module.checkDeviceCapability(),
        module.getLocalModelStatus(),
      ]);

      const capability = capabilityResponse.capability;
      const modelInfo = modelStatusResponse.model_info;
      
      const localSupported = capability?.supported ?? false;
      const localReady = modelInfo?.status === "ready";
      
      // Check if we have API keys configured
      const hasApiKey = await this.hasApiKeyConfigured();

      const mode = determineInferenceMode({
        isOnline: navigator.onLine,
        isLocalReady: localReady,
        isLocalSupported: localSupported,
        hasApiKey,
      });

      trackInferenceMode(mode, {
        local_supported: localSupported,
        local_ready: localReady,
        has_api_key: hasApiKey,
        requested_mode: requestedMode ?? "auto",
      });

      return { mode, localReady, localSupported };
    } catch (error) {
      console.warn("[Orchestrator] Failed to check local model status:", error);
      return {
        mode: "cloud",
        localReady: false,
        localSupported: false,
      };
    }
  }

  private async hasApiKeyConfigured(): Promise<boolean> {
    // Check if any API key is set in the native module
    // This is a simplified check - in practice you'd check the actual key storage
    return true; // Assume keys are configured for now
  }

  streamInterpretation(
    request: InterpretationRequestPayload,
    handlers: StreamHandlers = {},
  ): AIStreamSession {
    let controller: AbortController | null = new AbortController();
    let localRequestId: string | null = null;

    const promise = (async () => {
      // Select inference mode
      const selection = await this.selectInferenceMode(request.mode);
      
      // If local mode is selected and ready, use native local inference
      if (selection.mode === "local" && selection.localReady) {
        trackLocalModelEvent("inference_started", {
          model_id: "gemma-3n-e2b",
        });
        
        // Use native module for local inference
        const module = getAletheiaCoreModule();
        
        // Start local inference stream
        const streamResponse = await module.startLocalInterpretationStream(
          request.passage,
          request.symbol,
          request.situationText,
          request.userIntent
        );
        
        if (streamResponse.request_id) {
          localRequestId = streamResponse.request_id;
          
          // Poll for results
          const chunks: string[] = [];
          while (true) {
            const state = await module.pollLocalInterpretationStream(localRequestId);
            
            for (const chunk of state.new_chunks) {
              chunks.push(chunk);
              handlers.onChunk?.(chunks.join(""), chunk);
            }
            
            if (state.done || state.cancelled) {
              return {
                chunks: state.full_text ? [state.full_text] : chunks,
                usedFallback: false,
              };
            }
            
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }
      }

      // Use server-side orchestration if available
      if (this.shouldUseServer()) {
        const response = await fetch(`${this.getServerUrl()}/api/interpret/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/x-ndjson",
          },
          body: JSON.stringify({
            passage: request.passage,
            symbol: request.symbol,
            situationText: request.situationText,
            resonanceContext: request.resonanceContext,
            sourceLanguage: request.sourceLanguage,
            sourceFallbackPrompts: request.sourceFallbackPrompts,
            userIntent: request.userIntent,
            mode: request.mode ?? "auto",
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Interpretation request failed with status ${response.status}`);
        }

        return parseServerStream(response, handlers);
      }

      // Fallback to direct aiClient (native path)
      return aiClient.streamInterpretation(request, handlers).promise;
    })().catch(async (error) => {
      return aiClient.requestInterpretation(request).catch(() => {
        throw error;
      });
    }).finally(() => {
      controller = null;
    });

    return {
      promise,
      cancel: async () => {
        if (localRequestId) {
          const module = getAletheiaCoreModule();
          await module.cancelInterpretationStream(localRequestId);
        }
        if (controller) {
          controller.abort();
          controller = null;
        }
        return true;
      },
    };
  }
}

export const interpretationOrchestrator = new InterpretationOrchestratorService();
