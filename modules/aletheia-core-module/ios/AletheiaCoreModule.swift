import ExpoModulesCore

private struct AletheiaCoreBridgeError {
  let code: String
  let message: String

  func serialize() -> [String: Any] {
    [
      "code": code,
      "message": message
    ]
  }
}

private protocol AletheiaCoreClient {
  func initialize(dbPath: String, giftBackendUrl: String) async
  func bootstrapBundledContent() async -> [String: Any?]
  func seedBundledData(
    sourcesJson: String,
    passagesJson: String,
    themesJson: String
  ) async -> [String: Any?]
  func setApiKey(provider: String, key: String) async -> [String: Any?]
  func performReading(
    userId: String,
    sourceId: String?,
    situationText: String?
  ) async -> [String: Any?]
  func chooseSymbol(
    session: [String: Any],
    symbolId: String,
    method: String
  ) async -> [String: Any?]
  func completeReading(
    userId: String,
    reading: [String: Any]
  ) async -> [String: Any?]
  func requestInterpretation(
    passage: [String: Any],
    symbol: [String: Any],
    situationText: String?
  ) async -> [String: Any?]
  func startInterpretationStream(
    passage: [String: Any],
    symbol: [String: Any],
    situationText: String?
  ) async -> [String: Any?]
  func pollInterpretationStream(requestId: String) async -> [String: Any?]
  func cancelInterpretationStream(requestId: String) async -> [String: Any?]
  func getFallbackPrompts(sourceId: String) async -> [String: Any?]
  func getUserState(userId: String) async -> [String: Any?]
  func getReadingById(id: String) async -> [String: Any?]
  func updateReadingFlags(id: String, flags: [String: Any]) async -> [String: Any?]

  // LOCAL MODEL OPERATIONS (CYCLE 2)
  func checkDeviceCapability() async -> [String: Any?]
  func getLocalModelStatus() async -> [String: Any?]
  func prepareLocalModel(forceDownload: Bool) async -> [String: Any?]
  func cancelLocalModelDownload() async -> [String: Any?]
  func deleteLocalModel() async -> Bool
}

private enum AletheiaCoreBridgeState {
  case notInitialized
  case prepared
}

private final class AletheiaCoreUniFFIAdapter: AletheiaCoreClient {
  private var state: AletheiaCoreBridgeState = .notInitialized

  private var isInitialized = false

  func initialize(dbPath: String, giftBackendUrl: String) async {
    _ = dbPath
    _ = giftBackendUrl
    isInitialized = true
    state = .prepared
  }

  func seedBundledData(
    sourcesJson: String,
    passagesJson: String,
    themesJson: String
  ) async -> [String: Any?] {
    _ = sourcesJson
    _ = passagesJson
    _ = themesJson
    return [
      "seeded": false,
      "error": bridgeError().serialize()
    ]
  }

  func bootstrapBundledContent() async -> [String: Any?] {
    [
      "seeded": false,
      "error": bridgeError().serialize()
    ]
  }

  func setApiKey(provider: String, key: String) async -> [String: Any?] {
    _ = provider
    _ = key
    return [
      "applied": false,
      "error": bridgeError().serialize()
    ]
  }

  func performReading(
    userId: String,
    sourceId: String?,
    situationText: String?
  ) async -> [String: Any?] {
    _ = userId
    _ = sourceId
    _ = situationText
    return response(session: nil)
  }

  func chooseSymbol(
    session: [String: Any],
    symbolId: String,
    method: String
  ) async -> [String: Any?] {
    _ = session
    _ = symbolId
    _ = method
    return response(chosen: nil)
  }

  func completeReading(
    userId: String,
    reading: [String: Any]
  ) async -> [String: Any?] {
    _ = userId
    _ = reading
    return response(completed: nil)
  }

  func requestInterpretation(
    passage: [String: Any],
    symbol: [String: Any],
    situationText: String?
  ) async -> [String: Any?] {
    _ = passage
    _ = symbol
    _ = situationText
    return [
      "interpretation": nil,
      "error": bridgeError().serialize()
    ]
  }

  func startInterpretationStream(
    passage: [String: Any],
    symbol: [String: Any],
    situationText: String?
  ) async -> [String: Any?] {
    _ = passage
    _ = symbol
    _ = situationText
    return [
      "request_id": nil,
      "error": bridgeError().serialize()
    ]
  }

  func pollInterpretationStream(requestId: String) async -> [String: Any?] {
    [
      "request_id": requestId,
      "new_chunks": [],
      "full_text": "",
      "done": true,
      "used_fallback": false,
      "cancelled": false,
      "error": bridgeError().serialize()
    ]
  }

  func cancelInterpretationStream(requestId: String) async -> [String: Any?] {
    _ = requestId
    return [
      "cancelled": false,
      "error": bridgeError().serialize()
    ]
  }

  func getFallbackPrompts(sourceId: String) async -> [String: Any?] {
    _ = sourceId
    return [
      "prompts": [],
      "error": bridgeError().serialize()
    ]
  }

  func getUserState(userId: String) async -> [String: Any?] {
    _ = userId
    return response(state: nil)
  }

  func getReadingById(id: String) async -> [String: Any?] {
    _ = id
    return response(reading: nil)
  }

  func updateReadingFlags(id: String, flags: [String: Any]) async -> [String: Any?] {
    _ = id
    _ = flags
    return response(reading: nil)
  }

  // LOCAL MODEL OPERATIONS (CYCLE 2)
  func checkDeviceCapability() async -> [String: Any?] {
    return [
      "capability": [
        "supported": false,
        "available_ram_mb": 0,
        "cpu_cores": 0,
        "has_simd": false,
        "estimated_tps": 0.0,
        "unsupported_reason": "iOS native module not initialized"
      ],
      "error": nil
    ]
  }

  func getLocalModelStatus() async -> [String: Any?] {
    return [
      "model_info": [
        "model_id": "gemma-3n-e2b",
        "status": "not_downloaded",
        "download_progress": 0,
        "model_size_bytes": 0,
        "downloaded_bytes": 0,
        "version": "",
        "error_message": nil,
        "eta_seconds": nil,
        "device_capable": false,
        "required_ram_mb": 2048,
        "available_ram_mb": 0
      ],
      "error": nil
    ]
  }

  func prepareLocalModel(forceDownload: Bool) async -> [String: Any?] {
    _ = forceDownload
    return [
      "started": false,
      "model_info": nil,
      "error": bridgeError().serialize()
    ]
  }

  func cancelLocalModelDownload() async -> [String: Any?] {
    return await getLocalModelStatus()
  }

  func deleteLocalModel() async -> Bool {
    return false
  }

  private func bridgeError() -> AletheiaCoreBridgeError {
    if !isInitialized {
      return AletheiaCoreBridgeError(
        code: "native_not_initialized",
        message: "AletheiaCoreModule.init must run before invoking the native reading flow."
      )
    }

    switch state {
    case .notInitialized:
      return AletheiaCoreBridgeError(
        code: "native_not_initialized",
        message: "AletheiaCoreModule.init must run before invoking the native reading flow."
      )
    case .prepared:
      break
    }

    return AletheiaCoreBridgeError(
      code: "native_uniffi_pending",
      message: "UniFFI staging is prepared, but the generated Swift bindings and Rust artifacts are not linked into the iOS target yet."
    )
  }

  private func response(session: Any?) -> [String: Any?] {
    [
      "session": session,
      "error": bridgeError().serialize()
    ]
  }

  private func response(chosen: Any?) -> [String: Any?] {
    [
      "chosen": chosen,
      "error": bridgeError().serialize()
    ]
  }

  private func response(completed: Any?) -> [String: Any?] {
    [
      "completed": completed,
      "error": bridgeError().serialize()
    ]
  }

  private func response(state: Any?) -> [String: Any?] {
    [
      "state": state,
      "error": bridgeError().serialize()
    ]
  }

  private func response(reading: Any?) -> [String: Any?] {
    [
      "reading": reading,
      "error": bridgeError().serialize()
    ]
  }
}

public final class AletheiaCoreModule: Module {
  private let client: AletheiaCoreClient = AletheiaCoreUniFFIAdapter()

  public func definition() -> ModuleDefinition {
    Name("AletheiaCoreModule")

    AsyncFunction("init") { (options: [String: String]) in
      let dbPath = options["dbPath"] ?? ""
      let giftBackendUrl = options["giftBackendUrl"] ?? ""
      await self.client.initialize(dbPath: dbPath, giftBackendUrl: giftBackendUrl)
    }

    AsyncFunction("bootstrapBundledContent") {
      await self.client.bootstrapBundledContent()
    }

    AsyncFunction("seedBundledData") { (options: [String: String]) in
      await self.client.seedBundledData(
        sourcesJson: options["sourcesJson"] ?? "",
        passagesJson: options["passagesJson"] ?? "",
        themesJson: options["themesJson"] ?? ""
      )
    }

    AsyncFunction("setApiKey") { (options: [String: String]) in
      await self.client.setApiKey(
        provider: options["provider"] ?? "",
        key: options["key"] ?? ""
      )
    }

    AsyncFunction("performReading") { (userId: String, sourceId: String?, situationText: String?) in
      await self.client.performReading(
        userId: userId,
        sourceId: sourceId,
        situationText: situationText
      )
    }

    AsyncFunction("chooseSymbol") { (session: [String: Any], symbolId: String, method: String) in
      await self.client.chooseSymbol(
        session: session,
        symbolId: symbolId,
        method: method
      )
    }

    AsyncFunction("completeReading") { (userId: String, reading: [String: Any]) in
      await self.client.completeReading(
        userId: userId,
        reading: reading
      )
    }

    AsyncFunction("requestInterpretation") {
      (passage: [String: Any], symbol: [String: Any], situationText: String?) in
      await self.client.requestInterpretation(
        passage: passage,
        symbol: symbol,
        situationText: situationText
      )
    }

    AsyncFunction("startInterpretationStream") {
      (passage: [String: Any], symbol: [String: Any], situationText: String?) in
      await self.client.startInterpretationStream(
        passage: passage,
        symbol: symbol,
        situationText: situationText
      )
    }

    AsyncFunction("pollInterpretationStream") { (requestId: String) in
      await self.client.pollInterpretationStream(requestId: requestId)
    }

    AsyncFunction("cancelInterpretationStream") { (requestId: String) in
      await self.client.cancelInterpretationStream(requestId: requestId)
    }

    AsyncFunction("getFallbackPrompts") { (sourceId: String) in
      await self.client.getFallbackPrompts(sourceId: sourceId)
    }

    AsyncFunction("getUserState") { (userId: String) in
      await self.client.getUserState(userId: userId)
    }

    AsyncFunction("getReadingById") { (id: String) in
      await self.client.getReadingById(id: id)
    }

    AsyncFunction("updateReadingFlags") { (id: String, flags: [String: Any]) in
      await self.client.updateReadingFlags(id: id, flags: flags)
    }

    // LOCAL MODEL OPERATIONS (CYCLE 2)
    AsyncFunction("checkDeviceCapability") {
      await self.client.checkDeviceCapability()
    }

    AsyncFunction("getLocalModelStatus") {
      await self.client.getLocalModelStatus()
    }

    AsyncFunction("prepareLocalModel") { (forceDownload: Bool) in
      await self.client.prepareLocalModel(forceDownload: forceDownload)
    }

    AsyncFunction("cancelLocalModelDownload") {
      await self.client.cancelLocalModelDownload()
    }

    AsyncFunction("deleteLocalModel") {
      await self.client.deleteLocalModel()
    }
  }
}
