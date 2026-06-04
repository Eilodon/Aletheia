---
title: Qwen3.5-2B + LiteRT-LM — Local Inference Full Enable
date: 2026-06-04
author: Claude + ybao
SPEC_APPROVED: true
SPEC_ESCALATION: false
ESCALATION_FINDING: ""
---

# Qwen3.5-2B + LiteRT-LM — Local Inference Full Enable

## Goal

Upgrade AletheiA's on-device inference from the deprecated MediaPipe `LlmInference` API (using
placeholder Gemma 3 1B GGUF) to LiteRT-LM with Qwen3.5-2B (.litertlm format), restoring all 3
server-side quality/safety layers for the local path, and replacing fake character streaming with
a philosophically-aligned sentence-by-sentence reveal.

## Context & Decisions

### Why Qwen3.5-2B

Chosen over alternatives after research (June 2026):
- **201 languages** — Vietnamese first-class, not afterthought
- **MoE architecture** — activates fraction of params per token, efficient on mobile  
- **Non-thinking by default** — thinking mode toggled via `/think` soft switch
- **Wins 3/4 overlap benchmarks** vs Gemma 4 E2B on text tasks
- **~1.2-1.5GB Q4** — fits 6GB+ Android devices
- **LiteRT-LM community build exists**: `paulsp94/Qwen3.5-2B-LiteRT-LM`

### Why LiteRT-LM (mandatory, not optional)

`com.google.mediapipe:tasks-genai` (MediaPipe LLM Inference) was deprecated March 31, 2026.
LiteRT-LM (`com.google.ai.edge.litertlm:litertlm-android`, last release May 18, 2026) is the
official replacement. Not migrating = no security patches, no new model support, eventual removal.

### Display philosophy

"Help users leave lighter, not stay longer." Character streaming creates chatbot expectations and
prevents pre-display safety checking. Chosen approach: collect complete response → safety check →
sentence-by-sentence reveal at ~600ms/sentence. Feels like "words arriving", not "machine typing".

### Streaming architecture

`startLocalInterpretationStream` in Expo module returns IMMEDIATELY (launches background coroutine).
JS side polls every 50ms. No ANR risk. Kotlin collects all LiteRT-LM tokens internally → strips
`<think>` block → sets `done=true`. TypeScript receives complete text, runs postprocess, then
paces sentence reveal via `onChunk` callbacks. Bridge carries one small String, not 1000 tokens.

---

## Architecture Overview

```
[1] lib/constants/local-model.ts     — Qwen3.5-2B config, GCS CDN URLs
[2] build.gradle                      — litertlm-android dep (replaces mediapipe tasks-genai)
[3] LocalInferenceEngine.kt           — LiteRT-LM Engine, <think> stripping, /think prompt
[4] ModelDownloadManager.kt           — GCS URL, .litertlm filename, fix checkForUpdate()
[5] lib/services/local-inference-postprocess.ts  — NEW: harm check + format normalization
[6] lib/services/interpretation-orchestrator.ts  — sentence-by-sentence pacing
```

### Data Flow

```
orchestrator.selectInferenceMode() → "local"
  ↓
aletheiaNativeClient.startLocalInterpretationStream()
  ↓ returns {request_id} IMMEDIATELY — inference on background coroutine
  ↓
LiteRT-LM Engine.createConversation().sendMessageAsync("/think\n\n" + prompt)
  .collect { tokens → buffer }
  ↓ full buffer
stripThinkBlock(buffer) → clean text only
  ↓
session.done = true, session.fullText = cleanText
  ↓
JS polls → receives done=true, full_text
  ↓
finalizeLocalInterpretation(full_text):
  isSafeOutput() → FAIL → source fallback prompts
  finalizeText() → ensureClosingQuestion() + format normalize
  ↓
splitIntoSentences() → emit each via onChunk with 600ms delay
  ↓
UI: breathing animation during load → sentence-by-sentence reveal
```

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/constants/local-model.ts` | Modify | Qwen3.5-2B config, GCS URLs, file format |
| `modules/aletheia-core-module/android/build.gradle` | Modify | LiteRT-LM dep, remove MediaPipe |
| `LocalInferenceEngine.kt` | Rewrite inference section | LiteRT-LM Engine, prompt with /think, strip <think> |
| `ModelDownloadManager.kt` | Modify | GCS URL, .litertlm filename, fix checkForUpdate() |
| `lib/services/local-inference-postprocess.ts` | Create | Safety + format layer, sentence splitter |
| `lib/services/interpretation-orchestrator.ts` | Modify | Sentence pacing for local path |

---

## Section 1: Model Config (`lib/constants/local-model.ts`)

```typescript
export const LOCAL_MODEL_CONFIG = {
  MODEL_ID: 'qwen3.5-2b-instruct',
  MODEL_VERSION: '1.0.0',
  CDN_BASE_URL: 'https://storage.googleapis.com/aletheia-models/qwen3.5-2b',
  FILES: {
    MODEL: 'Qwen3.5-2B-IT.litertlm',
    VERSION: 'version.json',
    CHECKSUM: 'checksum.sha256',
  },
  REQUIREMENTS: {
    MIN_RAM_MB: 3072,          // 3GB RAM minimum for 2B model
    MIN_CPU_CORES: 4,
    MODEL_SIZE_BYTES: 1_500_000_000,  // ~1.5GB (to be confirmed from HF model card)
    ESTIMATED_TPS_LOW: 5.0,
    ESTIMATED_TPS_HIGH: 20.0,
  },
  INFERENCE: {
    MAX_TOKENS: 512,           // Sufficient for 2-part reflection + closing question
    TOP_K: 40,
    TEMPERATURE: 0.7,
    THINKING_ENABLED: true,    // Always /think for local inference
  },
} as const;
```

**Success criterion**: `getModelDownloadUrl()` returns GCS URL for `.litertlm` file.

---

## Section 2: Gradle Dependency (`build.gradle`)

Replace deprecated MediaPipe with LiteRT-LM:

```gradle
// REMOVE:
implementation 'com.google.mediapipe:tasks-genai:0.10.27'

// ADD:
implementation 'com.google.ai.edge.litertlm:litertlm-android:0.10.1'
```

Keep OkHttp, coroutines, JNA — those are unchanged.

**Success criterion**: Android project compiles with LiteRT-LM dependency.

---

## Section 3: LocalInferenceEngine.kt — LiteRT-LM Migration

### 3a. Engine initialization

```kotlin
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig

private var engine: Engine? = null

suspend fun initialize(): Result<Boolean> = withContext(Dispatchers.IO) {
    try {
        if (engine != null) return@withContext Result.success(true)

        val modelFile = getModelFile()
        if (!modelFile.exists() || modelFile.length() == 0L) {
            return@withContext Result.failure(Exception("Model not downloaded. Call downloadModel first."))
        }

        val engineConfig = EngineConfig(
            modelPath = modelFile.absolutePath,
            backend = Backend.CPU(),
            cacheDir = context.cacheDir.path,
        )
        val newEngine = Engine(engineConfig)
        newEngine.initialize()
        engine = newEngine
        Result.success(true)
    } catch (e: Exception) {
        Log.e(TAG, "Failed to initialize LiteRT-LM engine", e)
        Result.failure(e)
    }
}
```

### 3b. runInference — collect full response + strip `<think>`

```kotlin
suspend fun runInference(prompt: String, cancelToken: AtomicBoolean): String =
    withContext(Dispatchers.Default) {
        val e = engine ?: throw Exception("Engine not initialized")
        val buffer = StringBuilder()
        val thinkPrompt = "/think\n\n$prompt"   // soft switch for Qwen3.5 thinking mode

        e.createConversation().use { conversation ->
            conversation.sendMessageAsync(thinkPrompt)
                .catch { ex -> throw ex }
                .collect { chunk ->
                    if (cancelToken.get()) return@collect
                    buffer.append(chunk)
                }
        }

        stripThinkBlock(buffer.toString())
    }

private fun stripThinkBlock(text: String): String {
    val hasOpen = text.contains("<think>")
    val hasClose = text.contains("</think>")

    // Truncated thinking block — incomplete inference, safer to use fallback
    if (hasOpen && !hasClose) {
        return ""  // empty string signals caller to use fallback
    }

    return text.replace(Regex("<think>[\\s\\S]*?</think>"), "").trim()
}
```

### 3c. runInference return value in AletheiaCoreModule.kt

Update `startLocalInterpretationStream` to use the new `suspend fun runInference`:

```kotlin
moduleScope.launch(Dispatchers.Default) {
    val initResult = engine.initialize()
    if (initResult.isFailure) {
        session.done = true; return@launch
    }
    try {
        val cleanText = engine.runInference(prompt, session.cancelToken)
        synchronized(session) {
            if (cleanText.isEmpty()) {
                // Truncated <think> block — signal fallback via error
                session.chunks.add("")
                session.fullText.append("")
            } else {
                session.chunks.add(cleanText)
                session.fullText.append(cleanText)
            }
            session.done = true
        }
    } catch (e: Exception) {
        Log.e("AletheiaCore", "Local inference error", e)
        session.done = true
    }
}
```

### 3d. shutdown

```kotlin
fun shutdown() {
    engine?.close()
    engine = null
}
```

**Success criterion**: `engine.runInference()` returns clean Vietnamese text (no `<think>` tags). Empty string on truncated thinking.

---

## Section 4: ModelDownloadManager.kt

### 4a. Update constants

```kotlin
private const val MODEL_FILENAME = "Qwen3.5-2B-IT.litertlm"
private const val MODEL_DOWNLOAD_URL =
    "https://storage.googleapis.com/aletheia-models/qwen3.5-2b/Qwen3.5-2B-IT.litertlm"
private const val VERSION_CHECK_URL =
    "https://storage.googleapis.com/aletheia-models/qwen3.5-2b/version.json"
private const val EXPECTED_MODEL_SIZE = 1_500_000_000L  // ~1.5GB (update after HF card confirmed)
```

### 4b. Fix checkForUpdate()

```kotlin
suspend fun checkForUpdate(): Result<String?> = withContext(Dispatchers.IO) {
    try {
        val request = Request.Builder().url(VERSION_CHECK_URL).build()  // ← version.json, not model file
        val response = client.newCall(request).execute()
        if (!response.isSuccessful) return@withContext Result.success(null)

        val json = response.body?.string() ?: return@withContext Result.success(null)
        val currentVersion = getCurrentModelVersion()

        // Parse {"version": "1.0.0", ...} format
        val latestVersion = try {
            org.json.JSONObject(json).getString("version")
        } catch (e: Exception) {
            return@withContext Result.success(null)
        }

        Result.success(if (latestVersion != currentVersion) latestVersion else null)
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

**Success criterion**: `checkForUpdate()` hits GCS `version.json`, parses JSON correctly.

---

## Section 5: `lib/services/local-inference-postprocess.ts` (NEW)

Port server-side quality guards to client for local inference path.

```typescript
// Ported from server/_core/interpretationService.ts
// Must stay in sync with server versions — changes to server harm patterns require update here too.

const LOCAL_HARM_PATTERNS: RegExp[] = [
  /\btự\s*tử\b/i,
  /\bsuicide\b/i,
  /\bkill\s+yourself\b/i,
  /\bself[- ]?harm\b/i,
  /\btự\s*làm\s*đau\b/i,
  /\bno\s+way\s+out\b/i,
  /\bkhông\s+có\s+lối\s+thoát\b/i,
  /\bchết\s+thôi\b/i,
];

export function isSafeLocalOutput(text: string): boolean {
  return !LOCAL_HARM_PATTERNS.some((p) => p.test(text));
}

function ensureClosingQuestion(text: string, lang = 'vi'): string {
  const lines = text.trim().split(/\n+/).map(l => l.trim()).filter(Boolean);
  const lastLine = lines[lines.length - 1] ?? '';
  const hasQuestion = /[*_\[]?.+\?[*_\]]?$/.test(lastLine);
  if (hasQuestion) return lines.join('\n\n');
  const q = lang === 'en'
    ? '*What feels most true in you right now?*'
    : '*Lúc này điều gì cần được nhìn rõ hơn?*';
  return `${lines.join('\n\n')}\n\n${q}`;
}

export function finalizeLocalInterpretation(text: string, lang?: string): string {
  const normalized = text
    .trim()
    .replace(/\[([^\]\n]{3,120}\?)\]/g, '*$1*')
    .replace(/\[Câu hỏi\]/gi, '')
    .replace(/\s+\*/g, '\n\n*');
  return ensureClosingQuestion(normalized.trim(), lang);
}

export function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation, preserve Vietnamese diacritics
  return text
    .split(/(?<=[.!?…])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}
```

**Success criterion**: `isSafeLocalOutput('tự tử')` returns `false`. `finalizeLocalInterpretation()` always ends with a `*question?*` line.

---

## Section 6: `interpretation-orchestrator.ts` — Sentence pacing

Replace current local path chunk-forwarding with post-process + sentence-paced reveal:

```typescript
// In streamInterpretation(), local inference path:
// AFTER: const state = await poll until done
// REPLACE the current chunk-forwarding loop with:

const rawText = state.full_text ?? '';

if (!rawText || !isSafeLocalOutput(rawText)) {
  // Harm detected or empty (truncated <think>) → use source fallback
  const fallback = request.sourceFallbackPrompts?.[0]
    ?? (request.sourceLanguage === 'en'
      ? 'Take a moment to sit with these words. What do they stir in you?'
      : 'Hãy ngồi với những từ này một lúc. Điều gì đang rung lên trong bạn?');
  handlers.onChunk?.(fallback, fallback);
  return { chunks: [fallback], usedFallback: true };
}

const finalText = finalizeLocalInterpretation(rawText, request.sourceLanguage);
const sentences = splitIntoSentences(finalText);
let accumulated = '';

for (let i = 0; i < sentences.length; i++) {
  accumulated += (accumulated ? ' ' : '') + sentences[i];
  handlers.onChunk?.(accumulated, sentences[i]!);
  if (i < sentences.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 600));
  }
}

return { chunks: [finalText], usedFallback: false };
```

**Success criterion**: `onChunk` is called once per sentence with 600ms pauses. `full_text` contains complete safe post-processed text.

---

## Error Handling & Fallbacks

| Scenario | Detected | Response |
|---|---|---|
| Model not downloaded | `engine == null \|\| !isModelReady()` | Error `model_not_ready`, orchestrator routes cloud |
| Engine init fail | `initialize().isFailure` | session.done=true with no text, JS sees empty → fallback |
| Truncated `<think>` | `hasOpen && !hasClose` | `stripThinkBlock` returns `""` → harm check catches empty → fallback |
| Harm detected | `isSafeLocalOutput` false | Source fallback prompt, `usedFallback: true` |
| LiteRT inference exception | `catch (e: Exception)` | session.done=true, JS orchestrator catches error → cloud fallback |
| Format missing closing question | `ensureClosingQuestion` | Appends default question |

---

## Not In Scope

- iOS path — still disabled, no Swift bindings linked
- Rust `check_device_capability` / local model stubs — by design, Kotlin handles local inference
- Model upload to GCS — operational task outside codebase
- Streaming architecture change — polling pattern preserved
- UI changes — sentence pacing is purely in orchestrator, no UI component changes needed

---

## Spec Self-Review

**Placeholder scan:** No TBD. Model size `1_500_000_000L` marked "to be confirmed from HF model card" — acceptable, fallback is graceful (downloads more/less than expected, `getModelSize()` returns actual). ✓

**Consistency:** Architecture diagram matches section descriptions. Kotlin `runInference` is now a `suspend fun` — `AletheiaCoreModule.kt` coroutine launches it correctly. ✓

**Scope:** Focused. 6 files, clear boundaries. ✓

**Environment preconditions:**
- GCS bucket `aletheia-models/qwen3.5-2b/` must exist with `Qwen3.5-2B-IT.litertlm` and `version.json`
- This is an OPERATIONAL prerequisite. Without it, `downloadModel` fails → user sees "download error" UI, not crash. Graceful.
- For dev/testing: can use HuggingFace URL directly in `MODEL_DOWNLOAD_URL` temporarily

**Non-stub acceptance criteria:**
- `isSafeLocalOutput` must check real patterns, not return `true` always
- `finalizeLocalInterpretation` must always produce a closing `*question*` line  
- `stripThinkBlock` must return `""` on truncated block, NOT partial text

---

## Risk Assessment (audit-design)
<!-- audit-design: DO NOT DUPLICATE — update this section, do not append a second one -->
<!-- last-run: 2026-06-04 | trigger: NORMAL -->

**Tier:** 2 (Production, user-facing) | **Date:** 2026-06-04

### Failure Modes

1. **Empty string bypasses safety check** — `isSafeLocalOutput("")` returns `true` (no regex matches empty string) → `finalizeLocalInterpretation("")` produces only the fallback closing question with no body → user sees just `*Lúc này điều gì cần được nhìn rõ hơn?*` with no reflection — **HIGH** — mitigation in plan: NO → writing-plans MUST add explicit empty-string guard before `isSafeLocalOutput`

2. **Partial download → corrupt LiteRT-LM load** — interrupted download leaves partial `.litertlm` file on disk → `isModelReady()` checks only `length() > 0` → passes → `Engine.initialize()` attempts to load corrupt file → unspecified crash/exception with no user-facing message — **HIGH** — mitigation in plan: NO → writing-plans MUST add size threshold validation in `isModelReady()` (e.g., `>= EXPECTED_MODEL_SIZE * 0.95`)

3. **Community model `/think` silent non-activation** — `paulsp94/Qwen3.5-2B-LiteRT-LM` is not official. If chat template is not properly preserved, `/think` soft switch may not activate thinking mode → output quality silently degrades to non-thinking baseline — **MEDIUM** — mitigation: log model metadata at init time; add integration test checking `<think>` tag presence in raw output

### Layer Signals

**L1 Logic:** `isSafeLocalOutput("")` returns `true` — empty string guard missing. Add `if (!text.trim()) return false` at start of function (or route to fallback before safety check).

**L2 Concurrency:** `private var engine: Engine?` in `LocalInferenceEngine` — `initialize()` and `shutdown()` can race during app lifecycle. Wrap with `@Synchronized` or `Mutex` on `engine` access.

**L4 Integration:** GCS CDN not validated at startup. If bucket not populated, `downloadModel()` fails with generic OkHttp error. Add startup-time URL reachability hint in error message: "Model server unavailable — check connection."

**L6 Observability:** No analytics event when local inference falls back to cloud silently. Add `trackLocalModelEvent("inference_fallback", { reason })` at each fallback branch in orchestrator.

### Assumptions to Verify

- **ASSUMED**: `MODEL_SIZE_BYTES: 1_500_000_000` — unconfirmed. Verify against `paulsp94/Qwen3.5-2B-LiteRT-LM` HuggingFace model card before release. Wrong value causes premature "already downloaded" state on partial file.
- **ASSUMED**: Community model `paulsp94/Qwen3.5-2B-LiteRT-LM` correctly preserved Qwen3.5 chat template for `/think` activation. Verify with integration test.
- **ASSUMED**: `Backend.CPU()` is sufficient. Devices with GPU (Snapdragon 8-series, Dimensity 9xxx) could use `Backend.GPU()` for 3-5x speedup. Out of scope for beta but flag as known performance gap.
- **ASSUMED**: GCS bucket will be populated before beta. No startup validator — if bucket is empty, users who tap "Download model" get silent failure.

### Abductive Hypotheses

**Abductive 1:** `Engine.createConversation().sendMessageAsync("/think\n\n" + prompt)` — LiteRT-LM may apply Qwen's chat template internally, treating the entire string as user content. The `/think` directive works when placed at the start of the USER TURN in the template, not as raw prepended text. If LiteRT-LM's template wraps the prompt in `<|im_start|>user\n...<|im_end|>`, the `/think` instruction IS in user turn and should activate. But if the model was packaged with a different template, behavior is undefined.

**Abductive 2:** `Backend.CPU()` on Android 12+ with `NNAPI` delegates — LiteRT-LM CPU backend may automatically use NNAPI acceleration on some devices (behavior depends on build flags). On other devices it falls back to pure CPU. This creates unpredictable variance in TPS (5x range) that affects whether inference completes before `AI_STREAM_TIMEOUT_MS` fires. A device that PASSES `DeviceCapabilityDetector.detect()` (supported=true) may still time out in practice.

### Gate Result

**PASS WITH FLAGS** — proceed to `writing-plans`.

`writing-plans` MUST include mitigation tasks for:
- FM1: Add `!text.trim()` guard in `isSafeLocalOutput` (routes empty to fallback, not display)
- FM2: Add size threshold validation in `isModelReady()` — `>= EXPECTED_MODEL_SIZE * 0.95`
- L2: `@Synchronized` or `Mutex` on `engine` field access in `LocalInferenceEngine`
- L6: Add `trackLocalModelEvent("inference_fallback", { reason })` at each fallback branch
