# Aletheia Android E2E Testing Setup

> Tự động setup cho Android E2E testing - hoàn thành ngày 2025-04-01

## Đã hoàn thành ✓

### 1. Native Dependencies
- [x] Rust toolchain (cargo) - đã có sẵn
- [x] cargo-ndk - đã có sẵn
- [x] Android NDK (v27.1.12297006) - đã có sẵn tại `/home/ybao/Android/Sdk/ndk/`

### 2. Rust Core Build
- [x] UniFFI Kotlin bindings generated → `generated/uniffi/kotlin/`
- [x] Android native library built → `artifacts/android/jniLibs/arm64-v8a/libaletheia_core.so`
- [x] Library staged through native module sync → `modules/aletheia-core-module/android/src/main/jniLibs/arm64-v8a/`

### 3. Android Prebuild
- [x] Android native project prebuilt với Expo
- [x] `app.config.ts` không còn bắt buộc EAS project ID cho local dev / local APK / web smoke path
- [x] Plugin module integrated

### 4. E2E Testing Framework
- [x] Maestro test flows created tại `.maestro/`
  - `onboarding-flow.yaml` - Test onboarding flow
  - `reading-flow.yaml` - Test reading flow  
  - `smoke-test.yaml` - Critical path smoke test
- [x] Install script: `scripts/install-maestro.sh`

## Cần user cung cấp / hỗ trợ

### 1. EAS Configuration (chỉ bắt buộc cho EAS release path)
```bash
# Chạy lệnh này nếu cần EAS cloud build / submit
npx eas project:init

# Sau đó update .env:
EXPO_PUBLIC_EAS_PROJECT_ID=<project-id>
EXPO_PUBLIC_OWNER_NAME=<expo-username>
```

### 2. AI Provider Keys (cho reading flow hoạt động đầy đủ)
```bash
# Thêm vào .env:
ALETHEIA_CLAUDE_API_KEY=sk-ant-...
# hoặc
ALETHEIA_OPENAI_API_KEY=sk-...
# hoặc
ALETHEIA_GEMINI_API_KEY=...
```

### 3. Build APK Test
```bash
# Option 1: Local build
bash scripts/build-internal-apk.sh

# Option 2: Android Studio
open android/  # Mở trong Android Studio và build

# Option 3: Gradle
./gradlew :app:assembleRelease  # trong thư mục android/
```

### 4. Chạy E2E Tests
```bash
# 1. Cài Maestro (chỉ chạy 1 lần)
bash scripts/install-maestro.sh
export PATH="$HOME/.maestro/bin:$PATH"

# 2. Cài app lên device/emulator
eas build --platform android --profile preview --local
# hoặc dùng Android Studio build & install

# 3. Chạy tests
maestro test .maestro/smoke-test.yaml
maestro test .maestro/onboarding-flow.yaml
maestro test .maestro/reading-flow.yaml
pnpm smoke:e2e:android:device -- <adb-serial>

# Web smoke chuẩn
pnpm smoke:e2e
```

## File Structure

```
aletheia/
├── android/                          # Prebuilt Android project
│   └── modules/aletheia-core-module/android/src/main/jniLibs/arm64-v8a/
│       └── libaletheia_core.so     # ← Rust library (5.8MB)
├── artifacts/android/jniLibs/      # Build artifacts
├── generated/uniffi/kotlin/          # Kotlin bindings
├── .maestro/                         # E2E test flows
│   ├── onboarding-flow.yaml
│   ├── reading-flow.yaml
│   ├── smoke-test.yaml
│   └── smoke-test-active-app.yaml
├── scripts/
│   ├── build-rust-android.sh
│   ├── build-uniffi-bindings.sh
│   ├── install-maestro.sh
│   └── android-real-device-smoke.sh
└── app.config.ts                     # Đã modify để bypass EAS check
```

## Lưu ý

- `.env` vẫn còn placeholder values - cần update trước khi build production
- `app.config.ts` chỉ yêu cầu `EXPO_PUBLIC_EAS_PROJECT_ID` khi chạy EAS release path thực sự
- Trên một số máy thật Xiaomi/MIUI, `maestro launchApp` ngay sau `pm clear` có thể flaky; dùng `pnpm smoke:e2e:android:device -- <adb-serial>` sẽ ổn định hơn vì warm-launch bằng ADB trước
- Gift backend và monetization đã được disable trong beta theo checklist
- Chỉ build cho arm64-v8a (minSdkVersion: 24)
