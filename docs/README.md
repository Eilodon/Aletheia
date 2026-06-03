# Aletheia Docs

Last reorganized: 2026-06-02.

This directory keeps only documents that are useful for the current beta codebase. Historical cycle notes, outdated model guides, and one-off remediation plans were removed after being folded into the active state and roadmap docs.

## Active Docs

| File | Purpose |
|---|---|
| `KB-state.md` | Current project state, active gaps, and release baseline. Start here. |
| `BETA_IMPLEMENTATION_ROADMAP.md` | Actionable beta implementation plan. |
| `BETA_RELEASE_CHECKLIST.md` | Build, verification, and manual release checklist. |
| `CORE/ADR.md` | Accepted architecture decisions that still constrain implementation. |
| `CORE/BLUEPRINT.md` | Current behavior and system blueprint. |
| `CORE/CONTRACTS.md` | Current schema and integration contracts. |
| `PROMPT_CONTRACT.md` | Canonical interpretation prompt contract and drift notes. |
| `E2E_ANDROID_SETUP.md` | Android native/e2e setup and smoke-test commands. |
| `store-assets/STORE_LISTING.md` | Store copy, screenshot plan, and privacy copy. |
| `todo.md` | Short current backlog only. |

## Source Of Truth Rules

- Rust contracts: `core/src/contracts.rs`.
- Native bridge TypeScript types: `modules/aletheia-core-module/src/index.ts`.
- Android local model implementation: `modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/LocalInferenceEngine.kt`.
- Server interpretation prompt and provider routing: `server/_core/interpretationService.ts`.
- Release gates: `package.json` scripts and `scripts/release-readiness-report.ts`.

Docs should describe code reality. If a doc disagrees with source, update the doc or open a code task explicitly.
