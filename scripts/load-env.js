/**
 * Custom environment loader that prioritizes system environment variables
 * over .env file values. This ensures that platform-injected variables
 * are not overridden by placeholder values in .env.
 */
const fs = require("node:fs");
const path = require("node:path");

const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const lines = envContent.split("\n");

  lines.forEach((line) => {
    if (!line || line.trim().startsWith("#")) {
      return;
    }

    const match = line.match(/^([^=]+)=(.*)$/);
    if (!match) {
      return;
    }

    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

const legacyMappings = {
  VITE_APP_ID: "APP_ID",
  VITE_OAUTH_PORTAL_URL: "OAUTH_PORTAL_URL",
};

for (const [legacyVar, canonicalVar] of Object.entries(legacyMappings)) {
  if (process.env[legacyVar] && !process.env[canonicalVar]) {
    process.env[canonicalVar] = process.env[legacyVar];
  }
}

const sharedMappings = [
  ["APP_ID", "EXPO_PUBLIC_APP_ID"],
  ["OAUTH_PORTAL_URL", "EXPO_PUBLIC_OAUTH_PORTAL_URL"],
  ["OAUTH_SERVER_URL", "EXPO_PUBLIC_OAUTH_SERVER_URL"],
  ["OWNER_OPEN_ID", "EXPO_PUBLIC_OWNER_OPEN_ID"],
  ["OWNER_NAME", "EXPO_PUBLIC_OWNER_NAME"],
  ["API_BASE_URL", "EXPO_PUBLIC_API_BASE_URL"],
];

for (const [serverVar, expoVar] of sharedMappings) {
  if (process.env[serverVar] && !process.env[expoVar]) {
    process.env[expoVar] = process.env[serverVar];
  }
  if (process.env[expoVar] && !process.env[serverVar]) {
    process.env[serverVar] = process.env[expoVar];
  }
}
