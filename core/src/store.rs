//! Aletheia Core - SQLite Store with Transactional Migrations
//! ADR-AL-13: Transactional SQLite Migrations

use crate::contracts::*;
use crate::errors::AletheiaError;
use rusqlite::{params, Connection};
use serde_json::from_str;
use std::sync::Mutex;
use tracing::info;

pub struct Store {
    conn: Mutex<Connection>,
}

impl Store {
    pub fn new(db_path: &str) -> Result<Self, AletheiaError> {
        let conn = Connection::open(db_path)
            .map_err(|e| AletheiaError::storage_write_fail(&format!("Failed to open DB: {}", e)))?;

        let store = Self {
            conn: Mutex::new(conn),
        };

        store.run_migrations()?;
        info!("Database initialized successfully");
        Ok(store)
    }

    fn run_migrations(&self) -> Result<(), AletheiaError> {
        let conn = self.conn.lock().unwrap();
        
        // Use transaction for atomic migrations (ADR-AL-13)
        let tx = conn.unchecked_transaction()?;
        
        let user_version: i32 = tx
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap_or(0);

        if user_version < 1 {
            tx.execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS readings (
                    id TEXT PRIMARY KEY,
                    created_at INTEGER NOT NULL,
                    source_id TEXT NOT NULL,
                    passage_id TEXT NOT NULL,
                    theme_id TEXT NOT NULL,
                    symbol_chosen TEXT NOT NULL,
                    symbol_method TEXT NOT NULL,
                    situation_text TEXT,
                    ai_interpreted INTEGER NOT NULL DEFAULT 0,
                    ai_used_fallback INTEGER NOT NULL DEFAULT 0,
                    read_duration_s INTEGER,
                    time_to_ai_request_s INTEGER,
                    notification_opened INTEGER NOT NULL DEFAULT 0,
                    mood_tag TEXT,
                    is_favorite INTEGER NOT NULL DEFAULT 0,
                    shared INTEGER NOT NULL DEFAULT 0
                );
                CREATE INDEX IF NOT EXISTS idx_readings_created_at ON readings(created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_readings_source_id ON readings(source_id);
                "#,
            )?;
            tx.execute("PRAGMA user_version = 1", [])?;
        }

        if user_version < 2 {
            tx.execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS sources (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    tradition TEXT NOT NULL,
                    language TEXT NOT NULL,
                    passage_count INTEGER NOT NULL,
                    is_bundled INTEGER NOT NULL,
                    is_premium INTEGER NOT NULL,
                    fallback_prompts TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS passages (
                    id TEXT PRIMARY KEY,
                    source_id TEXT NOT NULL,
                    reference TEXT NOT NULL,
                    text TEXT NOT NULL,
                    context TEXT,
                    FOREIGN KEY (source_id) REFERENCES sources(id)
                );
                CREATE INDEX IF NOT EXISTS idx_passages_source_id ON passages(source_id);

                CREATE TABLE IF NOT EXISTS themes (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    is_premium INTEGER NOT NULL,
                    pack_id TEXT,
                    price_usd REAL
                );

                CREATE TABLE IF NOT EXISTS symbols (
                    id TEXT PRIMARY KEY,
                    theme_id TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    flavor_text TEXT,
                    FOREIGN KEY (theme_id) REFERENCES themes(id)
                );
                CREATE INDEX IF NOT EXISTS idx_symbols_theme_id ON symbols(theme_id);

                CREATE TABLE IF NOT EXISTS notification_matrix (
                    id INTEGER PRIMARY KEY,
                    symbol_id TEXT NOT NULL,
                    question TEXT NOT NULL
                );
                "#,
            )?;
            tx.execute("PRAGMA user_version = 2", [])?;
        }

        if user_version < 3 {
            tx.execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS user_state (
                    user_id TEXT PRIMARY KEY,
                    subscription_tier TEXT NOT NULL DEFAULT 'free',
                    readings_today INTEGER NOT NULL DEFAULT 0,
                    ai_calls_today INTEGER NOT NULL DEFAULT 0,
                    session_count INTEGER NOT NULL DEFAULT 0,
                    last_reading_date TEXT,
                    notification_enabled INTEGER NOT NULL DEFAULT 1,
                    notification_time TEXT DEFAULT '09:00',
                    preferred_language TEXT DEFAULT 'vi',
                    dark_mode INTEGER NOT NULL DEFAULT 0,
                    onboarding_complete INTEGER NOT NULL DEFAULT 0
                );
                "#,
            )?;
            tx.execute("PRAGMA user_version = 3", [])?;
        }

        if user_version < 4 {
            // Ignore migration errors (column may already exist)
            match tx.execute_batch(
                r#"
                ALTER TABLE readings ADD COLUMN time_to_ai_request_s INTEGER;
                ALTER TABLE readings ADD COLUMN notification_opened INTEGER NOT NULL DEFAULT 0;
                ALTER TABLE user_state ADD COLUMN session_count INTEGER NOT NULL DEFAULT 0;
                "#,
            ) {
                Ok(_) => {},
                Err(e) => info!("Migration v4 warning (may be expected): {}", e),
            }
            tx.execute("PRAGMA user_version = 4", [])?;
        }

        tx.commit()?;
        
        info!("Migrations completed to version 4");
        Ok(())
    }

    pub fn seed_bundled_data(
        &self,
        sources: &[Source],
        passages: &[Passage],
        themes: &[Theme],
    ) -> Result<bool, AletheiaError> {
        if self.get_sources_count()? > 0 {
            return Ok(false);
        }

        for source in sources {
            self.insert_source(source)?;
        }

        for passage in passages {
            self.insert_passage(passage)?;
        }

        for theme in themes {
            self.insert_theme(theme)?;
        }

        info!(
            "Seeded bundled data into native store (sources={}, passages={}, themes={})",
            sources.len(),
            passages.len(),
            themes.len()
        );

        Ok(true)
    }

    // ========================================================================
    // READING OPERATIONS
    // ========================================================================

    pub fn insert_reading(&self, reading: &Reading) -> Result<(), AletheiaError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"INSERT INTO readings (
                id, created_at, source_id, passage_id, theme_id, symbol_chosen,
                symbol_method, situation_text, ai_interpreted, ai_used_fallback,
                read_duration_s, time_to_ai_request_s, notification_opened, mood_tag, is_favorite, shared
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
            params![
                reading.id,
                reading.created_at,
                reading.source_id,
                reading.passage_id,
                reading.theme_id,
                reading.symbol_chosen,
                serde_json::to_string(&reading.symbol_method).unwrap(),
                reading.situation_text,
                reading.ai_interpreted as i32,
                reading.ai_used_fallback as i32,
                reading.read_duration_s,
                reading.time_to_ai_request_s,
                reading.notification_opened as i32,
                reading.mood_tag.as_ref().map(|m| serde_json::to_string(m).unwrap()),
                reading.is_favorite as i32,
                reading.shared as i32,
            ],
        )?;
        Ok(())
    }

    pub fn get_readings(&self, limit: u32, offset: u32) -> Result<Vec<Reading>, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT * FROM readings ORDER BY created_at DESC LIMIT ? OFFSET ?",
        )?;
        
        let rows = stmt.query_map(params![limit, offset], |row| {
            Ok(Reading {
                id: row.get(0)?,
                created_at: row.get(1)?,
                source_id: row.get(2)?,
                passage_id: row.get(3)?,
                theme_id: row.get(4)?,
                symbol_chosen: row.get(5)?,
                symbol_method: serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or(SymbolMethod::Manual),
                situation_text: row.get(7)?,
                ai_interpreted: row.get::<_, i32>(8)? != 0,
                ai_used_fallback: row.get::<_, i32>(9)? != 0,
                read_duration_s: row.get(10)?,
                time_to_ai_request_s: row.get(11)?,
                notification_opened: row.get::<_, i32>(12)? != 0,
                mood_tag: row.get::<_, Option<String>>(13)?.and_then(|s| serde_json::from_str(&s).ok()),
                is_favorite: row.get::<_, i32>(14)? != 0,
                shared: row.get::<_, i32>(15)? != 0,
            })
        })?;

        let mut readings = Vec::new();
        for row in rows {
            readings.push(row?);
        }
        Ok(readings)
    }

    pub fn get_readings_count(&self) -> Result<u32, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let count: u32 = conn.query_row("SELECT COUNT(*) FROM readings", [], |row| row.get(0))?;
        Ok(count)
    }

    #[allow(dead_code)]
    pub fn get_reading_by_id(&self, id: &str) -> Result<Option<Reading>, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT * FROM readings WHERE id = ?")?;
        
        let result = stmt.query_row(params![id], |row| {
            Ok(Reading {
                id: row.get(0)?,
                created_at: row.get(1)?,
                source_id: row.get(2)?,
                passage_id: row.get(3)?,
                theme_id: row.get(4)?,
                symbol_chosen: row.get(5)?,
                symbol_method: serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or(SymbolMethod::Manual),
                situation_text: row.get(7)?,
                ai_interpreted: row.get::<_, i32>(8)? != 0,
                ai_used_fallback: row.get::<_, i32>(9)? != 0,
                read_duration_s: row.get(10)?,
                time_to_ai_request_s: row.get(11)?,
                notification_opened: row.get::<_, i32>(12)? != 0,
                mood_tag: row.get::<_, Option<String>>(13)?.and_then(|s| serde_json::from_str(&s).ok()),
                is_favorite: row.get::<_, i32>(14)? != 0,
                shared: row.get::<_, i32>(15)? != 0,
            })
        });

        match result {
            Ok(reading) => Ok(Some(reading)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AletheiaError::from(e)),
        }
    }

    #[allow(dead_code)]
    pub fn update_reading(&self, reading: &Reading) -> Result<(), AletheiaError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"UPDATE readings SET
                ai_interpreted = ?, ai_used_fallback = ?, read_duration_s = ?,
                mood_tag = ?, is_favorite = ?, shared = ?
            WHERE id = ?"#,
            params![
                reading.ai_interpreted as i32,
                reading.ai_used_fallback as i32,
                reading.read_duration_s,
                reading.mood_tag.as_ref().map(|m| serde_json::to_string(m).unwrap()),
                reading.is_favorite as i32,
                reading.shared as i32,
                reading.id,
            ],
        )?;
        Ok(())
    }

    // ========================================================================
    // SOURCE & PASSAGE OPERATIONS
    // ========================================================================

    #[allow(dead_code)]
    pub fn insert_source(&self, source: &Source) -> Result<(), AletheiaError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"INSERT INTO sources (id, name, tradition, language, passage_count, is_bundled, is_premium, fallback_prompts)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
            params![
                source.id,
                source.name,
                serde_json::to_string(&source.tradition).unwrap(),
                source.language,
                source.passage_count,
                source.is_bundled as i32,
                source.is_premium as i32,
                serde_json::to_string(&source.fallback_prompts).unwrap(),
            ],
        )?;
        Ok(())
    }

    pub fn get_source(&self, id: &str) -> Result<Option<Source>, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT * FROM sources WHERE id = ?")?;
        
        let result = stmt.query_row(params![id], |row| {
            Ok(Source {
                id: row.get(0)?,
                name: row.get(1)?,
                tradition: serde_json::from_str(&row.get::<_, String>(2)?).unwrap_or(Tradition::Universal),
                language: row.get(3)?,
                passage_count: row.get(4)?,
                is_bundled: row.get::<_, i32>(5)? != 0,
                is_premium: row.get::<_, i32>(6)? != 0,
                fallback_prompts: serde_json::from_str(&row.get::<_, String>(7)?).unwrap_or_default(),
            })
        });

        match result {
            Ok(source) => Ok(Some(source)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AletheiaError::from(e)),
        }
    }

    pub fn get_sources_count(&self) -> Result<u32, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let count: u32 = conn.query_row("SELECT COUNT(*) FROM sources", [], |row| row.get(0))?;
        Ok(count)
    }

    #[allow(dead_code)]
    pub fn get_sources(&self, premium_allowed: bool) -> Result<Vec<Source>, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let query = if premium_allowed {
            "SELECT * FROM sources"
        } else {
            "SELECT * FROM sources WHERE is_premium = 0"
        };
        
        let mut stmt = conn.prepare(query)?;
        let rows = stmt.query_map([], |row| {
            Ok(Source {
                id: row.get(0)?,
                name: row.get(1)?,
                tradition: serde_json::from_str(&row.get::<_, String>(2)?).unwrap_or(Tradition::Universal),
                language: row.get(3)?,
                passage_count: row.get(4)?,
                is_bundled: row.get::<_, i32>(5)? != 0,
                is_premium: row.get::<_, i32>(6)? != 0,
                fallback_prompts: serde_json::from_str(&row.get::<_, String>(7)?).unwrap_or_default(),
            })
        })?;

        let mut sources = Vec::new();
        for row in rows {
            sources.push(row?);
        }
        Ok(sources)
    }

    pub fn get_random_source(&self, premium_allowed: bool) -> Result<Option<Source>, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let query = if premium_allowed {
            "SELECT * FROM sources ORDER BY RANDOM() LIMIT 1"
        } else {
            "SELECT * FROM sources WHERE is_premium = 0 ORDER BY RANDOM() LIMIT 1"
        };
        
        let mut stmt = conn.prepare(query)?;
        let result = stmt.query_row([], |row| {
            Ok(Source {
                id: row.get(0)?,
                name: row.get(1)?,
                tradition: serde_json::from_str(&row.get::<_, String>(2)?).unwrap_or(Tradition::Universal),
                language: row.get(3)?,
                passage_count: row.get(4)?,
                is_bundled: row.get::<_, i32>(5)? != 0,
                is_premium: row.get::<_, i32>(6)? != 0,
                fallback_prompts: serde_json::from_str(&row.get::<_, String>(7)?).unwrap_or_default(),
            })
        });

        match result {
            Ok(source) => Ok(Some(source)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AletheiaError::from(e)),
        }
    }

    #[allow(dead_code)]
    pub fn insert_passage(&self, passage: &Passage) -> Result<(), AletheiaError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO passages (id, source_id, reference, text, context) VALUES (?, ?, ?, ?, ?)",
            params![passage.id, passage.source_id, passage.reference, passage.text, passage.context],
        )?;
        Ok(())
    }

    pub fn get_random_passage(&self, source_id: &str) -> Result<Option<Passage>, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT * FROM passages WHERE source_id = ? ORDER BY RANDOM() LIMIT 1",
        )?;
        
        let result = stmt.query_row(params![source_id], |row| {
            Ok(Passage {
                id: row.get(0)?,
                source_id: row.get(1)?,
                reference: row.get(2)?,
                text: row.get(3)?,
                context: row.get(4)?,
            })
        });

        match result {
            Ok(passage) => Ok(Some(passage)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AletheiaError::from(e)),
        }
    }

    // ========================================================================
    // THEME & SYMBOL OPERATIONS
    // ========================================================================

    #[allow(dead_code)]
    pub fn insert_theme(&self, theme: &Theme) -> Result<(), AletheiaError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO themes (id, name, is_premium, pack_id, price_usd) VALUES (?, ?, ?, ?, ?)",
            params![theme.id, theme.name, theme.is_premium as i32, theme.pack_id, theme.price_usd],
        )?;

        for symbol in &theme.symbols {
            conn.execute(
                "INSERT INTO symbols (id, theme_id, display_name, flavor_text) VALUES (?, ?, ?, ?)",
                params![symbol.id, theme.id, symbol.display_name, symbol.flavor_text],
            )?;
        }
        Ok(())
    }

    #[allow(dead_code)]
    pub fn get_theme(&self, id: &str) -> Result<Option<Theme>, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let mut theme_stmt = conn.prepare("SELECT * FROM themes WHERE id = ?")?;
        
        let theme_result = theme_stmt.query_row(params![id], |row| {
            Ok(Theme {
                id: row.get(0)?,
                name: row.get(1)?,
                is_premium: row.get::<_, i32>(2)? != 0,
                pack_id: row.get(3)?,
                price_usd: row.get(4)?,
                symbols: Vec::new(),
            })
        });

        match theme_result {
            Ok(mut theme) => {
                let mut symbol_stmt = conn.prepare("SELECT * FROM symbols WHERE theme_id = ?")?;
                let symbols = symbol_stmt.query_map(params![id], |row| {
                    Ok(Symbol {
                        id: row.get(0)?,
                        display_name: row.get(2)?,
                        flavor_text: row.get(3)?,
                    })
                })?;
                
                theme.symbols = symbols.filter_map(|s| s.ok()).collect();
                Ok(Some(theme))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AletheiaError::from(e)),
        }
    }

    pub fn get_random_theme(&self, premium_allowed: bool) -> Result<Option<Theme>, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let query = if premium_allowed {
            "SELECT * FROM themes ORDER BY RANDOM() LIMIT 1"
        } else {
            "SELECT * FROM themes WHERE is_premium = 0 ORDER BY RANDOM() LIMIT 1"
        };
        
        let mut theme_stmt = conn.prepare(query)?;
        let theme_result = theme_stmt.query_row([], |row| {
            Ok(Theme {
                id: row.get(0)?,
                name: row.get(1)?,
                is_premium: row.get::<_, i32>(2)? != 0,
                pack_id: row.get(3)?,
                price_usd: row.get(4)?,
                symbols: Vec::new(),
            })
        });

        match theme_result {
            Ok(mut theme) => {
                let mut symbol_stmt = conn.prepare("SELECT * FROM symbols WHERE theme_id = ?")?;
                let symbols = symbol_stmt.query_map(params![&theme.id], |row| {
                    Ok(Symbol {
                        id: row.get(0)?,
                        display_name: row.get(2)?,
                        flavor_text: row.get(3)?,
                    })
                })?;
                
                theme.symbols = symbols.filter_map(|s| s.ok()).collect();
                Ok(Some(theme))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AletheiaError::from(e)),
        }
    }

    pub fn get_random_symbols(&self, theme_id: &str, count: usize) -> Result<Vec<Symbol>, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            &format!("SELECT * FROM symbols WHERE theme_id = ? ORDER BY RANDOM() LIMIT {}", count),
        )?;
        
        let rows = stmt.query_map(params![theme_id], |row| {
            Ok(Symbol {
                id: row.get(0)?,
                display_name: row.get(2)?,
                flavor_text: row.get(3)?,
            })
        })?;

        let mut symbols = Vec::new();
        for row in rows {
            symbols.push(row?);
        }
        Ok(symbols)
    }

    pub fn get_symbol_by_id(&self, id: &str) -> Result<Option<Symbol>, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT * FROM symbols WHERE id = ?")?;
        
        let result = stmt.query_row(params![id], |row| {
            Ok(Symbol {
                id: row.get(0)?,
                display_name: row.get(2)?,
                flavor_text: row.get(3)?,
            })
        });

        match result {
            Ok(symbol) => Ok(Some(symbol)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AletheiaError::from(e)),
        }
    }

    // ========================================================================
    // USER STATE OPERATIONS
    // ========================================================================

    pub fn get_user_state(&self, user_id: &str) -> Result<UserState, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let today = current_utc_date(&conn)?;
        let mut stmt = conn.prepare("SELECT * FROM user_state WHERE user_id = ?")?;
        
        let result = stmt.query_row(params![user_id], |row| {
            Ok(UserState {
                user_id: row.get(0)?,
                subscription_tier: serde_json::from_str(&row.get::<_, String>(1)?).unwrap_or(SubscriptionTier::Free),
                readings_today: row.get(2)?,
                ai_calls_today: row.get(3)?,
                session_count: row.get(4)?,
                last_reading_date: row.get(5)?,
                notification_enabled: row.get::<_, i32>(6)? != 0,
                notification_time: row.get(7)?,
                preferred_language: row.get(8)?,
                dark_mode: row.get::<_, i32>(9)? != 0,
                onboarding_complete: row.get::<_, i32>(10)? != 0,
            })
        });
        drop(stmt);
        drop(conn);

        match result {
            Ok(mut state) => {
                if state.last_reading_date.as_deref() != Some(today.as_str()) {
                    state.readings_today = 0;
                    state.ai_calls_today = 0;
                    self.update_user_state(&state)?;
                }
                Ok(state)
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                let default_state = UserState {
                    user_id: user_id.to_string(),
                    ..UserState::default()
                };
                self.insert_user_state(&default_state)?;
                Ok(default_state)
            }
            Err(e) => Err(AletheiaError::from(e)),
        }
    }

    pub fn insert_user_state(&self, state: &UserState) -> Result<(), AletheiaError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"INSERT INTO user_state (
                user_id, subscription_tier, readings_today, ai_calls_today,
                session_count, last_reading_date, notification_enabled, notification_time,
                preferred_language, dark_mode, onboarding_complete
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
            params![
                state.user_id,
                serde_json::to_string(&state.subscription_tier).unwrap(),
                state.readings_today,
                state.ai_calls_today,
                state.session_count,
                state.last_reading_date,
                state.notification_enabled as i32,
                state.notification_time,
                state.preferred_language,
                state.dark_mode as i32,
                state.onboarding_complete as i32,
            ],
        )?;
        Ok(())
    }

    pub fn update_user_state(&self, state: &UserState) -> Result<(), AletheiaError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"UPDATE user_state SET
                subscription_tier = ?, readings_today = ?, ai_calls_today = ?,
                session_count = ?, last_reading_date = ?, notification_enabled = ?,
                notification_time = ?, preferred_language = ?, dark_mode = ?,
                onboarding_complete = ?
            WHERE user_id = ?"#,
            params![
                serde_json::to_string(&state.subscription_tier).unwrap(),
                state.readings_today,
                state.ai_calls_today,
                state.session_count,
                state.last_reading_date,
                state.notification_enabled as i32,
                state.notification_time,
                state.preferred_language,
                state.dark_mode as i32,
                state.onboarding_complete as i32,
                state.user_id,
            ],
        )?;
        Ok(())
    }

    pub fn increment_readings_today(&self, user_id: &str) -> Result<(), AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let today = current_utc_date(&conn)?;
        conn.execute(
            "UPDATE user_state SET readings_today = readings_today + 1, last_reading_date = ? WHERE user_id = ?",
            params![today, user_id],
        )?;
        Ok(())
    }

    pub fn increment_ai_calls_today(&self, user_id: &str) -> Result<(), AletheiaError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE user_state SET ai_calls_today = ai_calls_today + 1 WHERE user_id = ?",
            params![user_id],
        )?;
        Ok(())
    }

    pub fn increment_session_count(&self, user_id: &str) -> Result<(), AletheiaError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE user_state SET session_count = session_count + 1 WHERE user_id = ?",
            params![user_id],
        )?;
        Ok(())
    }

    // ========================================================================
    // NOTIFICATION OPERATIONS
    // ========================================================================

    #[allow(dead_code)]
    pub fn insert_notification_entry(&self, entry: &NotificationEntry) -> Result<(), AletheiaError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO notification_matrix (symbol_id, question) VALUES (?, ?)",
            params![entry.symbol_id, entry.question],
        )?;
        Ok(())
    }

    pub fn get_notification_matrix(&self) -> Result<Vec<NotificationEntry>, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT * FROM notification_matrix")?;
        
        let rows = stmt.query_map([], |row| {
            Ok(NotificationEntry {
                symbol_id: row.get(1)?,
                question: row.get(2)?,
            })
        })?;

        let mut entries = Vec::new();
        for row in rows {
            entries.push(row?);
        }
        Ok(entries)
    }

    pub fn get_fallback_prompts(&self, source_id: &str) -> Result<Vec<String>, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT fallback_prompts FROM sources WHERE id = ?")?;
        
        let prompts: Option<String> = stmt.query_row([source_id], |row| row.get(0)).ok();
        
        match prompts {
            Some(p) => Ok(from_str::<Vec<String>>(&p).unwrap_or_default()),
            None => Ok(vec![]),
        }
    }
}

fn current_utc_date(conn: &Connection) -> Result<String, AletheiaError> {
    let today = conn.query_row("SELECT date('now')", [], |row| row.get(0))?;
    Ok(today)
}
