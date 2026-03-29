/**
 * Migration Script - Sync Local SQLite to Server MySQL
 * 
 * Usage: npx tsx scripts/sync-to-server.ts
 * 
 * This script syncs data from local SQLite (expo-sqlite) to server MySQL
 * Run after user authenticates to backup their local data to server
 */

import { getDb } from "../server/db";
import { readings, userStates } from "../drizzle/schema";
import { eq } from "drizzle-orm";

interface SyncConfig {
  batchSize: number;
  syncReadings: boolean;
  syncUserState: boolean;
}

const DEFAULT_CONFIG: SyncConfig = {
  batchSize: 50,
  syncReadings: true,
  syncUserState: true,
};

export async function syncLocalToServer(userOpenId: string, config: SyncConfig = DEFAULT_CONFIG): Promise<{
  readingsSynced: number;
  userStateSynced: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let readingsSynced = 0;
  let userStateSynced = false;

  const db = await getDb();
  if (!db) {
    errors.push("Database not available");
    return { readingsSynced: 0, userStateSynced: false, errors };
  }

  try {
    console.log(`[Sync] Starting sync for user: ${userOpenId}`);

    // TODO: Implement actual local SQLite read
    // For now, this is a placeholder - would need to read from expo-sqlite
    // const localDb = await SQLite.openDatabaseAsync("aletheia.db");
    // const localReadings = await localDb.getAllAsync<any>("SELECT * FROM readings");

    // Placeholder: Get readings from local (would come from expo-sqlite)
    const localReadings: any[] = []; // TODO: Read from local SQLite

    if (config.syncReadings && localReadings.length > 0) {
      console.log(`[Sync] Syncing ${localReadings.length} readings...`);
      
      for (let i = 0; i < localReadings.length; i += config.batchSize) {
        const batch = localReadings.slice(i, i + config.batchSize);
        
        for (const reading of batch) {
          try {
            // Check if reading already exists on server
            const existing = await db.query.readings.findFirst({
              where: eq(readings.id, reading.id),
            });

            if (!existing) {
              await db.insert(readings).values({
                id: reading.id,
                userOpenId: userOpenId,
                sourceId: reading.source_id,
                passageId: reading.passage_id,
                themeId: reading.theme_id,
                symbolChosen: reading.symbol_chosen,
                symbolMethod: reading.symbol_method,
                situationText: reading.situation_text,
                aiInterpreted: reading.ai_interpreted,
                aiUsedFallback: reading.ai_used_fallback,
                readDurationS: reading.read_duration_s,
                moodTag: reading.mood_tag,
                isFavorite: reading.is_favorite,
                shared: reading.shared,
              });
              readingsSynced++;
            }
          } catch (err) {
            errors.push(`Failed to sync reading ${reading.id}: ${err}`);
          }
        }
      }
      console.log(`[Sync] Synced ${readingsSynced} readings`);
    }

    // Sync user state
    if (config.syncUserState) {
      try {
        // TODO: Read from local SQLite
        // const localUserState = await localDb.getFirstAsync<any>(
        //   "SELECT * FROM user_state WHERE user_id = ?",
        //   [userOpenId]
        // );

        const localUserState = null; // TODO: Read from local SQLite

        if (localUserState) {
          await db.insert(userStates)
            .values({
              userOpenId: userOpenId,
              subscriptionTier: localUserState.subscription_tier as "free" | "pro",
              readingsToday: localUserState.readings_today,
              aiCallsToday: localUserState.ai_calls_today,
              lastReadingDate: localUserState.last_reading_date,
              notificationEnabled: localUserState.notification_enabled,
              notificationTime: localUserState.notification_time,
              preferredLanguage: localUserState.preferred_language,
              darkMode: localUserState.dark_mode,
              onboardingComplete: localUserState.onboarding_complete,
            })
            .onDuplicateKeyUpdate({
              set: {
                subscriptionTier: localUserState.subscription_tier as "free" | "pro",
                readingsToday: localUserState.readings_today,
                aiCallsToday: localUserState.ai_calls_today,
                lastReadingDate: localUserState.last_reading_date,
                notificationEnabled: localUserState.notification_enabled,
                notificationTime: localUserState.notification_time,
                preferredLanguage: localUserState.preferred_language,
                darkMode: localUserState.dark_mode,
                onboardingComplete: localUserState.onboarding_complete,
              },
            });
          userStateSynced = true;
          console.log("[Sync] User state synced");
        }
      } catch (err) {
        errors.push(`Failed to sync user state: ${err}`);
      }
    }

    console.log(`[Sync] Complete - ${readingsSynced} readings, userState: ${userStateSynced}`);
    return { readingsSynced, userStateSynced, errors };
  } catch (err) {
    console.error("[Sync] Error:", err);
    return { readingsSynced, userStateSynced, errors: [...errors, String(err)] };
  }
}

// CLI execution
if (require.main === module) {
  const userOpenId = process.argv[2];
  if (!userOpenId) {
    console.error("Usage: npx tsx scripts/sync-to-server.ts <user_open_id>");
    process.exit(1);
  }
  syncLocalToServer(userOpenId)
    .then((result) => {
      console.log("Sync result:", result);
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}

export default syncLocalToServer;
