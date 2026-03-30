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
  ownerOpenId: readEnv("OWNER_OPEN_ID", "EXPO_PUBLIC_OWNER_OPEN_ID"),
  forgeApiUrl: readEnv("BUILT_IN_FORGE_API_URL"),
  forgeApiKey: readEnv("BUILT_IN_FORGE_API_KEY"),
  aiApiUrl: readEnv("AI_API_URL", "BUILT_IN_FORGE_API_URL"),
  aiApiKey: readEnv("AI_API_KEY", "BUILT_IN_FORGE_API_KEY"),
};

export function validateServerEnv(): void {
  const missingRequired = [];
  if (!ENV.cookieSecret) {
    missingRequired.push("JWT_SECRET");
  }

  if (missingRequired.length > 0) {
    throw new Error(
      `[env] Missing required server environment variables: ${missingRequired.join(", ")}`,
    );
  }

  const missingShared = [];
  if (!ENV.appId) missingShared.push("APP_ID");
  if (!ENV.oAuthServerUrl) missingShared.push("OAUTH_SERVER_URL");
  if (!ENV.ownerOpenId) missingShared.push("OWNER_OPEN_ID");

  if (missingShared.length > 0) {
    console.warn(
      `[env] Missing shared auth environment variables: ${missingShared.join(", ")}. ` +
      "Public routes can still start, but OAuth/auth bootstrap will stay incomplete.",
    );
  }
}
