/**
 * Runtime Validation - Verify enum values match between layers
 * 
 * This module provides runtime validation to catch enum drift
 * between TypeScript, Rust, and database layers
 */

import {
  Tradition,
  SymbolMethod,
  MoodTag,
  SubscriptionTier,
  ReadingState,
  ErrorCode,
} from "@/lib/types";

// ============================================================================
// ENUM VALIDATORS
// ============================================================================

const TRADITION_VALUES = new Set(Object.values(Tradition));
const SYMBOL_METHOD_VALUES = new Set(Object.values(SymbolMethod));
const MOOD_TAG_VALUES = new Set(Object.values(MoodTag));
const SUBSCRIPTION_TIER_VALUES = new Set(Object.values(SubscriptionTier));
const READING_STATE_VALUES = new Set(Object.values(ReadingState));
const ERROR_CODE_VALUES = new Set(Object.values(ErrorCode));

export function isValidTradition(value: string): boolean {
  return TRADITION_VALUES.has(value as Tradition);
}

export function isValidSymbolMethod(value: string): boolean {
  return SYMBOL_METHOD_VALUES.has(value as SymbolMethod);
}

export function isValidMoodTag(value: string | undefined): value is MoodTag {
  if (!value) return true; // undefined is valid (optional)
  return MOOD_TAG_VALUES.has(value as MoodTag);
}

export function isValidSubscriptionTier(value: string): boolean {
  return SUBSCRIPTION_TIER_VALUES.has(value as SubscriptionTier);
}

export function isValidReadingState(value: string): boolean {
  return READING_STATE_VALUES.has(value as ReadingState);
}

export function isValidErrorCode(value: string): boolean {
  return ERROR_CODE_VALUES.has(value as ErrorCode);
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function assertTradition(value: string, context?: string): asserts value is Tradition {
  if (!isValidTradition(value)) {
    throw new Error(`Invalid Tradition "${value}"${context ? ` in ${context}` : ""}`);
  }
}

export function assertSymbolMethod(value: string, context?: string): asserts value is SymbolMethod {
  if (!isValidSymbolMethod(value)) {
    throw new Error(`Invalid SymbolMethod "${value}"${context ? ` in ${context}` : ""}`);
  }
}

export function assertMoodTag(value: string | undefined, context?: string): asserts value is MoodTag | undefined {
  if (!isValidMoodTag(value)) {
    throw new Error(`Invalid MoodTag "${value}"${context ? ` in ${context}` : ""}`);
  }
}

export function assertSubscriptionTier(value: string, context?: string): asserts value is SubscriptionTier {
  if (!isValidSubscriptionTier(value)) {
    throw new Error(`Invalid SubscriptionTier "${value}"${context ? ` in ${context}` : ""}`);
  }
}

export function assertReadingState(value: string, context?: string): asserts value is ReadingState {
  if (!isValidReadingState(value)) {
    throw new Error(`Invalid ReadingState "${value}"${context ? ` in ${context}` : ""}`);
  }
}

export function assertErrorCode(value: string, context?: string): asserts value is ErrorCode {
  if (!isValidErrorCode(value)) {
    throw new Error(`Invalid ErrorCode "${value}"${context ? ` in ${context}` : ""}`);
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateReading(reading: {
  symbol_method?: string;
  mood_tag?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (reading.symbol_method && !isValidSymbolMethod(reading.symbol_method)) {
    errors.push(`Invalid symbol_method: ${reading.symbol_method}`);
  }

  if (!isValidMoodTag(reading.mood_tag)) {
    errors.push(`Invalid mood_tag: ${reading.mood_tag}`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateUserState(state: {
  subscription_tier?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (state.subscription_tier && !isValidSubscriptionTier(state.subscription_tier)) {
    errors.push(`Invalid subscription_tier: ${state.subscription_tier}`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateSource(source: {
  tradition?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (source.tradition && !isValidTradition(source.tradition)) {
    errors.push(`Invalid tradition: ${source.tradition}`);
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// DATABASE VALUE CONVERSION
// ============================================================================

/**
 * Convert database string to TypeScript enum
 * Throws if value is invalid
 */
export function dbToTradition(value: string): Tradition {
  assertTradition(value, "database");
  return value;
}

export function dbToSymbolMethod(value: string): SymbolMethod {
  assertSymbolMethod(value, "database");
  return value;
}

export function dbToMoodTag(value: string | undefined): MoodTag | undefined {
  if (!value) return undefined;
  assertMoodTag(value, "database");
  return value;
}

export function dbToSubscriptionTier(value: string): SubscriptionTier {
  assertSubscriptionTier(value, "database");
  return value;
}

export function dbToReadingState(value: string): ReadingState {
  assertReadingState(value, "database");
  return value;
}

export function dbToErrorCode(value: string): ErrorCode {
  assertErrorCode(value, "database");
  return value;
}

/**
 * Convert TypeScript enum to database string
 */
export function traditionToDb(value: Tradition): string {
  return value;
}

export function symbolMethodToDb(value: SymbolMethod): string {
  return value;
}

export function moodTagToDb(value: MoodTag | undefined): string | undefined {
  return value;
}

export function subscriptionTierToDb(value: SubscriptionTier): string {
  return value;
}

export function readingStateToDb(value: ReadingState): string {
  return value;
}

export function errorCodeToDb(value: ErrorCode): string {
  return value;
}
