import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";

const streamInterpretationMock = vi.fn();
const requestInterpretationMock = vi.fn();

vi.mock("../server/_core/interpretationService", async () => {
  const actual = await vi.importActual<typeof import("../server/_core/interpretationService")>(
    "../server/_core/interpretationService",
  );

  return {
    ...actual,
    requestInterpretation: requestInterpretationMock,
    streamInterpretation: streamInterpretationMock,
  };
});

describe("/api/interpret/stream", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("streams ndjson chunks and done event", async () => {
    streamInterpretationMock.mockImplementation(async (_request, onEvent) => {
      onEvent({ type: "chunk", chunk: "Đây là " });
      onEvent({ type: "chunk", chunk: "một phản chiếu." });
      onEvent({
        type: "done",
        text: "Đây là một phản chiếu.\n\n*Lúc này điều gì cần được nhìn rõ hơn?*",
        usedFallback: false,
        mode: "local",
        provider: "ollama",
        model: "qwen2.5:1.5b",
      });

      return {
        text: "Đây là một phản chiếu.\n\n*Lúc này điều gì cần được nhìn rõ hơn?*",
        chunks: ["Đây là ", "một phản chiếu."],
        usedFallback: false,
        mode: "local",
        provider: "ollama",
        model: "qwen2.5:1.5b",
      };
    });

    const { createApp } = await import("../server/_core/index");
    const app = createApp();
    const server = createServer(app);

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Test server did not expose a numeric port.");
    }

    try {
      const appId = process.env.APP_ID || process.env.EXPO_PUBLIC_APP_ID || "aletheia-beta";
      const response = await fetch(`http://127.0.0.1:${address.port}/api/interpret/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
          "X-Aletheia-App-Id": appId,
          "X-Aletheia-User-Id": "device_test-user",
        },
        body: JSON.stringify({
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
          userIntent: "clarity",
          mode: "auto",
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/x-ndjson");

      const body = await response.text();
      const lines = body
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));

      expect(lines).toEqual([
        { type: "chunk", chunk: "Đây là " },
        { type: "chunk", chunk: "một phản chiếu." },
        {
          type: "done",
          text: "Đây là một phản chiếu.\n\n*Lúc này điều gì cần được nhìn rõ hơn?*",
          usedFallback: false,
          mode: "local",
          provider: "ollama",
          model: "qwen2.5:1.5b",
        },
      ]);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
