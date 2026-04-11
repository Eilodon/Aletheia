# Beta Release Checklist

> Checklist cho việc release beta lên production.

## Pre-Build

- [ ] `.env` đã được điền với real values:
  - [ ] `EXPO_PUBLIC_EAS_PROJECT_ID`
  - [ ] `EXPO_PUBLIC_OWNER_NAME`
  - [ ] `JWT_SECRET`
  - [ ] `EXPO_PUBLIC_API_BASE_URL`
  - [ ] At least one AI provider key (`ALETHEIA_CLAUDE_API_KEY` / `ALETHEIA_OPENAI_API_KEY` / `ALETHEIA_GEMINI_API_KEY`)

- [ ] Gift backend đã deploy (hoặc gift routes đã ẩn)
- [ ] Không còn runtime auth/OAuth surface ngoài những gì release thực sự dùng

## Verification

```bash
# Typecheck
pnpm check

# Unit tests
pnpm test -- --run tests/store.test.ts tests/auth.logout.test.ts tests/reading-engine.test.ts

# Android build
pnpm rust:android
```

## Manual Testing (On-Device)

- [ ] Reading flow end-to-end hoạt động
- [ ] AI provider config resolves correctly
- [ ] Deep links work (nếu có)
- [ ] Notifications work (nếu có)
- [ ] Gift flow: works against real backend OR is intentionally hidden

## Build & Deploy

```bash
# Android
eas build --platform android --profile preview --local
```

## Post-Build

- [ ] App launches successfully
- [ ] No crash on startup
- [ ] All core features work as expected

---

## Notes

### Hidden Routes (out of beta scope)
- `.dev/` - Theme lab (dev tools)
- `.paywall/` - Monetization (deferred)
- `.gift/` - Gift backend (not deployed yet)

### Current Non-Goals
- iOS shipping parity
- Cloud sync
- Social features
- v2 mirror analytics
