# Beta Implementation Roadmap
> Current actionable roadmap after cleanup passes on 2026-03-31.
> Historical plans that no longer match the repo were removed.

---

## Summary

| Area | Status | Notes |
|---|---|---|
| Core beta code path | ✅ Mostly ready | Typecheck/tests/native Android build pass |
| Environment setup | ⚠️ Pending | Real `.env` and deployed services still required |
| Android SSOT hardening | ⚠️ Incomplete | Content ownership and some facade edges remain |
| Monetization | ⏸ Deferred decision | Paywall UI exists, SDK not wired |

---

## Phase 1 — Buildable Beta

### 1. Environment
**Status:** Pending

Required before a real beta build:
- `EXPO_PUBLIC_EAS_PROJECT_ID`
- `EXPO_PUBLIC_OWNER_NAME`
- `JWT_SECRET`
- `ALETHEIA_APP_SECRET`
- `EXPO_PUBLIC_ALETHEIA_APP_SECRET`
- `EXPO_PUBLIC_API_BASE_URL`
- at least one AI provider key

Recommended flow:

```bash
cp .env.example .env
pnpm install
```

Fill the values in `.env`, then verify:

```bash
pnpm check
pnpm test -- --run tests/store.test.ts tests/auth.logout.test.ts tests/reading-engine.test.ts
pnpm rust:android
```

### 2. Gift backend
**Status:** Pending

Gift create/redeem now fails clearly when backend config is missing.  
Required next step:
- deploy the gift backend
- set `EXPO_PUBLIC_GIFT_BACKEND_URL` or a working `EXPO_PUBLIC_API_BASE_URL`

### 3. Android beta build
**Status:** Pending

Once env and backend are in place:

```bash
eas build --platform android --profile preview --local
```

Success criteria:
- app launches
- reading flow works end-to-end
- AI provider config resolves correctly
- gift flow either works against real backend or is intentionally hidden

---

## Phase 2 — Architecture Hardening

### A. Rust-owned content pipeline
**Priority:** High

Problem:
- Android still seeds Rust from TS bundled content at runtime.

Goal:
- move bundled content ownership to a Rust-owned artifact or generation path
- keep TS as downstream consumer only

### B. Facade boundary cleanup
**Priority:** High

Problem:
- some UI/service layers still know about runtime/native branching details

Goal:
- keep platform decisions inside adapters/facades only
- continue shrinking direct native/runtime awareness above `lib/native/**`

### C. UniFFI read-model expansion
**Priority:** Medium

Problem:
- Android UI still does not have every future catalog/query model it may need from Rust

Goal:
- expose only the read APIs actually needed by Android release paths

---

## Phase 3 — Product Decisions

### Monetization
**Status:** Deferred

Current repo state:
- paywall UI exists
- RevenueCat dependency was removed because no real integration existed

Decision needed:
- if monetization is in beta scope, add the SDK back intentionally and wire it fully
- if not, keep paywall as non-production/mock UX or remove it from beta expectations

### Share card generation
**Status:** Partial

Current repo state:
- share-card UI path exists
- real native/card generation pipeline is not fully wired end-to-end

Next step:
- connect CardGenerator/native bridge to actual PNG generation path

---

## Current Non-Goals

These are not active beta deliverables right now:
- iOS shipping parity
- cloud sync
- social features
- v2 mirror analytics

---

## Working Baseline

Use this as the current regression baseline before and after roadmap work:

```bash
pnpm check
pnpm test -- --run tests/store.test.ts tests/auth.logout.test.ts tests/reading-engine.test.ts
pnpm rust:android
```
