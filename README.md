# AletheiA

> *Không phải lá số. Là chiếc gương.*

AletheiA là ứng dụng đọc triết học cá nhân — mỗi lần mở ra, bạn mô tả điều đang đè nặng lên mình, chọn một biểu tượng, và để một đoạn trích từ Marcus Aurelius, Kinh Dịch, hay Rumi nói điều mà bạn chưa dám tự nói với chính mình. AI diễn giải chỉ khi bạn chủ động yêu cầu — không bao giờ tự động xuất hiện.

Mọi thứ ở lại thiết bị của bạn. Không tài khoản. Không cloud sync. Không notification kiểu "Hôm nay bạn chưa thiền!".

---

## Bắt đầu

```bash
pnpm install
cp .env.example .env
pnpm dev
```

`pnpm dev` khởi động TypeScript server và Expo Metro cùng lúc.

**Android native (path chính):**
```bash
pnpm rust:android
pnpm android
```

**Kiểm tra nhanh:**
```bash
pnpm verify:fast
```

---

## Kiến trúc tổng quan

```
Expo/React Native (UI)
        │
        ▼
lib/services/core-store.ts  ← facade duy nhất mà UI gọi
        │
        ├─► Rust core (UniFFI)         ← reading logic, store, AI client, gift
        │   core/src/contracts.rs      ← source of truth cho tất cả data types
        │   core/src/aletheia.udl      ← UniFFI interface
        │
        ├─► TypeScript server          ← AI routing, rate limit, gift backend
        │   server/_core/index.ts
        │
        └─► JS fallback store          ← web + dev fallback
            lib/services/store.ts
```

**Nguyên tắc cứng:**
- UI screens chỉ gọi `coreStore`, không gọi native client trực tiếp
- `core/src/contracts.rs` là nguồn sự thật duy nhất cho data model — thay đổi ở đây, chạy `pnpm types:sync`
- Secrets của AI provider ở server hoặc native runtime injection, không bao giờ ở client config
- AI là opt-in hoàn toàn — không bao giờ tự push kết quả

---

## Tính năng thực tế hiện tại

| Tính năng | Trạng thái |
|---|---|
| Reading ritual đầy đủ | ✅ situation → wildcard (3 symbols, 8 themes) → passage reveal → optional AI |
| 6 nguồn triết học | ✅ I Ching, Đạo Đức Kinh, Marcus Aurelius, Rumi, Hafez, Bible KJV (120 passages) |
| 8 symbol themes | ✅ Khoảnh khắc, Nguyên tố, Sinh linh, Thiên thể, Địa hình, Nghi thức, Hình học, Ngưỡng |
| AI pipeline | ✅ Ollama → Claude → OpenAI → Gemini → fallback nội tại |
| Local-first Rust core | ✅ SQLite, UniFFI bridge, no network required for reading |
| RevenueCat (Pro) | ✅ Android + iOS, graceful degrade khi chưa config |
| Thông báo hằng ngày | ✅ Local scheduling, gửi passage thật đến lock screen |
| Gương nhìn lại cuối tuần | ✅ Local-only, device tự query SQLite và schedule Saturday notification |
| i18n (VI + EN) | ✅ Full coverage tất cả screens |
| Onboarding passage preview | ✅ Step 3 hiển thị passage thật khớp intent user chọn |
| Gift flow | ⚠️ Client + Rust sẵn sàng, cần deploy backend (`EXPO_PUBLIC_GIFT_BACKEND_URL`) |
| Local AI (Android) | ⚠️ Gemma 3-1B, cần real-device test trước khi claim |
| iOS | ⚠️ Configured nhưng native runtime parity chưa verify |

---

## Content Pipeline

Passages được quản lý riêng theo source — dễ edit, dễ mở rộng:

```
scripts/content/
  i-ching.ts          ← 35 passages, mỗi cái có resonance_context cho AI
  tao-te-ching.ts     ← 28 passages
  marcus-aurelius.ts  ← 20 passages
  rumi.ts             ← 12 passages
  hafez.ts            ← 12 passages
  bible-kjv.ts        ← 13 passages
```

Để thêm source mới: tạo file trong `scripts/content/`, export `RawPassage[]`, thêm vào `build-content-corpus.ts`.

```bash
pnpm content:build    # rebuild bundled-content.json từ source files
pnpm content:sync     # sync vào lib/data/seed-data.generated.ts
```

> **`resonance_context`** là trường quan trọng nhất — đây là "lớp ngầm" mà AI dùng để diễn giải sâu hơn mà user không nhìn thấy. Khi thêm passage mới, đây là công việc editorial không thể automate.

---

## Commands

```bash
# Dev
pnpm dev              # server + metro cùng lúc
pnpm dev:server       # chỉ server
pnpm dev:metro        # chỉ expo

# Mobile
pnpm android
pnpm ios
pnpm rust:android     # build Rust cho Android
pnpm rust:ios         # build Rust cho iOS
pnpm uniffi:generate  # regenerate UniFFI bindings sau khi sửa .udl
pnpm native:sync      # sync native staging

# Content & Types
pnpm content:build    # rebuild core/content/bundled-content.json
pnpm content:sync     # sync bundled content → seed-data.generated.ts
pnpm types:sync       # regenerate lib/types.ts từ contracts.rs

# Tests & Checks
pnpm check            # type check + lint
pnpm test             # vitest
pnpm verify:fast      # quick sanity pass
pnpm verify:release   # full release readiness check

# Release
pnpm build
pnpm release:report
eas build --platform android --profile preview --local
```

---

## Environment

Sao chép `.env.example` → `.env`. Dev local chạy được với nhiều giá trị để trống, nhưng beta/release cần giá trị thật.

**Core:**
```
EXPO_PUBLIC_EAS_PROJECT_ID
EXPO_PUBLIC_OWNER_NAME
APP_ID / EXPO_PUBLIC_APP_ID
JWT_SECRET
API_BASE_URL / EXPO_PUBLIC_API_BASE_URL
EXPO_PUBLIC_SENTRY_DSN
```

**AI (server-side):**
```
ANTHROPIC_API_KEY        ← Claude (Sonnet cho Pro users)
OPENAI_API_KEY           ← fallback
GEMINI_API_KEY           ← fallback
OLLAMA_BASE_URL          ← local inference endpoint
INTERPRETATION_CLOUD_PROVIDER / MODEL
```

**Optional surfaces:**
```
EXPO_PUBLIC_GIFT_BACKEND_URL
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
EXPO_PUBLIC_POSTHOG_API_KEY
```

```bash
bash scripts/validate-env.sh   # kiểm tra env trước khi release
```

---

## Triết lý thiết kế (anti-patterns)

Một số thứ sẽ không bao giờ có trong AletheiA:

- **Social feed / community** — phá vỡ triết lý gương riêng tư
- **Gamification (points, streaks, badges)** — depth score chỉ là filter, không phải reward
- **AI chủ động** — AI chỉ xuất hiện khi user yêu cầu, không bao giờ tự push
- **Account / social login** — local-first nghĩa là local-first
- **Server push notification có chứa reading history** — vi phạm privacy. Weekly summary dùng local scheduling hoàn toàn
- **Reset giới hạn Free tier** bằng cách track Device ID — lỗ hổng delete/reinstall là intentional. Người cần đọc thì để họ đọc.

---

## Cấu trúc project

```
app/                          Expo Router screens
  (tabs)/                     Home, Mirror, Settings
  reading/                    Situation → Wildcard → Passage flow
  onboarding/                 3-step onboarding với passage preview
  .paywall/                   RevenueCat paywall

components/                   Shared UI components
lib/
  services/core-store.ts      Facade chính — UI chỉ gọi đây
  services/reading-engine.ts  Reading logic (JS fallback path)
  services/notification-service.ts  Daily + weekly local notifications
  services/purchases.ts       RevenueCat wrapper
  context/reading-context.tsx Reading session state
  i18n/                       VI + EN strings
  data/
    seed-data.generated.ts    AUTO-GENERATED — không edit tay
    onboarding-content.ts     Preview passages cho onboarding

core/src/                     Rust domain logic
  contracts.rs                Data types — source of truth
  lib.rs                      UniFFI exported functions
  reading.rs                  Reading flow
  store.rs                    SQLite store + migrations (hiện tại: v9)
  gift_client.rs              Gift HTTP client

scripts/
  content/                    Passage source files — edit ở đây
  build-content-corpus.ts     Assembles bundled-content.json
  sync-bundled-content.ts     JSON → seed-data.generated.ts
  sync-types.ts               contracts.rs → lib/types.ts

server/_core/
  index.ts                    Express server
  interpretationService.ts    AI routing + prompt + safety
  rateLimit.ts                Server-side rate limiting
```

---

## Local AI (Android)

```
Model:  gemma-3-1b-it-qat-q4_0
File:   gemma-3-1b-it-q4_0.gguf  (~529 MB)
Source: HuggingFace google/gemma-3-1b-it-qat-q4_0-gguf
```

Không claim local AI parity trên iOS hoặc "fully offline AI" cho đến khi real-device test xong.

---

## Docs

- [docs/BETA_IMPLEMENTATION_ROADMAP.md](docs/BETA_IMPLEMENTATION_ROADMAP.md)
- [docs/BETA_RELEASE_CHECKLIST.md](docs/BETA_RELEASE_CHECKLIST.md)
- [docs/CORE/](docs/CORE/) — ADR, Blueprint, Contracts

---

*Private. All rights reserved.*
