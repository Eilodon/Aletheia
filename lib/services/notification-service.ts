/**
 * Notification service — daily passage + weekly summary.
 * Gracefully degrades on web. All functions are safe to call in any environment.
 *
 * Philosophy: notifications deliver the actual passage/insight to the lock screen —
 * never a "come back" prompt. User reads value without opening the app.
 * Weekly summary is 100% local: the device queries its own SQLite, picks the most
 * engaged passage from the past week, and fires a local notification. Zero data
 * leaves the device. (CTO decision: no FCM/APNs server push for user reading data.)
 */
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { coreStore } from "./core-store";
import { getCurrentUserId } from "./current-user-id";
import { BUNDLED_PASSAGES } from "@/lib/data/seed-data.generated";
import { getLocale } from "@/lib/i18n";

const DAILY_NOTIFICATION_ID = "aletheia-daily-passage";
const WEEKLY_NOTIFICATION_ID = "aletheia-weekly-summary";

/** Call once at app startup (after permissions are set up). */
export function initializeNotificationHandler(): void {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Returns true if permission was granted (or already granted). */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

/**
 * Schedule a recurring daily passage notification at the given hour:minute.
 * Cancels any previously scheduled daily notification first.
 */
export async function scheduleDailyPassage(hour: number, minute: number): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_NOTIFICATION_ID).catch(() => {});

    const userId = await getCurrentUserId();
    const today = new Date().toLocaleDateString("en-CA");
    const message = await coreStore.getDailyNotificationMessage(userId, today);

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_NOTIFICATION_ID,
      content: {
        title: message.title,
        body: message.body,
        data: { symbol_id: message.symbol_id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch (e) {
    console.warn("[notifications] failed to schedule daily passage:", e);
  }
}

/** Cancel the daily passage notification. */
export async function cancelDailyPassage(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_NOTIFICATION_ID);
  } catch {
    // Already cancelled or never scheduled
  }
}

/** Parse "HH:MM" string into { hour, minute }. Defaults to 07:00 on parse error. */
export function parseNotificationTime(timeStr?: string): { hour: number; minute: number } {
  if (!timeStr) return { hour: 7, minute: 0 };
  const [h, m] = timeStr.split(":").map(Number);
  const hour = Number.isFinite(h) && h >= 0 && h <= 23 ? h : 7;
  const minute = Number.isFinite(m) && m >= 0 && m <= 59 ? m : 0;
  return { hour, minute };
}

/** Format { hour, minute } → "HH:MM" */
export function formatNotificationTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Schedule a weekly summary local notification.
 * Fires every Saturday at the given hour:minute.
 * Content is derived entirely from local SQLite — no server involved.
 * Picks the most engaged reading from the past 7 days (ai_interpreted first,
 * then longest read_duration_s), shows a passage snippet + reading count.
 */
export async function scheduleWeeklySummary(hour: number, minute: number): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(WEEKLY_NOTIFICATION_ID).catch(() => {});

    const sevenDaysAgoSec = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const page = await coreStore.getReadingsPage(50, 0);
    const weekReadings = page.items.filter((r) => r.created_at >= sevenDaysAgoSec);

    if (weekReadings.length === 0) return;

    const best = [...weekReadings].sort((a, b) => {
      if (a.ai_interpreted !== b.ai_interpreted) return a.ai_interpreted ? -1 : 1;
      return (b.read_duration_s ?? 0) - (a.read_duration_s ?? 0);
    })[0];

    const passage = BUNDLED_PASSAGES.find((p) => p.id === best.passage_id);
    const snippet = passage
      ? passage.text.length > 90
        ? passage.text.slice(0, 87) + "…"
        : passage.text
      : "";

    const locale = getLocale();
    const count = weekReadings.length;
    const title =
      locale === "en"
        ? `${count} reading${count !== 1 ? "s" : ""} this week`
        : `${count} lần đọc tuần này`;
    const body = snippet || (locale === "en" ? "What has changed since then?" : "Điều gì đã thay đổi từ khi đó?");

    await Notifications.scheduleNotificationAsync({
      identifier: WEEKLY_NOTIFICATION_ID,
      content: { title, body, data: { passage_id: best.passage_id } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 7, // Saturday
        hour,
        minute,
      },
    });
  } catch (e) {
    console.warn("[notifications] failed to schedule weekly summary:", e);
  }
}

/** Cancel the weekly summary notification. */
export async function cancelWeeklySummary(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(WEEKLY_NOTIFICATION_ID);
  } catch {
    // Already cancelled or never scheduled
  }
}
