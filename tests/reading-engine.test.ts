import { describe, it, expect, vi, beforeEach } from "vitest";
import { readingEngine } from "../lib/services/reading-engine";
import { AiPrivacyMode, NotificationPrivacy, SubscriptionTier, ErrorCode, SourceType, SymbolMethod, Tradition } from "../lib/types";

vi.mock("@/lib/services/store", () => ({
  store: {
    getUserState: vi.fn(),
    getSource: vi.fn(),
    getRandomSource: vi.fn(),
    getRandomSourceWeighted: vi.fn(),
    getRandomPassage: vi.fn(),
    getRandomPassageExcluding: vi.fn(),
    insertReading: vi.fn(),
    incrementReadingsToday: vi.fn(),
    incrementAICallsToday: vi.fn(),
    incrementSessionCount: vi.fn(),
  },
}));

vi.mock("@/lib/services/theme-engine", () => ({
  themeEngine: {
    getRandomTheme: vi.fn(),
  },
}));

vi.mock("@/lib/services/current-user-id", () => ({
  getCurrentUserId: vi.fn().mockResolvedValue("test-user-123"),
}));

vi.mock("@/lib/utils/novelty-guard", () => ({
  getRecentPassageIds: vi.fn().mockResolvedValue([]),
  recordPassageId: vi.fn().mockResolvedValue(undefined),
}));

import { store } from "@/lib/services/store";
import { themeEngine } from "@/lib/services/theme-engine";
import { getCurrentUserId } from "@/lib/services/current-user-id";

describe("ReadingEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("performReading — daily limit", () => {
    it("throws DailyLimitReached when free user has used all readings today", async () => {
      // ARRANGE
      vi.mocked(store.getUserState).mockResolvedValue({
        user_id: "test-user-123",
        subscription_tier: SubscriptionTier.Free,
        readings_today: 3, // FREE_READINGS_PER_DAY = 3
        ai_calls_today: 0,
        session_count: 0,
        last_reading_date: "2025-06-15",
        notification_enabled: true,
        notification_time: "09:00",
        preferred_language: "vi",
        dark_mode: false,
        onboarding_complete: false,
        user_intent: undefined,
	        weekly_summary_enabled: false,
	        ai_privacy_mode: AiPrivacyMode.AskBeforeCloud,
	        notification_privacy: NotificationPrivacy.FullText,
      });

      // ACT & ASSERT
      await expect(readingEngine.performReading()).rejects.toMatchObject({
        code: ErrorCode.DailyLimitReached,
      });
    });

    it("does NOT block when readings_today < FREE_READINGS_PER_DAY", async () => {
      // ARRANGE
      vi.mocked(store.getUserState).mockResolvedValue({
        user_id: "test-user-123",
        subscription_tier: SubscriptionTier.Free,
        readings_today: 1,
        ai_calls_today: 0,
        session_count: 0,
        last_reading_date: "2025-06-15",
        notification_enabled: true,
        notification_time: "09:00",
        preferred_language: "vi",
        dark_mode: false,
        onboarding_complete: false,
        user_intent: undefined,
	        weekly_summary_enabled: false,
	        ai_privacy_mode: AiPrivacyMode.AskBeforeCloud,
	        notification_privacy: NotificationPrivacy.FullText,
      });

      vi.mocked(store.getRandomSourceWeighted).mockResolvedValue({
        id: "i_ching",
        name: "I Ching",
        tradition: Tradition.Chinese,
        language: "vi",
        passage_count: 10,
        is_bundled: true,
        is_premium: false,
        fallback_prompts: [],
        source_type: SourceType.Bibliomancy,
      });

      vi.mocked(themeEngine.getRandomTheme).mockResolvedValue({
        id: "moments",
        name: "Khoảnh khắc",
        is_premium: false,
        pack_id: undefined,
        price_usd: undefined,
        symbols: [
          { id: "candle", display_name: "Ngọn nến", flavor_text: "Light in darkness" },
          { id: "key", display_name: "Chìa khóa", flavor_text: "Opening what is locked" },
          { id: "dawn", display_name: "Bình minh", flavor_text: "Beginning anew" },
        ],
      });

      // ACT
      const session = await readingEngine.performReading();

      // ASSERT
      expect(session).toBeDefined();
      expect(session.symbols).toHaveLength(3);
    });

    it("does NOT block Pro tier regardless of readings_today", async () => {
      // ARRANGE
      vi.mocked(store.getUserState).mockResolvedValue({
        user_id: "test-user-123",
        subscription_tier: SubscriptionTier.Pro,
        readings_today: 99,
        ai_calls_today: 0,
        session_count: 0,
        last_reading_date: "2025-06-15",
        notification_enabled: true,
        notification_time: "09:00",
        preferred_language: "vi",
        dark_mode: false,
        onboarding_complete: false,
        user_intent: undefined,
	        weekly_summary_enabled: false,
	        ai_privacy_mode: AiPrivacyMode.AskBeforeCloud,
	        notification_privacy: NotificationPrivacy.FullText,
      });

      vi.mocked(store.getRandomSourceWeighted).mockResolvedValue({
        id: "i_ching",
        name: "I Ching",
        tradition: Tradition.Chinese,
        language: "vi",
        passage_count: 10,
        is_bundled: true,
        is_premium: false,
        fallback_prompts: [],
        source_type: SourceType.Bibliomancy,
      });

      vi.mocked(themeEngine.getRandomTheme).mockResolvedValue({
        id: "moments",
        name: "Khoảnh khắc",
        is_premium: false,
        pack_id: undefined,
        price_usd: undefined,
        symbols: [
          { id: "candle", display_name: "Ngọn nến", flavor_text: "Light in darkness" },
          { id: "key", display_name: "Chìa khóa", flavor_text: "Opening what is locked" },
          { id: "dawn", display_name: "Bình minh", flavor_text: "Beginning anew" },
        ],
      });

      // ACT
      const session = await readingEngine.performReading();

      // ASSERT
      expect(session).toBeDefined();
    });
  });

  describe("chooseSymbol — BUG-02 regression", () => {
    it("only accepts symbol IDs that are in the current session", async () => {
      // ARRANGE
      const session = {
        temp_id: "temp-123",
        source: {
          id: "i_ching",
          name: "I Ching",
          tradition: Tradition.Chinese,
          language: "vi",
          passage_count: 10,
          is_bundled: true,
          is_premium: false,
          fallback_prompts: [],
          source_type: SourceType.Bibliomancy,
        },
        theme: {
          id: "moments",
          name: "Khoảnh khắc",
          is_premium: false,
          pack_id: undefined,
          price_usd: undefined,
          symbols: [
            { id: "candle", display_name: "Ngọn nến", flavor_text: "Light" },
            { id: "key", display_name: "Chìa khóa", flavor_text: "Opening" },
            { id: "dawn", display_name: "Bình minh", flavor_text: "Beginning" },
          ],
        },
        symbols: [
          { id: "candle", display_name: "Ngọn nến", flavor_text: "Light" },
          { id: "key", display_name: "Chìa khóa", flavor_text: "Opening" },
          { id: "dawn", display_name: "Bình minh", flavor_text: "Beginning" },
        ],
        situation_text: undefined,
        user_intent: undefined,
        started_at: Date.now(),
      };

      vi.mocked(store.getRandomPassageExcluding).mockResolvedValue({
        id: "passage-1",
        source_id: "i_ching",
        reference: "Hexagram 1",
        text: "Test passage text",
        context: "Test context",
        resonance_context: undefined,
      });

      // ACT & ASSERT: "mirror" is not in session.symbols
      await expect(
        readingEngine.chooseSymbol(session, "mirror", SymbolMethod.Manual)
      ).rejects.toMatchObject({
        code: ErrorCode.SymbolInvalid,
      });
    });

    it("accepts a symbol ID that is in the session", async () => {
      // ARRANGE
      const session = {
        temp_id: "temp-123",
        source: {
          id: "i_ching",
          name: "I Ching",
          tradition: Tradition.Chinese,
          language: "vi",
          passage_count: 10,
          is_bundled: true,
          is_premium: false,
          fallback_prompts: [],
          source_type: SourceType.Bibliomancy,
        },
        theme: {
          id: "moments",
          name: "Khoảnh khắc",
          is_premium: false,
          pack_id: undefined,
          price_usd: undefined,
          symbols: [
            { id: "candle", display_name: "Ngọn nến", flavor_text: "Light" },
            { id: "key", display_name: "Chìa khóa", flavor_text: "Opening" },
            { id: "dawn", display_name: "Bình minh", flavor_text: "Beginning" },
          ],
        },
        symbols: [
          { id: "candle", display_name: "Ngọn nến", flavor_text: "Light" },
          { id: "key", display_name: "Chìa khóa", flavor_text: "Opening" },
          { id: "dawn", display_name: "Bình minh", flavor_text: "Beginning" },
        ],
        situation_text: undefined,
        user_intent: undefined,
        started_at: Date.now(),
      };

      vi.mocked(store.getRandomPassageExcluding).mockResolvedValue({
        id: "passage-1",
        source_id: "i_ching",
        reference: "Hexagram 1",
        text: "Test passage text",
        context: "Test context",
        resonance_context: undefined,
      });

      // ACT
      const result = await readingEngine.chooseSymbol(session, "candle", SymbolMethod.Manual);

      // ASSERT
      expect(result.passage).toBeDefined();
      expect(result.reading_id).toBe("temp-123");
    });
  });

  describe("getCurrentUserId — ARCH-05 regression", () => {
    it("uses getCurrentUserId from current-user-id module, not 'local-user'", async () => {
      // ARRANGE
      vi.mocked(store.getUserState).mockResolvedValue({
        user_id: "test-user-123",
        subscription_tier: SubscriptionTier.Free,
        readings_today: 0,
        ai_calls_today: 0,
        session_count: 0,
        last_reading_date: "2025-06-15",
        notification_enabled: true,
        notification_time: "09:00",
        preferred_language: "vi",
        dark_mode: false,
        onboarding_complete: false,
        user_intent: undefined,
	        weekly_summary_enabled: false,
	        ai_privacy_mode: AiPrivacyMode.AskBeforeCloud,
	        notification_privacy: NotificationPrivacy.FullText,
      });

      vi.mocked(store.getRandomSourceWeighted).mockResolvedValue({
        id: "i_ching",
        name: "I Ching",
        tradition: Tradition.Chinese,
        language: "vi",
        passage_count: 10,
        is_bundled: true,
        is_premium: false,
        fallback_prompts: [],
        source_type: SourceType.Bibliomancy,
      });

      vi.mocked(themeEngine.getRandomTheme).mockResolvedValue({
        id: "moments",
        name: "Khoảnh khắc",
        is_premium: false,
        pack_id: undefined,
        price_usd: undefined,
        symbols: [
          { id: "candle", display_name: "Ngọn nến", flavor_text: "Light" },
          { id: "key", display_name: "Chìa khóa", flavor_text: "Opening" },
          { id: "dawn", display_name: "Bình minh", flavor_text: "Beginning" },
        ],
      });

      // ACT
      await readingEngine.performReading();

      // ASSERT: Verify getCurrentUserId was called (the mock returns "test-user-123")
      expect(getCurrentUserId).toHaveBeenCalled();

      // Verify store.getUserState was called with "test-user-123", NOT "local-user"
      expect(store.getUserState).toHaveBeenCalledWith("test-user-123");

      // Explicitly verify it was NOT called with "local-user"
      const calls = vi.mocked(store.getUserState).mock.calls;
      const userIdArgs = calls.map((call) => call[0]);
      expect(userIdArgs).not.toContain("local-user");
    });
  });
});
