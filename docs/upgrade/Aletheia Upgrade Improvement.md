# Aletheia — Upgrade & Improvement Report
### Tổng hợp từ VHEATM Audit Cycle #4 + Market Research + UX Strategy
> **Session date:** 2026-03-29  
> **Scope:** Technical audit + Market intelligence + UX/Product strategy  
> **Triết lý xuyên suốt:** Phần chìm là khoa học tâm lý. Phần nổi là nghệ thuật. Users không nhìn thấy cơ chế — họ chỉ cảm nhận "có lý."

---

## Mục lục

1. [Critical Bugs — Fix Ngay](#1-critical-bugs--fix-ngay)
2. [Architecture Gaps](#2-architecture-gaps)
3. [Security Issues](#3-security-issues)
4. [UX & Ritual Design Upgrades](#4-ux--ritual-design-upgrades)
5. [AI & Soul Design](#5-ai--soul-design)
6. [Bilingual & Global Strategy](#6-bilingual--global-strategy)
7. [Monetization Upgrades](#7-monetization-upgrades)
8. [Data & Analytics Foundation](#8-data--analytics-foundation)
9. [Content Strategy](#9-content-strategy)
10. [Test Coverage](#10-test-coverage)
11. [Market Positioning](#11-market-positioning)
12. [Implementation Roadmap](#12-implementation-roadmap)

---

## 1. Critical Bugs — Fix Ngay

> **Những bugs này là ship blockers.** App có thể demo được nhưng sẽ fail người dùng thật.

---

### BUG-01 — Daily Limit Không Bao Giờ Reset 🔴 P0

**Vấn đề:** `readings_today` và `ai_calls_today` tăng nhưng không bao giờ về 0 khi ngày mới bắt đầu. Sau 3 lần đọc, user bị block vĩnh viễn cho đến khi reinstall app.

**Root cause:** `getUserState()` đọc raw DB value. Không có logic so sánh `last_reading_date` với `today`.

**Fix:**
```typescript
// lib/services/store.ts
async getUserState(userId: string): Promise<UserState> {
  const row = await this.db!.getFirstAsync<any>(
    "SELECT * FROM user_state WHERE user_id = ?", [userId]
  );

  if (!row) { /* create default state */ }

  const today = new Date().toISOString().split("T")[0];
  if (row.last_reading_date !== today) {
    await this.db!.runAsync(
      `UPDATE user_state 
       SET readings_today = 0, ai_calls_today = 0 
       WHERE user_id = ?`, [userId]
    );
    return { ...mapRow(row), readings_today: 0, ai_calls_today: 0 };
  }
  return mapRow(row);
}
```

---

### BUG-02 — AI Luôn Nhận Sai Symbol 🔴 P0

**Vấn đề:** `reading-context.tsx` hardcode `session.symbols[0]` thay vì symbol user đã chọn khi gọi AI. Toàn bộ wildcard ceremony là vô nghĩa với AI layer.

**Root cause:** `selectedSymbolId` được track trong context nhưng không được dùng để resolve symbol object.

**Fix:**
```typescript
// lib/context/reading-context.tsx

// Thêm derived state:
const selectedSymbol = useMemo(
  () => session?.symbols.find(s => s.id === selectedSymbolId) ?? null,
  [session, selectedSymbolId]
);

// Trong requestAIInterpretation():
if (!selectedSymbol) {
  throw createError(ErrorCode.SymbolInvalid, "No symbol selected");
}
const result = await aiClient.requestInterpretation({
  passage,
  symbol: selectedSymbol, // ← đây, không phải symbols[0]
  situationText: session?.situation_text,
});
```

---

### BUG-03 — Rust Migration Không Bao Giờ Bump Version 🔴 P0

**Vấn đề:** `run_migrations()` trong Rust không commit `PRAGMA user_version`. Migrations chạy lại từ đầu mỗi lần app khởi động.

**Fix:**
```rust
// core/src/store.rs
if user_version < 1 {
    tx.execute_batch("CREATE TABLE IF NOT EXISTS readings (...)")?;
    tx.execute_batch("PRAGMA user_version = 1")?; // ← THIẾU CÁI NÀY
}
if user_version < 2 {
    tx.execute_batch("CREATE TABLE IF NOT EXISTS sources (...)")?;
    tx.execute_batch("PRAGMA user_version = 2")?; // ← VÀ CÁI NÀY
}
tx.commit()?;
```

---

### BUG-04 — AI Streaming Bị Tắt 🔴 P0

**Vấn đề:** `stream: false` hardcoded trong Rust AI client. Toàn bộ typewriter effect UX — core identity của app — không bao giờ hoạt động ngay cả khi UniFFI được kết nối.

**Fix:** Enable streaming + implement SSE parsing:
```rust
// core/src/ai_client.rs
let request_body = serde_json::json!({
    "model": CLAUDE_MODEL,
    "max_tokens": 1000,
    "stream": true,  // ← đổi từ false
    "system": SYSTEM_PROMPT,
    "messages": [{ "role": "user", "content": prompt }]
});

// Thêm SSE stream handler với cancel_token check per chunk
```

---

### BUG-05 — UniFFI Bridge Chưa Kết Nối 🔴 P0

**Vấn đề:** Rust core đã được build đầy đủ nhưng TypeScript `ai-client.ts` là 100% stub — mọi request đều đi vào fallback path. App không bao giờ gọi Claude API từ mobile.

**Unblock path:**
1. Generate UniFFI bindings từ `aletheia.udl`
2. Build Rust: iOS `.a`, Android `.so`
3. Link vào Xcode/Gradle
4. Uncomment code trong `lib/services/ai-client.ts`

---

## 2. Architecture Gaps

---

### ARCH-01 — TypeScript Store Không Có Migration Versioning 🔴 High

**Vấn đề:** `store.ts` dùng `CREATE TABLE IF NOT EXISTS` không versioned. Schema changes trong app updates sẽ bị silently ignored với existing users.

**Fix:** Implement `PRAGMA user_version` pattern giống Rust store. Xóa `AsyncStorage` flag trong `db-init.ts` — thay bằng SQL-level versioning.

```typescript
private async runMigrations(): Promise<void> {
  const result = await this.db!.getFirstAsync<{user_version: number}>(
    "PRAGMA user_version"
  );
  const version = result?.user_version ?? 0;

  if (version < 1) {
    await this.db!.execAsync(`
      CREATE TABLE IF NOT EXISTS sources (...);
      CREATE TABLE IF NOT EXISTS passages (...);
      CREATE TABLE IF NOT EXISTS themes (...);
      CREATE TABLE IF NOT EXISTS symbols (...);
      CREATE TABLE IF NOT EXISTS readings (...);
      CREATE TABLE IF NOT EXISTS user_state (...);
      PRAGMA user_version = 1;
    `);
  }
  // Future migrations thêm vào đây
}
```

---

### ARCH-02 — TypeScript Store và Rust Store Diverging 🔴 High

**Vấn đề:** Hai implementation song song với schemas khác nhau. Khi UniFFI được kết nối, conflicts sẽ xuất hiện.

**Decision:** Phải quyết định rõ một trong hai:
- **Option A (recommended):** Rust Store là single source of truth. TypeScript Store là temporary bridge, bị remove khi UniFFI ready.
- **Option B:** TypeScript Store là permanent (nếu bỏ Rust Core). Phải update BLUEPRINT và ADRs.

---

### ARCH-03 — Cancel Token Không Được Dùng 🟠 Medium

**Vấn đề:** `call_claude()`, `call_gpt4()`, `call_gemini()` nhận `cancel_token: Arc<AtomicBool>` nhưng mark là `_cancel_token` (unused). ADR-AL-19 tồn tại nhưng implementation chưa hoàn chỉnh.

**Fix:** Check `cancel_token` trước và sau mỗi network call trong streaming loop.

---

### ARCH-04 — Server Template Pollution 🟡 Low

**Vấn đề:** `server/_core/llm.ts` dùng `forge.manus.im` + Gemini model — Manus platform template leftover, không liên quan đến Aletheia.

**Fix:** Xóa file này. Nếu cần server-side AI, replace bằng Claude-specific implementation.

---

### ARCH-05 — User ID Fallback Nguy Hiểm 🟠 Medium

**Vấn đề:** `getCurrentUserId()` fallback về `"local-user"` nếu không có auth. Trên shared device, readings của nhiều người sẽ bị merge vào cùng một user.

**Fix:**
```typescript
async function getCurrentUserId(): Promise<string> {
  const user = await getUserInfo();
  if (!user?.id) {
    // Device-specific ID, không phải shared string
    const deviceId = await getOrCreateDeviceId(); // SecureStore uuid
    return `device_${deviceId}`;
  }
  return user.id.toString();
}
```

---

### ARCH-06 — Double DB Query trong Theme Loading 🟡 Low

**Vấn đề:** `getRandomTheme()` đã load symbols cho theme, rồi `randomThreeSymbols()` query lại DB lần nữa.

**Fix:** Pass `existingSymbols` từ theme object xuống `randomThreeSymbols()` để tránh redundant query.

---

## 3. Security Issues

---

### SEC-01 — Gift Token Không Crypto-Safe 🔴 High

**Vấn đề:** BLUEPRINT.md Section 9.3 dùng `Math.random()` cho token generation. Không cryptographically secure.

**Fix (Cloudflare Workers):**
```typescript
function generateToken(length = 16): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes); // Web Crypto API — sẵn có trong CF Workers
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(bytes, b => charset[b % charset.length]).join("");
}
```

Token length: tăng từ 12 lên 16 chars → ~95 bits entropy, đủ để prevent brute force.

---

### SEC-02 — User Info Lưu Trong localStorage Trên Web 🟠 Medium

**Vấn đề:** `auth.ts` lưu user info vào `localStorage` trên web platform. localStorage không secure, accessible by any script on page.

**Fix:** Dùng `sessionStorage` hoặc in-memory state cho web platform. Sensitive user data không nên persist qua sessions trên web.

---

## 4. UX & Ritual Design Upgrades

> **Triết lý:** Mọi interaction là ritual. Không có element nào là "chỉ là UI." Phần chìm là tâm lý học — phần nổi là cảm giác.

---

### UX-01 — Onboarding: "Which Mirror Are You?" 🔴 High Impact

**Vấn đề hiện tại:** Generic onboarding, không tạo cảm giác app biết user là ai.

**Upgrade:** Thay welcome screen bằng một lựa chọn entry point duy nhất:

```
"Hôm nay bạn đang cần gì?"

○  Sự rõ ràng           → suggest Stoic / Tao sources
○  Sự an ủi             → suggest Rumi / Sufi sources  
○  Một thách thức       → suggest I Ching
○  Để vũ trụ dẫn lối    → truly random
```

**Tại sao:** Tạo psychological ownership ngay từ đầu. User không được "phân loại" — user tự chọn context của mình. Lần đọc đầu tiên sẽ feel more relevant vì user đã prime bản thân.

**Lưu ý implementation:** Đây không phải permanent setting. Câu hỏi này xuất hiện mỗi lần user bắt đầu một reading mới, không chỉ onboarding — nó thay thế hoặc bổ sung cho situation text screen.

---

### UX-02 — Wildcard Screen: Fog Reveal Mechanic 🔴 High Impact

**Vấn đề hiện tại:** 3 symbols fade in staggered 200ms. Functional nhưng không đủ ritual weight.

**Upgrade — Manual path:**
- 3 cards xuất hiện covered bởi subtle fog/particle effect
- Chỉ khi user drag finger qua card → fog tan dần, symbol lộ ra
- User không chọn bằng mắt mà bằng **cảm giác di chuyển**
- Haptic proximity: càng gần card → pulse intensity tăng (iOS 17+ proximity haptic)
- Khi chọn: single crisp MEDIUM impact. Tất cả cards khác fade instantly.

**Upgrade — Auto path (quan trọng hơn):**
- 3 cards bay ra từ center → 3 góc màn hình
- Sau 600ms, **một card tự bay trở lại center** như bị hút vào
- Cảm giác: **bị chọn**, không phải chọn
- Haptic: LIGHT tap khi card về đến center

**Tại sao:** Auto-choose không được feel như "give up." Nó phải feel như surrender — một act có intention. "Để vũ trụ chọn" phải feel khác hoàn toàn với "tôi không muốn chọn."

---

### UX-03 — Passage Display: Slow Design 🔴 High Impact

**Vấn đề hiện tại:** Passage hiện ra tất cả một lúc. Buttons xuất hiện ngay.

**Upgrade:**
1. Passage typewriter ra từng dòng, pace ~45 chars/giây — đủ chậm để theo kịp
2. Sau khi passage hiện xong: **không có button nào xuất hiện ngay**
3. App chờ **3 giây** (non-skippable — đây là intentional pause)
4. Sau 3 giây: buttons fade in từ dưới lên

**Background:** Very subtle generative particle animation — cực nhỏ, di chuyển random walk, không loop. Mỗi session render khác nhau → không có 2 lần đọc nào trông giống nhau.

**Tại sao:** User research confirm người dùng spiritual apps muốn **built-in processing time**. 3 giây là đủ để não shift từ scanning sang reading. Buttons ẩn trong lúc đó prevent reflex tapping.

---

### UX-04 — Complete Screen: Khoảnh Khắc Im Lặng 🔴 High Impact

**Vấn đề hiện tại:** Sau save → CTA share / đọc thêm xuất hiện ngay.

**Upgrade:** Thêm một beat sau khi reading được save:
- Màn hình fade về black/near-black
- Chỉ hiển thị một dòng nhỏ — có thể là closing symbol, có thể là blank
- Giữ **4-5 giây** trước khi home screen slide vào
- Không có button. Không có interaction. Chỉ là khoảng trống.

**Tại sao:** Đây là cái mà mọi oracle system truyền thống đều có mà apps thường bỏ qua: **thời gian để integrate**. Não cần thời gian để consolidate insight trước khi bị kéo vào activity tiếp theo. Đây cũng là cái tạo ra "afterglow" feeling — cảm giác lắng đọng sau khi đọc.

---

### UX-05 — Situation Text: Reframe Nút Bỏ Qua 🟠 Medium

**Vấn đề hiện tại:** Button "Bỏ qua" — neutral, không có psychological weight.

**Upgrade:** Đổi text button thành:
- `"Tôi chưa biết mình đang nghĩ gì"` (tiếng Việt)
- `"I'm not sure yet"` (tiếng Anh)

**Tại sao:** Vẫn là skip về mặt function. Nhưng framing khác: user thừa nhận trạng thái uncertain thay vì dismiss bước này. Nhỏ nhưng tạo ra micro-moment của self-awareness trước khi vào reading.

---

### UX-06 — Auto-Save 30 Giây (Chưa Implement) 🟠 Medium

**Vấn đề:** BLUEPRINT.md spec auto-save sau 30s nhưng chưa có code.

**Fix:**
```typescript
// lib/context/reading-context.tsx
useEffect(() => {
  if (currentState !== ReadingState.PassageDisplayed) return;

  const timer = setTimeout(async () => {
    await saveReading();
  }, 30_000);

  return () => clearTimeout(timer);
}, [currentState]);
```

---

### UX-07 — Read Duration Tracking Chưa Được Tính 🟠 Medium

**Vấn đề:** `readingStartTime` được track nhưng duration không được tính khi save.

**Fix:**
```typescript
const saveReading = useCallback(async (moodTag?: string) => {
  const durationS = readingStartTime
    ? Math.round((Date.now() - readingStartTime) / 1000)
    : undefined;

  const reading: Reading = {
    ...otherFields,
    read_duration_s: durationS, // ← add này
  };
  await readingEngine.completeReading(reading);
}, [readingStartTime]);
```

---

## 5. AI & Soul Design

> **Core insight:** Aletheia không tạo ra câu trả lời. Nó tạo ra **không gian** để câu trả lời đã có sẵn trong user tự bề mặt ra. AI là catalyst, không phải oracle.

---

### AI-01 — System Prompt: Từ "Diễn Giải" Sang "Mirror" 🔴 Critical

**Vấn đề hiện tại:** System prompt yêu cầu AI "kết nối passage với symbol" — AI đang giải thích. Cơ chế tâm lý thật sự của app cần AI **phản chiếu lại**, không giải thích.

**Nguyên lý:**
- Nếu user viết "tôi đang mắc kẹt với quyết định này" → AI phải dùng lại từ "mắc kẹt"
- Người nghe thấy ngôn ngữ của mình được phản chiếu → cảm giác "nó hiểu mình" tăng đột biến
- Đây là kỹ thuật trong motivational interviewing và person-centered therapy

**System prompt nên thêm:**
```
Khi user cung cấp situation text:
- Mirror lại ngôn ngữ của họ — dùng chính từ họ dùng, không paraphrase
- Đừng giải thích passage — đặt passage vào ngữ cảnh họ đã mô tả
- Mục tiêu: user phải cảm thấy "app đang nói về mình" không phải "app đang giảng cho mình"
```

---

### AI-02 — Closing Question Là Quan Trọng Nhất 🔴 Critical

**Vấn đề:** Closing question hiện tại được design như epilogue của interpretation. Nó cần được design như **trigger chính**.

**Nguyên lý:** User sẽ quên 80% interpretation sau 10 phút. Nhưng một câu hỏi đúng sẽ ám họ cả ngày — và **quá trình nghĩ về câu hỏi đó** là nơi insight thật sự xảy ra, không phải trong app.

**Qualities của closing question tốt:**
- Hỏi về hiện tại, không phải tương lai: "Điều gì bạn đang..." không phải "Bạn sẽ..."
- Hỏi về thứ user chưa được hỏi: "Điều gì bạn đang giả vờ không biết?"
- Không có "đúng/sai" — mở hoàn toàn
- Ngắn — dưới 15 từ

**Upgrade:** Đầu tư nhiều nhất vào phần này của system prompt. Có thể build một library của closing questions được categorize theo tradition và emotion — AI chọn thay vì tự generate.

---

### AI-03 — Ambient Audio Khi Streaming 🟠 Medium

**Vấn đề:** Streaming diễn ra trong im lặng hoàn toàn.

**Upgrade:** Khi AI bắt đầu stream → fade in một subtle ambient texture (không phải music — chỉ là "presence," kiểu warm room tone). Fade out khi stream xong, trước khi closing question xuất hiện.

**Tại sao:** Sound design là layer của ritual mà hầu hết apps bỏ qua. Sound tạo ra sense of presence — cảm giác "có ai đó đang nói chuyện với mình" thay vì đọc text trên màn hình.

---

### AI-04 — Typewriter Chunking: Phrase-Based, Không Phải Char-Based 🟠 Medium

**Vấn đề:** Char-by-char typewriter feel mechanical.

**Upgrade:** Group text thành semantic chunks — phrase-by-phrase. Thêm micro-pause sau dấu phẩy (80ms) và dấu chấm (200ms). Cảm giác: một người đang suy nghĩ và nói, không phải máy in.

---

### AI-05 — `resonance_context` Field Trong Passages 🔴 Long-term Moat

**Concept:** Mỗi passage có thêm một field ẩn — 1-2 câu về **tại sao** passage này được chọn vào source, nó resonates với loại tình huống nào.

**Ví dụ:**
```json
{
  "id": "tao_42",
  "text": "Cỏ cúi đầu trước gió nhưng không bị nhổ.",
  "resonance_context": "Về sự linh hoạt vs cứng nhắc khi đối mặt với thay đổi không kiểm soát được. Relevant khi user đang resist một tình huống thay vì flow với nó."
}
```

Field này **không hiển thị cho user** — chỉ được inject vào AI prompt như context ẩn. AI có thêm ngữ cảnh để interpretation sâu hơn mà không cần user cung cấp situation text.

**Tại sao đây là moat:** Đây là content + AI design kết hợp — không thể copy chỉ bằng cách nhìn vào UI.

---

### AI-06 — Feedback Loop: Read Duration → Content Quality Signal 🔴 Long-term

**Concept:** Passages có average `read_duration_s` cao nhất = passages đang resonate nhất. Track này per source, per tradition, per time-of-day.

**Dùng để:**
- Prioritize content curation — biết passage nào cần thêm
- Refine AI system prompt — extract pattern từ interpretations của high-duration readings
- Không cần survey user — behavior data là signal trung thực nhất

---

## 6. Bilingual & Global Strategy

---

### I18N-01 — Language Follows Passage, Not Device 🔴 High

**Vấn đề hiện tại:** Không có bilingual support.

**Nguyên tắc thiết kế:**
- UI chrome (buttons, labels, navigation) → follow device language
- AI interpretation → follow **passage language**, không follow device
- Lý do: Đọc Meditations bằng tiếng Anh rồi nhận interpretation tiếng Việt = cognitive dissonance. App phải feel internally consistent.

**Implementation:**
```typescript
const interpretationLanguage = passage.language; // "vi" | "en"
// Pass vào AI prompt: "Respond in {interpretationLanguage}"
```

---

### I18N-02 — "Read Original" Feature 🟡 Nice-to-have

**Concept:** Mỗi passage có thể có `original_text` field (tiếng Hán cổ cho I Ching, tiếng Latin cho Meditations, tiếng Ba Tư cho Hafez). User có thể toggle để xem bản gốc bên cạnh bản dịch.

**Tại sao:** Tạo intellectual legitimacy. Users có học thức cao — target demographic của Aletheia — appreciate được tiếp cận nguồn gốc. Differentiates từ apps chỉ có translated content.

---

### I18N-03 — Notification Matrix: Song Ngữ 🟠 Medium

**Vấn đề:** 150-entry notification matrix hiện tại chỉ có tiếng Việt.

**Fix:** Mỗi entry cần `vi` và `en` variants. App chọn theo device language.

---

## 7. Monetization Upgrades

---

### MON-01 — Rename Gift: "Send a Moment" 🔴 High Impact / Low Effort

**Vấn đề hiện tại:** "Gift a Reading" — framing như in-app purchase.

**Upgrade:**
- Rename thành **"Gửi một khoảnh khắc"** (VN) / **"Send a Moment"** (EN)
- Buyer có thể viết một note ngắn (max 100 chars) khi mua
- Recipient flow: First screen là note của người gửi — typography đẹp, fade in trên nền tối — **trước** khi reading bắt đầu
- Copy: *"[Tên người gửi] đã nghĩ đến bạn và muốn bạn có khoảnh khắc này."*

**Tại sao:** Emotional value tăng gấp bội. Đây không còn là IAP — đây là **act of care**. Người nhận có thể share screenshot của note → organic marketing.

---

### MON-02 — Share Card: Video + Hidden QR 🟡 Medium Impact

**Upgrade 1 — Animated card:**
- Thay PNG static bằng MP4 3-4 giây: passage fade in, symbol glow, freeze
- Instagram/TikTok ưu tiên video content trong algorithm
- Target file size: dưới 1.5MB

**Upgrade 2 — Hidden QR:**
- Embed invisible QR code ở corner của share card
- QR dẫn đến deeplink: `aletheia.app/gift/{auto-generated-token}`
- Người thấy card trên social media scan → "Someone shared a reading from Aletheia. Claim yours." → gift redemption flow
- Pro users có QR ẩn (không watermark). Free users có watermark visible.

---

### MON-03 — Paywall Soft, Không Interrupt Ritual 🔴 High (UX Principle)

**Vấn đề:** Cách implement paywall sẽ quyết định retention.

**Nguyên tắc:** Aletheia đã spec đúng — soft paywall, không block ritual. Nhưng timing của paywall xuất hiện cần được design cẩn thận:
- KHÔNG hiện paywall khi user đang trong reading flow
- KHÔNG hiện sau WildcardReveal hay PassageDisplayed
- Hiện sau **Complete screen** — sau khi ritual đã xong, user đang ở trạng thái satisfied
- Copy: Không dùng từ "upgrade" hay "unlock." Dùng: *"Bạn có thể đọc thêm hôm nay với Pro."*

---

## 8. Data & Analytics Foundation

> Capture đủ data ngay từ v1.0 để Your Mirror v2.0 có chiều sâu thật sự.

---

### DATA-01 — Passive Tracking Cần Thêm (Không Add Screen) 🔴 High

Những field nên capture silently, không cần UI thêm:

| Field | Location | Dùng để |
|---|---|---|
| `hour_of_day` | Reading.created_at (derive) | Pattern: "bạn hay đọc lúc nào" |
| `day_of_week` | Derive từ created_at | Habit pattern |
| `session_count` | UserState | Streak, loyalty |
| `time_to_ai_request_s` | Từ PassageDisplayed → tap AI | Engagement depth |
| `notification_opened` | Bool | Notification effectiveness |

---

### DATA-02 — Read Duration Là KPI Quan Trọng Nhất 🔴 High

`read_duration_s` đã được design vào schema nhưng chưa được implement (BUG fix UX-07). Sau khi fix:

- Track per passage ID → identify highest-resonance content
- Track per source → biết source nào users engage sâu nhất
- Track per time_of_day → users đọc sáng vs tối có behavior khác không?

---

## 9. Content Strategy

---

### CONTENT-01 — Seed Data Cần Expand 🔴 Critical

**Vấn đề:** `passage_count` khai báo 64-100 passages per source nhưng seed file thực tế chỉ có ~3-5 passages per source. Repetition xảy ra ngay từ ngày thứ 2-3 → ritual bị phá vỡ.

**Minimum viable content cho launch:**
- 10 passages minimum per source × 6 sources = 60 passages
- Tất cả passages tiếng Việt (trừ Bible KJV tiếng Anh)
- `passage_count` phải được tính tự động từ array length, không hardcode

**Target cho production:**
- 30+ passages per source = 180+ passages
- Đủ đa dạng để không repeat trong 2 tuần daily use

---

### CONTENT-02 — Passage Selection: Có Chủ Đích, Không Phải Random 🟠 Medium

**Nguyên tắc curation:** Không phải mọi câu trong I Ching hay Rumi đều phù hợp. Chọn những passages:
1. Đủ mở để áp dụng cho nhiều tình huống (Barnum principle có chủ đích)
2. Có tension — không resolve ngay, để user phải suy nghĩ
3. Không quá dài (đã có MAX_PASSAGE_CHARS = 500) và không quá ngắn
4. Có resonance đa chiều — có thể interpret theo nhiều góc

---

### CONTENT-03 — Fallback Prompts Tiếng Anh Cho Non-Vietnamese Sources 🟠 Medium

**Vấn đề:** Default fallback khi AI unavailable là `"Take a moment to reflect on this passage."` — tiếng Anh, generic, không có soul.

**Fix:** Mỗi source có 3 fallback prompts trong ngôn ngữ phù hợp:
- I Ching, Tao, Hafez, Rumi → tiếng Việt
- Bible KJV, Marcus Aurelius → tiếng Anh
- Prompts phải match tradition và voice của source

---

## 10. Test Coverage

---

### TEST-01 — Zero Tests Cho Core Flow 🔴 Critical

**Vấn đề:** Chỉ có 1 test file tồn tại (`auth.logout.test.ts`) và bị `.skip`. Không có coverage cho ReadingEngine, Store, AIClient — những thứ quan trọng nhất.

**Minimum test suite cần có trước launch:**

```typescript
// tests/reading-engine.test.ts
describe("ReadingEngine", () => {
  it("blocks reading when daily limit reached");
  it("does NOT block on new day after limit");
  it("resets counter at midnight");
  it("validates symbol belongs to current session");
  it("completes reading and persists to DB");
  it("getFallbackPrompts returns source-specific prompts");
});

// tests/store.test.ts
describe("Store", () => {
  it("runs migrations idempotently");
  it("PRAGMA user_version bumps correctly");
  it("resets daily counters when date changes");
  it("pagination returns correct slice");
  it("getRandomPassage never returns null for seeded source");
});

// tests/ai-client.test.ts
describe("AIClient", () => {
  it("returns Vietnamese fallback when offline");
  it("passes SELECTED symbol, not symbols[0]");
  it("cancels stream when cancel_token is set");
});
```

---

## 11. Market Positioning

---

### POS-01 — Differentiation Rõ Ràng

| Competitor | Their moat | Aletheia's advantage |
|---|---|---|
| Co-Star | Stark UI + social layer | Deeper intellectual sources, no astrology baggage |
| Labyrinthos | Gamified tarot learning | AI interpretations feel personal, not algorithmic |
| Waking Up | Neuroscience credibility | Lower barrier, ritual > lecture |
| The Pattern | "Unsettlingly accurate" | Same effect, built on behavior data not birth chart |
| Headspace | Meditation habit | Active reflection vs passive consumption |

**Positioning statement:** Aletheia là nơi duy nhất bạn có thể đọc Marcus Aurelius, Rumi, và I Ching trong cùng một app — và nhận một câu hỏi khiến bạn suy nghĩ cả ngày. Không bói toán. Không tôn giáo. Chỉ là gương.

---

### POS-02 — App Store Keywords

**Không dùng:** "fortune," "prediction," "divination," "horoscope," "astrology"  
**Dùng:** "reflection," "daily wisdom," "journaling," "mindfulness," "stoic," "philosophy," "I Ching," "Rumi"

**Primary category:** Health & Fitness → Mindfulness  
**Secondary:** Books → Reference

---

### POS-03 — Target Demographic Global

**Primary:** 25-35, educated, "spiritual but not religious," English hoặc Vietnamese  
**Secondary:** 18-25 Gen Z đang explore identity và meaning  
**Geography priority:** Vietnam → Singapore/Malaysia → US West Coast → UK

---

## 12. Implementation Roadmap

### Sprint A — Critical Bugs (1-2 ngày)
- [ ] BUG-01: Fix daily limit reset
- [ ] BUG-02: Fix symbol pass-through to AI
- [ ] BUG-03: Fix Rust migration version bump
- [ ] TEST-01: Viết tests cho 3 bugs trên trước khi fix (TDD)

### Sprint B — Core Experience (3-4 ngày)
- [ ] BUG-04: Enable streaming trong Rust + SSE parsing
- [ ] BUG-05: Unblock UniFFI bridge
- [ ] UX-03: Passage slow reveal + 3s pause
- [ ] UX-06: Auto-save 30s
- [ ] UX-07: Read duration tracking
- [ ] AI-01: Revise system prompt (mirror language)
- [ ] AI-02: Revise closing question design
- [ ] CONTENT-03: Fix Vietnamese fallback prompts

### Sprint C — Security + Architecture (2-3 ngày)
- [ ] SEC-01: Fix gift token crypto
- [ ] ARCH-01: TS Store migration versioning
- [ ] ARCH-02: Document TS/Rust store strategy decision
- [ ] ARCH-04: Remove server template pollution
- [ ] ARCH-05: Fix user ID device isolation

### Sprint D — UX Polish (3-4 ngày)
- [ ] UX-01: Onboarding "Which Mirror Are You?"
- [ ] UX-02: Wildcard fog reveal mechanic
- [ ] UX-04: Complete screen silence beat
- [ ] UX-05: Reframe situation text skip button
- [ ] MON-01: Gift rename "Send a Moment" + buyer note
- [ ] I18N-01: Language follows passage

### Sprint E — Content + Data (ongoing)
- [ ] CONTENT-01: Expand seed passages to 60+ minimum
- [ ] CONTENT-02: Add `resonance_context` field to passages
- [ ] DATA-01: Add passive tracking fields
- [ ] AI-05: Inject `resonance_context` vào AI prompt
- [ ] I18N-03: Song ngữ notification matrix

### Sprint F — Growth Features (pre-launch)
- [ ] MON-02: Animated share card
- [ ] MON-02: Hidden QR in share card
- [ ] AI-06: Read duration feedback loop
- [ ] TEST-01: Full test coverage cho core services

---

## Tóm Tắt Một Trang

**3 bugs kill ngay nếu ship với user thật:**
1. Daily limit không reset → users bị block vĩnh viễn
2. AI nhận sai symbol → ceremony vô nghĩa
3. AI streaming tắt → typewriter effect không hoạt động

**1 insight quan trọng nhất về product:**
App không tạo ra câu trả lời. Nó tạo ra **không gian** để câu trả lời đã có sẵn trong user tự bề mặt ra. Mọi quyết định UX — 3s pause, silence beat, slow reveal — phục vụ cho cơ chế tâm lý này. Technology là delivery mechanism. Psychology là sản phẩm thật.

**1 competitive moat thật sự:**
`resonance_context` + AI feedback loop từ `read_duration_s`. Đây là thứ không thể copy chỉ bằng cách nhìn vào UI.

**1 growth lever bị underutilized:**
Gift reading được rename thành "Send a Moment" với buyer note. Emotional framing biến IAP thành act of care — và note của người gửi là organic content mà recipient muốn share.

---

*"Phần chìm là khoa học. Phần nổi là nghệ thuật. Users không nhìn thấy cơ chế — họ chỉ cảm nhận 'có lý.'"*

---
> Report này tổng hợp từ: VHEATM Audit Cycle #4 (2026-03-29) + Market research (Co-Star, Labyrinthos, Waking Up, The Pattern) + UX/Psychology analysis session.
