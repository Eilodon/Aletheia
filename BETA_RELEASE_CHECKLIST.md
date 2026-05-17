# Beta Release Checklist

> Checklist cho việc release beta lên production.

## Pre-Build

- [ ] Copy `.env.example` -> `.env` và điền real values
- [ ] `.env` đã được điền với real values:
  - [ ] `EXPO_PUBLIC_EAS_PROJECT_ID`
  - [ ] `EXPO_PUBLIC_OWNER_NAME`
  - [ ] `JWT_SECRET`
  - [ ] `EXPO_PUBLIC_SENTRY_DSN`
  - [ ] `EXPO_PUBLIC_API_BASE_URL`
  - [ ] At least one AI provider key (`ALETHEIA_CLAUDE_API_KEY` / `ALETHEIA_OPENAI_API_KEY` / `ALETHEIA_GEMINI_API_KEY`)

- [ ] Gift backend đã deploy (hoặc gift routes đã ẩn)
- [ ] Không còn runtime auth/OAuth surface ngoài những gì release thực sự dùng

## Verification

```bash
# Release readiness gate
pnpm release:report --check

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

## VHEATM Cycle 5 — Additional Gates (2026-05-04)

### Environment Validation
- [ ] Run `bash scripts/validate-env.sh` — must exit 0
- [ ] No `unwrap()` in production Rust code: `cargo clippy -- -D warnings` passes

### Gift Flow
- [ ] Gift redeem with valid token → success
- [ ] Gift redeem with expired token → `GiftExpired` error (not silent)
- [ ] Gift redeem with already-redeemed token → `GiftAlreadyRedeemed` error
- [ ] Gift backend unavailable → explicit error shown (not silent failure)

### Error Handling
- [ ] Store operations after WAL init → no SQLITE_BUSY errors
- [ ] Rust unit tests: `cargo test` → all 13 tests pass (incl. error-path suite)
- [ ] `gift_client.rs` tests: all 7 new tests pass

### Audit Verdicts Applied
- [x] ADR-AL-50 (Mutex): Already fixed via parking_lot (superior to map_err approach)
- [x] ADR-AL-51 (Serialization): Already fixed via ser() helper in store.rs
- [x] ADR-AL-52 (GiftClient): Fixed — parse_gift_json() with strict required fields
- [ ] ADR-AL-53 (user_intent "curious"): **AUDIT WRONG** — "curious" is MoodTag not UserIntent. Default Clarity is correct. No action.
- [x] ADR-AL-54 (Tests): 8 new error-path tests added to store.rs + 7 in gift_client.rs
- [ ] ADR-AL-55 (Async/sync): Deferred — stub only in beta
- [x] ADR-AL-56 (validate-env.sh): Created + wired to CI
