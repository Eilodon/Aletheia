import { aletheiaNativeClient } from "./aletheia-core";
import { disableAndroidNativeRuntime, shouldUseAletheiaNative } from "./runtime-availability";
import {
  getGiftBackendUrl,
  getLocalDateForNative,
  getNativeDbPath,
  isGiftBackendConfigured,
} from "./runtime-config";
import { unwrapNativeSetApiKeyResponse } from "@/lib/native/bridge";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/auth";

let initPromise: Promise<void> | null = null;
export { shouldUseAletheiaNative, getNativeDbPath, getGiftBackendUrl, isGiftBackendConfigured };

/**
 * Fetch AI provider keys từ server và inject vào Rust AIClient.
 * Keys không bao giờ nằm trong client bundle — chỉ sống trên server.
 * Fail gracefully: nếu offline hoặc server chưa config, native AI dùng fallback text.
 */
async function injectProviderKeysFromServer(): Promise<void> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    console.warn("[AI Runtime] No API base URL — native AI in fallback mode");
    return;
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = await Auth.getSessionToken().catch(() => null);
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const appSecret = process.env["EXPO_PUBLIC_ALETHEIA_APP_SECRET"];
    if (appSecret) headers["x-aletheia-app-secret"] = appSecret;

    const res = await fetch(`${baseUrl}/api/trpc/aiConfig.getProviderConfig`, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!res.ok) {
      console.warn(`[AI Runtime] Config fetch failed (${res.status}) — fallback mode`);
      return;
    }

    // tRPC response envelope: { result: { data: { json: payload } } }
    type Envelope = { result?: { data?: { json?: { keys?: { claude?: string | null; gpt4?: string | null; gemini?: string | null } } } } };
    const envelope = (await res.json()) as Envelope;
    const keys = envelope?.result?.data?.json?.keys;

    if (!keys) {
      console.warn("[AI Runtime] No keys in server response — fallback mode");
      return;
    }

    const providers = [
      { provider: "claude" as const, key: keys.claude },
      { provider: "gpt4" as const, key: keys.gpt4 },
      { provider: "gemini" as const, key: keys.gemini },
    ] as const;

    let injected = 0;
    for (const entry of providers) {
      if (!entry.key) continue;
      await unwrapNativeSetApiKeyResponse(
        await aletheiaNativeClient.setApiKey({ provider: entry.provider, key: entry.key }),
      );
      injected++;
    }

    console.log(`[AI Runtime] ${injected} provider key(s) injected into Rust AIClient`);
  } catch (err) {
    console.warn("[AI Runtime] Key injection failed (offline?):", err instanceof Error ? err.message : err);
  }
}

export async function initializeAletheiaNative(): Promise<void> {
  if (!shouldUseAletheiaNative()) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await aletheiaNativeClient.init({
      dbPath: getNativeDbPath(),
      giftBackendUrl: getGiftBackendUrl(),
    });

    // Non-blocking: failure để native AI ở fallback mode, app vẫn hoạt động
    await injectProviderKeysFromServer();

    const response = await aletheiaNativeClient.bootstrapBundledContent();
    if (response.error) {
      throw new Error(`[${response.error.code}] ${response.error.message}`);
    }

    await aletheiaNativeClient.setLocalDate(getLocalDateForNative());
  })();

  try {
    await initPromise;
  } catch (error) {
    disableAndroidNativeRuntime();
    initPromise = null;
    throw error;
  }
}
