# BLUEPRINT.md — Behavior Specification
### Aletheia · v1.0

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

---

## 1. SYSTEM OVERVIEW

```
┌──────────────────────────────────────────────────────────────────┐
│                         ALETHEIA v1.0                            │
│                  "Not a fortune. A mirror."                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    UI Layer (Native)                      │   │
│  │         SwiftUI (iOS)  │  Jetpack Compose (Android)       │   │
│  └───────────────────┬──────────────────────────────────────┘   │
│                      │ UniFFI bindings                           │
│  ┌───────────────────▼──────────────────────────────────────┐   │
│  │                    Rust Core                              │   │
│  │  ┌─────────────┐  ┌──────────┐  ┌──────────────────────┐│   │
│  │  │   Reading   │  │  Store   │  │     API Client       ││   │
│  │  │   Engine    │  │ (SQLite) │  │  (Claude + Gift BE)  ││   │
│  │  └─────────────┘  └──────────┘  └──────────────────────┘│   │
│  │  ┌─────────────┐  ┌──────────┐                           │   │
│  │  │   Theme     │  │  Card    │                           │   │
│  │  │   Engine    │  │   Gen    │                           │   │
│  │  └─────────────┘  └──────────┘                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  External:  Claude API  │  Gift Backend  │  RevenueCat           │
└──────────────────────────────────────────────────────────────────┘
```

**Luồng chính một câu:** User mở app → đi qua wildcard ceremony (chọn tay hoặc auto) → nhận passage từ source → đọc, optionally request AI interpretation → save và/hoặc share.

**Những gì hệ thống này KHÔNG làm:**
- Không predict tương lai, không đưa ra lời khuyên — xem triết lý app
- Không sync cloud (v1.0) — tất cả history là local SQLite
- Không có UGC marketplace — xem ADR-AL-3
- Không có Your Mirror UI — xem ADR-AL-6 (data được capture, UI defer đến v2.0)

---

## 2. COMPONENT REGISTRY

| Component | Module | Nhiệm vụ | Input | Output | Stateful? |
|---|---|---|---|---|---|
| **ReadingEngine** | `core/reading.rs` | Orchestrate reading flow: random source, random passage, random symbols | `Ref<ReadingInput>` | `Ref<ReadingSession>` | Không |
| **ThemeEngine** | `core/theme.rs` | Random 3 symbols từ theme, resolve auto-choose | `theme_id`, `method` | `Ref<Symbol>` x3 | Không |
| **Store** | `core/store.rs` | CRUD SQLite: readings, sources, passages, themes, user state | Varies | Varies | Có (SQLite conn) |
| **AIClient** | `core/ai_client.rs` | Gọi Claude API, handle stream, fallback offline | `Ref<AIRequest>` | `AsyncStream<string>` | Không |
| **CardGenerator** | `core/card_gen.rs` | Render SVG → PNG share card | `Ref<ShareCard>` | `bytes` (PNG) | Không |
| **GiftClient** | `core/gift_client.rs` | Create/redeem gift qua Gift Backend | `Ref<GiftRequest>` | `Ref<GiftReading>` | Không |
| **NotificationScheduler** | `core/notif.rs` | Seed daily notification từ matrix, schedule via OS | `user_id`, `date` | `Ref<NotificationEntry>` | Không |

> **Stateful component:** Store giữ SQLite connection pool. Khởi tạo một lần lúc app launch, đóng lúc app terminate.

---

## 3. DATA FLOW

### Happy Path — Reading với AI Interpretation (Online)

```
[1] User tap "Lật lá"
      │ input: source_id? (null = random), situation_text?
      ▼
[2] ReadingEngine.perform_reading()
      │ → nếu source_id null: Store.get_random_source()
      │ → ThemeEngine.get_random_theme()
      │ → ThemeEngine.random_three_symbols(theme_id)
      │ output: Ref<{theme, symbols[3]}>
      ▼
[3] UI: WildcardScreen hiển thị 3 symbols
      │ User chọn 1 (manual) hoặc tap auto
      │ input: symbol_id, SymbolMethod
      ▼
[4] ReadingEngine.choose_symbol()
      │ → Store.get_random_passage(source_id)
      │ output: Ref<{passage, reading_id (temp)}>
      ▼
[5] UI: RitualAnimation (book flip, haptic)
      ▼
[6] UI: PassageDisplayed — user đọc
      │ Timer bắt đầu đo read_duration_s
      ▼
[7] User tap "Diễn giải"
      │ input: reading_id, passage, symbol, situation_text?
      ▼
[8] AIClient.request_interpretation()
      │ → Build prompt (xem AIClient spec)
      │ → POST Claude API với stream=true
      │ output: AsyncStream<string>
      ▼
[9] UI: Stream hiển thị typewriter effect
      │ Kết thúc bằng câu hỏi phản chiếu
      ▼
[10] User tap "Lưu" (hoặc auto-save sau 30s)
      │ input: Ref<Reading> đầy đủ
      ▼
[11] ReadingEngine.complete_reading()
      │ → Store.insert_reading(reading)
      │ → UserState.readings_today += 1
      │ → UserState.ai_calls_today += 1
      │ output: {reading_id, saved_at}
      ▼
[12] Reading saved — user có thể Share hoặc đóng
```

---

### Error Path — AI Timeout / Offline

```
[8] AIClient.request_interpretation() → TIMEOUT sau AI_STREAM_TIMEOUT_MS
      │ hoặc network unavailable
      ▼
[8a] AIClient tự động gọi: ReadingEngine.get_fallback_prompts(source_id)
      │ → Trả 3 static reflection prompts từ Source.fallback_prompts
      │ is_fallback = true
      ▼
[9a] UI: Hiển thị 3 prompts (không phải stream)
      │ Copy header: "Vũ trụ đang im lặng hôm nay. Hãy tự hỏi:"
      │ Không có error message, không có retry button
      ▼
[10] Flow tiếp tục bình thường → complete_reading() với ai_used_fallback = true
```

---

### Edge Case — Daily Limit Reached (Free Tier)

```
[2] ReadingEngine.perform_reading()
      │ Check: UserState.readings_today >= FREE_READINGS_PER_DAY
      ▼
[2a] Return Ref<ERR_DAILY_LIMIT_REACHED>
      │ context: {used: 3, limit: 3, reset_at: midnight_local_timestamp}
      ▼
UI: Soft paywall — không block, không interrupt
    Hiện: "Bạn đã đọc 3 lần hôm nay. Reset lúc [giờ]."
    CTA: "Nâng cấp Pro để đọc không giới hạn" (dismissable)
```

---

### Edge Case — Gift Redemption (First-time User)

```
[1] Recipient tap deep link "aletheia.app/gift/{token}"
      │ App chưa được cài
      ▼
[1a] Branch.io / Firebase Dynamic Links:
      → Redirect App Store / Play Store
      → Sau install: SDK deliver pending deep link
      ▼
[2] App launch lần đầu → detect pending gift token
      ▼
[3] GiftClient.redeem_gift(token)
      │ → POST Gift Backend /redeem
      │ output: Ref<GiftReading> | Error
      ▼
[4] Nếu success:
      │ Hiện: "Bạn nhận được một lần đọc đặc biệt"
      │ buyer_note (nếu có) hiển thị như card intro
      │ Reading bắt đầu với source từ gift (hoặc random)
      │ Lần đọc này KHÔNG trừ vào readings_today
      ▼
[5] Nếu ERR_GIFT_EXPIRED hoặc ERR_GIFT_ALREADY_REDEEMED:
      │ Hiện friendly message, không show error code
      │ Offer: "Bắt đầu đọc miễn phí của bạn"
      │ → Normal onboarding flow
```

---

## 4. STATE MACHINE

```
STATES:
  Idle              — Chưa bắt đầu reading session
  SituationInput    — User đang ở situation screen (skippable)
  SourceSelection   — User đang chọn source (hoặc random)
  WildcardReveal    — 3 symbols đang được animated reveal
  WildcardChosen    — Symbol đã được chọn, passage đang được load
  RitualAnimation   — Book flip animation đang chạy
  PassageDisplayed  — Passage hiển thị, user đang đọc
  AIStreaming       — AI response đang stream
  AIFallback        — Offline mode: hiện static prompts
  Complete          — Reading đã được save, session kết thúc

TRANSITIONS:
  Idle            ──[tap "Lật lá"]──────────────▶ SituationInput
                     guard: none
                     action: reset session state

  SituationInput  ──[tap "Tiếp tục" | "Bỏ qua"]─▶ SourceSelection
                     guard: none
                     action: capture situation_text (null nếu skip)

  SourceSelection ──[source chosen | random]──────▶ WildcardReveal
                     guard: source exists in DB
                     action: load theme, begin symbol animation

  WildcardReveal  ──[user tap symbol]─────────────▶ WildcardChosen
                     guard: symbol ∈ revealed symbols
                     action: record symbol_id, method=Manual

  WildcardReveal  ──[user tap "Để vũ trụ chọn"]──▶ WildcardChosen
                     guard: none
                     action: random symbol, method=Auto, animate 600ms

  WildcardChosen  ──[passage loaded]──────────────▶ RitualAnimation
                     guard: passage != null
                     action: start book flip animation

  RitualAnimation ──[animation complete]───────────▶ PassageDisplayed
                     guard: none
                     action: start read_duration timer, haptic

  PassageDisplayed ─[tap "Diễn giải" + online]────▶ AIStreaming
                     guard: ai_calls_today < limit (tier-dependent)
                     action: build prompt, POST Claude API

  PassageDisplayed ─[tap "Diễn giải" + offline]───▶ AIFallback
                     guard: network unavailable
                     action: load fallback_prompts(source_id)

  AIStreaming     ──[stream complete | timeout]────▶ AIFallback (nếu timeout)
                                                  ▶ PassageDisplayed (nếu complete)
                     action nếu timeout: is_fallback=true, load fallback

  PassageDisplayed ─[tap "Lưu" | 30s auto-save]──▶ Complete
                     guard: none
                     action: complete_reading(), stop timer

  AIFallback      ──[tap "Lưu" | 30s auto-save]──▶ Complete
                     guard: none
                     action: complete_reading() với ai_used_fallback=true

  Complete        — Terminal state, không transition ra

INVARIANTS:
  - Không thể đến PassageDisplayed mà không qua WildcardChosen
  - Complete là terminal — không thể restart session cũ
  - AIStreaming chỉ từ PassageDisplayed — không phải từ AIFallback
  - read_duration timer chỉ chạy ở PassageDisplayed và AIFallback
```

---

## 5. COMPONENT SPECIFICATIONS

---

### ReadingEngine

**File:** `core/reading.rs`
**Dependencies:** `Store`, `ThemeEngine`
**Được gọi bởi:** UI Layer (qua UniFFI)

#### `perform_reading()`

```
SIGNATURE:
  perform_reading(
    source_id: Option<String>,
    situation_text: Option<String>
  ) → Result<ReadingSession, AletheiaError>

PSEUDOCODE:
  1. Check daily limit:
       user_state = Store.get_user_state()
       nếu user_state.subscription_tier == Free
         VÀ user_state.readings_today >= FREE_READINGS_PER_DAY
         → return Err(ERR_DAILY_LIMIT_REACHED)

  2. Resolve source:
       resolved_source_id = source_id ?? Store.get_random_source_id()
       source = Store.get_source(resolved_source_id)
       nếu source == null → return Err(ERR_SOURCE_NOT_FOUND)

  3. Get theme và symbols:
       theme = ThemeEngine.get_random_theme(
         premium_allowed: user_state.tier == Pro
       )
       symbols = ThemeEngine.random_three_symbols(theme.id)
       // đảm bảo 3 symbols không trùng nhau

  4. Return session (chưa saved):
       ReadingSession {
         temp_id: uuid_v4(),
         source,
         theme,
         symbols,  // Vec<Symbol>, length = 3
         situation_text,
         started_at: now_ms()
       }
```

---

#### `choose_symbol()`

```
SIGNATURE:
  choose_symbol(
    session: ReadingSession,
    symbol_id: String,
    method: SymbolMethod
  ) → Result<(Passage, String), AletheiaError>
  //                           ↑ temp reading_id

PSEUDOCODE:
  1. Validate symbol:
       nếu symbol_id ∉ session.symbols.map(|s| s.id)
         → return Err(ERR_SYMBOL_INVALID)

  2. Random passage:
       passage = Store.get_random_passage(session.source.id)
       nếu passage == null → return Err(ERR_PASSAGE_EMPTY)

  3. Return (passage, session.temp_id)
```

---

#### `complete_reading()`

```
SIGNATURE:
  complete_reading(reading: Reading) → Result<CompletedReading, AletheiaError>

PSEUDOCODE:
  1. Validate:
       nếu reading.passage_id empty → return Err(ERR_INVALID_INPUT)
       nếu reading.symbol_chosen empty → return Err(ERR_INVALID_INPUT)

  2. Insert to DB:
       Store.insert_reading(reading)
       // nếu fail → return Err(ERR_STORAGE_WRITE_FAIL)

  3. Update user state:
       Store.increment_readings_today()
       nếu reading.ai_interpreted:
         Store.increment_ai_calls_today()

  4. Return CompletedReading { reading_id: reading.id, saved_at: now_ms() }
```

---

#### `get_fallback_prompts()`

```
SIGNATURE:
  get_fallback_prompts(source_id: String) → Result<Vec<String>, AletheiaError>

PSEUDOCODE:
  1. Lookup source:
       source = Store.get_source(source_id)
       nếu source == null → return Err(ERR_SOURCE_NOT_FOUND)

  2. Return source.fallback_prompts  // Vec<String>, length = 3
     // Bundled trong binary — không cần network
```

---

### ThemeEngine

**File:** `core/theme.rs`
**Dependencies:** `Store`
**Được gọi bởi:** `ReadingEngine`

#### `get_random_theme()`

```
SIGNATURE:
  get_random_theme(premium_allowed: bool) → Theme

PSEUDOCODE:
  1. available_themes = Store.get_themes(
       filter: nếu !premium_allowed thì chỉ lấy is_premium=false
     )
  2. Return available_themes.random()
```

---

#### `random_three_symbols()`

```
SIGNATURE:
  random_three_symbols(theme_id: String) → Vec<Symbol>  // length = 3

PSEUDOCODE:
  1. symbols = Store.get_symbols_for_theme(theme_id)
  2. Return symbols.sample_without_replacement(3)
     // Fisher-Yates shuffle, take first 3
```

---

### AIClient

**File:** `core/ai_client.rs`
**Dependencies:** `reqwest`, `tokio`
**Được gọi bởi:** UI Layer (qua UniFFI)

#### `request_interpretation()`

```
SIGNATURE:
  request_interpretation(
    reading_id: String,
    passage: Passage,
    symbol: Symbol,
    situation_text: Option<String>
  ) → Result<InterpretationStream, AletheiaError>

  InterpretationStream :: {
    stream: AsyncStream<String>,
    is_fallback: bool
  }

PSEUDOCODE:
  1. Check network:
       nếu !is_network_available():
         → return Ok(InterpretationStream {
             stream: stream_from_fallback(passage.source_id),
             is_fallback: true
           })

  2. Check AI daily limit (Free tier):
       user_state = Store.get_user_state()
       nếu tier == Free AND ai_calls_today >= FREE_AI_PER_DAY:
         → return Err(ERR_DAILY_LIMIT_REACHED)

  3. Build prompt:
       user_content = build_ai_prompt(passage, symbol, situation_text)

  4. POST Claude API:
       response = reqwest::post("https://api.anthropic.com/v1/messages")
         .json({
           model: "claude-sonnet-4-20250514",
           max_tokens: 1000,
           stream: true,
           system: SYSTEM_PROMPT,  // xem constant bên dưới
           messages: [{ role: "user", content: user_content }]
         })
         .timeout(AI_STREAM_TIMEOUT_MS)

  5. Nếu timeout hoặc error:
       → return Ok(InterpretationStream {
           stream: stream_from_fallback(passage.source_id),
           is_fallback: true
         })
       // KHÔNG propagate error — fallback là valid state (ADR-AL-8)

  6. Return Ok(InterpretationStream { stream: response.stream(), is_fallback: false })

SYSTEM_PROMPT constant:
  """
  Bạn là người đọc lá bài — không phải tiên tri, không phải chuyên gia tư vấn.
  Bạn chỉ diễn giải những gì đã được lật ra.

  Khi diễn giải:
  - Kết nối nội dung passage với biểu tượng đã được chọn
  - Nếu user có chia sẻ tình huống, gợi mở từ góc nhìn đó — nhưng không phán xét
  - Tone: ấm áp, chiêm nghiệm, đôi khi có một chút dí dỏm nhẹ
  - Độ dài: khoảng 80-120 chữ tiếng Việt

  Tuyệt đối không:
  - Đưa ra lời khuyên cụ thể ("bạn nên...")
  - Khẳng định điều gì về tương lai
  - Phán xét quyết định của user

  Luôn kết thúc bằng một câu hỏi mở in nghiêng để user tự suy nghĩ tiếp.
  Câu hỏi bắt đầu bằng dòng mới, format: *[câu hỏi]*
  """

build_ai_prompt():
  parts = []
  nếu situation_text present:
    parts.push("Tình huống: {situation_text}")
  parts.push("Biểu tượng đã chọn: {symbol.display_name}")
  parts.push("Đoạn trích ({passage.reference}):\n{passage.text}")
  return parts.join("\n\n")
```

---

### CardGenerator

**File:** `core/card_gen.rs`
**Dependencies:** `resvg`, `usvg`
**Được gọi bởi:** UI Layer (qua UniFFI)

#### `generate_share_card()`

```
SIGNATURE:
  generate_share_card(card: ShareCard) → Result<Vec<u8>, AletheiaError>
  // Returns PNG bytes

PSEUDOCODE:
  1. Truncate passage:
       text = nếu card.passage_text.len() > 120:
                card.passage_text[..117] + "..."
              else card.passage_text

  2. Select template ornament:
       ornament = match card.tradition {
         Chinese   → chinese_ornament_svg,
         Christian → cross_minimal_svg,
         Islamic   → arabesque_svg,
         Sufi      → geometric_floral_svg,
         Stoic     → laurel_minimal_svg,
         Universal → star_dots_svg,
       }

  3. Build SVG:
       svg = SVG_TEMPLATE
         .replace("{ornament}", ornament)
         .replace("{symbol_name}", card.symbol.display_name)
         .replace("{passage_text}", text)
         .replace("{reference}", card.reference)
         .replace("{date}", format_date(card.generated_at))
         .replace("{watermark}", nếu card.has_watermark: WATERMARK_SVG else "")

  4. Render:
       tree = usvg::Tree::from_str(&svg, &usvg::Options::default())
       pixmap = tiny_skia::Pixmap::new(1080, 1920)  // 9:16 story format
       resvg::render(&tree, ..., &mut pixmap.as_mut())
       return Ok(pixmap.encode_png())

PERFORMANCE: ≤ 500ms (NFR constraint)
```

---

### NotificationScheduler

**File:** `core/notif.rs`
**Dependencies:** `Store`
**Được gọi bởi:** OS notification trigger (daily)

#### `get_daily_notification()`

```
SIGNATURE:
  get_daily_notification(
    user_id: String,
    date: String  // ISO "2026-03-18"
  ) → NotificationEntry

PSEUDOCODE:
  1. Seed: hash(user_id + date) % NOTIFICATION_MATRIX_SIZE
     // Đảm bảo: cùng user + cùng ngày = cùng notification
     //          khác user cùng ngày = thường khác nhau

  2. matrix = Store.get_notification_matrix()
     // 150 entries bundled trong binary

  3. Return matrix[seed]

  4. Format cho OS: 
     "Vũ trụ hôm nay lật: {entry.symbol.display_name}. {entry.question}?"
```

---

## 6. INTEGRATION POINTS

### Claude API

**Dùng ở:** `AIClient`
**Protocol:** HTTPS REST, Server-Sent Events (streaming)
**Auth:** API Key trong keychain (iOS) / Keystore (Android) — KHÔNG hardcode

```
Retry strategy:
  MAX_RETRIES = 3  // ADR-AL-14: exponential backoff
  TIMEOUT     = AI_STREAM_TIMEOUT_MS (15_000ms)

Fallback khi unavailable:
  → get_fallback_prompts() — xem ADR-AL-8
  KHÔNG throw error ra UI
```

---

### Gift Backend (Cloudflare Workers + KV)

**Dùng ở:** `GiftClient`
**Protocol:** HTTPS REST
**Auth:** Không cần auth cho redeem (token là secret). Create cần user auth token.

```
Endpoints:
  POST /gift/create  → { token, deep_link }
  POST /gift/redeem  → GiftReading | Error

Retry:
  MAX_RETRIES = 2
  BACKOFF     = linear 1000ms
  TIMEOUT     = 5000ms/attempt

Fallback khi unavailable:
  → Hiện friendly error "Không thể kết nối, thử lại sau"
  → KHÔNG fallback sang local — gift cần server verification
```

---

### RevenueCat

**Dùng ở:** UI Layer trực tiếp (SDK)
**Auth:** Public SDK key

```
Entitlement key: "pro"
Cache: RevenueCat SDK tự cache — dùng cached value khi offline
Failure: Nếu SDK unavailable → assume Free tier (safe default)
```

---

## 7. NON-FUNCTIONAL REQUIREMENTS

### Performance

```
perform_reading():
  P50 ≤ 100ms, P99 ≤ 300ms  (local only, no network)

choose_symbol() + passage load:
  P50 ≤ 50ms, P99 ≤ 200ms

generate_share_card():
  P50 ≤ 300ms, P99 ≤ 500ms

AI first token:
  P50 ≤ 2000ms, P99 ≤ 5000ms  (network dependent)
  Timeout hard limit: AI_STREAM_TIMEOUT_MS = 15_000ms

App cold start (to Idle state):
  ≤ 2000ms
```

### Reliability

```
Core reading loop (offline): 100% available
AI interpretation: best-effort, graceful fallback
Gift redemption: 99% (network dependent)
```

### Security

```
Authentication  : Không có user account v1.0 — fully local
API Key storage : iOS Keychain / Android Keystore
                  KHÔNG lưu trong UserDefaults / SharedPreferences
Data at rest    : SQLite không encrypted v1.0
                  Upgrade nếu user request "sensitive data protection"
Data in transit : TLS 1.3 cho mọi external calls
Sensitive fields KHÔNG log: situation_text, ai response content
Gift tokens     : UUID v4, 24h TTL, single-use — không reusable sau redeem
```

### Scalability

```
Current target  : 10,000 DAU
Design ceiling  : 100,000 DAU không cần re-architect
                  (Rust core + SQLite local = không có server bottleneck)
Gift backend scaling trigger:
  > 1,000 gift creates/ngày → review Cloudflare Workers plan
```

---

## 8. SCAFFOLDING & BUILD ORDER

```
PHASE 0 — Foundation (implement trước mọi thứ)
  [0.1] Cargo.toml + workspace setup
        uniffi, rusqlite, reqwest, tokio, resvg, serde
        Vì: mọi thứ phụ thuộc dependency resolution

  [0.2] core/contracts.rs — tất cả structs từ CONTRACTS.md
        Vì: tất cả components cần types này

  [0.3] core/store.rs — SQLite init + migrations
        Migration 001: CREATE TABLE readings (full Mirror schema)
        Migration 002: CREATE TABLE sources, passages, themes, symbols
        Migration 003: CREATE TABLE user_state
        Vì: ReadingEngine, ThemeEngine đều cần Store

  [0.4] Seed data: bundle 6 sources + passages vào binary (FlatBuffers)
        Vì: không có data = không test được reading flow

  Gate: `cargo test` passes, SQLite schema đúng với CONTRACTS.md

PHASE 1 — Core Loop
  [1.1] core/theme.rs — ThemeEngine
        depends: [0.2], [0.3]

  [1.2] core/reading.rs — ReadingEngine (perform + choose + complete)
        depends: [0.2], [0.3], [1.1]

  [1.3] UniFFI bindings — expose Phase 1 functions đến UI
        depends: [1.2]

  [1.4] UI: Reading flow (Idle → Complete, offline only)
        SwiftUI / Compose — Wildcard screen + Ritual animation + Result
        depends: [1.3]

  Gate: End-to-end reading hoạt động offline, đúng state machine Section 4

PHASE 2 — AI + Fallback
  [2.1] core/ai_client.rs — AIClient với fallback
        depends: [0.2], [0.3]

  [2.2] UI: AI streaming screen + fallback prompts display
        depends: [2.1], [1.3]

  Gate: AI call works online, fallback works offline, timeout handled

PHASE 3 — Share + Gift
  [3.1] core/card_gen.rs — CardGenerator (SVG templates + resvg render)
        depends: [0.2]

  [3.2] core/gift_client.rs — GiftClient
        depends: [0.2]

  [3.3] Gift Backend deploy (Cloudflare Workers)
        depends: CONTRACTS.md Section 6

  [3.4] UI: Share sheet + Gift purchase flow + Gift redemption onboarding
        depends: [3.1], [3.2]

  Gate: Share card renders đẹp, gift create/redeem flow E2E hoạt động

PHASE 4 — Monetization + Polish
  [4.1] RevenueCat integration + paywall UI
        depends: [1.4]

  [4.2] core/notif.rs — NotificationScheduler
        depends: [0.2], seed notification matrix

  [4.3] Notification scheduling + OS integration
        depends: [4.2]

  [4.4] Onboarding flow (first launch)
        depends: [1.4], [4.1]

  [4.5] App Store / Play Store assets + metadata
        Keyword: "reflection", "journaling", "daily wisdom"
        KHÔNG dùng: "fortune", "prediction", "divination" — xem ADR-AL-1

  Gate: Full app flow E2E, subscription converts, notification fires đúng giờ
```

**File scaffold đầy đủ:**

```
aletheia/
│
├── Cargo.toml                        ← [0.1]
├── Cargo.lock
│
├── core/                             ← Rust core (UniFFI exported)
│   ├── src/
│   │   ├── lib.rs                    ← UniFFI entry point
│   │   ├── contracts.rs              ← [0.2] All types from CONTRACTS.md
│   │   ├── store.rs                  ← [0.3] SQLite + migrations
│   │   ├── theme.rs                  ← [1.1] ThemeEngine
│   │   ├── reading.rs                ← [1.2] ReadingEngine
│   │   ├── ai_client.rs              ← [2.1] AIClient + fallback
│   │   ├── card_gen.rs               ← [3.1] CardGenerator
│   │   ├── gift_client.rs            ← [3.2] GiftClient
│   │   ├── notif.rs                  ← [4.2] NotificationScheduler
│   │   └── errors.rs                 ← AletheiaError enum (ErrorCode)
│   │
│   ├── data/
│   │   ├── sources/                  ← [0.4] bundled source data
│   │   │   ├── i_ching.fbs
│   │   │   ├── bible_kjv.fbs
│   │   │   ├── tao_te_ching.fbs
│   │   │   ├── hafez.fbs
│   │   │   ├── rumi.fbs
│   │   │   └── meditations.fbs
│   │   ├── themes/
│   │   │   └── default_themes.fbs    ← 5 free themes
│   │   └── notifications/
│   │       └── matrix.fbs            ← 150 entries
│   │
│   └── aletheia.udl                  ← UniFFI interface definition
│
├── ios/                              ← SwiftUI app
│   ├── Aletheia.xcodeproj
│   └── Aletheia/
│       ├── Views/
│       │   ├── HomeView.swift
│       │   ├── SituationView.swift
│       │   ├── SourceView.swift
│       │   ├── WildcardView.swift    ← [1.4] Core ritual screen
│       │   ├── RitualAnimView.swift
│       │   ├── PassageView.swift
│       │   ├── AIStreamView.swift    ← [2.2]
│       │   ├── ShareCardView.swift   ← [3.4]
│       │   └── OnboardingView.swift  ← [4.4]
│       └── Generated/
│           └── aletheia.swift        ← UniFFI generated bindings
│
├── android/                          ← Jetpack Compose app
│   └── app/src/main/
│       ├── kotlin/app/aletheia/
│       │   ├── ui/screens/           ← Mirror của iOS Views
│       │   └── generated/            ← UniFFI generated bindings
│       └── jniLibs/                  ← Rust .so files
│
└── gift-backend/                     ← [3.3] Cloudflare Workers
    ├── src/
    │   └── index.ts
    └── wrangler.toml
```

---

## 8. TECHNICAL IMPLEMENTATION (VHEATM CYCLE #1)

### 8.1 Non-Blocking UniFFI Bridge (ADR-AL-12)
To prevent UI blocking, the Rust core uses `tokio` or `anyio` with UniFFI's `async` support.
```rust
// Rust Core
#[uniffi::export]
pub async fn perform_reading_async(source_id: String) -> Result<Reading, Error> {
    // Long-running async task
    let passage = source_manager.get_passage(source_id).await?;
    let interpretation = ai_client.interpret(passage).await?;
    Ok(Reading::new(passage, interpretation))
}
```
*Mobile UI (Swift/Kotlin) calls this using their native async/await (Task/Coroutine), ensuring the main thread remains free.*

### 8.2 Transactional Migrations (ADR-AL-13)
Migrations are wrapped in a single transaction to ensure atomicity.
```rust
fn run_migrations(conn: &mut Connection) -> Result<(), Error> {
    let current_version: i32 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    
    if current_version < 1 {
        let tx = conn.transaction()?;
        tx.execute("CREATE TABLE readings (...)", [])?;
        tx.execute("PRAGMA user_version = 1", [])?;
        tx.commit()?;
    }
    
    if current_version < 2 {
        let tx = conn.transaction()?;
        tx.execute("ALTER TABLE readings ADD COLUMN symbol_method TEXT", [])?;
        tx.execute("PRAGMA user_version = 2", [])?;
        tx.commit()?;
    }
    Ok(())
}
```

### 8.3 AI Retry with Exponential Backoff (ADR-AL-14)
The `AIClient` implements a robust retry mechanism.
```rust
async fn call_with_backoff<F, Fut, T>(mut f: F) -> Result<T, Error> 
where F: FnMut() -> Fut, Fut: Future<Output = Result<T, Error>> {
    let mut retries = 0;
    let max_retries = 3;
    let mut delay = std::time::Duration::from_millis(500);

    loop {
        match f().await {
            Ok(res) => return Ok(res),
            Err(e) if e.is_rate_limit() && retries < max_retries => {
                retries += 1;
                let jitter = rand::random::<u64>() % 200;
                tokio::time::sleep(delay + std::time::Duration::from_millis(jitter)).await;
                delay *= 2;
            }
            Err(e) => return Err(e),
        }
    }
}
```

---

## 9. MULTI-PROVIDER AI GATEWAY (ADR-AL-15)

### 9.1 Architecture
The `AIGateway` acts as a facade for multiple AI providers.
```rust
// Rust Core - AI Gateway
pub enum AIProvider {
    Claude,
    GPT4,
    Gemini,
}

pub struct AIGateway {
    providers: Vec<AIProvider>,
    current_idx: usize,
}

impl AIGateway {
    pub async fn interpret(&mut self, request: AIRequest) -> Result<String, Error> {
        // 1. Sanitize input (ADR-AL-17)
        let sanitized_input = self.sanitizer.sanitize(request.input)?;
        
        // 2. Try current provider
        for _ in 0..self.providers.len() {
            let provider = &self.providers[self.current_idx];
            match provider.call(sanitized_input.clone()).await {
                Ok(res) => return Ok(res),
                Err(e) if e.is_retryable() => {
                    // 3. Failover to next provider (ADR-AL-15)
                    self.current_idx = (self.current_idx + 1) % self.providers.len();
                }
                Err(e) => return Err(e),
            }
        }
        // 4. Fallback to offline (ADR-AL-8)
        Err(Error::AllProvidersFailed)
    }
}
```

### 9.2 Input Sanitization (ADR-AL-17)
```rust
pub struct InputSanitizer {
    max_chars: usize,
    blocked_keywords: Vec<String>,
}

impl InputSanitizer {
    pub fn sanitize(&self, input: String) -> Result<String, Error> {
        if input.len() > self.max_chars {
            return Ok(input[..self.max_chars].to_string());
        }
        for kw in &self.blocked_keywords {
            if input.to_lowercase().contains(kw) {
                return Err(Error::InvalidInput);
            }
        }
        Ok(input)
    }
}
```

### 9.3 Secure Token Generation (ADR-AL-16)
```rust
// CF Workers - Gift Backend
function generateToken(length = 12) {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < length; i++) {
        token += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return token;
}
```

---

## 9. CYCLE #3 UPDATES — PERFORMANCE & RESOURCE MANAGEMENT

### 9.1 Paginated Data Access (ADR-AL-18)

Mọi component truy xuất dữ liệu từ `Store` (SQLite) phải hỗ trợ pagination khi trả về danh sách lớn:

- **Store.get_readings(limit, offset):** Trả về một phần của history.
- **Store.get_readings_count():** Trả về tổng số readings để UI tính toán số trang.
- **ReadingEngine.get_history_page(page_number):** Orchestrate việc lấy dữ liệu theo trang cho UI.

### 9.2 AI Stream Lifecycle (ADR-AL-19)

Quản lý vòng đời của AI streaming để tránh rò rỉ tài nguyên:

- **AIClient.stream_interpretation(request, cancel_token):** Nhận `CancellationToken` từ UI.
- **DropGuard:** Mọi stream object trong Rust core phải implement `Drop` trait để tự động gửi tín hiệu cancel tới async runtime khi object bị hủy ở phía Mobile UI.
- **UI Integration:** Khi màn hình `PassageDisplayed` bị dispose, UI phải chủ động gọi hàm cancel hoặc drop stream handle.
