# Qwen3.5-2B + LiteRT-LM — Local Inference Full Enable

> **For agentic workers:** Use `executing-plans` to implement this plan task-by-task.

**Goal:** Replace deprecated MediaPipe LlmInference with LiteRT-LM Engine, swap model to
Qwen3.5-2B with `/think` CoT, and add client-side safety + sentence-paced reveal.

**Architecture:** Kotlin polling pattern preserved. Kotlin collects full LiteRT-LM response,
strips `<think>` block, sets done=true. TypeScript runs harm check + format normalization, then
paces sentence-by-sentence reveal at 600ms/sentence via existing onChunk interface.

**Tech Stack:** Kotlin, LiteRT-LM v0.13.0 (`com.google.ai.edge.litertlm:litertlm-android`),
TypeScript, Vitest.

**Audit Gate:** PASS WITH FLAGS — FM1 (empty-string bypass), FM2 (partial download crash),
L2 (engine mutex) fully mitigated in this plan.

**Risk Flags:** T4a (LiteRT-LM Engine core migration) is HIGH — requires Kotlin compile
verification at each step.

---

## File Map

| File | Action |
|---|---|
| `lib/constants/local-model.ts` | Modify — Qwen3.5-2B config, GCS URLs |
| `modules/aletheia-core-module/android/build.gradle` | Modify — add litertlm-android, remove mediapipe tasks-genai |
| `modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/LocalInferenceEngine.kt` | Rewrite inference section |
| `modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/ModelDownloadManager.kt` | Modify URLs + fix checkForUpdate |
| `modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/AletheiaCoreModule.kt` | Modify — adapt to new runInference String return |
| `lib/services/local-inference-postprocess.ts` | Create — safety, format, sentence splitter |
| `lib/services/interpretation-orchestrator.ts` | Modify — sentence pacing + fallback analytics |
| `tests/local-inference-postprocess.test.ts` | Create — unit tests for safety + format |

---

### Task 1: Model config — Qwen3.5-2B constants

**Files:**
- Modify: `lib/constants/local-model.ts` (full rewrite)

ℹ️ MEDIUM: GCS bucket `aletheia-models/qwen3.5-2b/` must exist before this goes to beta.
Dev path: use HuggingFace URL temporarily for testing.

- [ ] **Step 1: Rewrite `lib/constants/local-model.ts`**

```typescript
/**
 * Local AI Model Configuration — Qwen3.5-2B (LiteRT-LM format)
 * CDN: GCS storage.googleapis.com/aletheia-models/qwen3.5-2b/
 * Source model: paulsp94/Qwen3.5-2B-LiteRT-LM (HuggingFace)
 * MODEL_SIZE_BYTES: verify against HF model card before beta release.
 */
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
    MIN_RAM_MB: 3072,
    MIN_CPU_CORES: 4,
    MODEL_SIZE_BYTES: 1_500_000_000,   // ~1.5GB — VERIFY from HF model card
    ESTIMATED_TPS_LOW: 5.0,
    ESTIMATED_TPS_HIGH: 20.0,
  },
  INFERENCE: {
    MAX_TOKENS: 512,
    TOP_K: 40,
    TEMPERATURE: 0.7,
    THINKING_ENABLED: true,
  },
} as const;

export function getModelFileUrl(filename: string): string {
  return `${LOCAL_MODEL_CONFIG.CDN_BASE_URL}/${filename}`;
}

export function getModelDownloadUrl(): string {
  return getModelFileUrl(LOCAL_MODEL_CONFIG.FILES.MODEL);
}

export function getVersionCheckUrl(): string {
  return getModelFileUrl(LOCAL_MODEL_CONFIG.FILES.VERSION);
}

export interface ModelVersionInfo {
  version: string;
  releaseDate: string;
  checksum: string;
  sizeBytes: number;
  minAppVersion: string;
  changelog?: string;
}

export function parseVersionInfo(json: string): ModelVersionInfo | null {
  try {
    const data = JSON.parse(json);
    return {
      version: data.version ?? '0.0.0',
      releaseDate: data.releaseDate ?? data.release_date ?? '',
      checksum: data.checksum ?? '',
      sizeBytes: data.sizeBytes ?? data.size_bytes ?? 0,
      minAppVersion: data.minAppVersion ?? data.min_app_version ?? '0.0.0',
      changelog: data.changelog,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**
```bash
pnpm check 2>&1 | grep "local-model"
```
Expected: no errors on `lib/constants/local-model.ts`

- [ ] **Step 3: Commit**
```
git commit -m "feat(local-model): Qwen3.5-2B config — GCS CDN, .litertlm format"
```

---

### Task 2: TypeScript post-processing layer (NEW)

**Files:**
- Create: `lib/services/local-inference-postprocess.ts`
- Create: `tests/local-inference-postprocess.test.ts`

FM1 mitigation is in `isSafeLocalOutput`: empty string returns `false` (routes to fallback, not display).

- [ ] **Step 1: Write failing tests**

```typescript
// tests/local-inference-postprocess.test.ts
import { describe, it, expect } from 'vitest';
import {
  isSafeLocalOutput,
  finalizeLocalInterpretation,
  splitIntoSentences,
} from '../lib/services/local-inference-postprocess';

describe('isSafeLocalOutput', () => {
  it('returns false for empty string (FM1 guard)', () => {
    expect(isSafeLocalOutput('')).toBe(false);
    expect(isSafeLocalOutput('   ')).toBe(false);
  });

  it('returns false for Vietnamese suicide pattern', () => {
    expect(isSafeLocalOutput('tôi muốn tự tử')).toBe(false);
    expect(isSafeLocalOutput('Tự   tử là lối thoát')).toBe(false);
  });

  it('returns false for English harm patterns', () => {
    expect(isSafeLocalOutput('you should kill yourself')).toBe(false);
    expect(isSafeLocalOutput('there is no way out')).toBe(false);
    expect(isSafeLocalOutput('self-harm is a response')).toBe(false);
  });

  it('returns false for chết thôi', () => {
    expect(isSafeLocalOutput('chết thôi, không còn gì nữa')).toBe(false);
  });

  it('returns true for safe reflective content', () => {
    expect(isSafeLocalOutput('Điều này đang mời bạn dừng lại và nhìn rõ hơn.')).toBe(true);
    expect(isSafeLocalOutput('What does this symbol mean to you?')).toBe(true);
  });
});

describe('finalizeLocalInterpretation', () => {
  it('adds closing question when missing', () => {
    const result = finalizeLocalInterpretation('Một suy nghĩ đơn giản.');
    expect(result).toMatch(/\*[^*]+\?[^*]*\*$/);
  });

  it('preserves existing closing question', () => {
    const input = 'Suy nghĩ.\n\n*Điều gì đang cần được nhìn rõ?*';
    const result = finalizeLocalInterpretation(input);
    expect(result).toBe(input);
    // Must not add a second question
    const questionCount = (result.match(/\*/g) ?? []).length;
    expect(questionCount).toBe(2); // one opening, one closing *
  });

  it('normalizes [question] format to *question*', () => {
    const input = 'Body text.\n\n[Điều gì quan trọng?]';
    const result = finalizeLocalInterpretation(input);
    expect(result).toContain('*Điều gì quan trọng?*');
    expect(result).not.toContain('[');
  });
});

describe('splitIntoSentences', () => {
  it('splits on sentence-ending punctuation', () => {
    const text = 'Câu đầu tiên. Câu thứ hai! Câu thứ ba?';
    const sentences = splitIntoSentences(text);
    expect(sentences).toHaveLength(3);
    expect(sentences[0]).toBe('Câu đầu tiên.');
  });

  it('handles single sentence', () => {
    expect(splitIntoSentences('Một câu.')).toEqual(['Một câu.']);
  });

  it('filters empty entries', () => {
    expect(splitIntoSentences('')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**
```bash
pnpm test -- --run tests/local-inference-postprocess.test.ts 2>&1 | tail -5
```
Expected: FAIL (file not found)

- [ ] **Step 3: Create `lib/services/local-inference-postprocess.ts`**

```typescript
// Ported from server/_core/interpretationService.ts — keep in sync with server versions.
// Changes to server OUTPUT_HARM_PATTERNS require update here too.

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

/** FM1 mitigation: empty string returns false → routes to fallback, never displayed. */
export function isSafeLocalOutput(text: string): boolean {
  if (!text.trim()) return false;
  return !LOCAL_HARM_PATTERNS.some((p) => p.test(text));
}

function ensureClosingQuestion(text: string, lang = 'vi'): string {
  const lines = text.trim().split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const lastLine = lines[lines.length - 1] ?? '';
  if (/[*_\[]?.+\?[*_\]]?$/.test(lastLine)) return lines.join('\n\n');
  const q = lang === 'en'
    ? '*What feels most true in you right now?*'
    : '*Lúc này điều gì cần được nhìn rõ hơn?*';
  return `${lines.join('\n\n')}\n\n${q}`;
}

/** Port of server finalizeInterpretationText — normalize format + ensure closing question. */
export function finalizeLocalInterpretation(text: string, lang?: string): string {
  const normalized = text
    .trim()
    .replace(/\[([^\]\n]{3,120}\?)\]/g, '*$1*')
    .replace(/\[Câu hỏi\]/gi, '')
    .replace(/\s+\*/g, '\n\n*');
  return ensureClosingQuestion(normalized.trim(), lang);
}

/** Split finalized text into sentence-level chunks for paced reveal. */
export function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
```

- [ ] **Step 4: Run — verify PASS**
```bash
pnpm test -- --run tests/local-inference-postprocess.test.ts 2>&1 | tail -5
```
Expected: all tests PASS

- [ ] **Step 5: Commit**
```
git commit -m "feat(local-inference): postprocess layer — harm check, format, sentence splitter"
```

---

### Task 3: Gradle dependency migration

**Files:**
- Modify: `modules/aletheia-core-module/android/build.gradle`

ℹ️ MEDIUM: Pin LiteRT-LM to `0.13.0` instead of `latest.release` to prevent silent API breaks.

- [ ] **Step 1: Edit build.gradle**

```gradle
plugins {
  id 'com.android.library'
  id 'expo-module-gradle-plugin'
}

group = 'space.manus.aletheia'
version = '0.0.1'

android {
  namespace "expo.modules.aletheiacore"

  defaultConfig {
    versionCode 1
    versionName '0.0.1'
  }

  sourceSets {
    main {
      java.srcDirs += [
        file("$projectDir/../.native-staging/android/uniffi"),
      ]
    }
  }
}

dependencies {
  implementation 'com.facebook.react:react-android'
  implementation 'net.java.dev.jna:jna:5.14.0@aar'
  
  // LiteRT-LM for on-device LLM inference (replaces deprecated mediapipe:tasks-genai)
  implementation 'com.google.ai.edge.litertlm:litertlm-android:0.13.0'
  
  // OkHttp for model downloads
  implementation 'com.squareup.okhttp3:okhttp:4.12.0'
  
  // Kotlin coroutines
  implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0'
}
```

- [ ] **Step 2: Verify build.gradle parses correctly**
```bash
grep "litertlm\|mediapipe" modules/aletheia-core-module/android/build.gradle
```
Expected: only `litertlm-android:0.13.0` appears, no `mediapipe` line.

- [ ] **Step 3: Commit**
```
git commit -m "chore(android): LiteRT-LM 0.13.0 — remove deprecated mediapipe tasks-genai"
```

---

### Task 4a: LiteRT-LM Engine core migration ⚠️ HIGH

**Files:**
- Modify: `LocalInferenceEngine.kt` — replace LlmInference with Engine, all imports

This task changes only the engine initialization and lifecycle. runInference signature is
changed in T4b. Do NOT combine with other T4 tasks.

- [ ] **Step 1: Update imports and Engine field**

Replace the top of `LocalInferenceEngine.kt` (class body, remove MediaPipe, add LiteRT-LM):

```kotlin
package expo.modules.aletheiacore

import android.content.Context
import android.util.Log
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.ResponseBody
import java.io.File
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class LocalInferenceEngine(private val context: Context) {
    companion object {
        private const val TAG = "LocalInferenceEngine"
        private const val MODEL_DIR = "local_models"
        private const val MODEL_FILENAME = "Qwen3.5-2B-IT.litertlm"

        const val MODEL_ID = "qwen3.5-2b-instruct"
        const val REQUIRED_RAM_MB = 3072
        const val ESTIMATED_TPS_LOW = 5.0f
        const val ESTIMATED_TPS_HIGH = 20.0f
        private const val EXPECTED_MODEL_SIZE = 1_500_000_000L
    }

    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    // L2 mitigation: double-checked locking for engine field
    @Volatile private var engine: Engine? = null
    private val engineLock = Any()
```

- [ ] **Step 2: Rewrite `initialize()` with LiteRT-LM Engine**

```kotlin
    /** FM2 mitigation: isModelReady checks size threshold, not just existence. */
    fun isModelReady(): Boolean {
        val modelFile = getModelFile()
        return modelFile.exists() && modelFile.length() >= EXPECTED_MODEL_SIZE * 95 / 100
    }

    suspend fun initialize(): Result<Boolean> = withContext(Dispatchers.IO) {
        // Fast path — already initialized
        if (engine != null) return@withContext Result.success(true)

        try {
            val modelFile = getModelFile()
            if (!modelFile.exists() || modelFile.length() < EXPECTED_MODEL_SIZE * 95 / 100) {
                return@withContext Result.failure(
                    Exception("Model not ready. File: ${modelFile.length()} bytes, expected ~$EXPECTED_MODEL_SIZE")
                )
            }

            Log.i(TAG, "Initializing LiteRT-LM Engine: ${modelFile.absolutePath}")
            val engineConfig = EngineConfig(
                modelPath = modelFile.absolutePath,
                backend = Backend.CPU(),
                cacheDir = context.cacheDir.path,
            )
            val newEngine = Engine(engineConfig)
            newEngine.initialize()  // blocking — called on IO dispatcher

            // L2 mitigation: double-checked locking
            synchronized(engineLock) {
                if (engine == null) {
                    engine = newEngine
                } else {
                    newEngine.close()  // another thread beat us to initialization
                }
            }

            Log.i(TAG, "LiteRT-LM Engine initialized")
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize LiteRT-LM engine", e)
            Result.failure(e)
        }
    }

    fun shutdown() {
        synchronized(engineLock) {
            engine?.close()
            engine = null
        }
        scope.cancel()
    }
```

- [ ] **Step 3: Verify Kotlin compiles (Gradle sync)**
```bash
# If Android SDK available:
cd /home/ybao/B.1/AletheiA/android && ./gradlew :aletheia-core-module:compileDebugKotlin 2>&1 | tail -20
# If not: verify imports by checking no MediaPipe import remains
grep -n "mediapipe\|LlmInference" modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/LocalInferenceEngine.kt
```
Expected: no `mediapipe` or `LlmInference` references in the file.

- [ ] **Step 4: Commit**
```
git commit -m "feat(android): LiteRT-LM Engine — replace deprecated LlmInference, FM2+L2 guards"
```

---

### Task 4b: runInference — collect full response, suspend fun

**Files:**
- Modify: `LocalInferenceEngine.kt` — add runInference + stripThinkBlock

ℹ️ MEDIUM: This changes the public API from `Flow<String>` to `suspend fun String`.
T4c (AletheiaCoreModule) must update call site AFTER this task.

- [ ] **Step 1: Add runInference and stripThinkBlock to LocalInferenceEngine**

```kotlin
    /**
     * Run inference and return the complete clean response (think block stripped).
     * Returns empty string if <think> block is truncated — caller should use fallback.
     */
    suspend fun runInference(prompt: String, cancelToken: AtomicBoolean): String =
        withContext(Dispatchers.IO) {
            val e = synchronized(engineLock) { engine }
                ?: throw Exception("Engine not initialized. Call initialize() first.")

            val buffer = StringBuilder()
            val thinkPrompt = "/think\n\n$prompt"  // Qwen3.5 soft switch for thinking mode

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

        // Truncated thinking block — incomplete inference, use empty to signal fallback
        if (hasOpen && !hasClose) {
            Log.w(TAG, "Truncated <think> block detected — signaling fallback")
            return ""
        }

        return text.replace(Regex("<think>[\\s\\S]*?</think>"), "").trim()
    }

    private fun getModelFile(): File {
        val dir = File(context.filesDir, MODEL_DIR)
        if (!dir.exists()) dir.mkdirs()
        return File(dir, MODEL_FILENAME)
    }
}  // end class LocalInferenceEngine
```

- [ ] **Step 2: Verify no old runInference (Flow-returning) remains**
```bash
grep -n "fun runInference\|Flow<String>" modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/LocalInferenceEngine.kt
```
Expected: one `suspend fun runInference` returning `String`, no `Flow<String>`.

- [ ] **Step 3: Commit**
```
git commit -m "feat(android): runInference returns String — collect full response, strip think block"
```

---

### Task 4c: ModelDownloadManager — GCS URL + fix checkForUpdate

**Files:**
- Modify: `LocalInferenceEngine.kt` — ModelDownloadManager class constants and checkForUpdate

- [ ] **Step 1: Update ModelDownloadManager constants and checkForUpdate**

Replace ModelDownloadManager companion object and checkForUpdate:

```kotlin
class ModelDownloadManager(private val context: Context) {
    companion object {
        private const val TAG = "ModelDownloadManager"
        private const val MODEL_FILENAME = "Qwen3.5-2B-IT.litertlm"
        private const val MODEL_DOWNLOAD_URL =
            "https://storage.googleapis.com/aletheia-models/qwen3.5-2b/Qwen3.5-2B-IT.litertlm"
        private const val VERSION_CHECK_URL =
            "https://storage.googleapis.com/aletheia-models/qwen3.5-2b/version.json"
        private const val EXPECTED_MODEL_SIZE = 1_500_000_000L
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.SECONDS)   // no read timeout — model is ~1.5GB
        .writeTimeout(0, TimeUnit.SECONDS)
        .build()

    /** Check GCS version.json for available update. Returns new version string or null. */
    suspend fun checkForUpdate(): Result<String?> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder().url(VERSION_CHECK_URL).build()
            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return@withContext Result.success(null)

            val json = response.body?.string() ?: return@withContext Result.success(null)
            val currentVersion = getCurrentModelVersion()

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

    private fun getCurrentModelVersion(): String {
        val versionFile = File(context.filesDir, "local_models/version.txt")
        return if (versionFile.exists()) versionFile.readText().trim() else "0.0.0"
    }

    fun getModelSize(): Long {
        val modelFile = File(File(context.filesDir, "local_models"), MODEL_FILENAME)
        return if (modelFile.exists()) modelFile.length() else 0L
    }

    fun deleteModel(): Boolean {
        val modelFile = File(File(context.filesDir, "local_models"), MODEL_FILENAME)
        return if (modelFile.exists()) modelFile.delete() else true
    }

    // downloadModel() method — keep existing OkHttp streaming implementation,
    // only URL and filename need updating (done by companion constants above).
}
```

- [ ] **Step 2: Verify URL constants**
```bash
grep -n "MODEL_DOWNLOAD_URL\|VERSION_CHECK_URL\|MODEL_FILENAME" modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/LocalInferenceEngine.kt | head -10
```
Expected: GCS URLs with `.litertlm` filename.

- [ ] **Step 3: Commit**
```
git commit -m "fix(android): ModelDownloadManager GCS URL + checkForUpdate() uses version.json"
```

---

### Task 5: AletheiaCoreModule — adapt to runInference String return

**Files:**
- Modify: `AletheiaCoreModule.kt` lines ~408-440 (startLocalInterpretationStream coroutine body)

ℹ️ MEDIUM: This changes how inference result is consumed. Cloud path (Rust UniFFI) is
unchanged — only the local path coroutine body changes.

- [ ] **Step 1: Update inference coroutine in startLocalInterpretationStream**

Replace the inference coroutine body:

```kotlin
    // Launch inference in background — initialize engine first (idempotent)
    moduleScope.launch(kotlinx.coroutines.Dispatchers.Default) {
      val initResult = engine.initialize()
      if (initResult.isFailure) {
        Log.e("AletheiaCore", "Engine init failed: ${initResult.exceptionOrNull()?.message}")
        session.done = true
        return@launch
      }
      try {
        // runInference is now suspend fun returning String (think block already stripped)
        val cleanText = engine.runInference(prompt, session.cancelToken)
        synchronized(session) {
          if (cleanText.isNotEmpty()) {
            session.chunks.add(cleanText)
            session.fullText.append(cleanText)
          }
          // Empty = truncated <think> — session.done=true with no text signals fallback
          session.done = true
        }
      } catch (e: Exception) {
        Log.e("AletheiaCore", "Local inference error", e)
        session.done = true
      }
    }
```

- [ ] **Step 2: Verify no .collect{} on runInference remains**
```bash
grep -n "runInference\|\.collect" modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/AletheiaCoreModule.kt | grep -v "pollInterpretationStream"
```
Expected: `engine.runInference(prompt, session.cancelToken)` — no `.collect {}`.

- [ ] **Step 3: Commit**
```
git commit -m "feat(android): AletheiaCoreModule adapts to runInference String return"
```

---

### Task 6: Orchestrator — sentence pacing + fallback analytics

**Files:**
- Modify: `lib/services/interpretation-orchestrator.ts`

- [ ] **Step 1: Add import at top of orchestrator**

```typescript
import {
  isSafeLocalOutput,
  finalizeLocalInterpretation,
  splitIntoSentences,
} from './local-inference-postprocess';
import { trackLocalModelEvent } from '@/lib/analytics';
```

- [ ] **Step 2: Replace local inference result handling in streamInterpretation**

Find the block that currently handles `state.done`:
```typescript
// FIND (approximately lines 340-349 in current file):
if (state.done || state.cancelled) {
  return {
    chunks: state.full_text ? [state.full_text] : chunks,
    usedFallback: false,
  };
}
```

Replace with:
```typescript
if (state.done || state.cancelled) {
  const rawText = state.full_text ?? '';

  // FM1 guard + harm check — empty or harmful → source fallback
  if (!isSafeLocalOutput(rawText)) {
    const reason = !rawText.trim() ? 'empty_response' : 'harm_detected';
    trackLocalModelEvent('inference_fallback', { reason });  // L6 observability
    const fallback = request.sourceFallbackPrompts?.[0]
      ?? (request.sourceLanguage === 'en'
        ? 'Take a moment to sit with these words. What do they stir in you?'
        : 'Hãy ngồi với những từ này một lúc. Điều gì đang rung lên trong bạn?');
    handlers.onChunk?.(fallback, fallback);
    return { chunks: [fallback], usedFallback: true };
  }

  // Format normalization
  const finalText = finalizeLocalInterpretation(rawText, request.sourceLanguage);

  // Sentence-by-sentence reveal at 600ms/sentence ("sealed letter" pattern)
  const sentences = splitIntoSentences(finalText);
  let accumulated = '';
  for (let i = 0; i < sentences.length; i++) {
    accumulated += (accumulated ? ' ' : '') + sentences[i];
    handlers.onChunk?.(accumulated, sentences[i]!);
    if (i < sentences.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }

  return { chunks: [finalText], usedFallback: false };
}
```

- [ ] **Step 3: Verify TypeScript compiles**
```bash
pnpm check 2>&1 | grep "interpretation-orchestrator\|local-inference-postprocess"
```
Expected: no errors.

- [ ] **Step 4: Run postprocess tests still pass**
```bash
pnpm test -- --run tests/local-inference-postprocess.test.ts 2>&1 | tail -5
```
Expected: all PASS.

- [ ] **Step 5: Commit**
```
git commit -m "feat(orchestrator): sentence-paced local reveal + harm fallback + fallback analytics"
```

---

### Task 7: Integration validation

- [ ] **Step 1: Full test suite**
```bash
pnpm test -- --run 2>&1 | tail -10
```
Expected: all tests pass including `tests/local-inference-postprocess.test.ts`.

- [ ] **Step 2: TypeScript check (no new errors)**
```bash
pnpm check 2>&1 | grep -v "onboarding-passage-preview" | head -10
```
Expected: only pre-existing `EasingFunctionFactory` error, nothing new.

- [ ] **Step 3: Architecture contracts**
```bash
node scripts/verify-architecture.mjs 2>&1 | tail -5
```
Expected: PASS.

- [ ] **Step 4: Final commit**
```
git commit -m "chore: verify Qwen3.5-2B + LiteRT-LM integration — all checks pass"
```

---

## Task Risk Summary (task-risk-score)
<!-- task-risk-score: DO NOT DUPLICATE — update this section -->
<!-- last-run: 2026-06-04 | formula: (S×B)/D | threshold: HIGH ≥ 6 -->

| Task | S×B/D | QBR | Risk | Boundary | Action |
|---|---|---|---|---|---|
| T1 model-config | 2×2/1 | 4 | MEDIUM | SINGLE | GCS bucket operational dep — verify before beta |
| T2 postprocess-ts | 3×2/3 | 2 | LOW | SINGLE | Unit tests cover all harm patterns |
| T3 build-gradle | 2×3/2 | 3 | MEDIUM | SINGLE | Pin to 0.13.0 not latest.release |
| T4a Engine migration | 3×3/1 | 9 | **HIGH ⚠️** | SINGLE | Verify no MediaPipe import; Kotlin compile check |
| T4b runInference sig | 2×2/1 | 4 | MEDIUM | SINGLE | Verify no .collect{} remains |
| T4c ModelDownloadMgr | 2×2/2 | 2 | LOW | SINGLE | — |
| T5 module-adapter | 3×2/2 | 3 | MEDIUM | SINGLE | — |
| T6 orchestrator | 2×2/2 | 2 | LOW | SINGLE | — |
| T7 integration | SKIP | — | SKIP | — | Verification only |

**Summary:**
- High-risk tasks: T4a (LiteRT-LM Engine migration) — native library, device-only verification
- Cross-boundary tasks: none — single-team ownership throughout
- Integration test surface: T4a, T4b (require device build to fully verify)
- Operational dependency: GCS bucket `aletheia-models/qwen3.5-2b/` must be populated before beta (not in code, must be done manually)
