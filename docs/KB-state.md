# Aletheia Current State

Last verified against repo: 2026-06-02.

## System Shape

- Android beta is the primary native release path.
- iOS native runtime remains fail-closed until UniFFI/native parity is proven.
- Web is supported through a TypeScript path and should not define Android contracts.
- Rust core owns persisted reading/user state and bundled content bootstrap.
- Server owns auth/session helpers, release readiness, and cloud interpretation routing.

## Confirmed Working

- `coreStore` is the app-facing facade for readings, user state, gifts, archive flags, and source access.
- Android runtime bootstraps content through Rust/native `bootstrapBundledContent()`, not by stringifying TS bundled arrays in app screens.
- App screens no longer import `BUNDLED_*` content directly for archive/detail behavior.
- Release verification tiers exist: `pnpm verify:fast`, `pnpm verify:medium`, `pnpm verify:release`.
- RevenueCat is wired as a graceful optional runtime: dependency exists, `initializePurchases()` runs at startup, and paywall can load offerings, purchase, and restore when API keys are configured.
- Gift create/redeem fails explicitly when `EXPO_PUBLIC_GIFT_BACKEND_URL` is missing or invalid.
- Android local model code targets `gemma-3-1b-it-qat-q4_0` GGUF, downloaded from HuggingFace into app-private storage.

## Active Gaps

### G-01 Environment And Services

Real beta still needs production `.env` values, deployed backend URLs, at least one AI provider key, Sentry DSN, and a real gift backend or hidden gift routes.

### G-02 Startup Guard

`assertStartupConfig()` is imported in `app/_layout.tsx` but is not invoked after `initSentry()`. Fix in code or remove the dead import.

### G-03 Gift Backend

Rust/native gift client expects:

- `POST /gift/create -> { token, deep_link }`
- `POST /gift/redeem -> GiftReading`

The app currently depends on an external configured backend for this surface.

### G-04 Monetization Readiness

RevenueCat has a real optional integration, but beta readiness still depends on configured API keys, RevenueCat product/package setup, and manual purchase/restore testing.

### G-05 Local AI Readiness

Android local inference implementation exists, but beta readiness depends on real device testing, model download reliability, MediaPipe compatibility, fallback behavior, and quality evaluation.

### G-06 Share Card Pipeline

Share UI exists, but native/card generation still needs end-to-end verification before store copy can promise production-quality share cards.

## Current Non-Goals

- iOS native beta parity.
- Cloud sync.
- UGC marketplace.
- Your Mirror v2 analytics UI.
- Large multi-model local AI matrix.

## Verification Baseline

Use the tiered scripts as the canonical baseline:

```bash
pnpm verify:fast
pnpm verify:medium
pnpm verify:release
```

For focused beta checks:

```bash
pnpm check
pnpm test -- --run tests/store.test.ts tests/auth.logout.test.ts tests/reading-engine.test.ts tests/ai-client.test.ts
pnpm rust:android
pnpm release:report --check
```
