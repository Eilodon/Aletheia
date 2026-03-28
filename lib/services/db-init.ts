/**
 * Database Initialization Service
 * Handles seeding bundled data on first app launch
 * Note: Seeding is now handled internally by store.ts
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { store } from "./store";

const DB_INITIALIZED_KEY = "aletheia_db_initialized";

class DatabaseInitService {
  async initialize(): Promise<void> {
    try {
      // Check if already initialized
      const initialized = await AsyncStorage.getItem(DB_INITIALIZED_KEY);
      if (initialized === "true") {
        console.log("Database already initialized");
        return;
      }

      console.log("Initializing database...");

      // Initialize store (which handles seeding internally)
      await store.initialize();

      // Mark as initialized
      await AsyncStorage.setItem(DB_INITIALIZED_KEY, "true");
      console.log("✓ Database initialization complete");
    } catch (error) {
      console.error("Database initialization failed:", error);
      throw error;
    }
  }

  async reset(): Promise<void> {
    try {
      await AsyncStorage.removeItem(DB_INITIALIZED_KEY);
      console.log("Database reset flag cleared");
    } catch (error) {
      console.error("Failed to reset database:", error);
      throw error;
    }
  }
}

export const dbInit = new DatabaseInitService();
