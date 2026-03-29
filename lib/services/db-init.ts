/**
 * Database Initialization Service
 * Uses the native core as the primary mobile path and keeps the TS store as fallback.
 */

import { shouldUseAletheiaNative, initializeAletheiaNative } from "@/lib/native/runtime";
import { store } from "./store";

class DatabaseInitService {
  async initialize(): Promise<void> {
    if (shouldUseAletheiaNative()) {
      await initializeAletheiaNative();
      console.log("✓ Native database initialization complete");
      return;
    }

    await store.initialize();
    console.log("✓ TypeScript database initialization complete");
  }

  async reset(): Promise<void> {
    console.warn("Database reset is not implemented for the active storage path.");
  }
}

export const dbInit = new DatabaseInitService();
