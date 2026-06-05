# ADR.md — Architecture Decision Records
### AletheiA · v0.1.0 · compatible with: [CONTRACTS v0.1.0, BLUEPRINT v0.1.0]

> **Mục đích file này:** Ghi lại *tại sao* hệ thống được thiết kế như vậy.
> Không phải *cái gì* (CONTRACTS.md) hay *như thế nào* (BLUEPRINT.md) — mà là *tại sao*.
>
> Đọc ADR trước khi thay đổi bất kỳ quyết định kiến trúc nào.
> Khi muốn thay đổi design → tạo ADR mới với status PROPOSED → chốt → update CONTRACTS/BLUEPRINT.

---

## Mục lục

| ADR | Title | Status | Tags |
|---|---|---|---|
| [ADR-AL-001](#adr-al-001--contractsmd-là-primary-spec--chain-of-command) | CONTRACTS.md là Primary Spec & Chain of Command | ✅ ACCEPTED | `architecture` `dsdd` `ssot` |
| [ADR-AL-002](#adr-al-002--fully-local-architecture--mysql-disabled) | Fully Local Architecture — MySQL Disabled | ✅ ACCEPTED | `architecture` `database` `privacy` |
| [ADR-AL-003](#adr-al-003--qwen35-2b--litert-lm-local-inference) | Qwen3.5-2B + LiteRT-LM Local Inference | ✅ ACCEPTED | `ai` `local-model` `android` |
| [ADR-AL-004](#adr-al-004--ux-polish--sensory-layer) | UX Polish — Breathing Backdrop, Haptics, Accessibility | ✅ ACCEPTED | `ux` `animation` `a11y` |
| [ADR-AL-005](#adr-al-005--uiux-premium-refinement--archetype-integration) | UI/UX Premium Refinement & Archetype Integration | ✅ ACCEPTED | `ux` `assets` `typography` |

---

## Cách đọc file này

| Status | Ý nghĩa |
|---|---|
| 🟡 `PROPOSED` | Đang cân nhắc, chưa chốt |
| ✅ `ACCEPTED` | Đã chốt, đang/đã implement |
| ❌ `REJECTED` | Đã cân nhắc, không chọn — giữ lại để tránh propose lại |
| 🔄 `SUPERSEDED by ADR-AL-xxx` | Đã thay thế bởi ADR khác |
| ⏸️ `DEFERRED` | Hoãn đến phase sau |

**Khi nào tạo ADR mới:**
- Thay đổi ảnh hưởng đến schema hoặc I/O contract
- Chọn giữa hai hoặc nhiều technical approaches
- Quyết định về security, privacy, hoặc compliance
- Bất kỳ thứ gì mà sau 6 tháng sẽ tự hỏi "tại sao lại làm vậy?"

---

## ADR-AL-001 — CONTRACTS.md là Primary Spec & Chain of Command

**Status:** ✅ ACCEPTED
**Date:** 2026-06-05
**Deciders:** ybao
**Tags:** `architecture` `dsdd` `ssot`
**Review date:** Không cần — đây là meta-rule cho toàn bộ dự án

### Context

AletheiA được phát triển trước khi áp dụng DSDD. Kết quả là:
- `docs/CORE/CONTRACTS.md`, `BLUEPRINT.md`, `ADR.md` là template rỗng với FILL-IN placeholders
- `core/src/aletheia.udl` (UniFFI Definition Language) đang đóng vai trò de facto type authority
- `lib/types.ts` được generate tự động từ `core/src/contracts.rs` qua `scripts/sync-types.ts`
- Header của `lib/types.ts` hard-code: *"Executable Rust contracts are the source of truth. docs/CONTRACTS.md is a synchronized reference, not the authority."*
- Kết quả: tension giữa "Spec-is-Primary Rule" trong DSDD README và comment trong generated code

Types bị phân mảnh ở nhiều nơi (violation V-002, V-003, V-004 trong CONTRACTS.md Section 9).

**Constraints:**
- UniFFI UDL là executable spec — thay đổi UDL trực tiếp generate ra Kotlin bindings và TypeScript
- CONTRACTS.md là human-readable, không thể "execute" hay generate code từ nó
- Cần một workflow rõ ràng ngăn spec và code drift xa nhau

### Decision

**CONTRACTS.md là primary spec (human layer).** Chain of command:

```
CONTRACTS.md  ←── nơi design iteration, viết trước khi code
    ↕ (mirror thủ công — bắt buộc 1:1)
aletheia.udl + contracts.rs  ←── executable spec, cập nhật sau CONTRACTS.md
    ↓ (auto-generated — không edit tay)
lib/types.ts + Kotlin bindings
```

**Rule bổ sung vào DSDD workflow:**
> Để add/change bất kỳ type/schema: cập nhật CONTRACTS.md trước → cập nhật aletheia.udl/contracts.rs → chạy sync. KHÔNG được phép đi ngược.

**Bootstrap exception (one-time):** Lần fill đầu tiên (2026-06-05) là reverse-engineer từ code lên CONTRACTS.md. Sau đó, chiều flow đảo ngược hoàn toàn: spec trước, code sau.

**Comment trong `scripts/sync-types.ts` phải được cập nhật** thành:
```
// Sync from CONTRACTS.md → core/src/contracts.rs → lib/types.ts
// CONTRACTS.md is the primary spec. Do not change types here without updating CONTRACTS.md first.
```

### Consequences

**Improved:**
- Tất cả type/schema có một nơi duy nhất để refer — CONTRACTS.md
- Violation được phát hiện sớm trước khi code được viết (spec-first)
- Agent làm việc với dự án có đủ context mà không cần đọc hết codebase

**Trade-offs:**
- Sync thủ công giữa CONTRACTS.md và UDL — dễ drift nếu không có discipline
- Lần đầu fill là tốn công (bootstrap) nhưng chỉ làm một lần

### Alternatives Considered

**Option B — Code-First (giữ nguyên trạng):** CONTRACTS.md là generated/manual reference, Rust là authority. Rejected vì CONTRACTS.md sẽ không bao giờ là nơi "quyết định" gì — chỉ là documentation của code đã có.

**Option C — Auto-generate CONTRACTS.md từ UDL:** Technically khả thi nhưng mất đi human-readable prose (descriptions, intent, constraints) mà agent cần để make decisions. Rejected.

---

## ADR-AL-002 — Fully Local Architecture — MySQL Disabled

**Status:** ✅ ACCEPTED
**Date:** Trước 2026-06-03 (referenced trong code comment `ADR-AL-20`)
**Deciders:** ybao
**Tags:** `architecture` `database` `privacy`
**Review date:** Khi cần multi-device sync hoặc cloud backup feature

### Context

AletheiA ban đầu được scaffold với MySQL + Drizzle ORM (InsForge backend) cho user data và readings. Blueprint của dự án sau đó xác định rằng app phải chạy **fully local** — reading history, user state, và mọi data nhạy cảm phải tồn tại trên device, không lên server.

Lý do:
- Privacy-first philosophy: user không nên lo về data của mình lên cloud
- Offline-first requirement: app phải hoạt động không cần internet
- Simplicity: không cần auth layer phức tạp cho single-user device app

**Constraints:**
- InsForge backend vẫn được dùng cho Gift Reading API (token create/redeem cần cross-device)
- `server/` directory còn tồn tại với tRPC setup — dùng cho Gift API, không phải user data

### Decision

`MYSQL_DISABLED = true` trong `server/db.ts`. Tất cả user data (readings, user state, themes) được lưu trong **SQLite on-device** qua Rust core (`AletheiaCore` với rusqlite).

Server layer (`server/`) chỉ phục vụ:
- Gift Reading create/redeem (cần backend để cross-device token validation)
- Các tính năng future không có data nhạy cảm

`server/types.ts` giữ lại `User` và `InsertUser` interface cho in-memory store trong `server/db.ts` — phục vụ auth session khi user login qua InsForge (để verify gift redemption). Các interface này không phải dead code.

### Consequences

**Improved:**
- Zero server-side user data — privacy by design
- App hoạt động 100% offline (trừ AI và Gift features)
- Không cần migration, backup, hay GDPR compliance cho reading data

**Worsened / Debt:**
- `server/types.ts` dùng Drizzle ORM pattern (`InsertUser`) dù không có ORM — legacy naming gây confusing
- Không có cross-device sync — user mất data nếu uninstall

### Alternatives Considered

**Giữ MySQL cho reading history:** Rejected vì vi phạm privacy-first philosophy. User data nhạy cảm (intentions, mood, situations) không nên rời device.

**InsForge Postgres cho reading history:** Rejected cùng lý do. InsForge dùng cho Gift API là acceptable vì gift token không chứa sensitive content.

---

## ADR-AL-003 — Qwen3.5-2B + LiteRT-LM Local Inference

**Status:** ✅ ACCEPTED
**Date:** 2026-06-04
**Deciders:** ybao
**Tags:** `ai` `local-model` `android` `litert`
**Review date:** Khi LiteRT-LM release major version mới hoặc Qwen4 available

### Context

AletheiA's local inference path được build trên MediaPipe Tasks GenAI (`LlmInference`), deprecated bởi Google ngày 31/03/2026. Model là Gemma 3 1B GGUF — không aligned với TypeScript config (expect Gemma 3n E2B) và yếu về tiếng Việt.

Ngoài ra, 5 blocking bugs ngăn local inference hoạt động hoàn toàn:
- **B1:** Thiếu `engine.initialize()` call
- **B2:** OkHttp 60s timeout trên download 529MB
- **B3:** Garbled fallback text
- **B4:** Dead loop trong asset extraction
- **B5:** Không có shutdown path

Research (tháng 6/2026): Qwen3.5-2B là model phù hợp nhất cho Vietnamese (201 languages, MoE efficiency, thinking-mode toggle via `/think`). LiteRT-LM v0.10.1 là migration target bắt buộc từ MediaPipe.

**Constraints:**
- Android-only (iOS: deferred — LiteRT-LM iOS support chưa stable)
- Model size ~1.5GB — cần device có ≥3GB RAM available
- LiteRT-LM API khác hoàn toàn với MediaPipe API

### Decision

**Thay `com.google.mediapipe:tasks-genai` bằng `com.google.ai.edge.litertlm:litertlm-android:0.10.1`.**

- Rewrite `LocalInferenceEngine.kt` dùng LiteRT-LM `Engine`/`EngineConfig`/`createConversation()` API
- Model: Qwen3.5-2B-IT (`Qwen3.5-2B-IT.litertlm`) hosted trên GCS `aletheia-models/qwen3.5-2b/`
- `runInference()` collect full token stream, strip `<think>` block, return clean `String`
- Client-side `local-inference-postprocess.ts` — port server's harm patterns + `finalizeInterpretationText` format normalization
- Orchestrator apply post-process trên complete text → sentence-by-sentence 600ms pacing ("sealed letter" pattern)

**Audit findings fixed:**
- FM1: `isSafeLocalOutput("")` returns false (empty = truncated `<think>` → routes to fallback)
- FM2: `isModelReady()` requires ≥95% of expected size, không chỉ file existence
- L2: Double-checked locking trên `Engine` field (`engineLock + @Volatile`)

**Server fix:** `OUTPUT_HARM_PATTERNS` bug — `\b` word boundaries không hoạt động với Vietnamese Unicode diacritics. Removed `\b` từ `tự\s*tử` và `tự\s*làm\s*đau` patterns.

**CONFLICT V-005 consequence:** `LocalModelInfo::Default` trong `contracts.rs` chưa được update để reflect Qwen3.5-2B — xem CONTRACTS.md Section 9 V-005.

### Consequences

**Improved:**
- Local inference hoạt động end-to-end
- Vietnamese quality vượt trội (Qwen3.5-2B: 201 languages, MoE)
- Thinking mode toggle — có thể disable bằng cách không set `/think` flag
- 2x inference speed so với MediaPipe (LiteRT-LM MTP)

**Worsened / Debt:**
- Model size tăng từ 529MB (Gemma) lên ~1.5GB (Qwen3.5-2B) — download time tăng đáng kể
- `LocalModelInfo::Default` trong `contracts.rs` vẫn trỏ Gemma (V-005 — chưa fix)
- iOS local inference deferred

### Alternatives Considered

**Tiếp tục dùng MediaPipe với Gemma:** Rejected vì MediaPipe đã deprecated, không có security patches.

**Gemma 3n E2B (model config đã config sẵn):** Rejected vì Vietnamese quality thấp hơn Qwen3.5-2B đáng kể, và format không compatible với LiteRT-LM.

**Llama 3.2 3B:** Rejected vì model size lớn hơn với không có improvement rõ ràng về Vietnamese.

---

## ADR-AL-004 — UX Polish — Breathing Backdrop, Haptics, Accessibility

**Status:** ✅ ACCEPTED
**Date:** 2026-06-03
**Deciders:** ybao
**Tags:** `ux` `animation` `haptics` `a11y`
**Review date:** Khi screen reader audit được request, hoặc khi `mirror.tsx` thêm feature mới

### Context

Sensory layer của AletheiA có 4 gaps:
1. `AmbientBackdrop` hoàn toàn static (`View` orbs), dù `react-native-reanimated 4.1.6` đã installed nhưng không dùng
2. ~50 inline `Haptics.*` calls rải rác 17 files — không có semantic naming, không nhất quán
3. Interactive `Pressable` elements không có `accessibilityRole`/`accessibilityLabel` — screen readers không nhìn thấy
4. `TextInput` không có explicit `fontFamily` — fallback to system default

### Decision

**A. AmbientBackdrop breathing animation** (`components/ambient-backdrop.tsx`):
`Animated.View` (Reanimated) với `withRepeat(withSequence(...))` breath loop. 4 orbs staggered 0/700/1400/2100ms, 5s cycle (2500ms inhale + 2500ms exhale), `Easing.inOut(Easing.sin)`. AppState listener pause on background, restart với original stagger on foreground. `useReducedMotion()` gate skip animation hoàn toàn.

**B. Haptic utility** (`lib/utils/haptics.ts`):
`haptic(type: HapticType)` mapping 8 semantic types (`navigation`, `selection`, `confirm`, `emphasis`, `heavy`, `success`, `error`, `warning`) → expo-haptics calls. Replace tất cả 50+ inline `Haptics.*` calls. Removed iOS-only gate từ `haptic-tab.tsx` (expo-haptics là cross-platform).

**C. Accessibility labels** (`app/(tabs)/mirror.tsx`, `components/pressable-card.tsx`):
`accessibilityRole="button"` + `accessibilityLabel` cho reading cards, filter/sort buttons, start reading button, search TextInput. Labels từ `useStrings()` i18n (không hardcode English). `PressableCard` accept và forward a11y props.

**D. TextInput font spec:**
`fontFamily: Fonts.body` cho TextInput chưa có explicit font. Một số TextInput intentionally giữ font khác (italic, mono).

### Consequences

**Improved:**
- AmbientBackdrop "breathes" — space cảm giác sống động ở subconscious level
- Haptic semantics self-documenting: `haptic("heavy")` rõ hơn `Haptics.impactAsync(ImpactFeedbackStyle.Heavy)`
- Screen readers có thể navigate archive screen
- TextInput font explicit, không bị break khi system defaults thay đổi

**Worsened / Debt:**
- `useBreathStyle` tạo 4 AppState listeners (1 per orb). Acceptable hiện tại; cần pool nếu orb count tăng
- A11y coverage partial — chỉ `mirror.tsx` và `PressableCard`. `wildcard.tsx`, `passage.tsx`, `paywall` chưa có labels

**Known PATTERN-DEBT:**
- `PATTERN-DEBT-native-module-unmocked-in-node-test`: OPEN — 2 files chưa có test
- `PATTERN-DEBT-stale-mock-api-name`: OPEN — 2 dead mock entries trong `reading-engine.test.ts`

### Watch For

`useBreathStyle` hook — `startBreath` function defined inside hook body, referenced trong AppState listener closure. Nếu `isReducedMotion` thay đổi runtime (device setting changed while app open), closure reference sẽ stale.

---

## ADR-AL-005 — UI/UX Premium Refinement & Archetype Integration

**Status:** ✅ ACCEPTED
**Date:** 2026-06-04
**Deciders:** ybao (author: Eidolon-V)
**Tags:** `ux` `assets` `typography` `archetype`
**Review date:** Khi số unique symbols > 100 HOẶC khi users report cognitive dissonance từ shared fallback assets

### Context

AletheiA mission là Cognitive Sanctuary. UI trước đó có:
- High visual entropy trên wide screens (không có max-width constraint)
- Settings priorities sai — Account trước Privacy
- Language "Tarot-coded" ("Lật một lá") thay vì philosophical tone ("Chọn một biểu tượng")
- Vietnamese typography với Cinzel bị degradation nặng (fallback font rendering do incompatible lowercase glyphs)
- Symbol representation dùng text emoji thay vì premium visual assets

### Decision

1. **Max-width constraint:** `max-w-[430px]` trên Web — enforce Mobile-First, ngăn layout drift
2. **Settings reorder:** "Privacy & Data" lên đầu — reinforce local-first philosophy
3. **Copywriting rewrite:** "Lật một lá" → "Chọn một biểu tượng" — center on Archetypes
4. **Premium assets:** Generate và integrate 6 high-fidelity PNG assets (`earth`, `water`, `lightning`, `fire`, `wind`, `mirror`)
5. **Deterministic fallback:** `archetypeMap` hash 64 symbols → 6 available archetypes — graceful downgrade
6. **Typography fix:** `textTransform: "uppercase"` trên Vietnamese labels — bypass Cinzel small-caps fallback bug

### Consequences

**Improved:**
- Visual integrity preserved across devices
- Premium assets cải thiện immersion đáng kể
- Product philosophy (Privacy & Archetypes) visible ngay trong UX structure

**Worsened / Debt:**
- Bundle size tăng nhẹ (6 image assets)
- `archetypeMap` là hardcoded — nếu source DB mở rộng đáng kể, map phải được maintain hoặc replace bằng dynamic asset generation
- Symbols như "Fox" hay "Forest" share visual với elemental archetype ("Fire", "Wind") đến khi distinct assets được generate

**Known PATTERN-DEBT:**
- `PATTERN-DEBT-hardcoded-archetype-map`: OPEN — hardcoded map cần được review khi symbol count > 100

### Design Decision Note

Retroactive insight: Nên tách biệt `Archetype` (Image Asset) khỏi `Symbol` (Thematic identifier) trong schema. Hiện tại `symbol.id` map trực tiếp vào image filename — coupling này sẽ gây friction khi thêm symbols mới không có dedicated assets.

---

*— End of ADR.md v0.1.0 —*
