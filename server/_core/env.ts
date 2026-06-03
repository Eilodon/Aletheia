function readEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

export const ENV = {
  appId: readEnv("APP_ID", "EXPO_PUBLIC_APP_ID"),
  cookieSecret: readEnv("JWT_SECRET"),
  oAuthServerUrl: readEnv("OAUTH_SERVER_URL", "EXPO_PUBLIC_OAUTH_SERVER_URL"),
  ownerOpenId: readEnv("OWNER_OPEN_ID"),
  forgeApiUrl: readEnv("BUILT_IN_FORGE_API_URL"),
  forgeApiKey: readEnv("BUILT_IN_FORGE_API_KEY"),
  aiApiUrl: readEnv("AI_API_URL", "BUILT_IN_FORGE_API_URL"),
  aiApiKey: readEnv("AI_API_KEY", "BUILT_IN_FORGE_API_KEY"),
  localAiUrl: readEnv("OLLAMA_BASE_URL", "LOCAL_AI_URL"),
  localAiModel: readEnv("OLLAMA_MODEL", "LOCAL_AI_MODEL"),
  interpretationCloudProvider: readEnv("INTERPRETATION_CLOUD_PROVIDER", "CLOUD_AI_PROVIDER"),
  interpretationCloudModel: readEnv("INTERPRETATION_CLOUD_MODEL", "CLOUD_AI_MODEL"),
  claudeApiKey: readEnv("ANTHROPIC_API_KEY", "ALETHEIA_CLAUDE_API_KEY"),
  openAiApiKey: readEnv("OPENAI_API_KEY", "ALETHEIA_OPENAI_API_KEY"),
  geminiApiKey: readEnv("GEMINI_API_KEY", "ALETHEIA_GEMINI_API_KEY"),
};

const JWT_SECRET_MIN_LENGTH = 32;

function parseCorsAllowedOrigins(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function validateProductionCorsAllowedOrigins(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const origins = parseCorsAllowedOrigins();
  if (origins.length === 0) {
    throw new Error("[env] CORS_ALLOWED_ORIGINS is required in production");
  }

  for (const origin of origins) {
    if (origin === "*") {
      throw new Error("[env] CORS_ALLOWED_ORIGINS must not contain wildcard '*' in production");
    }

    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`[env] Invalid CORS_ALLOWED_ORIGINS entry: ${origin}`);
    }

    if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error(
        `[env] CORS_ALLOWED_ORIGINS entries must be exact HTTP(S) origins without paths: ${origin}`,
      );
    }
  }
}

export function validateServerEnv(): void {
  if (!ENV.cookieSecret) {
    throw new Error("[env] JWT_SECRET is required");
  }
  if (ENV.cookieSecret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `[env] JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH} characters (current: ${ENV.cookieSecret.length}). ` +
      "Generate one with: openssl rand -hex 32",
    );
  }

  const missingAuth: string[] = [];
  if (!ENV.appId) missingAuth.push("APP_ID");
  if (!ENV.oAuthServerUrl) missingAuth.push("OAUTH_SERVER_URL");
  if (!ENV.ownerOpenId) missingAuth.push("OWNER_OPEN_ID");

  if (missingAuth.length > 0) {
    throw new Error(
      `[env] Missing required auth environment variables: ${missingAuth.join(", ")}. ` +
      "Users cannot authenticate without these. See .env.example for reference.",
    );
  }

  validateProductionCorsAllowedOrigins();
}
