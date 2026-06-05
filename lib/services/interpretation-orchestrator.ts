import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/constants/oauth";
import { aiClient, type AIInterpretationResult, type AIRequest, type AIStreamSession } from "./ai-client";
import { aletheiaNativeClient } from "@/lib/native/aletheia-core";
import { determineInferenceMode } from "@/hooks/use-local-model";
import { trackInferenceMode, trackLocalModelEvent } from "@/lib/analytics";
import {
  isSafeLocalOutput,
  finalizeLocalInterpretation,
  splitIntoSentences,
} from "./local-inference-postprocess";
import { Platform } from "react-native";
import { getCurrentUserId } from "./current-user-id";
import { getSessionToken } from "@/lib/auth";
import { AI_STREAM_TIMEOUT_MS } from "@/lib/constants";
import { APP_ID } from "@/constants/oauth";
import { getLocale } from "@/lib/i18n";
import { getLocalizedSymbol } from "@/lib/i18n/symbol-names";

type InterpretationMode = "auto" | "quality" | "local";

type InterpretationRequestPayload = AIRequest & {
  mode?: InterpretationMode;
  useSonnet?: boolean;
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

      let event: ServerStreamEvent;
      try {
        event = JSON.parse(line) as ServerStreamEvent;
      } catch {
        continue;
      }
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

type CircuitState = "closed" | "open" | "half-open";

const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 30_000; // 30s before half-open probe
const CIRCUIT_STORAGE_KEY = "aletheia:circuit:state";
const CIRCUIT_STORAGE_TTL_MS = 30_000; // 30s — khớp với COOLDOWN

class InterpretationOrchestratorService {
  private circuitState: CircuitState = "closed";
  private circuitFailureCount = 0;
  private circuitLastFailureTime = 0;

  constructor() {
    this.loadCircuitState().catch(() => {});
  }

  private async loadCircuitState(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(CIRCUIT_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { state: CircuitState; failureCount: number; lastFailureTime: number; savedAt: number };
      if (Date.now() - saved.savedAt < CIRCUIT_STORAGE_TTL_MS) {
        this.circuitState = saved.state;
        this.circuitFailureCount = saved.failureCount;
        this.circuitLastFailureTime = saved.lastFailureTime;
      }
    } catch { /* non-critical */ }
  }

  private persistCircuitState(): void {
    AsyncStorage.setItem(CIRCUIT_STORAGE_KEY, JSON.stringify({
      state: this.circuitState,
      failureCount: this.circuitFailureCount,
      lastFailureTime: this.circuitLastFailureTime,
      savedAt: Date.now(),
    })).catch(() => {});
  }

  private getIsOnline(): boolean {
    if (Platform.OS !== "web") {
      return true;
    }

    if (typeof navigator === "undefined") {
      return true;
    }

    return navigator.onLine !== false;
  }

  private getServerUrl(): string {
    return getApiBaseUrl();
  }

  private async buildServerHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/x-ndjson",
    };

    if (APP_ID) {
      headers["X-Aletheia-App-Id"] = APP_ID;
    }

    const [userId, sessionToken] = await Promise.all([
      getCurrentUserId().catch(() => ""),
      getSessionToken().catch(() => null),
    ]);

    if (userId) {
      headers["X-Aletheia-User-Id"] = userId;
    }

    if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`;
    }

    return headers;
  }

  private shouldUseServer(): boolean {
    if (!this.getIsOnline() || this.getServerUrl().length === 0) {
      return false;
    }

    if (this.circuitState === "closed") {
      return true;
    }

    if (this.circuitState === "open") {
      const elapsed = Date.now() - this.circuitLastFailureTime;
      if (elapsed >= CIRCUIT_COOLDOWN_MS) {
        this.circuitState = "half-open";
        return true; // Allow one probe request
      }
      return false;
    }

    // half-open: allow one request through
    return true;
  }

  private recordServerSuccess(): void {
    if (this.circuitState === "half-open") {
      this.circuitState = "closed";
    }
    this.circuitFailureCount = 0;
    this.persistCircuitState();
  }

  private recordServerFailure(): void {
    this.circuitFailureCount++;
    this.circuitLastFailureTime = Date.now();
    if (this.circuitFailureCount >= CIRCUIT_FAILURE_THRESHOLD) {
      this.circuitState = "open";
    }
    this.persistCircuitState();
  }

  /**
   * Determine inference mode based on device capability and model status
   * Priority: local > cloud > fallback
   */
  private async selectInferenceMode(requestedMode?: InterpretationMode): Promise<InferenceModeSelection> {
    // If user explicitly requested local mode
    if (requestedMode === "local") {
      const status = await aletheiaNativeClient.getLocalModelStatus();
      const capability = await aletheiaNativeClient.checkDeviceCapability();
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
        aletheiaNativeClient.checkDeviceCapability(),
        aletheiaNativeClient.getLocalModelStatus(),
      ]);

      const capability = capabilityResponse.capability;
      const modelInfo = modelStatusResponse.model_info;
      
      const localSupported = capability?.supported ?? false;
      const localReady = modelInfo?.status === "ready";
      
      // Keys live on server — nếu có mạng, server có keys. hasApiKey = isOnline.
      // Điều này cho phép cloud path được route đúng khi offline = false.
      const mode = determineInferenceMode({
        isOnline: this.getIsOnline(),
        isLocalReady: localReady,
        isLocalSupported: localSupported,
        hasApiKey: this.getIsOnline(),
      });

      trackInferenceMode(mode, {
        local_supported: localSupported,
        local_ready: localReady,
        has_api_key: false,
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

// Removed hasApiKeyConfigured since it relies on checking native module and we want to correctly route requests.

  streamInterpretation(
    request: InterpretationRequestPayload,
    handlers: StreamHandlers = {},
  ): AIStreamSession {
    let controller: AbortController | null = new AbortController();
    let localRequestId: string | null = null;

    const promise = (async () => {
      // Select inference mode
      const selection = await this.selectInferenceMode(request.mode);
      const startMs = Date.now();
      let serverTimeout: ReturnType<typeof setTimeout> | null = null;

      // Localize symbol display_name/flavor_text for the current UI locale so
      // both local (Rust) and server AI prompts receive the correct language name.
      const localizedSymbol = getLocalizedSymbol(request.symbol, getLocale());

      // If local mode is selected and ready, use native local inference
      if (selection.mode === "local" && selection.localReady) {
        trackLocalModelEvent("inference_started", {
          model_id: "qwen3.5-2b-instruct",
        });

        // Start local inference stream
        const streamResponse = await aletheiaNativeClient.startLocalInterpretationStream(
          request.passage,
          localizedSymbol,
          request.situationText,
          request.userIntent
        );
        
        if (streamResponse.request_id) {
          localRequestId = streamResponse.request_id;
          
          // Poll for results
          const chunks: string[] = [];
          while (true) {
            if (Date.now() - startMs > AI_STREAM_TIMEOUT_MS) {
              await aletheiaNativeClient.cancelLocalInterpretationStream(localRequestId);
              throw new Error("Local interpretation timed out.");
            }

            const state = await aletheiaNativeClient.pollLocalInterpretationStream(localRequestId);
            
            if (state.done || state.cancelled) {
              const rawText = state.full_text ?? "";

              // FM1 guard + harm check — empty (truncated <think>) or harmful → fallback
              if (!isSafeLocalOutput(rawText)) {
                const reason = !rawText.trim() ? "empty_response" : "harm_detected";
                trackLocalModelEvent("inference_failed", { reason });  // L6 observability
                const fallback =
                  request.sourceFallbackPrompts?.[0] ??
                  (request.sourceLanguage === "en"
                    ? "Take a moment to sit with these words. What do they stir in you?"
                    : "Hãy ngồi với những từ này một lúc. Điều gì đang rung lên trong bạn?");
                handlers.onChunk?.(fallback, fallback);
                return { chunks: [fallback], usedFallback: true };
              }

              // Format normalization (port of server finalizeInterpretationText)
              const finalText = finalizeLocalInterpretation(rawText, request.sourceLanguage);

              // Sentence-by-sentence reveal at ~600ms — "sealed letter" pattern
              const sentences = splitIntoSentences(finalText);
              let accumulated = "";
              for (let i = 0; i < sentences.length; i++) {
                accumulated += (accumulated ? " " : "") + sentences[i];
                handlers.onChunk?.(accumulated, sentences[i]!);
                if (i < sentences.length - 1) {
                  await new Promise((resolve) => setTimeout(resolve, 600));
                }
              }

              return { chunks: [finalText], usedFallback: false };
            }
            
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }
      }

      // Use server-side orchestration if available
      if (this.shouldUseServer()) {
        serverTimeout = setTimeout(() => {
          controller?.abort();
        }, AI_STREAM_TIMEOUT_MS);

        try {
          const response = await fetch(`${this.getServerUrl()}/api/interpret/stream`, {
            method: "POST",
            headers: await this.buildServerHeaders(),
            body: JSON.stringify({
              passage: request.passage,
              symbol: localizedSymbol,
              situationText: request.situationText,
              resonanceContext: request.resonanceContext,
              sourceLanguage: request.sourceLanguage,
              sourceFallbackPrompts: request.sourceFallbackPrompts,
              userIntent: request.userIntent,
              userLocale: getLocale(),
              mode: request.mode ?? "auto",
              useSonnet: request.useSonnet ?? false,
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            this.recordServerFailure();
            throw new Error(
              response.status === 401
                ? "AI request identity was rejected by the server."
                : `Interpretation request failed with status ${response.status}`,
            );
          }

          const result = await parseServerStream(response, handlers);
          this.recordServerSuccess();
          return result;
        } catch (streamError) {
          this.recordServerFailure();
          throw streamError;
        } finally {
          if (serverTimeout) {
            clearTimeout(serverTimeout);
          }
        }
      }

      // Fallback to direct aiClient (native path)
      return aiClient.streamInterpretation(request, handlers).promise;
    })().catch(async (error) => {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn("[Orchestrator] Primary interpretation path failed, using fallback:", reason);
      trackInferenceMode("fallback", {
        reason,
        requested_mode: request.mode ?? "auto",
        server_available: this.shouldUseServer(),
      });

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
          await aletheiaNativeClient.cancelLocalInterpretationStream(localRequestId);
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
