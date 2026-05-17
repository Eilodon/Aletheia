# CYCLE_1_CORE_CONVERGENCE_PLAN.md
### Aletheia · VHEATM Cycle 1

> Scope của cycle này là đóng các lỗ hổng kiến trúc có leverage cao nhất trước khi tiếp tục growth hoặc polish.
> Cycle 1 không tối ưu "nhiều thứ cùng lúc". Nó khóa `source of truth`, `facade boundary`, `native parity`, và `verification`.

---

## 1. Vision

### Mission
- Đưa Android từ trạng thái "Rust là SSOT theo ý định" sang "Rust là SSOT theo cấu trúc thật".
- Giảm tối đa platform/runtime branching rò lên app layer.
- Biến verification từ baseline thủ công thành release gate có thể tin được.

### Success Criteria
- Android không còn seed content từ TS JSON runtime nữa.
- UI/service layer không cần biết `shouldUseAletheiaNative()` hoặc thiếu capability nào ở native.
- Archive write actions có contract parity rõ ràng giữa web và Android, hoặc có capability flag đọc được qua facade.
- CI có 3 tier xác minh được core loop, archive flow, native surface.

### Non-Goals
- Không quay lại iOS beta scope.
- Không reintroduce monetization SDK trong cycle này.
- Không đầu tư thêm UI polish nếu không giúp đóng gap kiến trúc.

---

## 2. Diagnose

### D-01. Android content ownership chưa hoàn tất

**Evidence**
- Android native init vẫn serialize `BUNDLED_SOURCES`, `BUNDLED_PASSAGES`, `BUNDLED_THEMES` từ TS rồi gọi `seedBundledData()` tại `lib/native/runtime.ts`.
- Native module contract vẫn nhận `sourcesJson`, `passagesJson`, `themesJson` tại `modules/aletheia-core-module/src/index.ts`.
- Rust core vẫn parse JSON string trong `core/src/lib.rs` trước khi insert vào SQLite.

**Impact**
- Android runtime phụ thuộc TS content bundle để boot đúng dữ liệu.
- Rust store không thật sự own bundled catalog.
- Khó tạo content pipeline chuẩn, content QA, và artifact parity test.

**Hypothesis**
- Nếu chuyển bundled catalog sang Rust-owned artifact/generator, Android sẽ đạt SSOT đúng nghĩa và giảm một lớp drift giữa TS và Rust.

### D-02. Facade boundary còn hở

**Evidence**
- `coreStore` là facade chính, nhưng app/detail screen vẫn import thẳng `BUNDLED_SOURCES` và `BUNDLED_PASSAGES` trong `app/reading/[id].tsx`.
- `lib/native/runtime.ts` đang giữ logic init, provider config, runtime gating, content seeding trong cùng một file.
- Một số service vẫn cần tự biết native/web path thay vì hỏi capability qua facade.

**Impact**
- App layer vẫn có kiến thức về data ownership và runtime mode.
- Mỗi tính năng mới dễ thêm `if native else web` ở sai tầng.
- Deep-link/history/read-model khó thống nhất.

**Hypothesis**
- Nếu gom read-model lookup và capability queries vào facade/adapters, app screens sẽ không còn biết data nằm ở đâu hoặc platform nào đang phục vụ.

### D-03. Android native archive parity chưa hoàn tất dù Rust store đã có khả năng

**Evidence**
- `coreStore.updateReadingFlags()` đang throw trên Android native ở `lib/services/core-store.ts`.
- Rust store đã có `get_reading_by_id()` và `update_reading()` trong `core/src/store.rs`.
- UniFFI surface hiện chỉ export `get_readings()` paginated, không có `get_reading_by_id()` hay `update_reading_flags()`.

**Impact**
- Favorite/share flow fail mềm trên Android.
- Archive detail phải tự dựng read model từ bundled TS data.
- UX bị giới hạn bởi bridge surface, không phải bởi core capability thực.

**Hypothesis**
- Nếu mở rộng UniFFI bằng các read/write API hẹp, Android archive flow sẽ parity với web mà không cần leak implementation.

### D-04. Verification baseline còn nhẹ so với kiến trúc split Android/Web/Native

**Evidence**
- `docs/KB-state.md` mới chỉ nêu baseline `pnpm check`, một số Vitest, và `pnpm rust:android`.
- Chưa có explicit gate cho native contract parity, content artifact parity, archive flows, hoặc runtime capability regressions.

**Impact**
- Dễ ship regressions kiểu "compile pass nhưng contract lệch".
- Refactor facade/native surface có blast radius lớn nhưng thiếu guardrail.

**Hypothesis**
- Nếu tách verification thành `fast`, `medium`, `release` tiers với test ownership rõ ràng, cycle sau có thể đi nhanh hơn mà không tăng entropy.

---

## 3. Verify

### E-01. Content ownership simulation

**Question**
- Nếu bỏ TS runtime seeding, cần thay thế bằng cơ chế nào ít blast radius nhất?

**Verified Finding**
- Điểm choke point duy nhất hiện tại là `initializeAletheiaNative()` trong `lib/native/runtime.ts`.
- Rust store hiện đã có schema và seed path riêng; thiếu ở đây là input source, không thiếu storage capability.

**Decision Input**
- Tạo generator build-time để Rust đọc artifact nội bộ thay vì nhận JSON từ JS runtime là thay đổi đúng điểm nghẽn nhất.

### E-02. Native archive parity simulation

**Question**
- Android thiếu tính năng archive vì core hay vì bridge?

**Verified Finding**
- Core đã có `get_reading_by_id()` và `update_reading()` trong `core/src/store.rs`.
- Bridge TS/Kotlin/UDL chưa expose các operation tương ứng.

**Decision Input**
- Ưu tiên mở UniFFI surface tối thiểu thay vì viết workaround ở UI.

### E-03. Facade leak simulation

**Question**
- App layer còn biết gì về implementation detail?

**Verified Finding**
- `app/reading/[id].tsx` đang tự join `reading` với `BUNDLED_SOURCES/BUNDLED_PASSAGES`.
- `coreStore.getReadingById()` trên Android hiện phải paginate để tìm một item vì thiếu direct lookup bridge.

**Decision Input**
- Cần một archive read model qua facade: `getReadingDetail(id)` hoặc tổ hợp `getReadingById/getSourceById/getPassageById`.

### E-04. Verification coverage simulation

**Question**
- Baseline hiện tại có chặn được regressions thuộc Cycle 1 không?

**Verified Finding**
- Không có gate nào chứng minh:
  - Android content artifact khớp với TS downstream export.
  - Native archive actions hoạt động qua bridge.
  - App không còn import content bundle trực tiếp ở read-model screens.

**Decision Input**
- Cần thêm scripts/tests mới thay vì chỉ dựa vào compile + rust build.

---

## 4. Decide

### ADR-C1-01
- Android bundled content phải chuyển sang Rust-owned artifact.
- TS chỉ còn downstream export để web path và non-native tooling consume.

### ADR-C1-02
- App/UI không được import bundled content trực tiếp để hydrate archive/detail screens.
- Mọi archive/detail read model phải đi qua `coreStore` hoặc adapter read facade.

### ADR-C1-03
- Android native archive parity được giải quyết bằng contract mở rộng ở UniFFI.
- Không chấp nhận workaround UI-level kiểu throw, silent no-op, hoặc paginate toàn history để tìm một bản ghi nếu có API đúng hơn.

### ADR-C1-04
- Verification được chia thành 3 tier:
  - `fast`: typecheck, lint, unit core/service.
  - `medium`: facade/archive integration, web smoke.
  - `release`: rust build, bridge contract parity, Android flow smoke.

---

## 5. Transform

### Workstream A — Content Artifact Ownership

**Goal**
- Thay TS runtime seeding bằng Rust-owned bundled artifact.

**Files likely touched**
- `core/src/lib.rs`
- `core/src/store.rs`
- `core/src/aletheia.udl`
- `lib/native/runtime.ts`
- `lib/data/seed-data.ts`
- `scripts/*` cho content generation
- `modules/aletheia-core-module/src/index.ts`
- `modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/AletheiaCoreModule.kt`

**Deliverables**
- Rust-readable bundled artifact checked into repo hoặc generated deterministically.
- TS downstream export sync từ cùng nguồn.
- Bỏ `seedBundledData(sourcesJson, passagesJson, themesJson)` khỏi runtime path Android.

**Acceptance**
- Android init không stringify catalog từ TS nữa.
- Rust core có thể boot bundled content chỉ từ artifact nội bộ.

### Workstream B — Archive Contract Parity

**Goal**
- Android archive/detail flow có read/write parity cơ bản.

**Files likely touched**
- `core/src/aletheia.udl`
- `core/src/lib.rs`
- `core/src/store.rs`
- `modules/aletheia-core-module/src/index.ts`
- `modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/AletheiaCoreModule.kt`
- `lib/native/aletheia-core.ts`
- `lib/native/bridge.ts`
- `lib/services/core-store.ts`

**Deliverables**
- `getReadingById(id)`
- `updateReadingFlags(id, flags)` hoặc `updateReading(reading)`
- Optional: `getSourceById(id)` / `getPassageById(id)` nếu read-detail cần.

**Acceptance**
- Android favorite/share action không throw.
- Deep-link/detail screen không cần import bundled content trực tiếp để hiển thị core metadata.

### Workstream C — Facade Cleanup

**Goal**
- Tách capability/query/read-model khỏi UI.

**Files likely touched**
- `lib/services/core-store.ts`
- `app/reading/[id].tsx`
- `app/(tabs)/mirror.tsx`
- `lib/context/reading-context.tsx`
- `lib/native/runtime.ts`

**Deliverables**
- `coreStore` expose read-model đủ dùng cho archive/detail.
- Screens chỉ render domain objects, không tự join data sources.
- Capability flags nếu cần phải đến từ facade, không phải `Platform`/native branching trong UI.

**Acceptance**
- Không còn import `BUNDLED_*` trong app screens phục vụ archive/detail.
- Không còn fallback UI-level dựa trên assumption về native support.

### Workstream D — Verification Harness

**Goal**
- Tạo guardrails cho cycle sau.

**Files likely touched**
- `package.json`
- `tests/**`
- `scripts/**`
- `docs/KB-state.md`

**Deliverables**
- `pnpm verify:fast`
- `pnpm verify:medium`
- `pnpm verify:release`
- contract parity test giữa Rust contracts và TS/native bridge surface

**Acceptance**
- CI local có thể chạy theo tier.
- Mỗi workstream trong Cycle 1 có ít nhất một gate tự động.

---

## 6. Measure

### KPI Targets
- `Architecture coherence`: 6.5 -> 8.4
- `Android runtime integrity`: 7.0 -> 9.0
- `Archive parity`: 5.8 -> 8.8
- `Verification maturity`: 5.5 -> 8.5

### Release Gates
- Không merge Workstream A nếu Android vẫn gọi `seedBundledData(JSON.stringify(...))`.
- Không merge Workstream B nếu `coreStore.updateReadingFlags()` còn throw trên Android.
- Không đóng Cycle 1 nếu archive/detail screens còn import bundled content trực tiếp.

### Exit Criteria
- KB-state, ADR, BLUEPRINT không còn mô tả Android content là TS-seeded runtime path.
- Core/facade/native tests pass theo tier.
- Mirror/detail/archive flow parity đạt mức production-beta.

---

## 7. Recommended Execution Order

1. Workstream D phần tối thiểu: dựng verify tiers và contract audit script.
2. Workstream B: mở bridge surface cho archive direct lookup + flag writes.
3. Workstream C: xóa UI leaks, chuyển detail/archive sang facade read model.
4. Workstream A: chuyển bundled content ownership sang Rust artifact/generator.
5. Workstream D phần release-grade: hoàn tất parity/content gates.

### Why this order
- Nếu làm Workstream A trước mà chưa có guardrails, blast radius quá lớn.
- Workstream B và C mở đường cho archive parity ngay và giảm rò rỉ kiến trúc.
- Workstream A là thay đổi leverage cao nhất nhưng cũng nguy hiểm nhất, nên đi sau khi đã có rail.
