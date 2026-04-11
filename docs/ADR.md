# ADR.md — Architecture Decision Records
### Aletheia · v1.0

> **Mục đích file này:** Ghi lại *tại sao* hệ thống được thiết kế như vậy.
> Không phải *cái gì* (CONTRACTS.md) hay *như thế nào* (BLUEPRINT.md) — mà là *tại sao*.
>
> Mọi ADR trong file này là output đã verified của 6 VHEATM 5.0 cycles.
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
| [ADR-AL-27](#adr-al-27--android-prebuild-phải-fail-fast-khi-thiếu-rust-artifacts) | Android Prebuild Fail-Fast on Missing Rust Artifacts | ✅ ACCEPTED |
| [ADR-AL-28](#adr-al-28--beta-ci-chỉ-gate-android--web) | Beta CI chỉ gate Android + Web | ✅ ACCEPTED |
| [ADR-AL-29](#adr-al-29--mọi-user_state-mutation-trên-app-phải-đi-qua-corestore) | User State mutations go through `coreStore` | ✅ ACCEPTED |
| [ADR-AL-30](#adr-al-30--gỡ-drizzlemysql-khỏi-release-surface) | Remove Drizzle/MySQL from active release surface | ✅ ACCEPTED |
| [ADR-AL-31](#adr-al-31--không-được-gọi-nativeclienthay-runtime-switch-trực-tiếp-từ-ui) | No direct native/runtime branching above adapters | ✅ ACCEPTED |
| [ADR-AL-32](#adr-al-32--android-bundled-content-không-thể-owned-bởi-ts) | Android bundled content cannot be TS-owned | ✅ ACCEPTED |
| [ADR-AL-33](#adr-al-33--user_intent-phải-trở-thành-core-owned-state) | `user_intent` must become core-owned state | ✅ ACCEPTED |
| [ADR-AL-34](#adr-al-34--schema-registry-phải-trở-lại-một-nguồn-duy-nhất) | Schema registry must become singular again | ✅ ACCEPTED |
| [ADR-AL-35](#adr-al-35--uniffi-phải-expose-đủ-read-model-cho-android-ui) | UniFFI must expose Android read models fully | ✅ ACCEPTED |
| [ADR-AL-36](#adr-al-36--android-bundled-content-phải-chuyển-sang-rust-owned-artifact) | Android bundled content must move to a Rust-owned artifact | ✅ ACCEPTED |
| [ADR-AL-37](#adr-al-37--archive-detail-ui-không-được-import-bundled-content-trực-tiếp) | Archive/detail UI must not import bundled content directly | ✅ ACCEPTED |
| [ADR-AL-38](#adr-al-38--archive-write-parity-phải-được-giải-quyết-bằng-bridge-contract-không-phải-ui-workaround) | Archive write parity must be solved in the bridge contract | ✅ ACCEPTED |
| [ADR-AL-39](#adr-al-39--verification-phải-chia-thành-fast-medium-release-tiers) | Verification must be tiered into fast/medium/release | ✅ ACCEPTED |
| [ADR-AL-40](#adr-al-40--ritualarchive-sharegift-phải-có-event-taxonomy-chung) | Ritual, archive, share, and gift flows must share one event taxonomy | ✅ ACCEPTED |
| [ADR-AL-41](#adr-al-41--archive-phải-là-retention--growth-surface-không-phải-list-tĩnh) | Archive must be a retention and growth surface | ✅ ACCEPTED |
| [ADR-AL-45](#adr-al-45--ai-diễn-giải-phải-local-first-cloud-optional) | AI interpretation must be local-first, cloud-optional | ✅ ACCEPTED |

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

## ADR-AL-45 — AI diễn giải phải local-first, cloud-optional

**Status:** ✅ ACCEPTED  
**Date:** 2026-04-11  
**VHEATM Level:** 🔴 MANDATORY  
**Tags:** `ai` `local-first` `mobile` `cloud` `android` `ios`

### Context

Hiện tại nút "Xin diễn giải" là optional layer đúng theo ADR-AL-1, nhưng runtime thật vẫn chưa có đường model sống ổn định:

- Android path hiện đi qua Rust `AIClient` và các provider HTTP trực tiếp.
- iOS chưa có native parity thực, vẫn ngoài beta scope.
- Client-accessible provider key path đã bị gỡ khỏi release surface, nên không thể tiếp tục dựa vào mô hình "app cầm API key rồi gọi model".
- Model Google đang pin trong repo là `gemini-2.0-flash`, line này đã drift khỏi current recommended model surface.

Trong khi đó, mục tiêu sản phẩm mới là:

- mặc định phải có **local model nhỏ** cho "Xin diễn giải"
- cloud chỉ là **tùy chọn** khi cần chất lượng cao hơn
- architecture mới không được phá vỡ hardening boundary vừa khóa quanh secret/provider access

### Options Considered

#### Option A: Giữ cloud-first, chỉ thêm local fallback

| Pros | Cons |
|---|---|
| Dễ triển khai ngắn hạn | Trái product requirement local-first |
| Tận dụng Rust provider client hiện có | Vẫn cần server/key plumbing để chạy model thật |
| | Network vẫn là happy path, local chỉ là safety net |

**Loại vì:** thứ tự ưu tiên sai. Đây chỉ là biến thể của kiến trúc cũ.

#### Option B: Local-first trong native module, cloud optional qua server proxy ← **CHOSEN**

```
UI
  └─ InterpretationOrchestrator
       ├─ Local provider (default)
       │    └─ Native inference runtime + downloaded model asset
       ├─ Cloud provider (optional quality mode)
       │    └─ Server proxy giữ provider secrets
       └─ Static fallback prompts
```

| Pros | Cons |
|---|---|
| Đúng product requirement local-first | Cần thêm native inference surface mới |
| Không trả provider key xuống client | Android/iOS integration effort cao hơn thay model name đơn thuần |
| Giữ được offline ritual value | Model download + storage management phải làm nghiêm túc |
| Cho phép quality tier cloud rõ ràng | |

#### Option C: Dùng open model qua Rust core / UniFFI như một provider nữa

| Pros | Cons |
|---|---|
| Giữ một orchestration layer trong Rust | Kéo inference runtime nặng vào Rust core hiện tại |
| Ít đổi TS facade hơn | Sai toolchain cho mobile on-device GenAI hiện nay |
| | Tăng rủi ro build, binary size, and bridge complexity |

**Loại vì:** Rust core hiện hợp với domain logic và network provider client hơn là làm host cho mobile on-device inference stack.

### Decision

> **Chọn Option B.** "Xin diễn giải" phải mặc định đi local-first. Cloud là một lane chất lượng cao hơn, không phải lane duy nhất.

### Model Decision

#### Local default
- **Gemma 3n E2B** là first choice cho Android local inference.

**Lý do:**
- Google positioning rõ ràng là mobile-first/on-device.
- Footprint động phù hợp hơn các line lớn hơn như Gemma 4.
- Chất lượng đủ để viết đoạn phản chiếu ngắn nếu prompt và output contract được giữ chặt.

#### Local future optimization
- **Gemma 3 270M** chỉ nên xem là phase sau, sau khi có eval set + specialization cho đúng tác vụ reflection ngắn.

#### Cloud quality lane
- **`gpt-4.1-mini`** hoặc **`gemini-2.5-flash`** là quality tier hợp lý.
- Không chọn cloud `nano` làm mặc định cho tác vụ này vì prose quality và instruction fidelity là trọng tâm.

### Mandatory Patterns

1. **No provider secret on client.** Mọi cloud request phải đi qua server proxy hoặc signed capability flow.
2. **Local is the default happy path** khi thiết bị đủ capability và model đã sẵn sàng.
3. **Inference runtime lives in native adapter layer, not in Rust core.**
4. **Model binaries are downloaded and versioned at runtime, not bundled into APK/IPA.**
5. **Fallback prompts remain the terminal safety layer** nếu cả local và cloud đều fail.

### Consequences

**Tích cực:**
- "Xin diễn giải" có thể hoạt động thật cả khi offline hoặc mạng yếu.
- Product posture nhất quán với triết lý ritual/offline-first.
- Cloud quality path vẫn tồn tại mà không phá security boundary.

**Trade-offs chấp nhận được:**
- Android phải đi trước; iOS parity sẽ đến sau.
- Cần thêm device capability gating, download manager, model lifecycle, và eval harness.

**Rủi ro:**
- Model local nhỏ có thể drift tone hoặc giảm chất lượng nếu prompt/output contract không đủ chặt.
- On-device inference có thể gây nóng máy / latency cao trên device yếu.
- Nếu không tách orchestration rõ, app sẽ lại quay về runtime branching rò rỉ trên UI layer.

**Xem thêm:** `docs/CYCLE_2_LOCAL_AI_PLAN.md`, `BLUEPRINT.md` Section 3, ADR-AL-1, ADR-AL-8

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

---

## ADR-AL-36 — Android bundled content phải chuyển sang Rust-owned artifact

**Status:** ✅ ACCEPTED
**Date:** 2026-04-09
**VHEATM Level:** 🔴 MANDATORY
**Tags:** `architecture` `ssot` `android` `content`

### Context

Current repo state vẫn để Android native init stringify `BUNDLED_SOURCES`, `BUNDLED_PASSAGES`, `BUNDLED_THEMES` từ TypeScript rồi gọi `seedBundledData(...)`. Điều này khiến Android "dùng Rust" nhưng chưa thật sự để Rust own bundled catalog.

**Verified evidence:**
- `lib/native/runtime.ts` gọi `seedBundledData()` với JSON stringify từ TS bundle.
- `modules/aletheia-core-module/src/index.ts` và `core/src/lib.rs` vẫn định nghĩa bridge surface theo hướng nhận JSON payload runtime.

### Decision

> Android bundled content phải được build từ Rust-owned artifact hoặc generator pipeline. TypeScript chỉ được consume downstream artifact đó, không được làm nguồn runtime cho Android.

### Consequences

**Tích cực:**
- Android SSOT chuyển từ "ý định" sang "cấu trúc thật".
- Dễ kiểm soát drift content, QA, và parity tests.

**Trade-offs chấp nhận được:**
- Build pipeline phức tạp hơn một bước.

**Rủi ro:**
- Migration blast radius lớn hơn refactor UI thường. Phải đi kèm verification tier và parity checks.

---

## ADR-AL-37 — Archive/detail UI không được import bundled content trực tiếp

**Status:** ✅ ACCEPTED
**Date:** 2026-04-09
**VHEATM Level:** 🔴 MANDATORY
**Tags:** `architecture` `facade` `archive` `ui`

### Context

Màn archive/detail hiện vẫn có path import bundled content trực tiếp để join metadata vào reading record. Cách này leak data ownership lên UI và phá boundary facade.

**Verified evidence:**
- `app/reading/[id].tsx` import `BUNDLED_SOURCES` và `BUNDLED_PASSAGES`.

### Decision

> Archive/detail screens chỉ được render domain objects hoặc read models lấy qua `coreStore`/adapter layer. Không screen nào được import bundled content trực tiếp để hydrate detail view.

### Consequences

**Tích cực:**
- UI không cần biết content đến từ web store, native store, hay artifact nào.
- Deep-link/history/archive trở nên portable hơn giữa runtime paths.

**Trade-offs chấp nhận được:**
- Cần mở thêm read-model surface trong facade hoặc bridge.

---

## ADR-AL-38 — Archive write parity phải được giải quyết bằng bridge contract, không phải UI workaround

**Status:** ✅ ACCEPTED
**Date:** 2026-04-09
**VHEATM Level:** 🟠 REQUIRED
**Tags:** `archive` `bridge` `native` `contract`

### Context

Favorite/share actions hiện có logic UI, nhưng Android native path vẫn throw do `coreStore.updateReadingFlags()` chưa có bridge-backed implementation. Trong khi đó Rust store đã có read/write primitives tương ứng.

**Verified evidence:**
- `lib/services/core-store.ts` throw trên Android native.
- `core/src/store.rs` đã có `get_reading_by_id()` và `update_reading()`.

### Decision

> Archive write parity phải được giải quyết bằng cách mở rộng UniFFI/native bridge surface với contract hẹp và rõ. Không dùng workaround UI-level, không paginate toàn history để giả lập write path.

### Consequences

**Tích cực:**
- Android archive flow đạt parity thật.
- Logic persistence ở đúng tầng.

**Trade-offs chấp nhận được:**
- Tăng phạm vi bridge maintenance.

---

## ADR-AL-39 — Verification phải chia thành fast/medium/release tiers

**Status:** ✅ ACCEPTED
**Date:** 2026-04-09
**VHEATM Level:** 🟠 REQUIRED
**Tags:** `verification` `ci` `release`

### Context

Repo hiện có baseline kiểm tra nhẹ, nhưng chưa đủ để bảo vệ các refactor liên quan đến Rust contracts, UniFFI bridge, archive parity, và content ownership.

### Decision

> Verification chính thức của repo phải chia thành ba tier:
> - `fast`: typecheck, lint, unit core/service.
> - `medium`: integration tests cho facade/archive/history và web smoke.
> - `release`: rust build, bridge parity, Android flow smoke.

### Consequences

**Tích cực:**
- Mỗi cycle refactor có rail phù hợp với blast radius.
- Giảm nguy cơ drift giữa TS, Rust, và native bridge.

**Trade-offs chấp nhận được:**
- CI/runtime cost tăng lên, nhưng hợp lý so với rủi ro hiện tại.

---

## ADR-AL-40 — Ritual/archive/share/gift phải có event taxonomy chung

**Status:** ✅ ACCEPTED
**Date:** 2026-04-09
**VHEATM Level:** 🟠 REQUIRED
**Tags:** `analytics` `observability` `growth`

### Context

Trước Cycle 2, app đã có `lib/analytics.ts` nhưng không có taxonomy đủ rõ để đo core funnel. Điều đó khiến team có analytics plumbing nhưng gần như không có product observability thật.

### Decision

> Ritual loop, archive interactions, share actions, và gift actions phải dùng một event taxonomy nhất quán ở app layer. Event names cần đủ ổn định để làm funnel, retention cuts, và failure slices.

### Consequences

**Tích cực:**
- Có thể đo từ `home -> start -> symbol -> AI -> save -> share/gift -> archive reopen`.
- Dễ nối PostHog/Sentry thành cùng một feedback loop.

**Trade-offs chấp nhận được:**
- Thêm chút noise ở UI/service layer, nhưng nhỏ hơn nhiều so với việc không có dữ liệu hành vi.

---

## ADR-AL-41 — Archive phải là retention + growth surface, không phải list tĩnh

**Status:** ✅ ACCEPTED
**Date:** 2026-04-09
**VHEATM Level:** 🟠 REQUIRED
**Tags:** `archive` `retention` `growth`

### Context

Mirror/archive ban đầu chỉ là nơi hiển thị lịch sử. Cycle 2 xác nhận rằng archive phải làm được ba việc: giúp user tìm lại điều cũ, quay lại ritual, và chuyển hóa một lần đọc thành share/gift action.

### Decision

> Archive phải hỗ trợ retrieval thật (`search/filter/sort`), replay thật (`reopen`), và growth thật (`share/gift`) ngay trong flow detail.

### Consequences

**Tích cực:**
- Archive trở thành surface giữ chân user thay vì dead-end.
- Share và gift không còn là helper ẩn mà thành hành vi có thể đo được.

**Trade-offs chấp nhận được:**
- UI/archive logic dày hơn một chút và cần observability đi cùng.

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
> Current repo state: static matrix 20 entries, checked into `lib/data/seed-data.ts`, seeded by date+user_id.

### Consequences

**Tích cực:**
- Consistent tone, zero API cost
- 20 entries = đơn giản để kiểm soát copy, nhưng sẽ lặp sớm hơn
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
> Current repo state: 20 curated entries trong source control; không còn tuyên bố 150-entry binary matrix.
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

### Implementation Details
```
Providers (ai_client.rs):
- Claude: claude-sonnet-4-20250514
- GPT-4: gpt-4-turbo
- Gemini: gemini-2.0-flash

Failover Strategy (ADR-AL-14):
- MAX_RETRIES = 3 (per provider)
- INITIAL_BACKOFF_MS = 500
- Round-robin: Claude → GPT4 → Gemini → Claude

API Keys:
- Set via set_api_key(provider, key) at runtime
- Stored in keychain (iOS) / Keystore (Android)
```

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

---

## ADR-AL-27 — Android Prebuild phải Fail Fast khi thiếu Rust Artifacts

**Status:** ✅ ACCEPTED
**Date:** 2026-03-30
**VHEATM Level:** 🔴 MANDATORY
**Tags:** `android` `build` `release` `native`

### Context

Android beta đã chốt dùng Rust core làm SSOT. Nếu Expo plugin tiếp tục cho phép thiếu `generated/uniffi/kotlin` hoặc `artifacts/android`, build path sẽ silently rơi về một trạng thái không có native core, trái với kiến trúc hiện tại.

### Decision

Android prebuild phải `throw` ngay khi thiếu UniFFI bindings hoặc Rust Android artifacts. Không còn JS fallback trên Android release path.

### Consequences

- **Positive:** Build sai cấu hình fail sớm, đúng bản chất kiến trúc.
- **Trade-off:** Dev phải chạy đúng `pnpm uniffi:generate` và `pnpm rust:android` trước Android prebuild.

---

## ADR-AL-28 — Beta CI chỉ gate Android + Web

**Status:** ✅ ACCEPTED
**Date:** 2026-03-30
**VHEATM Level:** 🟠 REQUIRED
**Tags:** `ci` `scope` `beta`

### Context

Product scope hiện tại là Android + web; iOS đang hold explicit. Việc giữ iOS build trong CI chính làm nhiễu release signal và tiêu tốn thời gian cho một target chưa nằm trong beta scope.

### Decision

Workflow CI mặc định chỉ gate:
- Rust core quality
- Android native packaging path
- Web/server quality gates

iOS build được giữ ngoài đường beta chính cho đến khi platform parity thật sự tồn tại.

### Consequences

- **Positive:** CI phản ánh đúng scope ship hiện tại.
- **Trade-off:** iOS regressions không còn được bắt trong PR gate mặc định.

---

## ADR-AL-29 — Mọi `user_state` mutation trên app phải đi qua `coreStore`

**Status:** ✅ ACCEPTED
**Date:** 2026-03-30
**VHEATM Level:** 🟠 REQUIRED
**Tags:** `ssot` `state` `android`

### Context

Ngay cả khi reading flow chính đã đi qua Rust, các service phụ như notifications vẫn có thể lách qua TS `store` và tạo ra drift trên Android. Điều này phá nguyên tắc SSOT ở tầng state.

### Decision

Mọi app-side read/write vào `user_state` phải đi qua `coreStore`. `coreStore` chịu trách nhiệm route:
- Android → native Rust core
- Web → TS store path

### Consequences

- **Positive:** Android giữ đúng một nguồn sự thật cho user state.
- **Trade-off:** Các service phụ phải tuân theo adapter chung thay vì gọi store trực tiếp.

---

## ADR-AL-30 — Gỡ Drizzle/MySQL khỏi release surface

**Status:** ✅ ACCEPTED
**Date:** 2026-03-30
**VHEATM Level:** 🟡 RECOMMENDED
**Tags:** `cleanup` `dependencies` `release`

### Context

Release path hiện tại không dùng Drizzle hay MySQL. Giữ các dependency và script legacy này trong package surface làm mờ data model thật của dự án và tạo tín hiệu sai cho maintainers.

### Decision

Gỡ `drizzle-orm`, `drizzle-kit`, `mysql2` khỏi package surface chính khi chúng không còn được code path thật sử dụng.

### Consequences

- **Positive:** Package surface phản ánh đúng runtime thật.
- **Trade-off:** Nếu sau này khôi phục persistence server-side, phải thêm lại toolchain có chủ đích.

---

## ADR-AL-31 — Không được gọi `nativeClient`/hay runtime switch trực tiếp từ UI

**Status:** ✅ ACCEPTED
**Date:** 2026-03-30
**VHEATM Level:** 🔴 MANDATORY
**Tags:** `ssot` `architecture` `adapter`

### Context

Android đã chốt Rust là SSOT, nhưng app shell vẫn có route/context gọi `aletheiaNativeClient` trực tiếp hoặc tự branch trên `shouldUseAletheiaNative()`. Điều này làm platform decision và domain logic rò lên UI.

### Decision

Mọi app-facing domain operation phải đi qua facade/adapters rõ ràng.  
Ngoại lệ duy nhất: tầng `lib/native/**` hoặc implementation adapter nội bộ.

### Consequences

- **Positive:** Có thể kiểm soát Android/Web divergence ở đúng một lớp.
- **Trade-off:** Phải thiết kế facade đủ đầy trước khi refactor tiếp.

---

## ADR-AL-32 — Android bundled content không thể owned bởi TS

**Status:** ✅ ACCEPTED
**Date:** 2026-03-30
**VHEATM Level:** 🔴 MANDATORY
**Tags:** `ssot` `content` `android`

### Context

Android runtime hiện seed Rust bằng `BUNDLED_*` từ `lib/data/seed-data.ts`. Điều đó có nghĩa là Rust chỉ sở hữu bản copy đã nạp, không sở hữu nguồn dữ liệu gốc.

### Decision

Bundled content cho Android phải được sở hữu bởi Rust hoặc sinh ra từ một artifact trung lập trong build pipeline. TS constants không được là upstream source cho Android domain data.

### Consequences

- **Positive:** Android content path khớp với mục tiêu SSOT thật sự.
- **Trade-off:** Cần thêm bước chuẩn hóa asset/build generation.

---

## ADR-AL-33 — `user_intent` phải trở thành core-owned state

**Status:** ✅ ACCEPTED
**Date:** 2026-03-30
**VHEATM Level:** 🟠 REQUIRED
**Tags:** `state` `onboarding` `ssot`

### Context

Historical trigger của ADR này là intent onboarding từng nằm ngoài core-owned state. Current repo state đã route onboarding qua `coreStore.updateUserState()` và Rust reading session đã đọc `user_state.user_intent`, nhưng decision này vẫn giữ nguyên như guardrail để tránh drift quay lại.

### Decision

`user_intent` phải được persist và truy xuất qua core-owned state trước khi `perform_reading()` tạo session. Không chấp nhận AsyncStorage-only domain state cho Android.

### Consequences

- **Positive:** Session và reading data phản ánh đúng intent đã chọn.
- **Trade-off:** Cần mở rộng core state model hoặc thêm dedicated preference API.

---

## ADR-AL-34 — Schema registry phải trở lại một nguồn duy nhất

**Status:** ✅ ACCEPTED
**Date:** 2026-03-30
**VHEATM Level:** 🟠 REQUIRED
**Tags:** `contracts` `schema` `governance`

### Context

`CONTRACTS.md` tuyên bố là schema registry duy nhất, nhưng thực tế đã drift khỏi UDL/Rust/TS types. Khi đó mọi quyết định thiết kế dựa trên contract đều không còn đáng tin.

### Decision

Schema registry phải có đúng một nguồn sự thật thực thi được.  
Hoặc `CONTRACTS.md` được cập nhật theo executable contract mỗi cycle, hoặc contract docs phải được generate/reference trực tiếp từ UDL/Rust types.

### Consequences

- **Positive:** Giảm drift giữa docs và runtime.
- **Trade-off:** Tăng kỷ luật cập nhật contract trong mỗi refactor cycle.

---

## ADR-AL-35 — UniFFI phải expose đủ read model cho Android UI

**Status:** ✅ ACCEPTED
**Date:** 2026-03-30
**VHEATM Level:** 🟠 REQUIRED
**Tags:** `bridge` `android` `read-model`

### Context

Rust store đã có các query cho sources/themes/symbols/notifications, nhưng UniFFI surface chưa export chúng. Android UI vì vậy vẫn phải quay về TS seed/catalog data.

### Decision

Mọi read model mà Android UI tiêu thụ trong release path phải được cung cấp từ UniFFI/Rust, không từ TS mirrors.

### Consequences

- **Positive:** Android UI không còn phải “mượn” catalog data từ TS.
- **Trade-off:** Bridge surface sẽ rộng hơn và cần test contract kỹ hơn.

---

## ADR-AL-42 — AI service path không được import native runtime trực tiếp

**Status:** ✅ ACCEPTED
**Date:** 2026-04-09
**VHEATM Level:** 🔴 MANDATORY
**Tags:** `ai` `adapter` `boundary`

### Context

Sau Cycle 2, `ai-client` vẫn trực tiếp import `aletheiaNativeClient`, bridge unwrappers, và `shouldUseAletheiaNative()`. Đây là leak có leverage cao vì AI path đi qua nhiều state UX quan trọng.

### Decision

`ai-client` chỉ được nói chuyện với một adapter cấp service như `ai-runtime`.  
Native runtime imports phải bị cô lập trong adapter hoặc `lib/native/**`.

### Consequences

- **Positive:** AI path bớt platform coupling và dễ test hơn.
- **Trade-off:** Thêm một adapter layer phải được giữ đúng contract.

---

## ADR-AL-43 — Bootstrap app shell phải được orchestration như một flow duy nhất

**Status:** ✅ ACCEPTED
**Date:** 2026-04-09
**VHEATM Level:** 🟠 REQUIRED
**Tags:** `startup` `performance` `orchestration`

### Context

Root layout trước đó khởi tạo onboarding check, analytics identity, db init, và native probe trong nhiều `useEffect` rời rạc. Điều này tạo duplicate work, làm khó đo thời gian cold start, và tăng noise khi debug bootstrap regressions.

### Decision

App shell bootstrap phải được gom thành một orchestration flow duy nhất với timing telemetry rõ ràng.  
Những việc không chặn UX như probe phải được defer sau khi gate chính hoàn tất.

### Consequences

- **Positive:** Startup dễ đo, ít duplicate init hơn, và dễ gắn perf budget.
- **Trade-off:** Root layout phải giữ nhiều trách nhiệm orchestration hơn.

---

## ADR-AL-44 — Release readiness phải là artifact có thể đọc bằng máy

**Status:** ✅ ACCEPTED
**Date:** 2026-04-09
**VHEATM Level:** 🟠 REQUIRED
**Tags:** `release` `ops` `verification`

### Context

Trước Cycle 3, release knowledge nằm rải trong docs, script, và kinh nghiệm vận hành. Không có một report JSON duy nhất để gate hoặc inspect nhanh trạng thái artifact/config cho Android beta.

### Decision

Release readiness phải được xuất ra như machine-readable report từ codebase hiện tại và gắn vào verification rail.  
Report tối thiểu phải bao gồm artifact Rust Android, UniFFI bindings, bundled content artifacts, và config health mức release.

### Consequences

- **Positive:** Release review bớt cảm tính và có thể tự động hóa dần.
- **Trade-off:** Report này phải được cập nhật cùng lúc với thay đổi release surface.
