# ADR: Qwen3.5-2B + LiteRT-LM — Local Inference Full Enable

## 1. Title
Replace deprecated MediaPipe LlmInference with LiteRT-LM Engine running Qwen3.5-2B,
adding client-side safety layer and sentence-paced reveal.

## 2. Context

AletheiA's local inference path was built on MediaPipe Tasks GenAI (`LlmInference`),
which Google deprecated March 31, 2026. The model was Gemma 3 1B GGUF — misaligned
with the TypeScript config (which expected Gemma 3n E2B) and weak on Vietnamese.

Additionally, 5 blocking bugs prevented local inference from working at all:
B1 (missing `engine.initialize()` call), B2 (60s OkHttp timeout on 529MB download),
B3 (garbled fallback text), B4 (dead loop in asset extraction), B5 (no shutdown).

After research (June 2026): Qwen3.5-2B chosen for Vietnamese quality (201 languages),
MoE efficiency, and thinking-mode toggle via `/think` soft switch. LiteRT-LM v0.13.0
is the current migration target (official replacement, MTP support, active).

## 3. Decision

Replaced `com.google.mediapipe:tasks-genai` with `com.google.ai.edge.litertlm:litertlm-android:0.13.0`.
Rewrote `LocalInferenceEngine.kt` to use LiteRT-LM `Engine`/`EngineConfig`/`createConversation()` API.
Model changed to Qwen3.5-2B (`Qwen3.5-2B-IT.litertlm`) hosted on GCS `aletheia-models/qwen3.5-2b/`.
`runInference()` now collects full token stream, strips `<think>` block, returns clean `String`.
Added client-side `local-inference-postprocess.ts` porting server's harm patterns and
`finalizeInterpretationText` format normalization. Orchestrator applies post-process on complete
text then reveals via sentence-by-sentence 600ms pacing ("sealed letter" pattern).

Two audit findings fixed as part of this work:
- FM1: `isSafeLocalOutput("")` returns `false` (empty = truncated `<think>`, routes to fallback)
- FM2: `isModelReady()` requires `>= 95%` of expected size, not just file existence
- L2: double-checked locking on `Engine` field (`engineLock + @Volatile`)

Server `OUTPUT_HARM_PATTERNS` bug also fixed: `\b` word boundaries don't work with Vietnamese
Unicode diacritics — removed `\b` from `tự\s*tử` and `tự\s*làm\s*đau` patterns server-side too.

## 4. Status
ACCEPTED

## 5. Consequences

**Improved:**
- Local inference actually works (B1-B5 were blocking, now resolved)
- Vietnamese quality: Qwen3.5-2B with 201 languages vs Gemma 3n/3 1B
- Safety: harm patterns now active on local path (previously bypassed entirely)
- Format quality: closing question always present via `ensureClosingQuestion`
- Thinking mode: `/think` soft switch gives Qwen3.5 CoT depth for reflective tasks
- Server harm patterns fixed for Vietnamese (silent bug, never fired for `tự tử`)
- Framework: migration to non-deprecated LiteRT-LM, access to MTP 2x speedup

**Worsened / Debt created:**
- Kotlin compile-time verification not possible without Android SDK in this environment
  — T4a (HIGH risk task) verified via grep only, not full Gradle compile
- Streaming is simulated (full generate then chunk by sentence) — not true token streaming
- `MODEL_SIZE_BYTES` unconfirmed against actual HF model card (marked ASSUMED)
- GCS bucket `aletheia-models/qwen3.5-2b/` must be populated before beta (operational dep)
- `paulsp94/Qwen3.5-2B-LiteRT-LM` is a community model, not official `litert-community/`

## 6. Alternatives Considered

**DeepSeek-R1-Distill-Qwen-1.5B (recommended by Gemini):** CoT via `<think>` automatic,
~950MB. Rejected: R1 CoT is distilled from math/coding reasoning, not emotional reflection;
Vietnamese quality via multilingual variant but less first-class than Qwen3.5's 201-language
training; ~1.5B smaller model with reasoning overhead vs 2B pure instruct.

**Gemma 4 E2B:** Best LiteRT-LM native integration, native audio. Rejected: weaker Vietnamese
(secondary language), Gemma alignment tax problematic for dark emotional content (refuses/sanitizes
instead of mirror), no audio feature needed for current roadmap.

**Keep MediaPipe + GGUF:** Simplest path. Rejected: MediaPipe deprecated March 2026, no security
patches, model ecosystem support ending. Would require migration eventually regardless.

**True token streaming:** Show tokens as they arrive from LiteRT-LM Flow. Rejected: breaks
"sealed letter" philosophy (chatbot feel), cannot run harm check on partial output, violates
"help users leave lighter, not stay longer" core law.

## 7. Evidence

- 63/63 tests pass (11 test files) `[verified 2026-06-04]`
- `isSafeLocalOutput("")` → `false` (FM1 guard) `[verified 2026-06-04 by test]`
- `isSafeLocalOutput('tôi muốn tự tử')` → `false` (Vietnamese patterns) `[verified 2026-06-04 by test]`
- `finalizeLocalInterpretation('text.')` ends with `*question?*` `[verified 2026-06-04 by test]`
- `LocalInferenceEngine.kt` contains no MediaPipe imports `[verified 2026-06-04 by grep]`
- `litertlm-android:0.13.0` in build.gradle (bumped from planned 0.10.1 — Kotlin 2.3.0 metadata issue), no `mediapipe:tasks-genai` `[verified 2026-06-04]`
- `runInference` returns `String` not `Flow<String>`, no `.collect{}` in AletheiaCoreModule `[verified 2026-06-04 by grep]`
- MediaPipe deprecated March 31, 2026 (Google AI Edge docs) `[verified 2026-06-04 by web research]`
- `litertlm-android` on Maven Central, last release May 18, 2026 `[verified 2026-06-04 by web research]`
- Kotlin Engine initialize/runInference runtime behavior: `[assumed — verify post-deploy on device]`
- `/think` soft switch activates Qwen3.5 thinking mode in LiteRT-LM context: `[assumed — verify on device]`
- GCS CDN bucket populated with model file: `[assumed — operational task not in codebase]`

## 8. Owner
ybao (Nguyen Ba Thi) + Claude Sonnet 4.6

## 8b. Known Debts (PATTERN-DEBT)

- PATTERN-DEBT-litert-kotlin-compile: Kotlin T4a changes not Gradle-compiled in this session.
  Verified by grep only. Needs device build before beta.
  status: OPEN — review before first Android APK build.

- PATTERN-DEBT-model-size-unconfirmed: `EXPECTED_MODEL_SIZE = 1_500_000_000L` is estimated.
  Must verify against `paulsp94/Qwen3.5-2B-LiteRT-LM` HF model card before setting download
  progress and `isModelReady()` threshold.
  status: OPEN — verify before GCS upload.

- PATTERN-DEBT-gcs-bucket-operational: `aletheia-models/qwen3.5-2b/` bucket and files must
  exist before local model download works. No automated check in CI.
  status: OPEN — operational task, blocking beta.

## 9. Next Cycle Trigger

When the first beta APK build succeeds (`pnpm rust:android && pnpm android`) and local model
download completes on a physical Android device with 4GB+ RAM, OR when `MODEL_SIZE_BYTES`
mismatches cause download percentage to display incorrectly (observable via Sentry/analytics
`download_progress` events showing values > 100%).

## 10. Cycle Retrospective

- **Wrong assumption:** LiteRT-LM uses the same `.task` format as MediaPipe. Reality: its own
  `.litertlm` format. Community builds exist but official Qwen3.5-2B not yet in `litert-community/`.
  
- **Surprised by:** Vietnamese `\b` word boundary bug in server's `OUTPUT_HARM_PATTERNS` —
  the server patterns `/\btự\s*tử\b/i` never fire on Vietnamese text because `\b` only works
  with ASCII `\w`. Silent safety gap that required pattern-globalize to fix both client and server.

- **Would design differently:** Start with a thin "model adapter" interface over inference backends
  so switching MediaPipe → LiteRT-LM → llama.cpp doesn't require rewriting the Engine class.
  Current coupling makes future migrations expensive.

- **Debt knowingly created:** Sentence pacing at fixed 600ms doesn't account for sentence length.
  Short sentences feel abrupt; long sentences feel slow. Adaptive pacing (proportional to word
  count) would be better but was out of scope.

- **Signal to watch:** If `inference_failed` analytics events with `reason: "empty_response"`
  appear frequently after beta launch → truncated `<think>` blocks are common → need to raise
  `MAX_TOKENS` in `LocalInferenceEngine` or tune Qwen3.5 prompt for shorter thinking chains.
