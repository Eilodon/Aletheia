# AletheiA

> *Không phải lá số. Là chiếc gương.*

AletheiA không đoán tương lai. Nó tạo ra một không gian tối, chậm và đủ yên để bạn nhìn lại chính mình — qua những đoạn trích triết học từ Marcus Aurelius, Kinh Dịch, Rumi, và các truyền thống minh triết khác.

Mỗi lần mở ra là một nghi thức nhỏ: bạn gọi tên điều đang đè nặng, chọn một biểu tượng, và để một đoạn trích nói điều mà bạn chưa dám tự nói với chính mình. AI diễn giải chỉ khi bạn chủ động mời — không bao giờ tự động xuất hiện.

---

### Những gì AletheiA sẽ không bao giờ làm

- **Social feed hay community** — một chiếc gương không cần khán giả
- **Gamification** — không điểm, không streak, không badge
- **AI chủ động** — AI chỉ xuất hiện khi bạn mời, không bao giờ tự push
- **Server push notification có chứa nội dung đọc của bạn** — lịch sử đọc ở lại trên thiết bị

---

### Dữ liệu & quyền riêng tư

Lịch sử đọc của bạn được lưu hoàn toàn local trên thiết bị. Bạn có thể dùng AletheiA không cần tài khoản. Nếu đăng nhập, đó là để đồng bộ lịch sử giữa nhiều thiết bị — không có dữ liệu nào được dùng cho quảng cáo hay phân tích cá nhân.

Khi bạn dùng AI: đoạn trích, biểu tượng, và tình huống bạn đã viết được gửi để tạo phản chiếu. Không có gì khác rời khỏi thiết bị.

---

---

## Developer Guide

### Architecture

```
Expo / React Native (UI)
        │
        ▼
lib/services/core-store.ts      ← single facade — UI only calls this
        │
        ├─► Rust core (UniFFI)           ← reading logic, SQLite store, AI client
        │   core/src/contracts.rs        ← source of truth for all data types
        │   core/src/aletheia.udl        ← UniFFI interface definition
        │
        ├─► InsForge backend             ← auth, optional cloud sync
        │   lib/services/insforge-client.ts
        │
        ├─► TypeScript server            ← AI routing, rate limiting, gift backend
        │   server/_core/index.ts
        │
        └─► JS fallback store            ← web + dev environment fallback
            lib/services/store.ts
```

**Hard rules:**
- UI screens only call `coreStore` — never the native client directly
- `core/src/contracts.rs` is the single source of truth for data types — change here, then run `pnpm types:sync`
- AI provider secrets live server-side or in native runtime injection — never in client config
- AI is fully opt-in — never auto-triggered

---

### Getting Started

```bash
pnpm install
cp .env.example .env
pnpm dev
```

`pnpm dev` starts the TypeScript server and Expo Metro concurrently.

**Android native (primary path):**
```bash
pnpm rust:android
pnpm android
```

**Quick sanity check:**
```bash
pnpm verify:fast
```

---

### Commands

```bash
# Development
pnpm dev              # server + metro concurrently
pnpm dev:server       # server only
pnpm dev:metro        # expo only

# Mobile
pnpm android          # run on Android
pnpm ios              # run on iOS
pnpm rust:android     # build Rust for Android
pnpm rust:ios         # build Rust for iOS
pnpm rust:mobile      # build Rust for both platforms
pnpm uniffi:generate  # regenerate UniFFI bindings after editing .udl
pnpm native:sync      # sync native staging

# Content & Types
pnpm content:sync     # sync bundled content → seed-data.generated.ts
pnpm types:sync       # regenerate lib/types.ts from contracts.rs

# Checks & Tests
pnpm check            # TypeScript type check
pnpm lint             # ESLint
pnpm test             # vitest (all tests)
pnpm verify:fast      # type check + key unit tests
pnpm verify:medium    # verify:fast + content sync check + integration tests
pnpm verify:release   # full release readiness (includes Rust build)

# Release
pnpm build                                              # bundle server
pnpm release:report                                     # release readiness report
eas build --platform android --profile preview --local  # EAS local build

# Utilities
pnpm qr               # generate QR for device testing
pnpm sentry:sourcemaps  # upload source maps to Sentry
```

---

### Environment Variables

Copy `.env.example` → `.env`. Local dev works with many values empty; beta/production builds require real values.

**Expo / Release identity**
```
EXPO_PUBLIC_EAS_PROJECT_ID
EXPO_PUBLIC_OWNER_NAME
APP_ID / EXPO_PUBLIC_APP_ID
```

**Backend & API routing**
```
API_BASE_URL / EXPO_PUBLIC_API_BASE_URL
JWT_SECRET                    # min 32 chars — generate: openssl rand -hex 32
CORS_ALLOWED_ORIGINS          # required in production
```

**InsForge (auth + cloud sync)**
```
EXPO_PUBLIC_INSFORGE_URL
EXPO_PUBLIC_INSFORGE_ANON_KEY
```

**AI (server-side only — no EXPO_PUBLIC_ prefix)**
```
ANTHROPIC_API_KEY
OPENAI_API_KEY                # fallback
GEMINI_API_KEY                # fallback
OLLAMA_BASE_URL               # local inference endpoint
INTERPRETATION_CLOUD_PROVIDER / INTERPRETATION_CLOUD_MODEL
```

**Telemetry**
```
EXPO_PUBLIC_SENTRY_DSN        # required for beta release readiness
EXPO_PUBLIC_POSTHOG_API_KEY   # recommended, non-blocking
```

**Optional product surfaces**
```
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
EXPO_PUBLIC_GIFT_BACKEND_URL
LOCAL_AI_URL / LOCAL_AI_MODEL
```

---

### Feature Status

| Feature | Status |
|---|---|
| Full reading ritual | ✅ situation → wildcard → passage → optional AI |
| 6 philosophical sources | ✅ I Ching, Tao Te Ching, Marcus Aurelius, Rumi, Hafez, Bible KJV |
| 8 symbol themes | ✅ Moment, Elements, Creatures, Celestial, Terrain, Ritual, Geometric, Threshold |
| AI interpretation (opt-in) | ✅ multi-provider with internal fallback |
| Local-first Rust core | ✅ SQLite via UniFFI, no network required for reading |
| Aftertaste / mood tag | ✅ post-reading emotional reflection chips |
| Daily passage notification | ✅ local scheduling, real passage to lock screen |
| Weekly mirror summary | ✅ local-only, device queries SQLite and schedules Saturday notification |
| i18n (VI + EN) | ✅ full coverage across all screens |
| Onboarding passage preview | ✅ step 3 shows a real passage matched to chosen intent |
| Account & cross-device sync | ✅ InsForge auth — optional, guest mode always available |
| RevenueCat (Pro tier) | ✅ Android + iOS, graceful degrade when unconfigured |
| Gift flow | ⚠️ client + Rust ready, requires `EXPO_PUBLIC_GIFT_BACKEND_URL` deployed |
| Local AI (Android) | ⚠️ integrated, pending real-device validation |
| iOS native parity | ⚠️ configured, parity with Android not yet verified |

---

### Project Structure

```
app/
  (tabs)/           Home, Mirror, Settings
  (auth)/           Sign-in / sign-up screens
  reading/          Situation → Wildcard → Passage flow
  onboarding/       3-step onboarding with passage preview
  .paywall/         RevenueCat paywall
  .gift/            Gift creation and redemption

components/         Shared UI components
lib/
  services/
    core-store.ts           Primary facade — UI only calls this
    insforge-client.ts      InsForge SDK instance
    reading-engine.ts       Reading logic (JS fallback path)
    notification-service.ts Daily + weekly local notifications
    purchases.ts            RevenueCat wrapper
  context/
    reading-context.tsx     Reading session state
  auth.ts                   Auth helpers (wraps InsForge auth)
  i18n/                     VI + EN strings
  utils/
    haptics.ts              Haptic feedback utilities
    crisis-guard.ts         Crisis detection
  data/
    seed-data.generated.ts  AUTO-GENERATED — do not edit directly
    onboarding-content.ts   Preview passages for onboarding

core/src/                   Rust domain logic (UniFFI)
  contracts.rs              Data types — source of truth
  lib.rs                    UniFFI exported functions
  reading.rs                Reading flow
  store.rs                  SQLite store + migrations
  gift_client.rs            Gift HTTP client

scripts/
  content/                  Passage source files — edit here to add content
  build-content-corpus.ts   Assembles bundled-content.json
  sync-bundled-content.ts   JSON → seed-data.generated.ts
  sync-types.ts             contracts.rs → lib/types.ts
  validate-env.sh           Pre-release environment check

server/_core/
  index.ts                  Express server
  interpretationService.ts  AI routing, prompting, safety
  rateLimit.ts              Server-side rate limiting

tests/                      Vitest unit + integration tests
```

---

### Content Pipeline

Passages are managed per source — easy to edit and extend:

```
scripts/content/
  i-ching.ts
  tao-te-ching.ts
  marcus-aurelius.ts
  rumi.ts
  hafez.ts
  bible-kjv.ts
```

To add a new source: create a file in `scripts/content/`, export `RawPassage[]`, add it to `build-content-corpus.ts`, then run:

```bash
pnpm content:sync
```

Each passage should include a `resonance_context` field — a short editorial note that helps the AI interpretation layer connect the passage to the reader's situation more precisely. This is the part that cannot be automated.

---

*Private. All rights reserved.*
