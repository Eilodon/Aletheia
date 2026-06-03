# Android E2E And Native Setup

Last verified against repo: 2026-06-02.

## Current Native Surface

- Rust core source: `core/src/**`
- Android Rust artifact: `artifacts/android/jniLibs/arm64-v8a/libaletheia_core.so`
- Native module staging: `modules/aletheia-core-module/android/src/main/jniLibs/arm64-v8a/`
- Kotlin UniFFI bindings: `generated/uniffi/kotlin/`
- Maestro flows: `.maestro/`

Android beta targets arm64 and uses the local Expo module.

## Build Commands

```bash
pnpm install
pnpm rust:android
pnpm native:sync
```

For a local beta APK/AAB:

```bash
eas build --platform android --profile preview --local
```

## E2E Commands

Install Maestro once:

```bash
bash scripts/install-maestro.sh
export PATH="$HOME/.maestro/bin:$PATH"
```

Run smoke flows:

```bash
maestro test .maestro/smoke-test.yaml
maestro test .maestro/onboarding-flow.yaml
maestro test .maestro/reading-flow.yaml
pnpm smoke:e2e:android:device -- <adb-serial>
```

Web smoke:

```bash
pnpm smoke:e2e
```

## Environment Needed For Full Beta Behavior

- EAS release path: `EXPO_PUBLIC_EAS_PROJECT_ID`, `EXPO_PUBLIC_OWNER_NAME`.
- AI cloud path: at least one of `ALETHEIA_CLAUDE_API_KEY`, `ALETHEIA_OPENAI_API_KEY`, `ALETHEIA_GEMINI_API_KEY`.
- Gift path: `EXPO_PUBLIC_GIFT_BACKEND_URL`.
- RevenueCat path: `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`.
- Sentry/release readiness: `EXPO_PUBLIC_SENTRY_DSN`.

Builds can still run with some optional services missing, but those product surfaces must be hidden or tested as explicit fallback states.

## Real-Device Notes

- Some MIUI/Xiaomi devices are flaky when Maestro launches immediately after `pm clear`; use `pnpm smoke:e2e:android:device -- <adb-serial>` to warm-launch via ADB.
- Local model download is about 529 MB and should be tested on real network/device storage.
- No AI provider key means AI should return fallback behavior rather than block reading.
