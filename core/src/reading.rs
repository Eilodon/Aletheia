//! Aletheia Core - Reading Engine
//! Orchestrates the reading flow: perform_reading, choose_symbol, complete_reading

use crate::contracts::*;
use crate::errors::AletheiaError;
use crate::store::Store;
use crate::theme::ThemeEngine;
use std::sync::Arc;
use tracing::info;

pub struct ReadingEngine {
    store: Arc<Store>,
    theme_engine: ThemeEngine,
}

impl ReadingEngine {
    pub fn new(store: Arc<Store>) -> Self {
        Self {
            store: Arc::clone(&store),
            theme_engine: ThemeEngine::new(Arc::clone(&store)),
        }
    }

    pub fn perform_reading(
        &self,
        user_id: &str,
        source_id: Option<String>,
        situation_text: Option<String>,
    ) -> Result<ReadingSession, AletheiaError> {
        // Check daily limit for Free tier
        let user_state = self.store.get_user_state(user_id)?;
        
        if user_state.subscription_tier == SubscriptionTier::Free 
            && user_state.readings_today >= FREE_READINGS_PER_DAY 
        {
            let today = chrono_date();
            return Err(AletheiaError::daily_limit_reached(
                user_state.readings_today,
                FREE_READINGS_PER_DAY,
                &today,
            ));
        }

        // Resolve source
        let source = if let Some(sid) = source_id {
            self.store
                .get_source(&sid)?
                .ok_or_else(|| AletheiaError::source_not_found(&sid))?
        } else {
            let premium_allowed = user_state.subscription_tier == SubscriptionTier::Pro;
            self.store
                .get_random_source(premium_allowed)?
                .ok_or_else(|| AletheiaError::source_not_found("any"))?
        };

        // Get theme and symbols
        let premium_allowed = user_state.subscription_tier == SubscriptionTier::Pro;
        let theme = self.theme_engine.get_random_theme(premium_allowed)?;
        let symbols = self.theme_engine.random_three_symbols(&theme.id)?;

        let session = ReadingSession {
            temp_id: generate_uuid(),
            source,
            theme,
            symbols,
            situation_text,
            started_at: chrono_timestamp(),
        };

        info!("Started reading session: {}", session.temp_id);
        Ok(session)
    }

    pub fn choose_symbol(
        &self,
        session: &ReadingSession,
        symbol_id: &str,
        method: SymbolMethod,
    ) -> Result<ChosenPassage, AletheiaError> {
        // Validate symbol
        let symbol_exists = session.symbols.iter().any(|s| s.id == symbol_id);
        if !symbol_exists {
            return Err(AletheiaError::symbol_invalid(symbol_id, &session.theme.id));
        }

        // Get random passage
        let passage = self
            .store
            .get_random_passage(&session.source.id)?
            .ok_or_else(|| AletheiaError::passage_empty(&session.source.id))?;

        info!("Symbol {} chosen via {:?}, passage: {}", symbol_id, method, passage.id);
        Ok(ChosenPassage {
            passage,
            reading_id: session.temp_id.clone(),
        })
    }

    pub fn complete_reading(
        &self,
        user_id: &str,
        reading: Reading,
    ) -> Result<CompletedReading, AletheiaError> {
        // Validate
        if reading.passage_id.is_empty() {
            return Err(AletheiaError::invalid_input("passage_id", "required"));
        }
        if reading.symbol_chosen.is_empty() {
            return Err(AletheiaError::invalid_input("symbol_chosen", "required"));
        }

        // Insert to DB
        self.store.insert_reading(&reading)?;

        // Update user state
        self.store.increment_readings_today(user_id)?;
        self.store.increment_session_count(user_id)?;
        if reading.ai_interpreted {
            self.store.increment_ai_calls_today(user_id)?;
        }

        let saved_at = chrono_timestamp();
        info!("Reading completed: {}", reading.id);
        Ok(CompletedReading {
            reading_id: reading.id,
            saved_at,
        })
    }

    pub fn get_fallback_prompts(&self, source_id: &str) -> Result<Vec<String>, AletheiaError> {
        let source = self
            .store
            .get_source(source_id)?
            .ok_or_else(|| AletheiaError::source_not_found(source_id))?;

        if source.fallback_prompts.len() != 3 {
            return Ok(vec![
                "Vũ trụ đang im lặng. Hãy tự hỏi: Điều gì đang chờ đợi bạn?".to_string(),
                "Trong sự tĩnh lặng, câu trả lời đến từ bên trong.".to_string(),
                "Mỗi khoảnh khắc là một cơ hội để nhìn sâu hơn.".to_string(),
            ]);
        }

        Ok(source.fallback_prompts)
    }
}

fn chrono_date() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    // Apply timezone offset (UTC+7 for Vietnam, can be made configurable)
    // This ensures daily limit resets at local midnight, not UTC midnight
    let utc_offset_seconds: u64 = 7 * 3600; // UTC+7
    let mut days = (now + utc_offset_seconds) / 86400;
    let mut year = 1970u64;
    
    // Calculate year (accounting for leap years)
    loop {
        let days_in_year = if is_leap_year(year) { 366 } else { 365 };
        if days < days_in_year {
            break;
        }
        days -= days_in_year;
        year += 1;
    }
    
    // Days per month (non-leap year)
    let days_in_months = if is_leap_year(year) {
        [31u64, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31u64, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    
    // Calculate month
    let mut month = 1;
    for &days_in_m in days_in_months.iter() {
        if days < days_in_m {
            break;
        }
        days -= days_in_m;
        month += 1;
    }
    
    let day = days + 1;
    format!("{:04}-{:02}-{:02}", year, month, day)
}

fn is_leap_year(year: u64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}
