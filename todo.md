# Aletheia — Project Status
> Cập nhật: 2026-03-30 · v3

## ✅ Đã hoàn thành

### Core Infrastructure
- [x] SQLite schema với versioned migrations (TS: v2, Rust: v4)
- [x] TypeScript types & contracts (`lib/types.ts`) — sync với Rust contracts
- [x] Seed bundled sources: I Ching, Bible KJV, Hafez, Rumi, Meditations, Tao Te Ching
- [x] Store service — CRUD cho tất cả entities
- [x] UserState management (subscription tier, daily limits, preferences)
- [x] Daily limit reset (midnight, timezone-aware via `setLocalDate`)
- [x] Device ID isolation (`current-user-id.ts`)
- [x] `resonance_context` field trong Passage schema

### Rust Core
- [x] ReadingEngine: perform_reading, choose_symbol, complete_reading
- [x] ThemeEngine: get_random_theme, random_three_symbols (Fisher-Yates)
- [x] AIClient: multi-provider failover (Claude → GPT4 → Gemini)
- [x] SSE streaming với cancel token
- [x] Exponential backoff + jitter
- [x] Gift token: `generate_base62_token` dùng `OsRng` (CSPRNG)
- [x] NotificationScheduler: deterministic hash(userId + date)
- [x] UniFFI bindings generated (Swift + Kotlin)

### Native Bridge
- [x] Expo native module (`modules/aletheia-core-module/`)
- [x] Bridge unwrap helpers (`lib/native/bridge.ts`)
- [x] Runtime façade (`lib/native/runtime.ts`)
- [x] Android: Rust core connected, streaming working
- [x] `setLocalDate` bridge

### Domain Facade
- [x] `coreStore` facade (`lib/services/core-store.ts`)

### UI Screens
- [x] Home screen
- [x] Situation input (optional, skippable)
- [x] Wildcard screen (flip animation, manual + auto paths)
- [x] Ritual animation screen
- [x] Passage display (slow reveal, phrase-based, 3s gate trước buttons)
- [x] AI streaming screen (chunk-based, không race condition)
- [x] Share card screen (UI stub — CardGenerator chưa wired)
- [x] Mirror/History screen (DB pagination đúng)
- [x] Onboarding (5 steps, "Which Mirror Are You?", UserIntent)
- [x] Paywall screen (UI, RevenueCat pending)
- [x] Gift create + redeem screens

### UX Polish
- [x] Silence beat 4s sau Complete (UX-04)
- [x] Skip button: "Tôi chưa biết mình đang nghĩ gì" (UX-05)
- [x] Auto-save 30s
- [x] Read duration tracking
- [x] `time_to_ai_request_s` tracking
- [x] `session_count` tracking

### AI
- [x] Language-aware fallback (VI/EN)
- [x] Source-specific fallback prompts
- [x] Adaptive polling (80ms → 500ms backoff)
- [x] `resonance_context` injection vào AI prompt

### Notifications
- [x] Oracle utterance format (title + body từ matrix)
- [x] Deterministic seeding per user+date

### Security
- [x] API keys không trong client bundle (server-managed)
- [x] Gift token CSPRNG (OsRng)
- [x] `sessionStorage` thay vì `localStorage` trên web

### CI/CD
- [x] GitHub Actions: Rust test + clippy + build
- [x] UniFFI binding generation trong CI
- [x] Android + iOS build jobs
- [x] ESLint + TypeScript check
- [x] EAS config (`eas.json`)

### Tests
- [x] reading-engine.test.ts
- [x] store.test.ts
- [x] ai-client.test.ts

---

## 🚧 Đang làm / Cần làm

### Critical (blocks build)
- [ ] iOS: link Rust core vào Xcode project

### High Priority
- [ ] `user_intent` → Rust AI system prompt personalization (native bridge + Rust update)
- [ ] RevenueCat SDK integration

### Content
- [ ] Seed passages: tăng từ 10 → 20-30 per source
- [ ] `resonance_context` content cho 60 passages hiện có
- [ ] Notification matrix: 150 entries (hiện có 20)

### Features
- [ ] CardGenerator → UniFFI bridge → share card generate real PNG
- [ ] Gift backend deploy (Cloudflare Workers)
- [ ] Your Mirror v2.0 (emotional pattern analysis)

### Cleanup
- [ ] `auth.logout.test.ts` — remove `.skip`

---

## ❄️ Deferred (v2.0+)
- [ ] Cloud sync (cross-device history)
- [ ] UGC themes marketplace
- [ ] Audio narration
- [ ] Social features
