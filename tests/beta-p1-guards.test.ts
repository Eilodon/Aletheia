import fs from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string): string {
  return fs.readFileSync(path, "utf8");
}

describe("beta P1 hardening guards", () => {
  it("defines notification privacy as a persisted user-state contract", () => {
    const contracts = read("docs/CORE/CONTRACTS.md");
    const rustContracts = read("core/src/contracts.rs");
    const tsTypes = read("lib/types.ts");

    for (const source of [contracts, rustContracts, tsTypes]) {
      expect(source).toContain("NotificationPrivacy");
      expect(source).toContain("full_text");
      expect(source).toContain("discreet");
    }

    expect(contracts).toContain("notification_privacy");
    expect(rustContracts).toContain("notification_privacy");
    expect(tsTypes).toContain("notification_privacy");
  });

  it("keeps notification privacy scheduling testable outside Expo runtime", () => {
    const service = read("lib/services/notification-service.ts");

    expect(service).toContain("buildDailyNotificationContent");
    expect(service).toContain("buildWeeklySummaryNotificationContent");
    expect(service).toContain("NotificationPrivacy.Off");
    expect(service).toContain("NotificationPrivacy.Discreet");
  });

  it("keeps the daily notification matrix large enough to avoid obvious yearly repetition", () => {
    const generated = read("lib/data/seed-data.generated.ts");
    const contracts = read("core/src/contracts.rs");
    const entries = [...generated.matchAll(/"symbol_id": "([^"]+)"[\s\S]*?"question": "([^"]+)"/g)];
    const uniqueEntries = new Set(entries.map((entry) => `${entry[1]}::${entry[2]}`));

    expect(entries.length).toBeGreaterThanOrEqual(180);
    expect(uniqueEntries.size).toBe(entries.length);
    expect(contracts).toContain("NOTIFICATION_MATRIX_SIZE: u16 = 216");
  });

  it("does not log raw gift tokens in Rust gift client", () => {
    const giftClient = read("core/src/gift_client.rs");

    expect(giftClient).not.toContain('info!("Created gift: {}", token)');
    expect(giftClient).not.toContain('info!("Redeemed gift: {}", token)');
    expect(giftClient).toContain("redact_token");
  });

  it("documents resolved and still-open audit status in the P1 report", () => {
    const report = read("docs/p1-rui-ro-cao-nhung.md");

    expect(report).toContain("Status Update");
    expect(report).toContain("P1-3");
    expect(report).toContain("P1-5 resolved");
    expect(report).toContain("resolved");
    expect(report).toContain("NotificationPrivacy");
  });

  it("separates first-token, idle, total, and reveal pacing timeout semantics", () => {
    const contracts = read("docs/CORE/CONTRACTS.md");
    const rustContracts = read("core/src/contracts.rs");
    const tsConstants = read("lib/constants.ts");
    const orchestrator = read("lib/services/interpretation-orchestrator.ts");
    const aiClient = read("lib/services/ai-client.ts");

    for (const name of [
      "AI_FIRST_TOKEN_TIMEOUT_MS",
      "AI_PROVIDER_IDLE_TIMEOUT_MS",
      "AI_PROVIDER_TOTAL_TIMEOUT_MS",
      "AI_REVEAL_PACING_MS",
    ]) {
      expect(contracts).toContain(name);
      expect(rustContracts).toContain(name);
      expect(tsConstants).toContain(name);
    }

    expect(orchestrator).toContain("AI_FIRST_TOKEN_TIMEOUT_MS");
    expect(orchestrator).toContain("AI_PROVIDER_TOTAL_TIMEOUT_MS");
    expect(orchestrator).toContain("AI_REVEAL_PACING_MS");
    expect(aiClient).toContain("AI_PROVIDER_IDLE_TIMEOUT_MS");
  });

  it("keeps content provenance documented for every bundled source", () => {
    const generated = read("lib/data/seed-data.generated.ts");
    const provenance = read("docs/CONTENT_PROVENANCE.md");
    const sourceIds = [...generated.matchAll(/"id": "([^"]+)"[\s\S]*?"source_type":/g)].map(
      (entry) => entry[1],
    );

    expect(sourceIds.length).toBeGreaterThan(0);
    for (const sourceId of sourceIds) {
      expect(provenance).toContain(`| ${sourceId} |`);
    }
    expect(provenance).not.toContain("| unknown |");
  });

  it("does not leave the active beta flow in SourceSelection after a source is already chosen", () => {
    const readingContext = read("lib/context/reading-context.tsx");

    expect(readingContext).toContain("setCurrentState(ReadingState.WildcardReveal)");
    expect(readingContext).not.toContain("setCurrentState(ReadingState.SourceSelection);");
  });
});
