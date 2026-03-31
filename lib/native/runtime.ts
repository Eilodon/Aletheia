import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import { getApiBaseUrl } from "@/constants/oauth";
import { BUNDLED_PASSAGES, BUNDLED_SOURCES, BUNDLED_THEMES } from "@/lib/data/content";
import { createTRPCClient } from "@/lib/trpc";

import { aletheiaNativeClient } from "./aletheia-core";
import { unwrapNativeSetApiKeyResponse } from "./bridge";

let initPromise: Promise<void> | null = null;
let hasWarnedAboutIosNativePending = false;

export function shouldUseAletheiaNative(): boolean {
  if (Platform.OS === "ios" && aletheiaNativeClient.isAvailable()) {
    if (!hasWarnedAboutIosNativePending) {
      console.warn(
        "[Aletheia Native] iOS native support is explicitly out of beta scope. Android uses Rust core; iOS remains held until UniFFI runtime parity exists.",
      );
      hasWarnedAboutIosNativePending = true;
    }
    return false;
  }

  return Platform.OS === "android" && aletheiaNativeClient.isAvailable();
}

export function getNativeDbPath(): string {
  const dbFile = new File(Paths.document, "aletheia-native.db");
  // rusqlite::Connection::open() expects a POSIX path, not a file:// URI.
  // expo-file-system returns "file:///absolute/path", strip the scheme prefix.
  return dbFile.uri.replace(/^file:\/\//, "");
}

export function getGiftBackendUrl(): string {
  return process.env.EXPO_PUBLIC_GIFT_BACKEND_URL || getApiBaseUrl() || "";
}

export function isGiftBackendConfigured(): boolean {
  return getGiftBackendUrl().trim().length > 0;
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
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      console.warn(
        "[AI Runtime] EXPO_PUBLIC_API_BASE_URL is missing; native provider config cannot be fetched. Using fallback mode.",
      );
    } else {
      try {
        const client = createTRPCClient();
        const config = await client.aiConfig.getProviderConfig.query();
        const providers = [
          { provider: "claude", key: config.keys.claude, status: config.claude },
          { provider: "gpt4", key: config.keys.gpt4, status: config.gpt4 },
          { provider: "gemini", key: config.keys.gemini, status: config.gemini },
        ] as const;

        const configuredProviders = providers.filter((entry) => entry.status === "configured");
        const usableProviders = providers.filter(
          (entry): entry is typeof providers[number] & { key: string } => typeof entry.key === "string" && entry.key.length > 0,
        );

        if (usableProviders.length === 0) {
          if (configuredProviders.length > 0) {
            console.warn(
              "[AI Runtime] Provider config endpoint is reachable but keys were not exposed to the native runtime. Using fallback mode.",
            );
          } else {
            console.warn(
              "[AI Runtime] No AI provider keys are configured on the server. Using fallback mode.",
            );
          }
        }

        for (const entry of usableProviders) {
          await unwrapNativeSetApiKeyResponse(
            await aletheiaNativeClient.setApiKey({
              provider: entry.provider,
              key: entry.key,
            }),
          );
        }

        if (usableProviders.length > 0) {
          console.log(
            "[AI Runtime] Provider keys configured from server",
            usableProviders.map((entry) => entry.provider),
          );
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(
          `[AI Runtime] Could not fetch provider config from ${apiBaseUrl}/api/trpc (${reason}). Using fallback mode.`,
        );
      }
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
