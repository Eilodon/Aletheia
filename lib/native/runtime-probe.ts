import { Platform } from "react-native";

import { aletheiaNativeClient } from "./aletheia-core";
import { getNativeDbPath, initializeAletheiaNative } from "./runtime";

let probePromise: Promise<void> | null = null;

export function runAletheiaNativeProbe(): Promise<void> {
  if (Platform.OS !== "android") {
    return Promise.resolve();
  }

  if (probePromise) {
    return probePromise;
  }

  probePromise = (async () => {
    const dbPath = getNativeDbPath();
    const userId = "native-probe-user";

    try {
      await initializeAletheiaNative();

      const userStateResponse = await aletheiaNativeClient.getUserState(userId);

      if (userStateResponse.error) {
        console.error("[AletheiaNativeProbe] getUserState error", userStateResponse.error);
        return;
      }

      console.log("[AletheiaNativeProbe] init ok", {
        dbPath,
        userState: userStateResponse.state,
      });
    } catch (error) {
      console.error("[AletheiaNativeProbe] init failed", {
        dbPath,
        error,
      });
    }
  })();

  return probePromise;
}
