import { aletheiaNativeClient } from "./aletheia-core";
import { disableAndroidNativeRuntime, shouldUseAletheiaNative } from "./runtime-availability";
import {
  getGiftBackendUrl,
  getLocalDateForNative,
  getNativeDbPath,
  isGiftBackendConfigured,
} from "./runtime-config";

let initPromise: Promise<void> | null = null;
export { shouldUseAletheiaNative, getNativeDbPath, getGiftBackendUrl, isGiftBackendConfigured };

export async function initializeAletheiaNative(): Promise<void> {
  if (!shouldUseAletheiaNative()) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await aletheiaNativeClient.init({
      dbPath: getNativeDbPath(),
      giftBackendUrl: getGiftBackendUrl(),
    });

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
