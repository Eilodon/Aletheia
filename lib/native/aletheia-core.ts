import {
  getAletheiaCoreModule,
  type NativeChooseSymbolResponse,
  type NativeCompleteReadingResponse,
  type NativeFallbackPromptsResponse,
  type NativeInitOptions,
  type NativeInterpretationStreamState,
  type NativePerformReadingResponse,
  type NativeReading,
  type NativeReadingSession,
  type NativeCancelInterpretationResponse,
  type NativeRequestInterpretationResponse,
  type NativeSeedBundledDataOptions,
  type NativeSeedBundledDataResponse,
  type NativeSetApiKeyOptions,
  type NativeSetApiKeyResponse,
  type NativeStartInterpretationStreamResponse,
  type NativeSymbol,
  type NativePassage,
  type NativeUserStateResponse,
} from "../../modules/aletheia-core-module/src";

class AletheiaNativeClient {
  private module = (() => {
    try {
      return getAletheiaCoreModule();
    } catch {
      return null;
    }
  })();

  isAvailable(): boolean {
    return this.module !== null;
  }

  private requireModule() {
    if (!this.module) {
      throw new Error("Aletheia native module is unavailable.");
    }

    return this.module;
  }

  init(options: NativeInitOptions): Promise<void> {
    return this.requireModule().init(options);
  }

  performReading(
    userId: string,
    sourceId?: string,
    situationText?: string,
  ): Promise<NativePerformReadingResponse> {
    return this.requireModule().performReading(userId, sourceId, situationText);
  }

  chooseSymbol(
    session: NativeReadingSession,
    symbolId: string,
    method: string,
  ): Promise<NativeChooseSymbolResponse> {
    return this.requireModule().chooseSymbol(session, symbolId, method);
  }

  completeReading(
    userId: string,
    reading: NativeReading,
  ): Promise<NativeCompleteReadingResponse> {
    return this.requireModule().completeReading(userId, reading);
  }

  getFallbackPrompts(sourceId: string): Promise<NativeFallbackPromptsResponse> {
    return this.requireModule().getFallbackPrompts(sourceId);
  }

  getUserState(userId: string): Promise<NativeUserStateResponse> {
    return this.requireModule().getUserState(userId);
  }

  seedBundledData(
    options: NativeSeedBundledDataOptions,
  ): Promise<NativeSeedBundledDataResponse> {
    return this.requireModule().seedBundledData(options);
  }

  setApiKey(
    options: NativeSetApiKeyOptions,
  ): Promise<NativeSetApiKeyResponse> {
    return this.requireModule().setApiKey(options);
  }

  requestInterpretation(
    passage: NativePassage,
    symbol: NativeSymbol,
    situationText?: string,
  ): Promise<NativeRequestInterpretationResponse> {
    return this.requireModule().requestInterpretation(passage, symbol, situationText);
  }

  startInterpretationStream(
    passage: NativePassage,
    symbol: NativeSymbol,
    situationText?: string,
  ): Promise<NativeStartInterpretationStreamResponse> {
    return this.requireModule().startInterpretationStream(passage, symbol, situationText);
  }

  pollInterpretationStream(
    requestId: string,
  ): Promise<NativeInterpretationStreamState> {
    return this.requireModule().pollInterpretationStream(requestId);
  }

  cancelInterpretationStream(
    requestId: string,
  ): Promise<NativeCancelInterpretationResponse> {
    return this.requireModule().cancelInterpretationStream(requestId);
  }
}

export const aletheiaNativeClient = new AletheiaNativeClient();
