import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type CheckState = "ready" | "warning" | "blocked";

interface ReleaseCheck {
  state: CheckState;
  detail: string;
}

const currentFileDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(currentFileDir, "..", "..");

function readinessForFile(relativePath: string, detail: string): ReleaseCheck {
  return existsSync(path.join(projectRoot, relativePath))
    ? { state: "ready", detail }
    : { state: "blocked", detail: `Missing ${relativePath}` };
}

function readinessForEnv(
  names: string[],
  readyDetail: string,
  missingDetail: string,
  missingState: CheckState,
): ReleaseCheck {
  const isConfigured = names.some((name) => {
    const value = process.env[name];
    return typeof value === "string" && value.trim().length > 0;
  });

  return isConfigured
    ? { state: "ready", detail: readyDetail }
    : { state: missingState, detail: missingDetail };
}

export function getReleaseReadiness(options?: { strict?: boolean }) {
  const strict = options?.strict ?? false;
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
    easProjectId: readinessForEnv(
      ["EXPO_PUBLIC_EAS_PROJECT_ID"],
      "EAS project ID is configured.",
      "EXPO_PUBLIC_EAS_PROJECT_ID is not configured.",
      strict ? "blocked" : "warning",
    ),
    ownerName: readinessForEnv(
      ["EXPO_PUBLIC_OWNER_NAME", "OWNER_NAME"],
      "Expo owner is configured.",
      "EXPO_PUBLIC_OWNER_NAME is not configured.",
      strict ? "blocked" : "warning",
    ),
    jwtSecret: readinessForEnv(
      ["JWT_SECRET"],
      "JWT secret is configured.",
      "JWT_SECRET is not configured.",
      strict ? "blocked" : "warning",
    ),
    sentryDsn: readinessForEnv(
      ["EXPO_PUBLIC_SENTRY_DSN"],
      "Sentry DSN is configured.",
      "Sentry DSN is not configured.",
      strict ? "blocked" : "warning",
    ),
    posthogConfig: readinessForEnv(
      ["EXPO_PUBLIC_POSTHOG_API_KEY"],
      "PostHog API key is configured.",
      "PostHog API key is not configured.",
      "warning",
    ),
    giftBackend: readinessForEnv(
      ["EXPO_PUBLIC_GIFT_BACKEND_URL"],
      "Gift backend URL is configured.",
      "Gift backend URL is not configured.",
      "warning",
    ),
    aiProviderConfig: readinessForEnv(
      ["BUILT_IN_FORGE_API_URL", "AI_API_URL", "EXPO_PUBLIC_API_BASE_URL"],
      "AI/API config surface is configured.",
      "No AI/API config URL is configured.",
      strict ? "blocked" : "warning",
    ),
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
