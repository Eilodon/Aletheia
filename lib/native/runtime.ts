import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import { getApiBaseUrl } from "@/constants/oauth";
import { BUNDLED_PASSAGES, BUNDLED_SOURCES, BUNDLED_THEMES } from "@/lib/data/seed-data";

import { aletheiaNativeClient } from "./aletheia-core";
import { unwrapNativeSetApiKeyResponse } from "./bridge";

let initPromise: Promise<void> | null = null;

const ENV_API_KEYS = [
  {
    provider: "claude",
    key: process.env.EXPO_PUBLIC_ALETHEIA_CLAUDE_API_KEY,
  },
  {
    provider: "gpt4",
    key: process.env.EXPO_PUBLIC_ALETHEIA_OPENAI_API_KEY,
  },
  {
    provider: "gemini",
    key: process.env.EXPO_PUBLIC_ALETHEIA_GEMINI_API_KEY,
  },
] as const;

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

    for (const entry of ENV_API_KEYS) {
      if (!entry.key) {
        continue;
      }

      await unwrapNativeSetApiKeyResponse(
        await aletheiaNativeClient.setApiKey({
          provider: entry.provider,
          key: entry.key,
        }),
      );
    }

    const response = await aletheiaNativeClient.seedBundledData({
      sourcesJson: JSON.stringify(BUNDLED_SOURCES),
      passagesJson: JSON.stringify(BUNDLED_PASSAGES),
      themesJson: JSON.stringify(BUNDLED_THEMES),
    });

    if (response.error) {
      throw new Error(`[${response.error.code}] ${response.error.message}`);
    }
  })();

  try {
    await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}
