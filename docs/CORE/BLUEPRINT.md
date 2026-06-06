# BLUEPRINT.md — Behavior Specification
### AletheiA · v0.1.0 · compatible with: [CONTRACTS v0.1.0, ADR v0.1.0]

> **Mục đích file này:** Mô tả hệ thống *hoạt động như thế nào* — không phải *trông như thế nào*.
> Schemas đã có trong CONTRACTS.md — file này chỉ **reference**, không redefine.
>
> Agent đọc file này: hiểu đủ để implement mà không cần hỏi thêm bất kỳ câu nào.

---

## Mục lục

1. [System Overview](#1-system-overview)
2. [Component Registry](#2-component-registry)
3. [Data Flow](#3-data-flow)
4. [State Machine](#4-state-machine)
5. [Component Specifications](#5-component-specifications)
6. [Integration Points](#6-integration-points)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Scaffolding & Build Order](#8-scaffolding--build-order)
9. [Observability](#9-observability)

---

## 1. SYSTEM OVERVIEW

```
┌──────────────────────────────────────────────────────────────────┐
│                          AletheiA App                            │
│                                                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────┐  │
│  │  Expo Router│    │  React Native│    │   lib/services/    │  │
│  │  app/(tabs) │───▶│  Components  │───▶│  reading-engine    │  │
│  │  app/reading│    │  components/ │    │  core-store        │  │
│  └─────────────┘    └──────────────┘    │  ai-runtime        │  │
│                                         └────────┬───────────┘  │
│                                                  │ UniFFI bridge │
│                                         ┌────────▼───────────┐  │
│                                         │   AletheiaCore     │  │
│                                         │   (Rust / SQLite)  │  │
│                                         └────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  External                                               │    │
│  │  Anthropic Claude API ◄──── cloud AI interpretation    │    │
│  │  LiteRT-LM Engine     ◄──── on-device AI (Qwen3.5-2B)  │    │
│  │  InsForge Backend     ◄──── gift reading token API      │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

**Luồng chính một câu:** User nhập intention → chọn symbol ritual → nhận passage từ wisdom text → optional AI interpretation — tất cả xảy ra on-device, không server.

**Những gì hệ thống này KHÔNG làm:**
- Không sync reading history lên cloud (ADR-AL-002)
- Không track user behavior tới third-party (privacy-first)
- Không require internet để đọc (AI và gift là optional)
- Không push data ra ngoài device ngoài Gift API và AI calls

---

## 2. COMPONENT REGISTRY

> Mỗi component có một nhiệm vụ duy nhất. Không overlap.

### 2.1 Screen Components (Expo Router)

| Component | File | Nhiệm vụ | Stateful? |
|---|---|---|---|
| **HomeScreen** | `app/(tabs)/index.tsx` | Landing — quick-start reading hoặc navigate | Không |
| **HistoryScreen** | `app/(tabs)/mirror.tsx` | Archive readings với filter/sort/search | Có (filter, sort, pagination) |
| **SettingsScreen** | `app/(tabs)/settings.tsx` | User preferences, subscription, privacy | Có (form state) |
| **SituationScreen** | `app/reading/situation.tsx` | Thu thập câu hỏi/intention của user | Có (text input) |
| **PassageScreen** | `app/reading/passage.tsx` | Hiển thị passage đã chọn | Có (reading session) |
| **WildcardScreen** | `app/reading/wildcard.tsx` | Hiển thị symbol cards để chọn | Có (selected symbol) |
| **RitualScreen** | `app/reading/ritual.tsx` | Transition animation | Không |
| **AIStreamingScreen** | `app/reading/ai-streaming.tsx` | Stream AI interpretation text | Có (stream state) |
| **ShareCardScreen** | `app/reading/share-card.tsx` | Generate và share `Ref<ShareCard>` | Có (share state) |
| **ReadingDetailScreen** | `app/reading/[id].tsx` | Chi tiết một reading từ history | Có (reading data) |
| **OnboardingScreen** | `app/onboarding/index.tsx` | First-run onboarding flow | Có (step state) |
| **SignInScreen** | `app/(auth)/sign-in.tsx` | OAuth sign-in (gift redemption context) | Có |
| **PaywallScreen** | `app/.paywall/index.tsx` | Subscription upgrade prompt | Không |
| **GiftCreateScreen** | `app/.gift/create.tsx` | Tạo gift reading | Có (form state) |
| **GiftRedeemScreen** | `app/.gift/redeem.tsx` | Redeem gift token | Có (token state) |

### 2.2 Core Services (lib/services/)

| Service | File | Nhiệm vụ | I/O |
|---|---|---|---|
| **CoreStore** | `lib/services/core-store.ts` | Wrapper quanh UniFFI bridge — expose `AletheiaCore` operations dưới dạng async TS functions | Bridge calls |
| **ReadingEngine** | `lib/services/reading-engine.ts` | Orchestrate reading flow — từ perform_reading đến complete_reading | `Ref<CoreStore>` |
| **AiRuntime** | `lib/services/ai-runtime.ts` | Quyết định dùng local vs cloud AI, manage fallback chain | `Ref<CoreStore>` |
| **InterpretationOrchestrator** | `lib/services/interpretation-orchestrator.ts` | Start stream → poll → post-process → sentence-paced reveal | `Ref<AiRuntime>` |
| **NotificationService** | `lib/services/notification-service.ts` | Schedule local push notifications (expo-notifications) | `Ref<CoreStore>` |
| **Store** | `lib/services/store.ts` | In-memory cache layer trên CoreStore cho React state | `Ref<CoreStore>` |
| **ThemeEngine** | `lib/services/theme-engine.ts` | Load và manage themes + symbol assets | `Ref<CoreStore>` |

### 2.3 Shared Components (components/)

| Component | File | Nhiệm vụ |
|---|---|---|
| **AmbientBackdrop** | `components/ambient-backdrop.tsx` | Breathing orb animation background |
| **InferenceModeBadge** | `components/inference-mode-badge.tsx` | Hiển thị `Ref<InferenceMode>` + `Ref<LocalModelStatus>` |
| **LocalModelManager** | `components/local-model-manager.tsx` | UI manage download/status của Qwen3.5-2B |
| **ToastContainer** | `components/toast.tsx` | Global toast notification overlay |
| **PressableCard** | `components/pressable-card.tsx` | Animated pressable container với a11y props |
| **RitualOrnament** | `components/ritual-ornament.tsx` | Decorative SVG ornaments |
| **SkeletonList** | `components/skeleton.tsx` | Loading placeholder |
| **CrisisResponseModal** | `components/crisis-response-modal.tsx` | Safety modal khi phát hiện crisis keywords |
| **GatewayReveal** | `components/gateway-reveal.tsx` | Reveal animation cho passage |
| **TypewriterText** | `components/typewriter-text.tsx` | Char-by-char text reveal animation |

### 2.4 Native Bridge (lib/native/)

| Module | File | Nhiệm vụ |
|---|---|---|
| **AletheiaCore bridge** | `lib/native/aletheia-core.ts` | Raw UniFFI JNI module wrapper |
| **Bridge** | `lib/native/bridge.ts` | Type-safe wrapper trên raw module |
| **Runtime** | `lib/native/runtime.ts` | Runtime lifecycle management |
| **RuntimeProbe** | `lib/native/runtime-probe.ts` | Check native module availability |

---

## 3. DATA FLOW

### 3.1 Reading Flow (Happy Path)

```
User action                    Frontend layer              Rust/Bridge
──────────────────────────────────────────────────────────────────────
[Tap "New Reading"]
                               SituationScreen renders
[Type situation text]
[Tap "Continue"]
                               ReadingEngine.startReading()
                                    │
                                    ▼
                               CoreStore.performReading(
                                 user_id, source_id?, situation_text
                               )
                                    │──────────────────────▶ AletheiaCore
                                                             .perform_reading()
                                                                 ├─ Check daily limit
                                                                 ├─ Select source
                                                                 ├─ Load theme + symbols
                                                                 └─ Return ReadingSession

                               WildcardScreen renders
                               (symbols from session)
[Choose symbol card]
                               CoreStore.chooseSymbol(
                                 session, symbol_id, method
                               )
                                    │──────────────────────▶ .choose_symbol()
                                                                 ├─ Map symbol → passage
                                                                 └─ Return ChosenPassage

                               RitualScreen (animation)
                               PassageScreen renders passage

[Optionally tap "Get AI"]
                               InterpretationOrchestrator
                               .startStream(passage, symbol,
                                 situation_text, intent)
                                    │──────────────────────▶ .start_interpretation_stream()
                                    │◀───── request_id ──────
                                    │
                               [Poll loop ~300ms]
                               .poll_interpretation_stream(id)
                                    │──────────────────────▶ .poll_interpretation_stream()
                                    │◀───── StreamState ─────
                               [sentence-paced reveal, 600ms]
                               [done=true]

[Tap "Complete"]
                               CoreStore.completeReading(
                                 user_id, reading
                               )
                                    │──────────────────────▶ .complete_reading()
                                                                 ├─ Persist to SQLite
                                                                 └─ Increment readings_today
```

### 3.2 App Startup Flow

```
App launch
    │
    ▼
_layout.tsx: AletheiaCore.initialize(db_path)
    │
    ▼
bootstrap_bundled_content()  ← load sources/passages/themes từ bundled JSON
    │
    ▼
get_user_state(user_id)      ← load hoặc create default UserState
    │
    ▼
set_local_date(today)        ← sync daily limit counter với device date
    │
    ▼
Check onboarding_complete
    ├─ false → navigate OnboardingScreen
    └─ true  → navigate HomeScreen (tabs)
```

### 3.3 AI Fallback Chain

```
start_interpretation_stream() called
    │
    ├─ LocalModelStatus = Ready?
    │    └─ YES: try LiteRT-LM (Qwen3.5-2B)
    │            ├─ Success → stream chunks → post-process → reveal
    │            └─ Fail   → try cloud
    │
    ├─ API key set AND network available?
    │    └─ YES: try Anthropic Claude (Haiku/Sonnet)
    │            ├─ Success → stream chunks → reveal
    │            └─ Fail   → use fallback_prompts
    │
    └─ Fallback: get_fallback_prompts(source_id)
                 └─ Display static wisdom prompts
                    (ai_used_fallback = true, ai_interpreted = false)
```

---

## 4. STATE MACHINE

### 4.1 ReadingState Transitions

```
                    ┌─────────────────────────────────────────┐
                    │              ReadingState                │
                    └─────────────────────────────────────────┘

  [App opens / complete] ──▶ Idle
                                │
                      [Tap "New Reading"]
                                │
                                ▼
                         SituationInput ─────────────────────────────────┐
                                │                                        │
                      [Tap "Continue" / skip]                            │
                                │                                        │
                                ▼                                        │
                         SourceSelection ◀── optional detour ────────────┤
                                │                                        │
                      [Source confirmed]                                 │
                                │                                        │
                                ▼                                        │
                         WildcardReveal                                  │
                                │                                        │
                      [User taps symbol card]                            │
                                │                                        │
                                ▼                                        │
                         WildcardChosen ──[confirm]──▶ RitualAnimation  │
                                                              │          │
                                                    [animation done]     │
                                                              │          │
                                                              ▼          │
                                                       PassageDisplayed  │
                                                              │          │
                                  ┌───────────────────────────┤          │
                                  │                           │          │
                        [Tap "Get AI"]               [Tap "Complete"]    │
                                  │                           │          │
                                  ▼                           ▼          │
                             AiStreaming ──[done]──▶      Complete ──────┘
                                  │
                        [all providers fail]
                                  │
                                  ▼
                             AiFallback ──[acknowledge]──▶ Complete
```

**Guards:**
- `Idle → SituationInput`: không cần guard
- `SituationInput → SourceSelection`: `situation_text` có thể rỗng (user skip)
- `WildcardChosen → RitualAnimation`: symbol_id phải valid trong session.symbols
- `PassageDisplayed → AiStreaming`: local AI luôn được phép nếu model ready; cloud AI yêu cầu `ai_calls_today < FREE_AI_PER_DAY` HOẶC tier=Pro, và phải thỏa `AiPrivacyMode`
- `* → Idle`: bất kỳ lúc nào user navigate away (abandon flow)

### 4.2 LocalModelStatus Transitions

```
NotDownloaded
    │
    [prepare_local_model(false)]
    │
    ▼
Downloading ──[cancel / error]──▶ NotDownloaded / Error
    │
    [progress = 100%, verify size ≥ 95%]
    │
    ▼
Ready ──[CDN has new version]──▶ UpdateAvailable
    │                                    │
    [delete_local_model()]        [prepare_local_model(true)]
    │                                    │
    ▼                                    ▼
NotDownloaded                        Downloading (re-download)

Error ──[retry: prepare_local_model(true)]──▶ Downloading

Unsupported ──[no transition]  // device không đủ điều kiện, permanent
```

---

## 5. COMPONENT SPECIFICATIONS

### 5.1 Reading Flow Screens

**SituationScreen** (`app/reading/situation.tsx`)
- Input: TextInput cho situation_text (multiline, max ~500 chars)
- Output: navigate to WildcardScreen với `{ situation_text, source_id? }`
- Behavior: Skip button available — situation_text là optional

**WildcardScreen** (`app/reading/wildcard.tsx`)
- Input: `ReadingSession.symbols` (shuffled subset)
- Output: navigate to RitualScreen với `{ symbol_id, method }`
- Behavior:
  - Hiển thị symbol cards — user tap để chọn
  - Auto-select sau `WILDCARD_AUTO_DELAY_MS` nếu không có input (SymbolMethod.Auto)
  - Symbol image: try asset từ `archetypeMap`; fallback to elemental archetype (ADR-AL-005)

**AIStreamingScreen** (`app/reading/ai-streaming.tsx`)
- Input: `{ passage, symbol, situation_text, reading_id }`
- Output: `{ ai_text, used_fallback }` → update Reading record
- Behavior:
  - Gọi `InterpretationOrchestrator.startStream()`
  - Poll mỗi 300ms đến `done=true`
  - Reveal sentence-by-sentence với 600ms delay ("sealed letter" pattern)
  - Cancel button → `cancel_interpretation_stream()` → navigate back
  - Timeout sau `AI_STREAM_TIMEOUT_MS` (15s) → show error + offer fallback

### 5.2 HistoryScreen (Mirror Tab)

**File:** `app/(tabs)/mirror.tsx`

**State:**
```
readings         :: List<Ref<ReadingWithDetails>>
isLoading        :: boolean
activeFilter     :: Ref<ArchiveFilter>
activeSort       :: Ref<ArchiveSort>
searchQuery      :: string
page             :: u32
hasMore          :: boolean
```

**Pagination:** `PAGE_SIZE = 20` items/page. Load more khi scroll đến 50% từ cuối.

**Search:** Client-side filter trên loaded data — match trên `situation_text`, `sourceName`, `symbolName`, `symbol_chosen`. Debounce 300ms trước khi track analytics.

**Sort — depth score:** Xem `Ref<ArchiveSort>` definition trong CONTRACTS.md Section 2.2.

### 5.3 InferenceModeBadge

**File:** `components/inference-mode-badge.tsx`

**Props:**
```
mode             :: Ref<InferenceMode>
localModelStatus :: Ref<LocalModelStatus>?
downloadProgress :: u32?       // 0–100, hiển thị khi Downloading
estimatedTps     :: f32?       // hiển thị khi local mode Ready
compact          :: boolean    // true = icon + label only, no details
```

**Status:** V-002/V-003 resolved — props import `InferenceMode` và `LocalModelStatus` từ `lib/types.ts`.

### 5.4 Toast System

**API** (`components/toast.tsx`):
```typescript
showToast(kind: ToastKind, message: string): void
```

**Mechanism:** Module-level singleton callback (`toastCallback`). `useToast()` hook đăng ký callback khi mount. `ToastContainer` render active toasts với fade-in/slide animation. Auto-dismiss sau 4000ms.

**Status:** `ToastKind` đã được export từ `lib/types.ts`; callers import type thay vì tự define string union.

---

## 6. INTEGRATION POINTS

### 6.1 UniFFI Bridge (`lib/native/`)

**Pattern:**
```typescript
// lib/native/bridge.ts
const core = AletheiaCore.new(dbPath, giftBackendUrl);
const result = core.performReading(userId, sourceId, situationText);
if (result.error) throw new Error(result.error.message);
return result.session;
```

**Error handling:** Mọi bridge call trả về `{ data?, error?: BridgeError }`. KHÔNG wrap trong try/catch — check error field trực tiếp.

**Thread safety:** UniFFI operations là synchronous blocking — phải gọi từ background thread (worker hoặc `runOnJS`). `CoreStore` wrap tất cả calls trong `Promise` để không block JS thread.

### 6.2 AI Providers (`lib/services/ai-runtime.ts`)

**Provider selection logic:**
1. Check `LocalModelStatus` — nếu `Ready` và device capable → try local
2. Nếu local fail hoặc NotReady → check `AiPrivacyMode`; default `ask_before_cloud` phải hỏi consent trước khi gửi `situation_text` lên cloud
3. Nếu cloud fail → `get_fallback_prompts()` → display static

**Sonnet vs Haiku:** `use_sonnet = (subscription_tier === Pro)`. Haiku mặc định cho Free tier.

### 6.3 Notification System (`lib/services/notification-service.ts`)

**Local-only scheduling** (expo-notifications — KHÔNG dùng FCM/APNs server push):
- Schedule daily notification dựa trên `UserState.notification_time`
- Content từ `get_daily_notification_message(user_id, date)`
- Deterministic: cùng user + cùng ngày → cùng message

**Reading data KHÔNG được upload** để tạo notification content — đây là privacy invariant (xem memory: "Weekly summary must be local-only").

### 6.4 InsForge Gift API (`server/_core/`)

**Endpoints (tRPC):**
- `gift.create(source_id?, buyer_note?)` → token + deep_link
- `gift.redeem(token)` → `Ref<GiftReadingData>`

**Auth:** InsForge JWT session từ sign-in flow. Gift API là duy nhất cần auth.

**Deep link format:** `aletheia://gift/{token}` — handled bởi Expo Router dynamic route `app/.gift/redeem.tsx`.

### 6.5 Crisis Detection (`lib/utils/crisis-guard.ts`)

**Trigger:** Scan `situation_text` trước khi perform_reading — detect keywords liên quan crisis.

**Behavior khi trigger:** Show `CrisisResponseModal` với resources. Reading flow bị pause (không cancel, user có thể continue sau khi dismiss modal).

**Server-side:** `OUTPUT_HARM_PATTERNS` trong server scan AI output. Vietnamese patterns không dùng `\b` word boundary (không hoạt động với Unicode diacritics — ADR-AL-003).

---

## 7. NON-FUNCTIONAL REQUIREMENTS

### 7.1 Performance

```
bootstrap_bundled_content() : < 500ms (cold start)
perform_reading()           : < 200ms
AI stream first chunk       : < 2000ms (cloud), < 3000ms (local)
get_readings(20, 0)         : < 100ms
```

### 7.2 Privacy

- Không gửi `situation_text` hay reading content lên server (trừ khi user explicit request AI)
- AI calls gửi passage + symbol + situation_text — user đã acknowledge khi tap "Get AI"
- Weekly summary được generate locally (KHÔNG upload reading history — memory invariant)
- `hide_situation` field trong `Ref<Reading>` — nếu được implement, cho phép user ẩn situation_text trong history display (xem V-004 để biết status hiện tại)

### 7.3 Offline Capability

| Feature | Offline? |
|---|---|
| Reading flow (situation → passage) | ✅ Fully offline |
| Local AI interpretation | ✅ Nếu model đã download |
| Cloud AI interpretation | ❌ Cần internet |
| Gift create/redeem | ❌ Cần internet |
| Reading history | ✅ Fully offline |
| Notifications (schedule) | ✅ Local scheduling |
| Model download | ❌ Cần internet + ~1.5GB |

### 7.4 Free Tier Limits

- `FREE_READINGS_PER_DAY = 3` readings/ngày
- `FREE_AI_PER_DAY = 1` cloud AI interpretation/ngày cho Free tier; local AI không tính quota
- Reset: khi `set_local_date()` được gọi với ngày mới
- **Bypass by design:** Delete + reinstall reset daily limit (không có device tracking — memory invariant)

### 7.5 Concurrency

- `InterpretationStreamState` polling: không được start stream thứ hai khi stream đang active
- `Engine` field trong Kotlin `LocalInferenceEngine`: double-checked locking (`engineLock + @Volatile`)
- SQLite: rusqlite với single connection — serialized writes

---

## 8. SCAFFOLDING & BUILD ORDER

### Phase 1 — Core Foundation

```
Gate: bootstrap_bundled_content() works, can perform_reading() and store to SQLite
─────────────────────────────────────────────────────────────────────
1. AletheiaCore (Rust) — contracts.rs, aletheia.udl, lib.rs, store.rs, reading.rs
2. UniFFI bridge — aletheia.udl → generate Kotlin + TypeScript bindings
3. scripts/sync-types.ts — generate lib/types.ts từ contracts.rs
4. lib/native/bridge.ts — type-safe JS wrapper
5. lib/services/core-store.ts — async TS wrapper
6. bootstrap_bundled_content() + seed data scripts
7. Basic reading flow screens (Situation → Wildcard → Passage → Complete)
```

### Phase 2 — AI Layer

```
Gate: AI streaming works, fallback chain tested
─────────────────────────────────────────────────────────────────────
1. lib/services/ai-runtime.ts — provider selection logic
2. lib/services/interpretation-orchestrator.ts — stream + reveal
3. app/reading/ai-streaming.tsx — streaming screen
4. lib/services/local-inference-postprocess.ts — safety + format
5. LocalInferenceEngine.kt (Android) — LiteRT-LM integration
6. components/local-model-manager.tsx — download UI
```

### Phase 3 — User & History

```
Gate: UserState persisted, history paginates correctly
─────────────────────────────────────────────────────────────────────
1. get_user_state / update_user_state
2. app/(tabs)/mirror.tsx — history screen
3. app/reading/[id].tsx — reading detail
4. update_reading_flags (favorite, share)
5. lib/services/notification-service.ts — local scheduling
```

### Phase 4 — Gift & Subscription

```
Gate: Gift create/redeem works end-to-end
─────────────────────────────────────────────────────────────────────
1. InsForge Gift API setup (server/)
2. app/.gift/create.tsx + redeem.tsx
3. app/(auth)/sign-in.tsx — OAuth cho gift flow
4. app/.paywall/index.tsx — upgrade prompt
5. lib/services/purchases.ts — subscription management
```

### Phase 5 — Polish

```
Gate: App store ready
─────────────────────────────────────────────────────────────────────
1. AmbientBackdrop breathing animation (ADR-AL-004)
2. Haptic utility centralization (ADR-AL-004)
3. Premium symbol assets + archetypeMap (ADR-AL-005)
4. Accessibility labels — partial, priority: mirror.tsx (ADR-AL-004)
5. i18n — en + vi strings complete
6. Sentry error reporting
7. Analytics (screen + event tracking)
```

---

## 9. OBSERVABILITY

### 9.1 Analytics Events

```
screen(name, props)                   — screen view
trackArchiveEvent(action, props)      — archive interactions
  action: "reading_opened" | "filter_changed" | "sort_changed" | "search"
```

**Tracked but NOT reading content:**
- `reading_id`, `source_id`, `ai_interpreted`, `is_favorite`, `shared` — OK
- `situation_text`, `symbol_chosen`, `mood_tag`, `user_intent` — KHÔNG track (private)

### 9.2 Error Reporting (Sentry)

**Report:** Bridge errors, unhandled JS exceptions, AI provider failures
**Do NOT include in error context:** `situation_text`, `passage.text`, `buyer_note`

### 9.3 Release Readiness

Script: `scripts/release-readiness-report.ts` — check danh sách criteria trước khi release.
Checklist: `docs/BETA_RELEASE_CHECKLIST.md`
