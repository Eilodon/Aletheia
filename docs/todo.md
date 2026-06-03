# Aletheia Active Todo

Last verified against repo: 2026-06-03.

## P0 Beta Blockers

- [ ] Configure real `.env` values and pass `bash scripts/validate-env.sh`.
- [x] `assertStartupConfig()` dead import — called at startup in `app/_layout.tsx`.
- [x] Hide `.gift/` when backend not configured — early gate in `app/.gift/create.tsx`.
- [ ] Deploy gift backend (`EXPO_PUBLIC_GIFT_BACKEND_URL`) to unlock full gift flow.
- [ ] Set `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID` — paywall currently shows honest config error.
- [ ] Run Android local build and real-device smoke test.

## P1 Product Readiness

- [ ] Test AI local/cloud/fallback behavior on Android.
- [ ] Verify share-card generation end-to-end or remove share-card store claims.
- [ ] Confirm notification behavior on real device.
- [ ] Update store copy after deciding beta feature scope.
- [ ] Change bundle ID from `space.manus.*` to production ID in `app.config.ts`.
- [ ] Fill store metadata (support email, website URL, privacy policy URL).

## P1 Architecture

- [x] `node scripts/verify-architecture.mjs` — green.
- [x] TypeScript contracts clean — `pnpm check` 0 errors, 48/48 tests pass.
- [ ] Add contract drift checks for Rust contracts, UniFFI, and TS bridge types.
- [ ] Keep remaining native/runtime branching inside adapters/facades.

## P2 Content And UX

- [ ] Increase bundled passage depth per source if beta testing shows repetition.
- [ ] Improve `resonance_context` quality and coverage.
- [ ] Expand notification matrix beyond 20 entries if repetition appears.

## Deferred

- [ ] iOS native runtime parity.
- [ ] Cloud sync.
- [ ] Your Mirror v2 analytics UI.
- [ ] UGC marketplace or social features.
