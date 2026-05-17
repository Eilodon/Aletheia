# Aletheia

**Aletheia** is a contemplative ritual app for daily spiritual readings — a cross-platform mobile and web application combining offline-first intelligence, multi-tradition sacred texts, and AI-powered reflection.

The name draws from the ancient Greek *ἀλήθεια* — truth revealed through uncovering, not construction.

---

## Features

- **Daily ritual readings** drawn from 6 traditions: I Ching, Christian scripture, Islamic/Sufi texts, Stoic philosophy, and universal wisdom sources
- **AI interpretation** via Anthropic Claude (Haiku primary, Sonnet for extended reflection) with streaming support and offline fallback prompts
- **Reading history** — personal mirror of past reflections, searchable and shareable
- **Gift readings** — send a reading session to another person via deep link
- **Push notifications** — one daily contemplation prompt, time-of-day aware
- **Streak tracking** — reading streak badge with animated flame
- **Biometric lock** option for private practice
- **Local inference** (dev-only) via Ollama for fully offline AI
- **Web companion** built on the same design system for browser access

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│          Expo / React Native App                │
│  (iOS · Android · Web via react-native-web)     │
│                                                 │
│  ┌─────────────┐   ┌────────────────────────┐  │
│  │  React UI   │   │  tRPC client (auth,    │  │
│  │  NativeWind │   │  system, gifts)        │  │
│  │  Reanimated │   └──────────┬─────────────┘  │
│  └──────┬──────┘              │                │
│         │ UniFFI FFI          │ HTTP           │
│  ┌──────▼──────┐   ┌──────────▼─────────────┐  │
│  │  Rust Core  │   │  TypeScript Server     │  │
│  │  (aletheia- │   │  Express + tRPC        │  │
│  │  core-      │   │  Rate limiting         │  │
│  │  module)    │   │  Session auth (JWT)    │  │
│  │             │   │  Storage proxy         │  │
│  │  SQLite DB  │   └────────────────────────┘  │
│  │  AI client  │                               │
│  │  Store      │                               │
│  └─────────────┘                               │
└─────────────────────────────────────────────────┘
```

### Rust Core (`core/`)

The heart of Aletheia is a Rust library compiled to a native module via [UniFFI](https://mozilla.github.io/uniffi-rs/). It owns all stateful logic:

| Module | Responsibility |
|---|---|
| `store.rs` | SQLite via rusqlite, WAL mode, `parking_lot::Mutex`, all reading/user-state persistence |
| `ai_client.rs` | Multi-provider AI: Anthropic Claude (primary), OpenAI GPT-4, Gemini; streaming SSE |
| `lib.rs` | Tokio async runtime (4 threads), job registry, UniFFI exports, stream lifecycle |
| `contracts.rs` | Typed `AletheiaError`, `ErrorCode`, all shared data types |
| `aletheia.udl` | UniFFI interface definition — the FFI contract between Rust and JS |

The Rust module is packaged as a local Expo module (`modules/aletheia-core-module`) and ships as a compiled `.so` (Android) / `.xcframework` (iOS).

### App (`app/`)

Expo Router file-based navigation:

```
app/
  _layout.tsx          Root layout (fonts, Sentry, GatewayReveal)
  (tabs)/
    index.tsx          Home — today's reading
    mirror.tsx         Reading history
    settings.tsx       Preferences, API keys
  onboarding/          First-run tradition selection
  reading/             Active reading session screens
```

### Server (`server/`)

Minimal TypeScript Express server providing:
- **tRPC** surface for `auth.logout`, `system.*`
- Session validation (JWT/SecureStore)
- Rate limiting (auth: 10/15min, AI: 20/min, general: 60/min)
- Storage proxy for uploaded content

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ |
| pnpm | 9+ |
| Rust toolchain | 1.80+ (via rustup) |
| Expo CLI | Latest (`npm i -g expo-cli`) |
| EAS CLI | Latest (`npm i -g eas-cli`) |
| Xcode | 15+ (iOS builds) |
| Android SDK | API 33+ |

### Rust targets

```bash
rustup target add aarch64-apple-ios aarch64-apple-ios-sim   # iOS
rustup target add aarch64-linux-android                     # Android
```

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/eilodon/aletheia.git
cd aletheia
pnpm install
```

### 2. Environment

```bash
cp .env.example .env
# Edit .env and fill in required values (see Environment Variables below)
```

### 3. Build the Rust core

**iOS:**
```bash
bash scripts/build-rust-ios.sh
```

**Android:**
```bash
bash scripts/build-so-only.sh
```

The scripts compile the Rust library, run UniFFI binding generation, and place artifacts where Expo's prebuild can find them.

### 4. Run in development

```bash
# iOS simulator
pnpm expo run:ios

# Android emulator
pnpm expo run:android

# Web (Metro + react-native-web)
pnpm expo start --web
```

---

## Development Workflow

### Rust changes

After editing `core/src/**`:

```bash
# iOS
bash scripts/build-rust-ios.sh && pnpm expo run:ios

# Android
bash scripts/build-so-only.sh && pnpm expo run:android
```

UniFFI bindings (`generated/`) regenerate automatically during prebuild when the UDL signature changes.

### TypeScript / UI changes

Metro hot-reload handles these automatically while the app is running.

### Server changes

```bash
cd server
pnpm dev   # if a dev script is configured, otherwise node dist/index.js
```

### Tests

```bash
pnpm test           # Vitest unit tests
pnpm test:smoke     # Android real-device smoke (requires connected device)
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Release | EAS project identifier |
| `EXPO_PUBLIC_OWNER_NAME` | Release | Expo account owner |
| `JWT_SECRET` | Auth | Long random string for session token signing |
| `AI_API_KEY` | AI | Primary AI provider key |
| `OPENAI_API_KEY` / `ALETHEIA_OPENAI_API_KEY` | Optional | OpenAI GPT-4 fallback |
| `GEMINI_API_KEY` / `ALETHEIA_GEMINI_API_KEY` | Optional | Google Gemini fallback |
| `EXPO_PUBLIC_SENTRY_DSN` | Beta | Sentry error reporting DSN |
| `EXPO_PUBLIC_POSTHOG_API_KEY` | Optional | PostHog analytics |
| `EXPO_PUBLIC_GIFT_BACKEND_URL` | Gift feature | Backend endpoint for gift reading deep links |
| `CORS_ALLOWED_ORIGINS` | Server | Comma-separated allowed origins for API |
| `LOCAL_AI_URL` / `OLLAMA_BASE_URL` | Dev only | Local inference endpoint |

**Note:** AI provider keys are stored server-side only and never exposed to the client bundle. User-supplied personal API keys travel through the Rust core's native keychain store.

---

## Design System

Aletheia uses **NativeWind** (Tailwind for React Native) with a custom theme defined in `theme.config.js`.

### Color tokens

| Token | Light | Dark | Semantic use |
|---|---|---|---|
| `primary` | `#B98B3C` | `#D8B86A` | Gold amber — primary actions, ornaments |
| `background` | `#EFE7D9` | `#282533` | Parchment / void |
| `surface` | `#F6F0E6` | `#35313F` | Cards, panels |
| `foreground` | `#231B15` | `#F4EBD9` | Body text |
| `muted` | `#766A5F` | `#B0A291` | Secondary text |
| `void` | `#EFE7D9` | `#16141C` | Deepest background layer |
| `ritual` | `#B98B3C` | `#D8B86A` | Motion glow alias |

### Typography

| Role | Font |
|---|---|
| Display / headings | Cinzel (AletheiaDisplay) |
| Body / reading text | EB Garamond (AletheiaBody) |

### UI Components

| Component | Description |
|---|---|
| `RitualOrnament` | SVG decorative symbols: `line`, `dot`, `eye`, `sigil`, `compass`, `cross`, `diamond`, `star` |
| `OrnateCorners` | Filigree SVG corners overlay for card frames |
| `FilmGrain` | Absolute-positioned SVG noise texture (cinematic grain, opacity 0.04) |
| `TypewriterText` | Character-by-character text reveal with blinking cursor |
| `StreakBadge` | Animated flame + streak count badge |
| `GatewayReveal` | First-launch ritual ceremony (3.5s) with returning-user fast path (800ms) |
| `AmbientBackdrop` | Radial gradient orb atmosphere layer |
| `PressableCard` | Haptic-feedback pressable container |
| `ScreenContainer` | Safe-area scroll container with keyboard handling |

---

## Security

Aletheia underwent a VHEATM v16.1.1 security audit. All critical and high findings are resolved:

| Finding | Severity | Status | Fix |
|---|---|---|---|
| R01 — API key in URL query param (Gemini) | CRIT | ✅ Fixed | Key moved to `x-goog-api-key` header |
| R01/NF-01 — Domain allowlist dead code | CRIT | ✅ Fixed | Pre-flight check before each HTTP send |
| R02 — `SameSite=None` without `Secure` | HIGH | ✅ Fixed | Conditional `sameSite: secure ? "none" : "lax"` per RFC 6265bis |
| R04/NF-05 — Prompt injection via situation_text | HIGH | ✅ Fixed | `sanitize_situation_text()`: 500-char cap + 12 injection prefix patterns |
| R05 — Rate limit keyed on bare IP | HIGH | ✅ Fixed | Auth token → app+user hash → IP fallback key strategy |
| R08 — PII in sessionStorage on web | MED | ✅ Fixed | Strip `email`/`name` before storing; re-fetch from server when needed |
| R09 — ErrorCode map drift risk | MED | ✅ Fixed | Sync comment with variant count; CI diff suggested |
| NF-02 — Date bypass via far-future year | MED | ✅ Fixed | `is_valid_local_date()`: year 2020–2035 cap, full ASCII parse |
| NF-03 — Tokio thread starvation | LOW | ✅ Fixed | `worker_threads(2 → 4)` |
| NF-04 — Gemini output tokens too large | LOW | ✅ Fixed | `maxOutputTokens: 200`, temperature 0.55 |

---

## Building for Release

### iOS

```bash
eas build --platform ios --profile production
```

### Android

```bash
eas build --platform android --profile production
```

### Web

```bash
pnpm expo export --platform web
# Output in dist/
```

---

## Project Structure

```
aletheia/
├── app/                    Expo Router screens
├── assets/                 Fonts, images, icons
├── components/             Shared UI components
│   ├── ritual-ornament.tsx SVG symbolic ornaments
│   ├── ornate-corners.tsx  Card frame corner overlays
│   ├── film-grain.tsx      Cinematic grain texture
│   ├── typewriter-text.tsx Character-reveal text
│   ├── streak-badge.tsx    Reading streak indicator
│   ├── gateway-reveal.tsx  First-launch ceremony
│   └── ambient-backdrop.tsx Atmospheric gradient
├── constants/              Theme, colors, animation tokens
├── core/                   Rust library source
│   └── src/
│       ├── lib.rs          UniFFI exports, async runtime
│       ├── store.rs        SQLite persistence
│       ├── ai_client.rs    Multi-provider AI client
│       └── contracts.rs    Shared types, errors
├── docs/                   ADRs, architecture docs
├── hooks/                  React hooks (useColors, useReadings, …)
├── lib/                    Shared utilities, auth, tRPC client
├── modules/                Expo native modules (aletheia-core-module)
├── scripts/                Build scripts (Rust, EAS, smoke tests)
├── server/                 TypeScript Express server
│   ├── _core/              Middleware: auth, cookies, rate limiting
│   └── routers.ts          tRPC router definitions
└── tests/                  Vitest + Playwright test suites
```

---

## Contributing

1. Branch from `main` with a descriptive prefix: `feat/`, `fix/`, `refactor/`
2. Rust changes must compile cleanly: `cargo build --release` in `core/`
3. TypeScript changes must pass lint: `pnpm lint`
4. Keep the `ERROR_CODE_MAP` in `lib/native/bridge.ts` in sync with `ErrorCode` variants in `core/src/contracts.rs`
5. Do not add `unwrap()` calls in Rust — use `?` and typed `AletheiaError`
6. UI components must support both light and dark color schemes via `useColors()`

---

## License

Private — all rights reserved. Contact the maintainer for licensing inquiries.
