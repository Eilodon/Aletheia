import { AppState, AppStateStatus } from "react-native";

import { captureMessage } from "./sentry";

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  distinctId?: string;
}

class Analytics {
  private enabled = false;
  private queue: AnalyticsEvent[] = [];
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;
  private isFlushing = false;
  private lifecycleBound = false;
  private appStateSubscription: { remove: () => void } | null = null;
  private visibilityHandler: (() => void) | null = null;
  private beforeUnloadHandler: (() => void) | null = null;

  constructor() {
    this.enabled = !!POSTHOG_API_KEY && !__DEV__;
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
      properties: {
        ...properties,
        timestamp: Date.now(),
        platform: typeof navigator !== "undefined" ? "web" : "native",
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
    | "reopened",
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
  mode: "local" | "cloud" | "fallback" | "offline",
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
