package expo.modules.aletheiacore

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import uniffi.aletheia.AletheiaCore
import uniffi.aletheia.BridgeError
import uniffi.aletheia.ChosenPassage
import uniffi.aletheia.ChooseSymbolResponse
import uniffi.aletheia.CompleteReadingResponse
import uniffi.aletheia.CompletedReading
import uniffi.aletheia.MoodTag
import uniffi.aletheia.PerformReadingResponse
import uniffi.aletheia.Passage
import uniffi.aletheia.InterpretationStreamState
import uniffi.aletheia.RequestInterpretationResponse
import uniffi.aletheia.Reading
import uniffi.aletheia.ReadingSession
import uniffi.aletheia.RedeemGiftResponse
import uniffi.aletheia.CreateGiftResponse
import uniffi.aletheia.PaginatedReadings
import uniffi.aletheia.PaginatedReadingsResponse
import uniffi.aletheia.NotificationMessage
import uniffi.aletheia.NotificationMessageResponse
import uniffi.aletheia.SeedBundledDataResponse
import uniffi.aletheia.SetApiKeyResponse
import uniffi.aletheia.ReadingResponse
import uniffi.aletheia.SourcesResponse
import uniffi.aletheia.StartInterpretationStreamResponse
import uniffi.aletheia.Source
import uniffi.aletheia.SubscriptionTier
import uniffi.aletheia.Symbol
import uniffi.aletheia.SymbolMethod
import uniffi.aletheia.Theme
import uniffi.aletheia.Tradition
import uniffi.aletheia.UserState
import uniffi.aletheia.UserStateResponse
import uniffi.aletheia.UpdateUserStateResponse
import uniffi.aletheia.CancelInterpretationResponse
// Local model types are handled natively in Kotlin
import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

private data class AletheiaCoreBridgeError(
  val code: String,
  val message: String
) {
  fun serialize(): Map<String, Any> = mapOf(
    "code" to code,
    "message" to message
  )
}

private interface AletheiaCoreClient {
  fun initialize(dbPath: String, giftBackendUrl: String)
  fun bootstrapBundledContent(): Map<String, Any?>
  fun setApiKey(provider: String, key: String): Map<String, Any?>
  fun performReading(
    userId: String,
    sourceId: String?,
    situationText: String?
  ): Map<String, Any?>
  fun seedBundledData(
    sourcesJson: String,
    passagesJson: String,
    themesJson: String
  ): Map<String, Any?>

  fun chooseSymbol(
    session: Map<String, Any?>,
    symbolId: String,
    method: String
  ): Map<String, Any?>

  fun completeReading(
    userId: String,
    reading: Map<String, Any?>
  ): Map<String, Any?>
  fun requestInterpretation(
    passage: Map<String, Any?>,
    symbol: Map<String, Any?>,
    situationText: String?
  ): Map<String, Any?>
  fun startInterpretationStream(
    passage: Map<String, Any?>,
    symbol: Map<String, Any?>,
    situationText: String?,
    userIntent: String?
  ): Map<String, Any?>
  fun pollInterpretationStream(requestId: String): Map<String, Any?>
  fun cancelInterpretationStream(requestId: String): Map<String, Any?>

  fun getFallbackPrompts(sourceId: String): Map<String, Any?>
  fun getUserState(userId: String): Map<String, Any?>
  fun updateUserState(state: Map<String, Any?>): Map<String, Any?>
  fun getSources(premiumAllowed: Boolean): Map<String, Any?>
  fun getReadings(limit: Int, offset: Int): Map<String, Any?>
  fun getReadingById(id: String): Map<String, Any?>
  fun updateReadingFlags(id: String, flags: Map<String, Any?>): Map<String, Any?>
  fun getDailyNotificationMessage(userId: String, date: String): Map<String, Any?>
  fun setLocalDate(localDate: String)
  fun redeemGift(token: String): Map<String, Any?>
  fun createGift(sourceId: String?, buyerNote: String?): Map<String, Any?>

  // LOCAL MODEL OPERATIONS (CYCLE 2)
  fun checkDeviceCapability(context: Context): Map<String, Any?>
  fun getLocalModelStatus(): Map<String, Any?>
  fun prepareLocalModel(forceDownload: Boolean): Map<String, Any?>
  fun cancelLocalModelDownload(): Map<String, Any?>
  fun deleteLocalModel(): Boolean
}

private enum class AletheiaCoreBridgeState {
  NotInitialized,
  Prepared
}

private class AletheiaCoreUniFFIAdapter : AletheiaCoreClient {
  private var core: AletheiaCore? = null
  private var state = AletheiaCoreBridgeState.NotInitialized
  
  // Local inference components (CYCLE 2)
  private var localInferenceEngine: LocalInferenceEngine? = null
  private var modelDownloadManager: ModelDownloadManager? = null
  private var downloadCancelToken: java.util.concurrent.atomic.AtomicBoolean? = null
  private var downloadProgress: Int = 0
  
  private val moduleScope = kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.SupervisorJob())

  override fun initialize(dbPath: String, giftBackendUrl: String) {
    System.setProperty("uniffi.component.aletheia.libraryOverride", "aletheia_core")
    core?.close()
    core = AletheiaCore(dbPath, giftBackendUrl)
    state = AletheiaCoreBridgeState.Prepared
  }
  
  /// Initialize local inference components with context
  fun initializeLocalInference(context: Context) {
    localInferenceEngine = LocalInferenceEngine(context)
    modelDownloadManager = ModelDownloadManager(context)
  }

  override fun setApiKey(provider: String, key: String): Map<String, Any?> {
    return serializeSetApiKeyResponse(requireCore().setAiApiKey(provider, key))
  }

  override fun bootstrapBundledContent(): Map<String, Any?> {
    return serializeSeedBundledDataResponse(requireCore().bootstrapBundledContent())
  }

  override fun performReading(
    userId: String,
    sourceId: String?,
    situationText: String?
  ): Map<String, Any?> {
    return serializePerformReadingResponse(
      requireCore().performReading(userId, sourceId, situationText)
    )
  }

  override fun seedBundledData(
    sourcesJson: String,
    passagesJson: String,
    themesJson: String
  ): Map<String, Any?> {
    return serializeSeedBundledDataResponse(
      requireCore().seedBundledData(sourcesJson, passagesJson, themesJson)
    )
  }

  override fun chooseSymbol(
    session: Map<String, Any?>,
    symbolId: String,
    method: String
  ): Map<String, Any?> {
    return serializeChooseSymbolResponse(
      requireCore().chooseSymbol(
        deserializeReadingSession(session),
        symbolId,
        deserializeSymbolMethod(method)
      )
    )
  }

  override fun completeReading(
    userId: String,
    reading: Map<String, Any?>
  ): Map<String, Any?> {
    return serializeCompleteReadingResponse(
      requireCore().completeReading(
        userId,
        deserializeReading(reading)
      )
    )
  }

  override fun requestInterpretation(
    passage: Map<String, Any?>,
    symbol: Map<String, Any?>,
    situationText: String?
  ): Map<String, Any?> {
    return serializeRequestInterpretationResponse(
      requireCore().requestInterpretation(
        deserializePassage(passage),
        deserializeSymbol(symbol),
        situationText
      )
    )
  }

  override fun startInterpretationStream(
    passage: Map<String, Any?>,
    symbol: Map<String, Any?>,
    situationText: String?,
    userIntent: String?
  ): Map<String, Any?> {
    return serializeStartInterpretationStreamResponse(
      requireCore().startInterpretationStream(
        deserializePassage(passage),
        deserializeSymbol(symbol),
        situationText,
        userIntent
      )
    )
  }

  override fun pollInterpretationStream(requestId: String): Map<String, Any?> {
    return serializeInterpretationStreamState(
      requireCore().pollInterpretationStream(requestId)
    )
  }

  override fun cancelInterpretationStream(requestId: String): Map<String, Any?> {
    return serializeCancelInterpretationResponse(
      requireCore().cancelInterpretationStream(requestId)
    )
  }

  override fun getFallbackPrompts(sourceId: String): Map<String, Any?> {
    val response = requireCore().getFallbackPrompts(sourceId)
    return mapOf(
      "prompts" to response.prompts,
      "error" to serializeBridgeError(response.error)
    )
  }

  override fun getUserState(userId: String): Map<String, Any?> {
    return serializeUserStateResponse(requireCore().getUserState(userId))
  }

  override fun updateUserState(state: Map<String, Any?>): Map<String, Any?> {
    return serializeUpdateUserStateResponse(
      requireCore().updateUserState(deserializeUserState(state))
    )
  }

  override fun getSources(premiumAllowed: Boolean): Map<String, Any?> {
    return serializeSourcesResponse(requireCore().getSources(premiumAllowed))
  }

  override fun getReadings(limit: Int, offset: Int): Map<String, Any?> {
    return serializePaginatedReadingsResponse(
      requireCore().getReadings(limit.toUInt(), offset.toUInt())
    )
  }

  override fun getReadingById(id: String): Map<String, Any?> {
    return serializeReadingResponse(requireCore().getReadingById(id))
  }

  override fun updateReadingFlags(id: String, flags: Map<String, Any?>): Map<String, Any?> {
    return serializeReadingResponse(
      requireCore().updateReadingFlags(
        id,
        flags.optionalBoolean("isFavorite"),
        flags.optionalBoolean("shared")
      )
    )
  }

  override fun getDailyNotificationMessage(userId: String, date: String): Map<String, Any?> {
    return serializeNotificationMessageResponse(
      requireCore().getDailyNotificationMessage(userId, date)
    )
  }

  override fun setLocalDate(localDate: String) {
    requireCore().setLocalDate(localDate)
  }

  override fun redeemGift(token: String): Map<String, Any?> {
    return serializeRedeemGiftResponse(requireCore().redeemGift(token))
  }

  override fun createGift(sourceId: String?, buyerNote: String?): Map<String, Any?> {
    return serializeCreateGiftResponse(requireCore().createGift(sourceId, buyerNote))
  }

  // LOCAL MODEL OPERATIONS (CYCLE 2)
  override fun checkDeviceCapability(context: Context): Map<String, Any?> {
    // Use native device detection instead of Rust stub
    val detected = DeviceCapabilityDetector.detect(context)
    return mapOf(
      "capability" to mapOf(
        "supported" to detected["supported"] as Boolean,
        "available_ram_mb" to detected["available_ram_mb"] as Int,
        "cpu_cores" to detected["cpu_cores"] as Int,
        "has_simd" to detected["has_simd"] as Boolean,
        "estimated_tps" to detected["estimated_tps"] as Float,
        "unsupported_reason" to detected["unsupported_reason"]
      ),
      "error" to null
    )
  }

  override fun getLocalModelStatus(): Map<String, Any?> {
    // Use native model status instead of Rust stub
    val engine = localInferenceEngine
    val downloadManager = modelDownloadManager
    
    val modelReady = engine?.isModelReady() ?: false
    val modelSize = downloadManager?.getModelSize() ?: 0L
    
    val status = when {
      downloadCancelToken != null -> "downloading"
      modelReady -> "ready"
      else -> "not_downloaded"
    }
    
    return mapOf(
      "model_info" to mapOf(
        "model_id" to "gemma-3n-e2b",
        "status" to status,
        "download_progress" to downloadProgress,
        "model_size_bytes" to modelSize,
        "downloaded_bytes" to if (modelReady) modelSize else 0L,
        "version" to "1.0.0",
        "error_message" to null,
        "eta_seconds" to null,
        "device_capable" to true,
        "required_ram_mb" to 2048,
        "available_ram_mb" to 0
      ),
      "error" to null
    )
  }

  override fun prepareLocalModel(forceDownload: Boolean): Map<String, Any?> {
    val downloadManager = modelDownloadManager ?: return mapOf(
      "started" to false,
      "model_info" to null,
      "error" to mapOf("code" to "not_initialized", "message" to "Local inference not initialized")
    )
    
    // Check if already downloading
    if (downloadCancelToken != null) {
      return mapOf(
        "started" to false,
        "model_info" to getLocalModelStatus()["model_info"],
        "error" to mapOf("code" to "download_in_progress", "message" to "Download already in progress")
      )
    }
    
    // Check if already downloaded
    if (!forceDownload && downloadManager.getModelSize() > 0) {
      return mapOf(
        "started" to false,
        "model_info" to getLocalModelStatus()["model_info"],
        "error" to null
      )
    }
    
    // Start download
    downloadCancelToken = java.util.concurrent.atomic.AtomicBoolean(false)
    downloadProgress = 0
    
    // Launch download in background
    moduleScope.launch(kotlinx.coroutines.Dispatchers.IO) {
      try {
        downloadManager.downloadModel(
          progressCallback = { progress ->
            downloadProgress = progress
          },
          cancelToken = downloadCancelToken!!
        )
      } finally {
        downloadCancelToken = null
      }
    }
    
    return mapOf(
      "started" to true,
      "model_info" to getLocalModelStatus()["model_info"],
      "error" to null
    )
  }

  override fun cancelLocalModelDownload(): Map<String, Any?> {
    val token = downloadCancelToken
    if (token != null) {
      token.set(true)
      downloadCancelToken = null
      downloadProgress = 0
    }
    return getLocalModelStatus()
  }

  override fun deleteLocalModel(): Boolean {
    val downloadManager = modelDownloadManager ?: return false
    downloadCancelToken?.set(true)
    downloadCancelToken = null
    downloadProgress = 0
    return downloadManager.deleteModel()
  }

  // LOCAL INFERENCE STREAM METHODS (CYCLE 2)
  
  // Active local inference sessions
  private val localInferenceSessions = mutableMapOf<String, LocalInferenceSession>()
  
  data class LocalInferenceSession(
    val requestId: String,
    val chunks: MutableList<String> = mutableListOf(),
    val fullText: StringBuilder = StringBuilder(),
    var done: Boolean = false,
    var cancelled: Boolean = false,
    val cancelToken: java.util.concurrent.atomic.AtomicBoolean = java.util.concurrent.atomic.AtomicBoolean(false)
  )
  
  /// Start local inference stream
  fun startLocalInterpretationStream(
    passage: Map<String, Any?>,
    symbol: Map<String, Any?>,
    situationText: String?,
    userIntent: String?
  ): Map<String, Any?> {
    val engine = localInferenceEngine
    if (engine == null || !engine.isModelReady()) {
      return mapOf(
        "request_id" to null,
        "error" to mapOf("code" to "model_not_ready", "message" to "Local model not initialized or not downloaded")
      )
    }
    
    val requestId = java.util.UUID.randomUUID().toString()
    val session = LocalInferenceSession(requestId)
    localInferenceSessions[requestId] = session
    
    // Build prompt from passage, symbol, situation
    val prompt = buildLocalInferencePrompt(passage, symbol, situationText, userIntent)
    
    // Launch inference in background
    moduleScope.launch(kotlinx.coroutines.Dispatchers.Default) {
      try {
        engine.runInference(prompt, session.cancelToken)
          .collect { chunk ->
            synchronized(session) {
              session.chunks.add(chunk)
              session.fullText.append(chunk)
            }
          }
        session.done = true
      } catch (e: Exception) {
        Log.e("AletheiaCore", "Local inference error", e)
        session.done = true
      }
    }
    
    return mapOf(
      "request_id" to requestId,
      "error" to null
    )
  }
  
  /// Poll local inference stream for results
  fun pollLocalInterpretationStream(requestId: String): Map<String, Any?> {
    val session = localInferenceSessions[requestId]
    if (session == null) {
      return mapOf(
        "request_id" to requestId,
        "new_chunks" to emptyList<String>(),
        "full_text" to "",
        "done" to true,
        "used_fallback" to false,
        "cancelled" to false,
        "error" to mapOf("code" to "session_not_found", "message" to "Inference session not found")
      )
    }
    
    var fullTextString = ""
    val newChunks = synchronized(session) {
      val chunks = session.chunks.toList()
      session.chunks.clear()
      fullTextString = session.fullText.toString()
      chunks
    }
    
    return mapOf(
      "request_id" to requestId,
      "new_chunks" to newChunks,
      "full_text" to fullTextString,
      "done" to session.done,
      "used_fallback" to false,
      "cancelled" to session.cancelled,
      "error" to null
    )
  }
  
  /// Cancel local inference stream
  fun cancelLocalInterpretationStream(requestId: String): Map<String, Any?> {
    val session = localInferenceSessions[requestId]
    if (session != null) {
      session.cancelToken.set(true)
      session.cancelled = true
      session.done = true
      localInferenceSessions.remove(requestId)
    }
    
    return mapOf(
      "cancelled" to true,
      "error" to null
    )
  }
  
  /// Build prompt for local inference
  // Canonical prompt builder — must match server interpretationService.ts buildPrompt()
  private fun buildLocalInferencePrompt(
    passage: Map<String, Any?>,
    symbol: Map<String, Any?>,
    situationText: String?,
    userIntent: String?
  ): String {
    val passageText = passage["text"] as? String ?: ""
    val passageRef = passage["reference"] as? String ?: ""
    val symbolName = symbol["display_name"] as? String ?: ""
    val passageContext = passage["resonance_context"] as? String ?: passage["context"] as? String ?: ""

    val parts = mutableListOf<String>()

    parts.add("Hãy trả lời hoàn toàn bằng ngôn ngữ của đoạn trích này: vi.")
    parts.add("Chỉ trả về đúng 2 phần: một đoạn phản chiếu ngắn và một câu hỏi mở ở dòng cuối.")

    // Intent-based tone instruction (canonical — must match server interpretationService.ts)
    if (!userIntent.isNullOrBlank()) {
      val intentInstruction = when (userIntent) {
        "clarity" -> "Tone cho lần đọc này: rõ ràng, gọn, chính xác. User cần thấy pattern trong tình huống."
        "comfort" -> "Tone cho lần đọc này: ấm áp, nhẹ, giàu compassion nhưng không lên lớp."
        "challenge" -> "Tone cho lần đọc này: trực tiếp, tỉnh táo, không né điều khó."
        "guidance" -> "Tone cho lần đọc này: mở, không định hướng, giữ không gian để người đọc tự nghe mình."
        else -> ""
      }
      if (intentInstruction.isNotEmpty()) {
        parts.add(intentInstruction)
      }
    }

    if (!situationText.isNullOrBlank()) {
      parts.add("Tình huống: $situationText")
      parts.add("Mirror lại ngôn ngữ của người dùng khi phản chiếu, nhưng đừng lặp lại một cách máy móc.")
    }

    parts.add("Biểu tượng đã chọn: $symbolName")
    parts.add("Đoạn trích ($passageRef):\n$passageText")

    if (passageContext.isNotBlank()) {
      parts.add("Ngữ cảnh ẩn cho người đọc (không nhắc lộ ra): $passageContext")
    }

    return parts.joinToString("\n\n")
  }

  private fun requireCore(): AletheiaCore {
    return core ?: throw IllegalStateException(
      "AletheiaCoreModule.init must run before invoking the native reading flow."
    )
  }

  private fun serializePerformReadingResponse(response: PerformReadingResponse): Map<String, Any?> {
    return mapOf(
      "session" to serializeReadingSession(response.session),
      "error" to serializeBridgeError(response.error)
    )
  }

  private fun serializeChooseSymbolResponse(response: ChooseSymbolResponse): Map<String, Any?> {
    return mapOf(
      "chosen" to serializeChosenPassage(response.chosen),
      "error" to serializeBridgeError(response.error)
    )
  }

  private fun serializeCompleteReadingResponse(response: CompleteReadingResponse): Map<String, Any?> {
    return mapOf(
      "completed" to serializeCompletedReading(response.completed),
      "error" to serializeBridgeError(response.error)
    )
  }

  private fun serializeUserStateResponse(response: UserStateResponse): Map<String, Any?> {
    return mapOf(
      "state" to serializeUserState(response.state),
      "error" to serializeBridgeError(response.error)
    )
  }

  private fun serializeUpdateUserStateResponse(response: UpdateUserStateResponse): Map<String, Any?> {
    return mapOf(
      "updated" to response.updated,
      "error" to serializeBridgeError(response.error)
    )
  }

  private fun serializePaginatedReadingsResponse(response: PaginatedReadingsResponse): Map<String, Any?> {
    return mapOf(
      "readings" to response.readings?.let(::serializePaginatedReadings),
      "error" to serializeBridgeError(response.error)
    )
  }

  private fun serializeReadingResponse(response: ReadingResponse): Map<String, Any?> {
    return mapOf(
      "reading" to response.reading?.let(::serializeReading),
      "error" to serializeBridgeError(response.error)
    )
  }

  private fun serializeSourcesResponse(response: SourcesResponse): Map<String, Any?> {
    return mapOf(
      "sources" to response.sources.map(::serializeSource),
      "error" to serializeBridgeError(response.error)
    )
  }

  private fun serializeNotificationMessageResponse(
    response: NotificationMessageResponse
  ): Map<String, Any?> {
    return mapOf(
      "message" to response.message?.let(::serializeNotificationMessage),
      "error" to serializeBridgeError(response.error)
    )
  }

  private fun serializeSetApiKeyResponse(response: SetApiKeyResponse): Map<String, Any?> {
    return mapOf(
      "applied" to response.applied,
      "error" to serializeBridgeError(response.error)
    )
  }

  private fun serializeSeedBundledDataResponse(response: SeedBundledDataResponse): Map<String, Any?> {
    return mapOf(
      "seeded" to response.seeded,
      "error" to serializeBridgeError(response.error)
    )
  }

  private fun serializeRequestInterpretationResponse(
    response: RequestInterpretationResponse
  ): Map<String, Any?> {
    return mapOf(
      "interpretation" to response.interpretation?.let {
        mapOf(
          "chunks" to it.chunks,
          "used_fallback" to it.usedFallback
        )
      },
      "error" to serializeBridgeError(response.error)
    )
  }

  private fun serializeStartInterpretationStreamResponse(
    response: StartInterpretationStreamResponse
  ): Map<String, Any?> {
    return mapOf(
      "request_id" to response.requestId,
      "error" to serializeBridgeError(response.error)
    )
  }

  private fun serializeInterpretationStreamState(
    response: InterpretationStreamState
  ): Map<String, Any?> {
    return mapOf(
      "request_id" to response.requestId,
      "new_chunks" to response.newChunks,
      "full_text" to response.fullText,
      "done" to response.done,
      "used_fallback" to response.usedFallback,
      "cancelled" to response.cancelled,
      "error" to serializeBridgeError(response.error)
    )
  }

  private fun serializeCancelInterpretationResponse(
    response: CancelInterpretationResponse
  ): Map<String, Any?> {
    return mapOf(
      "cancelled" to response.cancelled,
      "error" to serializeBridgeError(response.error)
    )
  }

  private fun serializeRedeemGiftResponse(response: RedeemGiftResponse): Map<String, Any?> {
    return mapOf(
      "gift" to response.gift?.let {
        mapOf(
          "token" to it.token,
          "buyer_note" to it.buyerNote,
          "source_id" to it.sourceId,
          "created_at" to it.createdAt,
          "expires_at" to it.expiresAt,
          "redeemed" to it.redeemed,
        )
      },
      "error" to serializeBridgeError(response.error)
    )
  }

  private fun serializeCreateGiftResponse(response: CreateGiftResponse): Map<String, Any?> {
    return mapOf(
      "token" to response.token,
      "deep_link" to response.deepLink,
      "error" to serializeBridgeError(response.error)
    )
  }

  private fun serializeBridgeError(error: BridgeError?): Map<String, Any>? {
    return error?.let {
      mapOf(
        "code" to it.code,
        "message" to it.message
      )
    }
  }

  private fun serializeChosenPassage(chosen: ChosenPassage?): Map<String, Any?>? {
    return chosen?.let {
      mapOf(
        "passage" to serializePassage(it.passage),
        "reading_id" to it.readingId
      )
    }
  }

  private fun serializeCompletedReading(completed: CompletedReading?): Map<String, Any?>? {
    return completed?.let {
      mapOf(
        "reading_id" to it.readingId,
        "saved_at" to it.savedAt
      )
    }
  }

  private fun serializeReadingSession(session: ReadingSession?): Map<String, Any?>? {
    return session?.let {
      mapOf(
        "temp_id" to it.tempId,
        "source" to serializeSource(it.source),
        "theme" to serializeTheme(it.theme),
        "symbols" to it.symbols.map(::serializeSymbol),
        "situation_text" to it.situationText,
        "user_intent" to it.userIntent?.name?.lowercase(),
        "started_at" to it.startedAt
      )
    }
  }

  private fun serializePaginatedReadings(readings: PaginatedReadings): Map<String, Any?> {
    return mapOf(
      "items" to readings.items.map(::serializeReading),
      "total_count" to readings.totalCount.toInt(),
      "has_more" to readings.hasMore
    )
  }

  private fun serializeSource(source: Source): Map<String, Any?> {
    return mapOf(
      "id" to source.id,
      "name" to source.name,
      "tradition" to serializeTradition(source.tradition),
      "language" to source.language,
      "passage_count" to source.passageCount.toInt(),
      "is_bundled" to source.isBundled,
      "is_premium" to source.isPremium,
      "fallback_prompts" to source.fallbackPrompts
    )
  }

  private fun serializeTheme(theme: Theme): Map<String, Any?> {
    return mapOf(
      "id" to theme.id,
      "name" to theme.name,
      "symbols" to theme.symbols.map(::serializeSymbol),
      "is_premium" to theme.isPremium,
      "pack_id" to theme.packId,
      "price_usd" to theme.priceUsd?.toDouble()
    )
  }

  private fun serializeSymbol(symbol: Symbol): Map<String, Any?> {
    return mapOf(
      "id" to symbol.id,
      "display_name" to symbol.displayName,
      "flavor_text" to symbol.flavorText
    )
  }

  private fun serializePassage(passage: Passage): Map<String, Any?> {
    return mapOf(
      "id" to passage.id,
      "source_id" to passage.sourceId,
      "reference" to passage.reference,
      "text" to passage.text,
      "context" to passage.context,
      "resonance_context" to passage.resonanceContext
    )
  }

  private fun serializeReading(reading: Reading): Map<String, Any?> {
    return mapOf(
      "id" to reading.id,
      "created_at" to reading.createdAt,
      "source_id" to reading.sourceId,
      "passage_id" to reading.passageId,
      "theme_id" to reading.themeId,
      "symbol_chosen" to reading.symbolChosen,
      "symbol_method" to serializeSymbolMethod(reading.symbolMethod),
      "situation_text" to reading.situationText,
      "ai_interpreted" to reading.aiInterpreted,
      "ai_used_fallback" to reading.aiUsedFallback,
      "read_duration_s" to reading.readDurationS?.toInt(),
      "time_to_ai_request_s" to reading.timeToAiRequestS?.toInt(),
      "notification_opened" to reading.notificationOpened,
      "mood_tag" to reading.moodTag?.name?.lowercase(),
      "is_favorite" to reading.isFavorite,
      "shared" to reading.shared,
      "user_intent" to reading.userIntent?.name?.lowercase()
    )
  }

  private fun serializeNotificationMessage(message: NotificationMessage): Map<String, Any?> {
    return mapOf(
      "symbol_id" to message.symbolId,
      "question" to message.question,
      "title" to message.title,
      "body" to message.body
    )
  }

  private fun serializeUserState(state: UserState?): Map<String, Any?>? {
    return state?.let {
      mapOf(
        "user_id" to it.userId,
        "subscription_tier" to serializeSubscriptionTier(it.subscriptionTier),
      "readings_today" to it.readingsToday.toInt(),
      "ai_calls_today" to it.aiCallsToday.toInt(),
      "session_count" to it.sessionCount.toInt(),
      "last_reading_date" to it.lastReadingDate,
        "notification_enabled" to it.notificationEnabled,
        "notification_time" to it.notificationTime,
        "preferred_language" to it.preferredLanguage,
        "dark_mode" to it.darkMode,
        "onboarding_complete" to it.onboardingComplete,
        "user_intent" to it.userIntent?.name?.lowercase()
      )
    }
  }

  // LOCAL MODEL SERIALIZATION (CYCLE 2)
  // Note: Using native Kotlin implementation, not UniFFI bindings

  // LocalModelInfo serializer - kept for compatibility
  private fun serializeLocalModelInfoNative(
    modelId: String,
    status: String,
    downloadProgress: Int,
    modelSizeBytes: Long,
    downloadedBytes: Long,
    version: String,
    errorMessage: String?,
    etaSeconds: Int?,
    deviceCapable: Boolean,
    requiredRamMb: Int,
    availableRamMb: Int
  ): Map<String, Any?> {
    return mapOf(
      "model_id" to modelId,
      "status" to status,
      "download_progress" to downloadProgress,
      "model_size_bytes" to modelSizeBytes,
      "downloaded_bytes" to downloadedBytes,
      "version" to version,
      "error_message" to errorMessage,
      "eta_seconds" to etaSeconds,
      "device_capable" to deviceCapable,
      "required_ram_mb" to requiredRamMb,
      "available_ram_mb" to availableRamMb
    )
  }

  // Note: Local model operations use native implementations directly
  // These serializer functions are kept for potential future use with Rust bindings

  private fun deserializeReadingSession(payload: Map<String, Any?>): ReadingSession {
    return ReadingSession(
      tempId = payload.requireString("temp_id"),
      source = deserializeSource(payload.requireMap("source")),
      theme = deserializeTheme(payload.requireMap("theme")),
      symbols = payload.requireList("symbols").mapIndexed { index, value ->
        deserializeSymbol(value.requireMapValue("symbols[$index]"))
      },
      situationText = payload.optionalString("situation_text"),
      userIntent = payload.optionalString("user_intent")?.let(::deserializeUserIntent),
      startedAt = payload.requireLong("started_at")
    )
  }

  private fun deserializeSource(payload: Map<String, Any?>): Source {
    return Source(
      id = payload.requireString("id"),
      name = payload.requireString("name"),
      tradition = deserializeTradition(payload.requireString("tradition")),
      language = payload.requireString("language"),
      passageCount = payload.requireInt("passage_count").toUInt(),
      isBundled = payload.requireBoolean("is_bundled"),
      isPremium = payload.requireBoolean("is_premium"),
      fallbackPrompts = payload.requireStringList("fallback_prompts")
    )
  }

  private fun deserializeTheme(payload: Map<String, Any?>): Theme {
    return Theme(
      id = payload.requireString("id"),
      name = payload.requireString("name"),
      symbols = payload.requireList("symbols").mapIndexed { index, value ->
        deserializeSymbol(value.requireMapValue("theme.symbols[$index]"))
      },
      isPremium = payload.requireBoolean("is_premium"),
      packId = payload.optionalString("pack_id"),
      priceUsd = payload.optionalDouble("price_usd")?.toFloat()
    )
  }

  private fun deserializeSymbol(payload: Map<String, Any?>): Symbol {
    return Symbol(
      id = payload.requireString("id"),
      displayName = payload.requireString("display_name"),
      flavorText = payload.optionalString("flavor_text")
    )
  }

  private fun deserializeReading(payload: Map<String, Any?>): Reading {
    return Reading(
      id = payload.requireString("id"),
      createdAt = payload.requireLong("created_at"),
      sourceId = payload.requireString("source_id"),
      passageId = payload.requireString("passage_id"),
      themeId = payload.requireString("theme_id"),
      symbolChosen = payload.requireString("symbol_chosen"),
      symbolMethod = deserializeSymbolMethod(payload.requireString("symbol_method")),
      situationText = payload.optionalString("situation_text"),
      aiInterpreted = payload.requireBoolean("ai_interpreted"),
      aiUsedFallback = payload.requireBoolean("ai_used_fallback"),
      readDurationS = payload.optionalInt("read_duration_s")?.toUInt(),
      timeToAiRequestS = payload.optionalInt("time_to_ai_request_s")?.toUInt(),
      notificationOpened = payload.optionalBoolean("notification_opened") ?: false,
      moodTag = payload.optionalString("mood_tag")?.let(::deserializeMoodTag),
      isFavorite = payload.requireBoolean("is_favorite"),
      shared = payload.requireBoolean("shared"),
      userIntent = payload.optionalString("user_intent")?.let(::deserializeUserIntent)
    )
  }

  private fun deserializePassage(payload: Map<String, Any?>): Passage {
    return Passage(
      id = payload.requireString("id"),
      sourceId = payload.requireString("source_id"),
      reference = payload.requireString("reference"),
      text = payload.requireString("text"),
      context = payload.optionalString("context"),
      resonanceContext = payload.optionalString("resonance_context")
    )
  }

  private fun deserializeUserState(payload: Map<String, Any?>): UserState {
    return UserState(
      userId = payload.requireString("user_id"),
      subscriptionTier = deserializeSubscriptionTier(payload.requireString("subscription_tier")),
      readingsToday = payload.requireInt("readings_today").toUByte(),
      aiCallsToday = payload.requireInt("ai_calls_today").toUByte(),
      sessionCount = payload.requireInt("session_count").toUInt(),
      lastReadingDate = payload.optionalString("last_reading_date"),
      notificationEnabled = payload.requireBoolean("notification_enabled"),
      notificationTime = payload.optionalString("notification_time"),
      preferredLanguage = payload.requireString("preferred_language"),
      darkMode = payload.requireBoolean("dark_mode"),
      onboardingComplete = payload.requireBoolean("onboarding_complete"),
      userIntent = payload.optionalString("user_intent")?.let(::deserializeUserIntent)
    )
  }

  private fun serializeTradition(value: Tradition): String {
    return when (value) {
      Tradition.CHINESE -> "chinese"
      Tradition.CHRISTIAN -> "christian"
      Tradition.ISLAMIC -> "islamic"
      Tradition.SUFI -> "sufi"
      Tradition.STOIC -> "stoic"
      Tradition.UNIVERSAL -> "universal"
    }
  }

  private fun serializeSubscriptionTier(value: SubscriptionTier): String {
    return when (value) {
      SubscriptionTier.FREE -> "free"
      SubscriptionTier.PRO -> "pro"
    }
  }

  private fun deserializeTradition(value: String): Tradition {
    return when (value.lowercase()) {
      "chinese" -> Tradition.CHINESE
      "christian" -> Tradition.CHRISTIAN
      "islamic" -> Tradition.ISLAMIC
      "sufi" -> Tradition.SUFI
      "stoic" -> Tradition.STOIC
      "universal" -> Tradition.UNIVERSAL
      else -> throw IllegalArgumentException("Unsupported tradition: $value")
    }
  }

  private fun serializeSymbolMethod(value: SymbolMethod): String {
    return when (value) {
      SymbolMethod.MANUAL -> "manual"
      SymbolMethod.AUTO -> "auto"
    }
  }

  private fun deserializeSubscriptionTier(value: String): SubscriptionTier {
    return when (value.lowercase()) {
      "free" -> SubscriptionTier.FREE
      "pro" -> SubscriptionTier.PRO
      else -> throw IllegalArgumentException("Unsupported subscription tier: $value")
    }
  }

  private fun deserializeUserIntent(value: String): uniffi.aletheia.UserIntent {
    return when (value.lowercase()) {
      "clarity" -> uniffi.aletheia.UserIntent.CLARITY
      "comfort" -> uniffi.aletheia.UserIntent.COMFORT
      "challenge" -> uniffi.aletheia.UserIntent.CHALLENGE
      "guidance" -> uniffi.aletheia.UserIntent.GUIDANCE
      else -> throw IllegalArgumentException("Unsupported user intent: $value")
    }
  }

  private fun deserializeSymbolMethod(value: String): SymbolMethod {
    return when (value.lowercase()) {
      "manual" -> SymbolMethod.MANUAL
      "auto" -> SymbolMethod.AUTO
      else -> throw IllegalArgumentException("Unsupported symbol method: $value")
    }
  }

  private fun deserializeMoodTag(value: String): MoodTag {
    return when (value.lowercase()) {
      "confused" -> MoodTag.CONFUSED
      "hopeful" -> MoodTag.HOPEFUL
      "anxious" -> MoodTag.ANXIOUS
      "curious" -> MoodTag.CURIOUS
      "grateful" -> MoodTag.GRATEFUL
      "grief" -> MoodTag.GRIEF
      else -> throw IllegalArgumentException("Unsupported mood tag: $value")
    }
  }

  private fun Map<String, Any?>.requireString(key: String): String {
    return this[key] as? String
      ?: throw IllegalArgumentException("Expected string at key '$key'")
  }

  private fun Map<String, Any?>.optionalString(key: String): String? {
    val value = this[key] ?: return null
    return value as? String
      ?: throw IllegalArgumentException("Expected nullable string at key '$key'")
  }

  private fun Map<String, Any?>.requireBoolean(key: String): Boolean {
    return this[key] as? Boolean
      ?: throw IllegalArgumentException("Expected boolean at key '$key'")
  }

  private fun Map<String, Any?>.requireInt(key: String): Int {
    return (this[key] as? Number)?.toInt()
      ?: throw IllegalArgumentException("Expected integer number at key '$key'")
  }

  private fun Map<String, Any?>.optionalInt(key: String): Int? {
    val value = this[key] ?: return null
    return (value as? Number)?.toInt()
      ?: throw IllegalArgumentException("Expected nullable integer number at key '$key'")
  }

  private fun Map<String, Any?>.optionalBoolean(key: String): Boolean? {
    val value = this[key] ?: return null
    return value as? Boolean
      ?: throw IllegalArgumentException("Expected nullable boolean at key '$key'")
  }

  private fun Map<String, Any?>.requireLong(key: String): Long {
    return (this[key] as? Number)?.toLong()
      ?: throw IllegalArgumentException("Expected long number at key '$key'")
  }

  private fun Map<String, Any?>.optionalDouble(key: String): Double? {
    val value = this[key] ?: return null
    return (value as? Number)?.toDouble()
      ?: throw IllegalArgumentException("Expected nullable number at key '$key'")
  }

  @Suppress("UNCHECKED_CAST")
  private fun Map<String, Any?>.requireMap(key: String): Map<String, Any?> {
    return this[key] as? Map<String, Any?>
      ?: throw IllegalArgumentException("Expected object map at key '$key'")
  }

  @Suppress("UNCHECKED_CAST")
  private fun Any?.requireMapValue(label: String): Map<String, Any?> {
    return this as? Map<String, Any?>
      ?: throw IllegalArgumentException("Expected object map for $label")
  }

  @Suppress("UNCHECKED_CAST")
  private fun Map<String, Any?>.requireList(key: String): List<Any?> {
    return this[key] as? List<Any?>
      ?: throw IllegalArgumentException("Expected list at key '$key'")
  }

  private fun Map<String, Any?>.requireStringList(key: String): List<String> {
    return requireList(key).mapIndexed { index, value ->
      value as? String ?: throw IllegalArgumentException(
        "Expected string at key '$key' index $index"
      )
    }
  }
}

class AletheiaCoreModule : Module() {
  private val adapter = AletheiaCoreUniFFIAdapter()
  private val client: AletheiaCoreClient = adapter

  override fun definition() = ModuleDefinition {
    Name("AletheiaCoreModule")

    OnCreate {
      val context = appContext.reactContext
      if (context != null) {
        adapter.initializeLocalInference(context)
      }
    }

    AsyncFunction("init") { options: Map<String, String> ->
      val dbPath = options["dbPath"].orEmpty()
      val giftBackendUrl = options["giftBackendUrl"].orEmpty()
      client.initialize(dbPath, giftBackendUrl)
    }

    AsyncFunction("bootstrapBundledContent") {
      client.bootstrapBundledContent()
    }

    AsyncFunction("setApiKey") { options: Map<String, String> ->
      client.setApiKey(
        options["provider"].orEmpty(),
        options["key"].orEmpty()
      )
    }

    AsyncFunction("seedBundledData") { options: Map<String, String> ->
      client.seedBundledData(
        options["sourcesJson"].orEmpty(),
        options["passagesJson"].orEmpty(),
        options["themesJson"].orEmpty()
      )
    }

    AsyncFunction("performReading") { userId: String, sourceId: String?, situationText: String? ->
      client.performReading(userId, sourceId, situationText)
    }

    AsyncFunction("chooseSymbol") { session: Map<String, Any?>, symbolId: String, method: String ->
      client.chooseSymbol(session, symbolId, method)
    }

    AsyncFunction("completeReading") { userId: String, reading: Map<String, Any?> ->
      client.completeReading(userId, reading)
    }

    AsyncFunction("requestInterpretation") {
      passage: Map<String, Any?>,
      symbol: Map<String, Any?>,
      situationText: String? ->
      client.requestInterpretation(passage, symbol, situationText)
    }

    AsyncFunction("startInterpretationStream") {
      passage: Map<String, Any?>,
      symbol: Map<String, Any?>,
      situationText: String?,
      userIntent: String? ->
      client.startInterpretationStream(passage, symbol, situationText, userIntent)
    }

    AsyncFunction("pollInterpretationStream") { requestId: String ->
      client.pollInterpretationStream(requestId)
    }

    AsyncFunction("cancelInterpretationStream") { requestId: String ->
      client.cancelInterpretationStream(requestId)
    }

    AsyncFunction("getFallbackPrompts") { sourceId: String ->
      client.getFallbackPrompts(sourceId)
    }

    AsyncFunction("getUserState") { userId: String ->
      client.getUserState(userId)
    }

    AsyncFunction("updateUserState") { state: Map<String, Any?> ->
      client.updateUserState(state)
    }

    AsyncFunction("getSources") { premiumAllowed: Boolean ->
      client.getSources(premiumAllowed)
    }

    AsyncFunction("getReadings") { limit: Int, offset: Int ->
      client.getReadings(limit, offset)
    }

    AsyncFunction("getReadingById") { id: String ->
      client.getReadingById(id)
    }

    AsyncFunction("updateReadingFlags") { id: String, flags: Map<String, Any?> ->
      client.updateReadingFlags(id, flags)
    }

    AsyncFunction("getDailyNotificationMessage") { userId: String, date: String ->
      client.getDailyNotificationMessage(userId, date)
    }

    AsyncFunction("setLocalDate") { localDate: String ->
      client.setLocalDate(localDate)
    }

    AsyncFunction("redeemGift") { token: String ->
      client.redeemGift(token)
    }

    AsyncFunction("createGift") { sourceId: String?, buyerNote: String? ->
      client.createGift(sourceId, buyerNote)
    }

    // LOCAL MODEL OPERATIONS (CYCLE 2)
    AsyncFunction("checkDeviceCapability") {
      val context = appContext.reactContext ?: throw IllegalStateException("No context available")
      client.checkDeviceCapability(context)
    }

    AsyncFunction("getLocalModelStatus") {
      client.getLocalModelStatus()
    }

    AsyncFunction("prepareLocalModel") { forceDownload: Boolean ->
      client.prepareLocalModel(forceDownload)
    }

    AsyncFunction("cancelLocalModelDownload") {
      client.cancelLocalModelDownload()
    }

    AsyncFunction("deleteLocalModel") {
      client.deleteLocalModel()
    }

    // LOCAL INFERENCE STREAM (CYCLE 2)
    AsyncFunction("startLocalInterpretationStream") 
      { passage: Map<String, Any?>, symbol: Map<String, Any?>, situationText: String?, userIntent: String? ->
        adapter.startLocalInterpretationStream(passage, symbol, situationText, userIntent)
      }

    AsyncFunction("pollLocalInterpretationStream") { requestId: String ->
      adapter.pollLocalInterpretationStream(requestId)
    }

    AsyncFunction("cancelLocalInterpretationStream") { requestId: String ->
      adapter.cancelLocalInterpretationStream(requestId)
    }
  }
}
