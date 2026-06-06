import { NotificationPrivacy, type NotificationMessage } from "@/lib/types";

export type LocalNotificationContent = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

const DISCREET_DAILY_CONTENT = {
  title: "AletheiA",
  body: "A quiet moment is waiting.",
};

const DISCREET_WEEKLY_CONTENT = {
  title: "AletheiA",
  body: "Your weekly mirror is ready.",
};

export function buildDailyNotificationContent(
  message: NotificationMessage,
  privacy: NotificationPrivacy,
): LocalNotificationContent | null {
  if (privacy === NotificationPrivacy.Off) return null;

  if (privacy === NotificationPrivacy.Discreet) {
    return {
      ...DISCREET_DAILY_CONTENT,
      data: { symbol_id: message.symbol_id, privacy: "discreet" },
    };
  }

  return {
    title: message.title,
    body: message.body,
    data: { symbol_id: message.symbol_id },
  };
}

export function buildWeeklySummaryNotificationContent(
  title: string,
  body: string,
  data: Record<string, unknown>,
  privacy: NotificationPrivacy,
): LocalNotificationContent | null {
  if (privacy === NotificationPrivacy.Off) return null;

  if (privacy === NotificationPrivacy.Discreet) {
    return {
      ...DISCREET_WEEKLY_CONTENT,
      data: { ...data, privacy: "discreet" },
    };
  }

  return { title, body, data };
}
