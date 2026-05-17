import { File, Paths } from "expo-file-system";

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
  return getGiftBackendUrl().length > 0;
}

export function getLocalDateForNative(): string {
  return new Date().toLocaleDateString("en-CA");
}
