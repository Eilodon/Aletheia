import { useState, useEffect, useCallback } from "react";

import { getAletheiaCoreModule } from "@/modules/aletheia-core-module";
import {
  NativeLocalModelInfo,
  NativeLocalModelStatus,
  NativeDeviceCapability,
} from "@/modules/aletheia-core-module";
import {
  trackLocalModelEvent,
  trackInferenceMode,
} from "@/lib/analytics";

export type { NativeLocalModelInfo as LocalModelInfo };
export type { NativeLocalModelStatus as LocalModelStatus };
export type { NativeDeviceCapability as DeviceCapability };

export interface UseLocalModelResult {
  /** Device capability info */
  capability: NativeDeviceCapability | null;
  /** Current model status */
  modelInfo: NativeLocalModelInfo | null;
  /** Whether the model is ready for inference */
  isReady: boolean;
  /** Whether the device supports local inference */
  isSupported: boolean;
  /** Whether a download is in progress */
  isDownloading: boolean;
  /** Download progress (0-100) */
  downloadProgress: number;
  /** Loading state for initial capability check */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Check device capability */
  checkCapability: () => Promise<void>;
  /** Get current model status */
  getModelStatus: () => Promise<void>;
  /** Start model download */
  prepareModel: (forceDownload?: boolean) => Promise<boolean>;
  /** Cancel ongoing download */
  cancelDownload: () => Promise<void>;
  /** Delete downloaded model */
  deleteModel: () => Promise<boolean>;
  /** Refresh all status */
  refresh: () => Promise<void>;
}

export function useLocalModel(): UseLocalModelResult {
  const [capability, setCapability] = useState<NativeDeviceCapability | null>(null);
  const [modelInfo, setModelInfo] = useState<NativeLocalModelInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const module = getAletheiaCoreModule();

  const checkCapability = useCallback(async () => {
    try {
      const response = await module.checkDeviceCapability();
      if (response.capability) {
        setCapability(response.capability);
        trackLocalModelEvent("capability_checked", {
          supported: response.capability.supported,
          available_ram_mb: response.capability.available_ram_mb,
          cpu_cores: response.capability.cpu_cores,
        });
      }
      if (response.error) {
        setError(response.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check capability");
    }
  }, [module]);

  const getModelStatus = useCallback(async () => {
    try {
      const response = await module.getLocalModelStatus();
      if (response.model_info) {
        setModelInfo(response.model_info);
      }
      if (response.error) {
        setError(response.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get model status");
    }
  }, [module]);

  const prepareModel = useCallback(async (forceDownload = false): Promise<boolean> => {
    try {
      trackLocalModelEvent("download_started", { force_download: forceDownload });
      
      const response = await module.prepareLocalModel(forceDownload);
      
      if (response.started) {
        // Poll for status updates
        const pollInterval = setInterval(async () => {
          const status = await module.getLocalModelStatus();
          if (status.model_info) {
            setModelInfo(status.model_info);
            
            if (status.model_info.status !== "downloading") {
              clearInterval(pollInterval);
              
              if (status.model_info.status === "ready") {
                trackLocalModelEvent("download_completed");
              } else if (status.model_info.status === "error") {
                trackLocalModelEvent("download_failed", {
                  error: status.model_info.error_message,
                });
              }
            } else {
              trackLocalModelEvent("download_progress", {
                progress: status.model_info.download_progress,
              });
            }
          }
        }, 1000);
        
        return true;
      }
      
      if (response.error) {
        trackLocalModelEvent("download_failed", { error: response.error.message });
        setError(response.error.message);
      }
      
      return false;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to prepare model";
      trackLocalModelEvent("download_failed", { error: errorMsg });
      setError(errorMsg);
      return false;
    }
  }, [module]);

  const cancelDownload = useCallback(async () => {
    try {
      await module.cancelLocalModelDownload();
      trackLocalModelEvent("download_cancelled");
      await getModelStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel download");
    }
  }, [module, getModelStatus]);

  const deleteModel = useCallback(async (): Promise<boolean> => {
    try {
      const result = await module.deleteLocalModel();
      if (result) {
        trackLocalModelEvent("model_deleted");
        await getModelStatus();
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete model");
      return false;
    }
  }, [module, getModelStatus]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await Promise.all([checkCapability(), getModelStatus()]);
    setIsLoading(false);
  }, [checkCapability, getModelStatus]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  const isReady = modelInfo?.status === "ready";
  const isSupported = capability?.supported ?? false;
  const isDownloading = modelInfo?.status === "downloading";
  const downloadProgress = modelInfo?.download_progress ?? 0;

  return {
    capability,
    modelInfo,
    isReady,
    isSupported,
    isDownloading,
    downloadProgress,
    isLoading,
    error,
    checkCapability,
    getModelStatus,
    prepareModel,
    cancelDownload,
    deleteModel,
    refresh,
  };
}

/**
 * Determine the inference mode based on device state
 */
export function determineInferenceMode(params: {
  isOnline: boolean;
  isLocalReady: boolean;
  isLocalSupported: boolean;
  hasApiKey: boolean;
}): "local" | "cloud" | "fallback" | "offline" {
  const { isOnline, isLocalReady, isLocalSupported, hasApiKey } = params;

  // Offline mode - no network and no local model
  if (!isOnline && !isLocalReady) {
    return "offline";
  }

  // Local mode - prefer local if ready (even when offline)
  if (isLocalReady && isLocalSupported) {
    return "local";
  }

  // Cloud mode - online with API key
  if (isOnline && hasApiKey) {
    return "cloud";
  }

  // Fallback mode - offline but can use cached prompts
  if (!isOnline) {
    return "fallback";
  }

  // Default to cloud if online but no local model
  return "cloud";
}

/**
 * Hook to track inference mode selection
 */
export function useInferenceModeTracking() {
  const trackMode = useCallback(
    (mode: "local" | "cloud" | "fallback" | "offline", properties?: Record<string, unknown>) => {
      trackInferenceMode(mode, properties);
    },
    []
  );

  return { trackMode };
}
