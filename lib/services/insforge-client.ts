import { createClient } from "@insforge/sdk";

export const insforge = createClient({
  baseUrl: process.env.EXPO_PUBLIC_INSFORGE_URL ?? "",
  anonKey: process.env.EXPO_PUBLIC_INSFORGE_ANON_KEY ?? "",
});
