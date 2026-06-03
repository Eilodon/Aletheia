import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { Request } from "express";

import { getAiRequesterKey } from "../server/_core/rateLimit";
import type { TrpcContext } from "../server/_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      hostname: "localhost",
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("security audit regressions", () => {
  it("requires at least one production CORS origin during env validation", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "x".repeat(32));
    vi.stubEnv("APP_ID", "prod-app");
    vi.stubEnv("OAUTH_SERVER_URL", "https://oauth.example.com");
    vi.stubEnv("OWNER_OPEN_ID", "owner-open-id");
    vi.stubEnv("CORS_ALLOWED_ORIGINS", "");

    const { validateServerEnv } = await import("../server/_core/env");

    expect(() => validateServerEnv()).toThrow(/CORS_ALLOWED_ORIGINS/);

    vi.unstubAllEnvs();
  });

  it("does not expose provider API keys through aiConfig", async () => {
    vi.resetModules();
    vi.stubEnv("ALETHEIA_CLAUDE_API_KEY", "claude-secret-value");
    vi.stubEnv("ALETHEIA_OPENAI_API_KEY", "openai-secret-value");
    vi.stubEnv("ALETHEIA_GEMINI_API_KEY", "gemini-secret-value");

    const { appRouter } = await import("../server/routers");
    const caller = appRouter.createCaller(createAuthContext());

    const result = await caller.aiConfig.getProviderConfig();

    expect(result).toEqual({
      claude: "configured",
      gpt4: "configured",
      gemini: "configured",
    });
    expect(JSON.stringify(result)).not.toContain("secret-value");

    vi.unstubAllEnvs();
  });

  it("rejects unconfigured browser origins", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CORS_ALLOWED_ORIGINS", "https://app.example.com");

    const { createApp } = await import("../server/_core/index");
    const app = createApp();
    const server = createServer(app);

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Test server did not expose a numeric port.");
    }

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/health`, {
        headers: { Origin: "https://evil.example.com" },
      });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Origin not allowed" });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      vi.unstubAllEnvs();
    }
  });

  it("rate-limit keys do not contain raw bearer tokens", () => {
    const token = "sensitive-session-token";
    const req = {
      headers: { authorization: `Bearer ${token}` },
      header: () => undefined,
      ip: "203.0.113.10",
    } as unknown as Request;

    const key = getAiRequesterKey(req);

    expect(key).not.toContain(token);
    expect(key).toBe(`auth:${createHash("sha256").update(token).digest("hex").slice(0, 16)}`);
  });
});

describe("generated contract types", () => {
  it("does not parse Rust enum comments or integer aliases as TypeScript types", () => {
    const types = readFileSync("lib/types.ts", "utf8");

    expect(types).not.toContain('  Model = "model"');
    expect(types).not.toContain("model_size_bytes: u64");
    expect(types).toContain('NotDownloaded = "not_downloaded"');
    expect(types).toContain('AiStreaming = "ai_streaming"');
    expect(types).toContain("export interface AletheiaError");
    expect(types).toContain("model_size_bytes: number");
  });
});
