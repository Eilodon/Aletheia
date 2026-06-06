# CONTRACTS.md — Schema Registry
### AletheiA · v0.1.0 · compatible with: [BLUEPRINT v0.1.0, ADR v0.1.0]

> **Nguyên tắc vàng:** Mọi type, schema, enum, constant được define **MỘT LẦN DUY NHẤT** tại đây.
> BLUEPRINT.md và code **reference** — không redefine, không copy, không paraphrase.
>
> Khi thấy conflict giữa file này và bất kỳ file nào khác → **file này thắng**.
>
> **Chain of command (ADR-AL-001):**
> `CONTRACTS.md` (human spec, primary) → `aletheia.udl` + `contracts.rs` (executable spec) → `lib/types.ts` + Kotlin (generated artifacts)
> Mọi thay đổi type/schema phải cập nhật file này **trước**, sau đó mới cập nhật code.

---

## Mục lục

1. [Primitive Types & Constants](#1-primitive-types--constants)
2. [Enums](#2-enums)
3. [Core Schemas](#3-core-schemas)
4. [I/O Contracts](#4-io-contracts)
5. [Error Registry](#5-error-registry)
6. [External Contracts](#6-external-contracts)
7. [Naming Conventions](#7-naming-conventions)
8. [Schema Changelog](#8-schema-changelog)
9. [Violation Registry](#9-violation-registry)
10. [Glossary](#10-glossary)

---

## 1. PRIMITIVE TYPES & CONSTANTS

> Agent KHÔNG hard-code giá trị của các constants này ở bất kỳ nơi nào khác.
> Authority: `core/src/contracts.rs` (Rust), mirrored to `lib/constants.ts` (TypeScript).
> ⚠️ Khi hai giá trị conflict → file này là source of truth — xem Section 9 để biết status.

**Type notation dùng trong file này:**
```
FieldName :: Type                      — required field
FieldName :: Type?                     — optional (nullable)
FieldName :: List<Type>                — ordered list
FieldName :: Map<KeyType, ValueType>   — map / dict
FieldName :: TypeA | TypeB            — union (chọn một)
FieldName :: Ref<SchemaName>           — reference đến schema khác trong file này
FieldName :: ~Expression               — derived/computed, KHÔNG persist vào storage
```

### 1.1 Business Rules

```
FREE_READINGS_PER_DAY    :: u8    = 3       // Số lần đọc/ngày cho tier Free
FREE_AI_PER_DAY          :: u8    = 1       // Số lần AI interpretation/ngày cho tier Free
PRO_PRICE_MONTHLY_USD    :: f32   = 3.99
PRO_PRICE_YEARLY_USD     :: f32   = 29.99
GIFT_READING_PRICE_USD   :: f32   = 0.99
THEME_PACK_PRICE_USD     :: f32   = 1.99
FREE_HISTORY_DAYS        :: u16   = 90      // Synced with lib/constants.ts
```

### 1.2 UX Timing

```
WILDCARD_AUTO_DELAY_MS   :: u32   = 800     // Delay trước khi tự động chọn wildcard
SYMBOL_FADE_STAGGER_MS   :: u32   = 200     // Stagger giữa các symbol animation frames
AI_FIRST_TOKEN_TIMEOUT_MS    :: u32 = 8_000   // Max wait before first provider token/chunk
AI_PROVIDER_IDLE_TIMEOUT_MS  :: u32 = 15_000  // Max silence after first provider token/chunk
AI_PROVIDER_TOTAL_TIMEOUT_MS :: u32 = 60_000  // Max provider request duration
AI_REVEAL_PACING_MS         :: u32 = 600      // Sentence reveal pacing after safe output
AI_STREAM_TIMEOUT_MS        :: u32 = 15_000   // Legacy alias for provider idle timeout
```

### 1.3 Content Constraints

```
MIN_PASSAGE_CHARS        :: u16   = 20
MAX_PASSAGE_CHARS        :: u16   = 500
NOTIFICATION_MATRIX_SIZE :: u16   = 216     // Số entries trong daily notification pool
GIFT_LINK_TTL_SECONDS    :: u32   = 86_400  // 24 giờ — sau đó GiftExpired
GIFT_BUYER_NOTE_MAX_CHARS :: u16  = 500     // Max optional gift note length before backend send
DEFAULT_PAGE_SIZE        :: u32   = 20
MAX_PAGE_SIZE            :: u32   = 100
```

### 1.4 Local AI Model (Qwen3.5-2B / LiteRT-LM)

> **Authority:** Các constants này được định nghĩa trong `lib/constants/local-model.ts` (TypeScript layer)
> dưới dạng object `LOCAL_MODEL_CONFIG`, **không phải** là named Rust constants trong `contracts.rs`.
> Các giá trị này được dùng làm defaults trong `LocalModelInfo::Default` impl (contracts.rs).
> Nếu muốn thêm vào Rust layer, cần tạo `pub const` trong `contracts.rs` và sync sang đây.

```
LOCAL_MODEL_ID           :: string = "qwen3.5-2b-instruct"
LOCAL_MODEL_VERSION      :: string = "1.0.0"
LOCAL_MODEL_CDN_BASE     :: string = "https://storage.googleapis.com/aletheia-models/qwen3.5-2b"
LOCAL_MODEL_FILENAME     :: string = "Qwen3.5-2B-IT.litertlm"
LOCAL_MODEL_SIZE_BYTES   :: u64    = 1_500_000_000   // ~1.5GB — verify từ HF paulsp94/Qwen3.5-2B-LiteRT-LM
LOCAL_MODEL_MIN_RAM_MB   :: u32    = 3_072
LOCAL_MODEL_MIN_CPU_CORES :: u32   = 4
LOCAL_MODEL_MAX_TOKENS   :: u32    = 512
LOCAL_MODEL_TOP_K        :: u32    = 40
LOCAL_MODEL_TEMPERATURE  :: f32    = 0.7
LOCAL_MODEL_THINKING_ENABLED :: boolean = true   // Qwen3 /think soft switch
```

> `LocalModelInfo::Default` trong `contracts.rs` đã sync các giá trị Qwen3.5-2B.
> Xem Section 9 V-005.

### 1.5 Server / Auth

```
COOKIE_NAME              :: string = "app_session_id"
AXIOS_TIMEOUT_MS         :: u32    = 30_000
```

---

## 2. ENUMS

> Mọi enum được define tại đây. Component và service files KHÔNG được redefine enum.
> Import từ `lib/types.ts` (TypeScript) hoặc `contracts.rs` (Rust).

### 2.1 Core Enums (exposed qua UniFFI bridge)

#### Tradition

```
Tradition ::
  | Chinese    // I Ching
  | Christian  // Bible KJV
  | Islamic    // (reserved — không có source bundled)
  | Sufi       // Hafez, Rumi
  | Stoic      // Marcus Aurelius
  | Universal  // Tao Te Ching, cross-tradition — default
```

**Dùng ở:** `Ref<Source>`, `Ref<ShareCard>`
**Serialization:** lowercase (`"chinese"`, `"universal"`, ...)

---

#### SourceType

```
SourceType ::
  | Hexagram     // symbol_id → passage deterministically (I Ching: 64 quẻ → 64 passages)
  | Bibliomancy  // passage chọn ngẫu nhiên từ pool (Hafez, Bible, Rumi, Marcus) — default
  | Meditation   // passage chọn ngẫu nhiên, ordered by chapter (Tao Te Ching)
```

**Dùng ở:** `Ref<Source>`
**Serialization:** snake_case (`"hexagram"`, `"bibliomancy"`, `"meditation"`)

---

#### SymbolMethod

```
SymbolMethod ::
  | Manual  // User chủ động chọn symbol — default
  | Auto    // System chọn ngẫu nhiên (bounded randomness)
```

**Dùng ở:** `Ref<Reading>`
**Serialization:** lowercase

---

#### MoodTag

```
MoodTag ::
  | Confused   // 😕
  | Hopeful    // 🌟
  | Anxious    // 😰
  | Curious    // 🤔
  | Grateful   // 🙏
  | Grief      // 😢
```

**Dùng ở:** `Ref<Reading>` (optional — user tag sau khi đọc)
**Serialization:** lowercase

---

#### UserIntent

```
UserIntent ::
  | Clarity    // Tìm sự rõ ràng
  | Comfort    // Tìm sự an ủi
  | Challenge  // Muốn bị thử thách
  | Guidance   // Tìm hướng dẫn
```

**Dùng ở:** `Ref<Reading>`, `Ref<UserState>`, `Ref<ReadingSession>`
**Serialization:** lowercase

---

#### SubscriptionTier

```
SubscriptionTier ::
  | Free  // Giới hạn FREE_READINGS_PER_DAY readings/ngày — default
  | Pro   // Unlimited readings, full AI access
```

**Dùng ở:** `Ref<UserState>`
**Serialization:** lowercase

---

#### AiPrivacyMode

```
AiPrivacyMode ::
  | LocalOnly           // Chỉ dùng local model hoặc fallback_prompts, không gửi cloud
  | AskBeforeCloud      // Default: hỏi consent trước khi gửi context lên cloud
  | AllowCloudFallback  // Cho phép tự fallback cloud khi local fail/not ready
```

**Dùng ở:** `Ref<UserState>`, AI orchestration layer
**Serialization:** snake_case

---

#### NotificationPrivacy

```
NotificationPrivacy ::
  | FullText  // Default: lock screen can show passage/summary text
  | Discreet  // Generic AletheiA reminder, no reading content
  | Off       // No local notification content is scheduled
```

**Dùng ở:** `Ref<UserState>`, notification scheduling layer
**Serialization:** snake_case (`"full_text"`, `"discreet"`, `"off"`)

---

#### ReadingState

```
ReadingState ::
  | Idle              // Màn hình trống, chờ user — default
  | SituationInput    // User đang nhập câu hỏi/ngữ cảnh
  | SourceSelection   // Reserved optional detour; Android beta currently chooses source inside perform_reading
  | WildcardReveal    // Đang hiển thị các symbol cards để chọn
  | WildcardChosen    // User đã chọn symbol, chờ confirm
  | RitualAnimation   // Transition animation sang passage
  | PassageDisplayed  // Passage đang hiển thị
  | AiStreaming        // AI đang stream interpretation text
  | AiFallback        // AI không khả dụng, hiển thị fallback prompts
  | Complete          // Reading hoàn tất, có thể save/share
```

**Dùng ở:** Frontend reading flow state machine (session-only, KHÔNG persist)
**Serialization:** snake_case (`"idle"`, `"situation_input"`, `"ai_streaming"`, ...)

---

#### LocalModelStatus

```
LocalModelStatus ::
  | NotDownloaded   // Model chưa tải về device
  | Downloading     // Đang tải — xem LocalModelInfo.download_progress (0–100)
  | Ready           // Model đã tải và sẵn sàng inference
  | UpdateAvailable // Model tồn tại nhưng có version mới trên CDN
  | Error           // Lỗi trong quá trình tải hoặc khởi tạo engine
  | Unsupported     // Device không đủ điều kiện (RAM/CPU)
```

**Dùng ở:** `Ref<LocalModelInfo>`
**Serialization:** snake_case (`"not_downloaded"`, `"ready"`, ...)
**Status:** V-002 resolved — `components/inference-mode-badge.tsx` import từ `lib/types.ts`.

---

#### ErrorCode

Xem Section 5 Error Registry.

---

### 2.2 UI-Scope Enums (frontend only — không qua bridge)

> Các enums này chỉ sống ở frontend layer. KHÔNG define trong component files — phải có trong `lib/types.ts`.

#### InferenceMode

```
InferenceMode ::
  | local    // On-device Qwen3.5-2B qua LiteRT-LM
  | cloud    // Anthropic Claude API (Haiku hoặc Sonnet)
  | fallback // Không có AI, dùng cached fallback_prompts
  | offline  // Không có kết nối và không có local model
```

**Dùng ở:** `components/inference-mode-badge.tsx`, AI orchestration layer
**Status:** V-003 resolved — defined trong `lib/types.ts` và generated bởi `scripts/sync-types.ts`.

---

#### ArchiveFilter

```
ArchiveFilter ::
  | all        // Tất cả readings
  | favorites  // is_favorite = true
  | ai         // ai_interpreted = true
  | shared     // shared = true
```

**Dùng ở:** `app/(tabs)/mirror.tsx` (UI filter state, không persist)

---

#### ArchiveSort

```
ArchiveSort ::
  | latest  // created_at DESC — default
  | oldest  // created_at ASC
  | depth   // ~depth_score DESC, tie-break created_at DESC
```

**depth_score** :: ~ai_interpreted(4) + mood_tag(2) + situation_text(2) + min(read_duration_s/60, 3) + is_favorite(1.5) + shared(1)

**Dùng ở:** `app/(tabs)/mirror.tsx` (UI sort state, không persist)

---

#### ToastKind

```
ToastKind ::
  | success  // Hành động thành công
  | warn     // Cảnh báo không block
  | error    // Lỗi, cần attention
  | info     // Thông tin trung lập
```

**Dùng ở:** `showToast()` API trong `components/toast.tsx`

---

## 3. CORE SCHEMAS

### 3.1 Content Domain

#### Symbol

```
Symbol {
  id           :: string   // e.g. "01_earth", "32_thunder" — snake_case
  display_name :: string   // Localized display name (vi/en)
  flavor_text  :: string?  // Optional ritual/philosophical description
  archetype_asset_id :: string? // Optional visual asset id; defaults to Symbol.id/fallback
}
```

#### Theme

```
Theme {
  id         :: string
  name       :: string
  symbols    :: List<Ref<Symbol>>
  is_premium :: boolean
  pack_id    :: string?    // null nếu là default theme
  price_usd  :: f32?       // null nếu bundled miễn phí
}
```

#### Source

```
Source {
  id               :: string
  name             :: string
  tradition        :: Ref<Tradition>
  language         :: string              // ISO 639-1: "en", "vi", "ar", ...
  passage_count    :: u32
  is_bundled       :: boolean             // true = có sẵn trong app; false = cần download
  is_premium       :: boolean
  fallback_prompts :: List<string>        // Dùng khi AI không available
  source_type      :: Ref<SourceType>     // Điều khiển cách map symbol → passage
}
```

#### Passage

```
Passage {
  id                :: string
  source_id         :: string             // FK → Source.id
  reference         :: string             // e.g. "Quẻ 1 — Càn", "Matthew 5:3"
  text              :: string             // Nội dung passage
  context           :: string?            // Chú giải / lịch sử
  resonance_context :: string?            // Gợi ý ngữ cảnh cho AI
}
```

---

### 3.2 Reading Domain

#### Reading

```
Reading {
  id                   :: string           // UUID (generate_uuid())
  created_at           :: i64              // Unix timestamp, milliseconds
  source_id            :: string           // FK → Source.id
  passage_id           :: string           // FK → Passage.id
  theme_id             :: string           // FK → Theme.id
  symbol_chosen        :: string           // Symbol.id được chọn
  symbol_method        :: Ref<SymbolMethod>
  situation_text       :: string?          // Câu hỏi / ngữ cảnh của user
  ai_interpreted       :: boolean          // AI interpretation đã được thực hiện
  ai_used_fallback     :: boolean          // true = dùng fallback_prompts thay AI
  read_duration_s      :: u32?             // Thời gian từ PassageDisplayed đến Complete
  time_to_ai_request_s :: u32?             // Thời gian từ PassageDisplayed đến click AI
  notification_opened  :: boolean          // Reading này được mở từ push notification
  mood_tag             :: Ref<MoodTag>?
  is_favorite          :: boolean
  shared               :: boolean          // User đã share reading này
  user_intent          :: Ref<UserIntent>?
  hide_situation       :: boolean?         // TS-store-only — xem ghi chú bên dưới
}
```

> **TS-store-only field:** `hide_situation` được lưu trong TypeScript SQLite (`lib/services/store.ts`
> migration v10), KHÔNG qua Rust bridge. Khi `Reading` được fetch từ Rust, field này được
> enrich từ JS-layer store. Đây là pattern có chủ ý — data nhạy cảm thuần UI không cần đi vào
> Rust core. Xem Glossary: "TS-store-only field".

**DualStoreConsistency for TS-store-only dependent rows:**
- `reading_id` is the primary join key between Rust `Reading` and TS-only dependent fields.
- `coreStore.getReadingById()` and `coreStore.getReadingsPage()` must merge TS-only flags after native reads.
- `coreStore.exportReadings()` exports the enriched facade result, including TS-only privacy flags.
- `coreStore.deleteReading(id)` must delete the native row and then delete the TS dependent row for the same id.
- `coreStore.deleteAllReadings()` must clear both native readings and TS dependent rows.
- `coreStore.repairReadingDependents()` runs during app bootstrap and removes TS dependent rows whose
  `reading_id` no longer exists in Rust SQLite.

#### ReadingWithDetails *(UI-scope extension, không qua bridge)*

```
ReadingWithDetails extends Ref<Reading> {
  sourceName :: ~string?   // Derived từ Source.name theo source_id
  symbolName :: ~string?   // Derived từ Symbol.display_name theo symbol_chosen
}
```

**Dùng ở:** `app/(tabs)/mirror.tsx` — enriched display, không persist

---

#### ReadingSession *(ephemeral — KHÔNG persist vào storage)*

```
ReadingSession {
  temp_id        :: string           // ID tạm thời (chưa save vào DB)
  source         :: Ref<Source>
  theme          :: Ref<Theme>
  symbols        :: List<Ref<Symbol>> // Shuffled subset để hiển thị wildcard cards
  situation_text :: string?
  user_intent    :: Ref<UserIntent>?
  started_at     :: i64              // Unix timestamp ms
}
```

#### CompletedReading

```
CompletedReading {
  reading_id :: string   // UUID permanent sau khi complete_reading() thành công
  saved_at   :: i64
}
```

#### ChosenPassage

```
ChosenPassage {
  passage    :: Ref<Passage>
  reading_id :: string     // reading_id của ReadingSession tại thời điểm chọn
}
```

#### ShareCard

```
ShareCard {
  passage_text  :: string
  symbol        :: Ref<Symbol>
  reference     :: string
  tradition     :: Ref<Tradition>
  generated_at  :: i64
  has_watermark :: boolean   // true nếu Free tier
}
```

**Note:** Defined trong `contracts.rs` nhưng KHÔNG qua UniFFI bridge — construct phía frontend.

#### PaginatedReadings

```
PaginatedReadings {
  items       :: List<Ref<Reading>>
  total_count :: u32
  has_more    :: boolean
}
```

---

### 3.3 User Domain

#### UserState

```
UserState {
  user_id                :: string
  subscription_tier      :: Ref<SubscriptionTier>
  readings_today         :: u8              // Reset khi ngày thay đổi (via set_local_date)
  ai_calls_today         :: u8
  session_count          :: u32
  last_reading_date      :: string?         // ISO date "YYYY-MM-DD"
  notification_enabled   :: boolean
  notification_time      :: string?         // "HH:MM" 24h format; default "09:00"
  preferred_language     :: string          // ISO 639-1; default "vi"
  dark_mode              :: boolean
  onboarding_complete    :: boolean
  user_intent            :: Ref<UserIntent>?
  weekly_summary_enabled :: boolean
  ai_privacy_mode        :: Ref<AiPrivacyMode> // default AskBeforeCloud
  notification_privacy   :: Ref<NotificationPrivacy> // default FullText
}
```

**Defaults:** user_id="local-user", tier=Free, preferred_language="vi", notification_time="09:00", notification_enabled=true, ai_privacy_mode=AskBeforeCloud, notification_privacy=FullText

---

### 3.4 Notification Domain

#### NotificationEntry

```
NotificationEntry {
  symbol_id :: string
  question  :: string   // Câu hỏi gợi mở, max ~80 ký tự
}
```

#### NotificationMessage

```
NotificationMessage {
  symbol_id :: string
  question  :: string
  title     :: string   // Push notification title
  body      :: string   // Push notification body text
}
```

---

### 3.5 Gift Domain

#### GiftReadingData *(over bridge)*

```
GiftReadingData {
  token      :: string
  buyer_note :: string?
  source_id  :: string?  // null = receiver tự chọn source
  created_at :: i64
  expires_at :: i64      // created_at + GIFT_LINK_TTL_SECONDS * 1000
  redeemed   :: boolean
}
```

#### GiftReading *(server-side full record — KHÔNG qua bridge)*

```
GiftReading extends Ref<GiftReadingData> {
  redeemed_at :: i64?   // null nếu chưa redeem
}
```

---

### 3.6 Local AI Model Domain

#### LocalModelInfo

```
LocalModelInfo {
  model_id          :: string               // Ref: LOCAL_MODEL_ID
  status            :: Ref<LocalModelStatus>
  download_progress :: u8                   // 0–100 (%)
  model_size_bytes  :: u64                  // Ref: LOCAL_MODEL_SIZE_BYTES
  downloaded_bytes  :: u64
  version           :: string
  error_message     :: string?
  eta_seconds       :: u32?
  device_capable    :: boolean
  required_ram_mb   :: u32                  // Ref: LOCAL_MODEL_MIN_RAM_MB
  available_ram_mb  :: u32
}
```

> V-005 resolved: `LocalModelInfo::Default` trong `contracts.rs` dùng Qwen3.5-2B values.

#### DeviceCapability

```
DeviceCapability {
  supported          :: boolean
  available_ram_mb   :: u32
  cpu_cores          :: u32
  has_simd           :: boolean   // ARM NEON / x86 SSE support
  estimated_tps      :: f32       // Tokens/second estimate
  unsupported_reason :: string?   // null nếu supported = true
}
```

#### ModelVersionInfo *(CDN version manifest — UI-scope)*

```
ModelVersionInfo {
  version        :: string
  releaseDate    :: string
  checksum       :: string
  sha256         :: string
  sizeBytes      :: u64
  minAppVersion  :: string
  minRamMb       :: u32?
  quantization   :: string?
  contextTokens  :: u32?
  signature      :: string?
  changelog      :: string?
}
```

**Dùng ở:** `lib/constants/local-model.ts` — parse từ CDN `version.json`

#### LocalModelManifest *(signed model release contract)*

```
LocalModelManifest {
  model_id       :: string
  version        :: string
  filename       :: string
  size_bytes     :: u64
  sha256         :: string
  signature      :: string?
  min_app_version :: string
  min_ram_mb     :: u32
  quantization   :: string
  context_tokens :: u32
  release_notes  :: string?
}
```

**Readiness rule:** model file is Ready only when filename exists and manifest validation passes exact `size_bytes` and `sha256`. If manifest is temporarily absent in dev, downloader may fall back to the legacy minimum-size threshold, but beta/release requires manifest.

---

### 3.7 AI Interpretation Domain

#### AIInterpretation *(sync API — legacy, không dùng trực tiếp)*

```
AIInterpretation {
  chunks        :: List<string>
  used_fallback :: boolean
}
```

#### InterpretationStreamState *(streaming — current pattern)*

```
InterpretationStreamState {
  request_id    :: string
  new_chunks    :: List<string>   // Chunks mới từ poll lần này
  full_text     :: string         // Accumulated text đến hiện tại
  done          :: boolean
  used_fallback :: boolean
  cancelled     :: boolean
  error         :: Ref<BridgeError>?
}
```

#### Interpretation *(persisted AI text child record)*

```
Interpretation {
  id             :: string
  reading_id     :: string
  created_at     :: i64
  mode           :: string      // "local" | "cloud" | "fallback" | "unknown"
  provider       :: string?
  model_id       :: string?
  prompt_version :: string
  text           :: string
  used_fallback  :: boolean
  safety_status  :: string
  safety_reasons :: List<string>
  input_tokens   :: u32?
  output_tokens  :: u32?
  latency_ms     :: u32?
}
```

**Persistence:** Child record keyed by `reading_id`. `Reading` keeps summary flags; `Interpretation` stores AI text and lineage so privacy/export/delete policies can target interpretation text independently.

---

### 3.8 Bridge Utilities

#### BridgeError

```
BridgeError {
  code    :: string   // "ERR_*" string từ ErrorCode.as_str() hoặc raw error string
  message :: string
}
```

**Response pattern:** Tất cả operations trả về `{ data?: T; error?: BridgeError }`.
KHÔNG throw exception qua bridge — luôn kiểm tra error field.

---

### 3.9 Server / Auth Domain

#### User *(in-memory store khi MYSQL_DISABLED=true — ADR-AL-002)*

```
User {
  openId       :: string
  name         :: string?
  email        :: string?
  loginMethod  :: string?   // "google" | "apple" | null
  role         :: string    // "admin" | "user"
  lastSignedIn :: Date
}
```

#### InsertUser *(upsert input)*

```
InsertUser {
  openId       :: string
  name         :: string?
  email        :: string?
  loginMethod  :: string?
  lastSignedIn :: Date?
  role         :: string?   // default "user"; "admin" nếu openId = ENV.ownerOpenId
}
```

**Note:** Pattern này là legacy từ khi dùng MySQL ORM (ADR-AL-002). Hiện tại cả hai type serve in-memory Map store trong `server/db.ts`.

---

## 4. I/O CONTRACTS

> Tất cả operations của `AletheiaCore` interface (UniFFI bridge — `core/src/aletheia.udl`).
> KHÔNG throw exception qua bridge — mọi error được wrap trong BridgeError field.

### 4.1 Initialization

```
bootstrap_bundled_content() → Ref<SeedBundledDataResponse>
  // Load sources/passages/themes từ bundled JSON assets
  // PRE: app vừa khởi động
  // POST: storage được seed với bundled content
  // Phải thành công trước mọi operation khác

seed_bundled_data(
  sources_json  :: string,
  passages_json :: string,
  themes_json   :: string
) → Ref<SeedBundledDataResponse>
  // Manual seed — dùng trong tests hoặc override. Production dùng bootstrap_bundled_content().

set_ai_api_key(
  provider :: string,   // "anthropic"
  key      :: string    // sk-ant-...
) → Ref<SetApiKeyResponse>
  // Lưu API key vào Rust-managed secure storage (không qua KeyChain JS side)
  // PRE: app đã load
  // POST: key available cho start_interpretation_stream
```

### 4.2 Reading Flow *(sequential — phải gọi đúng thứ tự)*

```
perform_reading(
  user_id        :: string,
  source_id      :: string?,    // null = Rust chọn ngẫu nhiên theo preference
  situation_text :: string?
) → Ref<PerformReadingResponse>
  // PRE: bootstrap_bundled_content() thành công
  // POST: trả về ReadingSession với symbols đã shuffle (để hiển thị wildcard cards)
  // FAIL: DailyLimitReached nếu readings_today ≥ FREE_READINGS_PER_DAY (Free tier)
  // FAIL: SourceNotFound, ThemeNotFound, PassageEmpty

choose_symbol(
  session   :: Ref<ReadingSession>,
  symbol_id :: string,
  method    :: Ref<SymbolMethod>
) → Ref<ChooseSymbolResponse>
  // PRE: symbol_id có trong session.symbols
  // POST: trả về ChosenPassage — passage được select theo symbol + SourceType logic

complete_reading(
  user_id :: string,
  reading :: Ref<Reading>
) → Ref<CompleteReadingResponse>
  // PRE: reading được build từ ReadingSession + ChosenPassage
  // POST: persist Reading vào SQLite, increment readings_today counter
  // FAIL: StorageWriteFail
```

### 4.3 AI Interpretation *(streaming pattern — current)*

```
request_interpretation(
  passage        :: Ref<Passage>,
  symbol         :: Ref<Symbol>,
  situation_text :: string?
) → Ref<RequestInterpretationResponse>
  // ⚠️ LEGACY — sync blocking call. Exists in aletheia.udl và contracts.rs nhưng không dùng
  // trong production flow. Dùng start_interpretation_stream() thay thế.

start_interpretation_stream(
  passage        :: Ref<Passage>,
  symbol         :: Ref<Symbol>,
  situation_text :: string?,
  user_intent    :: string?,     // Ref<UserIntent> serialized value hoặc null
  use_sonnet     :: boolean      // true = Claude Sonnet; false = Claude Haiku
) → Ref<StartInterpretationStreamResponse>
  // PRE: passage + symbol hợp lệ; local/cloud/fallback mode được resolver quyết định
  // POST: request_id để dùng trong poll_interpretation_stream
  // FAIL: AiUnavailable nếu không provider nào được phép; AiDailyLimitReached nếu cloud quota hết

poll_interpretation_stream(request_id :: string) → Ref<InterpretationStreamState>
  // Gọi mỗi ~300ms đến khi done=true hoặc error≠null
  // new_chunks chứa text mới kể từ lần poll trước

cancel_interpretation_stream(request_id :: string) → Ref<CancelInterpretationResponse>

get_fallback_prompts(source_id :: string) → Ref<FallbackPromptsResponse>
  // Lấy Source.fallback_prompts khi AI không available
```

### 4.4 User State

```
get_user_state(user_id :: string) → Ref<UserStateResponse>
  // POST: nếu chưa tồn tại, tạo UserState với defaults

update_user_state(state :: Ref<UserState>) → Ref<UpdateUserStateResponse>
  // Full replace — persist toàn bộ UserState

set_local_date(local_date :: string) → void
  // Đặt ngày local (ISO "YYYY-MM-DD") để daily limit reset đúng
  // Phải gọi mỗi khi app về foreground
```

### 4.5 Content Queries

```
get_sources(premium_allowed :: boolean) → Ref<SourcesResponse>
  // LEGACY/compat only. Không dùng trong production flow vì tin boolean từ UI.

get_sources_for_user(user_id :: string) → Ref<SourcesResponse>
  // Rust tự load UserState/Entitlement và quyết định tier; không tin boolean từ UI.
  // Trả về tất cả sources available cho user đó.

get_readings(
  limit  :: u32,   // ≤ MAX_PAGE_SIZE
  offset :: u32
) → Ref<PaginatedReadingsResponse>
  // Ordered by created_at DESC

search_readings(
  query  :: string, // empty = no text filter
  filter :: string, // ArchiveFilter wire value
  sort   :: string, // ArchiveSort wire value
  limit  :: u32,    // ≤ MAX_PAGE_SIZE
  offset :: u32
) → Ref<PaginatedReadingsResponse>
  // SQLite-backed Mirror search across full history, not only loaded rows

get_reading_by_id(id :: string) → Ref<ReadingResponse>

update_reading_flags(
  id          :: string,
  is_favorite :: boolean?,   // null = không thay đổi field này
  shared      :: boolean?
) → Ref<ReadingResponse>

save_interpretation(interpretation :: Ref<Interpretation>) → Ref<SaveInterpretationResponse>

get_interpretation_by_reading_id(reading_id :: string) → Ref<InterpretationResponse>
```

### 4.6 Notifications

```
get_daily_notification_message(
  user_id :: string,
  date    :: string    // ISO "YYYY-MM-DD"
) → Ref<NotificationMessageResponse>
  // Deterministic từ hash(user_id + date) → NOTIFICATION_MATRIX_SIZE entries
  // Mỗi user nhận cùng message cho cùng ngày (idempotent)
```

### 4.7 Gift Readings

```
redeem_gift(token :: string) → Ref<RedeemGiftResponse>
  // FAIL: GiftExpired, GiftNotFound, GiftAlreadyRedeemed

create_gift(
  source_id  :: string?,
  buyer_note :: string?
) → Ref<CreateGiftResponse>
  // POST: tạo gift token trên InsForge backend, trả về deep_link
  // deep_link format: "aletheia://gift/{token}"
```

### 4.8 Local AI Model

```
check_device_capability() → Ref<DeviceCapabilityResponse>
  // Kiểm tra hardware (RAM, CPU cores, SIMD) — không cần model đã download

get_local_model_status() → Ref<LocalModelStatusResponse>

prepare_local_model(force_download :: boolean) → Ref<PrepareLocalModelResponse>
  // force_download=true: re-download ngay cả khi đã có file
  // POST: nếu started=true → poll get_local_model_status() để track progress

cancel_local_model_download() → Ref<LocalModelStatusResponse>

delete_local_model() → boolean
```

---

## 5. ERROR REGISTRY

> Mọi lỗi từ AletheiaCore đều được wrap trong `BridgeError.code` (string `ERR_*`).
> HTTP status mapping áp dụng ở server transport layer (`lib/errors.ts`).

| ErrorCode variant | Wire string | HTTP | Trigger condition |
|---|---|---|---|
| `SourceNotFound` | `ERR_SOURCE_NOT_FOUND` | 404 | source_id không tồn tại trong SQLite |
| `PassageEmpty` | `ERR_PASSAGE_EMPTY` | 404 | Source tồn tại nhưng không có passage |
| `ThemeNotFound` | `ERR_THEME_NOT_FOUND` | 404 | theme_id không tìm thấy |
| `SymbolInvalid` | `ERR_SYMBOL_INVALID` | 400 | symbol_id không thuộc theme đang active |
| `AiTimeout` | `ERR_AI_TIMEOUT` | 504 | AI stream vượt `AI_STREAM_TIMEOUT_MS` (15s) |
| `AiUnavailable` | `ERR_AI_UNAVAILABLE` | 503 | Tất cả providers (cloud + local) đều fail |
| `AiDailyLimitReached` | `ERR_AI_DAILY_LIMIT_REACHED` | 403 | ai_calls_today ≥ `FREE_AI_PER_DAY` cho cloud AI Free tier |
| `GiftExpired` | `ERR_GIFT_EXPIRED` | 410 | Token quá `GIFT_LINK_TTL_SECONDS` (24h) |
| `GiftNotFound` | `ERR_GIFT_NOT_FOUND` | 404 | Token không tồn tại trên backend |
| `GiftAlreadyRedeemed` | `ERR_GIFT_ALREADY_REDEEMED` | 409 | Token đã được dùng một lần |
| `DailyLimitReached` | `ERR_DAILY_LIMIT_REACHED` | 403 | readings_today ≥ `FREE_READINGS_PER_DAY` |
| `SubscriptionRequired` | `ERR_SUBSCRIPTION_REQUIRED` | 402 | Nội dung premium với Free tier |
| `StorageWriteFail` | `ERR_STORAGE_WRITE_FAIL` | 500 | SQLite write thất bại |
| `InvalidInput` | `ERR_INVALID_INPUT` | 400 | Input validation fail |

**AletheiaError** (TypeScript full struct — `lib/types.ts`):
```
AletheiaError {
  code    :: Ref<ErrorCode>
  message :: string
  context :: Map<string, unknown>?
}
```

**Note:** `AletheiaError` (TypeScript) ≠ `BridgeError` (over bridge). `BridgeError.code` là string `ERR_*`; `AletheiaError.code` là enum variant. Conversion: `lib/errors.ts:toHttpError()`.

---

## 6. EXTERNAL CONTRACTS

### InsForge Backend

- **Project:** aletheia
- **API Base:** `https://4ps4qk8r.us-east.insforge.app`
- **Dùng cho:** Gift reading create/redeem; user auth (disabled — ADR-AL-002)
- **Auth:** API key trong `.env.local` (KHÔNG commit)

### AI Providers

| Provider | Model | Khi nào dùng |
|---|---|---|
| Anthropic Claude Sonnet | `claude-sonnet-4-6` | `use_sonnet=true` (Pro tier) |
| Anthropic Claude Haiku | `claude-haiku-4-5-20251001` | `use_sonnet=false` (Free tier) |
| Local LiteRT-LM | Qwen3.5-2B-IT | Device capable + LocalModelStatus=Ready |

**Fallback chain:** Local model → Cloud → fallback_prompts (static)

### CDN — Google Cloud Storage

```
Base: https://storage.googleapis.com/aletheia-models/qwen3.5-2b/
Files:
  Qwen3.5-2B-IT.litertlm  — model binary (~1.5GB)
  version.json             — Ref<ModelVersionInfo>
  manifest.json            — Ref<LocalModelManifest>
  checksum.sha256          — SHA-256 của model file
```

---

## 7. NAMING CONVENTIONS

```
Schema names         :: PascalCase           (Reading, UserState, BridgeError)
Enum variants        :: PascalCase           (NotDownloaded, AiStreaming)
Field names          :: snake_case           (source_id, is_favorite, ai_calls_today)
Constants            :: SCREAMING_SNAKE_CASE (FREE_READINGS_PER_DAY, AI_STREAM_TIMEOUT_MS)
Error string IDs     :: ERR_SCREAMING_SNAKE  (ERR_SOURCE_NOT_FOUND)
Response type names  :: {Verb}Response       (PerformReadingResponse, LocalModelStatusResponse)
```

**Timestamp convention:**
- Core schemas: `i64` Unix milliseconds (compatible với JavaScript `Date.now()`)
- ISO date strings: `"YYYY-MM-DD"` (notification date, last_reading_date)
- Time strings: `"HH:MM"` 24h format (notification_time)

**Nullable/optional:** Luôn dùng `undefined` trong TypeScript (không mix `null` và `undefined`).
Trong Rust: `Option<T>`. Trong UDL: `T?`.

---

## 8. SCHEMA CHANGELOG

| Version | Date | Files affected | Change |
|---|---|---|---|
| v0.1.0 | 2026-06-05 | All | Initial DSDD bootstrap — reverse-engineered từ codebase hiện có |

---

## 9. VIOLATION REGISTRY

> Theo dõi mọi vi phạm Single Definition Rule và conflict giữa spec và code.
> Lifecycle: **OPEN** → **IN_PROGRESS** → **RESOLVED**
> Mọi violation phải được resolve trước khi merge code liên quan.

---

**V-001 — FREE_HISTORY_DAYS conflict**
- **Status:** ✅ RESOLVED — 2026-06-05
- **Severity:** HIGH — business logic inconsistency
- **Locations:** `core/src/contracts.rs:109` (= 90) vs `lib/constants.ts:29` (was 30)
- **Fix:** `lib/constants.ts:29` updated từ 30 → 90 để sync với contracts.rs.
- **Note:** Cả hai constants là dead code hiện tại (không được import ở đâu). Conflict đã được giải quyết nhưng constants cần được sử dụng khi implement history filter feature.

---

**V-002 — LocalModelStatus duplicate type definition**
- **Status:** ✅ RESOLVED — 2026-06-05
- **Severity:** HIGH — type safety risk tại bridge boundary
- **Root cause:** Native module trả về string union values, nhưng `lib/types.ts` generate TypeScript enum — hai type không structurally compatible. Badge tự define string union riêng vì enum không khớp.
- **Fix:**
  - `lib/types.ts`: Đổi `LocalModelStatus` từ TypeScript enum sang string union type
  - `scripts/sync-types.ts`: Thêm `GENERATE_AS_UNION` set — `LocalModelStatus` được generate là string union thay vì enum khi sync
  - `components/inference-mode-badge.tsx`: Xóa local definition, import từ `@/lib/types`
  - `hooks/use-local-model.ts`: Xóa re-export `NativeLocalModelStatus as LocalModelStatus`

---

**V-003 — InferenceMode không có trong global registry**
- **Status:** ✅ RESOLVED — 2026-06-05
- **Severity:** MEDIUM — missing single definition
- **Root cause:** `"local" | "cloud" | "fallback" | "offline"` được định nghĩa inline tại 4+ file: badge component, hook, orchestrator, analytics. Không ai import từ badge vì dependency direction sẽ sai.
- **Fix:**
  - `lib/types.ts`: Thêm `export type InferenceMode = "local" | "cloud" | "fallback" | "offline"`
  - `scripts/sync-types.ts`: InferenceMode được thêm như static UI-scope type trong generateTypeScript()
  - `components/inference-mode-badge.tsx`: Import từ `@/lib/types`
  - `hooks/use-local-model.ts`: `determineInferenceMode` return type → `InferenceMode`; callback param → `InferenceMode`
  - `lib/services/interpretation-orchestrator.ts`: `InferenceModeSelection.mode` → `InferenceMode`
  - `lib/analytics.ts`: `trackInferenceMode` param → `InferenceMode`

---

**V-004 — hide_situation field trong lib/types.ts không có trong contracts.rs hay aletheia.udl**
- **Status:** ✅ RESOLVED (INCORRECT VIOLATION) — 2026-06-05
- **Finding:** Đây KHÔNG phải vi phạm. `hide_situation` là **TS-store-only field** được thiết kế có chủ ý:
  - `lib/services/store.ts` migration v10: `ALTER TABLE readings ADD COLUMN hide_situation INTEGER NOT NULL DEFAULT 0` — tồn tại trong TypeScript SQLite riêng biệt
  - `lib/services/core-store.ts`: Comment rõ "hide_situation is TS-store-only — persist it first, then handle native flags separately"
  - `app/reading/[id].tsx:396`: UI toggle "Show/Hide Situation" được implement đầy đủ
- **Architecture:** Có hai SQLite databases tách biệt: (1) Rust SQLite via AletheiaCore bridge, (2) TypeScript SQLite trong store.ts. `hide_situation` thuộc về (2) — data thuần UI không cần đi vào Rust core.
- **Action taken:** Cập nhật CONTRACTS.md: `hide_situation` được thêm vào `Reading` schema với annotation TS-store-only. Glossary cập nhật với pattern "TS-store-only field".

---

**V-005 — LocalModelInfo::Default stale Gemma defaults**
- **Status:** ✅ RESOLVED — 2026-06-05
- **Severity:** MEDIUM — stale defaults sau LiteRT-LM migration (ADR-AL-003)
- **Fix:** `core/src/contracts.rs` Default impl đã được cập nhật:
  - `model_id`: `"gemma-3-1b-it-qat-q4_0"` → `"qwen3.5-2b-instruct"`
  - `model_size_bytes`: `529_000_000` → `1_500_000_000`
  - `required_ram_mb`: `1024` → `3_072`

---

## 10. GLOSSARY

| Term | Definition |
|---|---|
| **AletheiA** | App thiền định kỹ thuật số — kết hợp wisdom texts với AI interpretation |
| **Bridge** | UniFFI-generated layer giữa Rust core và Kotlin (Android) / TypeScript (RN) |
| **Bundled content** | Sources, passages, themes được đóng gói sẵn trong APK — không cần network |
| **Daily limit** | `FREE_READINGS_PER_DAY` readings/ngày cho Free tier — reset khi ngày thay đổi |
| **depth score** | Điểm "chiều sâu" của một reading — tính từ ai_interpreted, mood_tag, situation_text, read_duration, is_favorite, shared |
| **Fallback** | AI interpretation được thay bằng `Source.fallback_prompts` khi cloud + local đều fail |
| **DSDD** | Design-Sufficient Design Document — bộ ba CONTRACTS/BLUEPRINT/ADR |
| **LiteRT-LM** | Google's on-device LLM runtime (replacement cho deprecated MediaPipe GenAI) |
| **Passage** | Một đoạn trích từ Source — unit cơ bản của một reading |
| **Reading** | Một phiên đọc hoàn chỉnh: từ situation input → symbol chọn → passage → optional AI |
| **ReadingSession** | Ephemeral in-memory state trong suốt một reading flow — không persist |
| **Source** | Một văn bản thiêng liêng (I Ching, Bible KJV, Hafez, Rumi, Marcus Aurelius, Tao Te Ching) |
| **Symbol / Wildcard** | Card user chọn trong ritual — mapping tới passage theo SourceType logic |
| **Tier Free** | SubscriptionTier.Free — giới hạn FREE_READINGS_PER_DAY readings/ngày |
| **Tier Pro** | SubscriptionTier.Pro — không giới hạn readings, full AI access |
| **UDL** | UniFFI Definition Language — `core/src/aletheia.udl` — executable spec cho Kotlin/TS binding |
| **TS-store-only field** | Field tồn tại trong TypeScript SQLite (`lib/services/store.ts`) nhưng không trong Rust bridge. Reading được enrich với các field này sau khi fetch từ Rust. Pattern cho UI-only data không cần đi vào Rust core (e.g., `hide_situation`). |
| **UserIntent** | Mục đích của user khi đọc (Clarity/Comfort/Challenge/Guidance) — ảnh hưởng AI prompt |
