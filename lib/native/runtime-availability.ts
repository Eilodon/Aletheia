import { Platform } from "react-native";

import { aletheiaNativeClient } from "./aletheia-core";

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

export function disableAndroidNativeRuntime(): void {
  hasDisabledAndroidNative = true;
}
