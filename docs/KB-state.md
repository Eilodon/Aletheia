# VHEATM 5.0 Knowledge Base — Project Aletheia

> Current-state summary after cleanup passes on 2026-03-31.
> This file is intentionally compact. Historical audit chatter was removed to keep only repo-relevant state.
> When this file conflicts with source code, source code wins.

---

## Current Architecture

### System Shape
- **Android app:** Expo shell + local Expo module + Rust core. Android is the primary native beta path.
- **Web app:** Expo web shell + TypeScript service path. Web is allowed to diverge from Android implementation details.
- **Rust core:** Reading flow, user state, gifts, notification selection, AI orchestration, SQLite persistence.
- **Server:** Express/tRPC bootstrap/auth/config surface with in-memory user store. It is not a persistence source of truth.
- **iOS:** Explicitly outside the active beta path.

### Source of Truth Boundaries
- **Android runtime state:** Rust core is the intended SSOT.
- **Web runtime state:** TypeScript services/store path.
- **Contracts:** Executable Rust + UDL + synced TS types. Docs are descriptive, not authoritative.
- **Bundled content:** Still seeded from TS `seed-data.ts` into Rust at runtime. This is the main remaining SSOT gap.

---

## Verified Repo State

### Confirmed Working
- `coreStore` exists and is the main app-facing facade for reading, history, gifts, and user state.
- `content.ts` now re-exports from `seed-data.ts`; the legacy local JSON content folder is no longer on the active runtime path.
- Android prebuild/build requires Rust artifacts and UniFFI bindings; it no longer silently degrades to a JS-only Android path.
- `user_intent` is persisted through `coreStore.updateUserState()` during onboarding and injected into Rust reading sessions.
- Notification matrix current repo state is **20 curated entries**, not the older 150-entry design target.
- Gift flow now fails clearly when backend config is missing instead of pretending success with fake local tokens.

### Cleanup Already Applied
- Removed stale beta audit snapshot files and duplicate knowledge-base docs.
- Removed dead template/reset scripts and unused Expo sample assets.
- Removed dead package surface for `@react-native-async-storage/async-storage`, `react-native-purchases`, and `dotenv`.
- Removed disabled `db:push`/server-sync placeholders from active repo surface.

---

## Open Architectural Gaps

### A-01 — Android content is not Rust-owned yet
**Status:** Open  
**Why it matters:** Android still seeds Rust from TS bundled data at runtime. That means Android SSOT is operationally close, but not structurally complete.  
**Target:** Move content ownership to a Rust-owned artifact or generation pipeline and keep TS downstream only.

### A-02 — Facade boundary is still incomplete
**Status:** Open  
**Why it matters:** Some UI/service layers still know too much about native/runtime branching.  
**Target:** Keep platform branching inside adapters/facades only.

### A-03 — UniFFI read-model surface is still thinner than ideal
**Status:** Open  
**Why it matters:** Android UI still lacks a fully Rust-backed catalog/query layer for all future read models.  
**Target:** Expand UniFFI only where Android UI needs stable read access.

### A-04 — Monetization is still mock-only
**Status:** Open  
**Why it matters:** Paywall UI exists, but RevenueCat SDK is not wired and was intentionally removed from active dependencies.  
**Target:** Reintroduce a real monetization SDK only when the product path is committed.

---

## Active Risks

### R-01 — Build/config risk
- `.env` setup remains required for EAS/project metadata and production-facing backend configuration.
- Gift backend remains externally required for real gift create/redeem behavior.

### R-02 — Documentation drift risk
- `ADR.md`, `BLUEPRINT.md`, and `CONTRACTS.md` are now closer to repo state, but future cleanup/refactor work must update them in the same cycle.

### R-03 — Beta scope ambiguity
- Android + web are the only meaningful active release surfaces.
- iOS and monetization should not be treated as “almost done” unless code paths are truly wired.

---

## Active Backlog

### Priority 1
- Move Android bundled content ownership away from TS runtime seeds.
- Reduce remaining direct runtime/native branching above facade level.
- Expand UniFFI read APIs only for Android-consumed models that still lack clean Rust access.

### Priority 2
- Wire real share-card generation through the native/card pipeline.
- Deploy and validate real gift backend flow.
- Decide whether monetization is in or out for beta; if in, reintroduce SDK intentionally.

### Priority 3
- Keep pruning stale docs, comments, and mock-only assumptions that no longer match the repo.

---

## Verification Baseline

Use these commands as the current lightweight regression baseline:

```bash
pnpm check
pnpm test -- --run tests/store.test.ts tests/auth.logout.test.ts tests/reading-engine.test.ts
pnpm rust:android
```

If these fail after a cleanup/refactor pass, the repo state is no longer aligned with this KB.
