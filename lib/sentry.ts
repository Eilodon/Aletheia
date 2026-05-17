import * as Sentry from "@sentry/react-native";

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn("[Sentry] EXPO_PUBLIC_SENTRY_DSN not set, crash reporting disabled");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    enabled: !__DEV__, // Only enable in production builds
    beforeSend: (event: any) => {
      // Filter out sensitive data before sending
      if (event.exception?.values) {
        // Filter stack traces that might contain sensitive info
        event.exception.values.forEach((value: any) => {
          if (value.stacktrace?.frames) {
            value.stacktrace.frames = value.stacktrace.frames.map((frame: any) => ({
              ...frame,
              // Remove query params from filenames
              filename: frame.filename?.split("?")[0],
            }));
          }
        });
      }
      return event;
    },
    integrations: [
      // Keep minimal for beta - can add tracing later
    ],
  });

  console.log("[Sentry] Initialized successfully");
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  if (__DEV__) {
    console.error("[Sentry] Would capture in production:", error, context);
    return;
  }
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  if (__DEV__) {
    console.log(`[Sentry] ${level}:`, message);
    return;
  }
  Sentry.captureMessage(message, level);
}
