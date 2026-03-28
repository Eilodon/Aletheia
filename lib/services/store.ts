/**
 * Store Service - SQLite Database Operations
 * Handles all CRUD operations for Aletheia data
 */

import * as SQLite from "expo-sqlite";
import {
  Passage,
  Reading,
  Source,
  Symbol,
  Theme,
  UserState,
  SubscriptionTier,
  NotificationEntry,
  MoodTag,
  SymbolMethod,
} from "@/lib/types";

class StoreService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync("aletheia.db");
      await this.runMigrations();
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    // Migration 001: Create readings table
    await this.db.execAsync(`
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
        mood_tag TEXT,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        shared INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (source_id) REFERENCES sources(id),
        FOREIGN KEY (passage_id) REFERENCES passages(id),
        FOREIGN KEY (theme_id) REFERENCES themes(id)
      );
      CREATE INDEX IF NOT EXISTS idx_readings_created_at ON readings(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_readings_source_id ON readings(source_id);
    `);

    // Migration 002: Create sources, passages, themes, symbols tables
    await this.db.execAsync(`
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
        question TEXT NOT NULL,
        FOREIGN KEY (symbol_id) REFERENCES symbols(id)
      );
    `);

    // Migration 003: Create user_state table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_state (
        user_id TEXT PRIMARY KEY,
        subscription_tier TEXT NOT NULL DEFAULT 'free',
        readings_today INTEGER NOT NULL DEFAULT 0,
        ai_calls_today INTEGER NOT NULL DEFAULT 0,
        last_reading_date TEXT,
        notification_enabled INTEGER NOT NULL DEFAULT 1,
        notification_time TEXT DEFAULT '09:00',
        preferred_language TEXT DEFAULT 'vi',
        dark_mode INTEGER NOT NULL DEFAULT 0
      );
    `);
  }

  // ========================================================================
  // READING OPERATIONS
  // ========================================================================

  async insertReading(reading: Reading): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `INSERT INTO readings (
        id, created_at, source_id, passage_id, theme_id, symbol_chosen,
        symbol_method, situation_text, ai_interpreted, ai_used_fallback,
        read_duration_s, mood_tag, is_favorite, shared
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reading.id,
        reading.created_at,
        reading.source_id,
        reading.passage_id,
        reading.theme_id,
        reading.symbol_chosen,
        reading.symbol_method,
        reading.situation_text || null,
        reading.ai_interpreted ? 1 : 0,
        reading.ai_used_fallback ? 1 : 0,
        reading.read_duration_s || null,
        reading.mood_tag || null,
        reading.is_favorite ? 1 : 0,
        reading.shared ? 1 : 0,
      ]
    );
  }

  async getReadings(limit: number = 100, offset: number = 0): Promise<Reading[]> {
    if (!this.db) throw new Error("Database not initialized");

    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM readings ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return rows.map((row: Record<string, any>) => this.mapRowToReading(row));
  }

  async getReadingById(id: string): Promise<Reading | null> {
    if (!this.db) throw new Error("Database not initialized");

    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM readings WHERE id = ?`,
      [id]
    );

    return row ? this.mapRowToReading(row) : null;
  }

  async updateReading(reading: Reading): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `UPDATE readings SET
        ai_interpreted = ?, ai_used_fallback = ?, read_duration_s = ?,
        mood_tag = ?, is_favorite = ?, shared = ?
      WHERE id = ?`,
      [
        reading.ai_interpreted ? 1 : 0,
        reading.ai_used_fallback ? 1 : 0,
        reading.read_duration_s || null,
        reading.mood_tag || null,
        reading.is_favorite ? 1 : 0,
        reading.shared ? 1 : 0,
        reading.id,
      ]
    );
  }

  async deleteReading(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(`DELETE FROM readings WHERE id = ?`, [id]);
  }

  // ========================================================================
  // SOURCE & PASSAGE OPERATIONS
  // ========================================================================

  async insertSource(source: Source): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `INSERT INTO sources (
        id, name, tradition, language, passage_count, is_bundled, is_premium, fallback_prompts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        source.id,
        source.name,
        source.tradition,
        source.language,
        source.passage_count,
        source.is_bundled ? 1 : 0,
        source.is_premium ? 1 : 0,
        JSON.stringify(source.fallback_prompts),
      ]
    );
  }

  async getSource(id: string): Promise<Source | null> {
    if (!this.db) throw new Error("Database not initialized");

    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM sources WHERE id = ?`,
      [id]
    );

    return row ? this.mapRowToSource(row) : null;
  }

  async getSources(premiumAllowed: boolean = false): Promise<Source[]> {
    if (!this.db) throw new Error("Database not initialized");

    const query = premiumAllowed
      ? `SELECT * FROM sources`
      : `SELECT * FROM sources WHERE is_premium = 0`;

    const rows = await this.db.getAllAsync<any>(query);
    return rows.map((row: Record<string, any>) => this.mapRowToSource(row));
  }

  async getRandomSource(premiumAllowed: boolean = false): Promise<Source | null> {
    if (!this.db) throw new Error("Database not initialized");

    const query = premiumAllowed
      ? `SELECT * FROM sources ORDER BY RANDOM() LIMIT 1`
      : `SELECT * FROM sources WHERE is_premium = 0 ORDER BY RANDOM() LIMIT 1`;

    const row = await this.db.getFirstAsync<any>(query);
    return row ? this.mapRowToSource(row) : null;
  }

  async insertPassage(passage: Passage): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `INSERT INTO passages (id, source_id, reference, text, context)
       VALUES (?, ?, ?, ?, ?)`,
      [passage.id, passage.source_id, passage.reference, passage.text, passage.context || null]
    );
  }

  async getRandomPassage(sourceId: string): Promise<Passage | null> {
    if (!this.db) throw new Error("Database not initialized");

    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM passages WHERE source_id = ? ORDER BY RANDOM() LIMIT 1`,
      [sourceId]
    );

    return row ? this.mapRowToPassage(row) : null;
  }

  // ========================================================================
  // THEME & SYMBOL OPERATIONS
  // ========================================================================

  async insertTheme(theme: Theme): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `INSERT INTO themes (id, name, is_premium, pack_id, price_usd)
       VALUES (?, ?, ?, ?, ?)`,
      [theme.id, theme.name, theme.is_premium ? 1 : 0, theme.pack_id || null, theme.price_usd || null]
    );

    // Insert symbols
    for (const symbol of theme.symbols) {
      await this.insertSymbol(theme.id, symbol);
    }
  }

  async insertSymbol(themeId: string, symbol: Symbol): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `INSERT INTO symbols (id, theme_id, display_name, flavor_text)
       VALUES (?, ?, ?, ?)`,
      [symbol.id, themeId, symbol.display_name, symbol.flavor_text || null]
    );
  }

  async getTheme(id: string): Promise<Theme | null> {
    if (!this.db) throw new Error("Database not initialized");

    const themeRow = await this.db.getFirstAsync<any>(
      `SELECT * FROM themes WHERE id = ?`,
      [id]
    );

    if (!themeRow) return null;

    const symbolRows = await this.db.getAllAsync<any>(
      `SELECT * FROM symbols WHERE theme_id = ?`,
      [id]
    );

    return {
      id: themeRow.id,
      name: themeRow.name,
      is_premium: themeRow.is_premium === 1,
      pack_id: themeRow.pack_id,
      price_usd: themeRow.price_usd,
      symbols: symbolRows.map((row: Record<string, any>) => ({
        id: row.id,
        display_name: row.display_name,
        flavor_text: row.flavor_text,
      })),
    };
  }

  async getRandomTheme(premiumAllowed: boolean = false): Promise<Theme | null> {
    if (!this.db) throw new Error("Database not initialized");

    const query = premiumAllowed
      ? `SELECT * FROM themes ORDER BY RANDOM() LIMIT 1`
      : `SELECT * FROM themes WHERE is_premium = 0 ORDER BY RANDOM() LIMIT 1`;

    const themeRow = await this.db.getFirstAsync<any>(query);

    if (!themeRow) return null;

    const symbolRows = await this.db.getAllAsync<any>(
      `SELECT * FROM symbols WHERE theme_id = ?`,
      [themeRow.id]
    );

    return {
      id: themeRow.id,
      name: themeRow.name,
      is_premium: themeRow.is_premium === 1,
      pack_id: themeRow.pack_id,
      price_usd: themeRow.price_usd,
      symbols: symbolRows.map((row: Record<string, any>) => ({
        id: row.id,
        display_name: row.display_name,
        flavor_text: row.flavor_text,
      })),
    };
  }

  async getRandomSymbols(themeId: string, count: number = 3): Promise<Symbol[]> {
    if (!this.db) throw new Error("Database not initialized");

    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM symbols WHERE theme_id = ? ORDER BY RANDOM() LIMIT ?`,
      [themeId, count]
    );

    return rows.map((row: Record<string, any>) => ({
      id: row.id,
      display_name: row.display_name,
      flavor_text: row.flavor_text,
    }));
  }

  async getSymbolById(id: string): Promise<Symbol | null> {
    if (!this.db) throw new Error("Database not initialized");

    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM symbols WHERE id = ?`,
      [id]
    );

    return row ? {
      id: row.id,
      display_name: row.display_name,
      flavor_text: row.flavor_text,
    } : null;
  }

  // ========================================================================
  // USER STATE OPERATIONS
  // ========================================================================

  async getUserState(userId: string): Promise<UserState> {
    if (!this.db) throw new Error("Database not initialized");

    let row = await this.db.getFirstAsync<any>(
      `SELECT * FROM user_state WHERE user_id = ?`,
      [userId]
    );

    if (!row) {
      // Create default user state
      const defaultState: UserState = {
        user_id: userId,
        subscription_tier: SubscriptionTier.Free,
        readings_today: 0,
        ai_calls_today: 0,
        last_reading_date: null as any,
        notification_enabled: true,
        notification_time: "09:00",
        preferred_language: "vi",
        dark_mode: false,
      };

      await this.db.runAsync(
        `INSERT INTO user_state (
          user_id, subscription_tier, readings_today, ai_calls_today,
          notification_enabled, notification_time, preferred_language, dark_mode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          defaultState.subscription_tier,
          0,
          0,
          1,
          "09:00",
          "vi",
          0,
        ]
      );

      return defaultState;
    }

    return {
      user_id: row.user_id,
      subscription_tier: row.subscription_tier as SubscriptionTier,
      readings_today: row.readings_today,
      ai_calls_today: row.ai_calls_today,
      last_reading_date: row.last_reading_date,
      notification_enabled: row.notification_enabled === 1,
      notification_time: row.notification_time,
      preferred_language: row.preferred_language,
      dark_mode: row.dark_mode === 1,
    };
  }

  async updateUserState(state: UserState): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `UPDATE user_state SET
        subscription_tier = ?, readings_today = ?, ai_calls_today = ?,
        last_reading_date = ?, notification_enabled = ?,
        notification_time = ?, preferred_language = ?, dark_mode = ?
      WHERE user_id = ?`,
      [
        state.subscription_tier,
        state.readings_today,
        state.ai_calls_today,
        state.last_reading_date,
        state.notification_enabled ? 1 : 0,
        state.notification_time,
        state.preferred_language,
        state.dark_mode ? 1 : 0,
        state.user_id,
      ]
    );
  }

  async incrementReadingsToday(userId: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `UPDATE user_state SET readings_today = readings_today + 1 WHERE user_id = ?`,
      [userId]
    );
  }

  async incrementAICallsToday(userId: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `UPDATE user_state SET ai_calls_today = ai_calls_today + 1 WHERE user_id = ?`,
      [userId]
    );
  }

  async resetDailyLimits(userId: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const today = new Date().toISOString().split("T")[0];

    await this.db.runAsync(
      `UPDATE user_state SET readings_today = 0, ai_calls_today = 0, last_reading_date = ?
       WHERE user_id = ?`,
      [today, userId]
    );
  }

  // ========================================================================
  // NOTIFICATION OPERATIONS
  // ========================================================================

  async insertNotificationEntry(entry: NotificationEntry): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `INSERT INTO notification_matrix (symbol_id, question) VALUES (?, ?)`,
      [entry.symbol_id, entry.question]
    );
  }

  async getNotificationMatrix(): Promise<NotificationEntry[]> {
    if (!this.db) throw new Error("Database not initialized");

    const rows = await this.db.getAllAsync<any>(`SELECT * FROM notification_matrix`);

    return rows.map((row: Record<string, any>) => ({
      symbol_id: row.symbol_id,
      question: row.question,
    }));
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private mapRowToReading(row: Record<string, any>): Reading {
    return {
      id: row.id,
      created_at: row.created_at,
      source_id: row.source_id,
      passage_id: row.passage_id,
      theme_id: row.theme_id,
      symbol_chosen: row.symbol_chosen,
      symbol_method: row.symbol_method as SymbolMethod,
      situation_text: row.situation_text,
      ai_interpreted: row.ai_interpreted === 1,
      ai_used_fallback: row.ai_used_fallback === 1,
      read_duration_s: row.read_duration_s,
      mood_tag: row.mood_tag as MoodTag | undefined,
      is_favorite: row.is_favorite === 1,
      shared: row.shared === 1,
    };
  }

  private mapRowToSource(row: Record<string, any>): Source {
    return {
      id: row.id,
      name: row.name,
      tradition: row.tradition,
      language: row.language,
      passage_count: row.passage_count,
      is_bundled: row.is_bundled === 1,
      is_premium: row.is_premium === 1,
      fallback_prompts: JSON.parse(row.fallback_prompts),
    };
  }

  private mapRowToPassage(row: Record<string, any>): Passage {
    return {
      id: row.id,
      source_id: row.source_id,
      reference: row.reference,
      text: row.text,
      context: row.context,
    };
  }
}

export const store = new StoreService();
