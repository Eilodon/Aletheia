import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import { getApiBaseUrl } from "@/constants/oauth";
import { BUNDLED_PASSAGES, BUNDLED_SOURCES, BUNDLED_THEMES } from "@/lib/data/seed-data";
import { trpc } from "@/lib/trpc";

import { aletheiaNativeClient } from "./aletheia-core";
import { unwrapNativeSetApiKeyResponse } from "./bridge";

let initPromise: Promise<void> | null = null;

export function shouldUseAletheiaNative(): boolean {
  return (Platform.OS === "android" || Platform.OS === "ios")
    && aletheiaNativeClient.isAvailable();
}

export function getNativeDbPath(): string {
  const dbFile = new File(Paths.document, "aletheia-native.db");
  // rusqlite::Connection::open() expects a POSIX path, not a file:// URI.
  // expo-file-system returns "file:///absolute/path", strip the scheme prefix.
  return dbFile.uri.replace(/^file:\/\//, "");
}

export function getGiftBackendUrl(): string {
  return getApiBaseUrl() || "https://example.invalid";
}

export async function initializeAletheiaNative(): Promise<void> {
  if (!shouldUseAletheiaNative()) {
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    await aletheiaNativeClient.init({
      dbPath: getNativeDbPath(),
      giftBackendUrl: getGiftBackendUrl(),
    });

    // Fetch API keys from server (keys live in server env vars, not client bundle)
    try {
      // Use the trpc client directly - it's initialized in app/_layout.tsx
      const config = await (trpc as any).aiConfig.getProviderConfig.query();
      const providers = [
        { provider: "claude", key: config.keys.claude },
        { provider: "gpt4", key: config.keys.gpt4 },
        { provider: "gemini", key: config.keys.gemini },
      ] as const;

      for (const entry of providers) {
        if (!entry.key) continue;
        await unwrapNativeSetApiKeyResponse(
          await aletheiaNativeClient.setApiKey({
            provider: entry.provider,
            key: entry.key,
          }),
        );
      }
      console.log("[AI Runtime] Provider keys configured from server");
    } catch (_err) {
      console.warn("[AI Runtime] Could not fetch provider config (offline?), using fallback mode");
    }

    const response = await aletheiaNativeClient.seedBundledData({
      sourcesJson: JSON.stringify(BUNDLED_SOURCES),
      passagesJson: JSON.stringify(BUNDLED_PASSAGES),
      themesJson: JSON.stringify(BUNDLED_THEMES),
    });

    if (response.error) {
      throw new Error(`[${response.error.code}] ${response.error.message}`);
    }

    // Set local date for daily limit reset to respect user timezone
    const localDate = new Date().toLocaleDateString("en-CA"); // Format: YYYY-MM-DD
    await aletheiaNativeClient.setLocalDate(localDate);
  })();

  try {
    await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}
