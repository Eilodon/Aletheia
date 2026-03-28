# CONTRACTS.md — Schema Registry
### Aletheia · v1.0

> **Nguyên tắc vàng:** Mọi type, schema, enum, constant được define **MỘT LẦN DUY NHẤT** tại đây.
> BLUEPRINT.md và code **reference** — không redefine, không copy, không paraphrase.
>
> Khi thấy conflict giữa file này và bất kỳ file nào khác → file này thắng.

---

## Mục lục

1. [Primitive Types & Constants](#1-primitive-types--constants)
2. [Enums](#2-enums)
3. [Core Schemas](#3-core-schemas)
4. [Input / Output Contracts](#4-input--output-contracts)
5. [Error Registry](#5-error-registry)
6. [External Contracts](#6-external-contracts)
7. [Naming Conventions](#7-naming-conventions)
8. [Schema Changelog](#8-schema-changelog)

---

## 1. PRIMITIVE TYPES & CONSTANTS

```
// Reading limits
FREE_READINGS_PER_DAY     :: u8  = 3
  // Lý do: đủ để build habit hàng ngày, không đủ để dùng no-brain

FREE_AI_PER_DAY           :: u8  = 1
  // Lý do: 1 AI call/day = taste of value, không drain API cost

PRO_PRICE_MONTHLY_USD     :: f32 = 3.99
PRO_PRICE_YEARLY_USD      :: f32 = 29.99
GIFT_READING_PRICE_USD    :: f32 = 0.99
THEME_PACK_PRICE_USD      :: f32 = 1.99

// UX timing
WILDCARD_AUTO_DELAY_MS    :: u32 = 800
  // Lý do: đủ để cảm giác "vũ trụ đang chọn", không quá lâu để gây impatience

SYMBOL_FADE_STAGGER_MS    :: u32 = 200
  // Lý do: 3 symbols × 200ms = 600ms total reveal, feels intentional

AI_STREAM_TIMEOUT_MS      :: u32 = 15_000
  // Lý do: nếu >15s thì UX broken, trigger offline fallback

// Notification
NOTIFICATION_MATRIX_SIZE  :: u16 = 150
  // Lý do: 30 symbols × 5 questions = đủ đa dạng để không lặp trong 5 tháng

// Content
MIN_PASSAGE_CHARS         :: u16 = 20
MAX_PASSAGE_CHARS         :: u16 = 500
  // Lý do: <20 quá ngắn để có meaning, >500 quá dài cho ritual context

// History
FREE_HISTORY_DAYS         :: u16 = 30
GIFT_LINK_TTL_SECONDS     :: u32 = 86_400   // 24 giờ
```

> **Type notation dùng trong file này:**
> ```
> FieldName :: Type                       — required field
> FieldName :: Type?                      — optional (nullable)
> FieldName :: List<Type>                 — list
> FieldName :: Map<KeyType, ValueType>    — map
> FieldName :: TypeA | TypeB             — union type
> FieldName :: Ref<SchemaName>            — reference đến schema khác
> ```

---

## 2. ENUMS

### Tradition

```
Tradition ::
  | Chinese      // I Ching, Đạo Đức Kinh
  | Christian    // Kinh Thánh KJV
  | Islamic      // Hafez — Divan
  | Sufi         // Rumi — Masnavi
  | Stoic        // Marcus Aurelius — Meditations
  | Universal    // Không thuộc tradition cụ thể
```

**Dùng ở:** `Source`
**Dùng cho:** visual theming share card (ornament theo tradition), filter UI

---

### SymbolMethod

```
SymbolMethod ::
  | Manual       // User tự tap chọn symbol
  | Auto         // User tap "Để vũ trụ chọn" — app random
```

**Dùng ở:** `Reading`
**Không dùng cho:** logic khác — chỉ là engagement signal & Mirror data

---

### MoodTag

```
MoodTag ::
  | Confused     // "Đang mắc kẹt"
  | Hopeful      // "Đang tìm hướng đi"
  | Anxious      // "Đang lo lắng"
  | Curious      // "Đang tò mò"
  | Grateful     // "Đang biết ơn"
  | Grief        // "Đang buông bỏ"
```

**Dùng ở:** `Reading`
**Dùng cho:** Your Mirror v2.0 — emotional pattern tracking

---

### SubscriptionTier

```
SubscriptionTier ::
  | Free
  | Pro
```

**Dùng ở:** `UserState`
**Gated features theo tier:** xem BLUEPRINT.md Section 6

---

### ReadingState

```
ReadingState ::
  | Idle              // Chưa bắt đầu
  | SituationInput    // User đang nhập tình huống (skippable)
  | SourceSelection   // User đang chọn source
  | WildcardReveal    // 3 symbols đang hiện ra
  | WildcardChosen    // Symbol đã được chọn (manual hoặc auto)
  | RitualAnimation   // Book flip animation
  | PassageDisplayed  // Passage đang hiển thị
  | AIStreaming        // AI đang stream response
  | AIFallback        // Offline — showing static reflection prompts
  | Complete          // Reading hoàn tất, saved to DB
```

**Dùng ở:** State machine trong BLUEPRINT.md Section 4
**Invariant:** Chỉ transition theo đúng graph trong BLUEPRINT.md — không skip

---

### ErrorCode

```
ErrorCode ::
  | ERR_SOURCE_NOT_FOUND
  | ERR_PASSAGE_EMPTY
  | ERR_THEME_NOT_FOUND
  | ERR_SYMBOL_INVALID
  | ERR_AI_TIMEOUT
  | ERR_AI_UNAVAILABLE
  | ERR_GIFT_EXPIRED
  | ERR_GIFT_NOT_FOUND
  | ERR_GIFT_ALREADY_REDEEMED
  | ERR_DAILY_LIMIT_REACHED
  | ERR_SUBSCRIPTION_REQUIRED
  | ERR_STORAGE_WRITE_FAIL
  | ERR_INVALID_INPUT
```

**Dùng ở:** Error Registry Section 5, tất cả I/O contracts

---

## 3. CORE SCHEMAS

> Sắp xếp từ primitive → composite. Schema phụ thuộc schema khác → schema kia define TRÊN.

---

### Symbol

> Một biểu tượng trong wildcard screen — đơn vị nhỏ nhất của Wildcard mechanic

```
Symbol :: {
  id           :: string        // unique trong theme, VD: "candle", "key", "dawn"
  display_name :: string        // Tên hiển thị, VD: "Ngọn nến"
  flavor_text  :: string?       // Mô tả ngắn, optional — dùng trong premium themes
}
```

**Constraints:**
```
INVARIANT: id không được chứa spaces hoặc uppercase
RANGE:     display_name.length ∈ [1, 30]
RANGE:     flavor_text.length ∈ [0, 100] nếu present
```

---

### Theme

> Một bộ symbols thuộc cùng một nhóm — đơn vị của wildcard experience

```
Theme :: {
  id           :: string
  name         :: string              // VD: "Khoảnh khắc"
  symbols      :: List<Ref<Symbol>>   // Số lượng: ∈ [10, 30]
  is_premium   :: bool
  pack_id      :: string?             // Nếu thuộc một curator pack
  price_usd    :: f32?                // Chỉ present nếu is_premium = true
}
```

**Constraints:**
```
INVARIANT: symbols.length ∈ [10, 30]
INVARIANT: price_usd phải present khi is_premium = true
INVARIANT: mỗi lần random chọn 3 symbols từ list — không trùng nhau
```

---

### Source

> Một kho văn bản gốc — I Ching, Kinh Thánh, Hafez...

```
Source :: {
  id             :: string          // VD: "i_ching", "bible_kjv", "tao_te_ching"
  name           :: string          // VD: "I Ching — Kinh Dịch"
  tradition      :: Tradition
  language       :: string          // ISO 639-1, VD: "vi", "en"
  passage_count  :: u32
  is_bundled     :: bool            // true = shipped với app binary
  is_premium     :: bool
  fallback_prompts :: List<string>  // 3 câu reflection tĩnh khi AI offline
                                    // Xem ADR-AL-8
}
```

**Constraints:**
```
INVARIANT: fallback_prompts.length == 3
INVARIANT: passage_count > 0
RANGE:     mỗi fallback_prompt.length ∈ [20, 150]
```

---

### Passage

> Một đoạn trích từ source — đơn vị nội dung của reading

```
Passage :: {
  id          :: string
  source_id   :: string           // FK → Source.id
  reference   :: string           // VD: "Hexagram 42 · 益", "John 3:16"
  text        :: string           // Nội dung passage
  context     :: string?          // Chú thích gốc nếu có
}
```

**Constraints:**
```
RANGE: text.length ∈ [MIN_PASSAGE_CHARS, MAX_PASSAGE_CHARS]
RANGE: reference.length ∈ [1, 80]
```

---

### Reading

> Một lần đọc hoàn chỉnh — đơn vị lịch sử và Your Mirror data

```
Reading :: {
  // Identity
  id              :: string         // UUID v4
  created_at      :: i64            // Unix timestamp ms

  // Core
  source_id       :: string         // FK → Source.id
  passage_id      :: string         // FK → Passage.id

  // Wildcard (ADR-AL-2 revised: mandatory screen, 2 paths)
  theme_id        :: string         // FK → Theme.id
  symbol_chosen   :: string         // FK → Symbol.id
  symbol_method   :: SymbolMethod   // Manual | Auto

  // Context (ADR-AL-5: always optional)
  situation_text  :: string?        // Nhập bởi user trước khi đọc

  // Engagement signals (ADR-AL-11: Mirror data từ v1.0)
  ai_interpreted  :: bool           // User đã tap "Diễn giải"?
  ai_used_fallback :: bool          // True nếu dùng static prompts thay AI
  read_duration_s :: u32?           // Giây user ở lại PassageDisplayed screen
  mood_tag        :: MoodTag?       // User self-tag sau reading
  is_favorite     :: bool           // Default: false

  // Social
  shared          :: bool           // User đã share card?
}
```

**Constraints:**
```
INVARIANT: theme_id, symbol_chosen, symbol_method luôn present
           (wildcard screen là mandatory — ADR-AL-2 revised)
INVARIANT: ai_used_fallback chỉ true khi ai_interpreted = true
INVARIANT: read_duration_s >= 0 nếu present
```

---

### NotificationEntry

> Một entry trong notification matrix — "Vũ trụ hôm nay lật: X. [Tension]?"

```
NotificationEntry :: {
  symbol_id      :: string      // FK → Symbol.id
  question       :: string      // Câu tension ngắn, không có dấu "?"
                                // VD: "Bạn đang thắp sáng hay đang cháy"
}
```

**Constraints:**
```
RANGE: question.length ∈ [10, 60]
INVARIANT: matrix tổng = NOTIFICATION_MATRIX_SIZE (150)
Format khi push: "Vũ trụ hôm nay lật: {symbol.display_name}. {question}?"
```

---

### GiftReading

> Trạng thái của một Gift Reading được mua và gửi — minimal backend state

```
GiftReading :: {
  token          :: string       // UUID v4 — dùng trong deep link
  buyer_note     :: string?      // Tin nhắn ngắn từ người tặng, optional
  source_id      :: string?      // Source người tặng chọn, null = random
  created_at     :: i64          // Unix timestamp ms
  expires_at     :: i64          // created_at + GIFT_LINK_TTL_SECONDS
  redeemed       :: bool         // Default: false
  redeemed_at    :: i64?
}
```

**Constraints:**
```
INVARIANT: redeemed_at phải present khi redeemed = true
INVARIANT: expires_at = created_at + 86_400_000 (ms)
INVARIANT: token không thể reuse sau khi redeemed = true
```

---

### UserState

> State local của user — stored on-device, không sync cloud (v1.0)

```
UserState :: {
  subscription_tier    :: SubscriptionTier
  readings_today       :: u8              // Reset lúc midnight local time
  ai_calls_today       :: u8              // Reset lúc midnight local time
  last_reading_date    :: string?         // ISO date "2026-03-18", null = chưa đọc
  notification_enabled :: bool            // Default: true
  notification_time    :: string?         // "HH:MM" local, null = disabled
  preferred_language   :: string          // Default: "vi"
  dark_mode            :: bool            // Default: false (system preference)
}
```

---

### ShareCard

> Metadata để render share card — input cho card generator

```
ShareCard :: {
  reading_id     :: string          // FK → Reading.id
  symbol         :: Ref<Symbol>
  passage_text   :: string          // Truncated ≤ 120 chars nếu cần
  reference      :: string          // Source reference ngắn
  tradition      :: Tradition       // Cho visual theming
  has_watermark  :: bool            // True nếu Free tier
  generated_at   :: i64
}
```

---

## 4. INPUT / OUTPUT CONTRACTS

---

### perform_reading()

> Entry point chính — bắt đầu một reading session mới

```
INPUT :: {
  source_id      :: string?    // null = app random chọn
  situation_text :: string?    // null = user skip
}

OUTPUT :: {
  theme          :: Ref<Theme>
  symbols        :: List<Ref<Symbol>>   // Đúng 3 symbols random từ theme
  // Reading chưa complete — chờ choose_symbol()
}
| Ref<ERR_SOURCE_NOT_FOUND>
| Ref<ERR_DAILY_LIMIT_REACHED>
| Ref<ERR_SUBSCRIPTION_REQUIRED>

SIDE EFFECTS:
  - Không có — reading chưa được tạo cho đến khi complete_reading()

PRE-CONDITIONS:
  - UserState.readings_today < FREE_READINGS_PER_DAY (nếu Free tier)

POST-CONDITIONS:
  - 3 symbols được random, không trùng nhau

IDEMPOTENT: KHÔNG — mỗi call random symbols mới
```

---

### choose_symbol()

> User chọn symbol — hoặc app auto-choose

```
INPUT :: {
  symbol_id    :: string          // Symbol được chọn
  method       :: SymbolMethod    // Manual | Auto
  source_id    :: string
  situation_text :: string?
}

OUTPUT :: {
  passage      :: Ref<Passage>
  reading_id   :: string          // ID tạm, chưa saved
}
| Ref<ERR_SYMBOL_INVALID>
| Ref<ERR_PASSAGE_EMPTY>

SIDE EFFECTS:
  - Passage được random từ source

IDEMPOTENT: KHÔNG
```

---

### request_ai_interpretation()

> User tap "Diễn giải" — gọi Claude API hoặc trả fallback nếu offline

```
INPUT :: {
  reading_id     :: string
  passage        :: Ref<Passage>
  symbol         :: Ref<Symbol>
  situation_text :: string?
}

OUTPUT :: {
  stream         :: AsyncStream<string>   // Happy path — AI stream
  is_fallback    :: bool
}
| Ref<ERR_AI_TIMEOUT>       // Sau AI_STREAM_TIMEOUT_MS
| Ref<ERR_DAILY_LIMIT_REACHED>

SIDE EFFECTS:
  - Nếu timeout/unavailable → tự động switch sang get_fallback_prompts()
  - ai_used_fallback = true được set trên reading

FALLBACK:
  - Gọi get_fallback_prompts(source_id) → trả 3 static prompts
  - Không throw error — offline là valid state (ADR-AL-8)
```

---

### complete_reading()

> Lưu reading vào local DB sau khi user đã đọc xong

```
INPUT :: Ref<Reading>   // Full reading object với mọi fields

OUTPUT :: {
  reading_id :: string
  saved_at   :: i64
}
| Ref<ERR_STORAGE_WRITE_FAIL>

SIDE EFFECTS:
  - INSERT INTO readings
  - UserState.readings_today += 1
  - UserState.ai_calls_today += 1 nếu ai_interpreted = true

POST-CONDITIONS:
  - Reading có thể query từ get_history()

IDEMPOTENT: KHÔNG — không gọi 2 lần cùng reading_id
```

---

### get_fallback_prompts()

> Trả 3 câu reflection tĩnh khi AI offline — bundled trong binary

```
INPUT  :: { source_id :: string }

OUTPUT :: { prompts :: List<string> }   // Đúng 3 items
        | Ref<ERR_SOURCE_NOT_FOUND>

SIDE EFFECTS: none
IDEMPOTENT: CÓ
```

---

### generate_share_card()

> Render SVG → PNG cho share sheet — chạy trong Rust, no network needed

```
INPUT  :: Ref<ShareCard>

OUTPUT :: {
  image_data :: bytes    // PNG binary
  width_px   :: u32
  height_px  :: u32
}
| Ref<ERR_INVALID_INPUT>

SIDE EFFECTS: none
PERFORMANCE: ≤ 500ms (xem NFR Section 7)
IDEMPOTENT: CÓ
```

---

### redeem_gift()

> Recipient dùng deep link token để nhận Gift Reading

```
INPUT  :: { token :: string }

OUTPUT :: {
  source_id  :: string?
  buyer_note :: string?
  message    :: string    // "Bạn nhận được một lần đọc từ [ẩn danh/tên]"
}
| Ref<ERR_GIFT_NOT_FOUND>
| Ref<ERR_GIFT_EXPIRED>
| Ref<ERR_GIFT_ALREADY_REDEEMED>

SIDE EFFECTS:
  - GiftReading.redeemed = true
  - GiftReading.redeemed_at = now()
  - UserState.readings_today KHÔNG bị trừ cho lần đọc này

IDEMPOTENT: KHÔNG — token chỉ redeem được 1 lần
```

---

## 5. ERROR REGISTRY

| Code | HTTP | Message Template | Context cần thiết | Khi nào xảy ra |
|---|---|---|---|---|
| `ERR_SOURCE_NOT_FOUND` | 404 | `"Source '{source_id}' không tồn tại"` | `source_id` | source_id không có trong DB |
| `ERR_PASSAGE_EMPTY` | 500 | `"Source '{source_id}' không có passage"` | `source_id` | Source rỗng — không nên xảy ra nếu data bundle đúng |
| `ERR_THEME_NOT_FOUND` | 404 | `"Theme '{theme_id}' không tồn tại"` | `theme_id` | theme_id không có trong DB |
| `ERR_SYMBOL_INVALID` | 400 | `"Symbol '{symbol_id}' không thuộc theme hiện tại"` | `symbol_id`, `theme_id` | User gửi symbol không nằm trong 3 symbols đã random |
| `ERR_AI_TIMEOUT` | 504 | `"Không nhận được phản hồi sau {timeout}ms"` | `timeout_ms` | Claude API không respond trong AI_STREAM_TIMEOUT_MS |
| `ERR_AI_UNAVAILABLE` | 503 | `"Dịch vụ diễn giải tạm thời không khả dụng"` | — | Network error hoặc API down |
| `ERR_GIFT_EXPIRED` | 410 | `"Món quà này đã hết hạn sau 24 giờ"` | `expired_at` | now() > GiftReading.expires_at |
| `ERR_GIFT_NOT_FOUND` | 404 | `"Không tìm thấy món quà này"` | `token` | Token không tồn tại trong DB |
| `ERR_GIFT_ALREADY_REDEEMED` | 409 | `"Món quà này đã được nhận"` | `redeemed_at` | GiftReading.redeemed = true |
| `ERR_DAILY_LIMIT_REACHED` | 429 | `"Bạn đã dùng {used}/{limit} lượt hôm nay"` | `used`, `limit`, `reset_at` | readings_today >= FREE_READINGS_PER_DAY |
| `ERR_SUBSCRIPTION_REQUIRED` | 403 | `"Tính năng này dành cho Pro"` | `feature` | Free user access premium feature |
| `ERR_STORAGE_WRITE_FAIL` | 500 | `"Không thể lưu dữ liệu"` | `operation` | SQLite write fail |
| `ERR_INVALID_INPUT` | 400 | `"Dữ liệu không hợp lệ: {field}"` | `field`, `reason` | Validation fail |

> **Error format chuẩn:**
> ```
> Error :: {
>   code    :: ErrorCode
>   message :: string
>   context :: Map<string, any>
>   trace   :: string?           // chỉ trong debug build
> }
> ```

---

## 6. EXTERNAL CONTRACTS

### Claude API (Anthropic)

```
// Request từ Aletheia:
REQUEST :: {
  model      :: "claude-sonnet-4-20250514"
  max_tokens :: 1000
  stream     :: true
  system     :: string    // Xem BLUEPRINT.md Section 5 — AIClient
  messages   :: [{
    role    :: "user"
    content :: string     // Formatted prompt với passage + symbol + situation
  }]
}

// Response expect:
RESPONSE :: AsyncStream<MessageStreamEvent>

// Failure modes:
FAILURES ::
  | TIMEOUT       // Sau AI_STREAM_TIMEOUT_MS → fallback get_fallback_prompts()
  | RATE_LIMITED  // HTTP 429 → coi như UNAVAILABLE
  | UNAVAILABLE   // HTTP 5xx → fallback get_fallback_prompts()
  // KHÔNG throw error ra UI — fallback là valid path (ADR-AL-8)
```

---

### Gift Backend (minimal — KV store)

```
// Aletheia gọi để tạo gift:
CREATE_GIFT :: {
  INPUT  :: { source_id :: string?, buyer_note :: string? }
  OUTPUT :: { token :: string, deep_link :: string }
}

// Aletheia gọi để redeem:
REDEEM_GIFT :: {
  INPUT  :: { token :: string }
  OUTPUT :: Ref<GiftReading>
           | Ref<ERR_GIFT_NOT_FOUND>
           | Ref<ERR_GIFT_EXPIRED>
           | Ref<ERR_GIFT_ALREADY_REDEEMED>
}

// Implementation: Cloudflare Workers + KV
// Xem ADR-AL-9 cho lý do chọn minimal backend
```

---

### RevenueCat (Subscription)

```
// Aletheia expect từ RevenueCat SDK:
ENTITLEMENTS :: {
  "pro" :: {
    is_active  :: bool
    expires_at :: i64?
  }
}

// Failure mode:
FAILURES ::
  | SDK_UNAVAILABLE  // Dùng cached entitlement, không block app
```

---

### Branch.io / Firebase Dynamic Links (Deferred deep link)

```
// Gift deep link format:
DEEP_LINK :: "https://aletheia.app/gift/{token}"

// Deferred install: nếu recipient chưa có app
//   → App Store / Play Store install
//   → Sau install, SDK deliver pending deep link
//   → App nhận token, call redeem_gift()
```

---

## 7. NAMING CONVENTIONS

| Context | Convention | Ví dụ |
|---|---|---|
| Schema names | `PascalCase` | `Reading`, `GiftReading`, `ShareCard` |
| Field names | `snake_case` | `source_id`, `created_at`, `is_premium` |
| Constants | `SCREAMING_SNAKE` | `FREE_READINGS_PER_DAY`, `AI_STREAM_TIMEOUT_MS` |
| Rust functions | `snake_case` | `perform_reading()`, `choose_symbol()` |
| Error codes | `ERR_SCREAMING_SNAKE` | `ERR_GIFT_EXPIRED` |
| UniFFI exports | `camelCase` | `performReading()`, `chooseSymbol()` |
| SQLite tables | `snake_case plural` | `readings`, `sources`, `passages` |
| Source IDs | `snake_case` | `i_ching`, `bible_kjv`, `tao_te_ching` |

**Domain-specific rules:**

```
RULE 1 — ID fields: luôn là string (UUID v4 hoặc slug), không dùng integer PK
  ✅ reading.id = "550e8400-e29b-41d4-a716-446655440000"
  ❌ reading.id = 42

RULE 2 — Timestamps: luôn là i64 Unix ms, không dùng string date
  ✅ created_at = 1742284800000
  ❌ created_at = "2026-03-18T00:00:00Z"

RULE 3 — Boolean fields: prefix is_ hoặc has_ hoặc verb past tense
  ✅ is_premium, is_favorite, ai_interpreted, shared
  ❌ premium, favorite

RULE 4 — Nullable vs default: nếu có sensible default thì dùng default, không nullable
  ✅ is_favorite :: bool  (default false)
  ❌ is_favorite :: bool? (unnecessary nullable)
```

---

## 8. SCHEMA CHANGELOG

| Version | Date | Schema | Thay đổi | Breaking? | ADR Ref |
|---|---|---|---|---|---|
| v1.0 | 2026-03-18 | — | Init schema registry — all schemas | — | ADR-AL-1 through AL-11 |

> **Template một entry:**
> `| v{{X.Y}} | {{DATE}} | {{SCHEMA}} | {{ADDED/REMOVED/RENAMED}}: {{FIELD}} | {{CÓ/KHÔNG}} | ADR-{{N}} |`

---

## 9. CYCLE #3 UPDATES — PERFORMANCE & RESOURCE MANAGEMENT

### 9.1 Constants

```
// Pagination
DEFAULT_PAGE_SIZE         :: u32 = 20
  // Lý do: Đủ để lấp đầy màn hình mobile mà không gây lag serialization (<1ms)

MAX_PAGE_SIZE             :: u32 = 100
  // Lý do: Giới hạn an toàn để đảm bảo serialization time luôn < 5ms
```

### 9.2 Types

```
// Pagination Result
PaginatedResult<T> :: {
  items       :: List<T>
  total_count :: u32
  has_more    :: bool
}

// Cancellation Token (UniFFI Bridge)
CancellationToken :: {
  id          :: string
  is_cancelled :: bool
}
```
