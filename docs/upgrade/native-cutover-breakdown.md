# Native Cutover Breakdown

Mục tiêu: đi thẳng theo pipeline `Rust core -> UniFFI -> Expo native module -> thin TS wrapper`, không tiếp tục mở rộng TypeScript bridge hiện tại ngoài mức tối thiểu để app còn boot được.

## Phase 0 - Freeze Boundary

### Rust source of truth
- [x] [core/src/contracts.rs](/home/ybao/B.1/AletheiA/core/src/contracts.rs): chốt toàn bộ schema dùng cho native path.
- [x] [core/src/store.rs](/home/ybao/B.1/AletheiA/core/src/store.rs): là DB schema/migration authority cho mobile native.
- [ ] [lib/types.ts](/home/ybao/B.1/AletheiA/lib/types.ts): chỉ còn là generated output từ contracts, không sửa tay.
- [ ] [scripts/sync-types.ts](/home/ybao/B.1/AletheiA/scripts/sync-types.ts): giữ vai trò sync TS types từ Rust contracts.

### TS bridge deprecation
- [ ] [lib/services/store.ts](/home/ybao/B.1/AletheiA/lib/services/store.ts): freeze feature work, chỉ còn fallback/web nếu cần.
- [ ] [lib/services/reading-engine.ts](/home/ybao/B.1/AletheiA/lib/services/reading-engine.ts): freeze feature work.
- [ ] [lib/services/theme-engine.ts](/home/ybao/B.1/AletheiA/lib/services/theme-engine.ts): freeze feature work.
- [ ] [lib/services/ai-client.ts](/home/ybao/B.1/AletheiA/lib/services/ai-client.ts): chuyển thành thin facade khi native module sẵn sàng.

## Phase 1 - UniFFI Foundation

### UniFFI crate wiring
- [x] [core/build.rs](/home/ybao/B.1/AletheiA/core/build.rs): generate scaffolding từ UDL.
- [x] [core/src/aletheia.udl](/home/ybao/B.1/AletheiA/core/src/aletheia.udl): canonical UniFFI interface file.
- [x] [core/src/lib.rs](/home/ybao/B.1/AletheiA/core/src/lib.rs): include scaffolding và giữ public API khớp UDL cho first cutover slice.
- [x] [core/Cargo.toml](/home/ybao/B.1/AletheiA/core/Cargo.toml): thêm build dependency cho UniFFI scaffolding.

### Contract alignment blockers
- [ ] [core/src/errors.rs](/home/ybao/B.1/AletheiA/core/src/errors.rs): refactor error surface để UniFFI expose được.
- [ ] [core/src/lib.rs](/home/ybao/B.1/AletheiA/core/src/lib.rs): tách sync surface trước, async/streaming surface sau.
- [x] [core/src/ai_client.rs](/home/ybao/B.1/AletheiA/core/src/ai_client.rs): có native-facing AI request surface dạng sync bridge response, nhưng streaming/cancel chunk-level vẫn chưa xong.

## Phase 2 - Native Artifact Generation

- [x] [scripts/build-uniffi-bindings.sh](/home/ybao/B.1/AletheiA/scripts/build-uniffi-bindings.sh): generate Swift/Kotlin bindings.
- [x] `generated/uniffi/swift/`: output bindings Swift.
- [x] `generated/uniffi/kotlin/`: output bindings Kotlin.
- [ ] `artifacts/ios/`: chứa `.xcframework`.
- [x] `artifacts/android/`: chứa `jniLibs`.
- [x] [package.json](/home/ybao/B.1/AletheiA/package.json): expose scripts cho local/CI.

## Phase 3 - Expo Native Module

- [x] `modules/aletheia-core-module/package.json`: local Expo module package.
- [x] `modules/aletheia-core-module/expo-module.config.json`: config cho Expo Modules autolinking.
- [x] `modules/aletheia-core-module/src/index.ts`: JS entrypoint của module.
- [x] `modules/aletheia-core-module/ios/`: Swift wrapper scaffold + adapter seam cho UniFFI bindings.
- [x] `modules/aletheia-core-module/android/`: Kotlin wrapper dùng generated UniFFI bindings và load `.so` Android từ `jniLibs`.
- [x] [app.config.ts](/home/ybao/B.1/AletheiA/app.config.ts): config plugin wiring để `expo prebuild` stage generated bindings và native artifacts.

## Phase 4 - Thin TS Wrapper & Cutover

- [x] [lib/native/aletheia-core.ts](/home/ybao/B.1/AletheiA/lib/native/aletheia-core.ts): thin wrapper duy nhất cho JS/native boundary.
- [x] [lib/context/reading-context.tsx](/home/ybao/B.1/AletheiA/lib/context/reading-context.tsx): Android active reading flow gọi sang native wrapper, web/iOS vẫn fallback.
- [x] [lib/services/db-init.ts](/home/ybao/B.1/AletheiA/lib/services/db-init.ts): gọi native init + native seeding trên Android.
- [x] [lib/services/ai-client.ts](/home/ybao/B.1/AletheiA/lib/services/ai-client.ts): giảm xuống facade fallback, ưu tiên native prompts trên Android.

## Phase 4.5 - Native Data Bootstrap

- [x] [core/src/lib.rs](/home/ybao/B.1/AletheiA/core/src/lib.rs): expose `seed_bundled_data(...)` để native DB không boot rỗng.
- [x] [core/src/store.rs](/home/ybao/B.1/AletheiA/core/src/store.rs): seed bundled sources/passages/themes khi native DB chưa có dữ liệu.
- [x] [lib/native/runtime.ts](/home/ybao/B.1/AletheiA/lib/native/runtime.ts): singleton native init + seed entrypoint cho app.
- [x] [modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/AletheiaCoreModule.kt](/home/ybao/B.1/AletheiA/modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/AletheiaCoreModule.kt): expose `seedBundledData`.

## Phase 4.6 - Active Flow Safety Fixes

- [x] [lib/services/current-user-id.ts](/home/ybao/B.1/AletheiA/lib/services/current-user-id.ts): device-specific anonymous ID thay cho `"local-user"`.
- [x] [lib/context/reading-context.tsx](/home/ybao/B.1/AletheiA/lib/context/reading-context.tsx): AI dùng đúng selected symbol thay vì `session.symbols[0]`.
- [x] [core/src/store.rs](/home/ybao/B.1/AletheiA/core/src/store.rs): reset daily counters theo ngày mới ở native source of truth.
- [x] [lib/auth.ts](/home/ybao/B.1/AletheiA/lib/auth.ts): web user info dùng `sessionStorage`, không còn `localStorage`.

## Phase 4.7 - Native AI Bridge

- [x] [core/src/aletheia.udl](/home/ybao/B.1/AletheiA/core/src/aletheia.udl): expose `set_ai_api_key` và `request_interpretation`.
- [x] [core/src/lib.rs](/home/ybao/B.1/AletheiA/core/src/lib.rs): wrap async AI call thành sync UniFFI bridge response.
- [x] [modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/AletheiaCoreModule.kt](/home/ybao/B.1/AletheiA/modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/AletheiaCoreModule.kt): map JS/native cho `setApiKey` và `requestInterpretation`.
- [x] [lib/services/ai-client.ts](/home/ybao/B.1/AletheiA/lib/services/ai-client.ts): Android ưu tiên native interpretation path, fallback rõ ràng qua `usedFallback`.
- [x] [lib/native/runtime.ts](/home/ybao/B.1/AletheiA/lib/native/runtime.ts): tự nạp API key từ `EXPO_PUBLIC_ALETHEIA_*_API_KEY` nếu có.

## Phase 4.8 - Streaming + Cancellation

- [x] [core/src/ai_client.rs](/home/ybao/B.1/AletheiA/core/src/ai_client.rs): Claude/OpenAI dùng SSE stream thật, check cancel token trong vòng đọc chunk.
- [x] [core/src/lib.rs](/home/ybao/B.1/AletheiA/core/src/lib.rs): request registry + pollable stream state + cancellation bridge.
- [x] [modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/AletheiaCoreModule.kt](/home/ybao/B.1/AletheiA/modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/AletheiaCoreModule.kt): expose `startInterpretationStream`, `pollInterpretationStream`, `cancelInterpretationStream`.
- [x] [lib/services/ai-client.ts](/home/ybao/B.1/AletheiA/lib/services/ai-client.ts): JS polling session cho streaming Android.
- [x] [lib/context/reading-context.tsx](/home/ybao/B.1/AletheiA/lib/context/reading-context.tsx): append chunk vào `aiResponse` theo thời gian thực và có `cancelAIInterpretation`.
- [ ] Runtime device verification: chưa chạy thử trên device/emulator để xác nhận stream chunk thực sự đổ lên UI.

## Immediate Order

1. Chuẩn hóa UDL location + binding generation script.
2. Refactor UniFFI surface trong `core/` để build/export được.
3. Scaffold local Expo native module.
4. Tạo thin TS wrapper.
5. Chuyển `reading-context` qua native path.
