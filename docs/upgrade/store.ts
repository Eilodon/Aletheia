/**
 * Store Service — SQLite operations wrapper
 * Interfaces with local SQLite database via expo-sqlite
 *
 * ARCH-01: Migration versioning via PRAGMA user_version (no AsyncStorage flag)
 * BUG-01:  Daily limit reset on date change inside getUserState()
 * ARCH-06: randomThreeSymbols() reuses symbols already loaded by getRandomTheme()
 *
 * TODO (ARCH-02): This is the temporary TypeScript bridge.
 * Once UniFFI bindings are generated and linked (see BRIDGE_SETUP.md),
 * replace with the Rust Core store which is the architectural source of truth.
 */

import * as SQLite from "expo-sqlite";
import {
  Source,
  Passage,
  Theme,
  Symbol,
  Reading,
  UserState,
  SubscriptionTier,
} from "@/lib/types";
import { BUNDLED_SOURCES, BUNDLED_PASSAGES, BUNDLED_THEMES } from "@/lib/data/seed-data";

const CURRENT_SCHEMA_VERSION = 2;

class StoreService {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.db = await SQLite.openDatabaseAsync("aletheia.db");
      await this.runMigrations();

      const sourceCount = await this.db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM sources"
      );
      if (!sourceCount || sourceCount.count === 0) {
        await this.seedBundledData();
      }

      this.initialized = true;
      console.log("[Store] Initialized — schema version", CURRENT_SCHEMA_VERSION);
    } catch (error) {
      console.error("[Store] Failed to initialize:", error);
      throw error;
    }
  }

  // ============================================================================
  // MIGRATIONS — ARCH-01
  // ============================================================================

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const row = await this.db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
    const version = row?.user_version ?? 0;
    console.log("[Store] Current schema version:", version);

    // Migration 0 → 1: Create initial schema
    if (version < 1) {
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS sources (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          tradition TEXT NOT NULL,
          language TEXT NOT NULL,
          passage_count INTEGER NOT NULL,
          is_bundled INTEGER NOT NULL DEFAULT 1,
          is_premium INTEGER NOT NULL DEFAULT 0,
          fallback_prompts TEXT
        );
        CREATE TABLE IF NOT EXISTS passages (
          id TEXT PRIMARY KEY,
          source_id TEXT NOT NULL,
          reference TEXT NOT NULL,
          text TEXT NOT NULL,
          context TEXT,
          resonance_context TEXT,
          FOREIGN KEY (source_id) REFERENCES sources(id)
        );
        CREATE TABLE IF NOT EXISTS themes (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          is_premium INTEGER NOT NULL DEFAULT 0,
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
          shared INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS user_state (
          user_id TEXT PRIMARY KEY,
          subscription_tier TEXT NOT NULL DEFAULT 'free',
          readings_today INTEGER NOT NULL DEFAULT 0,
          ai_calls_today INTEGER NOT NULL DEFAULT 0,
          last_reading_date TEXT,
          notification_enabled INTEGER NOT NULL DEFAULT 1,
          notification_time TEXT DEFAULT '09:00',
          preferred_language TEXT DEFAULT 'vi',
          dark_mode INTEGER NOT NULL DEFAULT 0,
          onboarding_complete INTEGER NOT NULL DEFAULT 0
        );
      `);
      await this.db.execAsync(`PRAGMA user_version = 1;`);
      console.log("[Store] Migration 1 complete");
    }

    // Migration 1 → 2: Add resonance_context to passages (AI-05)
    if (version < 2) {
      try {
        await this.db.execAsync(`ALTER TABLE passages ADD COLUMN resonance_context TEXT;`);
      } catch {
        // Column may already exist from migration 1 above — safe to ignore
      }
      await this.db.execAsync(`PRAGMA user_version = 2;`);
      console.log("[Store] Migration 2 complete");
    }
  }

  // ============================================================================
  // SEED
  // ============================================================================

  private async seedBundledData(): Promise<void> {
    if (!this.db) return;

    for (const source of BUNDLED_SOURCES) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO sources
         (id, name, tradition, language, passage_count, is_bundled, is_premium, fallback_prompts)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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

    for (const passage of BUNDLED_PASSAGES) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO passages
         (id, source_id, reference, text, context, resonance_context)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          passage.id,
          passage.source_id,
          passage.reference,
          passage.text,
          passage.context || null,
          passage.resonance_context || null,
        ]
      );
    }

    for (const theme of BUNDLED_THEMES) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO themes (id, name, is_premium, pack_id, price_usd) VALUES (?, ?, ?, ?, ?)`,
        [theme.id, theme.name, theme.is_premium ? 1 : 0, theme.pack_id || null, theme.price_usd || null]
      );
      for (const symbol of theme.symbols) {
        await this.db.runAsync(
          `INSERT OR REPLACE INTO symbols (id, theme_id, display_name, flavor_text) VALUES (?, ?, ?, ?)`,
          [symbol.id, theme.id, symbol.display_name, symbol.flavor_text || null]
        );
      }
    }

    console.log("[Store] Seeded bundled data");
  }

  // ============================================================================
  // USER STATE — BUG-01: reset daily counters when date changes
  // ============================================================================

  async getUserState(userId: string): Promise<UserState> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const row = await this.db.getFirstAsync<any>(
      "SELECT * FROM user_state WHERE user_id = ?",
      [userId]
    );

    if (!row) {
      const defaultState: UserState = {
        user_id: userId,
        subscription_tier: SubscriptionTier.Free,
        readings_today: 0,
        ai_calls_today: 0,
        last_reading_date: undefined,
        notification_enabled: true,
        notification_time: "09:00",
        preferred_language: "vi",
        dark_mode: false,
        onboarding_complete: false,
      };
      await this.updateUserState(defaultState);
      return defaultState;
    }

    // BUG-01 fix: reset daily counters if the date has rolled over
    const today = new Date().toISOString().split("T")[0];
    if (row.last_reading_date && row.last_reading_date !== today) {
      await this.db.runAsync(
        `UPDATE user_state SET readings_today = 0, ai_calls_today = 0 WHERE user_id = ?`,
        [userId]
      );
      return { ...this.mapUserStateRow(row), readings_today: 0, ai_calls_today: 0 };
    }

    return this.mapUserStateRow(row);
  }

  private mapUserStateRow(row: any): UserState {
    return {
      user_id: row.user_id,
      subscription_tier: row.subscription_tier as SubscriptionTier,
      readings_today: row.readings_today,
      ai_calls_today: row.ai_calls_today,
      last_reading_date: row.last_reading_date || undefined,
      notification_enabled: row.notification_enabled === 1,
      notification_time: row.notification_time || undefined,
      preferred_language: row.preferred_language,
      dark_mode: row.dark_mode === 1,
      onboarding_complete: row.onboarding_complete === 1,
    };
  }

  async updateUserState(state: UserState): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `INSERT OR REPLACE INTO user_state
       (user_id, subscription_tier, readings_today, ai_calls_today, last_reading_date,
        notification_enabled, notification_time, preferred_language, dark_mode, onboarding_complete)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        state.user_id,
        state.subscription_tier,
        state.readings_today,
        state.ai_calls_today,
        state.last_reading_date || null,
        state.notification_enabled ? 1 : 0,
        state.notification_time || null,
        state.preferred_language,
        state.dark_mode ? 1 : 0,
        state.onboarding_complete ? 1 : 0,
      ]
    );
  }

  async incrementReadingsToday(userId: string): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const today = new Date().toISOString().split("T")[0];
    await this.db.runAsync(
      `UPDATE user_state SET readings_today = readings_today + 1, last_reading_date = ? WHERE user_id = ?`,
      [today, userId]
    );
  }

  async incrementAICallsToday(userId: string): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `UPDATE user_state SET ai_calls_today = ai_calls_today + 1 WHERE user_id = ?`,
      [userId]
    );
  }

  // ============================================================================
  // SOURCES
  // ============================================================================

  async getSource(sourceId: string): Promise<Source | null> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const row = await this.db.getFirstAsync<any>(
      "SELECT * FROM sources WHERE id = ?",
      [sourceId]
    );
    if (!row) return null;
    return this.mapSourceRow(row);
  }

  async getRandomSource(premiumAllowed: boolean): Promise<Source | null> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const query = premiumAllowed
      ? "SELECT * FROM sources ORDER BY RANDOM() LIMIT 1"
      : "SELECT * FROM sources WHERE is_premium = 0 ORDER BY RANDOM() LIMIT 1";

    const row = await this.db.getFirstAsync<any>(query);
    if (!row) return null;
    return this.mapSourceRow(row);
  }

  private mapSourceRow(row: any): Source {
    return {
      id: row.id,
      name: row.name,
      tradition: row.tradition,
      language: row.language,
      passage_count: row.passage_count,
      is_bundled: row.is_bundled === 1,
      is_premium: row.is_premium === 1,
      fallback_prompts: row.fallback_prompts ? JSON.parse(row.fallback_prompts) : [],
    };
  }

  // ============================================================================
  // PASSAGES
  // ============================================================================

  async getRandomPassage(sourceId: string): Promise<Passage | null> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const row = await this.db.getFirstAsync<any>(
      "SELECT * FROM passages WHERE source_id = ? ORDER BY RANDOM() LIMIT 1",
      [sourceId]
    );
    if (!row) return null;
    return this.mapPassageRow(row);
  }

  private mapPassageRow(row: any): Passage {
    return {
      id: row.id,
      source_id: row.source_id,
      reference: row.reference,
      text: row.text,
      context: row.context || undefined,
      resonance_context: row.resonance_context || undefined,
    };
  }

  // ============================================================================
  // THEMES — ARCH-06: reuse symbols loaded by getRandomTheme
  // ============================================================================

  async getRandomTheme(premiumAllowed: boolean): Promise<Theme | null> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const query = premiumAllowed
      ? "SELECT * FROM themes ORDER BY RANDOM() LIMIT 1"
      : "SELECT * FROM themes WHERE is_premium = 0 ORDER BY RANDOM() LIMIT 1";

    const row = await this.db.getFirstAsync<any>(query);
    if (!row) return null;

    const symbols = await this.db.getAllAsync<any>(
      "SELECT * FROM symbols WHERE theme_id = ?",
      [row.id]
    );

    return {
      id: row.id,
      name: row.name,
      is_premium: row.is_premium === 1,
      pack_id: row.pack_id || undefined,
      price_usd: row.price_usd || undefined,
      symbols: symbols.map(this.mapSymbolRow),
    };
  }

  /**
   * ARCH-06 fix: pass existingSymbols from getRandomTheme() to skip a DB round-trip.
   */
  async randomThreeSymbols(themeId: string, existingSymbols?: Symbol[]): Promise<Symbol[]> {
    if (existingSymbols && existingSymbols.length >= 3) {
      return [...existingSymbols].sort(() => Math.random() - 0.5).slice(0, 3);
    }

    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const rows = await this.db.getAllAsync<any>(
      "SELECT * FROM symbols WHERE theme_id = ? ORDER BY RANDOM() LIMIT 3",
      [themeId]
    );
    return rows.map(this.mapSymbolRow);
  }

  private mapSymbolRow(row: any): Symbol {
    return {
      id: row.id,
      display_name: row.display_name,
      flavor_text: row.flavor_text || undefined,
    };
  }

  // ============================================================================
  // READINGS
  // ============================================================================

  async insertReading(reading: Reading): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `INSERT INTO readings
       (id, created_at, source_id, passage_id, theme_id, symbol_chosen, symbol_method,
        situation_text, ai_interpreted, ai_used_fallback, read_duration_s, mood_tag,
        is_favorite, shared)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  async getReadings(limit: number, offset: number): Promise<Reading[]> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const rows = await this.db.getAllAsync<any>(
      "SELECT * FROM readings ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );

    return rows.map((row) => ({
      id: row.id,
      created_at: row.created_at,
      source_id: row.source_id,
      passage_id: row.passage_id,
      theme_id: row.theme_id,
      symbol_chosen: row.symbol_chosen,
      symbol_method: row.symbol_method,
      situation_text: row.situation_text || undefined,
      ai_interpreted: row.ai_interpreted === 1,
      ai_used_fallback: row.ai_used_fallback === 1,
      read_duration_s: row.read_duration_s || undefined,
      mood_tag: row.mood_tag || undefined,
      is_favorite: row.is_favorite === 1,
      shared: row.shared === 1,
    }));
  }

  async getReadingsCount(): Promise<number> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM readings"
    );
    return result?.count || 0;
  }
}

export const store = new StoreService();
