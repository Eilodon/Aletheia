import { ENV } from "./_core/env";
import type { InsertUser, User } from "./types";

// ADR-AL-20: Disable MySQL/Drizzle - app is fully local per Blueprint
const MYSQL_DISABLED = true;

// In-memory user store for local development (only used when MYSQL_DISABLED)
const userStore = new Map<string, User>();

export async function getDb(): Promise<null> {
  // ADR-AL-20: Bypass database connection
  if (MYSQL_DISABLED) {
    console.log("[Database] MYSQL_DISABLED: returning null (fully local mode)");
    return null;
  }
  return null;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    // Use in-memory store when DB is disabled
    const role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
    userStore.set(user.openId, {
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      lastSignedIn: user.lastSignedIn ?? new Date(),
      role,
    });
    console.log(`[Database] In-memory upsert user: ${user.openId}`);
    return;
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    // Use in-memory store when DB is disabled
    return userStore.get(openId);
  }
  return undefined;
}
