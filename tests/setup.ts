// Test environment baseline — values that must be set before any module loads.
// APP_ID must match what load-env.js loads from .env (placeholder-app-id in dev).
// Tests that hit requireAiRequestIdentity middleware derive appId from this same value.
process.env.APP_ID ??= "placeholder-app-id";
