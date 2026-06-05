# Beta Implementation Roadmap

Last verified against repo: 2026-06-05.

## Summary

| Area | Status | Next Action |
|---|---|---|
| Core reading path | Mostly ready | Keep `verify:*` green while changing release scope. |
| Environment | Pending | Fill real `.env`, run `bash scripts/validate-env.sh`. |
| Gift backend | Pending | Deploy backend or hide gift routes for beta. |
| Monetization | Partial | Configure RevenueCat and test purchase/restore, or hide paywall. |
| Local AI | Partial | Test Android model download/inference on real devices. |
| Share cards | Partial | Verify native/card generation end-to-end. |
| Startup guard | Bug | Invoke `assertStartupConfig()` or remove it. |

## Phase 1 - Buildable Beta

### Environment

Required for real beta:

- `EXPO_PUBLIC_EAS_PROJECT_ID`
- `EXPO_PUBLIC_OWNER_NAME`
- `JWT_SECRET`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SENTRY_DSN`
- at least one AI provider key: `ALETHEIA_CLAUDE_API_KEY`, `ALETHEIA_OPENAI_API_KEY`, or `ALETHEIA_GEMINI_API_KEY`

Optional surfaces:

- `EXPO_PUBLIC_GIFT_BACKEND_URL`
- `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`
- `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`
- `OLLAMA_BASE_URL` / `OLLAMA_MODEL` for server local experiments

Verify:

```bash
bash scripts/validate-env.sh
pnpm release:report --check
```

### Android Build

```bash
pnpm install
pnpm verify:medium
pnpm rust:android
eas build --platform android --profile preview --local
```

Success criteria:

- App launches without startup crash.
- Onboarding, reading, wildcard, passage, archive, and settings flows work.
- AI either streams from local/cloud path or falls back clearly.
- Gift and paywall are either working against real services or intentionally hidden.

## Phase 2 - Product Surface Decisions

### Gift

Current state:

- Native Rust client calls `/gift/create` and `/gift/redeem`.
- Missing backend config produces explicit errors.

Decision:

- Deploy and test backend before beta, or hide `.gift/` routes and remove gift promises from store copy.

### Monetization

Current state:

- `react-native-purchases` is installed.
- `initializePurchases()` runs at startup.
- Paywall can load RevenueCat offerings and call purchase/restore when configured.

Decision:

- If monetization is in beta scope, configure RevenueCat products/packages and test on-device.
- If not, hide `.paywall/` and remove Pro claims from beta copy.

### Local AI

Current state:

- Android native local inference targets Qwen3.5-2B LiteRT-LM (`Qwen3.5-2B-IT.litertlm`), about 1.5GB, with 3072MB RAM minimum.
- Runtime download/cache/delete flows exist.
- Rust core local inference remains an interface/stub; Android native owns real execution.

Decision:

- Keep local AI visible only if real-device model download and inference pass.
- Otherwise keep cloud/fallback path and hide local model manager from beta users.

## Phase 3 - Architecture Hardening

### Facade Boundary

Goal:

- App screens should not import native clients, runtime switches, or bundled content directly.
- Platform branching should stay in adapters/facades.

Current guard:

```bash
node scripts/verify-architecture.mjs
```

### Contract Parity

Goal:

- Keep `core/src/contracts.rs`, `core/src/aletheia.udl`, generated bindings, and `modules/aletheia-core-module/src/index.ts` aligned.
- Expand UniFFI only for Android release paths that need stable read/write access.

Current guard:

```bash
pnpm spec:lint
```

Status as of 2026-06-05:

- `spec:lint` checks contract constants, enum parity, `LocalModelStatus` native/TS parity, and local-model defaults across `CONTRACTS.md`, Rust, UDL, generated TS, native module types, and Android local inference constants.
- `verify:medium` now includes `spec:lint`, architecture guard, core-store regressions, local model ops source guards, privacy ledger copy guards, and archetype asset decoupling guards.
- Native reading deletion now reaches Rust SQLite through the native bridge instead of falling back to the JS store.
- Settings Privacy Ledger now distinguishes local readings/model/export data from explicit AI cloud, gift, analytics, export, and delete flows.
- Symbol artwork is decoupled through optional `Symbol.archetype_asset_id`; UI asset lookup uses the full symbol object and falls back to id/hash.

## Phase 4 - Release Evidence

Before beta shipment, collect:

- `pnpm verify:release` output.
- Android APK/AAB build output.
- Real-device smoke test result.
- Gift backend test result or proof routes are hidden.
- RevenueCat purchase/restore test result or proof paywall is hidden.
- AI local/cloud/fallback behavior notes.
