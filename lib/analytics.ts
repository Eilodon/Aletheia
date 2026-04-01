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
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.enabled = !!POSTHOG_API_KEY && !__DEV__;

    if (this.enabled) {
      // Flush queue every 30 seconds
      this.flushInterval = setInterval(() => this.flush(), 30000);
    }
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
    if (this.queue.length >= 20) {
      this.flush();
    }
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
  }

  /**
   * Flush queued events to PostHog
   */
  private async flush(): Promise<void> {
    if (this.queue.length === 0 || !POSTHOG_API_KEY) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch(`${POSTHOG_HOST}/capture/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
    } catch (_err) {
      // Log to Sentry but don't crash the app
      captureMessage("Analytics flush failed", "warning");
      // Put events back in queue for retry
      this.queue.unshift(...events);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
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
