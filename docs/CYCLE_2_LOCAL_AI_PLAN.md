# CYCLE_2_LOCAL_AI_PLAN.md
### Aletheia · Local-first Interpretation Rollout

> Current-state execution plan for making "Xin deciphering" local-first with cloud as an optional quality tier.
> This plan assumes Android is the first active native target and iOS follows only after the adapter surface is proven.

---

## Implementation Status (Updated: Apr 2026)

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Contract and Evaluation | **COMPLETED** |
| Phase 1 | Orchestrator Boundary | **COMPLETED** |
| Phase 2 | Android Local Inference | **COMPLETED** |
| Phase 3 | Cloud Quality Lane | Deferred (server-side) |
| Phase 4 | iOS Parity | **STUB READY** (needs native implementation) |
| Phase 5 | Telemetry and Guardrails | **COMPLETED** |
| UI | Status Display | **COMPLETED** |
| UI | Model Manager | **COMPLETED** |
| **BLOCKER** | Model File | **PENDING** - Need to download/bundle Gemma 3n E2B |

### Key Files Created/Modified

**Rust Core:**
- `core/src/contracts.rs` - Added `LocalModelStatus`, `LocalModelInfo`, `DeviceCapability` types
- `core/src/aletheia.udl` - Added UDL definitions for local model APIs
- `core/src/lib.rs` - Added stub implementations for local model lifecycle
- `core/src/local_inference.rs` - New module with prompt building and inference contract

**Android Native:**
- `modules/aletheia-core-module/src/index.ts` - TypeScript types for local model
- `modules/aletheia-core-module/android/.../AletheiaCoreModule.kt` - Bridge methods
- `modules/aletheia-core-module/android/.../DeviceCapabilityDetector.kt` - Device detection

**iOS Native:**
- `modules/aletheia-core-module/ios/AletheiaCoreModule.swift` - API parity stubs

**UI/Telemetry:**
- `lib/analytics.ts` - Local inference telemetry functions
- `components/inference-mode-badge.tsx` - Status display component
- `components/local-model-manager.tsx` - Model download/management UI
- `hooks/use-local-model.ts` - React hook for model lifecycle
- `lib/services/interpretation-orchestrator.ts` - Mode selection and routing

**App:**
- `app/(tabs)/settings.tsx` - Settings screen with model manager

**Tests:**
- `tests/fixtures/interpretation-eval-dataset.json` - 30 eval cases
- `tests/interpretation-eval.test.ts` - Evaluation test harness

---

## Next Steps (BLOCKER Resolution)

### Option A: Bundle Model in APK (Not Recommended)
- Place `gemma-3n-e2b.task` (~2GB) in `assets/models/`
- Increases APK size significantly
- Good for offline-first experience

### Option B: Runtime Download (Recommended)
1. User opens Settings > Local AI
2. Taps "Download Model"
3. Model downloads from GCS to app-private storage
4. User can delete model to free space

### Required Setup for Option B:
1. **Upload model to GCS:**
   - Bucket: `aletheia-models`
   - Path: `gemma-3n-e2b/gemma-3n-e2b.task`
   - Version file: `gemma-3n-e2b/version.json`

2. **Test download flow:**
   ```bash
   # Build and run on Android device
   pnpm android
   # Navigate to Settings > Local AI
   # Tap Download Model
   ```

3. **Verify inference:**
   - Start a reading
   - Request AI interpretation
   - Check InferenceModeBadge shows "Local AI"

---

## Goal

Deliver a real model-backed interpretation path with this priority order:

1. Local model on device
2. Cloud quality lane
3. Existing static fallback prompts

The change must preserve the current security boundary: no cloud provider secret in the client runtime.

---

## Why This Plan Exists

Current repo state:

- UI already has one clean entry point for interpretation through `useReading()` and `aiClient`.
- Rust core still owns the current cloud-provider orchestration path.
- Native runtime already exists as an Expo module boundary on Android.
- iOS is still explicitly outside the active beta scope.
- Client-side provider secret exposure has already been removed.

This means the safest next move is:

- keep UI API shape stable
- add a new local inference adapter in native layer
- add a new server cloud proxy for quality mode
- move orchestration selection into one narrow service boundary

---

## Chosen Runtime Shape

```text
Reading UI
  -> reading-context
  -> interpretation-orchestrator
       -> local-native-engine
       -> cloud-proxy-client
       -> fallback-prompts
```

### Ownership

- `UI / context`
  decides only "user requested interpretation" and displays stream / status
- `interpretation orchestrator`
  decides local vs cloud vs fallback
- `native local engine`
  owns model presence, device capability, inference, cancellation, and chunk streaming
- `server cloud proxy`
  owns secret-backed cloud inference
- `fallback prompts`
  remain the final resilience layer

---

## Model Choice

### Local default
- `Gemma 3n E2B`

### Local later optimization
- `Gemma 3 270M`, only after we have:
  - a fixed evaluation set
  - prompt/output contract frozen
  - evidence that specialized small-model quality is acceptable

### Cloud optional quality lane
- `gpt-4.1-mini` or `gemini-2.5-flash`

Recommendation:
- Start with `gpt-4.1-mini` if writing quality is more important.
- Start with `gemini-2.5-flash` if cost/latency and Google alignment matter more.

---

## Output Contract

The local and cloud model must both target the same output contract:

- language matches passage language
- 80-120 words for the main reflection
- mirrors user situation when present
- no direct advice
- no future prediction
- final line is one short open question

This contract must be enforced above provider/model specifics so outputs remain comparable.

---

## Phase Plan

## Phase 0 — Contract and Evaluation

### Deliverables
- freeze interpretation output contract
- create a small eval dataset
- define pass/fail rubric

### Files to add/update
- new eval fixture file under `tests/fixtures/` or `docs/`
- new test harness for prompt/output contract
- update `docs/BLUEPRINT.md`

### Pass criteria
- 20-30 representative prompts
- rubric covers:
  - language fidelity
  - tone fidelity
  - non-advice compliance
  - ending-question compliance

---

## Phase 1 — Orchestrator Boundary

### Deliverables
- add a dedicated interpretation orchestrator service
- remove provider choice from UI-facing code

### Proposed files
- add `lib/services/interpretation-orchestrator.ts`
- update `lib/context/reading-context.tsx`
- keep `lib/services/ai-client.ts` only as one provider implementation, not the top-level policy owner

### Responsibilities
- ask native layer if local model is available and warm
- prefer local when ready
- use cloud only when:
  - user explicitly selected quality mode, or
  - local is unavailable / fails policy checks
- fall back to static prompts when all else fails

---

## Phase 2 — Android Local Inference

### Deliverables
- new native local inference path in Expo module
- runtime model download/cache/versioning
- stream chunks back to JS

### Proposed file surface
- update `modules/aletheia-core-module/src/index.ts`
- update `modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/AletheiaCoreModule.kt`
- add Android-side helper classes for:
  - capability detection
  - model asset manager
  - local interpretation session

### Required new bridge methods
- `getLocalModelStatus()`
- `prepareLocalModel()`
- `startLocalInterpretationStream()`
- `pollLocalInterpretationStream()`
- `cancelLocalInterpretationStream()`

### Notes
- Do not bundle multi-GB model assets in APK.
- Download model at runtime into app-private storage.
- Gate by device capability before offering local as default-ready.

---

## Phase 3 — Cloud Quality Lane

### Deliverables
- server-side interpretation route
- provider/model selection on server only
- no provider key in client

### Proposed files
- update `server/routers.ts`
- add `server/_core/interpretationRouter.ts`
- add `server/_core/interpretationService.ts`
- update `server/_core/env.ts`

### API shape
- request:
  - passage
  - symbol
  - situationText
  - userIntent
  - desiredQualityMode
- response:
  - streamed text chunks or final text
  - provider/model metadata
  - usedFallback flag

### Security rules
- rate-limit this route separately
- never return raw provider secrets
- sanitize and bound user input before provider call

---

## Phase 4 — iOS Parity

### Deliverables
- replace current iOS stub with real local inference adapter
- keep iOS disabled until parity is proven

### Proposed files
- update `modules/aletheia-core-module/ios/AletheiaCoreModule.swift`
- update `lib/native/aletheia-core.ts`
- update `lib/native/runtime.ts`

### Rule
- iOS remains fail-closed until:
  - model lifecycle works
  - stream cancellation works
  - thermal/latency budget is acceptable

---

## Phase 5 — Telemetry and Guardrails

### Metrics to add
- local model ready rate
- local inference success rate
- local median time-to-first-chunk
- local full completion latency
- cloud escalation rate
- fallback rate
- quality mode opt-in rate

### Acceptance thresholds
- fallback rate should trend down after local model readiness stabilizes
- local path must beat cloud on reliability for poor-network scenarios
- thermal/latency regressions must be measured on at least one mid-tier Android device

---

## Risks

### R1 — Model too large for mid-tier phones
- Mitigation: capability gating + runtime download + cloud quality lane

### R2 — Small local model writes bland or unsafe reflections
- Mitigation: strict output contract + eval set + optional cloud quality mode

### R3 — Architecture leak
- Mitigation: keep provider selection inside orchestrator and adapters only

### R4 — iOS schedule drag
- Mitigation: ship Android-first and keep iOS explicitly out of scope until proven

---

## Recommended First Implementation Slice

If the team wants the smallest slice with real signal:

1. Add `interpretation-orchestrator.ts`
2. Add server cloud proxy using one modern cloud model
3. Replace direct UI dependency on current `aiClient` with orchestrator
4. Add Android local-model capability API as a stubbed contract
5. Wire status UI so product can see `Local`, `Cloud`, or `Fallback`

This creates the architecture seam first, then allows the real local engine to land without rewriting UI again.
