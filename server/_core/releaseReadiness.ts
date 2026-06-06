import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

type CheckState = "ready" | "warning" | "blocked";

interface ReleaseCheck {
  state: CheckState;
  detail: string;
}

function findProjectRoot(startDir = process.cwd()): string {
  let currentDir = path.resolve(startDir);

  while (true) {
    if (
      existsSync(path.join(currentDir, "package.json")) &&
      existsSync(path.join(currentDir, "core")) &&
      existsSync(path.join(currentDir, "server"))
    ) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return path.resolve(startDir);
    }

    currentDir = parentDir;
  }
}

const projectRoot = process.env.ALETHEIA_PROJECT_ROOT
  ? path.resolve(process.env.ALETHEIA_PROJECT_ROOT)
  : findProjectRoot();

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

function readProjectFile(relativePath: string): string | null {
  const filePath = path.join(projectRoot, relativePath);
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : null;
}

function readinessForContentProvenance(): ReleaseCheck {
  const content = readProjectFile("core/content/bundled-content.json");
  const provenance = readProjectFile("docs/CONTENT_PROVENANCE.md");
  if (!content) {
    return { state: "blocked", detail: "Missing core/content/bundled-content.json" };
  }
  if (!provenance) {
    return { state: "blocked", detail: "Missing docs/CONTENT_PROVENANCE.md" };
  }

  try {
    const bundled = JSON.parse(content) as { sources?: Array<{ id?: string }> };
    const sourceIds = (bundled.sources ?? []).map((source) => source.id).filter(Boolean);
    const missing = sourceIds.filter((sourceId) => !provenance.includes(`| ${sourceId} |`));
    if (missing.length > 0) {
      return {
        state: "blocked",
        detail: `Content provenance missing source ids: ${missing.join(", ")}`,
      };
    }
    if (provenance.includes("| unknown |")) {
      return { state: "blocked", detail: "Content provenance contains unknown license entries." };
    }
    return { state: "ready", detail: "Content provenance covers every bundled source." };
  } catch {
    return { state: "blocked", detail: "Bundled content JSON could not be parsed." };
  }
}

function readinessForAiEvalDataset(): ReleaseCheck {
  const dataset = readProjectFile("tests/fixtures/interpretation-eval-dataset.json");
  if (!dataset) {
    return { state: "blocked", detail: "Missing interpretation eval dataset." };
  }
  try {
    const parsed = JSON.parse(dataset) as { eval_cases?: unknown[] };
    const count = parsed.eval_cases?.length ?? 0;
    return count >= 30
      ? { state: "ready", detail: `Interpretation eval dataset has ${count} cases.` }
      : { state: "blocked", detail: `Interpretation eval dataset has only ${count} cases.` };
  } catch {
    return { state: "blocked", detail: "Interpretation eval dataset could not be parsed." };
  }
}

function readinessForLegacyInterpretationRoute(): ReleaseCheck {
  const appSources = ["app", "components"].flatMap((dir) => {
    const rootPath = path.join(projectRoot, dir);
    if (!existsSync(rootPath)) return [] as string[];
    return collectFiles(rootPath, [".ts", ".tsx"]).map((filePath) => readFileSync(filePath, "utf8"));
  });
  const hasScreenDirectUsage = appSources.some((source) =>
    /requestInterpretation\s*\(|request_interpretation\s*\(/.test(source),
  );
  return hasScreenDirectUsage
    ? { state: "blocked", detail: "App screen/component imports legacy request_interpretation path." }
    : { state: "ready", detail: "Legacy request_interpretation is not used directly by app screens." };
}

function collectFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const filePath = path.join(dir, entry);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      files.push(...collectFiles(filePath, extensions));
    } else if (extensions.some((extension) => filePath.endsWith(extension))) {
      files.push(filePath);
    }
  }
  return files;
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
      strict
        ? "Gift backend URL is not configured for strict beta release."
        : "Gift backend URL not configured — gift creation will surface a config error to users.",
      strict ? "blocked" : "warning",
    ),
    revenueCatAndroid: readinessForEnv(
      ["EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID"],
      "RevenueCat Android API key is configured.",
      strict
        ? "RevenueCat Android key is not configured for strict beta release."
        : "RevenueCat Android key not configured — paywall and in-app purchases will show a config error.",
      strict ? "blocked" : "warning",
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
    contentProvenance: readinessForContentProvenance(),
    aiEvalDataset: readinessForAiEvalDataset(),
    legacyInterpretationRoute: readinessForLegacyInterpretationRoute(),
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
