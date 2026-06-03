// Test environment baseline — values that must be set before any module loads.
// APP_ID must match what load-env.js loads from .env (placeholder-app-id in dev).
// Tests that hit requireAiRequestIdentity middleware derive appId from this same value.
process.env.APP_ID ??= "placeholder-app-id";

// React Native global — undefined in Node.js. Guard against ReferenceError in any
// test that imports analytics.ts, sentry.ts, or use-startup-guard.ts.
(globalThis as unknown as Record<string, unknown>).__DEV__ ??= process.env.NODE_ENV !== "production";
