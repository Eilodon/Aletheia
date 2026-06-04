# Hardening Fixes — AletheiA Pre-Beta

> **For agentic workers:** Use `executing-plans` to implement this plan task-by-task.

**Goal:** Fix 5 confirmed security/stability findings from the 2026-06-04 audit before beta testing.  
**Architecture:** Targeted surgical fixes — no new abstractions, no refactors beyond the fix.  
**Tech Stack:** Rust/Cargo, TypeScript/React Native, Kotlin, pnpm  
**Audit Gate:** PASS WITH FLAGS (all findings verified above; false positives retracted)  
**Risk Flags:** Task 3 (Kotlin native module — compile-time verification required)

---

## Confirmed Findings Being Fixed

| # | Finding | File | Severity |
|---|---|---|---|
| F1 | UniFFI version unpinned — `cargo update` can break ABI | `core/Cargo.toml` | CRITICAL |
| F2 | `Math.random()` in crypto polyfill — used for session/reading UUIDs | `lib/polyfills/crypto.ts` | HIGH |
| F3 | No depth guard in `jsonObjectToMap`/`jsonArrayToList` mutual recursion | `AletheiaCoreModule.kt` | MEDIUM |
| F4 | `BUILD_X86` missing from emulator smoke test script | `package.json` | HIGH |
| F5 | `pnpm audit` not in release verification gate | `package.json` | HIGH |

## False Positives (NOT fixed — verified safe)

- Stale staging `.native-staging` — only trailing whitespace, functionally identical
- HTTP URLs in server/test — all gated by `NODE_ENV !== "production"` or test-only
- `Math.random()` in `store.ts:719` — non-crypto weighted source picker

---

## File Map

| File | Change |
|---|---|
| `core/Cargo.toml` | Pin `uniffi` + `uniffi_build` to `=0.25.3` |
| `lib/polyfills/crypto.ts` | Replace `Math.random()` with `expo-crypto` |
| `modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/AletheiaCoreModule.kt` | Add `depth` param + guard to both JSON helpers |
| `package.json` | Fix `smoke:e2e:android` + `verify:release` scripts |

---

### Task 1: Pin UniFFI version in Cargo.toml

**Files:**
- Modify: `core/Cargo.toml:17,35`

**Why:** `Cargo.lock` currently resolves `"0.25"` to `0.25.3`, same as the pinned bindgen tool.
But without an explicit pin, `cargo update` resolves to the latest `0.25.x` while the bindgen
tool stays at `=0.25.3` — diverging checksums → JVM `InternalException` at app startup.

- [ ] **Step 1: Edit Cargo.toml**

Change lines 17 and 35:
```toml
# Before
uniffi = "0.25"
uniffi_build = "0.25"

# After
uniffi = "=0.25.3"
uniffi_build = "=0.25.3"
```

- [ ] **Step 2: Verify lock file still resolves to 0.25.3**

```bash
cd core && cargo metadata --format-version 1 | python3 -c "
import sys, json
pkgs = json.load(sys.stdin)['packages']
for p in pkgs:
    if 'uniffi' in p['name']:
        print(p['name'], p['version'])
"
```
Expected output:
```
uniffi 0.25.3
uniffi_build 0.25.3
```

- [ ] **Step 3: Commit**
```
git commit -m "fix(core): pin uniffi to =0.25.3 — prevent cargo update ABI drift"
```

---

### Task 2: Replace Math.random() in crypto polyfill with expo-crypto

**Files:**
- Modify: `lib/polyfills/crypto.ts` (full rewrite, 29 → 24 lines)

**Why:** The polyfill's `getRandomValues` falls back to `Math.random()` which is not a CSPRNG.
Callers `lib/utils/random.ts` and `lib/utils/id.ts` use this to generate session and reading UUIDs.
`expo-crypto` (`~15.0.8`) is already in deps and provides a synchronous native CSPRNG.

- [ ] **Step 1: Rewrite polyfill**

```ts
// Polyfill global crypto for React Native / Hermes environments.
// Must be imported before any library that calls crypto.getRandomValues() or crypto.randomUUID().
// Uses expo-crypto as entropy source on platforms where globalThis.crypto is unavailable.
import * as ExpoCrypto from "expo-crypto";

if (
  typeof globalThis.crypto === "undefined" ||
  typeof globalThis.crypto.getRandomValues === "undefined"
) {
  (globalThis as unknown as { crypto: Crypto }).crypto = {
    getRandomValues: <T extends ArrayBufferView>(array: T): T =>
      ExpoCrypto.getRandomValues(array),
    randomUUID: (): `${string}-${string}-${string}-${string}-${string}` =>
      ExpoCrypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
    subtle: {} as SubtleCrypto,
  } as Crypto;
}
```

- [ ] **Step 2: Verify TypeScript compiles**
```bash
pnpm check
```
Expected: no errors on `lib/polyfills/crypto.ts`

- [ ] **Step 3: Commit**
```
git commit -m "fix(security): replace Math.random() polyfill with expo-crypto CSPRNG (CWE-330)"
```

---

### Task 3: Add depth guard to Kotlin JSON deserializers

**Files:**
- Modify: `modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/AletheiaCoreModule.kt:1289-1325`

**Why:** `jsonObjectToMap` and `jsonArrayToList` are mutually recursive with no termination bound.
A pathologically nested JSON object (depth > JVM default stack size) causes `StackOverflowError`.
Fix: add a `depth` parameter defaulting to `0`; throw `IllegalArgumentException` beyond depth 20.

- [ ] **Step 1: Edit the three functions**

Replace lines 1289–1325 with:
```kotlin
  private fun parseJsonMap(jsonString: String): Map<String, Any?> {
    return jsonObjectToMap(org.json.JSONObject(jsonString), 0)
  }

  private fun jsonObjectToMap(json: org.json.JSONObject, depth: Int): Map<String, Any?> {
    if (depth > 20) throw IllegalArgumentException("JSON nesting exceeds maximum depth (20)")
    val map = mutableMapOf<String, Any?>()
    val keys = json.keys()
    while (keys.hasNext()) {
      val key = keys.next()
      var value: Any? = json.get(key)
      if (value === org.json.JSONObject.NULL) {
        value = null
      } else if (value is org.json.JSONObject) {
        value = jsonObjectToMap(value, depth + 1)
      } else if (value is org.json.JSONArray) {
        value = jsonArrayToList(value, depth + 1)
      }
      map[key] = value
    }
    return map
  }

  private fun jsonArrayToList(array: org.json.JSONArray, depth: Int): List<Any?> {
    if (depth > 20) throw IllegalArgumentException("JSON nesting exceeds maximum depth (20)")
    val list = mutableListOf<Any?>()
    for (i in 0 until array.length()) {
      var value: Any? = array.get(i)
      if (value === org.json.JSONObject.NULL) {
        value = null
      } else if (value is org.json.JSONObject) {
        value = jsonObjectToMap(value, depth + 1)
      } else if (value is org.json.JSONArray) {
        value = jsonArrayToList(value, depth + 1)
      }
      list.add(value)
    }
    return list
  }
```

- [ ] **Step 2: Verify no other callers of the old 1-arg signature exist**
```bash
grep -n "jsonObjectToMap\|jsonArrayToList" \
  modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/AletheiaCoreModule.kt
```
Expected: only the 3 function definitions + internal recursive calls (all now passing `depth`).

- [ ] **Step 3: Commit**
```
git commit -m "fix(android): add depth guard to jsonObjectToMap/jsonArrayToList (max 20)"
```

---

### Task 4: Fix package.json scripts — BUILD_X86 + pnpm audit

**Files:**
- Modify: `package.json:22,17`

**Why F4:** `smoke:e2e:android` runs on an emulator (x86_64) but `build-rust-android.sh` only
builds `arm64-v8a` by default → `UnsatisfiedLinkError` on emulator. Set `BUILD_X86=true`.

**Why F5:** `verify:release` runs TSC + tests + architecture check but never audits the npm
dependency tree for CVEs. One `pnpm audit --audit-level=high` call closes this gap.

- [ ] **Step 1: Edit package.json scripts**

```json
"smoke:e2e:android": "BUILD_X86=true bash scripts/build-rust-android.sh && maestro test .maestro/smoke-test.yaml",
"verify:release": "pnpm verify:medium && pnpm exec tsx scripts/sync-bundled-content.ts --check && pnpm test -- --run tests/core-store.test.ts && node scripts/verify-architecture.mjs && pnpm audit --audit-level=high",
```

- [ ] **Step 2: Verify scripts parse correctly**
```bash
node -e "const p = require('./package.json'); console.log(p.scripts['smoke:e2e:android']); console.log(p.scripts['verify:release']);"
```
Expected output shows both updated strings with no JSON parse errors.

- [ ] **Step 3: Commit**
```
git commit -m "fix(ci): BUILD_X86=true for emulator smoke tests; add pnpm audit to verify:release"
```

---

## Self-Review

**Spec coverage:** All 5 findings have tasks. False positives excluded. ✓  
**Placeholder scan:** No TBD/TODO/similar. ✓  
**Type consistency:** No cross-task type references. ✓  
**Risk scoring:** Task 3 (Kotlin) is the only compile-risk — mitigated by grep verification step.

### Risk Summary

| Task | Risk | Boundary | Notes |
|---|---|---|---|
| T1 — Cargo.toml pin | LOW | local | Cargo.lock already at 0.25.3; no behavior change |
| T2 — crypto polyfill | LOW | local | expo-crypto already in deps; only activates on platforms without native crypto |
| T3 — Kotlin depth guard | MEDIUM | CROSS | Native compile required to confirm; grep step verifies no stale callers |
| T4 — package.json scripts | LOW | local | Scripts not run during plan execution |

**1 MEDIUM task (T3), 0 CRITICAL.** T3 requires a native Android build to fully verify.
