import { requireOptionalNativeModule } from "expo-modules-core";

export type NativeInitOptions = {
  dbPath: string;
  giftBackendUrl: string;
};

export type NativeBridgeError = {
  code: string;
  message: string;
};

export type NativeSymbol = {
  id: string;
  display_name: string;
  flavor_text?: string;
};

export type NativeTheme = {
  id: string;
  name: string;
  symbols: NativeSymbol[];
  is_premium: boolean;
  pack_id?: string;
  price_usd?: number;
};

export type NativeSource = {
  id: string;
  name: string;
  tradition: string;
  language: string;
  passage_count: number;
  is_bundled: boolean;
  is_premium: boolean;
  fallback_prompts: string[];
};

export type NativePassage = {
  id: string;
  source_id: string;
  reference: string;
  text: string;
  context?: string;
  resonance_context?: string;
};

export type NativeUserIntent = "clarity" | "comfort" | "challenge" | "guidance";

export type NativeReadingSession = {
  temp_id: string;
  source: NativeSource;
  theme: NativeTheme;
  symbols: NativeSymbol[];
  situation_text?: string;
  user_intent?: NativeUserIntent;
  started_at: number;
};

export type NativeReading = {
  id: string;
  created_at: number;
  source_id: string;
  passage_id: string;
  theme_id: string;
  symbol_chosen: string;
  symbol_method: string;
  situation_text?: string;
  ai_interpreted: boolean;
  ai_used_fallback: boolean;
  read_duration_s?: number;
  time_to_ai_request_s?: number;
  notification_opened: boolean;
  mood_tag?: string;
  is_favorite: boolean;
  shared: boolean;
  user_intent?: string;
};

export type NativeUserState = {
  user_id: string;
  subscription_tier: string;
  readings_today: number;
  ai_calls_today: number;
  session_count: number;
  last_reading_date?: string;
  notification_enabled: boolean;
  notification_time?: string;
  preferred_language: string;
  dark_mode: boolean;
  onboarding_complete: boolean;
  user_intent?: NativeUserIntent;
};

export type NativeNotificationMessage = {
  symbol_id: string;
  question: string;
  title: string;
  body: string;
};

export type NativeChosenPassage = {
  passage: NativePassage;
  reading_id: string;
};

export type NativeCompletedReading = {
  reading_id: string;
  saved_at: number;
};

export type NativePerformReadingResponse = {
  session?: NativeReadingSession;
  error?: NativeBridgeError;
};

export type NativeChooseSymbolResponse = {
  chosen?: NativeChosenPassage;
  error?: NativeBridgeError;
};

export type NativeCompleteReadingResponse = {
  completed?: NativeCompletedReading;
  error?: NativeBridgeError;
};

export type NativeFallbackPromptsResponse = {
  prompts: string[];
  error?: NativeBridgeError;
};

export type NativeAIInterpretation = {
  chunks: string[];
  used_fallback: boolean;
};

export type NativeRequestInterpretationResponse = {
  interpretation?: NativeAIInterpretation;
  error?: NativeBridgeError;
};

export type NativeStartInterpretationStreamResponse = {
  request_id?: string;
  error?: NativeBridgeError;
};

export type NativeInterpretationStreamState = {
  request_id: string;
  new_chunks: string[];
  full_text: string;
  done: boolean;
  used_fallback: boolean;
  cancelled: boolean;
  error?: NativeBridgeError;
};

export type NativeCancelInterpretationResponse = {
  cancelled: boolean;
  error?: NativeBridgeError;
};

export type NativeSetApiKeyOptions = {
  provider: string;
  key: string;
};

export type NativeSetApiKeyResponse = {
  applied: boolean;
  error?: NativeBridgeError;
};

export type NativeUserStateResponse = {
  state?: NativeUserState;
  error?: NativeBridgeError;
};

export type NativeUpdateUserStateResponse = {
  updated: boolean;
  error?: NativeBridgeError;
};

export type NativePaginatedReadings = {
  items: NativeReading[];
  total_count: number;
  has_more: boolean;
};

export type NativePaginatedReadingsResponse = {
  readings?: NativePaginatedReadings;
  error?: NativeBridgeError;
};

export type NativeSourcesResponse = {
  sources: NativeSource[];
  error?: NativeBridgeError;
};

export type NativeNotificationMessageResponse = {
  message?: NativeNotificationMessage;
  error?: NativeBridgeError;
};

export type NativeGiftReadingData = {
  token: string;
  buyer_note?: string;
  source_id?: string;
  created_at: number;
  expires_at: number;
  redeemed: boolean;
};

export type NativeRedeemGiftResponse = {
  gift?: NativeGiftReadingData;
  error?: NativeBridgeError;
};

export type NativeCreateGiftResponse = {
  token?: string;
  deep_link?: string;
  error?: NativeBridgeError;
};

export type NativeSeedBundledDataOptions = {
  sourcesJson: string;
  passagesJson: string;
  themesJson: string;
};

export type NativeSeedBundledDataResponse = {
  seeded: boolean;
  error?: NativeBridgeError;
};

export type NativeAletheiaModule = {
  init(options: NativeInitOptions): Promise<void>;
  seedBundledData(
    options: NativeSeedBundledDataOptions,
  ): Promise<NativeSeedBundledDataResponse>;
  setApiKey(
    options: NativeSetApiKeyOptions,
  ): Promise<NativeSetApiKeyResponse>;
  performReading(
    userId: string,
    sourceId?: string,
    situationText?: string,
  ): Promise<NativePerformReadingResponse>;
  chooseSymbol(
    session: NativeReadingSession,
    symbolId: string,
    method: string,
  ): Promise<NativeChooseSymbolResponse>;
  completeReading(
    userId: string,
    reading: NativeReading,
  ): Promise<NativeCompleteReadingResponse>;
  requestInterpretation(
    passage: NativePassage,
    symbol: NativeSymbol,
    situationText?: string,
  ): Promise<NativeRequestInterpretationResponse>;
  startInterpretationStream(
    passage: NativePassage,
    symbol: NativeSymbol,
    situationText?: string,
  ): Promise<NativeStartInterpretationStreamResponse>;
  pollInterpretationStream(
    requestId: string,
  ): Promise<NativeInterpretationStreamState>;
  cancelInterpretationStream(
    requestId: string,
  ): Promise<NativeCancelInterpretationResponse>;
  getFallbackPrompts(sourceId: string): Promise<NativeFallbackPromptsResponse>;
  getUserState(userId: string): Promise<NativeUserStateResponse>;
  updateUserState(state: NativeUserState): Promise<NativeUpdateUserStateResponse>;
  getSources(premiumAllowed: boolean): Promise<NativeSourcesResponse>;
  getReadings(limit: number, offset: number): Promise<NativePaginatedReadingsResponse>;
  getDailyNotificationMessage(
    userId: string,
    date: string,
  ): Promise<NativeNotificationMessageResponse>;
  setLocalDate(localDate: string): Promise<void>;
  redeemGift(token: string): Promise<NativeRedeemGiftResponse>;
  createGift(sourceId?: string, buyerNote?: string): Promise<NativeCreateGiftResponse>;
};

const nativeModule =
  requireOptionalNativeModule<NativeAletheiaModule>("AletheiaCoreModule");

export function getAletheiaCoreModule(): NativeAletheiaModule {
  if (!nativeModule) {
    throw new Error(
      "Aletheia native module is unavailable. Run expo prebuild and link the local module first.",
    );
  }

  return nativeModule;
}
