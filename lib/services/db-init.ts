/**
 * Database Initialization Service
 * Handles seeding bundled data on first app launch
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { store } from "./store";
import { BUNDLED_SOURCES, BUNDLED_PASSAGES, BUNDLED_THEMES, NOTIFICATION_MATRIX } from "@/lib/data/seed-data";

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

      console.log("Initializing database with bundled data...");

      // Initialize store
      await store.initialize();

      // Seed sources
      for (const source of BUNDLED_SOURCES) {
        await store.insertSource(source);
      }
      console.log(`✓ Seeded ${BUNDLED_SOURCES.length} sources`);

      // Seed passages
      for (const passage of BUNDLED_PASSAGES) {
        await store.insertPassage(passage);
      }
      console.log(`✓ Seeded ${BUNDLED_PASSAGES.length} passages`);

      // Seed themes
      for (const theme of BUNDLED_THEMES) {
        await store.insertTheme(theme);
      }
      console.log(`✓ Seeded ${BUNDLED_THEMES.length} themes`);

      // Seed notification matrix
      for (const entry of NOTIFICATION_MATRIX) {
        await store.insertNotificationEntry(entry);
      }
      console.log(`✓ Seeded ${NOTIFICATION_MATRIX.length} notification entries`);

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
