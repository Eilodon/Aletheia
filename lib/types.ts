/**
 * Aletheia Type Definitions
 * AUTO-GENERATED - Do not edit manually
 * Sync from: core/src/contracts.rs and core/src/aletheia.udl
 * Last synced: 2026-03-30
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

export enum SymbolMethod {
  Manual = "manual",
  Auto = "auto",
}

export enum UserIntent {
  Clarity = "clarity",     // "Sự rõ ràng" → suggest Stoic/Tao
  Comfort = "comfort",     // "Sự an ủi" → suggest Rumi/Sufi
  Challenge = "challenge", // "Một thách thức" → suggest I Ching
  Guidance = "guidance",   // "Để vũ trụ dẫn lối" → truly random
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
}

export interface Passage {
  id: string;
  source_id: string;
  reference: string;
  text: string;
  context: string | undefined;
  /** Hidden context injected into AI prompt for deeper interpretation - not shown to user */
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
}

export interface ReadingSession {
  temp_id: string;
  source: Source;
  theme: Theme;
  symbols: Symbol[];
  situation_text: string | undefined;
  user_intent: UserIntent | undefined; // UX-01: from "Which Mirror Are You"
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

export interface CancellationToken {
  id: string;
  is_cancelled: boolean;
}

export interface AletheiaError {
  code: ErrorCode;
  message: string;
  context: Record<string, unknown> | undefined;
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
