/**
 * Aletheia Type Definitions
 * SYNC WITH: core/src/contracts.rs
 * Last synced: 2026-03-28
 * TODO: Add sync script in build pipeline
 *
 * Based on CONTRACTS.md — single source of truth for all schemas
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
  AIStreaming = "ai_streaming",
  AIFallback = "ai_fallback",
  Complete = "complete",
}

export enum ErrorCode {
  SourceNotFound = "ERR_SOURCE_NOT_FOUND",
  PassageEmpty = "ERR_PASSAGE_EMPTY",
  ThemeNotFound = "ERR_THEME_NOT_FOUND",
  SymbolInvalid = "ERR_SYMBOL_INVALID",
  AITimeout = "ERR_AI_TIMEOUT",
  AIUnavailable = "ERR_AI_UNAVAILABLE",
  GiftExpired = "ERR_GIFT_EXPIRED",
  GiftNotFound = "ERR_GIFT_NOT_FOUND",
  GiftAlreadyRedeemed = "ERR_GIFT_ALREADY_REDEEMED",
  DailyLimitReached = "ERR_DAILY_LIMIT_REACHED",
  SubscriptionRequired = "ERR_SUBSCRIPTION_REQUIRED",
  StorageWriteFail = "ERR_STORAGE_WRITE_FAIL",
  InvalidInput = "ERR_INVALID_INPUT",
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const FREE_READINGS_PER_DAY = 3;
export const FREE_AI_PER_DAY = 1;
export const PRO_PRICE_MONTHLY_USD = 3.99;
export const PRO_PRICE_YEARLY_USD = 29.99;
export const GIFT_READING_PRICE_USD = 0.99;
export const THEME_PACK_PRICE_USD = 1.99;

export const WILDCARD_AUTO_DELAY_MS = 800;
export const SYMBOL_FADE_STAGGER_MS = 200;
export const AI_STREAM_TIMEOUT_MS = 15_000;
export const NOTIFICATION_MATRIX_SIZE = 150;

export const MIN_PASSAGE_CHARS = 20;
export const MAX_PASSAGE_CHARS = 500;

export const FREE_HISTORY_DAYS = 30;
export const GIFT_LINK_TTL_SECONDS = 86_400; // 24 hours

// ============================================================================
// CORE SCHEMAS
// ============================================================================

export interface Symbol {
  id: string; // unique within theme, e.g., "candle", "key", "dawn"
  display_name: string; // e.g., "Ngọn nến"
  flavor_text?: string; // optional description
}

export interface Theme {
  id: string;
  name: string; // e.g., "Khoảnh khắc"
  symbols: Symbol[]; // 10-30 symbols
  is_premium: boolean;
  pack_id?: string;
  price_usd?: number; // present if is_premium = true
}

export interface Source {
  id: string; // e.g., "i_ching", "bible_kjv"
  name: string; // e.g., "I Ching — Kinh Dịch"
  tradition: Tradition;
  language: string; // ISO 639-1, e.g., "vi", "en"
  passage_count: number;
  is_bundled: boolean;
  is_premium: boolean;
  fallback_prompts: string[]; // 3 static reflection prompts
}

export interface Passage {
  id: string;
  source_id: string; // FK → Source.id
  reference: string; // e.g., "Hexagram 42 · 益", "John 3:16"
  text: string; // 20-500 characters
  context?: string; // optional annotation
}

export interface Reading {
  // Identity
  id: string; // UUID v4
  created_at: number; // Unix timestamp ms

  // Core
  source_id: string; // FK → Source.id
  passage_id: string; // FK → Passage.id

  // Wildcard (mandatory)
  theme_id: string; // FK → Theme.id
  symbol_chosen: string; // FK → Symbol.id
  symbol_method: SymbolMethod; // Manual | Auto

  // Context (optional)
  situation_text?: string;

  // Engagement signals
  ai_interpreted: boolean; // User tapped "Diễn giải"?
  ai_used_fallback: boolean; // True if static prompts used
  read_duration_s?: number; // Seconds user spent reading
  mood_tag?: MoodTag;
  is_favorite: boolean;

  // Social
  shared: boolean;
}

export interface NotificationEntry {
  symbol_id: string; // FK → Symbol.id
  question: string; // 10-60 characters, no trailing "?"
}

export interface GiftReading {
  token: string; // UUID v4
  buyer_note?: string;
  source_id?: string;
  created_at: number;
  expires_at: number;
  redeemed: boolean;
  redeemed_at?: number;
}

export interface UserState {
  user_id: string; // Local UUID
  subscription_tier: SubscriptionTier;
  readings_today: number;
  ai_calls_today: number;
  last_reading_date: string; // ISO date "2026-03-18"
  notification_enabled: boolean;
  notification_time: string; // HH:mm format
  preferred_language: string; // ISO 639-1
  dark_mode: boolean;
}

// ============================================================================
// SESSION & RUNTIME TYPES
// ============================================================================

export interface ReadingSession {
  temp_id: string; // UUID v4, not yet saved
  source: Source;
  theme: Theme;
  symbols: Symbol[]; // exactly 3
  situation_text?: string;
  started_at: number; // Unix timestamp ms
}

export interface InterpretationStream {
  stream: AsyncIterable<string>;
  is_fallback: boolean;
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

// ============================================================================
// API & ERROR TYPES
// ============================================================================

export interface AletheiaError {
  code: ErrorCode;
  message: string;
  context?: Record<string, unknown>;
}

export interface AIRequest {
  reading_id: string;
  passage: Passage;
  symbol: Symbol;
  situation_text?: string;
}

export interface GiftRequest {
  token: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type Result<T> = { ok: true; data: T } | { ok: false; error: AletheiaError };

export interface ReadingInput {
  source_id?: string;
  situation_text?: string;
}
