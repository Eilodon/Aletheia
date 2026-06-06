//! Aletheia Core — Main Library Entry Point
//! v7: parking_lot Mutex, job HashMap eviction, Drop cleanup on streams

#![allow(clippy::empty_line_after_doc_comments)] // UniFFI 0.25 generated scaffolding triggers this lint.
#![allow(unpredictable_function_pointer_comparisons)] // UniFFI setup_scaffolding! generated code.

mod ai_client;
mod card_gen;
mod contracts;
mod errors;
mod gift_client;
mod local_inference;
mod notif;
mod reading;
mod store;
mod theme;

pub use ai_client::AIClient;
pub use card_gen::CardGenerator;
pub use contracts::*;
pub use errors::AletheiaError;
pub use gift_client::GiftClient;
pub use local_inference::LocalInferenceEngine;
pub use notif::NotificationScheduler;
pub use reading::ReadingEngine;
pub use store::Store;
pub use theme::ThemeEngine;

use parking_lot::Mutex;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::info;

#[derive(Debug, Clone, serde::Deserialize)]
struct BundledContentArtifact {
    sources: Vec<Source>,
    passages: Vec<Passage>,
    themes: Vec<Theme>,
}

// Global Tokio runtime — reused across all AI calls to avoid spawn overhead
static RUNTIME: once_cell::sync::Lazy<tokio::runtime::Runtime> = once_cell::sync::Lazy::new(|| {
    tokio::runtime::Builder::new_multi_thread()
        // ADR-AL-48: increased from 2 → 4 to handle concurrent AI streams without exhaustion.
        // ADR-V7-06: Graceful degradation on low-memory Android — falls back to current_thread
        // if the OS rejects the thread allocation (ENOMEM / Os{code:11}).
        .worker_threads(4)
        .enable_all()
        .build()
        .unwrap_or_else(|e| {
            tracing::warn!(
                "multi_thread Tokio runtime failed ({}), falling back to current_thread",
                e
            );
            tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("Cannot create even single-thread Tokio runtime — unrecoverable")
        })
});

// ─── Stream job ───────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
struct InterpretationStreamJob {
    chunks: Vec<String>,
    delivered_chunks: usize,
    full_text: String,
    done: bool,
    used_fallback: bool,
    cancelled: bool,
    error: Option<BridgeError>,
    /// For TTL eviction — set when done=true
    completed_at: Option<Instant>,
}

impl InterpretationStreamJob {
    fn new() -> Self {
        Self {
            chunks: Vec::new(),
            delivered_chunks: 0,
            full_text: String::new(),
            done: false,
            used_fallback: false,
            cancelled: false,
            error: None,
            completed_at: None,
        }
    }

    fn pending_state(request_id: &str) -> InterpretationStreamState {
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

// TTL for completed jobs — evicted on next poll or new-job creation
const JOB_TTL: Duration = Duration::from_secs(60);

// ─── Core ─────────────────────────────────────────────────────────────────────

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
}

impl AletheiaCore {
    pub fn try_new(db_path: &str, gift_backend_url: &str) -> Result<Self, AletheiaError> {
        let store = Arc::new(Store::new(db_path)?);
        info!("Initializing Aletheia Core v7…");
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
        })
    }

    pub fn new(db_path: String, gift_backend_url: String) -> Self {
        match Self::try_new(&db_path, &gift_backend_url) {
            Ok(core) => core,
            Err(error) => {
                eprintln!("[AletheiaCore] Init failed: {error} — degraded mode");
                let dummy =
                    Arc::new(Store::new(":memory:").expect("Cannot create in-memory fallback DB"));
                let bridge_error = BridgeError::from_aletheia_error(&error);
                Self {
                    store: Arc::clone(&dummy),
                    reading_engine: ReadingEngine::new(Arc::clone(&dummy)),
                    theme_engine: ThemeEngine::new(Arc::clone(&dummy)),
                    ai_client: Arc::new(Mutex::new(AIClient::new(Arc::clone(&dummy)))),
                    interpretation_cancel_tokens: Arc::new(Mutex::new(HashMap::new())),
                    interpretation_jobs: Arc::new(Mutex::new(HashMap::new())),
                    card_generator: CardGenerator::new(),
                    gift_client: GiftClient::new(Arc::clone(&dummy), &gift_backend_url),
                    notification_scheduler: NotificationScheduler::new(Arc::clone(&dummy)),
                    init_error: Some(bridge_error),
                }
            }
        }
    }

    // ── Job HashMap TTL eviction ────────────────────────────────────────────
    fn evict_stale_jobs(&self) {
        let mut jobs = self.interpretation_jobs.lock();
        jobs.retain(|_, job| {
            match job.completed_at {
                Some(t) => t.elapsed() < JOB_TTL,
                None => true, // still running
            }
        });
    }

    // ── Seed ───────────────────────────────────────────────────────────────

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
                .map_err(|_| AletheiaError::invalid_input("sources_json", "invalid JSON"))?;
            let passages: Vec<Passage> = serde_json::from_str(&passages_json)
                .map_err(|_| AletheiaError::invalid_input("passages_json", "invalid JSON"))?;
            let themes: Vec<Theme> = serde_json::from_str(&themes_json)
                .map_err(|_| AletheiaError::invalid_input("themes_json", "invalid JSON"))?;
            self.store.seed_bundled_data(&sources, &passages, &themes)
        })();
        match result {
            Ok(seeded) => SeedBundledDataResponse {
                seeded,
                error: None,
            },
            Err(e) => SeedBundledDataResponse {
                seeded: false,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    pub fn bootstrap_bundled_content(&self) -> SeedBundledDataResponse {
        if let Some(err) = &self.init_error {
            return SeedBundledDataResponse {
                seeded: false,
                error: Some(err.clone()),
            };
        }
        let result = (|| -> Result<bool, AletheiaError> {
            let artifact: BundledContentArtifact =
                serde_json::from_str(include_str!("../content/bundled-content.json"))
                    .map_err(|_| AletheiaError::invalid_input("bundled_content", "invalid JSON"))?;
            self.store
                .seed_bundled_data(&artifact.sources, &artifact.passages, &artifact.themes)
        })();
        match result {
            Ok(seeded) => SeedBundledDataResponse {
                seeded,
                error: None,
            },
            Err(e) => SeedBundledDataResponse {
                seeded: false,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    // ── Reading ────────────────────────────────────────────────────────────

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
        match self
            .reading_engine
            .perform_reading(&user_id, source_id, situation_text)
        {
            Ok(session) => PerformReadingResponse {
                session: Some(session),
                error: None,
            },
            Err(e) => PerformReadingResponse {
                session: None,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    pub fn choose_symbol(
        &self,
        session: ReadingSession,
        symbol_id: String,
        method: SymbolMethod,
    ) -> ChooseSymbolResponse {
        match self
            .reading_engine
            .choose_symbol(&session, &symbol_id, method)
        {
            Ok(chosen) => ChooseSymbolResponse {
                chosen: Some(chosen),
                error: None,
            },
            Err(e) => ChooseSymbolResponse {
                chosen: None,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    pub fn complete_reading(&self, user_id: String, reading: Reading) -> CompleteReadingResponse {
        match self.reading_engine.complete_reading(&user_id, reading) {
            Ok(completed) => CompleteReadingResponse {
                completed: Some(completed),
                error: None,
            },
            Err(e) => CompleteReadingResponse {
                completed: None,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    pub fn get_fallback_prompts(&self, source_id: String) -> FallbackPromptsResponse {
        match self.reading_engine.get_fallback_prompts(&source_id) {
            Ok(prompts) => FallbackPromptsResponse {
                prompts,
                error: None,
            },
            Err(e) => FallbackPromptsResponse {
                prompts: Vec::new(),
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    // ── Theme ──────────────────────────────────────────────────────────────

    pub fn get_random_theme(&self, premium_allowed: bool) -> Result<Theme, AletheiaError> {
        self.theme_engine.get_random_theme(premium_allowed)
    }

    pub fn random_three_symbols(&self, theme_id: &str) -> Result<Vec<Symbol>, AletheiaError> {
        self.theme_engine.random_three_symbols(theme_id)
    }

    // ── AI key ─────────────────────────────────────────────────────────────

    pub fn set_ai_api_key(&self, provider: String, key: String) -> SetApiKeyResponse {
        if let Some(err) = &self.init_error {
            return SetApiKeyResponse {
                applied: false,
                error: Some(err.clone()),
            };
        }
        let provider_enum = match provider.to_lowercase().as_str() {
            "claude" => ai_client::AIProvider::Claude,
            "gpt4" | "gpt" | "openai" => ai_client::AIProvider::GPT4,
            "gemini" | "google" => ai_client::AIProvider::Gemini,
            _ => {
                return SetApiKeyResponse {
                    applied: false,
                    error: Some(BridgeError::from_aletheia_error(
                        &AletheiaError::invalid_input("provider", "unknown"),
                    )),
                }
            }
        };
        self.ai_client.lock().set_api_key(provider_enum, key);
        SetApiKeyResponse {
            applied: true,
            error: None,
        }
    }

    // ── AI streaming (v7: TTL eviction + proper cancel) ────────────────────

    pub fn start_interpretation_stream(
        &self,
        passage: Passage,
        symbol: Symbol,
        situation_text: Option<String>,
        user_intent: Option<String>,
        use_sonnet: bool,
    ) -> StartInterpretationStreamResponse {
        // Evict stale jobs before inserting a new one (bounded map)
        self.evict_stale_jobs();

        let request_id = generate_uuid();
        let cancel_token = Arc::new(AtomicBool::new(false));

        self.interpretation_cancel_tokens
            .lock()
            .insert(request_id.clone(), Arc::clone(&cancel_token));

        self.interpretation_jobs
            .lock()
            .insert(request_id.clone(), InterpretationStreamJob::new());

        let jobs = Arc::clone(&self.interpretation_jobs);
        let tokens = Arc::clone(&self.interpretation_cancel_tokens);
        let ai_client = self.ai_client.lock().clone();
        let rid = request_id.clone();
        let cancel_clone = Arc::clone(&cancel_token);

        std::thread::spawn(move || {
            let cb_jobs = Arc::clone(&jobs);
            let cb_rid = rid.clone();
            let on_chunk = Arc::new(move |chunk: String| {
                let mut guard = cb_jobs.lock();
                if let Some(job) = guard.get_mut(&cb_rid) {
                    job.full_text.push_str(&chunk);
                    job.chunks.push(chunk);
                }
            });

            let result = {
                let mut client = ai_client;
                RUNTIME.block_on(client.request_interpretation_with_callback(
                    &passage,
                    &symbol,
                    situation_text.as_deref(),
                    user_intent.as_deref(),
                    Arc::clone(&cancel_clone),
                    Some(on_chunk),
                    use_sonnet,
                ))
            };

            let mut guard = jobs.lock();
            if let Some(job) = guard.get_mut(&rid) {
                match result {
                    Ok(interp) => {
                        if job.chunks.is_empty() {
                            for chunk in interp.chunks {
                                job.full_text.push_str(&chunk);
                                job.chunks.push(chunk);
                            }
                        }
                        job.used_fallback = interp.used_fallback;
                    }
                    Err(e) => {
                        job.error = Some(BridgeError::from_aletheia_error(&e));
                    }
                }
                job.done = true;
                job.cancelled = cancel_clone.load(Ordering::SeqCst);
                job.completed_at = Some(Instant::now());
            }
            tokens.lock().remove(&rid);
        });

        StartInterpretationStreamResponse {
            request_id: Some(request_id),
            error: None,
        }
    }

    pub fn poll_interpretation_stream(&self, request_id: String) -> InterpretationStreamState {
        let mut guard = self.interpretation_jobs.lock();
        let Some(job) = guard.get_mut(&request_id) else {
            return InterpretationStreamJob::pending_state(&request_id);
        };

        let new_chunks = job.chunks[job.delivered_chunks..].to_vec();
        job.delivered_chunks = job.chunks.len();

        let state = InterpretationStreamState {
            request_id: request_id.clone(),
            new_chunks,
            full_text: job.full_text.clone(),
            done: job.done,
            used_fallback: job.used_fallback,
            cancelled: job.cancelled,
            error: job.error.clone(),
        };

        // Keep entry alive for TTL-based eviction (evict_stale_jobs handles removal)
        // Final poll (done=true) gets cleaned on next job creation via evict_stale_jobs
        state
    }

    pub fn cancel_interpretation_stream(&self, request_id: String) -> CancelInterpretationResponse {
        let cancelled = if let Some(token) = self
            .interpretation_cancel_tokens
            .lock()
            .get(&request_id)
            .cloned()
        {
            token.store(true, Ordering::SeqCst);
            true
        } else {
            false
        };

        if let Some(job) = self.interpretation_jobs.lock().get_mut(&request_id) {
            job.cancelled = cancelled || job.cancelled;
            if cancelled {
                job.done = true;
                job.completed_at = Some(Instant::now());
            }
        }

        CancelInterpretationResponse {
            cancelled,
            error: None,
        }
    }

    // ── Sync request (non-streaming) ───────────────────────────────────────

    pub fn request_interpretation(
        &self,
        passage: Passage,
        symbol: Symbol,
        situation_text: Option<String>,
    ) -> RequestInterpretationResponse {
        let cancel = Arc::new(AtomicBool::new(false));
        let result = {
            let mut client = self.ai_client.lock().clone();
            RUNTIME.block_on(client.request_interpretation(
                &passage,
                &symbol,
                situation_text.as_deref(),
                None,
                cancel,
            ))
        };
        match result {
            Ok(i) => RequestInterpretationResponse {
                interpretation: Some(i),
                error: None,
            },
            Err(e) => RequestInterpretationResponse {
                interpretation: None,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    // ── Card generator ─────────────────────────────────────────────────────

    pub fn generate_share_card(&self, card: ShareCard) -> Result<String, AletheiaError> {
        self.card_generator.generate_share_card(&card)
    }

    // ── Notifications ──────────────────────────────────────────────────────

    pub fn get_daily_notification_message(
        &self,
        user_id: String,
        date: String,
    ) -> NotificationMessageResponse {
        if let Some(err) = &self.init_error {
            return NotificationMessageResponse {
                message: None,
                error: Some(err.clone()),
            };
        }
        let result = (|| -> Result<NotificationMessage, AletheiaError> {
            let entry = self
                .notification_scheduler
                .get_daily_notification(&user_id, &date)?;
            let (title, body) = self.notification_scheduler.format_notification(&entry);
            Ok(NotificationMessage {
                symbol_id: entry.symbol_id,
                question: entry.question,
                title,
                body,
            })
        })();
        match result {
            Ok(msg) => NotificationMessageResponse {
                message: Some(msg),
                error: None,
            },
            Err(e) => NotificationMessageResponse {
                message: None,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    // ── History ────────────────────────────────────────────────────────────

    pub fn get_readings(&self, limit: u32, offset: u32) -> PaginatedReadingsResponse {
        if let Some(err) = &self.init_error {
            return PaginatedReadingsResponse {
                readings: None,
                error: Some(err.clone()),
            };
        }
        let result = (|| -> Result<PaginatedReadings, AletheiaError> {
            let items = self.store.get_readings(limit, offset)?;
            let total_count = self.store.get_readings_count()?;
            let has_more = (offset + limit) < total_count;
            Ok(PaginatedReadings {
                items,
                total_count,
                has_more,
            })
        })();
        match result {
            Ok(r) => PaginatedReadingsResponse {
                readings: Some(r),
                error: None,
            },
            Err(e) => PaginatedReadingsResponse {
                readings: None,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    pub fn search_readings(
        &self,
        query: String,
        filter: String,
        sort: String,
        limit: u32,
        offset: u32,
    ) -> PaginatedReadingsResponse {
        if let Some(err) = &self.init_error {
            return PaginatedReadingsResponse {
                readings: None,
                error: Some(err.clone()),
            };
        }
        let result = (|| -> Result<PaginatedReadings, AletheiaError> {
            let items = self
                .store
                .search_readings(&query, &filter, &sort, limit, offset)?;
            let total_count = self.store.search_readings_count(&query, &filter)?;
            let has_more = (offset + limit) < total_count;
            Ok(PaginatedReadings {
                items,
                total_count,
                has_more,
            })
        })();
        match result {
            Ok(r) => PaginatedReadingsResponse {
                readings: Some(r),
                error: None,
            },
            Err(e) => PaginatedReadingsResponse {
                readings: None,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    pub fn get_reading_by_id(&self, id: String) -> ReadingResponse {
        if let Some(err) = &self.init_error {
            return ReadingResponse {
                reading: None,
                error: Some(err.clone()),
            };
        }
        match self.store.get_reading_by_id(&id) {
            Ok(r) => ReadingResponse {
                reading: r,
                error: None,
            },
            Err(e) => ReadingResponse {
                reading: None,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    pub fn update_reading_flags(
        &self,
        id: String,
        is_favorite: Option<bool>,
        shared: Option<bool>,
    ) -> ReadingResponse {
        if let Some(err) = &self.init_error {
            return ReadingResponse {
                reading: None,
                error: Some(err.clone()),
            };
        }
        let result = (|| -> Result<Option<Reading>, AletheiaError> {
            let Some(mut reading) = self.store.get_reading_by_id(&id)? else {
                return Ok(None);
            };
            if let Some(v) = is_favorite {
                reading.is_favorite = v;
            }
            if let Some(v) = shared {
                reading.shared = v;
            }
            self.store.update_reading(&reading)?;
            self.store.get_reading_by_id(&id)
        })();
        match result {
            Ok(r) => ReadingResponse {
                reading: r,
                error: None,
            },
            Err(e) => ReadingResponse {
                reading: None,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    pub fn save_interpretation(
        &self,
        interpretation: Interpretation,
    ) -> SaveInterpretationResponse {
        if let Some(err) = &self.init_error {
            return SaveInterpretationResponse {
                saved: false,
                error: Some(err.clone()),
            };
        }
        match self.store.insert_interpretation(&interpretation) {
            Ok(()) => SaveInterpretationResponse {
                saved: true,
                error: None,
            },
            Err(e) => SaveInterpretationResponse {
                saved: false,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    pub fn get_interpretation_by_reading_id(&self, reading_id: String) -> InterpretationResponse {
        if let Some(err) = &self.init_error {
            return InterpretationResponse {
                interpretation: None,
                error: Some(err.clone()),
            };
        }
        match self.store.get_interpretation_by_reading_id(&reading_id) {
            Ok(interpretation) => InterpretationResponse {
                interpretation,
                error: None,
            },
            Err(e) => InterpretationResponse {
                interpretation: None,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    pub fn delete_reading(&self, id: String) -> bool {
        if self.init_error.is_some() {
            return false;
        }
        self.store.delete_reading(&id).unwrap_or(false)
    }

    pub fn delete_all_readings(&self) -> u32 {
        if self.init_error.is_some() {
            return 0;
        }
        self.store.delete_all_readings().unwrap_or(0)
    }

    // ── Sources ────────────────────────────────────────────────────────────

    pub fn get_sources(&self, premium_allowed: bool) -> SourcesResponse {
        if let Some(err) = &self.init_error {
            return SourcesResponse {
                sources: Vec::new(),
                error: Some(err.clone()),
            };
        }
        match self.store.get_sources(premium_allowed) {
            Ok(sources) => SourcesResponse {
                sources,
                error: None,
            },
            Err(e) => SourcesResponse {
                sources: Vec::new(),
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    pub fn get_sources_for_user(&self, user_id: String) -> SourcesResponse {
        if let Some(err) = &self.init_error {
            return SourcesResponse {
                sources: Vec::new(),
                error: Some(err.clone()),
            };
        }
        match self.store.get_sources_for_user(&user_id) {
            Ok(sources) => SourcesResponse {
                sources,
                error: None,
            },
            Err(e) => SourcesResponse {
                sources: Vec::new(),
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    // ── User state ─────────────────────────────────────────────────────────

    pub fn get_user_state(&self, user_id: String) -> UserStateResponse {
        if let Some(err) = &self.init_error {
            return UserStateResponse {
                state: None,
                error: Some(err.clone()),
            };
        }
        match self.store.get_user_state(&user_id) {
            Ok(state) => UserStateResponse {
                state: Some(state),
                error: None,
            },
            Err(e) => UserStateResponse {
                state: None,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    pub fn update_user_state(&self, state: UserState) -> UpdateUserStateResponse {
        if let Some(err) = &self.init_error {
            return UpdateUserStateResponse {
                updated: false,
                error: Some(err.clone()),
            };
        }
        match self.store.update_user_state(&state) {
            Ok(()) => UpdateUserStateResponse {
                updated: true,
                error: None,
            },
            Err(e) => UpdateUserStateResponse {
                updated: false,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    pub fn set_local_date(&self, local_date: String) {
        self.store.set_local_date(local_date);
    }

    // ── Gift ───────────────────────────────────────────────────────────────

    pub fn redeem_gift(&self, token: String) -> RedeemGiftResponse {
        if let Some(err) = &self.init_error {
            return RedeemGiftResponse {
                gift: None,
                error: Some(err.clone()),
            };
        }
        match RUNTIME.block_on(self.gift_client.redeem_gift(&token)) {
            Ok(g) => RedeemGiftResponse {
                gift: Some(GiftReadingData {
                    token: g.token,
                    buyer_note: g.buyer_note,
                    source_id: g.source_id,
                    created_at: g.created_at,
                    expires_at: g.expires_at,
                    redeemed: g.redeemed,
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
            Ok(r) => CreateGiftResponse {
                token: Some(r.token),
                deep_link: Some(r.deep_link),
                error: None,
            },
            Err(e) => CreateGiftResponse {
                token: None,
                deep_link: None,
                error: Some(BridgeError::from_aletheia_error(&e)),
            },
        }
    }

    // ── Local model stubs (beta: UI hidden, ADR-V7-02) ─────────────────────

    pub fn check_device_capability(&self) -> DeviceCapabilityResponse {
        DeviceCapabilityResponse {
            capability: Some(DeviceCapability {
                supported: false,
                available_ram_mb: 0,
                cpu_cores: 0,
                has_simd: false,
                estimated_tps: 0.0,
                unsupported_reason: Some("Local inference not active in beta".into()),
            }),
            error: None,
        }
    }

    pub fn get_local_model_status(&self) -> LocalModelStatusResponse {
        LocalModelStatusResponse {
            model_info: Some(LocalModelInfo::default()),
            error: None,
        }
    }

    pub fn prepare_local_model(&self, _force_download: bool) -> PrepareLocalModelResponse {
        PrepareLocalModelResponse {
            started: false,
            model_info: Some(LocalModelInfo::default()),
            error: Some(BridgeError {
                code: "ERR_LOCAL_MODEL_BETA_DISABLED".into(),
                message: "Local inference is disabled for beta — use cloud path".into(),
            }),
        }
    }

    pub fn cancel_local_model_download(&self) -> LocalModelStatusResponse {
        LocalModelStatusResponse {
            model_info: Some(LocalModelInfo::default()),
            error: None,
        }
    }

    pub fn delete_local_model(&self) -> bool {
        false
    }
}

uniffi::include_scaffolding!("aletheia");
