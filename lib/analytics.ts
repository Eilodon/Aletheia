import { AppState, AppStateStatus, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { captureMessage } from "./sentry";
import type { InferenceMode } from "@/lib/types";

// R14: analytics requires explicit user consent before any events are sent.
const ANALYTICS_CONSENT_KEY = "aletheia:analytics:consent";

async function loadStoredConsent(): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      return typeof window !== "undefined" &&
        window.localStorage.getItem(ANALYTICS_CONSENT_KEY) === "true";
    }
    const value = await SecureStore.getItemAsync(ANALYTICS_CONSENT_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

async function persistConsent(granted: boolean): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        granted
          ? window.localStorage.setItem(ANALYTICS_CONSENT_KEY, "true")
          : window.localStorage.removeItem(ANALYTICS_CONSENT_KEY);
      }
      return;
    }
    granted
      ? await SecureStore.setItemAsync(ANALYTICS_CONSENT_KEY, "true")
      : await SecureStore.deleteItemAsync(ANALYTICS_CONSENT_KEY);
  } catch {
    // non-critical — consent defaults to false on next launch
  }
}

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  distinctId?: string;
}

class Analytics {
  // R14: disabled by default; enabled only after explicit consent + init() call.
  private enabled = false;
  private queue: AnalyticsEvent[] = [];
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;
  private isFlushing = false;
  private lifecycleBound = false;
  private appStateSubscription: { remove: () => void } | null = null;
  private visibilityHandler: (() => void) | null = null;
  private beforeUnloadHandler: (() => void) | null = null;
  private currentDistinctId: string | null = null;

  constructor() {
    // enabled stays false until init() restores stored consent.
  }

  async init(): Promise<void> {
    if (!POSTHOG_API_KEY || __DEV__) return;
    const consented = await loadStoredConsent();
    this.enabled = consented;
  }

  async grantConsent(): Promise<void> {
    await persistConsent(true);
    this.enabled = !!POSTHOG_API_KEY && !__DEV__;
  }

  async revokeConsent(): Promise<void> {
    this.enabled = false;
    await persistConsent(false);
    this.clearScheduledFlush();
    this.queue = [];
  }

  get consentGranted(): boolean {
    return this.enabled;
  }

  /**
   * Track an analytics event
   */
  track(event: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) {
      if (__DEV__) {
        console.log(`[Analytics] ${event}`, properties);
      }
      return;
    }

    this.queue.push({
      event,
      distinctId: this.currentDistinctId ?? undefined,
      properties: {
        ...properties,
        timestamp: Date.now(),
        platform: Platform.OS,
      },
    });

    // Flush immediately if queue gets large
    if (this.queue.length >= 12) {
      void this.flush();
      return;
    }

    this.ensureLifecycleBinding();
    this.scheduleFlush();
  }

  /**
   * Track screen view
   */
  screen(name: string, properties?: Record<string, unknown>): void {
    this.track("screen_view", { screen: name, ...properties });
  }

  /**
   * Identify user (for logged-in users)
   */
  identify(distinctId: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) return;

    this.currentDistinctId = distinctId;

    // Send identify event
    this.queue.push({
      event: "$identify",
      distinctId,
      properties: {
        $set: properties,
      },
    });

    this.ensureLifecycleBinding();
    this.scheduleFlush();
  }

  /**
   * Flush queued events to PostHog
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0 || !POSTHOG_API_KEY || this.isFlushing) return;

    this.clearScheduledFlush();

    const events = [...this.queue];
    this.queue = [];
    this.isFlushing = true;

    try {
      const response = await fetch(`${POSTHOG_HOST}/capture/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        keepalive: true,
        body: JSON.stringify({
          api_key: POSTHOG_API_KEY,
          batch: events.map((e) => ({
            event: e.event,
            properties: {
              ...e.properties,
              distinct_id: e.distinctId || "anonymous",
            },
            timestamp: new Date().toISOString(),
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`PostHog API error: ${response.status}`);
      }
    } catch {
      // Log to Sentry but don't crash the app
      captureMessage("Analytics flush failed", "warning");
      // Put events back in queue for retry
      this.queue.unshift(...events);
      this.clearScheduledFlush();
      this.scheduleFlush(5000);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;

    if (typeof document !== "undefined" && this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (typeof window !== "undefined" && this.beforeUnloadHandler) {
      window.removeEventListener("beforeunload", this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }

    this.clearScheduledFlush();
    void this.flush();
  }

  private scheduleFlush(delayMs: number = 4000): void {
    if (this.flushTimeout) {
      return;
    }

    this.flushTimeout = setTimeout(() => {
      this.flushTimeout = null;
      void this.flush();
    }, delayMs);
  }

  private clearScheduledFlush(): void {
    if (!this.flushTimeout) {
      return;
    }

    clearTimeout(this.flushTimeout);
    this.flushTimeout = null;
  }

  private ensureLifecycleBinding(): void {
    if (!this.enabled || this.lifecycleBound) {
      return;
    }

    this.lifecycleBound = true;
    this.appStateSubscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state !== "active") {
        void this.flush();
      }
    });

    if (typeof document !== "undefined") {
      this.visibilityHandler = () => {
        if (document.visibilityState === "hidden") {
          void this.flush();
        }
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);
    }

    if (typeof window !== "undefined") {
      this.beforeUnloadHandler = () => {
        void this.flush();
      };
      window.addEventListener("beforeunload", this.beforeUnloadHandler);
    }
  }
}

// Singleton instance
export const analytics = new Analytics();

// Convenience exports
export const track = (event: string, properties?: Record<string, unknown>) =>
  analytics.track(event, properties);
export const screen = (name: string, properties?: Record<string, unknown>) =>
  analytics.screen(name, properties);
export const identify = (id: string, properties?: Record<string, unknown>) =>
  analytics.identify(id, properties);
export const flushAnalytics = () => analytics.flush();

// R14: consent management — call initAnalytics() at app startup to restore prior consent.
// Call grantAnalyticsConsent() when user explicitly accepts analytics in the consent UI.
export const initAnalytics = () => analytics.init();
export const grantAnalyticsConsent = () => analytics.grantConsent();
export const revokeAnalyticsConsent = () => analytics.revokeConsent();
export const getAnalyticsConsent = () => analytics.consentGranted;
export const checkAnalyticsConsent = () => loadStoredConsent();

export const trackRitualEvent = (
  step:
    | "start"
    | "daily_limit_hit"
    | "symbol_chosen"
    | "ai_requested"
    | "ai_completed"
    | "ai_cancelled"
    | "save_completed"
    | "error",
  properties?: Record<string, unknown>,
) => track(`ritual_${step}`, properties);

export const trackArchiveEvent = (
  action:
    | "screen_view"
    | "search"
    | "filter_changed"
    | "sort_changed"
    | "reading_opened"
    | "favorite_toggled"
    | "reopened"
    | "reading_deleted",
  properties?: Record<string, unknown>,
) => track(`archive_${action}`, properties);

export const trackShareEvent = (
  action: "entry" | "theme_changed" | "shared" | "text_shared" | "failed",
  properties?: Record<string, unknown>,
) => track(`share_${action}`, properties);

export const trackGiftEvent = (
  action: "create_attempted" | "created" | "create_failed" | "shared",
  properties?: Record<string, unknown>,
) => track(`gift_${action}`, properties);

// ============================================================================
// LOCAL INFERENCE TELEMETRY (CYCLE 2)
// ============================================================================

export const trackLocalModelEvent = (
  action:
    | "capability_checked"
    | "download_started"
    | "download_progress"
    | "download_completed"
    | "download_failed"
    | "download_cancelled"
    | "model_deleted"
    | "inference_started"
    | "inference_completed"
    | "inference_failed"
    | "inference_cancelled",
  properties?: Record<string, unknown>,
) => track(`local_model_${action}`, properties);

export const trackInferenceMode = (
  mode: InferenceMode,
  properties?: Record<string, unknown>,
) =>
  track("inference_mode_selected", {
    mode,
    ...properties,
  });

export const trackLocalInferencePerformance = (properties: {
  tokens_per_second: number;
  total_tokens: number;
  latency_ms: number;
  model_id: string;
  device_ram_mb: number;
  device_cpu_cores: number;
}) => track("local_inference_performance", properties);
