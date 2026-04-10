/**
 * Store Service - SQLite operations wrapper
 * Interfaces with local SQLite database via expo-sqlite
 * Web-only persistence path. Android beta must use the Rust core as SSOT.
 */

import * as SQLite from "expo-sqlite";
import {
  NotificationMessage,
  Source,
  Passage,
  Theme,
  Symbol,
  Reading,
  UserState,
  SubscriptionTier,
  SymbolMethod,
} from "@/lib/types";
import { BUNDLED_SOURCES, BUNDLED_PASSAGES, BUNDLED_THEMES } from "@/lib/data/content";

class StoreService {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;
  private static readonly SCHEMA_VERSION = 7;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.db = await SQLite.openDatabaseAsync("aletheia.db");
      
      // ARCH-01: Run migrations with versioning
      await this.runMigrations();
      
      // Seed bundled data if empty
      const sourceCount = await this.db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM sources");
      if (!sourceCount || sourceCount.count === 0) {
        await this.seedBundledData();
      }
      
      this.initialized = true;
      console.log("[Store] Initialized successfully");
    } catch (error) {
      console.error("[Store] Failed to initialize:", error);
      throw error;
    }
  }

  // ARCH-01: Migration system with PRAGMA user_version
  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    
    const result = await this.db.getFirstAsync<{ version: number }>("PRAGMA user_version");
    const currentVersion = result?.version ?? 0;
    
    if (currentVersion >= StoreService.SCHEMA_VERSION) {
      return; // Already migrated
    }
    
    // Version 0: Initial schema creation
    if (currentVersion < 1) {
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS sources (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          tradition TEXT,
          language TEXT,
          passage_count INTEGER DEFAULT 0,
          is_bundled INTEGER DEFAULT 0,
          is_premium INTEGER DEFAULT 0,
          fallback_prompts TEXT
        );
        
        CREATE TABLE IF NOT EXISTS passages (
          id TEXT PRIMARY KEY,
          source_id TEXT,
          reference TEXT,
          text TEXT NOT NULL,
          context TEXT,
          resonance_context TEXT,
          FOREIGN KEY (source_id) REFERENCES sources(id)
        );
        
        CREATE TABLE IF NOT EXISTS themes (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          is_premium INTEGER DEFAULT 0,
          pack_id TEXT,
          price_usd REAL
        );
        
        CREATE TABLE IF NOT EXISTS symbols (
          id TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          flavor_text TEXT,
          theme_id TEXT,
          FOREIGN KEY (theme_id) REFERENCES themes(id)
        );
        
        CREATE TABLE IF NOT EXISTS user_state (
          user_id TEXT PRIMARY KEY,
          subscription_tier TEXT DEFAULT 'free',
          readings_today INTEGER DEFAULT 0,
          ai_calls_today INTEGER DEFAULT 0,
          session_count INTEGER DEFAULT 0,
          last_reading_date TEXT,
          notification_enabled INTEGER DEFAULT 1,
          notification_time TEXT,
          preferred_language TEXT DEFAULT 'vi',
          dark_mode INTEGER DEFAULT 1,
          onboarding_complete INTEGER DEFAULT 0,
          user_intent TEXT
        );
        
        CREATE TABLE IF NOT EXISTS readings (
          id TEXT PRIMARY KEY,
          created_at INTEGER NOT NULL,
          source_id TEXT,
          passage_id TEXT,
          theme_id TEXT,
          symbol_chosen TEXT,
          symbol_method TEXT,
          situation_text TEXT,
          ai_interpreted INTEGER DEFAULT 0,
          ai_used_fallback INTEGER DEFAULT 0,
          read_duration_s INTEGER,
          time_to_ai_request_s INTEGER,
          notification_opened INTEGER DEFAULT 0,
          mood_tag TEXT,
          is_favorite INTEGER DEFAULT 0,
          shared INTEGER DEFAULT 0,
          user_intent TEXT,
          FOREIGN KEY (source_id) REFERENCES sources(id),
          FOREIGN KEY (passage_id) REFERENCES passages(id),
          FOREIGN KEY (theme_id) REFERENCES themes(id)
        );
      `);
    }

    // Migration v2: Add session_count to user_state (for existing DBs from v1 that lack it)
    if (currentVersion < 2) {
      try {
        await this.db.execAsync(`ALTER TABLE user_state ADD COLUMN session_count INTEGER NOT NULL DEFAULT 0;`);
      } catch (e: any) {
        if (!e.message?.includes("duplicate column")) throw e;
      }
    }

    // Migration v3: Ensure user_state table has all required columns with correct constraints
    // Mirrors Rust store migration v3. Safe to run on existing DBs (CREATE TABLE IF NOT EXISTS).
    if (currentVersion < 3) {
      // No-op: TS v1 migration already creates user_state with the same schema.
      // Bump version to align with Rust.
    }

    // Migration v4: Add time_to_ai_request_s and notification_opened columns to readings
    // Mirrors Rust store migration v4.
    if (currentVersion < 4) {
      try {
        await this.db.execAsync(`ALTER TABLE readings ADD COLUMN time_to_ai_request_s INTEGER;`);
      } catch (e: any) {
        if (!e.message?.includes("duplicate column")) throw e;
      }
      try {
        await this.db.execAsync(`ALTER TABLE readings ADD COLUMN notification_opened INTEGER NOT NULL DEFAULT 0;`);
      } catch (e: any) {
        if (!e.message?.includes("duplicate column")) throw e;
      }
    }

    // Migration v5: Add resonance_context column to passages
    // Mirrors Rust store migration v5.
    if (currentVersion < 5) {
      // Check if column already exists before altering
      const tableInfo = await this.db.getAllAsync<{ name: string }>(
        `PRAGMA table_info(passages)` 
      );
      const hasResonanceContext = tableInfo.some((col) => col.name === "resonance_context");
      if (!hasResonanceContext) {
        await this.db.execAsync(
          `ALTER TABLE passages ADD COLUMN resonance_context TEXT;` 
        );
      }
    }

    if (currentVersion < 6) {
      const readingsInfo = await this.db.getAllAsync<{ name: string }>(
        `PRAGMA table_info(readings)`
      );
      const hasUserIntent = readingsInfo.some((col) => col.name === "user_intent");
      if (!hasUserIntent) {
        await this.db.execAsync(
          `ALTER TABLE readings ADD COLUMN user_intent TEXT;`
        );
      }
    }

    if (currentVersion < 7) {
      const userStateInfo = await this.db.getAllAsync<{ name: string }>(
        `PRAGMA table_info(user_state)`
      );
      const hasUserIntent = userStateInfo.some((col) => col.name === "user_intent");
      if (!hasUserIntent) {
        await this.db.execAsync(
          `ALTER TABLE user_state ADD COLUMN user_intent TEXT;`
        );
      }
    }
    
    await this.db.execAsync(`PRAGMA user_version = ${StoreService.SCHEMA_VERSION}`);
    console.log(`[Store] Migrated to version ${StoreService.SCHEMA_VERSION}`);
  }

  private async seedBundledData(): Promise<void> {
    if (!this.db) return;

    // Seed sources
    for (const source of BUNDLED_SOURCES) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO sources (id, name, tradition, language, passage_count, is_bundled, is_premium, fallback_prompts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [source.id, source.name, source.tradition, source.language, source.passage_count, source.is_bundled ? 1 : 0, source.is_premium ? 1 : 0, JSON.stringify(source.fallback_prompts)]
      );
    }

    // Seed passages
    for (const passage of BUNDLED_PASSAGES) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO passages (id, source_id, reference, text, context, resonance_context) VALUES (?, ?, ?, ?, ?, ?)`,
        [passage.id, passage.source_id, passage.reference, passage.text, passage.context || null, passage.resonance_context || null]
      );
    }

    // Seed themes
    for (const theme of BUNDLED_THEMES) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO themes (id, name, is_premium, pack_id, price_usd) VALUES (?, ?, ?, ?, ?)`,
        [theme.id, theme.name, theme.is_premium ? 1 : 0, theme.pack_id || null, theme.price_usd || null]
      );

      // Seed symbols
      for (const symbol of theme.symbols) {
        await this.db.runAsync(
          `INSERT OR REPLACE INTO symbols (id, theme_id, display_name, flavor_text) VALUES (?, ?, ?, ?)`,
          [symbol.id, theme.id, symbol.display_name, symbol.flavor_text || null]
        );
      }
    }

    console.log("[Store] Seeded bundled data");
  }

  // User State
  async getUserState(userId: string): Promise<UserState> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const row = await this.db.getFirstAsync<any>(
      "SELECT * FROM user_state WHERE user_id = ?",
      [userId]
    );

    if (!row) {
      // Create default user state
      const defaultState: UserState = {
        user_id: userId,
        subscription_tier: SubscriptionTier.Free,
        readings_today: 0,
        ai_calls_today: 0,
        session_count: 0,
        last_reading_date: undefined,
        notification_enabled: true,
        notification_time: "09:00",
        preferred_language: "vi",
        dark_mode: false,
        onboarding_complete: false,
        user_intent: undefined,
      };
      await this.updateUserState(defaultState);
      return defaultState;
    }

    const today = new Date().toLocaleDateString("en-CA"); // Local date YYYY-MM-DD
    if (row.last_reading_date && row.last_reading_date !== today) {
      await this.db!.runAsync(
        `UPDATE user_state SET readings_today = 0, ai_calls_today = 0, last_reading_date = ? WHERE user_id = ?`,
        [today, userId]
      );
      return {
        user_id: row.user_id,
        subscription_tier: row.subscription_tier as SubscriptionTier,
        readings_today: 0,
        ai_calls_today: 0,
        session_count: row.session_count ?? 0,
        last_reading_date: today,
        notification_enabled: row.notification_enabled === 1,
        notification_time: row.notification_time || undefined,
        preferred_language: row.preferred_language,
        dark_mode: row.dark_mode === 1,
        onboarding_complete: row.onboarding_complete === 1,
        user_intent: row.user_intent || undefined,
      };
    }

    return {
      user_id: row.user_id,
      subscription_tier: row.subscription_tier as SubscriptionTier,
      readings_today: row.readings_today,
      ai_calls_today: row.ai_calls_today,
      session_count: row.session_count ?? 0,
      last_reading_date: row.last_reading_date || undefined,
      notification_enabled: row.notification_enabled === 1,
      notification_time: row.notification_time || undefined,
      preferred_language: row.preferred_language,
      dark_mode: row.dark_mode === 1,
      onboarding_complete: row.onboarding_complete === 1,
      user_intent: row.user_intent || undefined,
    };
  }

  async updateUserState(state: UserState): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `INSERT OR REPLACE INTO user_state (user_id, subscription_tier, readings_today, ai_calls_today, session_count, last_reading_date, notification_enabled, notification_time, preferred_language, dark_mode, onboarding_complete, user_intent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        state.user_id,
        state.subscription_tier,
        state.readings_today,
        state.ai_calls_today,
        state.session_count,
        state.last_reading_date || null,
        state.notification_enabled ? 1 : 0,
        state.notification_time || null,
        state.preferred_language,
        state.dark_mode ? 1 : 0,
        state.onboarding_complete ? 1 : 0,
        state.user_intent ?? null,
      ]
    );
  }

  async incrementReadingsToday(userId: string): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const today = new Date().toLocaleDateString("en-CA"); // Local date YYYY-MM-DD
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

  async incrementSessionCount(userId: string): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `UPDATE user_state SET session_count = session_count + 1 WHERE user_id = ?`,
      [userId]
    );
  }

  // Sources
  async getSources(premiumAllowed: boolean): Promise<Source[]> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const query = premiumAllowed
      ? "SELECT * FROM sources ORDER BY name ASC"
      : "SELECT * FROM sources WHERE is_premium = 0 ORDER BY name ASC";

    const rows = await this.db.getAllAsync<any>(query);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      tradition: row.tradition,
      language: row.language,
      passage_count: row.passage_count,
      is_bundled: row.is_bundled === 1,
      is_premium: row.is_premium === 1,
      fallback_prompts: row.fallback_prompts ? JSON.parse(row.fallback_prompts) : [],
    }));
  }

  async getSource(sourceId: string): Promise<Source | null> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const row = await this.db.getFirstAsync<any>(
      "SELECT * FROM sources WHERE id = ?",
      [sourceId]
    );

    if (!row) return null;

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

  async getRandomSource(
    premiumAllowed: boolean,
    preferredLanguage?: string,
  ): Promise<Source | null> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const filters: string[] = [];
    const params: (string | number)[] = [];

    if (!premiumAllowed) {
      filters.push("is_premium = 0");
    }

    const normalizedLanguage = preferredLanguage?.trim().toLowerCase();
    if (normalizedLanguage) {
      filters.push("language = ?");
      params.push(normalizedLanguage);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const query = `SELECT * FROM sources ${whereClause} ORDER BY RANDOM() LIMIT 1`;

    let row = await this.db.getFirstAsync<any>(query, params);

    if (!row && normalizedLanguage) {
      const fallbackFilters = !premiumAllowed ? ["is_premium = 0"] : [];
      const fallbackWhereClause =
        fallbackFilters.length > 0 ? `WHERE ${fallbackFilters.join(" AND ")}` : "";
      row = await this.db.getFirstAsync<any>(
        `SELECT * FROM sources ${fallbackWhereClause} ORDER BY RANDOM() LIMIT 1`,
      );
    }

    if (!row) return null;

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

  // Passages
  async getRandomPassage(sourceId: string): Promise<Passage | null> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const row = await this.db.getFirstAsync<any>(
      "SELECT * FROM passages WHERE source_id = ? ORDER BY RANDOM() LIMIT 1",
      [sourceId]
    );

    if (!row) return null;

    return {
      id: row.id,
      source_id: row.source_id,
      reference: row.reference,
      text: row.text,
      context: row.context || undefined,
      resonance_context: row.resonance_context || undefined,
    };
  }

  // Themes
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
      symbols: symbols.map((s) => ({
        id: s.id,
        display_name: s.display_name,
        flavor_text: s.flavor_text || undefined,
      })),
    };
  }

  async randomThreeSymbols(themeId: string): Promise<Symbol[]> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const rows = await this.db.getAllAsync<any>(
      "SELECT * FROM symbols WHERE theme_id = ? ORDER BY RANDOM() LIMIT 3",
      [themeId]
    );

    return rows.map((row) => ({
      id: row.id,
      display_name: row.display_name,
      flavor_text: row.flavor_text || undefined,
    }));
  }

  async getThemeById(themeId: string): Promise<Theme | null> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const row = await this.db.getFirstAsync<any>(
      "SELECT * FROM themes WHERE id = ?",
      [themeId]
    );
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
      symbols: symbols.map((s) => ({
        id: s.id,
        display_name: s.display_name,
        flavor_text: s.flavor_text || undefined,
      })),
    };
  }

  // Readings
  async insertReading(reading: Reading): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `INSERT INTO readings (id, created_at, source_id, passage_id, theme_id, symbol_chosen, symbol_method, situation_text, ai_interpreted, ai_used_fallback, read_duration_s, time_to_ai_request_s, notification_opened, mood_tag, is_favorite, shared, user_intent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        reading.time_to_ai_request_s || null,
        reading.notification_opened ? 1 : 0,
        reading.mood_tag || null,
        reading.is_favorite ? 1 : 0,
        reading.shared ? 1 : 0,
        reading.user_intent ?? null,
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

    return rows.map((row) => this.mapReadingRow(row));
  }

  async getReadingsCount(): Promise<number> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM readings"
    );
    return result?.count || 0;
  }

  async getReadingById(id: string): Promise<Reading | null> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const row = await this.db.getFirstAsync<any>(
      "SELECT * FROM readings WHERE id = ?",
      [id]
    );

    return row ? this.mapReadingRow(row) : null;
  }

  async updateReadingFlags(
    id: string,
    flags: {
      is_favorite?: boolean;
      shared?: boolean;
    },
  ): Promise<Reading | null> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (typeof flags.is_favorite === "boolean") {
      updates.push("is_favorite = ?");
      params.push(flags.is_favorite ? 1 : 0);
    }

    if (typeof flags.shared === "boolean") {
      updates.push("shared = ?");
      params.push(flags.shared ? 1 : 0);
    }

    if (updates.length === 0) {
      return this.getReadingById(id);
    }

    params.push(id);

    await this.db.runAsync(
      `UPDATE readings SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );

    return this.getReadingById(id);
  }

  async getGiftableSources(): Promise<Source[]> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const rows = await this.db.getAllAsync<any>(
      "SELECT * FROM sources WHERE is_premium = 0 ORDER BY name ASC"
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      tradition: row.tradition || "other",
      language: row.language,
      passage_count: row.passage_count || 0,
      is_bundled: true,
      is_premium: row.is_premium === 1,
      fallback_prompts: row.fallback_prompts ? JSON.parse(row.fallback_prompts) : [],
    }));
  }

  async getDailyNotificationMessage(
    userId: string,
    date: string,
  ): Promise<NotificationMessage> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");

    const { NOTIFICATION_MATRIX } = await import("@/lib/data/content");

    const input = `${userId}|${date}`;
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
      hash = hash >>> 0;
    }

    const entry = NOTIFICATION_MATRIX[hash % NOTIFICATION_MATRIX.length]!;
    const symbolRow = await this.db.getFirstAsync<{ display_name: string }>(
      "SELECT display_name FROM symbols WHERE id = ?",
      [entry.symbol_id]
    );
    const symbolName = symbolRow?.display_name || entry.symbol_id;

    return {
      symbol_id: entry.symbol_id,
      question: entry.question,
      title: "✦ Vũ trụ hôm nay lật",
      body: `${symbolName}. ${entry.question}?`,
    };
  }

  private mapReadingRow(row: any): Reading {
    return {
      id: row.id,
      created_at: row.created_at,
      source_id: row.source_id,
      passage_id: row.passage_id,
      theme_id: row.theme_id,
      symbol_chosen: row.symbol_chosen,
      symbol_method: this.normalizeSymbolMethod(row.symbol_method),
      situation_text: row.situation_text || undefined,
      ai_interpreted: row.ai_interpreted === 1,
      ai_used_fallback: row.ai_used_fallback === 1,
      read_duration_s: row.read_duration_s || undefined,
      time_to_ai_request_s: row.time_to_ai_request_s || undefined,
      notification_opened: row.notification_opened === 1,
      mood_tag: row.mood_tag || undefined,
      is_favorite: row.is_favorite === 1,
      shared: row.shared === 1,
      user_intent: row.user_intent || undefined,
    };
  }

  private normalizeSymbolMethod(value: unknown): SymbolMethod {
    if (typeof value !== "string") {
      return SymbolMethod.Manual;
    }

    const normalized = value.toLowerCase();
    return normalized === SymbolMethod.Auto ? SymbolMethod.Auto : SymbolMethod.Manual;
  }
}

export const store = new StoreService();
