import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import { aletheiaNativeClient } from "./aletheia-core";

let initPromise: Promise<void> | null = null;
let hasWarnedAboutIosNativePending = false;
let hasDisabledAndroidNative = false;

export function shouldUseAletheiaNative(): boolean {
  if (hasDisabledAndroidNative) {
    return false;
  }

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
  return process.env.EXPO_PUBLIC_GIFT_BACKEND_URL?.trim() || "";
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

    console.warn(
      "[AI Runtime] Provider keys are no longer exposed through client-accessible config. Native AI remains in fallback mode until a server-side proxy or signed capability flow is implemented.",
    );

    const response = await aletheiaNativeClient.bootstrapBundledContent();

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
    hasDisabledAndroidNative = true;
    initPromise = null;
    throw error;
  }
}
