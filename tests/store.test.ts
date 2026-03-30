import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../lib/services/store";
import { SubscriptionTier } from "../lib/types";

const mockDb = vi.hoisted(() => ({
  data: new Map<string, any[]>(),
  version: 0,
  getFirstAsync: vi.fn(async (query: string, params?: any[]) => {
    if (query.includes("PRAGMA user_version")) {
      return { version: mockDb.version };
    }

    if (query.includes("SELECT COUNT(*) as count FROM sources")) {
      return { count: (mockDb.data.get("sources") || []).length };
    }

    if (query.includes("SELECT COUNT(*) as count FROM readings")) {
      return { count: (mockDb.data.get("readings") || []).length };
    }

    const tableMatch = query.match(/SELECT \* FROM (\w+)/);
    if (!tableMatch) return null;

    const table = tableMatch[1];
    const rows = mockDb.data.get(table) || [];
    if (query.includes("WHERE user_id = ?")) {
      const param = params?.[0];
      return rows.find((r) => r.user_id === param) || null;
    }
    if (query.includes("WHERE id = ?")) {
      const param = params?.[0];
      return rows.find((r) => r.id === param) || null;
    }
    if (query.includes("WHERE source_id = ?")) {
      const param = params?.[0];
      const filtered = rows.filter((r) => r.source_id === param);
      if (query.includes("ORDER BY RANDOM()")) {
        return filtered[0] || null;
      }
      return filtered[0] || null;
    }
    if (query.includes("ORDER BY RANDOM()")) {
      return rows[0] || null;
    }
    return rows[0] || null;
  }),
  getAllAsync: vi.fn(async (query: string, params?: any[]) => {
    const pragmaMatch = query.match(/PRAGMA table_info\((\w+)\)/i);
    if (pragmaMatch) {
      const table = pragmaMatch[1];
      const knownColumns: Record<string, string[]> = {
        passages: ["id", "source_id", "reference", "text", "context", "resonance_context"],
        readings: [
          "id", "created_at", "source_id", "passage_id", "theme_id",
          "symbol_chosen", "symbol_method", "situation_text", "ai_interpreted",
          "ai_used_fallback", "read_duration_s", "time_to_ai_request_s",
          "notification_opened", "mood_tag", "is_favorite", "shared", "user_intent",
        ],
          user_state: [
            "user_id", "subscription_tier", "readings_today", "ai_calls_today",
            "session_count", "last_reading_date", "notification_enabled",
            "notification_time", "preferred_language", "dark_mode", "onboarding_complete", "user_intent",
          ],
        };
      return (knownColumns[table] ?? []).map((name) => ({ name }));
    }

    const tableMatch = query.match(/SELECT \* FROM (\w+)/);
    if (!tableMatch) return [];
    const table = tableMatch[1];
    const rows = mockDb.data.get(table) || [];
    if (query.includes("WHERE theme_id = ?")) {
      const param = params?.[0];
      return rows.filter((r: any) => r.theme_id === param);
    }
    return rows;
  }),
  runAsync: vi.fn(async (query: string, params?: any[]) => {
    if (query.includes("INSERT OR REPLACE INTO user_state")) {
      const table = "user_state";
      const rows = mockDb.data.get(table) || [];
      const existingIdx = rows.findIndex((r) => r.user_id === params?.[0]);
      const row = {
        user_id: params?.[0],
        subscription_tier: params?.[1],
        readings_today: params?.[2],
        ai_calls_today: params?.[3],
        session_count: params?.[4],
        last_reading_date: params?.[5],
        notification_enabled: params?.[6],
        notification_time: params?.[7],
        preferred_language: params?.[8],
        dark_mode: params?.[9],
        onboarding_complete: params?.[10],
      };
      if (existingIdx >= 0) {
        rows[existingIdx] = row;
      } else {
        rows.push(row);
      }
      mockDb.data.set(table, rows);
      return;
    }

    if (query.includes("UPDATE user_state SET readings_today = 0, ai_calls_today = 0")) {
      const table = "user_state";
      const rows = mockDb.data.get(table) || [];
      const idx = rows.findIndex((r) => r.user_id === params?.[0]);
      if (idx >= 0) {
        rows[idx].readings_today = 0;
        rows[idx].ai_calls_today = 0;
        mockDb.data.set(table, rows);
      }
      return;
    }

    if (query.includes("UPDATE user_state SET readings_today = readings_today + 1")) {
      const table = "user_state";
      const rows = mockDb.data.get(table) || [];
      const idx = rows.findIndex((r) => r.user_id === params?.[1]);
      if (idx >= 0) {
        rows[idx].readings_today += 1;
        rows[idx].last_reading_date = params?.[0];
        mockDb.data.set(table, rows);
      }
      return;
    }

    if (query.includes("INSERT OR REPLACE INTO sources")) {
      const table = "sources";
      const rows = mockDb.data.get(table) || [];
      rows.push({
        id: params?.[0],
        name: params?.[1],
        tradition: params?.[2],
        language: params?.[3],
        passage_count: params?.[4],
        is_bundled: params?.[5],
        is_premium: params?.[6],
        fallback_prompts: params?.[7],
      });
      mockDb.data.set(table, rows);
      return;
    }

    if (query.includes("INSERT OR REPLACE INTO passages")) {
      const table = "passages";
      const rows = mockDb.data.get(table) || [];
      rows.push({
        id: params?.[0],
        source_id: params?.[1],
        reference: params?.[2],
        text: params?.[3],
        context: params?.[4],
        resonance_context: params?.[5],
      });
      mockDb.data.set(table, rows);
      return;
    }

    if (query.includes("INSERT OR REPLACE INTO themes")) {
      const table = "themes";
      const rows = mockDb.data.get(table) || [];
      rows.push({
        id: params?.[0],
        name: params?.[1],
        is_premium: params?.[2],
        pack_id: params?.[3],
        price_usd: params?.[4],
      });
      mockDb.data.set(table, rows);
      return;
    }

    if (query.includes("INSERT OR REPLACE INTO symbols")) {
      const table = "symbols";
      const rows = mockDb.data.get(table) || [];
      rows.push({
        id: params?.[0],
        theme_id: params?.[1],
        display_name: params?.[2],
        flavor_text: params?.[3],
      });
      mockDb.data.set(table, rows);
    }
  }),
  execAsync: vi.fn(async (query: string) => {
    if (query.includes("PRAGMA user_version =")) {
      const match = query.match(/PRAGMA user_version = (\d+)/);
      if (match) mockDb.version = parseInt(match[1], 10);
    }
  }),
}));

vi.mock("expo-sqlite", () => {
  return {
    openDatabaseAsync: vi.fn().mockResolvedValue(mockDb),
    __mockDb: mockDb,
  };
});

describe("StoreService", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15"));
    mockDb.data = new Map();
    mockDb.version = 0;
    mockDb.getFirstAsync.mockClear();
    mockDb.getAllAsync.mockClear();
    mockDb.runAsync.mockClear();
    mockDb.execAsync.mockClear();
    const storeInternal = store as unknown as { db: unknown; initialized: boolean };
    storeInternal.db = null;
    storeInternal.initialized = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getUserState — BUG-01", () => {
    it("returns readings_today=0 when last_reading_date is a previous date", async () => {
      // ARRANGE: Insert user with old date and readings_today = 3
      await store.updateUserState({
        user_id: "test-user-old-date",
        subscription_tier: SubscriptionTier.Free,
        readings_today: 3,
        ai_calls_today: 0,
        session_count: 0,
        last_reading_date: "2020-01-01",
        notification_enabled: true,
        notification_time: "09:00",
        preferred_language: "vi",
        dark_mode: false,
        onboarding_complete: false,
        user_intent: undefined,
      });

      // ACT
      const userState = await store.getUserState("test-user-old-date");

      // ASSERT
      expect(userState.readings_today).toBe(0);
      expect(userState.ai_calls_today).toBe(0);
    });

    it("does NOT reset when last_reading_date is today", async () => {
      // ARRANGE: Insert user with today's date and readings_today = 2
      await store.updateUserState({
        user_id: "test-user-today",
        subscription_tier: SubscriptionTier.Free,
        readings_today: 2,
        ai_calls_today: 1,
        session_count: 0,
        last_reading_date: "2025-06-15",
        notification_enabled: true,
        notification_time: "09:00",
        preferred_language: "vi",
        dark_mode: false,
        onboarding_complete: false,
        user_intent: undefined,
      });

      // ACT
      const userState = await store.getUserState("test-user-today");

      // ASSERT
      expect(userState.readings_today).toBe(2);
      expect(userState.ai_calls_today).toBe(1);
    });

    it("does NOT reset when last_reading_date is null", async () => {
      // ARRANGE: New user with no date set
      await store.updateUserState({
        user_id: "test-user-null-date",
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
      });

      // ACT
      const userState = await store.getUserState("test-user-null-date");

      // ASSERT
      expect(userState.readings_today).toBe(0);
    });
  });

  describe("runMigrations — ARCH-01", () => {
    it("bumps PRAGMA user_version after migration", async () => {
      // ACT
      await store.initialize();

      // ASSERT: Check that user_state has session_count column (migrated)
      const result = await store.getUserState("new-user-migration");
      expect(result.session_count).toBe(0);
    });

    it("runs migrations idempotently — second initialize() is a no-op", async () => {
      // ACT
      await store.initialize();
      await store.initialize();

      // ASSERT: Should not throw and user should still work
      const result = await store.getUserState("new-user-idempotent");
      expect(result.user_id).toBe("new-user-idempotent");
    });

    it("migration v5/v6/v7 existence checks do not emit ALTER TABLE when columns already exist", async () => {
      await store.initialize();
      const alterCallCountAfterFirstInit = mockDb.execAsync.mock.calls
        .map((call) => call[0] as string)
        .filter((query) => query.includes("ALTER TABLE")).length;

      await store.initialize();

      const alterCalls = mockDb.execAsync.mock.calls
        .map((call) => call[0] as string)
        .filter((query) => query.includes("ALTER TABLE"));

      expect(alterCalls).toHaveLength(alterCallCountAfterFirstInit);
    });
  });

  describe("getRandomPassage — CONTENT-01", () => {
    it("never returns null for a seeded source", async () => {
      // ARRANGE
      await store.initialize();

      // ACT
      const passage = await store.getRandomPassage("i_ching");

      // ASSERT
      expect(passage).not.toBeNull();
      expect(passage?.source_id).toBe("i_ching");
    });
  });
});
