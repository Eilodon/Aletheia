//! Aletheia Core - Type Definitions
//! Based on CONTRACTS.md - Single source of truth

use serde::{Deserialize, Serialize};

// ============================================================================
// ENUMS
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Tradition {
    Chinese,
    Christian,
    Islamic,
    Sufi,
    Stoic,
    Universal,
}

impl Default for Tradition {
    fn default() -> Self {
        Tradition::Universal
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SymbolMethod {
    Manual,
    Auto,
}

impl Default for SymbolMethod {
    fn default() -> Self {
        SymbolMethod::Manual
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MoodTag {
    Confused,
    Hopeful,
    Anxious,
    Curious,
    Grateful,
    Grief,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SubscriptionTier {
    Free,
    Pro,
}

impl Default for SubscriptionTier {
    fn default() -> Self {
        SubscriptionTier::Free
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ReadingState {
    Idle,
    SituationInput,
    SourceSelection,
    WildcardReveal,
    WildcardChosen,
    RitualAnimation,
    PassageDisplayed,
    AiStreaming,
    AiFallback,
    Complete,
}

impl Default for ReadingState {
    fn default() -> Self {
        ReadingState::Idle
    }
}

// ============================================================================
// CONSTANTS
// ============================================================================

#[allow(dead_code)]
pub const FREE_READINGS_PER_DAY: u8 = 3;
#[allow(dead_code)]
pub const FREE_AI_PER_DAY: u8 = 1;
#[allow(dead_code)]
pub const PRO_PRICE_MONTHLY_USD: f32 = 3.99;
#[allow(dead_code)]
pub const PRO_PRICE_YEARLY_USD: f32 = 29.99;
#[allow(dead_code)]
pub const GIFT_READING_PRICE_USD: f32 = 0.99;
#[allow(dead_code)]
pub const THEME_PACK_PRICE_USD: f32 = 1.99;

#[allow(dead_code)]
pub const WILDCARD_AUTO_DELAY_MS: u32 = 800;
#[allow(dead_code)]
pub const SYMBOL_FADE_STAGGER_MS: u32 = 200;
pub const AI_STREAM_TIMEOUT_MS: u32 = 15_000;
pub const NOTIFICATION_MATRIX_SIZE: u16 = 150;

#[allow(dead_code)]
pub const MIN_PASSAGE_CHARS: u16 = 20;
#[allow(dead_code)]
pub const MAX_PASSAGE_CHARS: u16 = 500;

#[allow(dead_code)]
pub const FREE_HISTORY_DAYS: u16 = 30;
pub const GIFT_LINK_TTL_SECONDS: u32 = 86_400;

// Pagination
#[allow(dead_code)]
pub const DEFAULT_PAGE_SIZE: u32 = 20;
#[allow(dead_code)]
pub const MAX_PAGE_SIZE: u32 = 100;

// ============================================================================
// CORE SCHEMAS
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Symbol {
    pub id: String,
    pub display_name: String,
    pub flavor_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Theme {
    pub id: String,
    pub name: String,
    pub symbols: Vec<Symbol>,
    pub is_premium: bool,
    pub pack_id: Option<String>,
    pub price_usd: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Source {
    pub id: String,
    pub name: String,
    pub tradition: Tradition,
    pub language: String,
    pub passage_count: u32,
    pub is_bundled: bool,
    pub is_premium: bool,
    pub fallback_prompts: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Passage {
    pub id: String,
    pub source_id: String,
    pub reference: String,
    pub text: String,
    pub context: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reading {
    pub id: String,
    pub created_at: i64,
    pub source_id: String,
    pub passage_id: String,
    pub theme_id: String,
    pub symbol_chosen: String,
    pub symbol_method: SymbolMethod,
    pub situation_text: Option<String>,
    pub ai_interpreted: bool,
    pub ai_used_fallback: bool,
    pub read_duration_s: Option<u32>,
    pub mood_tag: Option<MoodTag>,
    pub is_favorite: bool,
    pub shared: bool,
}

impl Reading {
    pub fn new(
        id: String,
        source_id: String,
        passage_id: String,
        theme_id: String,
        symbol_chosen: String,
        symbol_method: SymbolMethod,
    ) -> Self {
        Self {
            id,
            created_at: chrono_timestamp(),
            source_id,
            passage_id,
            theme_id,
            symbol_chosen,
            symbol_method,
            situation_text: None,
            ai_interpreted: false,
            ai_used_fallback: false,
            read_duration_s: None,
            mood_tag: None,
            is_favorite: false,
            shared: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationEntry {
    pub symbol_id: String,
    pub question: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GiftReading {
    pub token: String,
    pub buyer_note: Option<String>,
    pub source_id: Option<String>,
    pub created_at: i64,
    pub expires_at: i64,
    pub redeemed: bool,
    pub redeemed_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserState {
    pub user_id: String,
    pub subscription_tier: SubscriptionTier,
    pub readings_today: u8,
    pub ai_calls_today: u8,
    pub last_reading_date: Option<String>,
    pub notification_enabled: bool,
    pub notification_time: Option<String>,
    pub preferred_language: String,
    pub dark_mode: bool,
    pub onboarding_complete: bool,
}

impl Default for UserState {
    fn default() -> Self {
        Self {
            user_id: "local-user".to_string(),
            subscription_tier: SubscriptionTier::Free,
            readings_today: 0,
            ai_calls_today: 0,
            last_reading_date: None,
            notification_enabled: true,
            notification_time: Some("09:00".to_string()),
            preferred_language: "vi".to_string(),
            dark_mode: false,
            onboarding_complete: false,
        }
    }
}

// ============================================================================
// SESSION & RUNTIME TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadingSession {
    pub temp_id: String,
    pub source: Source,
    pub theme: Theme,
    pub symbols: Vec<Symbol>,
    pub situation_text: Option<String>,
    pub started_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletedReading {
    pub reading_id: String,
    pub saved_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShareCard {
    pub passage_text: String,
    pub symbol: Symbol,
    pub reference: String,
    pub tradition: Tradition,
    pub generated_at: i64,
    pub has_watermark: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedReadings {
    pub items: Vec<Reading>,
    pub total_count: u32,
    pub has_more: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CancellationToken {
    pub id: String,
    pub is_cancelled: bool,
}

// ============================================================================
// API & ERROR TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AletheiaError {
    pub code: ErrorCode,
    pub message: String,
    pub context: Option<std::collections::HashMap<String, serde_json::Value>>,
}

impl AletheiaError {
    #[allow(dead_code)]
    pub fn new(code: ErrorCode, message: &str) -> Self {
        Self {
            code,
            message: message.to_string(),
            context: None,
        }
    }

    #[allow(dead_code)]
    pub fn with_context(mut self, key: &str, value: serde_json::Value) -> Self {
        if self.context.is_none() {
            self.context = Some(std::collections::HashMap::new());
        }
        if let Some(ref mut ctx) = self.context {
            ctx.insert(key.to_string(), value);
        }
        self
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    SourceNotFound,
    PassageEmpty,
    ThemeNotFound,
    SymbolInvalid,
    AiTimeout,
    AiUnavailable,
    GiftExpired,
    GiftNotFound,
    GiftAlreadyRedeemed,
    DailyLimitReached,
    SubscriptionRequired,
    StorageWriteFail,
    InvalidInput,
}

impl ErrorCode {
    pub fn as_str(&self) -> &'static str {
        match self {
            ErrorCode::SourceNotFound => "ERR_SOURCE_NOT_FOUND",
            ErrorCode::PassageEmpty => "ERR_PASSAGE_EMPTY",
            ErrorCode::ThemeNotFound => "ERR_THEME_NOT_FOUND",
            ErrorCode::SymbolInvalid => "ERR_SYMBOL_INVALID",
            ErrorCode::AiTimeout => "ERR_AI_TIMEOUT",
            ErrorCode::AiUnavailable => "ERR_AI_UNAVAILABLE",
            ErrorCode::GiftExpired => "ERR_GIFT_EXPIRED",
            ErrorCode::GiftNotFound => "ERR_GIFT_NOT_FOUND",
            ErrorCode::GiftAlreadyRedeemed => "ERR_GIFT_ALREADY_REDEEMED",
            ErrorCode::DailyLimitReached => "ERR_DAILY_LIMIT_REACHED",
            ErrorCode::SubscriptionRequired => "ERR_SUBSCRIPTION_REQUIRED",
            ErrorCode::StorageWriteFail => "ERR_STORAGE_WRITE_FAIL",
            ErrorCode::InvalidInput => "ERR_INVALID_INPUT",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIRequest {
    pub reading_id: String,
    pub passage: Passage,
    pub symbol: Symbol,
    pub situation_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GiftRequest {
    pub token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GiftResponse {
    pub token: String,
    pub deep_link: String,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

pub fn chrono_timestamp() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

pub fn generate_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

pub fn generate_base62_token(length: usize) -> String {
    let chars: Vec<char> = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
        .chars()
        .collect();
    let mut rng = rand::thread_rng();
    (0..length)
        .map(|_| chars[rand::Rng::gen_range(&mut rng, 0..chars.len())])
        .collect()
}
