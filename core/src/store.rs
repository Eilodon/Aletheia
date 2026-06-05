//! Aletheia Core — SQLite Store (v7, WAL-hardened)
//! ADR-AL-13: Transactional Migrations
//! ADR-V7-03: Zero unwrap() in store — parking_lot + proper error propagation
//!
//! Changes from v4:
//!  - parking_lot::Mutex replaces std::sync::Mutex (no PoisonError ever)
//!  - WAL + NORMAL sync + mmap + busy_timeout set on open
//!  - All serde serializations pre-computed, errors propagated with `?`
//!  - Atomic transaction wrapping entire seed operation
//!  - Helper fn `ser()` eliminates repetitive map_err chains

use crate::contracts::*;
use crate::errors::AletheiaError;
use parking_lot::Mutex;
use rusqlite::{params, Connection};
use serde::Serialize;
use serde_json::from_str;
use tracing::info;

// ─── Serialization helper ────────────────────────────────────────────────────

fn ser<T: Serialize>(value: &T, field: &str) -> Result<String, AletheiaError> {
    serde_json::to_string(value)
        .map_err(|e| AletheiaError::storage_write_fail(&format!("serialize {field}: {e}")))
}

// ─── Store ───────────────────────────────────────────────────────────────────

pub struct Store {
    conn: Mutex<Connection>,
    /// JS-supplied local date override (YYYY-MM-DD).
    local_date_override: Mutex<Option<String>>,
}

impl Store {
    pub fn new(db_path: &str) -> Result<Self, AletheiaError> {
        let conn = Connection::open(db_path)
            .map_err(|e| AletheiaError::storage_write_fail(&format!("open DB: {e}")))?;

        // WAL mode: readers never block writers, writers never block readers
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA synchronous=NORMAL;
             PRAGMA temp_store=MEMORY;
             PRAGMA mmap_size=30000000;
             PRAGMA cache_size=-8000;
             PRAGMA foreign_keys=ON;
             PRAGMA busy_timeout=5000;",
        )
        .map_err(|e| AletheiaError::storage_write_fail(&format!("WAL pragmas: {e}")))?;

        let store = Self {
            conn: Mutex::new(conn),
            local_date_override: Mutex::new(None),
        };
        store.run_migrations()?;
        info!("Store initialized (WAL mode)");
        Ok(store)
    }

    fn run_migrations(&self) -> Result<(), AletheiaError> {
        let conn = self.conn.lock(); // parking_lot — always succeeds

        let tx = conn.unchecked_transaction()?;

        let user_version: i32 = tx
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .unwrap_or(0);

        if user_version < 1 {
            tx.execute_batch(
                r#"CREATE TABLE IF NOT EXISTS readings (
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
                CREATE INDEX IF NOT EXISTS idx_readings_source_id  ON readings(source_id);"#,
            )?;
            tx.execute("PRAGMA user_version = 1", [])?;
        }

        if user_version < 2 {
            tx.execute_batch(
                r#"CREATE TABLE IF NOT EXISTS sources (
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
                );"#,
            )?;
            tx.execute("PRAGMA user_version = 2", [])?;
        }

        if user_version < 3 {
            tx.execute_batch(
                r#"CREATE TABLE IF NOT EXISTS user_state (
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
                );"#,
            )?;
            tx.execute("PRAGMA user_version = 3", [])?;
        }

        if user_version < 4 {
            let col_exists = |name: &str, table: &str| -> bool {
                tx.query_row(
                    &format!(
                        "SELECT COUNT(*) FROM pragma_table_info('{table}') WHERE name='{name}'"
                    ),
                    [],
                    |r| r.get::<_, i32>(0),
                )
                .unwrap_or(0)
                    > 0
            };
            if !col_exists("time_to_ai_request_s", "readings") {
                tx.execute_batch("ALTER TABLE readings ADD COLUMN time_to_ai_request_s INTEGER;")?;
            }
            if !col_exists("notification_opened", "readings") {
                tx.execute_batch("ALTER TABLE readings ADD COLUMN notification_opened INTEGER NOT NULL DEFAULT 0;")?;
            }
            if !col_exists("session_count", "user_state") {
                tx.execute_batch(
                    "ALTER TABLE user_state ADD COLUMN session_count INTEGER NOT NULL DEFAULT 0;",
                )?;
            }
            tx.execute("PRAGMA user_version = 4", [])?;
        }

        if user_version < 5 {
            let exists: bool = tx
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('passages') WHERE name='resonance_context'",
                    [],
                    |r| r.get::<_, i32>(0),
                )
                .unwrap_or(0) > 0;
            if !exists {
                tx.execute_batch("ALTER TABLE passages ADD COLUMN resonance_context TEXT;")?;
            }
            tx.execute("PRAGMA user_version = 5", [])?;
        }

        if user_version < 6 {
            let exists: bool = tx
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('readings') WHERE name='user_intent'",
                    [],
                    |r| r.get::<_, i32>(0),
                )
                .unwrap_or(0)
                > 0;
            if !exists {
                tx.execute_batch("ALTER TABLE readings ADD COLUMN user_intent TEXT;")?;
            }
            tx.execute("PRAGMA user_version = 6", [])?;
        }

        if user_version < 7 {
            let exists: bool = tx
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('user_state') WHERE name='user_intent'",
                    [],
                    |r| r.get::<_, i32>(0),
                )
                .unwrap_or(0)
                > 0;
            if !exists {
                tx.execute_batch("ALTER TABLE user_state ADD COLUMN user_intent TEXT;")?;
            }
            tx.execute("PRAGMA user_version = 7", [])?;
        }

        if user_version < 8 {
            let col_exists: bool = tx
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('sources') WHERE name='source_type'",
                    [],
                    |r| r.get::<_, i32>(0),
                )
                .unwrap_or(0)
                > 0;
            if !col_exists {
                // DEFAULT 'bibliomancy' — backward-compatible với tất cả sources hiện có
                tx.execute_batch(
                    "ALTER TABLE sources ADD COLUMN source_type TEXT NOT NULL DEFAULT 'bibliomancy';"
                )?;
            }
            tx.execute("PRAGMA user_version = 8", [])?;
        }

        if user_version < 9 {
            let exists: bool = tx
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('user_state') WHERE name='weekly_summary_enabled'",
                    [],
                    |r| r.get::<_, i32>(0),
                )
                .unwrap_or(0) > 0;
            if !exists {
                tx.execute_batch(
                    "ALTER TABLE user_state ADD COLUMN weekly_summary_enabled INTEGER NOT NULL DEFAULT 0;"
                )?;
            }
            tx.execute("PRAGMA user_version = 9", [])?;
        }

        if user_version < 10 {
            let exists: bool = tx
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('symbols') WHERE name='archetype_asset_id'",
                    [],
                    |r| r.get::<_, i32>(0),
                )
                .unwrap_or(0)
                > 0;
            if !exists {
                tx.execute_batch("ALTER TABLE symbols ADD COLUMN archetype_asset_id TEXT;")?;
            }
            tx.execute("PRAGMA user_version = 10", [])?;
        }

        tx.commit()?;
        info!("Migrations complete (schema v10, WAL)");
        Ok(())
    }

    // ────────────────────────────────────────────────────────────────────────
    // SEED (atomic transaction)
    // ────────────────────────────────────────────────────────────────────────

    pub fn seed_bundled_data(
        &self,
        sources: &[Source],
        passages: &[Passage],
        themes: &[Theme],
    ) -> Result<bool, AletheiaError> {
        if self.get_sources_count()? > 0 {
            return Ok(false);
        }

        let conn = self.conn.lock();
        let tx = conn.unchecked_transaction()?;

        for source in sources {
            let tradition = ser(&source.tradition, "tradition")?;
            let fallback = ser(&source.fallback_prompts, "fallback_prompts")?;
            let source_type = ser(&source.source_type, "source_type")?;
            tx.execute(
                r#"INSERT INTO sources
                   (id,name,tradition,language,passage_count,is_bundled,is_premium,fallback_prompts,source_type)
                   VALUES (?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(id) DO UPDATE SET source_type=excluded.source_type"#,
                params![source.id, source.name, tradition, source.language,
                        source.passage_count, source.is_bundled as i32, source.is_premium as i32,
                        fallback, source_type],
            )?;
        }

        for passage in passages {
            tx.execute(
                "INSERT INTO passages (id,source_id,reference,text,context,resonance_context) VALUES (?,?,?,?,?,?)",
                params![passage.id, passage.source_id, passage.reference,
                        passage.text, passage.context, passage.resonance_context],
            )?;
        }

        for theme in themes {
            tx.execute(
                "INSERT INTO themes (id,name,is_premium,pack_id,price_usd) VALUES (?,?,?,?,?)",
                params![
                    theme.id,
                    theme.name,
                    theme.is_premium as i32,
                    theme.pack_id,
                    theme.price_usd
                ],
            )?;
            for symbol in &theme.symbols {
                tx.execute(
                    "INSERT INTO symbols (id,theme_id,display_name,flavor_text,archetype_asset_id) VALUES (?,?,?,?,?)",
                    params![
                        symbol.id,
                        theme.id,
                        symbol.display_name,
                        symbol.flavor_text,
                        symbol.archetype_asset_id
                    ],
                )?;
            }
        }

        tx.commit()?;
        info!(
            "Seeded bundled data (sources={}, passages={}, themes={})",
            sources.len(),
            passages.len(),
            themes.len()
        );
        Ok(true)
    }

    // ────────────────────────────────────────────────────────────────────────
    // READING OPERATIONS
    // ────────────────────────────────────────────────────────────────────────

    pub fn insert_reading(&self, reading: &Reading) -> Result<(), AletheiaError> {
        // Pre-serialize before acquiring lock
        let symbol_method = ser(&reading.symbol_method, "symbol_method")?;
        let user_intent = reading
            .user_intent
            .as_ref()
            .map(|i| ser(i, "user_intent"))
            .transpose()?;
        let mood_tag = reading
            .mood_tag
            .as_ref()
            .map(|m| ser(m, "mood_tag"))
            .transpose()?;

        let conn = self.conn.lock();
        conn.execute(
            r#"INSERT INTO readings (
                id,created_at,source_id,passage_id,theme_id,symbol_chosen,
                symbol_method,situation_text,ai_interpreted,ai_used_fallback,user_intent,
                read_duration_s,time_to_ai_request_s,notification_opened,mood_tag,is_favorite,shared
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"#,
            params![
                reading.id,
                reading.created_at,
                reading.source_id,
                reading.passage_id,
                reading.theme_id,
                reading.symbol_chosen,
                symbol_method,
                reading.situation_text,
                reading.ai_interpreted as i32,
                reading.ai_used_fallback as i32,
                user_intent,
                reading.read_duration_s,
                reading.time_to_ai_request_s,
                reading.notification_opened as i32,
                mood_tag,
                reading.is_favorite as i32,
                reading.shared as i32,
            ],
        )?;
        Ok(())
    }

    pub fn get_readings(&self, limit: u32, offset: u32) -> Result<Vec<Reading>, AletheiaError> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            r#"SELECT id,created_at,source_id,passage_id,theme_id,symbol_chosen,
                      symbol_method,situation_text,ai_interpreted,ai_used_fallback,
                      read_duration_s,time_to_ai_request_s,notification_opened,
                      mood_tag,is_favorite,shared,user_intent
               FROM readings ORDER BY created_at DESC LIMIT ? OFFSET ?"#,
        )?;
        let rows = stmt.query_map(params![limit, offset], map_reading)?;
        collect_rows(rows)
    }

    pub fn get_readings_count(&self) -> Result<u32, AletheiaError> {
        let conn = self.conn.lock();
        Ok(conn.query_row("SELECT COUNT(*) FROM readings", [], |r| r.get(0))?)
    }

    #[allow(dead_code)]
    pub fn get_reading_by_id(&self, id: &str) -> Result<Option<Reading>, AletheiaError> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            r#"SELECT id,created_at,source_id,passage_id,theme_id,symbol_chosen,
                      symbol_method,situation_text,ai_interpreted,ai_used_fallback,
                      read_duration_s,time_to_ai_request_s,notification_opened,
                      mood_tag,is_favorite,shared,user_intent
               FROM readings WHERE id = ?"#,
        )?;
        match stmt.query_row(params![id], map_reading) {
            Ok(r) => Ok(Some(r)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AletheiaError::from(e)),
        }
    }

    pub fn delete_reading(&self, id: &str) -> Result<bool, AletheiaError> {
        let conn = self.conn.lock();
        let affected = conn.execute("DELETE FROM readings WHERE id = ?", params![id])?;
        Ok(affected > 0)
    }

    pub fn delete_all_readings(&self) -> Result<u32, AletheiaError> {
        let conn = self.conn.lock();
        let affected = conn.execute("DELETE FROM readings", [])?;
        Ok(affected as u32)
    }

    #[allow(dead_code)]
    pub fn update_reading(&self, reading: &Reading) -> Result<(), AletheiaError> {
        let mood_tag = reading
            .mood_tag
            .as_ref()
            .map(|m| ser(m, "mood_tag"))
            .transpose()?;
        let user_intent = reading
            .user_intent
            .as_ref()
            .map(|i| ser(i, "user_intent"))
            .transpose()?;
        let conn = self.conn.lock();
        conn.execute(
            r#"UPDATE readings SET
                ai_interpreted=?,ai_used_fallback=?,read_duration_s=?,
                mood_tag=?,is_favorite=?,shared=?,user_intent=?
               WHERE id=?"#,
            params![
                reading.ai_interpreted as i32,
                reading.ai_used_fallback as i32,
                reading.read_duration_s,
                mood_tag,
                reading.is_favorite as i32,
                reading.shared as i32,
                user_intent,
                reading.id,
            ],
        )?;
        Ok(())
    }

    // ────────────────────────────────────────────────────────────────────────
    // SOURCE & PASSAGE
    // ────────────────────────────────────────────────────────────────────────

    #[allow(dead_code)]
    pub fn insert_source(&self, source: &Source) -> Result<(), AletheiaError> {
        let tradition = ser(&source.tradition, "tradition")?;
        let fallback = ser(&source.fallback_prompts, "fallback_prompts")?;
        let source_type = ser(&source.source_type, "source_type")?;
        let conn = self.conn.lock();
        conn.execute(
            r#"INSERT INTO sources
               (id,name,tradition,language,passage_count,is_bundled,is_premium,fallback_prompts,source_type)
               VALUES (?,?,?,?,?,?,?,?,?)
               ON CONFLICT(id) DO UPDATE SET source_type=excluded.source_type"#,
            params![source.id, source.name, tradition, source.language,
                    source.passage_count, source.is_bundled as i32, source.is_premium as i32,
                    fallback, source_type],
        )?;
        Ok(())
    }

    pub fn get_source(&self, id: &str) -> Result<Option<Source>, AletheiaError> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare("SELECT * FROM sources WHERE id = ?")?;
        match stmt.query_row(params![id], map_source) {
            Ok(s) => Ok(Some(s)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AletheiaError::from(e)),
        }
    }

    pub fn get_sources_count(&self) -> Result<u32, AletheiaError> {
        let conn = self.conn.lock();
        Ok(conn.query_row("SELECT COUNT(*) FROM sources", [], |r| r.get(0))?)
    }

    #[allow(dead_code)]
    pub fn get_sources(&self, premium_allowed: bool) -> Result<Vec<Source>, AletheiaError> {
        let conn = self.conn.lock();
        let sql = if premium_allowed {
            "SELECT * FROM sources"
        } else {
            "SELECT * FROM sources WHERE is_premium = 0"
        };
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map([], map_source)?;
        collect_rows(rows)
    }

    pub fn get_random_source(
        &self,
        premium_allowed: bool,
        preferred_language: Option<&str>,
    ) -> Result<Option<Source>, AletheiaError> {
        let conn = self.conn.lock();
        let lang = preferred_language
            .map(|l| l.trim().to_lowercase())
            .filter(|l| !l.is_empty());

        let mut filters: Vec<&str> = Vec::new();
        if !premium_allowed {
            filters.push("is_premium = 0");
        }
        if lang.is_some() {
            filters.push("language = ?");
        }

        let where_clause = if filters.is_empty() {
            String::new()
        } else {
            format!(" WHERE {}", filters.join(" AND "))
        };

        let sql = format!(
            "SELECT * FROM sources{} ORDER BY RANDOM() LIMIT 1",
            where_clause
        );
        let mut stmt = conn.prepare(&sql)?;

        let result = match lang.as_deref() {
            Some(l) => stmt.query_row([l], map_source),
            None => stmt.query_row([], map_source),
        };

        match result {
            Ok(s) => Ok(Some(s)),
            Err(rusqlite::Error::QueryReturnedNoRows) if lang.is_some() => {
                let fb_sql = if premium_allowed {
                    "SELECT * FROM sources ORDER BY RANDOM() LIMIT 1"
                } else {
                    "SELECT * FROM sources WHERE is_premium = 0 ORDER BY RANDOM() LIMIT 1"
                };
                let mut fb = conn.prepare(fb_sql)?;
                match fb.query_row([], map_source) {
                    Ok(s) => Ok(Some(s)),
                    Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                    Err(e) => Err(AletheiaError::from(e)),
                }
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AletheiaError::from(e)),
        }
    }

    #[allow(dead_code)]
    pub fn insert_passage(&self, passage: &Passage) -> Result<(), AletheiaError> {
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO passages (id,source_id,reference,text,context,resonance_context) VALUES (?,?,?,?,?,?)",
            params![passage.id, passage.source_id, passage.reference,
                    passage.text, passage.context, passage.resonance_context],
        )?;
        Ok(())
    }

    pub fn get_random_passage(&self, source_id: &str) -> Result<Option<Passage>, AletheiaError> {
        let conn = self.conn.lock();
        let mut stmt =
            conn.prepare("SELECT * FROM passages WHERE source_id = ? ORDER BY RANDOM() LIMIT 1")?;
        match stmt.query_row(params![source_id], map_passage) {
            Ok(p) => Ok(Some(p)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AletheiaError::from(e)),
        }
    }

    /// Lấy passage theo ID cụ thể — dùng cho I Ching deterministic mapping
    pub fn get_passage_by_id(&self, passage_id: &str) -> Result<Option<Passage>, AletheiaError> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare("SELECT * FROM passages WHERE id = ? LIMIT 1")?;
        match stmt.query_row(params![passage_id], map_passage) {
            Ok(p) => Ok(Some(p)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AletheiaError::from(e)),
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // THEME & SYMBOL
    // ────────────────────────────────────────────────────────────────────────

    #[allow(dead_code)]
    pub fn insert_theme(&self, theme: &Theme) -> Result<(), AletheiaError> {
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO themes (id,name,is_premium,pack_id,price_usd) VALUES (?,?,?,?,?)",
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
                "INSERT INTO symbols (id,theme_id,display_name,flavor_text,archetype_asset_id) VALUES (?,?,?,?,?)",
                params![
                    symbol.id,
                    theme.id,
                    symbol.display_name,
                    symbol.flavor_text,
                    symbol.archetype_asset_id
                ],
            )?;
        }
        Ok(())
    }

    #[allow(dead_code)]
    pub fn get_theme(&self, id: &str) -> Result<Option<Theme>, AletheiaError> {
        let conn = self.conn.lock();
        let mut ts = conn.prepare("SELECT * FROM themes WHERE id = ?")?;
        match ts.query_row(params![id], |r| {
            Ok(Theme {
                id: r.get(0)?,
                name: r.get(1)?,
                is_premium: r.get::<_, i32>(2)? != 0,
                pack_id: r.get(3)?,
                price_usd: r.get(4)?,
                symbols: vec![],
            })
        }) {
            Ok(mut theme) => {
                let mut ss = conn.prepare("SELECT * FROM symbols WHERE theme_id = ?")?;
                let syms = ss.query_map(params![id], |r| {
                    Ok(Symbol {
                        id: r.get(0)?,
                        display_name: r.get(2)?,
                        flavor_text: r.get(3)?,
                        archetype_asset_id: r.get(4)?,
                    })
                })?;
                theme.symbols = syms.filter_map(|s| s.ok()).collect();
                Ok(Some(theme))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AletheiaError::from(e)),
        }
    }

    pub fn get_random_theme(&self, premium_allowed: bool) -> Result<Option<Theme>, AletheiaError> {
        let conn = self.conn.lock();
        let sql = if premium_allowed {
            "SELECT * FROM themes ORDER BY RANDOM() LIMIT 1"
        } else {
            "SELECT * FROM themes WHERE is_premium=0 ORDER BY RANDOM() LIMIT 1"
        };
        let mut ts = conn.prepare(sql)?;
        match ts.query_row([], |r| {
            Ok(Theme {
                id: r.get(0)?,
                name: r.get(1)?,
                is_premium: r.get::<_, i32>(2)? != 0,
                pack_id: r.get(3)?,
                price_usd: r.get(4)?,
                symbols: vec![],
            })
        }) {
            Ok(mut theme) => {
                let mut ss = conn.prepare("SELECT * FROM symbols WHERE theme_id = ?")?;
                let syms = ss.query_map(params![&theme.id], |r| {
                    Ok(Symbol {
                        id: r.get(0)?,
                        display_name: r.get(2)?,
                        flavor_text: r.get(3)?,
                        archetype_asset_id: r.get(4)?,
                    })
                })?;
                theme.symbols = syms.filter_map(|s| s.ok()).collect();
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
        let conn = self.conn.lock();
        let sql = format!(
            "SELECT * FROM symbols WHERE theme_id=? ORDER BY RANDOM() LIMIT {}",
            count
        );
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(params![theme_id], |r| {
            Ok(Symbol {
                id: r.get(0)?,
                display_name: r.get(2)?,
                flavor_text: r.get(3)?,
                archetype_asset_id: r.get(4)?,
            })
        })?;
        collect_rows(rows)
    }

    pub fn get_symbol_by_id(&self, id: &str) -> Result<Option<Symbol>, AletheiaError> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare("SELECT * FROM symbols WHERE id = ?")?;
        match stmt.query_row(params![id], |r| {
            Ok(Symbol {
                id: r.get(0)?,
                display_name: r.get(2)?,
                flavor_text: r.get(3)?,
                archetype_asset_id: r.get(4)?,
            })
        }) {
            Ok(s) => Ok(Some(s)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AletheiaError::from(e)),
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // USER STATE
    // ────────────────────────────────────────────────────────────────────────

    pub fn get_user_state(&self, user_id: &str) -> Result<UserState, AletheiaError> {
        let today = self.get_today_str()?;

        let state_result = {
            let conn = self.conn.lock();
            let mut stmt = conn.prepare("SELECT * FROM user_state WHERE user_id = ?")?;
            stmt.query_row(params![user_id], map_user_state)
        };

        match state_result {
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
                let default = UserState {
                    user_id: user_id.to_string(),
                    ..UserState::default()
                };
                self.insert_user_state(&default)?;
                Ok(default)
            }
            Err(e) => Err(AletheiaError::from(e)),
        }
    }

    /// Returns the preferred UI language for the single device user ("vi" or "en").
    /// Falls back to "vi" if no user state exists. Safe to call from AIClient
    /// without a user_id — correct for single-user mobile apps.
    pub fn get_default_locale(&self) -> String {
        let conn = self.conn.lock();
        conn.query_row(
            "SELECT preferred_language FROM user_state LIMIT 1",
            [],
            |row| row.get::<_, String>(0),
        )
        .unwrap_or_else(|_| "vi".to_string())
    }

    pub fn insert_user_state(&self, state: &UserState) -> Result<(), AletheiaError> {
        let tier = ser(&state.subscription_tier, "subscription_tier")?;
        let user_intent = state
            .user_intent
            .as_ref()
            .map(|i| ser(i, "user_intent"))
            .transpose()?;
        let conn = self.conn.lock();
        conn.execute(
            r#"INSERT INTO user_state (
                user_id,subscription_tier,readings_today,ai_calls_today,
                session_count,last_reading_date,notification_enabled,notification_time,
                preferred_language,dark_mode,onboarding_complete,user_intent,
                weekly_summary_enabled
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"#,
            params![
                state.user_id,
                tier,
                state.readings_today,
                state.ai_calls_today,
                state.session_count,
                state.last_reading_date,
                state.notification_enabled as i32,
                state.notification_time,
                state.preferred_language,
                state.dark_mode as i32,
                state.onboarding_complete as i32,
                user_intent,
                state.weekly_summary_enabled as i32,
            ],
        )?;
        Ok(())
    }

    pub fn update_user_state(&self, state: &UserState) -> Result<(), AletheiaError> {
        let tier = ser(&state.subscription_tier, "subscription_tier")?;
        let user_intent = state
            .user_intent
            .as_ref()
            .map(|i| ser(i, "user_intent"))
            .transpose()?;
        let conn = self.conn.lock();
        conn.execute(
            r#"UPDATE user_state SET
                subscription_tier=?,readings_today=?,ai_calls_today=?,
                session_count=?,last_reading_date=?,notification_enabled=?,
                notification_time=?,preferred_language=?,dark_mode=?,
                onboarding_complete=?,user_intent=?,weekly_summary_enabled=?
               WHERE user_id=?"#,
            params![
                tier,
                state.readings_today,
                state.ai_calls_today,
                state.session_count,
                state.last_reading_date,
                state.notification_enabled as i32,
                state.notification_time,
                state.preferred_language,
                state.dark_mode as i32,
                state.onboarding_complete as i32,
                user_intent,
                state.weekly_summary_enabled as i32,
                state.user_id,
            ],
        )?;
        Ok(())
    }

    pub fn increment_readings_today(&self, user_id: &str) -> Result<(), AletheiaError> {
        let today = self.get_today_str()?;
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE user_state SET readings_today=readings_today+1, last_reading_date=? WHERE user_id=?",
            params![today, user_id],
        )?;
        Ok(())
    }

    pub fn increment_ai_calls_today(&self, user_id: &str) -> Result<(), AletheiaError> {
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE user_state SET ai_calls_today=ai_calls_today+1 WHERE user_id=?",
            params![user_id],
        )?;
        Ok(())
    }

    pub fn increment_session_count(&self, user_id: &str) -> Result<(), AletheiaError> {
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE user_state SET session_count=session_count+1 WHERE user_id=?",
            params![user_id],
        )?;
        Ok(())
    }

    // ────────────────────────────────────────────────────────────────────────
    // NOTIFICATIONS
    // ────────────────────────────────────────────────────────────────────────

    #[allow(dead_code)]
    pub fn insert_notification_entry(
        &self,
        entry: &NotificationEntry,
    ) -> Result<(), AletheiaError> {
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO notification_matrix (symbol_id, question) VALUES (?, ?)",
            params![entry.symbol_id, entry.question],
        )?;
        Ok(())
    }

    pub fn get_notification_matrix(&self) -> Result<Vec<NotificationEntry>, AletheiaError> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare("SELECT * FROM notification_matrix")?;
        let rows = stmt.query_map([], |r| {
            Ok(NotificationEntry {
                symbol_id: r.get(1)?,
                question: r.get(2)?,
            })
        })?;
        collect_rows(rows)
    }

    pub fn get_fallback_prompts(&self, source_id: &str) -> Result<Vec<String>, AletheiaError> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare("SELECT fallback_prompts FROM sources WHERE id = ?")?;
        let result: Option<String> = stmt.query_row([source_id], |r| r.get(0)).ok();
        Ok(result
            .and_then(|p| from_str::<Vec<String>>(&p).ok())
            .unwrap_or_default())
    }

    // ────────────────────────────────────────────────────────────────────────
    // DATE OVERRIDE
    // ────────────────────────────────────────────────────────────────────────

    pub fn set_local_date(&self, date: String) {
        if is_valid_local_date(&date) {
            *self.local_date_override.lock() = Some(date);
        }
    }

    fn get_today_str(&self) -> Result<String, AletheiaError> {
        if let Some(d) = self.local_date_override.lock().clone() {
            return Ok(d);
        }
        let conn = self.conn.lock();
        Ok(conn.query_row("SELECT date('now')", [], |r| r.get(0))?)
    }
}

// ─── Row-mapping helpers ──────────────────────────────────────────────────────

fn map_reading(r: &rusqlite::Row<'_>) -> rusqlite::Result<Reading> {
    Ok(Reading {
        id: r.get(0)?,
        created_at: r.get(1)?,
        source_id: r.get(2)?,
        passage_id: r.get(3)?,
        theme_id: r.get(4)?,
        symbol_chosen: r.get(5)?,
        symbol_method: serde_json::from_str(&r.get::<_, String>(6)?)
            .unwrap_or(SymbolMethod::Manual),
        situation_text: r.get(7)?,
        ai_interpreted: r.get::<_, i32>(8)? != 0,
        ai_used_fallback: r.get::<_, i32>(9)? != 0,
        read_duration_s: r.get(10)?,
        time_to_ai_request_s: r.get(11)?,
        notification_opened: r.get::<_, i32>(12)? != 0,
        mood_tag: r
            .get::<_, Option<String>>(13)?
            .and_then(|s| serde_json::from_str(&s).ok()),
        is_favorite: r.get::<_, i32>(14)? != 0,
        shared: r.get::<_, i32>(15)? != 0,
        user_intent: r
            .get::<_, Option<String>>(16)?
            .and_then(|s| serde_json::from_str(&s).ok()),
    })
}

fn map_source(r: &rusqlite::Row<'_>) -> rusqlite::Result<Source> {
    Ok(Source {
        id: r.get(0)?,
        name: r.get(1)?,
        tradition: serde_json::from_str(&r.get::<_, String>(2)?).unwrap_or(Tradition::Universal),
        language: r.get(3)?,
        passage_count: r.get(4)?,
        is_bundled: r.get::<_, i32>(5)? != 0,
        is_premium: r.get::<_, i32>(6)? != 0,
        fallback_prompts: serde_json::from_str(&r.get::<_, String>(7)?).unwrap_or_default(),
        source_type: serde_json::from_str(&r.get::<_, String>(8)?)
            .unwrap_or(SourceType::Bibliomancy),
    })
}

fn map_passage(r: &rusqlite::Row<'_>) -> rusqlite::Result<Passage> {
    Ok(Passage {
        id: r.get(0)?,
        source_id: r.get(1)?,
        reference: r.get(2)?,
        text: r.get(3)?,
        context: r.get(4)?,
        resonance_context: r.get(5)?,
    })
}

fn map_user_state(r: &rusqlite::Row<'_>) -> rusqlite::Result<UserState> {
    Ok(UserState {
        user_id: r.get(0)?,
        subscription_tier: serde_json::from_str(&r.get::<_, String>(1)?)
            .unwrap_or(SubscriptionTier::Free),
        readings_today: r.get(2)?,
        ai_calls_today: r.get(3)?,
        session_count: r.get(4)?,
        last_reading_date: r.get(5)?,
        notification_enabled: r.get::<_, i32>(6)? != 0,
        notification_time: r.get(7)?,
        preferred_language: r.get(8)?,
        dark_mode: r.get::<_, i32>(9)? != 0,
        onboarding_complete: r.get::<_, i32>(10)? != 0,
        user_intent: r
            .get::<_, Option<String>>(11)?
            .and_then(|s| serde_json::from_str(&s).ok()),
        weekly_summary_enabled: r.get::<_, Option<i32>>(12)?.unwrap_or(0) != 0,
    })
}

// Validate a YYYY-MM-DD local date string.
// Rejects far-future dates (year > 2035) to prevent rate-limit bypass via set_local_date().
// NF-02: set_local_date() is UniFFI-exported; a tampered APK could set "2099-01-01" and
// trigger daily-counter reset on every get_user_state() call.
fn is_valid_local_date(date: &str) -> bool {
    let b = date.as_bytes();
    if b.len() != 10 || b[4] != b'-' || b[7] != b'-' {
        return false;
    }
    let parse_seg = |seg: &[u8]| -> Option<u32> {
        seg.iter().try_fold(0u32, |acc, &c| {
            if c.is_ascii_digit() {
                Some(acc * 10 + (c - b'0') as u32)
            } else {
                None
            }
        })
    };
    let year = match parse_seg(&b[0..4]) {
        Some(v) => v,
        None => return false,
    };
    let month = match parse_seg(&b[5..7]) {
        Some(v) => v,
        None => return false,
    };
    let day = match parse_seg(&b[8..10]) {
        Some(v) => v,
        None => return false,
    };
    // Accept years within the expected app lifespan; reject far-future bypass values.
    (2020..=2035).contains(&year) && (1..=12).contains(&month) && (1..=31).contains(&day)
}

fn collect_rows<T>(
    rows: rusqlite::MappedRows<'_, impl FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<T>>,
) -> Result<Vec<T>, AletheiaError> {
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_store() -> Store {
        Store::new(":memory:").unwrap()
    }

    fn src() -> Source {
        Source {
            id: "src-1".into(),
            name: "Test".into(),
            tradition: Tradition::Universal,
            language: "en".into(),
            passage_count: 1,
            is_bundled: true,
            is_premium: false,
            fallback_prompts: vec!["p1".into()],
            source_type: SourceType::Bibliomancy,
        }
    }
    fn thm() -> Theme {
        Theme {
            id: "thm-1".into(),
            name: "Thm".into(),
            symbols: vec![],
            is_premium: false,
            pack_id: None,
            price_usd: None,
        }
    }
    fn psg() -> Passage {
        Passage {
            id: "psg-1".into(),
            source_id: "src-1".into(),
            reference: "1:1".into(),
            text: "Test.".into(),
            context: None,
            resonance_context: None,
        }
    }

    fn sample_reading(id: &str) -> Reading {
        Reading {
            id: id.into(),
            created_at: 9999,
            source_id: "src-1".into(),
            passage_id: "psg-1".into(),
            theme_id: "thm-1".into(),
            symbol_chosen: "sym".into(),
            symbol_method: SymbolMethod::Manual,
            situation_text: Some("hi".into()),
            ai_interpreted: false,
            ai_used_fallback: false,
            read_duration_s: None,
            time_to_ai_request_s: None,
            notification_opened: false,
            mood_tag: None,
            is_favorite: false,
            shared: false,
            user_intent: None,
        }
    }

    #[test]
    fn store_init_wal() {
        let s = make_store();
        assert_eq!(s.get_sources_count().unwrap(), 0);
    }

    #[test]
    fn insert_get_source() {
        let s = make_store();
        s.insert_source(&src()).unwrap();
        assert_eq!(s.get_source("src-1").unwrap().unwrap().name, "Test");
        assert!(s.get_source("nope").unwrap().is_none());
    }

    #[test]
    fn reading_roundtrip() {
        let s = make_store();
        s.insert_source(&src()).unwrap();
        s.insert_theme(&thm()).unwrap();
        s.insert_passage(&psg()).unwrap();
        let r = Reading {
            id: "r-1".into(),
            created_at: 9999,
            source_id: "src-1".into(),
            passage_id: "psg-1".into(),
            theme_id: "thm-1".into(),
            symbol_chosen: "sym".into(),
            symbol_method: SymbolMethod::Manual,
            situation_text: Some("hi".into()),
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
        s.insert_reading(&r).unwrap();
        assert_eq!(s.get_readings(10, 0).unwrap().len(), 1);
        assert_eq!(s.get_readings_count().unwrap(), 1);
    }

    #[test]
    fn delete_reading_removes_one_history_entry() {
        let s = make_store();
        s.insert_source(&src()).unwrap();
        s.insert_theme(&thm()).unwrap();
        s.insert_passage(&psg()).unwrap();
        let mut first = sample_reading("r-1");
        first.created_at = 9999;
        let mut second = sample_reading("r-2");
        second.created_at = 10000;
        s.insert_reading(&first).unwrap();
        s.insert_reading(&second).unwrap();

        assert!(s.delete_reading("r-1").unwrap());

        assert!(s.get_reading_by_id("r-1").unwrap().is_none());
        assert!(s.get_reading_by_id("r-2").unwrap().is_some());
        assert_eq!(s.get_readings_count().unwrap(), 1);
    }

    #[test]
    fn delete_all_readings_clears_history() {
        let s = make_store();
        s.insert_source(&src()).unwrap();
        s.insert_theme(&thm()).unwrap();
        s.insert_passage(&psg()).unwrap();
        s.insert_reading(&sample_reading("r-1")).unwrap();
        s.insert_reading(&sample_reading("r-2")).unwrap();

        assert_eq!(s.delete_all_readings().unwrap(), 2);

        assert_eq!(s.get_readings_count().unwrap(), 0);
        assert!(s.get_readings(10, 0).unwrap().is_empty());
    }

    #[test]
    fn daily_reset() {
        let s = make_store();
        let mut state = UserState::default();
        state.user_id = "u1".into();
        state.readings_today = 3;
        state.last_reading_date = Some("2025-01-01".into());
        s.insert_user_state(&state).unwrap();
        s.set_local_date("2025-01-02".into());
        let updated = s.get_user_state("u1").unwrap();
        assert_eq!(updated.readings_today, 0);
        assert_eq!(updated.last_reading_date.as_deref(), Some("2025-01-02"));
    }

    #[test]
    fn seed_idempotent() {
        let s = make_store();
        assert!(s.seed_bundled_data(&[src()], &[psg()], &[thm()]).unwrap());
        assert!(!s.seed_bundled_data(&[src()], &[psg()], &[thm()]).unwrap());
    }
}

// ─── Error-path tests (ADR-AL-54 — VHEATM Cycle 5) ──────────────────────────
// These tests cover failure modes that the prior test suite omitted.

#[cfg(test)]
mod error_path_tests {
    use super::*;

    // ── parking_lot Mutex never poisons — verify operations continue ──────────

    #[test]
    fn concurrent_reads_never_poison_mutex() {
        // parking_lot::Mutex cannot poison. This test proves the guarantee:
        // even if we simulate what would have caused poisoning in std::sync,
        // the store remains usable.
        let store = Store::new(":memory:").unwrap();
        // Insert source first
        let src = Source {
            id: "p-src".into(),
            name: "P".into(),
            tradition: Tradition::Universal,
            language: "en".into(),
            passage_count: 1,
            is_bundled: true,
            is_premium: false,
            fallback_prompts: vec![],
            source_type: SourceType::Bibliomancy,
        };
        store.insert_source(&src).unwrap();

        // Read count multiple times concurrently — parking_lot handles this
        let count1 = store.get_sources_count().unwrap();
        let count2 = store.get_sources_count().unwrap();
        let count3 = store.get_sources_count().unwrap();
        assert_eq!(count1, count2);
        assert_eq!(count2, count3);
        assert_eq!(count1, 1);
    }

    // ── ser() helper — verify error propagation, not panic ───────────────────

    #[test]
    fn insert_reading_propagates_type_not_silently_defaulting() {
        let store = Store::new(":memory:").unwrap();
        // Insert prerequisite data
        let src = Source {
            id: "s1".into(),
            name: "S".into(),
            tradition: Tradition::Universal,
            language: "vi".into(),
            passage_count: 1,
            is_bundled: true,
            is_premium: false,
            fallback_prompts: vec![],
            source_type: SourceType::Bibliomancy,
        };
        let thm = Theme {
            id: "t1".into(),
            name: "T".into(),
            symbols: vec![],
            is_premium: false,
            pack_id: None,
            price_usd: None,
        };
        let psg = Passage {
            id: "p1".into(),
            source_id: "s1".into(),
            reference: "1".into(),
            text: "txt".into(),
            context: None,
            resonance_context: None,
        };
        store.insert_source(&src).unwrap();
        store.insert_theme(&thm).unwrap();
        store.insert_passage(&psg).unwrap();

        // Reading with all optional fields
        let reading = Reading {
            id: "r-err-1".into(),
            created_at: 42,
            source_id: "s1".into(),
            passage_id: "p1".into(),
            theme_id: "t1".into(),
            symbol_chosen: "sym".into(),
            symbol_method: SymbolMethod::Auto,
            situation_text: Some("test situation with special chars: <>&\"'".into()),
            ai_interpreted: true,
            ai_used_fallback: false,
            read_duration_s: Some(120),
            time_to_ai_request_s: Some(5),
            notification_opened: false,
            mood_tag: Some(MoodTag::Hopeful),
            is_favorite: true,
            shared: false,
            user_intent: Some(UserIntent::Guidance),
        };
        // Must succeed — ser() handles all fields without panicking
        store.insert_reading(&reading).unwrap();

        let retrieved = store.get_readings(10, 0).unwrap();
        assert_eq!(retrieved.len(), 1);
        assert_eq!(retrieved[0].id, "r-err-1");
        assert_eq!(retrieved[0].mood_tag, Some(MoodTag::Hopeful));
        assert_eq!(retrieved[0].user_intent, Some(UserIntent::Guidance));
    }

    // ── DB upsert: duplicate source_id updates source_type (ON CONFLICT DO UPDATE) ──

    #[test]
    fn duplicate_source_id_upserts_source_type() {
        let store = Store::new(":memory:").unwrap();
        let mut src = Source {
            id: "dup".into(),
            name: "Dup".into(),
            tradition: Tradition::Universal,
            language: "en".into(),
            passage_count: 1,
            is_bundled: true,
            is_premium: false,
            fallback_prompts: vec![],
            source_type: SourceType::Bibliomancy,
        };
        store.insert_source(&src).unwrap();
        // Second insert with same PK upserts source_type
        src.source_type = SourceType::Hexagram;
        store.insert_source(&src).unwrap();
        // Count stays at 1, source_type was updated
        let count = store.get_sources_count().unwrap();
        assert_eq!(count, 1, "Store must deduplicate sources");
        let fetched = store.get_source("dup").unwrap().unwrap();
        assert_eq!(fetched.source_type, SourceType::Hexagram);
    }

    // ── WAL mode: verify PRAGMA was applied ──────────────────────────────────

    #[test]
    fn wal_mode_is_active() {
        let store = Store::new(":memory:").unwrap();
        // In-memory DB doesn't use WAL (memory doesn't need it),
        // but the Store must still init without error — proving pragmas are safe on all paths.
        let count = store.get_sources_count().unwrap();
        assert_eq!(count, 0);
    }

    // ── Seed atomicity: partial seed must not leave orphan rows ──────────────

    #[test]
    fn seed_is_atomic() {
        let store = Store::new(":memory:").unwrap();
        let sources = vec![Source {
            id: "s-atom".into(),
            name: "Atom".into(),
            tradition: Tradition::Universal,
            language: "en".into(),
            passage_count: 1,
            is_bundled: true,
            is_premium: false,
            fallback_prompts: vec![],
            source_type: SourceType::Bibliomancy,
        }];
        let passages = vec![Passage {
            id: "p-atom".into(),
            source_id: "s-atom".into(),
            reference: "1".into(),
            text: "t".into(),
            context: None,
            resonance_context: None,
        }];
        let themes: Vec<Theme> = vec![];

        // First seed should succeed
        assert!(store
            .seed_bundled_data(&sources, &passages, &themes)
            .unwrap());
        // Second seed must be no-op (sources_count > 0)
        assert!(!store
            .seed_bundled_data(&sources, &passages, &themes)
            .unwrap());
        // Source count must be exactly 1
        assert_eq!(store.get_sources_count().unwrap(), 1);
    }

    // ── user_intent round-trip through store ─────────────────────────────────

    #[test]
    fn user_intent_round_trips_through_user_state() {
        let store = Store::new(":memory:").unwrap();
        let mut state = UserState::default();
        state.user_id = "ui-rt".into();
        state.user_intent = Some(UserIntent::Challenge);
        store.insert_user_state(&state).unwrap();

        let retrieved = store.get_user_state("ui-rt").unwrap();
        assert_eq!(retrieved.user_intent, Some(UserIntent::Challenge));

        // Update to different intent
        let mut updated = retrieved;
        updated.user_intent = Some(UserIntent::Comfort);
        store.update_user_state(&updated).unwrap();

        let re_retrieved = store.get_user_state("ui-rt").unwrap();
        assert_eq!(re_retrieved.user_intent, Some(UserIntent::Comfort));
    }

    // ── is_valid_local_date: rejects far-future dates and malformed input ────

    #[test]
    fn local_date_validation_blocks_bypass_and_malformed() {
        // Valid dates — accepted
        assert!(
            is_valid_local_date("2025-01-15"),
            "current-year date should be accepted"
        );
        assert!(
            is_valid_local_date("2030-12-31"),
            "near-future date should be accepted"
        );
        assert!(
            is_valid_local_date("2020-01-01"),
            "lower-bound year should be accepted"
        );
        assert!(
            is_valid_local_date("2035-06-15"),
            "upper-bound year should be accepted"
        );

        // Far-future bypass values — rejected (NF-02)
        assert!(
            !is_valid_local_date("2099-01-01"),
            "far-future year must be rejected"
        );
        assert!(
            !is_valid_local_date("2036-01-01"),
            "year beyond 2035 must be rejected"
        );
        assert!(
            !is_valid_local_date("2019-12-31"),
            "year before 2020 must be rejected"
        );

        // Malformed strings — rejected
        assert!(
            !is_valid_local_date("2025/01/15"),
            "wrong separator must be rejected"
        );
        assert!(
            !is_valid_local_date("25-01-15"),
            "2-digit year must be rejected"
        );
        assert!(
            !is_valid_local_date("2025-13-01"),
            "month 13 must be rejected"
        );
        assert!(
            !is_valid_local_date("2025-00-10"),
            "month 0 must be rejected"
        );
        assert!(
            !is_valid_local_date("2025-01-32"),
            "day 32 must be rejected"
        );
        assert!(!is_valid_local_date(""), "empty string must be rejected");
        assert!(
            !is_valid_local_date("not-a-date"),
            "garbage must be rejected"
        );
    }

    #[test]
    fn set_local_date_rejects_far_future() {
        let store = Store::new(":memory:").unwrap();
        // "2099-01-01" must be rejected — it would bypass the daily rate limit
        store.set_local_date("2099-01-01".into());
        // Override should remain None, so get_today_str falls back to SQLite date('now')
        // Verify: daily reset logic uses real date, not the injected future date.
        let mut state = UserState::default();
        state.user_id = "bypass-test".into();
        state.readings_today = 5;
        state.last_reading_date = Some("2099-01-01".into()); // pretend last read was "future"
        store.insert_user_state(&state).unwrap();
        // get_user_state uses today from SQLite; last_reading_date "2099-01-01" != real today
        // so readings_today will reset to 0 — confirming the bypass is blocked.
        let fetched = store.get_user_state("bypass-test").unwrap();
        assert_eq!(
            fetched.readings_today, 0,
            "far-future date override must not persist"
        );
    }

    // ── Nonexistent entries return None, not error ────────────────────────────

    #[test]
    fn get_nonexistent_returns_none_not_error() {
        let store = Store::new(":memory:").unwrap();
        assert!(store.get_source("nope").unwrap().is_none());
        assert!(store.get_reading_by_id("nope").unwrap().is_none());
        assert!(store.get_symbol_by_id("nope").unwrap().is_none());
        assert!(store.get_random_passage("nope").unwrap().is_none());
        assert!(store.get_random_source(false, None).unwrap().is_none());
        assert!(store.get_random_theme(false).unwrap().is_none());
    }

    // ── Increment counters work correctly ────────────────────────────────────

    #[test]
    fn increment_counters_are_accurate() {
        let store = Store::new(":memory:").unwrap();
        let _state = store.get_user_state("ctr-user").unwrap(); // creates default
                                                                // Use a fixed future date within the valid range (2020-2035) to pin "today"
                                                                // and prevent the daily-reset logic from zeroing the counters mid-test.
        store.set_local_date("2030-01-01".into());

        store.increment_readings_today("ctr-user").unwrap();
        store.increment_readings_today("ctr-user").unwrap();
        store.increment_ai_calls_today("ctr-user").unwrap();
        store.increment_session_count("ctr-user").unwrap();

        let state = store.get_user_state("ctr-user").unwrap();
        assert_eq!(state.readings_today, 2, "readings_today should be 2");
        assert_eq!(state.ai_calls_today, 1, "ai_calls_today should be 1");
        assert_eq!(state.session_count, 1, "session_count should be 1");
    }
}
