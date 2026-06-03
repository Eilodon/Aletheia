# Aletheia Blueprint

Last verified against repo: 2026-06-02.

## Overview

Aletheia is an Expo/React Native ritual reading app with:

- Android native beta path through a local Expo module and Rust core.
- Web companion path through TypeScript services.
- TypeScript Express/tRPC server for auth/session helpers, system health, release readiness, and cloud interpretation.
- Optional product surfaces for gift, RevenueCat payments, local AI, and share cards.

## Runtime Boundaries

| Layer | Owns |
|---|---|
| `app/` | Screens, navigation, UI states. |
| `lib/services/core-store.ts` | App-facing facade for reading/user/archive/gift operations. |
| `lib/native/**` | Native availability, bridge unwrapping, Android runtime init. |
| `modules/aletheia-core-module/**` | Expo native module and platform-specific native implementation. |
| `core/src/**` | Rust contracts, store, readings, AI client, gift client, local inference interface. |
| `server/_core/**` | Server env, auth/session, interpretation service, rate limiting, release readiness. |

## Reading Flow

1. User completes onboarding and selects reading context.
2. UI calls `coreStore` rather than native clients directly.
3. Android path initializes Rust/native store and bundled content.
4. User chooses a symbol manually or automatically.
5. Passage renders from the selected source and symbol.
6. Optional AI interpretation selects local/cloud/fallback mode.
7. Completed reading is persisted locally.

## AI Interpretation

Current implementation:

- Server source of truth: `server/_core/interpretationService.ts`.
- Rust cloud client: `core/src/ai_client.rs`.
- Android local runtime: `modules/aletheia-core-module/android/.../LocalInferenceEngine.kt`.
- Prompt contract: `docs/PROMPT_CONTRACT.md`.

Mode behavior:

- Local: Android native model `gemma-3-1b-it-qat-q4_0` GGUF when downloaded and device-supported.
- Cloud: server/provider routing through Anthropic, OpenAI, or Gemini when configured.
- Fallback: static prompts or clear fallback output when local/cloud are unavailable.

## Gift Flow

The Rust gift client expects:

```text
POST /gift/create -> { token, deep_link }
POST /gift/redeem -> GiftReading or typed gift error
```

Gift is beta-ready only if `EXPO_PUBLIC_GIFT_BACKEND_URL` points to a deployed backend and manual tests pass. Otherwise gift routes and store promises must be hidden.

## Monetization

RevenueCat is wired but optional:

- Startup calls `initializePurchases()`.
- Paywall loads current offering and can purchase/restore packages.
- Missing API keys or SDK failure safely returns Free/no offering.

Beta must either configure RevenueCat and test purchase/restore, or hide `.paywall/`.

## Local Model

Current Android target:

- Model ID: `gemma-3-1b-it-qat-q4_0`
- File: `gemma-3-1b-it-q4_0.gguf`
- Expected size: about 529 MB
- Download URL: HuggingFace `google/gemma-3-1b-it-qat-q4_0-gguf`

Older multi-GB MediaPipe model guidance is not active.

## Non-Goals For Current Beta

- iOS native shipping parity.
- Cloud sync.
- UGC marketplace.
- Your Mirror v2 analytics UI.
- Multi-variant local model matrix.

## Guardrails

Run architecture guard before release:

```bash
node scripts/verify-architecture.mjs
```

It checks that app screens do not depend directly on bundled content imports or native runtime branching.
