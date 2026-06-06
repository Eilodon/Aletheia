# ADR: Beta hardening guards and local-first contract closure

## 1. Title
Beta hardening now uses automated contract, privacy, model-ops, and archetype-asset guards.

## 2. Context
AletheiA relies on a manually mirrored SSOT chain across `CONTRACTS.md`, Rust, UDL, generated TypeScript, and native module payloads. The beta audit found four risks: contract drift, partial local-model downloads being treated as ready, privacy controls that were visible but incomplete, and symbol artwork coupled directly to `Symbol.id`. A follow-up P0 audit found additional drift: AI quota text used `readings_today` instead of `ai_calls_today`, cloud fallback lacked an explicit consent mode, entitlement-safe source lookup was not the default native path, and AI interpretation text needed a child record instead of living only as a `Reading` flag.

## 3. Decision
We added `spec:lint` and regression tests to protect the contract chain, moved native reading deletion through the native bridge into Rust SQLite, hardened Android model download validation, completed Settings privacy/export affordances, and introduced optional `Symbol.archetype_asset_id` so symbol semantics can evolve separately from artwork. The P0 follow-up adds `AiPrivacyMode`, cloud-consent gating, `AiDailyLimitReached`, `get_sources_for_user`, manifest SHA-256 validation for Android model downloads, and an `Interpretation` child record exposed through Rust, UDL, generated bindings, Android module, and TS native client. [verified 2026-06-05]

## 4. Status
ACCEPTED

## 5. Consequences
The beta gates now catch contract drift and the specific model/privacy/asset/quota/entitlement regressions addressed in this cycle. Local AI no longer consumes Free cloud quota, and cloud fallback is blocked unless the user mode allows it or the user confirms consent. The cost is more source-level regression tests, a larger persisted schema, and a wider generated binding surface that must stay synchronized. Android Rust artifacts are buildable from the shell with the installed NDK. [verified 2026-06-05]

## 6. Alternatives Considered
- Keep DSDD as manual discipline only: rejected because the existing ADR already identified manual mirror drift as a governance risk.
- Leave symbol artwork mapped from `Symbol.id`: rejected because content and theme packs need visual asset reuse without renaming symbols.
- Treat any downloaded model file as prepared: rejected because a partial 1-2GB binary can block redownload and never initialize.
- Keep `get_sources(premium_allowed)` as the production native API: rejected because it trusts a UI boolean for entitlement.
- Store only `Reading.ai_interpreted`/`ai_used_fallback`: rejected because privacy/export/delete flows need interpretation text and lineage as a separately targetable child record.

## 7. Evidence
- `pnpm rust:android` -> built arm64-v8a release artifact successfully. [verified 2026-06-05]
- `pnpm verify:medium` -> passed `pnpm check`, fast Vitest suite `21/21`, `spec:lint`, bundled content check, regression tests `25/25`, and architecture guard. [verified 2026-06-05]
- `cargo test` in `core/` -> `34/34` passed. [verified 2026-06-05]
- `pnpm preandroid` -> native staging is up to date. [verified 2026-06-05]
- `git diff --check` -> passed with no whitespace errors. [verified 2026-06-05]
- `tests/beta-p0-guards.test.ts` -> protects AI quota semantics, cloud consent mode, Android backup exclusion, local model manifest validation, entitlement-safe source lookup, and interpretation child-record native exposure. [verified 2026-06-05]

## 8. Owner
AletheiA maintainers

## 8b. Known Debts (PATTERN-DEBT)
PATTERN-DEBT entries introduced or affected by this change:
  - None introduced in this cycle.

## 9. Next Cycle Trigger
When `pnpm spec:lint` or `tests/beta-p0-guards.test.ts` fails in CI OR when a new content/theme pack adds more than 6 symbols without explicit `archetype_asset_id` coverage.

## 10. Cycle Retrospective
- Manual SSOT was already documented, but the missing enforcement was the real risk; future schema changes should start by extending `spec:lint`.
- Generated `lib/types.ts` created trailing blank-line churn until `sync-types.ts` normalized EOF output.
- Android NDK was installed but not exported into the shell; native verification needs explicit `ANDROID_HOME`/`ANDROID_NDK_HOME` unless the user profile exports them.
- `archetype_asset_id` needed `serde(default)` and optional TS generation to avoid breaking older content literals.
- Settings privacy copy must be treated as a testable product contract, not descriptive prose.
- UniFFI generation can reintroduce trailing whitespace when local formatters are missing; keep `git diff --check` in the closeout gate.
