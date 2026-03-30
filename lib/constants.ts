/**
 * Business configuration constants
 * SYNC WITH: core/src/contracts.rs
 */

// Reading limits
export const FREE_READINGS_PER_DAY = 3;
export const FREE_AI_PER_DAY = 1;

// Pricing
export const PRO_PRICE_MONTHLY_USD = 3.99;
export const PRO_PRICE_YEARLY_USD = 29.99;
export const GIFT_READING_PRICE_USD = 0.99;
export const THEME_PACK_PRICE_USD = 1.99;

// UX timing
export const WILDCARD_AUTO_DELAY_MS = 800;
export const SYMBOL_FADE_STAGGER_MS = 200;
export const AI_STREAM_TIMEOUT_MS = 15_000;

// Notification
export const NOTIFICATION_MATRIX_SIZE = 150;

// Content constraints
export const MIN_PASSAGE_CHARS = 20;
export const MAX_PASSAGE_CHARS = 500;

// History & gifts
export const FREE_HISTORY_DAYS = 30;
export const GIFT_LINK_TTL_SECONDS = 86_400; // 24 hours

// Auth (from shared/const.ts)
export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = "Please login (10001)";
export const NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
