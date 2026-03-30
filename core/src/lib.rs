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

pub use ai_client::AIClient;
pub use card_gen::CardGenerator;
pub use contracts::*;
pub use errors::AletheiaError;
pub use gift_client::GiftClient;
pub use notif::NotificationScheduler;
pub use reading::ReadingEngine;
pub use store::Store;
pub use theme::ThemeEngine;

use std::collections::HashMap;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tracing::info;

// Global Tokio runtime for AI operations - reuse instead of creating new each time
static RUNTIME: once_cell::sync::Lazy<tokio::runtime::Runtime> =
    once_cell::sync::Lazy::new(|| {
        tokio::runtime::Builder::new_multi_thread()
            .worker_threads(2)  // Limit to 2 threads to conserve battery on mobile
            .enable_all()
            .build()
            .expect("Failed to create global Tokio runtime")
    });

#[derive(Debug, Clone)]
struct InterpretationStreamJob {
    chunks: Vec<String>,
    delivered_chunks: usize,
    full_text: String,
    done: bool,
    used_fallback: bool,
    cancelled: bool,
    error: Option<BridgeError>,
}

impl InterpretationStreamJob {
    fn pending(request_id: &str) -> InterpretationStreamState {
        InterpretationStreamState {
            request_id: request_id.to_string(),
            new_chunks: Vec::new(),
            full_text: String::new(),
            done: false,
            used_fallback: false,
            cancelled: false,
            error: None,
        }
    }
}

// ============================================================================
// STATE
// ============================================================================

pub struct AletheiaCore {
    store: Arc<Store>,
    reading_engine: ReadingEngine,
    theme_engine: ThemeEngine,
    ai_client: Arc<Mutex<AIClient>>,
    interpretation_cancel_tokens: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
    interpretation_jobs: Arc<Mutex<HashMap<String, InterpretationStreamJob>>>,
    card_generator: CardGenerator,
    gift_client: GiftClient,
    notification_scheduler: NotificationScheduler,
    init_error: Option<BridgeError>,
    local_date_override: Arc<Mutex<Option<String>>>,
}

impl AletheiaCore {
    pub fn try_new(db_path: &str, gift_backend_url: &str) -> Result<Self, AletheiaError> {
        let store = Arc::new(Store::new(db_path)?);
        
        info!("Initializing Aletheia Core...");
        
        Ok(Self {
            store: Arc::clone(&store),
            reading_engine: ReadingEngine::new(Arc::clone(&store)),
            theme_engine: ThemeEngine::new(Arc::clone(&store)),
            ai_client: Arc::new(Mutex::new(AIClient::new(Arc::clone(&store)))),
            interpretation_cancel_tokens: Arc::new(Mutex::new(HashMap::new())),
            interpretation_jobs: Arc::new(Mutex::new(HashMap::new())),
            card_generator: CardGenerator::new(),
            gift_client: GiftClient::new(Arc::clone(&store), gift_backend_url),
            notification_scheduler: NotificationScheduler::new(Arc::clone(&store)),
            init_error: None,
            local_date_override: Arc::new(Mutex::new(None)),
        })
    }

    pub fn new(db_path: String, gift_backend_url: String) -> Self {
        match Self::try_new(&db_path, &gift_backend_url) {
            Ok(mut core) => {
                core.init_error = None;
                core
            }
            Err(error) => {
                eprintln!("[AletheiaCore] Init failed: {} — operating in error state", error);
                // Create dummy Store to satisfy struct requirements
                // All method calls will return BridgeError instead of crashing
                let dummy_store = Arc::new(
                    Store::new(":memory:")
                        .unwrap_or_else(|_| panic!("Cannot create in-memory DB for error state"))
                );
                let bridge_error = BridgeError::from_aletheia_error(&error);
                Self {
                    store: Arc::clone(&dummy_store),
                    reading_engine: ReadingEngine::new(Arc::clone(&dummy_store)),
                    theme_engine: ThemeEngine::new(Arc::clone(&dummy_store)),
                    ai_client: Arc::new(Mutex::new(AIClient::new(Arc::clone(&dummy_store)))),
                    interpretation_cancel_tokens: Arc::new(Mutex::new(HashMap::new())),
                    interpretation_jobs: Arc::new(Mutex::new(HashMap::new())),
                    card_generator: CardGenerator::new(),
                    gift_client: GiftClient::new(Arc::clone(&dummy_store), &gift_backend_url),
                    notification_scheduler: NotificationScheduler::new(Arc::clone(&dummy_store)),
                    init_error: Some(bridge_error),
                    local_date_override: Arc::new(Mutex::new(None)),
                }
            }
        }
    }

    pub fn seed_bundled_data(
        &self,
        sources_json: String,
        passages_json: String,
        themes_json: String,
    ) -> SeedBundledDataResponse {
        if let Some(err) = &self.init_error {
            return SeedBundledDataResponse {
                seeded: false,
                error: Some(err.clone()),
            };
        }
        let result = (|| -> Result<bool, AletheiaError> {
            let sources: Vec<Source> = serde_json::from_str(&sources_json)
                .map_err(|_| AletheiaError::invalid_input("sources_json", "invalid JSON payload"))?;
            let passages: Vec<Passage> = serde_json::from_str(&passages_json)
                .map_err(|_| AletheiaError::invalid_input("passages_json", "invalid JSON payload"))?;
            let themes: Vec<Theme> = serde_json::from_str(&themes_json)
                .map_err(|_| AletheiaError::invalid_input("themes_json", "invalid JSON payload"))?;

            self.store.seed_bundled_data(&sources, &passages, &themes)
        })();

        match result {
            Ok(seeded) => SeedBundledDataResponse {
                seeded,
                error: None,
            },
            Err(error) => SeedBundledDataResponse {
                seeded: false,
                error: Some(BridgeError::from_aletheia_error(&error)),
            },
        }
    }

    // ========================================================================
    // READING OPERATIONS
    // ========================================================================

    pub fn try_perform_reading(
        &self,
        user_id: &str,
        source_id: Option<String>,
        situation_text: Option<String>,
    ) -> Result<ReadingSession, AletheiaError> {
        self.reading_engine.perform_reading(user_id, source_id, situation_text)
    }

    pub fn perform_reading(
        &self,
        user_id: String,
        source_id: Option<String>,
        situation_text: Option<String>,
    ) -> PerformReadingResponse {
        if let Some(err) = &self.init_error {
            return PerformReadingResponse {
                session: None,
                error: Some(err.clone()),
            };
        }
        match self.try_perform_reading(&user_id, source_id, situation_text) {
            Ok(session) => PerformReadingResponse {
                session: Some(session),
                error: None,
            },
            Err(error) => PerformReadingResponse {
                session: None,
                error: Some(BridgeError::from_aletheia_error(&error)),
            },
        }
    }

    pub fn try_choose_symbol(
        &self,
        session: &ReadingSession,
        symbol_id: &str,
        method: SymbolMethod,
    ) -> Result<ChosenPassage, AletheiaError> {
        self.reading_engine.choose_symbol(session, symbol_id, method)
    }

    pub fn choose_symbol(
        &self,
        session: ReadingSession,
        symbol_id: String,
        method: SymbolMethod,
    ) -> ChooseSymbolResponse {
        match self.try_choose_symbol(&session, &symbol_id, method) {
            Ok(chosen) => ChooseSymbolResponse {
                chosen: Some(chosen),
                error: None,
            },
            Err(error) => ChooseSymbolResponse {
                chosen: None,
                error: Some(BridgeError::from_aletheia_error(&error)),
            },
        }
    }

    pub fn try_complete_reading(
        &self,
        user_id: &str,
        reading: Reading,
    ) -> Result<CompletedReading, AletheiaError> {
        self.reading_engine.complete_reading(user_id, reading)
    }

    pub fn complete_reading(
        &self,
        user_id: String,
        reading: Reading,
    ) -> CompleteReadingResponse {
        match self.try_complete_reading(&user_id, reading) {
            Ok(completed) => CompleteReadingResponse {
                completed: Some(completed),
                error: None,
            },
            Err(error) => CompleteReadingResponse {
                completed: None,
                error: Some(BridgeError::from_aletheia_error(&error)),
            },
        }
    }

    pub fn try_get_fallback_prompts(&self, source_id: &str) -> Result<Vec<String>, AletheiaError> {
        self.reading_engine.get_fallback_prompts(source_id)
    }

    pub fn get_fallback_prompts(&self, source_id: String) -> FallbackPromptsResponse {
        match self.try_get_fallback_prompts(&source_id) {
            Ok(prompts) => FallbackPromptsResponse {
                prompts,
                error: None,
            },
            Err(error) => FallbackPromptsResponse {
                prompts: Vec::new(),
                error: Some(BridgeError::from_aletheia_error(&error)),
            },
        }
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

    pub fn try_set_ai_api_key(&self, provider: &str, key: &str) -> Result<(), AletheiaError> {
        let provider = match provider.to_lowercase().as_str() {
            "claude" => ai_client::AIProvider::Claude,
            "gpt4" | "gpt" | "openai" => ai_client::AIProvider::GPT4,
            "gemini" | "google" => ai_client::AIProvider::Gemini,
            _ => return Err(AletheiaError::invalid_input("provider", "unknown")),
        };
        self.ai_client
            .lock()
            .unwrap()
            .set_api_key(provider, key.to_string());
        Ok(())
    }

    pub fn set_ai_api_key(&self, provider: String, key: String) -> SetApiKeyResponse {
        if let Some(err) = &self.init_error {
            return SetApiKeyResponse {
                applied: false,
                error: Some(err.clone()),
            };
        }
        match self.try_set_ai_api_key(&provider, &key) {
            Ok(()) => SetApiKeyResponse {
                applied: true,
                error: None,
            },
            Err(error) => SetApiKeyResponse {
                applied: false,
                error: Some(BridgeError::from_aletheia_error(&error)),
            },
        }
    }

    pub fn try_request_interpretation(
        &self,
        passage: Passage,
        symbol: Symbol,
        situation_text: Option<String>,
    ) -> Result<AIInterpretation, AletheiaError> {
        // Use existing AIClient from the pool - preserves HTTP connection reuse
        let mut ai_client = self.ai_client.lock().unwrap();

        RUNTIME.block_on(ai_client.request_interpretation(
            &passage,
            &symbol,
            situation_text.as_deref(),
            Arc::new(AtomicBool::new(false)),
        ))
    }

    pub fn request_interpretation(
        &self,
        passage: Passage,
        symbol: Symbol,
        situation_text: Option<String>,
    ) -> RequestInterpretationResponse {
        match self.try_request_interpretation(passage, symbol, situation_text) {
            Ok(interpretation) => RequestInterpretationResponse {
                interpretation: Some(interpretation),
                error: None,
            },
            Err(error) => RequestInterpretationResponse {
                interpretation: None,
                error: Some(BridgeError::from_aletheia_error(&error)),
            },
        }
    }

    pub fn start_interpretation_stream(
        &self,
        passage: Passage,
        symbol: Symbol,
        situation_text: Option<String>,
    ) -> StartInterpretationStreamResponse {
        let request_id = generate_uuid();
        let cancel_token = Arc::new(AtomicBool::new(false));

        self.interpretation_cancel_tokens
            .lock()
            .unwrap()
            .insert(request_id.clone(), Arc::clone(&cancel_token));

        self.interpretation_jobs.lock().unwrap().insert(
            request_id.clone(),
            InterpretationStreamJob {
                chunks: Vec::new(),
                delivered_chunks: 0,
                full_text: String::new(),
                done: false,
                used_fallback: false,
                cancelled: false,
                error: None,
            },
        );

        let jobs = Arc::clone(&self.interpretation_jobs);
        let tokens = Arc::clone(&self.interpretation_cancel_tokens);
        let store = Arc::clone(&self.store);
        let request_id_for_thread = request_id.clone();

        // Use std::thread::spawn - simpler and avoids Send issues with MutexGuard in async
        std::thread::spawn(move || {
            let callback_jobs = Arc::clone(&jobs);
            let callback_request_id = request_id_for_thread.clone();
            let on_chunk = Arc::new(move |chunk: String| {
                let mut guard = callback_jobs.lock().unwrap();
                if let Some(job) = guard.get_mut(&callback_request_id) {
                    job.full_text.push_str(&chunk);
                    job.chunks.push(chunk);
                }
            });

            // Run AI call with RUNTIME
            let result = {
                let mut client = AIClient::new(store);
                RUNTIME.block_on(client.request_interpretation_with_callback(
                    &passage,
                    &symbol,
                    situation_text.as_deref(),
                    Arc::clone(&cancel_token),
                    Some(on_chunk),
                ))
            };

            let mut guard = jobs.lock().unwrap();
            if let Some(job) = guard.get_mut(&request_id_for_thread) {
                match result {
                    Ok(interpretation) => {
                        if job.chunks.is_empty() {
                            for chunk in interpretation.chunks.iter().cloned() {
                                job.full_text.push_str(&chunk);
                                job.chunks.push(chunk);
                            }
                        }
                        job.used_fallback = interpretation.used_fallback;
                        job.done = true;
                        job.cancelled = cancel_token.load(Ordering::SeqCst);
                    }
                    Err(error) => {
                        job.done = true;
                        job.cancelled = cancel_token.load(Ordering::SeqCst);
                        job.error = Some(BridgeError::from_aletheia_error(&error));
                    }
                }
            }

            tokens.lock().unwrap().remove(&request_id_for_thread);
        });

        StartInterpretationStreamResponse {
            request_id: Some(request_id),
            error: None,
        }
    }

    pub fn poll_interpretation_stream(&self, request_id: String) -> InterpretationStreamState {
        let mut guard = self.interpretation_jobs.lock().unwrap();
        let Some(job) = guard.get_mut(&request_id) else {
            return InterpretationStreamJob::pending(&request_id);
        };

        let new_chunks = job.chunks[job.delivered_chunks..].to_vec();
        job.delivered_chunks = job.chunks.len();

        InterpretationStreamState {
            request_id,
            new_chunks,
            full_text: job.full_text.clone(),
            done: job.done,
            used_fallback: job.used_fallback,
            cancelled: job.cancelled,
            error: job.error.clone(),
        }
    }

    pub fn cancel_interpretation_stream(&self, request_id: String) -> CancelInterpretationResponse {
        let mut cancelled = false;

        if let Some(token) = self
            .interpretation_cancel_tokens
            .lock()
            .unwrap()
            .get(&request_id)
            .cloned()
        {
            token.store(true, Ordering::SeqCst);
            cancelled = true;
        }

        if let Some(job) = self.interpretation_jobs.lock().unwrap().get_mut(&request_id) {
            job.cancelled = cancelled || job.cancelled;
            if cancelled {
                job.done = true;
            }
        }

        CancelInterpretationResponse {
            cancelled,
            error: None,
        }
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

    pub fn try_get_user_state(&self, user_id: &str) -> Result<UserState, AletheiaError> {
        self.store.get_user_state(user_id)
    }

    pub fn get_user_state(&self, user_id: String) -> UserStateResponse {
        if let Some(err) = &self.init_error {
            return UserStateResponse {
                state: None,
                error: Some(err.clone()),
            };
        }
        match self.try_get_user_state(&user_id) {
            Ok(state) => UserStateResponse {
                state: Some(state),
                error: None,
            },
            Err(error) => UserStateResponse {
                state: None,
                error: Some(BridgeError::from_aletheia_error(&error)),
            },
        }
    }

    pub fn update_user_state(&self, state: &UserState) -> Result<(), AletheiaError> {
        self.store.update_user_state(state)
    }

    // ========================================================================
    // LOCAL DATE (for daily reset timezone)
    // ========================================================================

    pub fn set_local_date(&self, local_date: String) {
        if local_date.len() == 10 && local_date.chars().nth(4) == Some('-') {
            if let Ok(mut lock) = self.local_date_override.lock() {
                *lock = Some(local_date);
            }
        }
    }

    // ========================================================================
    // GIFT OPERATIONS (UniFFI exposed)
    // ========================================================================

    pub fn redeem_gift(&self, token: String) -> RedeemGiftResponse {
        if let Some(err) = &self.init_error {
            return RedeemGiftResponse {
                gift: None,
                error: Some(err.clone()),
            };
        }
        match RUNTIME.block_on(self.gift_client.redeem_gift(&token)) {
            Ok(gift_reading) => RedeemGiftResponse {
                gift: Some(GiftReadingData {
                    token: gift_reading.token,
                    buyer_note: gift_reading.buyer_note,
                    source_id: gift_reading.source_id,
                    created_at: gift_reading.created_at,
                    expires_at: gift_reading.expires_at,
                    redeemed: gift_reading.redeemed,
                }),
                error: None,
            },
            Err(e) => RedeemGiftResponse {
                gift: None,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    pub fn create_gift(
        &self,
        source_id: Option<String>,
        buyer_note: Option<String>,
    ) -> CreateGiftResponse {
        if let Some(err) = &self.init_error {
            return CreateGiftResponse {
                token: None,
                deep_link: None,
                error: Some(err.clone()),
            };
        }
        match RUNTIME.block_on(self.gift_client.create_gift(source_id, buyer_note)) {
            Ok(resp) => CreateGiftResponse {
                token: Some(resp.token),
                deep_link: Some(resp.deep_link),
                error: None,
            },
            Err(e) => CreateGiftResponse {
                token: None,
                deep_link: None,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }
}

uniffi::include_scaffolding!("aletheia");
