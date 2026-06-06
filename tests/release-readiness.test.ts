import { describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "EXPO_PUBLIC_EAS_PROJECT_ID",
  "EXPO_PUBLIC_OWNER_NAME",
  "OWNER_NAME",
  "JWT_SECRET",
  "EXPO_PUBLIC_SENTRY_DSN",
  "EXPO_PUBLIC_POSTHOG_API_KEY",
  "EXPO_PUBLIC_GIFT_BACKEND_URL",
  "EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID",
  "BUILT_IN_FORGE_API_URL",
  "AI_API_URL",
  "EXPO_PUBLIC_API_BASE_URL",
];

describe("release readiness gates", () => {
  it("blocks strict beta release when optional paid surfaces lack backend/payment config", async () => {
    for (const key of ENV_KEYS) {
      vi.stubEnv(key, "");
    }

    const { getReleaseReadiness } = await import("../server/_core/releaseReadiness");
    const report = getReleaseReadiness({ strict: true });

    expect(report.ok).toBe(false);
    expect(report.blockers).toContain("Gift backend URL is not configured for strict beta release.");
    expect(report.blockers).toContain("RevenueCat Android key is not configured for strict beta release.");
    expect(report.checks.contentProvenance.state).toBe("ready");
    expect(report.checks.aiEvalDataset.state).toBe("ready");
    expect(report.checks.legacyInterpretationRoute.state).toBe("ready");
  });
});
