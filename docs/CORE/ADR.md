# Aletheia Architecture Decisions

Last verified against repo: 2026-06-02.

This file keeps only decisions that still constrain the current beta implementation. Historical audit detail was removed from active docs.

## Accepted Decisions

### ADR-01 Offline-First Reading Loop

Reading, archive, user state, and fallback prompts must work without cloud AI. AI interpretation is an enhancement and must not gate the core reading flow.

### ADR-02 Android Is The Primary Native Beta Path

Android uses Expo, a local Expo native module, Rust core, UniFFI bindings, and app-private SQLite state. iOS native runtime is fail-closed until real parity is proven.

### ADR-03 Rust Core Owns Executable Domain Contracts

`core/src/contracts.rs` is the schema source of truth for domain enums, readings, user state, gift data, local model info, and error codes. TypeScript bridge types must follow executable contracts, not the other way around.

### ADR-04 Bundled Content Is Rust-Owned For Android Runtime

Android must bootstrap bundled content through the Rust/native runtime path. App screens must not import bundled catalog arrays directly for release behavior.

### ADR-05 App UI Uses Facades

Screens should call app-facing services such as `coreStore` and avoid direct native/runtime branching. Platform decisions belong in native adapters, runtime helpers, and service facades.

### ADR-06 Gift Requires A Real Backend Or Must Be Hidden

Gift create/redeem depends on server verification. There is no local fake-success fallback for beta. Missing backend config must surface explicit errors.

### ADR-07 AI Interpretation Is Local-First, Cloud-Optional

Preferred order is local Android model when ready, cloud/server quality lane when configured, then static fallback. Provider secrets must stay server-side or be injected intentionally through controlled runtime config.

### ADR-08 RevenueCat Is Optional But Real

Monetization uses a real optional RevenueCat integration. It must degrade to Free when SDK/API keys are unavailable, and it must be either fully tested or hidden for beta.

### ADR-09 Verification Is Tiered

Local development and release checks use:

```bash
pnpm verify:fast
pnpm verify:medium
pnpm verify:release
```

Release claims must be backed by fresh command output or explicit manual smoke-test evidence.
