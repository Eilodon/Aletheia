import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// READING TABLES (Server-side storage for sync from local SQLite)
// ============================================================================

export const sources = mysqlTable("sources", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  tradition: mysqlEnum("tradition", ["chinese", "christian", "islamic", "sufi", "stoic", "universal"]).notNull(),
  language: varchar("language", { length: 10 }).notNull(),
  passageCount: int("passage_count").notNull(),
  isBundled: boolean("is_bundled").notNull().default(true),
  isPremium: boolean("is_premium").notNull().default(false),
  fallbackPrompts: text("fallback_prompts"), // JSON array
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DbSource = typeof sources.$inferSelect;
export type DbInsertSource = typeof sources.$inferInsert;

export const passages = mysqlTable("passages", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sourceId: varchar("source_id", { length: 64 }).notNull(),
  reference: varchar("reference", { length: 256 }).notNull(),
  text: text("text").notNull(),
  context: text("context"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DbPassage = typeof passages.$inferSelect;
export type DbInsertPassage = typeof passages.$inferInsert;

export const themes = mysqlTable("themes", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  isPremium: boolean("is_premium").notNull().default(false),
  packId: varchar("pack_id", { length: 64 }),
  priceUsd: int("price_usd"), // Stored as cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DbTheme = typeof themes.$inferSelect;
export type DbInsertTheme = typeof themes.$inferInsert;

export const symbols = mysqlTable("symbols", {
  id: varchar("id", { length: 64 }).primaryKey(),
  themeId: varchar("theme_id", { length: 64 }).notNull(),
  displayName: varchar("display_name", { length: 256 }).notNull(),
  flavorText: text("flavor_text"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DbSymbol = typeof symbols.$inferSelect;
export type DbInsertSymbol = typeof symbols.$inferInsert;

export const readings = mysqlTable("readings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userOpenId: varchar("user_open_id", { length: 64 }).notNull(), // FK to users.openId
  sourceId: varchar("source_id", { length: 64 }).notNull(),
  passageId: varchar("passage_id", { length: 64 }).notNull(),
  themeId: varchar("theme_id", { length: 64 }).notNull(),
  symbolChosen: varchar("symbol_chosen", { length: 64 }).notNull(),
  symbolMethod: mysqlEnum("symbol_method", ["manual", "auto"]).notNull(),
  situationText: text("situation_text"),
  aiInterpreted: boolean("ai_interpreted").notNull().default(false),
  aiUsedFallback: boolean("ai_used_fallback").notNull().default(false),
  readDurationS: int("read_duration_s"),
  moodTag: mysqlEnum("mood_tag", ["confused", "hopeful", "anxious", "curious", "grateful", "grief"]),
  isFavorite: boolean("is_favorite").notNull().default(false),
  shared: boolean("shared").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DbReading = typeof readings.$inferSelect;
export type DbInsertReading = typeof readings.$inferInsert;

export const userStates = mysqlTable("user_states", {
  userOpenId: varchar("user_open_id", { length: 64 }).primaryKey(), // FK to users.openId
  subscriptionTier: mysqlEnum("subscription_tier", ["free", "pro"]).notNull().default("free"),
  readingsToday: int("readings_today").notNull().default(0),
  aiCallsToday: int("ai_calls_today").notNull().default(0),
  lastReadingDate: varchar("last_reading_date", { length: 10 }),
  notificationEnabled: boolean("notification_enabled").notNull().default(true),
  notificationTime: varchar("notification_time", { length: 5 }),
  preferredLanguage: varchar("preferred_language", { length: 10 }).notNull().default("vi"),
  darkMode: boolean("dark_mode").notNull().default(false),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DbUserState = typeof userStates.$inferSelect;
export type DbInsertUserState = typeof userStates.$inferInsert;
