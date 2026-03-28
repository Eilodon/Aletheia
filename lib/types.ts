/**
 * Aletheia Type Definitions
 * AUTO-GENERATED - Do not edit manually
 * Sync from: core/src/contracts.rs
 * Last synced: 2026-03-28
 * 
 * Based on CONTRACTS.md — single source of truth for all schemas
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum Tradition {
  Chinese = "Chinese",
  Christian = "Christian",
  Islamic = "Islamic",
  Sufi = "Sufi",
  Stoic = "Stoic",
  Universal = "Universal",
}

export enum SymbolMethod {
  Manual = "Manual",
  Auto = "Auto",
}

export enum MoodTag {
  Confused = "Confused",
  Hopeful = "Hopeful",
  Anxious = "Anxious",
  Curious = "Curious",
  Grateful = "Grateful",
  Grief = "Grief",
}

export enum SubscriptionTier {
  Free = "Free",
  Pro = "Pro",
}

export enum ReadingState {
  Idle = "Idle",
  SituationInput = "SituationInput",
  SourceSelection = "SourceSelection",
  WildcardReveal = "WildcardReveal",
  WildcardChosen = "WildcardChosen",
  RitualAnimation = "RitualAnimation",
  PassageDisplayed = "PassageDisplayed",
  AiStreaming = "AiStreaming",
  AiFallback = "AiFallback",
  Complete = "Complete",
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
  mood_tag: MoodTag | undefined;
  is_favorite: boolean;
  shared: boolean;
}

export interface NotificationEntry {
  symbol_id: string;
  question: string;
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
  last_reading_date: string | undefined;
  notification_enabled: boolean;
  notification_time: string | undefined;
  preferred_language: string;
  dark_mode: boolean;
  onboarding_complete: boolean;
}

export interface ReadingSession {
  temp_id: string;
  source: Source;
  theme: Theme;
  symbols: Symbol[];
  situation_text: string | undefined;
  started_at: number;
}

export interface CompletedReading {
  reading_id: string;
  saved_at: number;
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

