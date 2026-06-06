
# 3. P1 — Rủi ro cao nhưng có thể xử lý sau P0

## P1-1 — Dual SQLite architecture cần consistency protocol

CONTRACTS hợp thức hóa hai database: Rust SQLite qua AletheiaCore và TypeScript SQLite trong `store.ts`, với `hide_situation` là TS-store-only.  Pattern này hợp lý cho UI-only data, nhưng thiếu protocol.

**Nguy cơ:** delete reading ở Rust nhưng TS-store còn flag; export/delete privacy không đầy đủ; migration lệch; backup policy lệch.

**Fix:** thêm `DualStoreConsistency` section:

```text
- primary key: reading_id
- TS-store rows are dependent records
- on delete reading: cascade delete TS-store flags
- on export/delete-all: both stores included
- migration versions tracked separately
- repair job on startup removes orphan TS rows
```

## P1-2 — Notification privacy chưa đủ

Notification content local-only là tốt. Nhưng lock screen có thể hiển thị title/body. Expo Notifications hỗ trợ schedule local notifications, nhưng notification behavior phụ thuộc foreground/background/terminated và Android force-stop cần user mở lại app. ([Expo Documentation][8])

**Nguy cơ:** notification “gợi mở” có thể vô tình reveal trạng thái tinh thần hoặc thói quen cá nhân trên lock screen.

**Fix:** thêm setting:

```text
NotificationPrivacy ::
  | full_text
  | discreet
  | off

discreet:
  title = "AletheiA"
  body  = "Một khoảng lặng đang chờ bạn."
```

## P1-3 — `user_id = "local-user"` làm deterministic notification giống nhau cho mọi người

CONTRACTS default `user_id="local-user"`, còn notification deterministic từ `hash(user_id + date)`. Nếu user_id không được random hóa per install, mọi người sẽ nhận cùng message cùng ngày. 

**Fix:** tạo `local_user_id` UUID random on first launch:

```text
user_id = "local-" + uuidv4()
```

Hoặc giữ display default nhưng có `notification_seed`.

## P1-4 — Notification matrix size 20 quá nhỏ

`NOTIFICATION_MATRIX_SIZE = 20` nghĩa là nội dung lặp lại nhiều trong năm. Với app “cognitive sanctuary”, repetition dễ tạo cảm giác nghèo nội dung. 

**Fix:** tăng lên 180–365 entries hoặc generate deterministic theo `symbol_id + seasonal prompt + source`.

## P1-5 — Search history client-side trên loaded data gây sai kỳ vọng

BLUEPRINT nói History search filter client-side trên loaded readings, pagination 20 items/page.  Nếu user có 500 readings, search chỉ tìm trong page đã load.

**Fix:** đưa search xuống SQLite:

```text
search_readings(query, filter, sort, limit, offset)
```

Hoặc UI phải ghi “searching loaded items only”, nhưng sản phẩm premium không nên chọn cách này.

## P1-6 — SourceSelection state có nhưng flow/spec chưa khớp

State machine có `SourceSelection`, nhưng happy path `SituationScreen → ReadingEngine.startReading → perform_reading` đã chọn source trước khi Wildcard. Component spec cũng không mô tả SourceSelectionScreen riêng. 

**Fix:** chốt một trong hai:

```text
Mode A:
Situation → SourceSelection → perform_reading(source_id)

Mode B:
Situation → perform_reading(source_id=null) → Wildcard
```

Nếu SourceSelection là optional detour, cần document route params rõ.

## P1-7 — `AI_STREAM_TIMEOUT_MS = 15s` đang nhập nhằng

CONTRACTS định timeout hard 15s cho AI streaming. BLUEPRINT có first chunk target cloud <2s, local <3s; AIStreamingScreen timeout 15s.  

**Vấn đề:** local model có thể mất >15s trên máy yếu; sentence-paced reveal 600ms/sentence có thể làm end-to-end lâu hơn; timeout nên là idle timeout hay full request timeout?

**Fix:**

```text
AI_FIRST_TOKEN_TIMEOUT_MS = 8_000
AI_PROVIDER_IDLE_TIMEOUT_MS = 15_000
AI_PROVIDER_TOTAL_TIMEOUT_MS = 60_000
AI_REVEAL_PACING_MS = 600
```

## P1-8 — LocalModelStatus `Unsupported` không nên permanent tuyệt đối

BLUEPRINT ghi `Unsupported — no transition`. Nhưng available RAM/storage có thể thay đổi sau reboot/đóng app; OS update cũng có thể thay đổi capability. 

**Fix:**

```text
Unsupported --[recheck_device_capability]--> NotDownloaded | Unsupported
```

## P1-9 — Model download UX thiếu storage/network/battery policy

Model ~1–2GB cần:

```text
- Wi‑Fi only default
- metered network warning
- available disk >= size * 1.3
- temp partial file + atomic rename
- resume support
- checksum during/after download
- cancellation cleanup
- low battery warning
```

Hiện docs chỉ có download/cancel/status, chưa đủ cho mobile reality. 

## P1-10 — Qwen thinking mode contract chưa chắc đúng với artifact local

ADR nói thinking-mode toggle qua `/think`, strip `<think>` block; CONTRACTS set `LOCAL_MODEL_THINKING_ENABLED = true`.   Nhưng trang Hugging Face chính thức của `Qwen/Qwen3.5-2B` nói Qwen3.5-2B chạy **non-thinking mode by default** và thinking phải enable theo examples; tài liệu Qwen3.5 từ SGLang lại mô tả thinking default cho Qwen3.5 nói chung. ([Hugging Face][9])

**Fix:** không dựa vào assumption `/think`/`<think>` nếu chưa test chính artifact `.litertlm`.

Cần golden tests:

```text
- prompt without thinking → no reasoning leakage
- prompt with thinking → reasoning stripped
- Vietnamese prompt → Vietnamese answer
- empty/truncated reasoning → fallback
- harmful output → blocked before reveal
```

## P1-11 — Safety pipeline chưa đủ mạnh cho streaming

ADR nói local inference collect full token stream, strip `<think>`, postprocess. BLUEPRINT nói cloud stream reveal sentence-by-sentence.   Nếu cloud chunks được reveal trước khi output safety scan, harmful content có thể hiện ra.

**Fix:** buffer theo sentence, scan từng sentence trước khi reveal:

```text
provider chunk → sentence buffer → safety scan → reveal
```

Và safety scan phải chạy cho cả:

```text
local output
cloud output
fallback prompt
share card text
notification text
```

## P1-12 — Crisis detection keyword-only dễ miss

BLUEPRINT có `crisis-guard.ts` scan `situation_text`, show modal, pause reading flow.  Đây là tốt, nhưng keyword-only sẽ miss slang, typo, code-mixed Vietnamese/English, và context gián tiếp.

**Fix:** xây lexicon đa ngôn ngữ + test set + severity levels:

```text
CrisisSignal ::
  | self_harm_ideation
  | immediate_danger
  | abuse
  | medical_emergency
  | grief_non_immediate
```

Không nên chỉ “pause” nếu immediate danger; cần stronger UX copy và local emergency resources theo quốc gia nếu có location/locale.

## P1-13 — Sentry có thể mâu thuẫn với “không third-party tracking”

BLUEPRINT nói không track behavior tới third-party, nhưng Phase 5 có Sentry error reporting. Observability nói report bridge errors, JS exceptions, AI failures, không include `situation_text`, `passage.text`, `buyer_note`. 

Sentry là third-party trừ khi self-host. Không phải vấn đề nếu minh bạch, nhưng cần clarify.

**Fix:**

```text
ErrorReportingMode ::
  | disabled
  | privacy_scrubbed_third_party
  | self_hosted

Default: privacy_scrubbed_third_party with explicit privacy disclosure
```

Và bắt buộc scrub raw provider errors vì provider error có thể echo prompt.

## P1-14 — Gift token security/spec còn mỏng

Gift API là server-side exception của local-first. CONTRACTS có token, buyer_note, source_id, TTL 24h, redeemed boolean; BLUEPRINT có tRPC create/redeem và auth.  

Thiếu:

```text
- token entropy/length
- store token hash, not raw token
- atomic redeem transaction
- rate limit redeem attempts
- buyer_note max length/safety
- buyer_note encryption or warning
- token not logged in analytics/Sentry
- deep link token handling on cold start
```

**Fix:** add `GiftSecurityContract`.

## P1-15 — API key storage/API provider architecture chưa rõ

CONTRACTS có `set_ai_api_key(provider, key)` lưu `sk-ant-...` vào Rust-managed secure storage.  Cần chốt đây là **user BYOK** hay app key.

Nếu app key nằm trong client: rủi ro extract key cực cao. Nếu BYOK: UX cần explain. Nếu server proxy: mâu thuẫn privacy vì server có thể thấy prompt, trừ khi proxy stateless + no logs.

**Khuyến nghị:**

```text
Free/Pro cloud AI:
  server proxy with strict no-log + redaction + regional policy
or
BYOK advanced mode:
  user provides Anthropic key, stored in OS keystore
```

Không nên ship provider secret trong app.

## P1-16 — Content licensing/provenance chưa được spec

Sources gồm Bible KJV, Hafez, Rumi, Marcus, Tao Te Ching. Bản gốc cổ thường public domain, nhưng **translation/edition** có thể có copyright. Project Gutenberg tập trung vào tác phẩm cũ hết hạn copyright ở Mỹ, nhưng Rumi/Hafez translations hiện đại có thể bị copyright. ([Project Gutenberg][10]) KJV và Tao Te Ching có bản Project Gutenberg, nhưng cần chốt edition/translation cụ thể. ([Project Gutenberg][11])

**Fix:** thêm schema:

```text
SourceLicense {
  source_id          :: string
  work_title         :: string
  translator         :: string?
  edition            :: string?
  publication_year   :: u16?
  license            :: "public_domain" | "cc0" | "cc_by" | "licensed" | "unknown"
  license_url        :: string?
  jurisdiction_notes :: string?
  attribution_text   :: string?
}
```

Release gate: không source nào `license="unknown"`.

## P1-17 — Subscription/purchase flow chưa có contract

CONTRACTS có prices, tiers; BLUEPRINT có paywall/purchases phase. Nhưng không có provider, receipt validation, restore purchases, platform entitlement, grace period, refund/revoke.  

**Fix:** add purchase/entitlement schema trước khi implement paywall:

```text
PurchaseProvider ::
  | app_store
  | play_billing
  | stripe_web? // nếu allowed

SubscriptionReceipt {
  platform
  product_id
  transaction_id_hash
  purchase_at
  expires_at
  verified_at
  status
}
```

## P1-18 — Local date reset dễ bị đổi ngày bypass

BLUEPRINT nói delete + reinstall reset daily limit là bypass by design. Nhưng `set_local_date(today)` tin device date cũng cho phép user đổi ngày để reset. 

Nếu quota chỉ là gentle friction, chấp nhận. Nếu quota là revenue boundary, cần server-verified entitlement/quota cho cloud AI. Với local-first, cách cân bằng:

```text
Reading quota: local soft limit, bypass accepted
Cloud AI quota: server-side hard limit
Local AI quota: unlimited or local soft limit
```

## P1-19 — Legacy `request_interpretation` còn public dễ bị dùng nhầm

CONTRACTS đánh dấu legacy sync blocking nhưng vẫn tồn tại trong UDL/contracts. 

**Fix:** nếu chưa thể remove, thêm deprecation hard gate:

```text
request_interpretation(...)
  FAIL: DeprecatedOperation
```

Hoặc không expose qua generated TS.

---

# 4. P2 — Debt, polish, scalability

## P2-1 — `FREE_HISTORY_DAYS` resolved nhưng dead code

Violation registry nói constants đã sync 90 ngày nhưng cả hai constants dead code.  Cần chốt ý nghĩa:

```text
- retention deletion?
- UI visibility limit?
- export includes older?
- Pro unlocks older history?
```

Không nên để “history days” là business promise mà không enforce.

## P2-2 — `MAX_PASSAGE_CHARS = 500` có thể bóp méo content

Một số passage/poem/translation có thể >500 chars. Nếu hard limit dùng khi seed content, text bị reject/truncate. Nên phân biệt:

```text
MAX_PASSAGE_DISPLAY_CHARS
MAX_PASSAGE_STORAGE_CHARS
MAX_AI_CONTEXT_CHARS
```

## P2-3 — `passage_count` dễ drift với bundled JSON

`Source.passage_count` có thể lệch với số rows thực tế. Nên derive hoặc seed validation:

```text
assert source.passage_count == count(passages where source_id)
```

## P2-4 — `ArchiveSort.depth` có thể reward oversharing

Depth score cộng điểm cho `situation_text`, mood, read duration, favorite, shared.  Đây là UI heuristic hay, nhưng có thể vô tình “đánh giá cao” readings chứa nhiều private info. Không nguy hiểm, nhưng nên local-only và không analytics.

## P2-5 — Accessibility coverage còn partial

ADR nói a11y mới cover `mirror.tsx` và `PressableCard`, còn `wildcard.tsx`, `passage.tsx`, paywall chưa có labels.  Vì reading flow là core UX, a11y phải cover:

```text
Situation
Wildcard
Ritual skip/reduced motion
Passage
AIStreaming
Paywall
Gift
Settings privacy
```

## P2-6 — `archetypeMap` hardcoded cần refactor sớm

ADR đã ghi hardcoded archetype map là pattern-debt và nên tách Archetype khỏi Symbol.  Nên sửa trước khi thêm pack mới:

```text
Symbol {
  id
  display_name
  archetype_id
}

ArchetypeAsset {
  id
  image_uri
  motion_profile
  color_tokens
}
```

## P2-7 — Testing debt đã biết cần đưa vào release gate

ADR có 2 pattern-debt test: native module unmocked, stale mock API name.  Đừng để “known debt” nằm trong ADR mà không có owner/date.

---

# 5. Các mâu thuẫn/điểm mù nội bộ đáng sửa ngay

| ID       | Vấn đề                                                        |                     Tác động | Fix                                        |
| -------- | ------------------------------------------------------------- | ---------------------------: | ------------------------------------------ |
| SPEC-001 | `readings_today < FREE_AI_PER_DAY`                            |                 Sai quota AI | Dùng `ai_calls_today`                      |
| SPEC-002 | `start_interpretation_stream` precondition mâu thuẫn fallback | Offline fallback có thể fail | Cho fallback là mode chính thức            |
| SPEC-003 | `Reading` thiếu AI text                                       | Không persist interpretation | Thêm `Interpretation` table                |
| SPEC-004 | `null` vs `undefined` mâu thuẫn                               |                  Bridge bugs | Chuẩn hóa boundary null/internal undefined |
| SPEC-005 | `get_sources(premium_allowed)` tin UI                         |               Premium bypass | Core tự check entitlement                  |
| SPEC-006 | `complete_reading` nhận full Reading từ UI                    |  Data integrity/quota bypass | Core-owned session completion              |
| SPEC-007 | Local model filename/size hardcoded                           |      Download/readiness fail | Signed manifest                            |
| SPEC-008 | Cloud fallback silent                                         |               Privacy breach | Ask before cloud                           |
| SPEC-009 | Dual SQLite không có cascade/repair                           |          Orphan privacy data | Consistency protocol                       |
| SPEC-010 | Sentry vs no third-party tracking                             |        Trust/legal ambiguity | Privacy-scrubbed mode + disclosure         |
| SPEC-011 | SourceSelection state chưa khớp flow                          |     Implementation confusion | Chốt route/flow                            |
| SPEC-012 | `request_interpretation` legacy còn public                    |      Blocking call dùng nhầm | Remove/deprecate hard                      |

---

# 6. Cơ hội nâng cấp dự án đến “cực hạn”

## 6.1. Biến local AI thành “Private Intelligence Layer”

Đừng chỉ coi local model là fallback cloud. Hãy coi nó là feature chính:

```text
Private Mode:
  - AI luôn local
  - không gửi situation_text ra ngoài
  - badge rõ “On-device”
  - local model health dashboard
  - local prompt memory, không cloud
```

Sau đó cloud chỉ là “High clarity mode” hoặc “Pro cloud mode”, yêu cầu consent riêng.

## 6.2. Tạo “Trust Dashboard”

Một screen trong Settings:

```text
What stays on this device:
  - reading history
  - situation text
  - mood tags
  - local AI outputs

What may leave device:
  - cloud AI prompt, only after consent
  - gift token/note, only in Gift flow
  - crash logs, scrubbed, optional

Controls:
  - export encrypted archive
  - delete all readings
  - disable cloud AI
  - discreet notifications
  - exclude from backup status
```

Đây là cách biến compliance thành UX moat.

## 6.3. Xây eval harness cho AI như product asset

Tạo bộ test cố định:

```text
50 Vietnamese reflective prompts
20 English prompts
20 crisis/safety prompts
20 harmful-output prompts
20 source-citation fidelity prompts
20 low-context prompts
10 malformed/empty prompts
```

Metric:

```text
- latency
- language consistency
- no hallucinated religious authority
- no crisis mishandling
- no leaked <think>
- answer tone
- output length
- fallback quality
```

Kết quả dùng để chọn Qwen quantization, prompt version, Claude fallback.

## 6.4. Mở rộng content bằng “licensed wisdom packs”

AletheiA có thể bán/gift content packs nếu licensing sạch:

```text
- Stoic Pack
- Taoist Pack
- Poetry Pack
- Grief Companion Pack
- Decision Clarity Pack
- Vietnamese Wisdom Pack
```

Nhưng phải có `SourceLicense` trước.

## 6.5. Tách Symbol/Archetype/Source để mở rộng vô hạn

Hiện Symbol đang vừa là ritual card, vừa là image mapping, vừa là passage selector. Nên tách:

```text
Symbol = semantic identifier
Archetype = visual/psychological family
SourceMapping = symbol/source → passage selection rule
Asset = image/motion/audio
```

Lúc đó có thể thêm 500 symbols mà không cần 500 ảnh ngay.

## 6.6. iOS roadmap nên cập nhật

ADR nói iOS local inference deferred vì LiteRT-LM iOS chưa stable. Hiện Google docs ghi LiteRT-LM có cross-platform support và Swift API ở Early Preview; Kotlin stable, Swift early preview. ([Google AI for Developers][2]) Vì vậy nên đổi wording từ “iOS deferred vì chưa stable” sang:

```text
iOS local inference:
  status: DEFERRED
  reason: Swift API Early Preview; release after Android proof
  review trigger: Swift API reaches stable OR app requires iOS parity
```

## 6.7. Product loop: “Reflection Memory” local-only

Vì `Reading` có mood, intent, duration, favorite, shared, situation, source, symbol, có thể tạo local-only insight:

```text
- recurring themes
- “you often seek clarity at night”
- weekly local summary
- favorite source/archetype
- gentle reminders
```

Nhưng tuyệt đối không đưa lên server. Đây là killer feature nếu làm đúng.

---

# 7. ADR mới nên tạo ngay

Mình đề xuất tạo 10 ADR mới, theo thứ tự:

1. **ADR-AL-006 — Data Protection & Backup Policy**
   Encryption, key storage, Android/iOS backup exclusion, export/delete.

2. **ADR-AL-007 — AI Privacy Mode & Cloud Consent**
   Local-only, ask-before-cloud, allow-cloud-fallback.

3. **ADR-AL-008 — Local Model Manifest, Integrity & Download Lifecycle**
   Signed manifest, checksum, resume, atomic rename, Wi‑Fi/storage/battery policy.

4. **ADR-AL-009 — Interpretation Persistence & Prompt Versioning**
   `Interpretation` table, prompt_version, provider metadata, safety status.

5. **ADR-AL-010 — Entitlements & Purchase Validation**
   App Store/Play Billing, local grace, restore, server validation.

6. **ADR-AL-011 — Core-Owned Reading Session Lifecycle**
   Frontend stops sending full `Reading`; core owns session and complete.

7. **ADR-AL-012 — Dual SQLite Consistency Protocol**
   TS-store-only fields, cascade, repair, export/delete.

8. **ADR-AL-013 — Gift Token Security**
   Token entropy, hash-at-rest, rate limits, atomic redeem, sensitive note policy.

9. **ADR-AL-014 — Content Provenance & Licensing**
   Source license, translator, attribution, jurisdiction notes.

10. **ADR-AL-015 — Native Threading & Bridge Execution Contract**
    Which operations are sync/async/background, UI-freeze tests.

---

# 8. Patch gợi ý cho CONTRACTS.md

## 8.1. QuotaState

```text
QuotaState {
  user_id                 :: string
  local_date              :: string
  readings_today          :: u8
  cloud_ai_calls_today    :: u8
  local_ai_calls_today    :: u16
  free_cloud_ai_limit     :: u8
  free_reading_limit      :: u8
  reset_at_local_midnight :: i64
}
```

## 8.2. Interpretation

```text
Interpretation {
  id              :: string
  reading_id      :: string
  created_at      :: i64
  mode            :: Ref<InferenceMode>
  provider        :: string?
  model_id        :: string?
  model_version   :: string?
  prompt_version  :: string
  text            :: string
  used_fallback   :: boolean
  safety_status   :: string
  safety_reasons  :: List<string>
  latency_ms      :: u32?
}
```

## 8.3. AI consent

```text
AiPrivacyMode ::
  | LocalOnly
  | AskBeforeCloud
  | AllowCloudFallback

AiConsent {
  user_id              :: string
  privacy_mode         :: Ref<AiPrivacyMode>
  cloud_disclosure_seen_at :: i64?
  allow_situation_text_cloud :: boolean
}
```

## 8.4. Local model manifest

```text
LocalModelManifest {
  model_id        :: string
  version         :: string
  filename        :: string
  size_bytes      :: u64
  sha256          :: string
  signature       :: string
  quantization    :: string
  min_ram_mb      :: u32
  min_cpu_cores   :: u32
  min_app_version :: string
}
```

## 8.5. Entitlement

```text
Entitlement {
  user_id             :: string
  tier                :: Ref<SubscriptionTier>
  source              :: string
  verified_at         :: i64
  expires_at          :: i64?
  offline_grace_until :: i64?
  receipt_hash        :: string?
}
```

---

# 9. Release-readiness checklist nên thêm

Trước beta/release, `scripts/release-readiness-report.ts` nên fail nếu:

```text
[ ] CONTRACTS/UDL/contracts.rs/lib/types.ts drift
[ ] Local model manifest missing/invalid signature
[ ] Model file checksum not verified after download
[ ] AI quota uses readings_today anywhere
[ ] Cloud fallback can happen without consent
[ ] Reading DB not covered by backup/encryption policy
[ ] Sentry/log scrubber tests missing
[ ] Gift token stored raw
[ ] get_sources accepts premium_allowed boolean
[ ] complete_reading accepts full untrusted Reading without validation
[ ] Interpretation text has no persistence contract
[ ] Content sources have unknown license
[ ] Critical screens missing a11y labels
[ ] Search only covers loaded history without UI disclosure
[ ] Legacy request_interpretation still exposed
```


---

## Verdict cuối

AletheiA không bị yếu ở ý tưởng. Ngược lại, ý tưởng và tone sản phẩm khá mạnh. Điểm yếu là **spec hiện mới mô tả “hệ thống nên làm gì”, chưa đủ ràng buộc “hệ thống không được phép làm sai gì”**.

Cần chuyển từ:

```text
privacy-first by philosophy
```

sang:

```text
privacy-first by enforceable contracts + tests + release gates
```

Ba đòn nâng cấp có ROI cao nhất:

1. **AI Privacy Mode + no silent cloud fallback**
   Đây là trust moat.

2. **Signed model manifest + artifact integrity**
   Đây là điều kiện sống còn cho local AI.

3. **Core-owned session/quota/entitlement**
   Đây là nền cho business model không bị bypass.


