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
    /// Date override from JS client in YYYY-MM-DD format.
    /// When absent, daily reset falls back to UTC date from SQLite.
    local_date_override: Mutex<Option<String>>,
}

impl Store {
    pub fn new(db_path: &str) -> Result<Self, AletheiaError> {
        let conn = Connection::open(db_path)
            .map_err(|e| AletheiaError::storage_write_fail(&format!("Failed to open DB: {}", e)))?;

        let store = Self {
            conn: Mutex::new(conn),
            local_date_override: Mutex::new(None),
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
                    shared INTEGER NOT NULL DEFAULT 0,
                    user_intent TEXT
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
                    onboarding_complete INTEGER NOT NULL DEFAULT 0,
                    user_intent TEXT
                );
                "#,
            )?;
            tx.execute("PRAGMA user_version = 3", [])?;
        }

        if user_version < 4 {
            // ALTER TABLE readings: time_to_ai_request_s
            let has_time_col: bool = tx.query_row(
                "SELECT COUNT(*) FROM pragma_table_info('readings') WHERE name='time_to_ai_request_s'",
                [], |r| r.get::<_, i32>(0),
            ).unwrap_or(0) > 0;
            if !has_time_col {
                tx.execute_batch("ALTER TABLE readings ADD COLUMN time_to_ai_request_s INTEGER;")?;
            }

            // ALTER TABLE readings: notification_opened
            let has_notif_col: bool = tx.query_row(
                "SELECT COUNT(*) FROM pragma_table_info('readings') WHERE name='notification_opened'",
                [], |r| r.get::<_, i32>(0),
            ).unwrap_or(0) > 0;
            if !has_notif_col {
                tx.execute_batch("ALTER TABLE readings ADD COLUMN notification_opened INTEGER NOT NULL DEFAULT 0;")?;
            }

            // ALTER TABLE user_state: session_count
            let has_session_col: bool = tx.query_row(
                "SELECT COUNT(*) FROM pragma_table_info('user_state') WHERE name='session_count'",
                [], |r| r.get::<_, i32>(0),
            ).unwrap_or(0) > 0;
            if !has_session_col {
                tx.execute_batch(
                    "ALTER TABLE user_state ADD COLUMN session_count INTEGER NOT NULL DEFAULT 0;",
                )?;
            }

            tx.execute("PRAGMA user_version = 4", [])?;
        }

        // ── THÊM MIGRATION V5 ──────────────────────────────────────────────
        if user_version < 5 {
            // Check if resonance_context column already exists before adding.
            // Using PRAGMA table_info is the idiomatic SQLite way — avoids
            // swallowing real errors (disk full, corruption) with try/catch.
            let col_exists: bool = tx.query_row(
                "SELECT COUNT(*) FROM pragma_table_info('passages') WHERE name='resonance_context'",
                [],
                |r| r.get::<_, i32>(0),
            ).unwrap_or(0) > 0;

            if !col_exists {
                tx.execute_batch("ALTER TABLE passages ADD COLUMN resonance_context TEXT;")?;
            }
            tx.execute("PRAGMA user_version = 5", [])?;
        }
        // ── END MIGRATION V5 ───────────────────────────────────────────────

        // ── MIGRATION V6: Add user_intent to readings table ──────────────
        if user_version < 6 {
            let col_exists: bool = tx
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('readings') WHERE name='user_intent'",
                    [],
                    |r| r.get::<_, i32>(0),
                )
                .unwrap_or(0)
                > 0;

            if !col_exists {
                tx.execute_batch("ALTER TABLE readings ADD COLUMN user_intent TEXT;")?;
            }
            tx.execute("PRAGMA user_version = 6", [])?;
        }
        // ── END MIGRATION V6 ───────────────────────────────────────────────

        if user_version < 7 {
            let col_exists: bool = tx
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('user_state') WHERE name='user_intent'",
                    [],
                    |r| r.get::<_, i32>(0),
                )
                .unwrap_or(0)
                > 0;

            if !col_exists {
                tx.execute_batch("ALTER TABLE user_state ADD COLUMN user_intent TEXT;")?;
            }
            tx.execute("PRAGMA user_version = 7", [])?;
        }

        tx.commit()?;

        info!("Migrations completed to version 7");
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
                symbol_method, situation_text, ai_interpreted, ai_used_fallback, user_intent,
                read_duration_s, time_to_ai_request_s, notification_opened, mood_tag, is_favorite, shared
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
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
                reading
                    .user_intent
                    .as_ref()
                    .map(|intent| serde_json::to_string(intent).unwrap()),
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
            r#"SELECT
                id,
                created_at,
                source_id,
                passage_id,
                theme_id,
                symbol_chosen,
                symbol_method,
                situation_text,
                ai_interpreted,
                ai_used_fallback,
                read_duration_s,
                time_to_ai_request_s,
                notification_opened,
                mood_tag,
                is_favorite,
                shared,
                user_intent
            FROM readings
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?"#,
        )?;

        let rows = stmt.query_map(params![limit, offset], |row| {
            Ok(Reading {
                id: row.get(0)?,
                created_at: row.get(1)?,
                source_id: row.get(2)?,
                passage_id: row.get(3)?,
                theme_id: row.get(4)?,
                symbol_chosen: row.get(5)?,
                symbol_method: serde_json::from_str(&row.get::<_, String>(6)?)
                    .unwrap_or(SymbolMethod::Manual),
                situation_text: row.get(7)?,
                ai_interpreted: row.get::<_, i32>(8)? != 0,
                ai_used_fallback: row.get::<_, i32>(9)? != 0,
                read_duration_s: row.get(10)?,
                time_to_ai_request_s: row.get(11)?,
                notification_opened: row.get::<_, i32>(12)? != 0,
                mood_tag: row
                    .get::<_, Option<String>>(13)?
                    .and_then(|s| serde_json::from_str(&s).ok()),
                is_favorite: row.get::<_, i32>(14)? != 0,
                shared: row.get::<_, i32>(15)? != 0,
                user_intent: row
                    .get::<_, Option<String>>(16)?
                    .and_then(|s| serde_json::from_str(&s).ok()),
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
        let mut stmt = conn.prepare(
            r#"SELECT
                id,
                created_at,
                source_id,
                passage_id,
                theme_id,
                symbol_chosen,
                symbol_method,
                situation_text,
                ai_interpreted,
                ai_used_fallback,
                read_duration_s,
                time_to_ai_request_s,
                notification_opened,
                mood_tag,
                is_favorite,
                shared,
                user_intent
            FROM readings
            WHERE id = ?"#,
        )?;

        let result = stmt.query_row(params![id], |row| {
            Ok(Reading {
                id: row.get(0)?,
                created_at: row.get(1)?,
                source_id: row.get(2)?,
                passage_id: row.get(3)?,
                theme_id: row.get(4)?,
                symbol_chosen: row.get(5)?,
                symbol_method: serde_json::from_str(&row.get::<_, String>(6)?)
                    .unwrap_or(SymbolMethod::Manual),
                situation_text: row.get(7)?,
                ai_interpreted: row.get::<_, i32>(8)? != 0,
                ai_used_fallback: row.get::<_, i32>(9)? != 0,
                read_duration_s: row.get(10)?,
                time_to_ai_request_s: row.get(11)?,
                notification_opened: row.get::<_, i32>(12)? != 0,
                mood_tag: row
                    .get::<_, Option<String>>(13)?
                    .and_then(|s| serde_json::from_str(&s).ok()),
                is_favorite: row.get::<_, i32>(14)? != 0,
                shared: row.get::<_, i32>(15)? != 0,
                user_intent: row
                    .get::<_, Option<String>>(16)?
                    .and_then(|s| serde_json::from_str(&s).ok()),
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
                mood_tag = ?, is_favorite = ?, shared = ?, user_intent = ?
            WHERE id = ?"#,
            params![
                reading.ai_interpreted as i32,
                reading.ai_used_fallback as i32,
                reading.read_duration_s,
                reading
                    .mood_tag
                    .as_ref()
                    .map(|m| serde_json::to_string(m).unwrap()),
                reading.is_favorite as i32,
                reading.shared as i32,
                reading
                    .user_intent
                    .as_ref()
                    .map(|i| serde_json::to_string(i).unwrap()),
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
                tradition: serde_json::from_str(&row.get::<_, String>(2)?)
                    .unwrap_or(Tradition::Universal),
                language: row.get(3)?,
                passage_count: row.get(4)?,
                is_bundled: row.get::<_, i32>(5)? != 0,
                is_premium: row.get::<_, i32>(6)? != 0,
                fallback_prompts: serde_json::from_str(&row.get::<_, String>(7)?)
                    .unwrap_or_default(),
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
                tradition: serde_json::from_str(&row.get::<_, String>(2)?)
                    .unwrap_or(Tradition::Universal),
                language: row.get(3)?,
                passage_count: row.get(4)?,
                is_bundled: row.get::<_, i32>(5)? != 0,
                is_premium: row.get::<_, i32>(6)? != 0,
                fallback_prompts: serde_json::from_str(&row.get::<_, String>(7)?)
                    .unwrap_or_default(),
            })
        })?;

        let mut sources = Vec::new();
        for row in rows {
            sources.push(row?);
        }
        Ok(sources)
    }

    pub fn get_random_source(
        &self,
        premium_allowed: bool,
        preferred_language: Option<&str>,
    ) -> Result<Option<Source>, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let normalized_language = preferred_language
            .map(|language| language.trim().to_lowercase())
            .filter(|language| !language.is_empty());

        let mut filters: Vec<&str> = Vec::new();
        if !premium_allowed {
            filters.push("is_premium = 0");
        }
        if normalized_language.is_some() {
            filters.push("language = ?");
        }

        let where_clause = if filters.is_empty() {
            String::new()
        } else {
            format!(" WHERE {}", filters.join(" AND "))
        };

        let query = format!("SELECT * FROM sources{} ORDER BY RANDOM() LIMIT 1", where_clause);
        let mut stmt = conn.prepare(&query)?;
        let map_source = |row: &rusqlite::Row<'_>| {
            Ok(Source {
                id: row.get(0)?,
                name: row.get(1)?,
                tradition: serde_json::from_str(&row.get::<_, String>(2)?)
                    .unwrap_or(Tradition::Universal),
                language: row.get(3)?,
                passage_count: row.get(4)?,
                is_bundled: row.get::<_, i32>(5)? != 0,
                is_premium: row.get::<_, i32>(6)? != 0,
                fallback_prompts: serde_json::from_str(&row.get::<_, String>(7)?)
                    .unwrap_or_default(),
            })
        };

        let primary_result = match normalized_language.as_deref() {
            Some(language) => stmt.query_row([language], map_source),
            None => stmt.query_row([], map_source),
        };

        match primary_result {
            Ok(source) => Ok(Some(source)),
            Err(rusqlite::Error::QueryReturnedNoRows) if normalized_language.is_some() => {
                let fallback_query = if premium_allowed {
                    "SELECT * FROM sources ORDER BY RANDOM() LIMIT 1"
                } else {
                    "SELECT * FROM sources WHERE is_premium = 0 ORDER BY RANDOM() LIMIT 1"
                };

                let mut fallback_stmt = conn.prepare(fallback_query)?;
                match fallback_stmt.query_row([], map_source) {
                    Ok(source) => Ok(Some(source)),
                    Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                    Err(error) => Err(AletheiaError::from(error)),
                }
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AletheiaError::from(e)),
        }
    }

    #[allow(dead_code)]
    pub fn insert_passage(&self, passage: &Passage) -> Result<(), AletheiaError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO passages (id, source_id, reference, text, context, resonance_context) VALUES (?, ?, ?, ?, ?, ?)",
            params![
                passage.id,
                passage.source_id,
                passage.reference,
                passage.text,
                passage.context,
                passage.resonance_context,
            ],
        )?;
        Ok(())
    }

    pub fn get_random_passage(&self, source_id: &str) -> Result<Option<Passage>, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt =
            conn.prepare("SELECT * FROM passages WHERE source_id = ? ORDER BY RANDOM() LIMIT 1")?;

        let result = stmt.query_row(params![source_id], |row| {
            Ok(Passage {
                id: row.get(0)?,
                source_id: row.get(1)?,
                reference: row.get(2)?,
                text: row.get(3)?,
                context: row.get(4)?,
                resonance_context: row.get(5)?,
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
            params![
                theme.id,
                theme.name,
                theme.is_premium as i32,
                theme.pack_id,
                theme.price_usd
            ],
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

    pub fn get_random_symbols(
        &self,
        theme_id: &str,
        count: usize,
    ) -> Result<Vec<Symbol>, AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(&format!(
            "SELECT * FROM symbols WHERE theme_id = ? ORDER BY RANDOM() LIMIT {}",
            count
        ))?;

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
        let today = self.get_today(&conn)?;
        let mut stmt = conn.prepare("SELECT * FROM user_state WHERE user_id = ?")?;

        let result = stmt.query_row(params![user_id], |row| {
            Ok(UserState {
                user_id: row.get(0)?,
                subscription_tier: serde_json::from_str(&row.get::<_, String>(1)?)
                    .unwrap_or(SubscriptionTier::Free),
                readings_today: row.get(2)?,
                ai_calls_today: row.get(3)?,
                session_count: row.get(4)?,
                last_reading_date: row.get(5)?,
                notification_enabled: row.get::<_, i32>(6)? != 0,
                notification_time: row.get(7)?,
                preferred_language: row.get(8)?,
                dark_mode: row.get::<_, i32>(9)? != 0,
                onboarding_complete: row.get::<_, i32>(10)? != 0,
                user_intent: row
                    .get::<_, Option<String>>(11)?
                    .and_then(|s| serde_json::from_str(&s).ok()),
            })
        });
        drop(stmt);
        drop(conn);

        match result {
            Ok(mut state) => {
                if state.last_reading_date.as_deref() != Some(today.as_str()) {
                    state.readings_today = 0;
                    state.ai_calls_today = 0;
                    state.last_reading_date = Some(today);
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
                preferred_language, dark_mode, onboarding_complete, user_intent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
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
                state
                    .user_intent
                    .as_ref()
                    .map(|intent| serde_json::to_string(intent).unwrap()),
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
                onboarding_complete = ?, user_intent = ?
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
                state
                    .user_intent
                    .as_ref()
                    .map(|intent| serde_json::to_string(intent).unwrap()),
                state.user_id,
            ],
        )?;
        Ok(())
    }

    pub fn increment_readings_today(&self, user_id: &str) -> Result<(), AletheiaError> {
        let conn = self.conn.lock().unwrap();
        let today = self.get_today(&conn)?;
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
    pub fn insert_notification_entry(
        &self,
        entry: &NotificationEntry,
    ) -> Result<(), AletheiaError> {
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

    pub fn set_local_date(&self, date: String) {
        if date.len() == 10 && date.chars().nth(4) == Some('-') {
            if let Ok(mut lock) = self.local_date_override.lock() {
                *lock = Some(date);
            }
        }
    }

    fn get_today(&self, conn: &Connection) -> Result<String, AletheiaError> {
        if let Ok(lock) = self.local_date_override.lock() {
            if let Some(date) = lock.as_ref() {
                return Ok(date.clone());
            }
        }
        current_utc_date(conn)
    }
}

fn current_utc_date(conn: &Connection) -> Result<String, AletheiaError> {
    let today = conn.query_row("SELECT date('now')", [], |row| row.get(0))?;
    Ok(today)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_store() -> Result<Store, AletheiaError> {
        Store::new(":memory:")
    }

    fn create_test_source() -> Source {
        Source {
            id: "test-source-1".to_string(),
            name: "Test Source".to_string(),
            tradition: Tradition::Universal,
            language: "en".to_string(),
            passage_count: 10,
            is_bundled: true,
            is_premium: false,
            fallback_prompts: vec![
                "prompt1".to_string(),
                "prompt2".to_string(),
                "prompt3".to_string(),
            ],
        }
    }

    fn create_test_theme() -> Theme {
        Theme {
            id: "test-theme-1".to_string(),
            name: "Test Theme".to_string(),
            symbols: vec![],
            is_premium: false,
            pack_id: None,
            price_usd: None,
        }
    }

    fn create_test_passage(source_id: &str) -> Passage {
        Passage {
            id: "test-passage-1".to_string(),
            source_id: source_id.to_string(),
            reference: "Test 1:1".to_string(),
            text: "This is a test passage.".to_string(),
            context: Some("Test context".to_string()),
            resonance_context: None,
        }
    }

    #[test]
    fn test_store_initialization() {
        let result = create_test_store();
        assert!(result.is_ok(), "Failed to create store: {:?}", result.err());
    }

    #[test]
    fn test_insert_and_get_source() {
        let store = create_test_store().unwrap();
        let source = create_test_source();

        let insert_result = store.insert_source(&source);
        assert!(
            insert_result.is_ok(),
            "Failed to insert source: {:?}",
            insert_result.err()
        );

        let get_result = store.get_source(&source.id);
        assert!(
            get_result.is_ok(),
            "Failed to get source: {:?}",
            get_result.err()
        );

        let retrieved = get_result.unwrap();
        assert!(retrieved.is_some(), "Source should exist");
        assert_eq!(retrieved.unwrap().name, "Test Source");
    }

    #[test]
    fn test_get_nonexistent_source() {
        let store = create_test_store().unwrap();
        let result = store.get_source("nonexistent");
        assert!(result.is_ok(), "Failed to get source: {:?}", result.err());
        assert!(
            result.unwrap().is_none(),
            "Should return None for nonexistent source"
        );
    }

    #[test]
    fn test_insert_and_get_theme() {
        let store = create_test_store().unwrap();
        let theme = create_test_theme();

        let result = store.insert_theme(&theme);
        assert!(result.is_ok(), "Failed to insert theme: {:?}", result.err());

        let retrieved = store.get_theme(&theme.id).unwrap();
        assert!(retrieved.is_some(), "Theme should exist");
        assert_eq!(retrieved.unwrap().name, "Test Theme");
    }

    #[test]
    fn test_insert_and_get_passage() {
        let store = create_test_store().unwrap();
        let source = create_test_source();
        let passage = create_test_passage(&source.id);

        store.insert_source(&source).unwrap();
        let result = store.insert_passage(&passage);
        assert!(
            result.is_ok(),
            "Failed to insert passage: {:?}",
            result.err()
        );

        // Verify by getting random passage
        let random_passage = store.get_random_passage(&source.id).unwrap();
        assert!(random_passage.is_some(), "Should have a passage");
        assert_eq!(random_passage.unwrap().text, "This is a test passage.");
    }

    #[test]
    fn test_get_random_source() {
        let store = create_test_store().unwrap();
        let source = create_test_source();
        store.insert_source(&source).unwrap();

        let result = store.get_random_source(false, None);
        assert!(
            result.is_ok(),
            "Failed to get random source: {:?}",
            result.err()
        );

        let random_source = result.unwrap();
        assert!(random_source.is_some(), "Should return a source");
    }

    #[test]
    fn test_get_random_theme() {
        let store = create_test_store().unwrap();
        let theme = create_test_theme();
        store.insert_theme(&theme).unwrap();

        let result = store.get_random_theme(false);
        assert!(
            result.is_ok(),
            "Failed to get random theme: {:?}",
            result.err()
        );

        let random_theme = result.unwrap();
        assert!(random_theme.is_some(), "Should return a theme");
    }

    #[test]
    fn test_insert_reading() {
        let store = create_test_store().unwrap();

        let source = create_test_source();
        let theme = create_test_theme();
        let passage = create_test_passage(&source.id);

        store.insert_source(&source).unwrap();
        store.insert_theme(&theme).unwrap();
        store.insert_passage(&passage).unwrap();

        let reading = Reading {
            id: "reading-1".to_string(),
            created_at: 1234567890,
            source_id: source.id.clone(),
            passage_id: passage.id.clone(),
            theme_id: theme.id.clone(),
            symbol_chosen: "test-symbol-1".to_string(),
            symbol_method: SymbolMethod::Manual,
            situation_text: Some("Test situation".to_string()),
            ai_interpreted: false,
            ai_used_fallback: false,
            read_duration_s: Some(60),
            time_to_ai_request_s: Some(30),
            notification_opened: false,
            mood_tag: None,
            is_favorite: false,
            shared: false,
            user_intent: None,
        };

        let result = store.insert_reading(&reading);
        assert!(
            result.is_ok(),
            "Failed to insert reading: {:?}",
            result.err()
        );

        let readings = store.get_readings(10, 0).unwrap();
        assert_eq!(readings.len(), 1, "Should have 1 reading");
        assert_eq!(
            readings[0].situation_text,
            Some("Test situation".to_string())
        );
    }

    #[test]
    fn test_get_readings_count() {
        let store = create_test_store().unwrap();

        let source = create_test_source();
        let theme = create_test_theme();
        let passage = create_test_passage(&source.id);

        store.insert_source(&source).unwrap();
        store.insert_theme(&theme).unwrap();
        store.insert_passage(&passage).unwrap();

        let reading = Reading {
            id: "reading-1".to_string(),
            created_at: 1234567890,
            source_id: source.id.clone(),
            passage_id: passage.id.clone(),
            theme_id: theme.id.clone(),
            symbol_chosen: "test-symbol-1".to_string(),
            symbol_method: SymbolMethod::Manual,
            situation_text: None,
            ai_interpreted: false,
            ai_used_fallback: false,
            read_duration_s: None,
            time_to_ai_request_s: None,
            notification_opened: false,
            mood_tag: None,
            is_favorite: false,
            shared: false,
            user_intent: None,
        };

        store.insert_reading(&reading).unwrap();

        let count = store.get_readings_count().unwrap();
        assert_eq!(count, 1, "Should have 1 reading");
    }

    #[test]
    fn test_user_state_operations() {
        let store = create_test_store().unwrap();

        let result = store.get_user_state("test-user");
        assert!(
            result.is_ok(),
            "Failed to get user state: {:?}",
            result.err()
        );

        let state = result.unwrap();
        assert_eq!(state.user_id, "test-user");
        assert_eq!(state.readings_today, 0);
        assert_eq!(state.ai_calls_today, 0);

        store.increment_readings_today("test-user").unwrap();
        let updated_state = store.get_user_state("test-user").unwrap();
        assert_eq!(updated_state.readings_today, 1);
    }

    #[test]
    fn test_user_state_daily_reset_updates_last_reading_date() {
        let store = create_test_store().unwrap();

        let mut state = UserState::default();
        state.user_id = "dated-user".to_string();
        state.readings_today = 3;
        state.ai_calls_today = 2;
        state.last_reading_date = Some("2025-06-14".to_string());
        store.insert_user_state(&state).unwrap();

        store.set_local_date("2025-06-15".to_string());
        let updated_state = store.get_user_state("dated-user").unwrap();

        assert_eq!(updated_state.readings_today, 0);
        assert_eq!(updated_state.ai_calls_today, 0);
        assert_eq!(updated_state.last_reading_date.as_deref(), Some("2025-06-15"));
    }

    #[test]
    fn test_seed_bundled_data() {
        let store = create_test_store().unwrap();

        let sources = vec![create_test_source()];
        let themes = vec![create_test_theme()];
        let passages = vec![create_test_passage("test-source-1")];

        let result = store.seed_bundled_data(&sources, &passages, &themes);
        assert!(result.is_ok(), "Failed to seed data: {:?}", result.err());

        let seeded = store
            .seed_bundled_data(&sources, &passages, &themes)
            .unwrap();
        assert!(!seeded, "Second seed should return false (already seeded)");
    }
}
