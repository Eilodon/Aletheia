import { describe, it, expect, vi, beforeEach } from "vitest";
import { aiClient } from "../lib/services/ai-client";

const { aiRuntimeMocks } = vi.hoisted(() => ({
  aiRuntimeMocks: {
    isNativeAvailable: vi.fn().mockReturnValue(false),
    ensureReady: vi.fn(),
    setApiKey: vi.fn(),
    requestInterpretation: vi.fn(),
    startInterpretationStream: vi.fn(),
    pollInterpretationStream: vi.fn(),
    cancelInterpretationStream: vi.fn(),
  },
}));

vi.mock("@/lib/services/ai-runtime", () => ({
  aiRuntime: aiRuntimeMocks,
}));

describe("AIClientService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiRuntimeMocks.isNativeAvailable.mockReturnValue(false);
    aiRuntimeMocks.requestInterpretation.mockReset();
  });

  describe("getFallbackInterpretation — CONTENT-03", () => {
    it("returns a source-specific prompt when sourceFallbackPrompts provided", async () => {
      // ARRANGE
      const request = {
        passage: {
          id: "passage-1",
          source_id: "i_ching",
          reference: "Hexagram 1",
          text: "Test passage text",
          context: "Test context",
          resonance_context: undefined,
        },
        symbol: {
          id: "candle",
          display_name: "Ngọn nến",
          flavor_text: "Light",
        },
        sourceFallbackPrompts: ["Bạn đang chống lại hay chấp nhận?"],
      };

      // ACT: Call requestInterpretation which internally calls getFallbackInterpretation
      const result = await aiClient.requestInterpretation(request);

      // ASSERT
      expect(result.usedFallback).toBe(true);
      expect(result.chunks[0]).toBe("Bạn đang chống lại hay chấp nhận?");
    });

    it("returns Vietnamese generic fallback when sourceLanguage is 'vi'", async () => {
      // ARRANGE
      const request = {
        passage: {
          id: "passage-1",
          source_id: "i_ching",
          reference: "Hexagram 1",
          text: "Test passage text",
          context: "Test context",
          resonance_context: undefined,
        },
        symbol: {
          id: "candle",
          display_name: "Ngọn nến",
          flavor_text: "Light",
        },
        sourceFallbackPrompts: [],
        sourceLanguage: "vi",
      };

      // ACT
      const result = await aiClient.requestInterpretation(request);

      // ASSERT
      expect(result.usedFallback).toBe(true);
      expect(result.chunks[0]).toContain("Hãy để những lời này lắng xuống");
    });

    it("returns English generic fallback when sourceLanguage is 'en'", async () => {
      // ARRANGE
      const request = {
        passage: {
          id: "passage-1",
          source_id: "bible_kjv",
          reference: "John 1:1",
          text: "Test passage text",
          context: "Test context",
          resonance_context: undefined,
        },
        symbol: {
          id: "candle",
          display_name: "Ngọn nến",
          flavor_text: "Light",
        },
        sourceFallbackPrompts: [],
        sourceLanguage: "en",
      };

      // ACT
      const result = await aiClient.requestInterpretation(request);

      // ASSERT
      expect(result.usedFallback).toBe(true);
      expect(result.chunks[0]).toContain("Take a moment to sit with these words");
    });

    it("never returns 'Take a moment to reflect on this passage.' (old default)", async () => {
      // ARRANGE: Test with various combinations
      const requests = [
        {
          passage: {
            id: "passage-1",
            source_id: "i_ching",
            reference: "Hexagram 1",
            text: "Test passage text",
            context: "Test context",
            resonance_context: undefined,
          },
          symbol: {
            id: "candle",
            display_name: "Ngọn nến",
            flavor_text: "Light",
          },
          sourceFallbackPrompts: [],
          sourceLanguage: "vi",
        },
        {
          passage: {
            id: "passage-2",
            source_id: "tao_te_ching",
            reference: "Chapter 1",
            text: "Test passage text",
            context: "Test context",
            resonance_context: undefined,
          },
          symbol: {
            id: "key",
            display_name: "Chìa khóa",
            flavor_text: "Opening",
          },
          sourceFallbackPrompts: undefined,
          sourceLanguage: undefined,
        },
        {
          passage: {
            id: "passage-3",
            source_id: "bible_kjv",
            reference: "John 1:1",
            text: "Test passage text",
            context: "Test context",
            resonance_context: undefined,
          },
          symbol: {
            id: "dawn",
            display_name: "Bình minh",
            flavor_text: "Beginning",
          },
        },
      ];

      // ACT & ASSERT
      for (const request of requests) {
        const result = await aiClient.requestInterpretation(request);
        expect(result.chunks[0]).not.toBe("Take a moment to reflect on this passage.");
      }
    });
  });

  describe("native runtime adapter", () => {
    it("delegates interpretation requests through aiRuntime instead of direct native imports", async () => {
      aiRuntimeMocks.isNativeAvailable.mockReturnValue(true);
      aiRuntimeMocks.requestInterpretation.mockResolvedValue({
        chunks: ["native response"],
        usedFallback: false,
      });

      const result = await aiClient.requestInterpretation({
        passage: {
          id: "passage-4",
          source_id: "i_ching",
          reference: "Hexagram 2",
          text: "Native test passage",
          context: "Native context",
          resonance_context: undefined,
        },
        symbol: {
          id: "dawn",
          display_name: "Bình minh",
          flavor_text: "Beginning",
        },
      });

      expect(aiRuntimeMocks.requestInterpretation).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        chunks: ["native response"],
        usedFallback: false,
      });
    });
  });
});
