//! Aletheia Core - Error Types
//! Error handling aligned with executable contracts in core/src/contracts.rs

use crate::contracts::ErrorCode;
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug)]
pub struct AletheiaError {
    pub code: ErrorCode,
    pub message: String,
    pub context: Option<HashMap<String, Value>>,
}

impl AletheiaError {
    pub fn new(code: ErrorCode, message: &str) -> Self {
        Self {
            code,
            message: message.to_string(),
            context: None,
        }
    }

    pub fn with_context(mut self, key: &str, value: Value) -> Self {
        if self.context.is_none() {
            self.context = Some(HashMap::new());
        }
        if let Some(ref mut ctx) = self.context {
            ctx.insert(key.to_string(), value);
        }
        self
    }

    pub fn source_not_found(source_id: &str) -> Self {
        Self::new(
            ErrorCode::SourceNotFound,
            &format!("Source '{}' not found", source_id),
        )
        .with_context("source_id", Value::String(source_id.to_string()))
    }

    pub fn passage_empty(source_id: &str) -> Self {
        Self::new(
            ErrorCode::PassageEmpty,
            &format!("Source '{}' has no passages", source_id),
        )
        .with_context("source_id", Value::String(source_id.to_string()))
    }

    pub fn theme_not_found(theme_id: &str) -> Self {
        Self::new(
            ErrorCode::ThemeNotFound,
            &format!("Theme '{}' not found", theme_id),
        )
        .with_context("theme_id", Value::String(theme_id.to_string()))
    }

    pub fn symbol_invalid(symbol_id: &str, theme_id: &str) -> Self {
        Self::new(
            ErrorCode::SymbolInvalid,
            &format!("Symbol '{}' not in current theme", symbol_id),
        )
        .with_context("symbol_id", Value::String(symbol_id.to_string()))
        .with_context("theme_id", Value::String(theme_id.to_string()))
    }

    pub fn ai_timeout(timeout_ms: u32) -> Self {
        Self::new(
            ErrorCode::AiTimeout,
            &format!("No response after {}ms", timeout_ms),
        )
        .with_context("timeout_ms", Value::Number(timeout_ms.into()))
    }

    pub fn ai_unavailable() -> Self {
        Self::new(
            ErrorCode::AiUnavailable,
            "AI service temporarily unavailable",
        )
    }

    pub fn gift_expired(expired_at: i64) -> Self {
        Self::new(ErrorCode::GiftExpired, "Gift expired after 24 hours")
            .with_context("expired_at", Value::Number(expired_at.into()))
    }

    pub fn gift_not_found(token: &str) -> Self {
        Self::new(ErrorCode::GiftNotFound, "Gift not found")
            .with_context("token", Value::String(token.to_string()))
    }

    pub fn gift_already_redeemed(redeemed_at: i64) -> Self {
        Self::new(ErrorCode::GiftAlreadyRedeemed, "Gift already redeemed")
            .with_context("redeemed_at", Value::Number(redeemed_at.into()))
    }

    pub fn daily_limit_reached(used: u8, limit: u8, reset_at: &str) -> Self {
        Self::new(
            ErrorCode::DailyLimitReached,
            &format!("Daily limit reached: {}/{}", used, limit),
        )
        .with_context("used", Value::Number(used.into()))
        .with_context("limit", Value::Number(limit.into()))
        .with_context("reset_at", Value::String(reset_at.to_string()))
    }

    pub fn subscription_required(feature: &str) -> Self {
        Self::new(
            ErrorCode::SubscriptionRequired,
            &format!("Feature '{}' requires Pro", feature),
        )
        .with_context("feature", Value::String(feature.to_string()))
    }

    pub fn storage_write_fail(operation: &str) -> Self {
        Self::new(
            ErrorCode::StorageWriteFail,
            &format!("Failed to write: {}", operation),
        )
        .with_context("operation", Value::String(operation.to_string()))
    }

    pub fn invalid_input(field: &str, reason: &str) -> Self {
        Self::new(
            ErrorCode::InvalidInput,
            &format!("Invalid {}: {}", field, reason),
        )
        .with_context("field", Value::String(field.to_string()))
        .with_context("reason", Value::String(reason.to_string()))
    }
}

impl std::fmt::Display for AletheiaError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}] {}", self.code.as_str(), self.message)
    }
}

impl std::error::Error for AletheiaError {}

impl From<rusqlite::Error> for AletheiaError {
    fn from(err: rusqlite::Error) -> Self {
        AletheiaError::new(
            ErrorCode::StorageWriteFail,
            &format!("Database error: {}", err),
        )
    }
}

impl From<reqwest::Error> for AletheiaError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            AletheiaError::ai_timeout(15_000)
        } else {
            AletheiaError::ai_unavailable()
        }
    }
}
