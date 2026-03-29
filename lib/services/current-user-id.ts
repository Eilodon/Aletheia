import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { v4 as uuidv4 } from "uuid";

import { getUserInfo } from "@/lib/auth";

const DEVICE_ID_KEY = "aletheia_device_id";

async function getStoredDeviceId(): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") {
      return null;
    }
    return window.sessionStorage.getItem(DEVICE_ID_KEY);
  }

  return SecureStore.getItemAsync(DEVICE_ID_KEY);
}

async function persistDeviceId(deviceId: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") {
      return;
    }
    window.sessionStorage.setItem(DEVICE_ID_KEY, deviceId);
    return;
  }

  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getStoredDeviceId();
  if (existing) {
    return existing;
  }

  const next = uuidv4();
  await persistDeviceId(next);
  return next;
}

export async function getCurrentUserId(): Promise<string> {
  const user = await getUserInfo();
  if (user?.id) {
    return user.id.toString();
  }

  const deviceId = await getOrCreateDeviceId();
  return `device_${deviceId}`;
}
