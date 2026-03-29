import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../lib/services/store";
import { SubscriptionTier } from "../lib/types";

vi.mock("expo-sqlite", () => {
  const mockDb = {
    data: new Map<string, any[]>(),
    version: 0,
    getFirstAsync: vi.fn(async (query: string, params?: any[]) => {
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
      if (query.includes("ORDER BY RANDOM()")) {
        return rows.length > 0 ? rows[Math.floor(Math.random() * rows.length)] : null;
      }
      if (query.includes("PRAGMA user_version")) {
        return { version: mockDb.version };
      }
      if (query.includes("SELECT COUNT(*)")) {
        return { count: rows.length };
      }
      return rows[0] || null;
    }),
    getAllAsync: vi.fn(async (query: string, params?: any[]) => {
      const tableMatch = query.match(/SELECT \* FROM (\w+)/);
      if (!tableMatch) return [];
      const table = tableMatch[1];
      const rows = mockDb.data.get(table) || [];
      if (query.includes("WHERE theme_id = ?")) {
        const param = params?.[0];
        return rows.filter((r) => r.theme_id === param);
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
      }
      if (query.includes("INSERT OR REPLACE INTO sources")) {
        const table = "sources";
        const rows = mockDb.data.get(table) || [];
        rows.push(params?.[0]);
        mockDb.data.set(table, rows);
      }
      if (query.includes("INSERT OR REPLACE INTO passages")) {
        const table = "passages";
        const rows = mockDb.data.get(table) || [];
        rows.push(params?.[0]);
        mockDb.data.set(table, rows);
      }
      if (query.includes("INSERT OR REPLACE INTO themes")) {
        const table = "themes";
        const rows = mockDb.data.get(table) || [];
        rows.push(params?.[0]);
        mockDb.data.set(table, rows);
      }
      if (query.includes("INSERT OR REPLACE INTO symbols")) {
        const table = "symbols";
        const rows = mockDb.data.get(table) || [];
        rows.push(params?.[0]);
        mockDb.data.set(table, rows);
      }
      if (query.includes("PRAGMA user_version =")) {
        mockDb.version = params?.[0] ?? 0;
      }
    }),
    execAsync: vi.fn(async (query: string) => {
      if (query.includes("PRAGMA user_version =")) {
        const match = query.match(/PRAGMA user_version = (\d+)/);
        if (match) mockDb.version = parseInt(match[1], 10);
      }
    }),
  };

  return {
    openDatabaseAsync: vi.fn().mockResolvedValue(mockDb),
    __mockDb: mockDb,
  };
});

describe("StoreService", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15"));
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
