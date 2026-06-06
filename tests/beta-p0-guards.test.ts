import fs from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string): string {
  return fs.readFileSync(path, "utf8");
}

describe("beta P0 contract guards", () => {
  it("uses ai_calls_today for AI quota guards", () => {
    const blueprint = read("docs/CORE/BLUEPRINT.md");
    expect(blueprint).not.toContain("readings_today < FREE_AI_PER_DAY");
    expect(blueprint).toContain("ai_calls_today < FREE_AI_PER_DAY");
  });

  it("separates reading and AI daily limit errors", () => {
    const contracts = read("docs/CORE/CONTRACTS.md");
    const rustContracts = read("core/src/contracts.rs");
    const bridge = read("lib/native/bridge.ts");

    expect(contracts).toContain("AiDailyLimitReached");
    expect(rustContracts).toContain("AiDailyLimitReached");
    expect(bridge).toContain("ERR_AI_DAILY_LIMIT_REACHED");
  });

  it("defines a cloud consent privacy mode before cloud fallback", () => {
    const contracts = read("docs/CORE/CONTRACTS.md");
    const orchestrator = read("lib/services/interpretation-orchestrator.ts");

    expect(contracts).toContain("AiPrivacyMode");
    expect(orchestrator).toContain("ask_before_cloud");
    expect(orchestrator).toContain("cloudConsent");
  });

  it("uses a manifest with exact hash validation for local model readiness", () => {
    const localModelConfig = read("lib/constants/local-model.ts");
    const localInference = read("modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/LocalInferenceEngine.kt");

    expect(localModelConfig).toContain("MANIFEST");
    expect(localModelConfig).toContain("sha256");
    expect(localInference).toContain("computeSha256");
    expect(localInference).toContain("manifest");
  });

  it("excludes sensitive Android app data from platform auto backup", () => {
    const plugin = read("modules/aletheia-core-module/plugin/index.js");
    expect(plugin).toContain('application.$["android:allowBackup"] = "false"');
    expect(plugin).toContain('application.$["android:dataExtractionRules"] = "@xml/data_extraction_rules"');
    expect(plugin).toContain("<data-extraction-rules>");
  });

  it("exposes entitlement-safe source lookup without trusting a UI boolean", () => {
    const contracts = read("docs/CORE/CONTRACTS.md");
    const nativeClient = read("lib/native/aletheia-core.ts");

    expect(contracts).toContain("get_sources_for_user");
    expect(nativeClient).toContain("getSourcesForUser");
  });

  it("persists AI interpretation text in a child record", () => {
    const contracts = read("docs/CORE/CONTRACTS.md");
    const rustContracts = read("core/src/contracts.rs");
    const rustLib = read("core/src/lib.rs");
    const rustStore = read("core/src/store.rs");
    const nativeClient = read("lib/native/aletheia-core.ts");
    const coreStore = read("lib/services/core-store.ts");

    expect(contracts).toContain("Interpretation {");
    expect(contracts).toContain("save_interpretation(interpretation :: Ref<Interpretation>)");
    expect(contracts).toContain("get_interpretation_by_reading_id(reading_id :: string)");
    expect(rustContracts).toContain("struct Interpretation");
    expect(rustLib).toContain("pub fn save_interpretation");
    expect(rustLib).toContain("pub fn get_interpretation_by_reading_id");
    expect(rustStore).toContain("CREATE TABLE IF NOT EXISTS interpretations");
    expect(nativeClient).toContain("saveInterpretation");
    expect(nativeClient).toContain("getInterpretationByReadingId");
    expect(coreStore).toContain("saveInterpretation");
  });
});
