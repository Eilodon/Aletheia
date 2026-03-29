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
import type { DbReading, DbUserState } from "../drizzle/schema";
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
    // const localReadings = await localDb.getAllAsync<DbReading>("SELECT * FROM readings");

    // Placeholder: Get readings from local (would come from expo-sqlite)
    const localReadings: DbReading[] = []; // TODO: Read from local SQLite

    if (config.syncReadings && localReadings.length > 0) {
      console.log(`[Sync] Syncing ${localReadings.length} readings...`);
      
      for (let i = 0; i < localReadings.length; i += config.batchSize) {
        const batch = localReadings.slice(i, i + config.batchSize);
        
        for (const reading of batch) {
          try {
            // Check if reading already exists on server using select().from()
            const existing = await db.select().from(readings).where(eq(readings.id, reading.id)).limit(1);

            if (!existing.length) {
              await db.insert(readings).values({
                id: reading.id,
                userOpenId: userOpenId,
                sourceId: reading.sourceId,
                passageId: reading.passageId,
                themeId: reading.themeId,
                symbolChosen: reading.symbolChosen,
                symbolMethod: reading.symbolMethod,
                situationText: reading.situationText,
                aiInterpreted: reading.aiInterpreted,
                aiUsedFallback: reading.aiUsedFallback,
                readDurationS: reading.readDurationS,
                moodTag: reading.moodTag,
                isFavorite: reading.isFavorite,
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
        // TODO: Implement actual local SQLite read
        // const localDb = await SQLite.openDatabaseAsync("aletheia.db");
        // const localUserState = await localDb.getFirstAsync<DbUserState>(
        //   "SELECT * FROM user_state WHERE user_open_id = ?",
        //   [userOpenId]
        // );
        // if (localUserState) { ... }

        // Placeholder - skip for now
        const hasUserState = false;

        if (hasUserState) {
          // When implemented, use:
          // await db.insert(userStates).values({ ... }).onDuplicateKeyUpdate({ set: { ... } });
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
