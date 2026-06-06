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
import java.io.FileOutputStream
import java.security.MessageDigest
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/// Local Inference Engine — Qwen3.5-2B via LiteRT-LM
/// Replaces deprecated MediaPipe LlmInference (March 2026).
///
/// Architecture:
/// - Engine initialized once, held in memory for lifetime of module
/// - runInference() collects FULL response, strips <think> block, returns clean String
/// - JS polling architecture preserved — no streaming through JNI boundary
/// - L2 mitigation: double-checked locking on engine field
class LocalInferenceEngine(private val context: Context) {
    companion object {
        private const val TAG = "LocalInferenceEngine"
        private const val MODEL_DIR = "local_models"
        private const val MODEL_FILENAME = "Qwen3.5-2B-IT.litertlm"

        const val MODEL_ID = "qwen3.5-2b-instruct"
        const val REQUIRED_RAM_MB = 3072
        const val ESTIMATED_TPS_LOW = 5.0f
        const val ESTIMATED_TPS_HIGH = 20.0f
        // FM2 mitigation: ~1.5GB expected — verify against paulsp94/Qwen3.5-2B-LiteRT-LM HF card
        const val EXPECTED_MODEL_SIZE_BYTES = 1_500_000_000L
        const val MIN_READY_MODEL_BYTES = EXPECTED_MODEL_SIZE_BYTES * 95 / 100
    }

    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    // L2 mitigation: double-checked locking for engine lifecycle safety
    @Volatile private var engine: Engine? = null
    private val engineLock = Any()

    // ── Model readiness ────────────────────────────────────────────────────────

    /**
     * FM2 mitigation: checks size threshold (95% of expected), not just existence.
     * Prevents loading a partially-downloaded file into LiteRT-LM.
     */
    fun isModelReady(): Boolean {
        val modelFile = getModelFile()
        return modelFile.exists() && modelFile.length() >= MIN_READY_MODEL_BYTES
    }

    private fun getModelFile(): File {
        val dir = File(context.filesDir, MODEL_DIR)
        if (!dir.exists()) dir.mkdirs()
        return File(dir, MODEL_FILENAME)
    }

    // ── Engine lifecycle ───────────────────────────────────────────────────────

    suspend fun initialize(): Result<Boolean> = withContext(Dispatchers.IO) {
        if (engine != null) return@withContext Result.success(true)

        try {
            val modelFile = getModelFile()
            if (!modelFile.exists() || modelFile.length() < MIN_READY_MODEL_BYTES) {
                return@withContext Result.failure(
                    Exception("Model not ready. File: ${modelFile.length()} bytes, expected ~$EXPECTED_MODEL_SIZE_BYTES")
                )
            }

            Log.i(TAG, "Initializing LiteRT-LM Engine: ${modelFile.absolutePath}")
            val engineConfig = EngineConfig(
                modelPath = modelFile.absolutePath,
                backend = Backend.CPU(),
                cacheDir = context.cacheDir.path,
            )
            val newEngine = Engine(engineConfig)
            newEngine.initialize()

            synchronized(engineLock) {
                if (engine == null) {
                    engine = newEngine
                } else {
                    newEngine.close()
                }
            }

            Log.i(TAG, "LiteRT-LM Engine initialized successfully")
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

    // ── Inference ──────────────────────────────────────────────────────────────

    /**
     * Run inference and return the complete clean response with <think> block stripped.
     * Returns empty string if <think> block is truncated (max_tokens hit mid-thinking)
     * — caller should treat empty return as signal to use source fallback prompts.
     *
     * "/think" soft switch activates Qwen3.5-2B's thinking mode.
     */
    suspend fun runInference(prompt: String, cancelToken: AtomicBoolean): String =
        withContext(Dispatchers.IO) {
            val e = synchronized(engineLock) { engine }
                ?: throw Exception("Engine not initialized. Call initialize() first.")

            val buffer = StringBuilder()
            val thinkPrompt = "/think\n\n$prompt"

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
        if (hasOpen && !hasClose) {
            Log.w(TAG, "Truncated <think> block — signaling fallback via empty return")
            return ""
        }
        return text.replace(Regex("<think>[\\s\\S]*?</think>"), "").trim()
    }
}

// ── Model download manager ─────────────────────────────────────────────────────

/// OkHttp-based downloader for the Qwen3.5-2B LiteRT-LM model file from GCS.
class ModelDownloadManager(private val context: Context) {
    companion object {
        private const val TAG = "ModelDownloadManager"
        private const val MODEL_FILENAME = "Qwen3.5-2B-IT.litertlm"
        private const val MODEL_DOWNLOAD_URL =
            "https://storage.googleapis.com/aletheia-models/qwen3.5-2b/Qwen3.5-2B-IT.litertlm"
        private const val VERSION_CHECK_URL =
            "https://storage.googleapis.com/aletheia-models/qwen3.5-2b/version.json"
        private const val MODEL_MANIFEST_URL =
            "https://storage.googleapis.com/aletheia-models/qwen3.5-2b/manifest.json"
        private const val EXPECTED_MODEL_SIZE = 1_500_000_000L
        private const val MIN_READY_MODEL_BYTES = EXPECTED_MODEL_SIZE * 95 / 100
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.SECONDS)   // no read timeout — model is ~1.5GB
        .writeTimeout(0, TimeUnit.SECONDS)
        .build()

    /** Check GCS version.json for an available update. Returns new version string or null. */
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

    fun hasCompleteModel(): Boolean {
        val modelFile = File(File(context.filesDir, "local_models"), MODEL_FILENAME)
        return modelFile.exists() && modelFile.length() >= MIN_READY_MODEL_BYTES
    }

    fun deleteModel(): Boolean {
        val modelFile = File(File(context.filesDir, "local_models"), MODEL_FILENAME)
        return if (modelFile.exists()) modelFile.delete() else true
    }

    private fun computeSha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(1024 * 1024)
            while (true) {
                val read = input.read(buffer)
                if (read == -1) break
                digest.update(buffer, 0, read)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    private suspend fun fetchManifest(): org.json.JSONObject? = withContext(Dispatchers.IO) {
        val urls = listOf(MODEL_MANIFEST_URL, VERSION_CHECK_URL)
        for (url in urls) {
            try {
                val response = client.newCall(Request.Builder().url(url).build()).execute()
                if (!response.isSuccessful) continue
                val json = response.body?.string() ?: continue
                return@withContext org.json.JSONObject(json)
            } catch (_: Exception) {
                continue
            }
        }
        null
    }

    private suspend fun validateManifest(file: File): Result<Unit> = withContext(Dispatchers.IO) {
        val manifest = fetchManifest()
        if (manifest == null) {
            return@withContext if (file.length() >= MIN_READY_MODEL_BYTES) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Downloaded model incomplete: ${file.length()} bytes"))
            }
        }

        val expectedSize = manifest.optLong("size_bytes", manifest.optLong("sizeBytes", 0L))
        if (expectedSize > 0L && file.length() != expectedSize) {
            return@withContext Result.failure(
                Exception("Model size mismatch: ${file.length()} bytes, expected $expectedSize")
            )
        }

        val expectedSha = manifest.optString("sha256", manifest.optString("checksum", "")).lowercase()
        if (expectedSha.isNotBlank()) {
            val actualSha = computeSha256(file)
            if (actualSha != expectedSha) {
                return@withContext Result.failure(Exception("Model sha256 mismatch"))
            }
        }

        Result.success(Unit)
    }

    suspend fun downloadModel(
        progressCallback: (Int) -> Unit,
        cancelToken: AtomicBoolean,
        version: String = "1.0.0"
    ): Result<File> = withContext(Dispatchers.IO) {
        var downloadedBytes = 0L
        try {
            val dir = File(context.filesDir, "local_models")
            if (!dir.exists()) dir.mkdirs()
            val modelFile = File(dir, MODEL_FILENAME)
            val tempFile = File(dir, "$MODEL_FILENAME.tmp")

            if (modelFile.exists() && modelFile.length() >= MIN_READY_MODEL_BYTES) {
                Log.i(TAG, "Model already downloaded: ${modelFile.absolutePath}")
                return@withContext Result.success(modelFile)
            }

            var existingBytes = if (tempFile.exists()) tempFile.length() else 0L
            Log.i(TAG, "Starting model download from $MODEL_DOWNLOAD_URL at byte $existingBytes")
            val requestBuilder = Request.Builder().url(MODEL_DOWNLOAD_URL)
            if (existingBytes > 0L) {
                requestBuilder.header("Range", "bytes=$existingBytes-")
            }
            val request = requestBuilder.build()
            val response = client.newCall(request).execute()

            if (!response.isSuccessful) {
                return@withContext Result.failure(Exception("Download failed: HTTP ${response.code}"))
            }
            if (existingBytes > 0L && response.code != 206) {
                Log.w(TAG, "Resume requested but backend did not return HTTP 206; restarting download")
                tempFile.delete()
                existingBytes = 0L
            }

            val body: ResponseBody = response.body
                ?: return@withContext Result.failure(Exception("Empty response body"))
            val contentLength = body.contentLength()
            val expectedTotalBytes = if (contentLength > 0) contentLength + existingBytes else EXPECTED_MODEL_SIZE

            FileOutputStream(tempFile, true).use { out ->
                body.byteStream().use { input ->
                    val buffer = ByteArray(8192)
                    var totalRead = existingBytes
                    while (true) {
                        if (cancelToken.get()) {
                            return@withContext Result.failure(Exception("Download cancelled"))
                        }
                        val read = input.read(buffer)
                        if (read == -1) break
                        out.write(buffer, 0, read)
                        totalRead += read
                        downloadedBytes = totalRead
                        val progress = if (expectedTotalBytes > 0) {
                            ((totalRead * 100) / expectedTotalBytes).toInt()
                        } else {
                            ((totalRead * 100) / EXPECTED_MODEL_SIZE).toInt().coerceAtMost(99)
                        }
                        withContext(Dispatchers.Main) { progressCallback(progress) }
                    }
                }
            }

            if (!tempFile.exists() || tempFile.length() < MIN_READY_MODEL_BYTES) {
                val actualBytes = if (tempFile.exists()) tempFile.length() else 0L
                tempFile.delete()
                return@withContext Result.failure(
                    Exception("Downloaded model incomplete: $actualBytes bytes, expected at least $MIN_READY_MODEL_BYTES")
                )
            }

            val manifestValidation = validateManifest(tempFile)
            if (manifestValidation.isFailure) {
                tempFile.delete()
                return@withContext Result.failure(
                    manifestValidation.exceptionOrNull() ?: Exception("Model manifest validation failed")
                )
            }

            if (modelFile.exists() && !modelFile.delete()) {
                tempFile.delete()
                return@withContext Result.failure(Exception("Could not replace existing model file"))
            }

            if (!tempFile.renameTo(modelFile)) {
                tempFile.delete()
                return@withContext Result.failure(Exception("Could not finalize model download"))
            }

            if (modelFile.length() < MIN_READY_MODEL_BYTES) {
                modelFile.delete()
                return@withContext Result.failure(
                    Exception("Final model file failed validation: ${modelFile.length()} bytes")
                )
            }

            File(dir, "version.txt").writeText(version)
            Log.i(TAG, "Model downloaded: ${modelFile.absolutePath} (${modelFile.length()} bytes)")
            Result.success(modelFile)
        } catch (e: Exception) {
            Log.e(TAG, "Download failed after $downloadedBytes bytes", e)
            val dir = File(context.filesDir, "local_models")
            File(dir, "$MODEL_FILENAME.tmp").delete()
            Result.failure(e)
        }
    }
}
