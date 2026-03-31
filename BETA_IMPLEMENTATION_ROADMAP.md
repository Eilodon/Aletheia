# 🚀 BETA READINESS - IMPLEMENTATION ROADMAP
**VHEATM Cycle #8 — Transformation Plan**

---

## 📊 EXECUTIVE SUMMARY

| Category | Status | Notes |
|----------|--------|-------|
| **Critical Blockers Fixed** | ✅ 3/3 | expo-local-auth, userIntent, uuid |
| **Environment Ready** | ⚠️ PENDING | Requires .env setup |
| **Architecture Issues** | 🔄 PHASED | H-13, H-14, H-17 need refactor |
| **Beta Readiness** | ⚠️ 70% | Can build after env setup |

---

## ✅ PHASE 1: IMMEDIATE (Critical — Do Now)

### T-01: Fix expo-local-authentication Version
**Status:** ✅ DONE  
**Change:** `expo-local-authentication: ^55.0.9` → `~7.0.0`  
**File:** `package.json:48`  
**Verification:** `pnpm install` should complete without peer-dep warnings

### T-02: Fix userIntent Streaming Bug  
**Status:** ✅ DONE  
**Change:** Added `userIntent` parameter to `startInterpretationStream()` call  
**File:** `@/home/ybao/B.1/AletheiA/lib/services/ai-client.ts:150-156`  
**Verification:** TypeScript compiles, userIntent flows to Rust

### T-03: Fix uuid Import Compatibility
**Status:** ✅ DONE  
**Change:** `uuid: ^13.0.0` → `^9.0.0`  
**File:** `package.json:78`  
**Verification:** Metro bundler resolves imports correctly

---

## ⚡ PHASE 2: ENVIRONMENT SETUP (Required Before Build)

### T-04: Initialize EAS Project & Environment
**Status:** ⏳ PENDING  
**Estimated Time:** 15 minutes

```bash
# 1. Login to Expo
eas login

# 2. Initialize project (creates EXPO_PUBLIC_EAS_PROJECT_ID)
eas project:init

# 3. Create .env from template
cp .env.example .env

# 4. Edit .env with required values:
#    - EXPO_PUBLIC_EAS_PROJECT_ID=<from step 2>
#    - EXPO_PUBLIC_OWNER_NAME=<your expo username>
#    - JWT_SECRET=<generate 32+ random chars>
#    - ALETHEIA_APP_SECRET=<generate 32+ random chars>
#    - EXPO_PUBLIC_ALETHEIA_APP_SECRET=<same as above>
#    - EXPO_PUBLIC_API_BASE_URL=<deployed server URL or http://localhost:3000>
```

**Rollback:** Delete `.env`, run `eas project:init` again

### T-05: Install Dependencies
**Status:** ⏳ PENDING  
**Command:**
```bash
pnpm install
```

**Expected:** No peer-dep warnings, all packages resolve

---

## 🔄 PHASE 3: ARCHITECTURAL FIXES (Post-Beta, Long-Term)

### T-06: H-13 — Enforce Facade Boundary (ADR-AL-31)
**Status:** 📋 PLANNED  
**Priority:** 🔴 MANDATORY for production  
**Scope:** Refactor all direct `aletheiaNativeClient` calls to route through `coreStore`

**Files to Audit:**
- `@/home/ybao/B.1/AletheiA/lib/context/reading-context.tsx` — calls native directly
- `@/home/ybao/B.1/AletheiA/app/gift/redeem.tsx` — calls native directly
- `@/home/ybao/B.1/AletheiA/lib/services/db-init.ts` — branches on `shouldUseAletheiaNative()`
- `@/home/ybao/B.1/AletheiA/lib/services/ai-client.ts` — branches on `shouldUseAletheiaNative()`

**Target Pattern:**
```typescript
// ❌ BEFORE (violates ADR-AL-31)
const session = await aletheiaNativeClient.performReading(userId, sourceId, situationText);

// ✅ AFTER (correct)
const session = await coreStore.performReading(sourceId, situationText);
```

**Implementation:**
1. Ensure `coreStore` exposes all methods needed by UI
2. Update `reading-context.tsx` to use `coreStore` only
3. Update `gift/redeem.tsx` to use `coreStore` only
4. Add lint rule to catch direct native calls

**Estimated Effort:** 4-6 hours

---

### T-07: H-14 — Move Content Ownership to Rust (ADR-AL-32)
**Status:** 📋 PLANNED  
**Priority:** 🔴 MANDATORY for true SSOT  
**Scope:** Eliminate TS `BUNDLED_*` as source of truth for Android

**Current Flow (problematic):**
```
TS: lib/data/content.ts → BUNDLED_SOURCES/PASSAGES/THEMES
   ↓ JSON.stringify
Rust: seedBundledData() → SQLite
   ↓
Android UI reads from TS constants directly (gift/create.tsx, notifications.ts)
```

**Target Flow:**
```
Build: Generate content.json from single source
   ↓
Rust: Load content.json at build time → embed in binary
   ↓
Android: Query via UniFFI (getSources, getThemes, etc.)
   ↓
Android UI: Query Rust via coreStore, not TS constants
```

**Implementation Options:**

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| **A. Generate JSON at build** | Minimal code change | Still JSON, not embedded | 2h |
| **B. Embed in Rust binary** | True SSOT, no runtime load | Need rebuild for content updates | 4h |
| **C. Expand UniFFI surface** | Full query capability | More UDL + bindings work | 8h |

**Recommendation:** Option C for long-term, Option A for quick beta

**Files Affected:**
- `@/home/ybao/B.1/AletheiA/lib/native/runtime.ts:110-114`
- `@/home/ybao/B.1/AletheiA/lib/services/store.ts:17`
- `@/home/ybao/B.1/AletheiA/app/gift/create.tsx`
- `@/home/ybao/B.1/AletheiA/lib/services/notifications.ts`

---

### T-08: H-17 — Expand UniFFI Query Surface (ADR-AL-35)
**Status:** 📋 PLANNED  
**Priority:** 🟠 REQUIRED for Android SSOT  
**Scope:** Add read APIs to UniFFI for sources, themes, passages

**Current Gap:**
- Rust `Store` has: `get_sources()`, `get_source()`, `get_theme()`, `get_symbol_by_id()`, `get_notification_matrix()`
- UniFFI exports: Only reading/history/user-state/gift APIs
- Android UI falls back to TS `BUNDLED_SOURCES` for source/theme display

**Implementation:**
1. Add to `core/src/aletheia.udl`:
   ```idl
   SourcesResponse get_sources(boolean premium_allowed);
   SourceResponse get_source(string source_id);
   ThemesResponse get_themes();
   ThemeResponse get_theme(string theme_id);
   NotificationMatrixResponse get_notification_matrix();
   ```

2. Update `modules/aletheia-core-module/src/index.ts` with new types

3. Rebuild bindings: `pnpm uniffi:generate`

4. Update `coreStore` to expose new methods

**Estimated Effort:** 6-8 hours

---

### T-09: H-15 — Fix userIntent Persistence (ADR-AL-33)
**Status:** 📋 PLANNED  
**Priority:** 🟠 REQUIRED for UX  
**Scope:** Ensure userIntent flows from onboarding to reading session

**Current Issue:**
- Onboarding stores intent in AsyncStorage only
- `performReading()` in Rust ignores intent, returns `user_intent: None`
- Reading saved to DB has `user_intent: null`

**Implementation:**
1. Option A: Pass intent to `performReading()` call
2. Option B: Store in Rust user state, inject into sessions

**Recommendation:** Option A (simpler, less stateful)

**Files:**
- `@/home/ybao/B.1/AletheiA/app/onboarding/index.tsx`
- `@/home/ybao/B.1/AletheiA/lib/context/reading-context.tsx`
- `@/home/ybao/B.1/AletheiA/lib/services/core-store.ts`
- `@/home/ybao/B.1/AletheiA/core/src/reading.rs`

**Estimated Effort:** 2-3 hours

---

### T-10: H-16 — Sync Schema Registry (ADR-AL-34)
**Status:** 📋 PLANNED  
**Priority:** 🟡 RECOMMENDED for maintainability  
**Scope:** Update `docs/CONTRACTS.md` to match code

**Missing from CONTRACTS.md:**
- `user_intent` field in ReadingSession, UserState
- Gift-related types

**Implementation:**
1. Audit all types in `lib/types.ts`
2. Audit all UDL definitions in `core/src/aletheia.udl`
3. Update `docs/CONTRACTS.md` to match

**Estimated Effort:** 1-2 hours

---

## 📋 IMPLEMENTATION SEQUENCE

```
WEEK 1: BETA LAUNCH
├── Day 1: T-04 (env setup) + T-05 (pnpm install)
├── Day 2: pnpm rust:android (build .so)
├── Day 3: eas build --platform android --profile preview
└── Day 4: Test APK, fix critical bugs

WEEK 2-4: POST-LAUNCH FIXES
├── T-06 (facade boundary) - 4-6h
├── T-09 (userIntent fix) - 2-3h
└── T-10 (CONTRACTS sync) - 1-2h

MONTH 2: SSOT HARDENING
├── T-07 (content ownership) - 4-8h
└── T-08 (UniFFI surface) - 6-8h
```

---

## 🎯 SUCCESS CRITERIA

| Milestone | Criteria | Verification |
|-----------|----------|--------------|
| **Phase 1 Complete** | All 3 critical fixes applied | `git diff --stat` shows changes |
| **Phase 2 Complete** | `pnpm install` succeeds, no peer-dep warnings | Run command, check output |
| **Beta Build** | APK builds successfully | `eas build` completes |
| **App Launches** | Home screen renders, reading flow works | Manual test on device |
| **Phase 3 Complete** | ADR-AL-31, 32, 35 implemented | Architecture audit passes |

---

## 🚨 RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| EAS quota exceeded | Low | High | Use local build first |
| Rust build fails | Medium | High | Check NDK, Java versions |
| UniFFI binding errors | Medium | Medium | Run `pnpm uniffi:generate` first |
| Content not loading | Medium | High | Verify bundled data in APK |

---

## 📞 NEXT STEPS

1. **User:** Run Phase 2 environment setup commands
2. **User:** Run `pnpm install` to verify dependencies
3. **User:** Attempt `pnpm rust:android` to build native artifacts
4. **Me:** Assist with any build failures

---

**Generated:** VHEATM Cycle #8  
**Framework:** VHEATM 5.0  
**Status:** Implementation plan ready for execution
