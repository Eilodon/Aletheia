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
- **Android runtime state:** Rust core is the active SSOT.
- **Web runtime state:** TypeScript services/store path.
- **Contracts:** Executable Rust + UDL + synced TS types. Docs are descriptive, not authoritative.
- **Bundled content:** Rust now boots bundled content from `core/content/bundled-content.json`; TypeScript consumes a generated downstream export.

---

## Current VHEATM Cycle

### Cycle 1 — Core Convergence + Verification Harness
- **Status:** Completed
- **Plan doc:** `docs/CYCLE_1_CORE_CONVERGENCE_PLAN.md`
- **Cycle objective:** Close Android SSOT gap, remove facade leakage, restore native archive parity, and install stronger verification tiers.

### Verified Cycle 1 Evidence
- Android native init now calls `bootstrapBundledContent()` and no longer serializes TS bundled arrays into Rust.
- Rust bundled content artifact now lives at `core/content/bundled-content.json`.
- TypeScript bundled arrays are now generated downstream into `lib/data/seed-data.generated.ts`.
- Rust archive-side capability (`get_reading_by_id`, `update_reading`) is now exposed through UniFFI and `coreStore`.
- Archive/detail screens no longer import bundled content directly.

### Cycle 1 Exit Criteria
- Android no longer seeds bundled content from TS JSON at runtime. ✅
- Archive/detail screens no longer import bundled content directly. ✅
- Android archive actions have bridge-backed parity or explicit facade capability reads. ✅
- Verification tiers exist beyond the lightweight baseline. ✅

### Cycle 2 — Archive, Share, Gift Flywheel + Observability
- **Status:** Completed
- **Cycle objective:** Turn archive into a retention surface, add measurable ritual/share/gift funnels, and expose operational health beyond basic API uptime.

### Verified Cycle 2 Evidence
- Ritual funnel events now emit through `lib/analytics.ts` from home entry, reading state transitions, share-card, archive interactions, and gift creation attempts.
- `Gương` now supports keyword search alongside filter/sort, turning history into an actual retrieval surface rather than a flat list.
- Archive detail now supports gift creation and share of a gift deep link through `coreStore.createGift(...)`.
- Deep health now reports gift backend configuration status in addition to database, AI, and storage checks.

### Cycle 2 Exit Criteria
- Core ritual funnel is instrumented end to end. ✅
- Archive supports search/filter/sort with measurable interactions. ✅
- Share and gift actions exist as real user surfaces, not only backend helpers. ✅
- Operational health includes gift backend visibility. ✅

### Cycle 3 — Performance Hardening + Release Visibility + Boundary Closure
- **Status:** Completed
- **Cycle objective:** Reduce bootstrap noise, remove the remaining high-value native/runtime leak above the facade line, and expose actionable release readiness beyond ad hoc logs.

### Verified Cycle 3 Evidence
- `ai-client` now routes native AI work through `lib/services/ai-runtime.ts` instead of importing native runtime and bridge modules directly.
- Root bootstrap in `app/_layout.tsx` now runs as a single orchestrated sequence with startup timing telemetry and deferred native probe work.
- Analytics flushing now follows queue pressure and app/page lifecycle signals instead of a blind 30-second interval.
- Release readiness is now exposed through `server/_core/releaseReadiness.ts`, `/api/health/release`, and `pnpm release:report`.

### Cycle 3 Exit Criteria
- Remaining direct runtime/native branching above facade level is materially reduced. ✅
- App bootstrap is measured and less redundant than the previous multi-effect startup path. ✅
- Release visibility has a machine-readable report and a verification rail. ✅
- Architecture guardrails catch `ai-client` regressions back to direct native imports. ✅

---

## Verified Repo State

### Confirmed Working
- `coreStore` exists and is the main app-facing facade for reading, history, gifts, and user state.
- `content.ts` now re-exports bundled arrays from a generated TS artifact fed by `core/content/bundled-content.json`.
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

### A-02 — Facade boundary is still incomplete
**Status:** Open  
**Why it matters:** Most high-traffic paths are now behind facades, but some service-level runtime branching still exists outside the strict adapter boundary.  
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
- Finish collapsing the remaining service-level runtime branching that is still outside strict adapter boundaries.
- Expand UniFFI read APIs only for Android-consumed models that still lack clean Rust access.
- Keep archive/detail parity green while adding new growth surfaces.

### Priority 2
- Wire real share-card generation through the native/card pipeline.
- Deploy and validate real gift backend flow in production environments.
- Turn release readiness into a surfaced operator dashboard instead of a server-only JSON report.

### Priority 3
- Keep pruning stale docs, comments, and mock-only assumptions that no longer match the repo.

---

## Verification Baseline

Use these commands as the current regression baseline:

```bash
pnpm verify:fast
pnpm verify:medium
pnpm verify:release
```
