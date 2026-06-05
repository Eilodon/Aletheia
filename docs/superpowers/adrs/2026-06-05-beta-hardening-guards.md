# ADR: Beta hardening guards and local-first contract closure

## 1. Title
Beta hardening now uses automated contract, privacy, model-ops, and archetype-asset guards.

## 2. Context
AletheiA relies on a manually mirrored SSOT chain across `CONTRACTS.md`, Rust, UDL, generated TypeScript, and native module payloads. The beta audit found four risks: contract drift, partial local-model downloads being treated as ready, privacy controls that were visible but incomplete, and symbol artwork coupled directly to `Symbol.id`.

## 3. Decision
We added `spec:lint` and regression tests to protect the contract chain, moved native reading deletion through the native bridge into Rust SQLite, hardened Android model download validation, completed Settings privacy/export affordances, and introduced optional `Symbol.archetype_asset_id` so symbol semantics can evolve separately from artwork. [verified 2026-06-05]

## 4. Status
ACCEPTED

## 5. Consequences
The beta gates now catch contract drift and the specific model/privacy/asset regressions addressed in this cycle. The cost is more source-level regression tests and an expanded schema surface that must stay synchronized with future generated bindings. Android Rust artifacts are buildable when `ANDROID_HOME` and `ANDROID_NDK_HOME` are set in the shell. [verified 2026-06-05]

## 6. Alternatives Considered
- Keep DSDD as manual discipline only: rejected because the existing ADR already identified manual mirror drift as a governance risk.
- Leave symbol artwork mapped from `Symbol.id`: rejected because content and theme packs need visual asset reuse without renaming symbols.
- Treat any downloaded model file as prepared: rejected because a partial 1-2GB binary can block redownload and never initialize.

## 7. Evidence
- `ANDROID_HOME=/home/ybao/Android/Sdk ANDROID_NDK_HOME=/home/ybao/Android/Sdk/ndk pnpm rust:android` -> built arm64-v8a release artifact successfully. [verified 2026-06-05]
- `pnpm verify:medium` -> passed `pnpm check`, fast Vitest suite `21/21`, `spec:lint`, bundled content check, regression tests `18/18`, and architecture guard. [verified 2026-06-05]
- `cargo test` in `core/` -> `34/34` passed. [verified 2026-06-05]
- `git diff --check` -> passed with no whitespace errors. [verified 2026-06-05]
- `git status --ignored --short` -> build/cache outputs remain ignored (`artifacts/`, `core/target/`, Gradle build dirs, env files, node_modules); no new ignore rule was needed. [verified 2026-06-05]

## 8. Owner
AletheiA maintainers

## 8b. Known Debts (PATTERN-DEBT)
PATTERN-DEBT entries introduced or affected by this change:
  - None introduced in this cycle.

## 9. Next Cycle Trigger
When `pnpm spec:lint` fails in CI OR when a new content/theme pack adds more than 6 symbols without explicit `archetype_asset_id` coverage.

## 10. Cycle Retrospective
- Manual SSOT was already documented, but the missing enforcement was the real risk; future schema changes should start by extending `spec:lint`.
- Generated `lib/types.ts` created trailing blank-line churn until `sync-types.ts` normalized EOF output.
- Android NDK was installed but not exported into the shell; native verification needs explicit `ANDROID_HOME`/`ANDROID_NDK_HOME` unless the user profile exports them.
- `archetype_asset_id` needed `serde(default)` and optional TS generation to avoid breaking older content literals.
- Settings privacy copy must be treated as a testable product contract, not descriptive prose.
