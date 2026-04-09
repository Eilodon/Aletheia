import { existsSync } from "node:fs";
import path from "node:path";

type CheckState = "ready" | "warning" | "blocked";

interface ReleaseCheck {
  state: CheckState;
  detail: string;
}

const projectRoot = process.cwd();

function readinessForFile(relativePath: string, detail: string): ReleaseCheck {
  return existsSync(path.join(projectRoot, relativePath))
    ? { state: "ready", detail }
    : { state: "blocked", detail: `Missing ${relativePath}` };
}

export function getReleaseReadiness() {
  const checks = {
    androidRustArtifact: readinessForFile(
      "artifacts/android/jniLibs/arm64-v8a/libaletheia_core.so",
      "Rust Android artifact is present.",
    ),
    uniffiBindings: readinessForFile(
      "modules/aletheia-core-module/src/index.ts",
      "Generated UniFFI bindings are present.",
    ),
    bundledContentArtifact: readinessForFile(
      "core/content/bundled-content.json",
      "Canonical bundled content artifact is present.",
    ),
    generatedTsContent: readinessForFile(
      "lib/data/seed-data.generated.ts",
      "Generated TypeScript content mirror is present.",
    ),
    giftBackend: process.env.EXPO_PUBLIC_GIFT_BACKEND_URL
      ? {
          state: "ready" as const,
          detail: "Gift backend URL is configured.",
        }
      : {
          state: "warning" as const,
          detail: "Gift backend URL is not configured.",
        },
    aiProviderConfig:
      process.env.BUILT_IN_FORGE_API_URL || process.env.AI_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL
        ? {
            state: "ready" as const,
            detail: "AI provider config surface is configured.",
          }
        : {
            state: "warning" as const,
            detail: "No AI provider config URL is configured.",
          },
    betaScope: {
      state: "ready" as const,
      detail: "Active release surfaces are Android and web. iOS remains explicitly out of beta scope.",
    },
  };

  const values = Object.values(checks);
  const blockers = values.filter((check) => check.state === "blocked").map((check) => check.detail);
  const warnings = values.filter((check) => check.state === "warning").map((check) => check.detail);
  const readyCount = values.filter((check) => check.state === "ready").length;

  return {
    ok: blockers.length === 0,
    score: Math.round((readyCount / values.length) * 100),
    timestamp: Date.now(),
    blockers,
    warnings,
    checks,
  };
}
