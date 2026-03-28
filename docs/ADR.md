# ADR.md — Architecture Decision Records
### Aletheia · v1.0

> **Mục đích file này:** Ghi lại *tại sao* hệ thống được thiết kế như vậy.
> Không phải *cái gì* (CONTRACTS.md) hay *như thế nào* (BLUEPRINT.md) — mà là *tại sao*.
>
> Mọi ADR trong file này là output đã verified của 2 VHEATM 5.0 cycles.
> "No patch without proof — and no proof is free."

---

## Mục lục

| ADR | Title | Status |
|---|---|---|
| [ADR-AL-1](#adr-al-1--offline-first-core-loop) | Offline-first Core Loop | ✅ ACCEPTED |
| [ADR-AL-2](#adr-al-2--wildcard-screen-mandatory-hai-paths) | Wildcard Screen — Mandatory, Hai Paths | ✅ ACCEPTED |
| [ADR-AL-3](#adr-al-3--cut-ugc-marketplace-khỏi-v10) | Cut UGC Marketplace khỏi v1.0 | ✅ ACCEPTED |
| [ADR-AL-4](#adr-al-4--share-card-là-p0-design-investment) | Share Card là P0 Design Investment | ✅ ACCEPTED |
| [ADR-AL-5](#adr-al-5--situation-input-luôn-optional-và-skippable) | Situation Input — Luôn Optional | ✅ ACCEPTED |
| [ADR-AL-6](#adr-al-6--your-mirror-ui-defer-data-model-ngay-từ-v10) | Your Mirror UI Defer — Data Model v1.0 | ✅ ACCEPTED |
| [ADR-AL-7](#adr-al-7--push-notification-1ngày-static-formula) | Push Notification — 1/ngày, Static Formula | ✅ ACCEPTED |
| [ADR-AL-8](#adr-al-8--ai-offline-fallback--static-reflection-prompts) | AI Offline Fallback — Static Reflection Prompts | ✅ ACCEPTED |
| [ADR-AL-9](#adr-al-9--gift-reading--deferred-deep-link--minimal-backend) | Gift Reading — Deferred Deep Link | ✅ ACCEPTED |
| [ADR-AL-10](#adr-al-10--notification-formula--static-symbol--tension-matrix) | Notification Formula — Static Matrix | ✅ ACCEPTED |
| [ADR-AL-11](#adr-al-11--readings-schema-phải-include-full-mirror-data-từ-v10) | Readings Schema — Full Mirror Data từ v1.0 | ✅ ACCEPTED |

---

## ADR-AL-1 — Offline-first Core Loop

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🔴 MANDATORY
**Tags:** `architecture` `offline` `core-loop` `ai`

### Context

App ritual cần hoạt động ổn định trong mọi điều kiện mạng. User ở vùng internet yếu, hoặc đang trong trạng thái tĩnh lặng muốn đọc sách — không thể để AI call là blocker. Hơn nữa, nếu AI là mandatory, Free tier gần như không có giá trị thật vì bị rate limit nghiêm ngặt.

**Constraints:**
- Claude API có thể timeout, rate limit, hoặc down
- Ritual feeling bị phá vỡ nếu user thấy error screen giữa chừng
- Free tier phải có giá trị thật để build habit trước khi convert Pro

**Requirements:**
- App phải deliver meaningful experience không cần network
- AI failure không được manifest thành error state trong UI

### Options Considered

#### Option A: Offline-first, AI là optional layer ← **CHOSEN**

```
Core loop: Source → Wildcard → Passage → Đọc (0 network calls)
AI layer: User chủ động tap "Diễn giải" → AI call (nếu có mạng)
Fallback: Nếu AI fail → static reflection prompts (xem ADR-AL-8)
```

| Pros | Cons |
|---|---|
| 100% reliable core experience | AI interpretation bị "hidden" behind tap |
| Free tier có giá trị thật | Một số user có thể không discover AI feature |
| Ritual không bị gián đoạn bởi network | |

#### Option B: AI là required step trong core loop

```
Core loop: Source → Wildcard → Passage → AI interpret → Đọc
```

| Pros | Cons |
|---|---|
| AI value luôn visible | Single point of failure |
| | Free tier gần như broken khi hết quota |
| | Latency inject vào ritual flow |

**Loại vì:** Blast radius quá cao. Một API failure = broken experience cho mọi user.

#### Option C: Cache AI responses

**Loại vì:** Passages × symbols × contexts = không thể pre-cache hết. Storage cost không justified.

### Decision

> **Chọn Option A vì:** Offline-first là non-negotiable cho ritual apps. AI là enhancement — không bao giờ là gatekeeper. Verified bởi VHEATM Cycle #1 E1 và E3.

### Consequences

**Tích cực:**
- App hoạt động hoàn toàn trên airplane mode
- Free tier deliver genuine value (3 readings/ngày không cần internet)
- Ritual flow không bao giờ có "loading" blocker

**Trade-offs chấp nhận được:**
- AI feature ít visible hơn — mitigate bằng onboarding highlight và subtle CTA sau reading

**Rủi ro:**
- User có thể không biết AI feature tồn tại — trigger review nếu AI usage rate < 20% sau launch

**Xem thêm:** BLUEPRINT.md Section 3 (Data Flow — Error Path), ADR-AL-8

---

## ADR-AL-2 — Wildcard Screen Mandatory, Hai Paths

**Status:** ✅ ACCEPTED *(Supersedes draft v1 từ Cycle #1)*
**Date:** 2026-03-18
**VHEATM Level:** 🔴 MANDATORY
**Tags:** `ux` `core-loop` `wildcard` `ritual` `conversion`

### Context

Cycle #1 đề xuất wildcard là opt-in vì lo ngại friction. Cycle #2 revised dựa trên product conviction từ kinh nghiệm thực tế của founder:

> *"Users chọn auto? Không sao. Nhưng users chọn lật card — đó mới là nhóm có khả năng tạo chuyển đổi cao nhất."*

Wildcard screen không phải friction — nó **là** the ritual moment. Hai paths (manual và auto) đều là valid ritual acts, nhưng có ceremony khác nhau và deliver engagement signal khác nhau.

**Constraints:**
- 100% user phải đi qua wildcard ceremony — không có bypass path
- Auto-choose không được feel như "give up" hay "thoát"
- Manual choosers = highest conversion signal, phải được capture

### Options Considered

#### Option A: Wildcard bắt buộc với 2 paths ngang nhau ← **CHOSEN**

```
WildcardScreen:
  Path A (Manual):
    3 symbols fade in staggered (200ms each)
    User hover → glow + scale
    User tap → haptic MEDIUM + "lock in" animation
    Copy: "Bạn đã chọn: [Symbol]"
    
  Path B (Auto):
    3 symbols fade in (same)
    User tap "Để vũ trụ chọn"
    → symbols swirl 600ms → one settles
    → haptic LIGHT
    Copy: "Vũ trụ đã chọn: [Symbol]"
```

| Pros | Cons |
|---|---|
| 100% user đi qua ceremony | Thêm ~2-8s vào flow |
| Manual choice = explicit engagement signal | |
| Auto = "surrender" act, vẫn meaningful | |
| symbol_method capturable cho Mirror | |

#### Option B: Wildcard opt-in (Cycle #1 draft)

**Loại vì:** Bypass path = mất ceremony = mất ritual identity của app. Không justify trade-off.

#### Option C: Wildcard bắt buộc, chỉ 1 path (random only)

**Loại vì:** Mất đi cơ hội cho user express intention. Manual choice là differentiator.

### Decision

> **Chọn Option A vì:** Wildcard screen là core ritual identity của Aletheia. Hai paths preserve ceremony với dignity ngang nhau nhưng deliver signal khác nhau. Verified bởi VHEATM Cycle #2 E1.

### Consequences

**Tích cực:**
- 100% readings có wildcard data → Mirror data đầy đủ từ ngày đầu
- Manual choosers identifiable → future personalization
- Ritual feeling được enforce ở architecture level

**Trade-offs chấp nhận được:**
- +2-8s vào flow — chấp nhận vì đây là **intended** slow-down (ritual, không phải task)

**Rủi ro:**
- Drop-off tại wildcard screen — trigger review nếu completion rate < 85%

**Xem thêm:** CONTRACTS.md `SymbolMethod`, BLUEPRINT.md Section 4 (State Machine)

---

## ADR-AL-3 — Cut UGC Marketplace khỏi v1.0

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🔴 MANDATORY
**Tags:** `business-model` `marketplace` `cold-start` `v1`

### Context

UGC Marketplace (user tạo theme, bán cho nhau, app lấy %) là revenue stream hấp dẫn về dài hạn. Tuy nhiên marketplace cần critical mass ở cả hai phía (creator và buyer) để có giá trị — cold start problem cổ điển.

### Options Considered

#### Option A: Cut hoàn toàn, thay bằng curator packs ← **CHOSEN**

```
Thay thế: Team tự tạo theme packs chất lượng cao
Bán: IAP $1.99/pack
Không có creator economy, không có marketplace infrastructure
```

| Pros | Cons |
|---|---|
| Zero cold start risk | Giới hạn content diversity |
| Revenue đơn giản hơn (IAP) | Mất creator community flywheel |
| Focus engineering vào core | |

#### Option B: Launch marketplace từ v1.0

| Pros | Cons |
|---|---|
| Flywheel potential | Cold start: cần creator trước user, user trước creator |
| | Engineering cost cao (moderation, payment split, creator tools) |
| | Empty marketplace = negative impression |

**Loại vì:** VHEATM Cycle #1 E4 simulation: cần ~100 active users để có 1-2 creator tự nhiên, cần ~50 quality themes để marketplace có giá trị cho buyer. Timeline: nhiều tháng post-launch. Build trước = wasted engineering + distraction.

### Decision

> **Chọn Option A vì:** Cold start problem unsolvable trước khi có user base đủ lớn. Curator packs deliver content value ngay lập tức với zero infrastructure cost.

### Consequences

**Tích cực:**
- Engineering focus vào core experience thay vì marketplace plumbing
- Content quality đảm bảo (team-curated)
- Revenue đơn giản: IAP standard

**Trade-offs chấp nhận được:**
- Mất creator economy — revisit sau khi DAU > 10,000

**Rủi ro:**
- Content stagnation nếu không release curator packs đều đặn — mitigate bằng quarterly pack releases

---

## ADR-AL-4 — Share Card là P0 Design Investment

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🟠 REQUIRED
**Tags:** `growth` `social` `share-card` `acquisition`

### Context

Market research: 37% spiritual app users chia sẻ kết quả lên mạng xã hội. Share card là acquisition channel chính — zero cost nếu design đủ mạnh. Nếu card cần caption để giải thích thì thất bại.

**Requirement:** Card phải self-explanatory. Viewer nhìn lần đầu phải hiểu đây là gì, muốn thử.

### Options Considered

#### Option A: Share card là P0 — thiết kế như ad creative ← **CHOSEN**

```
Card elements:
  - "✦ ALETHEIA ✦" header
  - Symbol icon + tradition ornament (thay đổi theo Tradition)
  - Passage snippet ≤ 120 chars
  - Source reference
  - Tagline: "Not a fortune. A mirror."
  - "aletheia.app" + date
  - Watermark nếu Free tier
  
Render: Rust (resvg SVG → PNG) — offline capable
```

#### Option B: Share card là afterthought — v1.x feature

**Loại vì:** Viral loop cần activation từ ngày đầu. Acquisition channel đắt nhất là paid ads. Nếu organic share work, đây là unfair advantage không nên để sau.

### Decision

> **Chọn Option A vì:** Share card = organic acquisition engine. ROI asymmetric: đầu tư design 1 lần, compound theo mỗi share. Verified bởi VHEATM Cycle #1 E5.

### Consequences

**Tích cực:**
- Mỗi share = free impression với warm context
- Watermark on Free tier = gentle upgrade nudge

**Trade-offs chấp nhận được:**
- Cần design effort upfront — justified bởi acquisition value

**Xem thêm:** CONTRACTS.md `ShareCard`, BLUEPRINT.md Section 5 — CardGenerator

---

## ADR-AL-5 — Situation Input Luôn Optional và Skippable

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🟠 REQUIRED
**Tags:** `ux` `onboarding` `friction`

### Context

Situation input cải thiện AI interpretation quality nhưng tạo friction tại điểm đầu tiên của reading flow. User mới chưa biết app hoạt động như thế nào sẽ không biết phải nhập gì.

### Decision

> Situation input screen luôn skippable trong 1 tap. Visual weight của [Bỏ qua] = [Tiếp tục]. Placeholder text gợi mở nhưng không pressure.

### Consequences

**Tích cực:**
- Casual user vào thẳng reading, không bị stuck
- Power user vẫn có thể nhập để improve AI quality

**Xem thêm:** BLUEPRINT.md Section 5 — Reading Flow

---

## ADR-AL-6 — Your Mirror UI Defer, Data Model Ngay từ v1.0

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🟡 RECOMMENDED
**Tags:** `data-model` `future-proof` `mirror` `v2`

### Context

"Your Mirror" (pattern tracking sau 30+ readings) là v2.0 feature. Tuy nhiên data cần để build Mirror phải được capture từ reading đầu tiên — backfill sau launch là impossible.

### Decision

> Build full Mirror schema trong readings table từ init migration v1.0 (xem CONTRACTS.md `Reading`). Không build Mirror UI, không build Mirror logic. Chỉ capture data passively với zero UX friction.

### Consequences

**Tích cực:**
- v2.0 Mirror có data đầy đủ từ user đầu tiên
- Schema migration v1→v2: không cần ALTER TABLE phức tạp

**Trade-offs chấp nhận được:**
- +4 nullable columns trong readings table — cost gần zero

**Xem thêm:** CONTRACTS.md `Reading`, `MoodTag`, `SymbolMethod`

---

## ADR-AL-7 — Push Notification 1/ngày, Static Formula

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🟡 RECOMMENDED
**Tags:** `notification` `retention` `viral`

### Context

Co-Star case study: 1 notification/day với copy đủ sharp = screenshot-worthy → organic viral. Nhiều hơn 1/ngày = churn. AI-generated notifications = inconsistent quality + API cost.

### Decision

> 1 notification/ngày, giờ do user set. Formula cố định: *"Vũ trụ hôm nay lật: [Symbol]. [Tension question]?"*
> Content: static matrix 150 entries, bundled trong binary, seeded by date+user_id.

### Consequences

**Tích cực:**
- Consistent tone, zero API cost
- 150 entries = không lặp trong 5 tháng
- Screenshot-worthy format = organic viral

**Xem thêm:** CONTRACTS.md `NotificationEntry`, BLUEPRINT.md Section 5 — NotificationScheduler

---

## ADR-AL-8 — AI Offline Fallback: Static Reflection Prompts

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🔴 MANDATORY
**Tags:** `offline` `ai` `fallback` `resilience`

### Context

Nếu AI call fail (timeout, network, rate limit), user đang giữa ritual không được thấy error screen. Cần fallback có giá trị thật, không phải error state.

### Options Considered

#### Option A: Static reflection prompts per source ← **CHOSEN**

```
Mỗi source có 3 câu reflection tĩnh, bundled trong binary.
Khi AI unavailable → hiện 3 prompts thay vì AI stream.
Copy: "Vũ trụ đang im lặng hôm nay. Hãy tự hỏi: ..."
```

| Pros | Cons |
|---|---|
| Zero maintenance, zero runtime cost | Không personalized như AI |
| Always available | 3 prompts per source = ít |
| Ritual continuity preserved | |

#### Option B: Pre-written interpretation library

**Loại vì:** Passages × symbols × contexts = không thể cover hết. Maintenance quá cao.

#### Option C: Show error "Không có mạng"

**Loại vì:** Phá vỡ ritual. Unacceptable UX.

### Decision

> **Chọn Option A vì:** 6 sources × 3 prompts = 18 strings — một buổi chiều viết xong, zero maintenance. Offline experience cần được designed intentionally, không phải error state. Verified bởi VHEATM Cycle #2 E2.

### Consequences

**Tích cực:**
- AI failure invisible với user — chỉ thấy "offline mode"
- App fully functional trên airplane mode

**Xem thêm:** CONTRACTS.md `Source.fallback_prompts`, `get_fallback_prompts()`

---

## ADR-AL-9 — Gift Reading: Deferred Deep Link + Minimal Backend

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🟠 REQUIRED
**Tags:** `gift` `viral` `backend` `acquisition`

### Context

Gift Reading tạo warm acquisition: người nhận đến với context "ai đó quan tâm đủ để tặng" → emotional connection từ session đầu tiên → retention cao hơn organic. Cần minimal backend để store gift state và deferred deep link để handle recipient chưa có app.

### Decision

> Backend: Cloudflare Workers + KV. Chỉ 2 endpoints: create_gift() và redeem_gift(). Gift token có TTL 24h. Deferred deep link qua Branch.io hoặc Firebase Dynamic Links. Rust core xử lý mọi logic còn lại.

### Consequences

**Tích cực:**
- Warm acquisition channel với zero ad spend
- Serverless backend = near-zero cost khi traffic thấp

**Trade-offs chấp nhận được:**
- Cần minimal backend (first external dependency) — justified bởi acquisition value

**Xem thêm:** CONTRACTS.md `GiftReading`, `redeem_gift()`

---

## ADR-AL-10 — Notification Formula: Static Symbol × Tension Matrix

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🟠 REQUIRED
**Tags:** `notification` `copy` `viral`

### Context

Test 3 notification archetypes trong VHEATM Cycle #2 E4. Type C wins trên shareability, distinctiveness, và lock screen readability.

### Decision

> Formula: *"Vũ trụ hôm nay lật: [Symbol]. [Tension question]?"*
> Matrix: 30 symbols × 5 questions = 150 entries. Bundled, zero API dependency.
> Selection: seeded random by date string + user_id → consistent per user per day, khác nhau giữa users.

### Consequences

**Tích cực:**
- Distinctly Aletheia — không nhầm với app khác
- Screenshot-worthy → organic share
- Consistent quality (team-written, không phụ thuộc AI)

**Xem thêm:** CONTRACTS.md `NotificationEntry`, `NOTIFICATION_MATRIX_SIZE`

---

## ADR-AL-11 — Readings Schema Phải Include Full Mirror Data từ v1.0

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🔴 MANDATORY
**Tags:** `data-model` `schema` `sqlite` `mirror`

### Context

Your Mirror v2.0 cần: symbol_method (manual vs auto), mood_tag, read_duration_s, ai_interpreted, shared. Nếu không capture từ đầu, backfill impossible — old readings sẽ thiếu data vĩnh viễn.

### Decision

> Init migration v1.0 phải include tất cả Mirror columns trong readings table. Tất cả nullable — không có UX friction. Cost: 4 extra nullable columns ≈ zero storage overhead.

### Consequences

**Tích cực:**
- Mirror v2.0 có đủ data từ reading đầu tiên của user đầu tiên
- Không cần breaking migration khi launch v2.0

**Xem thêm:** CONTRACTS.md `Reading`, ADR-AL-6

---

## ADR-AL-12 — UniFFI Async Bridge Non-Blocking

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🔴 MANDATORY
**Tags:** `architecture` `uniffi` `async` `performance`

### Context
Async Rust functions called from mobile UI via UniFFI can block the UI thread if the bridge uses `run_until_complete` on the main thread. This leads to UI freezes and ANR.

### Decision
All async Rust functions must be exported using UniFFI's async support or explicitly dispatched to a background thread. The UI thread must never wait synchronously for a Rust future.

### Consequences
- **Positive:** Smooth UI during AI streaming and heavy computations.
- **Risk:** Increased complexity in Swift/Kotlin callback handling.

---

## ADR-AL-13 — Transactional SQLite Migrations

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🔴 MANDATORY
**Tags:** `persistence` `sqlite` `migrations` `reliability`

### Context
Partial migration failures can leave the database in an inconsistent state, causing the app to crash on every subsequent launch.

### Decision
Wrap all migration steps in a single SQLite transaction. Use `PRAGMA user_version` to track the current schema version and only commit if all steps succeed.

### Consequences
- **Positive:** Atomic migrations, zero inconsistent states.
- **Trade-off:** Slightly more complex migration logic in Rust.

---

## ADR-AL-14 — AI Retry Exponential Backoff

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🟠 REQUIRED
**Tags:** `ai` `resilience` `finops`

### Context
Claude API rate limits (429) can trigger infinite retry loops if not handled with limits and backoff, leading to resource exhaustion.

### Decision
Implement exponential backoff with jitter. Max retries capped at 3. After 3 failures, trigger the offline fallback (ADR-AL-8).

### Consequences
- **Positive:** Battery and token efficiency.
- **Trade-off:** Longer wait time before fallback in case of persistent 429s.

---

## ADR-AL-15 — Multi-Provider AI Gateway

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🔴 MANDATORY
**Tags:** `architecture` `ai` `resilience` `multi-provider`

### Context
Dependency on a single AI provider (Claude) creates a single point of failure. Outages or rate limits break the core value proposition.

### Decision
Implement a Multi-Provider AI Gateway in Rust Core. Support Claude, GPT-4, and Gemini with automatic failover. The gateway normalizes different provider schemas into a unified internal format.

### Consequences
- **Positive:** High availability, no vendor lock-in.
- **Trade-off:** Increased complexity in handling multiple API keys and SDKs.

---

## ADR-AL-16 — Secure Token Generation (Base62-12)

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🟠 REQUIRED
**Tags:** `security` `gifting` `token`

### Context
Short gift tokens (length 6) have a higher collision risk as the user base grows, potentially leading to data corruption or unauthorized access.

### Decision
Increase gift token length to 12 characters using Base62 encoding. This provides a significantly larger namespace (62^12) while remaining short enough for deep links.

### Consequences
- **Positive:** Negligible collision risk at scale.
- **Trade-off:** Slightly longer URLs for sharing.

---

## ADR-AL-17 — Input Sanitization & Token Budgeting

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🔴 MANDATORY
**Tags:** `security` `ai` `finops`

### Context
Malicious or excessive user input in `situation_text` can lead to prompt injection attacks or excessive token costs.

### Decision
Implement strict input sanitization (keyword blocking) and a hard character limit (500 chars) for all user-provided text before sending to AI providers.

### Consequences
- **Positive:** Protection against injection, predictable token costs.
- **Trade-off:** Some legitimate long inputs may be truncated.

---

## ADR-AL-18 — Remote Config for Content Refresh

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🟡 RECOMMENDED
**Tags:** `retention` `content` `remote-config`

### Context
Static Notification Matrix bundled in the binary leads to content decay and reduced user engagement over time.

### Decision
Implement a minimal Remote Config endpoint to periodically update the Notification Matrix without requiring an app update.

### Consequences
- **Positive:** Dynamic content, higher long-term retention.
- **Trade-off:** Requires a simple backend endpoint for content delivery.

---

## ADR-AL-18 — Paginated History

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🔴 MANDATORY
**Tags:** `performance` `uniffi` `history` `pagination`

### Context

Khi số lượng readings trong history tăng lên (ví dụ >1000), việc serialize toàn bộ list từ Rust sang Mobile UI qua UniFFI boundary gây ra hiện tượng UI stuttering. Serialization time vượt quá frame budget 16ms (cho 60fps), làm giảm trải nghiệm ritual mượt mà của app.

### Decision

> **Chọn: Bắt buộc dùng Pagination cho mọi data-heavy queries.**
> Mọi hàm lấy list dữ liệu lớn từ Rust core phải hỗ trợ `limit` và `offset`.

### Evidence

Simulation H-01 xác nhận việc serialize 5000 items mất ~25ms, gây lag UI rõ rệt.

### Pattern

```rust
fn get_readings(limit: u32, offset: u32) -> List<Reading>;
fn get_readings_count() -> u32;
```

---

## ADR-AL-19 — AI Stream Cancellation

**Status:** ✅ ACCEPTED
**Date:** 2026-03-18
**VHEATM Level:** 🔴 MANDATORY
**Tags:** `resource-management` `ai` `streaming` `battery`

### Context

Nếu user thoát khỏi màn hình reading trong khi AI đang stream diễn giải, connection vẫn tiếp tục chạy ngầm trong Rust core. Điều này gây lãng phí tài nguyên network, pin điện thoại và API quota (Claude tokens).

### Decision

> **Chọn: Implement Explicit Cancellation cho AI Streams.**
> Mọi async stream phải được wrap trong `DropGuard` hoặc sử dụng `CancellationToken` được trigger bởi UI lifecycle.

### Evidence

Simulation H-03 xác nhận stream vẫn tiếp tục tiêu thụ tài nguyên sau khi UI đã gửi tín hiệu hủy nếu không có cơ chế dừng chủ động.

### Pattern

```rust
let cancel_token = CancellationToken::new();
let stream = ai_client.stream_interpretation(cancel_token.clone());
// Khi UI dispose: cancel_token.cancel();
```
