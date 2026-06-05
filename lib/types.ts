/**
 * Aletheia Type Definitions
 * AUTO-GENERATED - Do not edit manually
 * Sync from: core/src/contracts.rs and core/src/aletheia.udl
 * Last synced: 2026-06-02
 *
 * Executable Rust contracts are the source of truth.
 * docs/CONTRACTS.md is a synchronized reference, not the authority.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum Tradition {
  Chinese = "chinese",
  Christian = "christian",
  Islamic = "islamic",
  Sufi = "sufi",
  Stoic = "stoic",
  Universal = "universal",
}

export enum SourceType {
  Hexagram = "hexagram",
  Bibliomancy = "bibliomancy",
  Meditation = "meditation",
}

export enum SymbolMethod {
  Manual = "manual",
  Auto = "auto",
}

export enum MoodTag {
  Confused = "confused",
  Hopeful = "hopeful",
  Anxious = "anxious",
  Curious = "curious",
  Grateful = "grateful",
  Grief = "grief",
}

export enum SubscriptionTier {
  Free = "free",
  Pro = "pro",
}

export enum ReadingState {
  Idle = "idle",
  SituationInput = "situation_input",
  SourceSelection = "source_selection",
  WildcardReveal = "wildcard_reveal",
  WildcardChosen = "wildcard_chosen",
  RitualAnimation = "ritual_animation",
  PassageDisplayed = "passage_displayed",
  AiStreaming = "ai_streaming",
  AiFallback = "ai_fallback",
  Complete = "complete",
}

export enum UserIntent {
  Clarity = "clarity",
  Comfort = "comfort",
  Challenge = "challenge",
  Guidance = "guidance",
}

export type LocalModelStatus =
  | "not_downloaded"
  | "downloading"
  | "ready"
  | "update_available"
  | "error"
  | "unsupported";

export type InferenceMode = "local" | "cloud" | "fallback" | "offline";

export type ArchiveFilter = "all" | "favorites" | "ai" | "shared";

export type ArchiveSort = "latest" | "oldest" | "depth";

export type ToastKind = "success" | "warn" | "error" | "info";

export enum ErrorCode {
  SourceNotFound = "source_not_found",
  PassageEmpty = "passage_empty",
  ThemeNotFound = "theme_not_found",
  SymbolInvalid = "symbol_invalid",
  AiTimeout = "ai_timeout",
  AiUnavailable = "ai_unavailable",
  GiftExpired = "gift_expired",
  GiftNotFound = "gift_not_found",
  GiftAlreadyRedeemed = "gift_already_redeemed",
  DailyLimitReached = "daily_limit_reached",
  SubscriptionRequired = "subscription_required",
  StorageWriteFail = "storage_write_fail",
  InvalidInput = "invalid_input",
}

// ============================================================================
// CORE SCHEMAS
// ============================================================================

export interface AletheiaError {
  code: ErrorCode;
  message: string;
  context: Record<string, unknown> | undefined;
}

export interface Symbol {
  id: string;
  display_name: string;
  flavor_text: string | undefined;
}

export interface Theme {
  id: string;
  name: string;
  symbols: Symbol[];
  is_premium: boolean;
  pack_id: string | undefined;
  price_usd: number | undefined;
}

export interface Source {
  id: string;
  name: string;
  tradition: Tradition;
  language: string;
  passage_count: number;
  is_bundled: boolean;
  is_premium: boolean;
  fallback_prompts: string[];
  source_type: SourceType;
}

export interface Passage {
  id: string;
  source_id: string;
  reference: string;
  text: string;
  context: string | undefined;
  resonance_context: string | undefined;
}

export interface Reading {
  id: string;
  created_at: number;
  source_id: string;
  passage_id: string;
  theme_id: string;
  symbol_chosen: string;
  symbol_method: SymbolMethod;
  situation_text: string | undefined;
  ai_interpreted: boolean;
  ai_used_fallback: boolean;
  read_duration_s: number | undefined;
  time_to_ai_request_s: number | undefined;
  notification_opened: boolean;
  mood_tag: MoodTag | undefined;
  is_favorite: boolean;
  shared: boolean;
  user_intent: UserIntent | undefined;
  hide_situation?: boolean;
}

export interface NotificationEntry {
  symbol_id: string;
  question: string;
}

export interface NotificationMessage {
  symbol_id: string;
  question: string;
  title: string;
  body: string;
}

export interface GiftReading {
  token: string;
  buyer_note: string | undefined;
  source_id: string | undefined;
  created_at: number;
  expires_at: number;
  redeemed: boolean;
  redeemed_at: number | undefined;
}

export interface GiftReadingData {
  token: string;
  buyer_note: string | undefined;
  source_id: string | undefined;
  created_at: number;
  expires_at: number;
  redeemed: boolean;
}

export interface RedeemGiftResponse {
  gift: GiftReadingData | undefined;
  error: BridgeError | undefined;
}

export interface CreateGiftResponse {
  token: string | undefined;
  deep_link: string | undefined;
  error: BridgeError | undefined;
}

export interface UserState {
  user_id: string;
  subscription_tier: SubscriptionTier;
  readings_today: number;
  ai_calls_today: number;
  session_count: number;
  last_reading_date: string | undefined;
  notification_enabled: boolean;
  notification_time: string | undefined;
  preferred_language: string;
  dark_mode: boolean;
  onboarding_complete: boolean;
  user_intent: UserIntent | undefined;
  weekly_summary_enabled: boolean;
}

export interface ReadingSession {
  temp_id: string;
  source: Source;
  theme: Theme;
  symbols: Symbol[];
  situation_text: string | undefined;
  user_intent: UserIntent | undefined;
  started_at: number;
}

export interface CompletedReading {
  reading_id: string;
  saved_at: number;
}

export interface ChosenPassage {
  passage: Passage;
  reading_id: string;
}

export interface ShareCard {
  passage_text: string;
  symbol: Symbol;
  reference: string;
  tradition: Tradition;
  generated_at: number;
  has_watermark: boolean;
}

export interface PaginatedReadings {
  items: Reading[];
  total_count: number;
  has_more: boolean;
}

export interface SourcesResponse {
  sources: Source[];
  error: BridgeError | undefined;
}

export interface NotificationMessageResponse {
  message: NotificationMessage | undefined;
  error: BridgeError | undefined;
}

export interface CancellationToken {
  id: string;
  is_cancelled: boolean;
}

export interface BridgeError {
  code: string;
  message: string;
}

export interface PerformReadingResponse {
  session: ReadingSession | undefined;
  error: BridgeError | undefined;
}

export interface ChooseSymbolResponse {
  chosen: ChosenPassage | undefined;
  error: BridgeError | undefined;
}

export interface CompleteReadingResponse {
  completed: CompletedReading | undefined;
  error: BridgeError | undefined;
}

export interface FallbackPromptsResponse {
  prompts: string[];
  error: BridgeError | undefined;
}

export interface UserStateResponse {
  state: UserState | undefined;
  error: BridgeError | undefined;
}

export interface UpdateUserStateResponse {
  updated: boolean;
  error: BridgeError | undefined;
}

export interface PaginatedReadingsResponse {
  readings: PaginatedReadings | undefined;
  error: BridgeError | undefined;
}

export interface ReadingResponse {
  reading: Reading | undefined;
  error: BridgeError | undefined;
}

export interface LocalModelInfo {
  model_id: string;
  status: LocalModelStatus;
  download_progress: number;
  model_size_bytes: number;
  downloaded_bytes: number;
  version: string;
  error_message: string | undefined;
  eta_seconds: number | undefined;
  device_capable: boolean;
  required_ram_mb: number;
  available_ram_mb: number;
}

export interface LocalModelStatusResponse {
  model_info: LocalModelInfo | undefined;
  error: BridgeError | undefined;
}

export interface PrepareLocalModelResponse {
  started: boolean;
  model_info: LocalModelInfo | undefined;
  error: BridgeError | undefined;
}

export interface DeviceCapability {
  supported: boolean;
  available_ram_mb: number;
  cpu_cores: number;
  has_simd: boolean;
  estimated_tps: number;
  unsupported_reason: string | undefined;
}

export interface DeviceCapabilityResponse {
  capability: DeviceCapability | undefined;
  error: BridgeError | undefined;
}

export interface AIInterpretation {
  chunks: string[];
  used_fallback: boolean;
}

export interface RequestInterpretationResponse {
  interpretation: AIInterpretation | undefined;
  error: BridgeError | undefined;
}

export interface SetApiKeyResponse {
  applied: boolean;
  error: BridgeError | undefined;
}

export interface StartInterpretationStreamResponse {
  request_id: string | undefined;
  error: BridgeError | undefined;
}

export interface InterpretationStreamState {
  request_id: string;
  new_chunks: string[];
  full_text: string;
  done: boolean;
  used_fallback: boolean;
  cancelled: boolean;
  error: BridgeError | undefined;
}

export interface CancelInterpretationResponse {
  cancelled: boolean;
  error: BridgeError | undefined;
}

export interface SeedBundledDataResponse {
  seeded: boolean;
  error: BridgeError | undefined;
}

export interface AIRequest {
  reading_id: string;
  passage: Passage;
  symbol: Symbol;
  situation_text: string | undefined;
}

export interface GiftRequest {
  token: string;
}

export interface GiftResponse {
  token: string;
  deep_link: string;
}
