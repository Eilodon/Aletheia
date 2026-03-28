//! Aletheia Core - Main Library Entry Point
//! UniFFI bindings for mobile platforms

mod ai_client;
mod card_gen;
mod contracts;
mod errors;
mod gift_client;
mod notif;
mod reading;
mod store;
mod theme;

use ai_client::AIClient;
use card_gen::CardGenerator;
use contracts::*;
use errors::AletheiaError;
use gift_client::GiftClient;
use notif::NotificationScheduler;
use reading::ReadingEngine;
use store::Store;
use theme::ThemeEngine;

use std::sync::Arc;
use std::sync::atomic::AtomicBool;
use tracing::info;

// ============================================================================
// STATE
// ============================================================================

pub struct AletheiaCore {
    store: Arc<Store>,
    reading_engine: ReadingEngine,
    theme_engine: ThemeEngine,
    ai_client: AIClient,
    card_generator: CardGenerator,
    gift_client: GiftClient,
    notification_scheduler: NotificationScheduler,
}

impl AletheiaCore {
    pub fn new(db_path: &str, gift_backend_url: &str) -> Result<Self, AletheiaError> {
        let store = Arc::new(Store::new(db_path)?);
        
        info!("Initializing Aletheia Core...");
        
        Ok(Self {
            store: Arc::clone(&store),
            reading_engine: ReadingEngine::new(Arc::clone(&store)),
            theme_engine: ThemeEngine::new(Arc::clone(&store)),
            ai_client: AIClient::new(Arc::clone(&store)),
            card_generator: CardGenerator::new(),
            gift_client: GiftClient::new(Arc::clone(&store), gift_backend_url),
            notification_scheduler: NotificationScheduler::new(Arc::clone(&store)),
        })
    }

    // ========================================================================
    // READING OPERATIONS
    // ========================================================================

    pub fn perform_reading(
        &self,
        user_id: &str,
        source_id: Option<String>,
        situation_text: Option<String>,
    ) -> Result<ReadingSession, AletheiaError> {
        self.reading_engine.perform_reading(user_id, source_id, situation_text)
    }

    pub fn choose_symbol(
        &self,
        session: &ReadingSession,
        symbol_id: &str,
        method: SymbolMethod,
    ) -> Result<(Passage, String), AletheiaError> {
        self.reading_engine.choose_symbol(session, symbol_id, method)
    }

    pub fn complete_reading(
        &self,
        user_id: &str,
        reading: Reading,
    ) -> Result<CompletedReading, AletheiaError> {
        self.reading_engine.complete_reading(user_id, reading)
    }

    pub fn get_fallback_prompts(&self, source_id: &str) -> Result<Vec<String>, AletheiaError> {
        self.reading_engine.get_fallback_prompts(source_id)
    }

    // ========================================================================
    // THEME OPERATIONS
    // ========================================================================

    pub fn get_random_theme(&self, premium_allowed: bool) -> Result<Theme, AletheiaError> {
        self.theme_engine.get_random_theme(premium_allowed)
    }

    pub fn random_three_symbols(&self, theme_id: &str) -> Result<Vec<Symbol>, AletheiaError> {
        self.theme_engine.random_three_symbols(theme_id)
    }

    // ========================================================================
    // AI OPERATIONS
    // ========================================================================

    pub fn set_ai_api_key(&mut self, provider: &str, key: &str) -> Result<(), AletheiaError> {
        let provider = match provider.to_lowercase().as_str() {
            "claude" => ai_client::AIProvider::Claude,
            "gpt4" | "gpt" | "openai" => ai_client::AIProvider::GPT4,
            "gemini" | "google" => ai_client::AIProvider::Gemini,
            _ => return Err(AletheiaError::invalid_input("provider", "unknown")),
        };
        self.ai_client.set_api_key(provider, key.to_string());
        Ok(())
    }

    pub async fn request_interpretation(
        &mut self,
        passage: Passage,
        symbol: Symbol,
        situation_text: Option<String>,
        cancel_token: Arc<AtomicBool>,
    ) -> Result<Vec<String>, AletheiaError> {
        self.ai_client
            .request_interpretation(
                &passage,
                &symbol,
                situation_text.as_deref(),
                cancel_token,
            )
            .await
    }

    // ========================================================================
    // CARD GENERATOR
    // ========================================================================

    pub fn generate_share_card(&self, card: ShareCard) -> Result<String, AletheiaError> {
        self.card_generator.generate_share_card(&card)
    }

    // ========================================================================
    // GIFT OPERATIONS
    // ========================================================================

    pub async fn create_gift(
        &self,
        source_id: Option<String>,
        buyer_note: Option<String>,
    ) -> Result<GiftResponse, AletheiaError> {
        self.gift_client.create_gift(source_id, buyer_note).await
    }

    pub async fn redeem_gift(&self, token: &str) -> Result<GiftReading, AletheiaError> {
        self.gift_client.redeem_gift(token).await
    }

    // ========================================================================
    // NOTIFICATION OPERATIONS
    // ========================================================================

    pub fn get_daily_notification(
        &self,
        user_id: &str,
        date: &str,
    ) -> Result<NotificationEntry, AletheiaError> {
        self.notification_scheduler.get_daily_notification(user_id, date)
    }

    pub fn format_notification(&self, entry: &NotificationEntry) -> (String, String) {
        self.notification_scheduler.format_notification(entry)
    }

    // ========================================================================
    // HISTORY OPERATIONS (Paginated)
    // ========================================================================

    pub fn get_readings(&self, limit: u32, offset: u32) -> Result<PaginatedReadings, AletheiaError> {
        let items = self.store.get_readings(limit, offset)?;
        let total_count = self.store.get_readings_count()?;
        let has_more = (offset + limit as u32) < total_count;

        Ok(PaginatedReadings {
            items,
            total_count,
            has_more,
        })
    }

    pub fn get_readings_count(&self) -> Result<u32, AletheiaError> {
        self.store.get_readings_count()
    }

    // ========================================================================
    // USER STATE
    // ========================================================================

    pub fn get_user_state(&self, user_id: &str) -> Result<UserState, AletheiaError> {
        self.store.get_user_state(user_id)
    }

    pub fn update_user_state(&self, state: &UserState) -> Result<(), AletheiaError> {
        self.store.update_user_state(state)
    }
}

// ============================================================================
// UNIFFI EXPORTS (Sync versions for UniFFI compatibility)
// ========================================================================

#[no_mangle]
pub extern "C" fn aletheia_init(db_path: *const std::ffi::c_char, gift_url: *const std::ffi::c_char) -> *mut std::ffi::c_void {
    use std::ffi::CStr;
    
    let db_path_str = unsafe { CStr::from_ptr(db_path).to_string_lossy().into_owned() };
    let gift_url_str = unsafe { CStr::from_ptr(gift_url).to_string_lossy().into_owned() };
    
    match AletheiaCore::new(&db_path_str, &gift_url_str) {
        Ok(core) => Box::into_raw(Box::new(core)) as *mut std::ffi::c_void,
        Err(e) => {
            eprintln!("Failed to init Aletheia: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub extern "C" fn aletheia_free(ptr: *mut std::ffi::c_void) {
    if !ptr.is_null() {
        unsafe { drop(Box::from_raw(ptr as *mut AletheiaCore)) };
    }
}
