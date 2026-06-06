import {
  getAletheiaCoreModule,
  type NativeChooseSymbolResponse,
  type NativeCompleteReadingResponse,
  type NativeFallbackPromptsResponse,
  type NativeInitOptions,
  type NativeInterpretation,
  type NativeInterpretationResponse,
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
  type NativeUserState,
  type NativeUserStateResponse,
  type NativeUpdateUserStateResponse,
  type NativePaginatedReadingsResponse,
  type NativeReadingResponse,
  type NativeSaveInterpretationResponse,
  type NativeSourcesResponse,
  type NativeNotificationMessageResponse,
  type NativeRedeemGiftResponse,
  type NativeCreateGiftResponse,
  type NativeDeviceCapabilityResponse,
  type NativeLocalModelStatusResponse,
  type NativePrepareLocalModelResponse,
} from "../../modules/aletheia-core-module/src";
import { Platform } from "react-native";

class AletheiaNativeClient {
  private module = (() => {
    try {
      return getAletheiaCoreModule();
    } catch {
      return null;
    }
  })();

  isAvailable(): boolean {
    // iOS still ships a stub Expo module. Treat it as unavailable until
    // generated Swift bindings and Rust artifacts are linked for real.
    if (Platform.OS === "ios") {
      return false;
    }

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

  bootstrapBundledContent(): Promise<NativeSeedBundledDataResponse> {
    return this.requireModule().bootstrapBundledContent();
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
    const sessionArg = Platform.OS === 'android' ? JSON.stringify(session) : session;
    return this.requireModule().chooseSymbol(sessionArg as any, symbolId, method);
  }

  completeReading(
    userId: string,
    reading: NativeReading,
  ): Promise<NativeCompleteReadingResponse> {
    const readingArg = Platform.OS === 'android' ? JSON.stringify(reading) : reading;
    return this.requireModule().completeReading(userId, readingArg as any);
  }

  getFallbackPrompts(sourceId: string): Promise<NativeFallbackPromptsResponse> {
    return this.requireModule().getFallbackPrompts(sourceId);
  }

  getUserState(userId: string): Promise<NativeUserStateResponse> {
    return this.requireModule().getUserState(userId);
  }

  updateUserState(state: NativeUserState): Promise<NativeUpdateUserStateResponse> {
    return this.requireModule().updateUserState(state);
  }

  getReadings(limit: number, offset: number): Promise<NativePaginatedReadingsResponse> {
    return this.requireModule().getReadings(limit, offset);
  }

  getSources(premiumAllowed: boolean): Promise<NativeSourcesResponse> {
    return this.requireModule().getSources(premiumAllowed);
  }

  getSourcesForUser(userId: string): Promise<NativeSourcesResponse> {
    return this.requireModule().getSourcesForUser(userId);
  }

  getReadingById(id: string): Promise<NativeReadingResponse> {
    return this.requireModule().getReadingById(id);
  }

  updateReadingFlags(
    id: string,
    flags: { isFavorite?: boolean; shared?: boolean },
  ): Promise<NativeReadingResponse> {
    return this.requireModule().updateReadingFlags(id, flags);
  }

  saveInterpretation(
    interpretation: NativeInterpretation,
  ): Promise<NativeSaveInterpretationResponse> {
    const interpretationArg = Platform.OS === 'android' ? JSON.stringify(interpretation) : interpretation;
    return this.requireModule().saveInterpretation(interpretationArg as any);
  }

  getInterpretationByReadingId(readingId: string): Promise<NativeInterpretationResponse> {
    return this.requireModule().getInterpretationByReadingId(readingId);
  }

  deleteReading(id: string): Promise<boolean> {
    return this.requireModule().deleteReading(id);
  }

  deleteAllReadings(): Promise<number> {
    return this.requireModule().deleteAllReadings();
  }

  getDailyNotificationMessage(
    userId: string,
    date: string,
  ): Promise<NativeNotificationMessageResponse> {
    return this.requireModule().getDailyNotificationMessage(userId, date);
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
    const p = Platform.OS === 'android' ? JSON.stringify(passage) : passage;
    const s = Platform.OS === 'android' ? JSON.stringify(symbol) : symbol;
    return this.requireModule().requestInterpretation(p as any, s as any, situationText);
  }

  startInterpretationStream(
    passage: NativePassage,
    symbol: NativeSymbol,
    situationText?: string,
    userIntent?: string,
    useSonnet?: boolean,
  ): Promise<NativeStartInterpretationStreamResponse> {
    const p = Platform.OS === 'android' ? JSON.stringify(passage) : passage;
    const s = Platform.OS === 'android' ? JSON.stringify(symbol) : symbol;
    return this.requireModule().startInterpretationStream(
      p as any, s as any, situationText, userIntent,
      useSonnet ?? false,
    );
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

  setLocalDate(localDate: string): Promise<void> {
    return this.requireModule().setLocalDate(localDate);
  }

  redeemGift(token: string): Promise<NativeRedeemGiftResponse> {
    return this.requireModule().redeemGift(token);
  }

  createGift(sourceId?: string, buyerNote?: string): Promise<NativeCreateGiftResponse> {
    return this.requireModule().createGift(sourceId, buyerNote);
  }

  checkDeviceCapability(): Promise<NativeDeviceCapabilityResponse> {
    return this.requireModule().checkDeviceCapability();
  }

  getLocalModelStatus(): Promise<NativeLocalModelStatusResponse> {
    return this.requireModule().getLocalModelStatus();
  }

  prepareLocalModel(forceDownload: boolean): Promise<NativePrepareLocalModelResponse> {
    return this.requireModule().prepareLocalModel(forceDownload);
  }

  cancelLocalModelDownload(): Promise<NativeLocalModelStatusResponse> {
    return this.requireModule().cancelLocalModelDownload();
  }

  deleteLocalModel(): Promise<boolean> {
    return this.requireModule().deleteLocalModel();
  }

  startLocalInterpretationStream(
    passage: NativePassage,
    symbol: NativeSymbol,
    situationText?: string,
    userIntent?: string,
  ): Promise<NativeStartInterpretationStreamResponse> {
    const p = Platform.OS === 'android' ? JSON.stringify(passage) : passage;
    const s = Platform.OS === 'android' ? JSON.stringify(symbol) : symbol;
    return this.requireModule().startLocalInterpretationStream(
      p as any,
      s as any,
      situationText,
      userIntent,
    );
  }

  pollLocalInterpretationStream(
    requestId: string,
  ): Promise<NativeInterpretationStreamState> {
    return this.requireModule().pollLocalInterpretationStream(requestId);
  }

  cancelLocalInterpretationStream(
    requestId: string,
  ): Promise<NativeCancelInterpretationResponse> {
    return this.requireModule().cancelLocalInterpretationStream(requestId);
  }
}

export const aletheiaNativeClient = new AletheiaNativeClient();
