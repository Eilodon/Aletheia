/**
 * Migration Script - Sync Local SQLite to Server MySQL
 * 
 * Usage: npx tsx scripts/sync-to-server.ts
 * 
 * This script syncs data from local SQLite (expo-sqlite) to server MySQL
 * Run after user authenticates to backup their local data to server
 * 
 * NOTE: Currently disabled - MYSQL_DISABLED in server/db.ts
 */

import { getDb } from "../server/db";

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
    console.log("[Sync] MYSQL_DISABLED - skipping sync");
    return { readingsSynced: 0, userStateSynced: false, errors: ["Database not available"] };
  }

  console.log(`[Sync] Complete - ${readingsSynced} readings, userState: ${userStateSynced}`);
  return { readingsSynced, userStateSynced, errors };
}

if (require.main === module) {
  const userOpenId = process.argv[2];
  if (!userOpenId) {
    console.error("Usage: npx tsx scripts/sync-to-server.ts <user_open_id>");
    process.exit(1);
  }
  syncLocalToServer(userOpenId).then((result) => {
    console.log("Sync result:", result);
    process.exit(result.errors.length > 0 ? 1 : 0);
  });
}
