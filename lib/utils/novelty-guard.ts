import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const NOVELTY_N = 10;
const keyFor = (sourceId: string) => `aletheia:novelty:${sourceId}`;

async function load(sourceId: string): Promise<string[]> {
  try {
    let raw: string | null = null;
    if (Platform.OS === "web") {
      raw = typeof window !== "undefined" ? window.localStorage.getItem(keyFor(sourceId)) : null;
    } else {
      raw = await SecureStore.getItemAsync(keyFor(sourceId));
    }
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

async function save(sourceId: string, ids: string[]): Promise<void> {
  try {
    const raw = JSON.stringify(ids.slice(-NOVELTY_N));
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.localStorage.setItem(keyFor(sourceId), raw);
    } else {
      await SecureStore.setItemAsync(keyFor(sourceId), raw);
    }
  } catch {
    // non-critical
  }
}

export async function getRecentPassageIds(sourceId: string): Promise<string[]> {
  return load(sourceId);
}

export async function recordPassageId(sourceId: string, passageId: string): Promise<void> {
  const current = await load(sourceId);
  const updated = [...current.filter((id) => id !== passageId), passageId].slice(-NOVELTY_N);
  await save(sourceId, updated);
}
