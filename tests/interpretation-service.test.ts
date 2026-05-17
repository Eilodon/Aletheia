import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const baseRequest = {
  passage: {
    id: "p1",
    source_id: "i_ching",
    reference: "Hexagram 1",
    text: "Sự kiên nhẫn mở ra điều chưa rõ.",
    context: "",
    resonance_context: "",
  },
  symbol: {
    id: "water",
    display_name: "Nước",
    flavor_text: "Flow",
  },
  situationText: "Tôi đang phân vân giữa ở lại và rời đi.",
  sourceLanguage: "vi",
  sourceFallbackPrompts: ["Fallback prompt"],
  userIntent: "clarity" as const,
  mode: "auto" as const,
};

describe("interpretationService", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = {
      ...originalEnv,
      OLLAMA_BASE_URL: "http://127.0.0.1:11434",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("prefers a small supported ollama model over unrelated installed models", async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/tags")) {
        return new Response(
          JSON.stringify({
            models: [
              { name: "deepseek-coder-v2:16b" },
              { name: "qwen2.5:1.5b" },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/generate")) {
        expect(init?.body).toContain("\"model\":\"qwen2.5:1.5b\"");
        return new Response(
          JSON.stringify({
            response:
              "Tôi đang đứng giữa hai bờ của một dòng nước.\n\n[Lúc này điều gì cần được nhìn rõ hơn?]",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { requestInterpretation } = await import("../server/_core/interpretationService");
    const result = await requestInterpretation(baseRequest);

    expect(result.usedFallback).toBe(false);
    expect(result.mode).toBe("local");
    expect(result.provider).toBe("ollama");
    expect(result.model).toBe("qwen2.5:1.5b");
    expect(result.text).toContain("*Lúc này điều gì cần được nhìn rõ hơn?*");
  });

  it("falls back to static prompts when local and cloud paths both fail", async () => {
    process.env.INTERPRETATION_CLOUD_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "test-key";

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith("/api/tags") || url.endsWith("/api/generate") || url.includes("api.openai.com")) {
        throw new Error(`Simulated failure for ${url}`);
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { requestInterpretation } = await import("../server/_core/interpretationService");
    const result = await requestInterpretation(baseRequest);

    expect(result.usedFallback).toBe(true);
    expect(result.mode).toBe("fallback");
    expect(result.provider).toBe("fallback");
    expect(result.text).toBe("Fallback prompt");
  });

  it("appends a closing reflective question when the local model omits one", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith("/api/tags")) {
        return new Response(
          JSON.stringify({
            models: [{ name: "qwen2.5:1.5b" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/generate")) {
        return new Response(
          JSON.stringify({
            response:
              "Tôi đang chạm vào một ngưỡng chuyển động rất mỏng, nơi ở lại và rời đi đều đòi hỏi sự thành thật.",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { requestInterpretation } = await import("../server/_core/interpretationService");
    const result = await requestInterpretation(baseRequest);

    expect(result.usedFallback).toBe(false);
    expect(result.text).toContain("*Lúc này điều gì cần được nhìn rõ hơn?*");
  });

  it("moves an inline trailing question onto its own final line", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith("/api/tags")) {
        return new Response(
          JSON.stringify({
            models: [{ name: "qwen2.5:1.5b" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/generate")) {
        return new Response(
          JSON.stringify({
            response:
              "Đoạn này chạm vào cảm giác kiệt sức khi cứ cố giữ điều đã đổi khác. Nó không bảo bạn buông ngay, nhưng buộc bạn nhìn thẳng vào cái giá của việc níu lại. : Điều gì ở đây đã không còn thật với bạn?",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { requestInterpretation } = await import("../server/_core/interpretationService");
    const result = await requestInterpretation(baseRequest);

    expect(result.usedFallback).toBe(false);
    expect(result.text).toContain("\n\n*Điều gì ở đây đã không còn thật với bạn?*");
    expect(result.text).not.toContain(" : Điều gì ở đây đã không còn thật với bạn?");
  });
});
