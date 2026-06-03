# Beta Release Checklist

Last verified against repo: 2026-06-02.

## Pre-Build

- [ ] Copy `.env.example` to `.env` and replace placeholders.
- [ ] Run `bash scripts/validate-env.sh`.
- [ ] Run `pnpm release:report --check`.
- [ ] Confirm beta scope:
  - [ ] Gift is backed by a deployed backend or `.gift/` routes are hidden.
  - [ ] RevenueCat is configured and tested or `.paywall/` is hidden.
  - [ ] Local AI model manager is tested on Android or hidden from non-dev beta users.
  - [ ] iOS native runtime remains out of scope.

## Required Environment

- [ ] `EXPO_PUBLIC_EAS_PROJECT_ID`
- [ ] `EXPO_PUBLIC_OWNER_NAME`
- [ ] `JWT_SECRET`
- [ ] `EXPO_PUBLIC_API_BASE_URL`
- [ ] `EXPO_PUBLIC_SENTRY_DSN`
- [ ] At least one AI provider key:
  - [ ] `ALETHEIA_CLAUDE_API_KEY`
  - [ ] `ALETHEIA_OPENAI_API_KEY`
  - [ ] `ALETHEIA_GEMINI_API_KEY`

## Optional Product Environment

- [ ] `EXPO_PUBLIC_GIFT_BACKEND_URL`
- [ ] `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`
- [ ] `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`

## Verification

```bash
pnpm verify:fast
pnpm verify:medium
pnpm verify:release
```

Focused fallback if release tier is too broad during iteration:

```bash
pnpm check
pnpm test -- --run tests/store.test.ts tests/auth.logout.test.ts tests/reading-engine.test.ts tests/ai-client.test.ts
pnpm rust:android
pnpm release:report --check
```

## Android Build

```bash
eas build --platform android --profile preview --local
```

## Manual Device Smoke

- [ ] App launches.
- [ ] Onboarding completes.
- [ ] Reading flow works end-to-end.
- [ ] Wildcard selection works.
- [ ] Passage screen renders.
- [ ] AI request returns local, cloud, or fallback output with clear user behavior.
- [ ] Archive/history renders.
- [ ] Favorite/share flags do not crash.
- [ ] Notifications are registered or intentionally disabled.
- [ ] Gift flow works against real backend or is hidden.
- [ ] RevenueCat purchase/restore works or paywall is hidden.

## Post-Build

- [ ] Capture build artifact path.
- [ ] Capture verification command outputs.
- [ ] Capture real-device smoke result.
- [ ] Update `docs/KB-state.md` if release scope changed.
