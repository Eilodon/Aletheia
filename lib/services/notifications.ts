import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { store } from "@/lib/services/store";
import { getCurrentUserId } from "@/lib/services/current-user-id";
import { NOTIFICATION_MATRIX, BUNDLED_THEMES } from "@/lib/data/seed-data";

// Get oracle utterance based on userId + date hash
function getNotificationEntry(userId: string): { symbol_id: string; question: string; symbol_display_name: string } {
  const today = new Date();
  const dateStr = `${userId}-${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % NOTIFICATION_MATRIX.length;
  const entry = NOTIFICATION_MATRIX[index];
  
  // Get symbol display name from themes
  const theme = BUNDLED_THEMES.find(t => t.symbols.some(s => s.id === entry.symbol_id));
  const symbol = theme?.symbols.find(s => s.id === entry.symbol_id);
  
  return {
    symbol_id: entry.symbol_id,
    question: entry.question,
    symbol_display_name: symbol?.display_name || entry.symbol_id,
  };
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationPermissionStatus {
  granted: boolean;
  status: string;
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return {
    granted: status === "granted",
    status: status,
  };
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log("Notifications only work on physical devices");
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  
  if (existingStatus === "granted") {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleDailyNotification(
  hour: number = 8,
  minute: number = 0
): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log("No notification permission");
      return null;
    }

    // Cancel existing daily notifications first
    await cancelAllNotifications();

    // Get user for oracle utterance
    const userId = await getCurrentUserId();
    const entry = getNotificationEntry(userId);

    // Create notification content using oracle utterance
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `✦ Hôm nay vũ trụ lật: ${entry.symbol_display_name}`,
        body: `${entry.question}?`,
        data: { type: "daily_reminder", symbol_id: entry.symbol_id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    // Save notification time to user state
    const userState = await store.getUserState(userId);
    await store.updateUserState({
      ...userState,
      notification_enabled: true,
      notification_time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
    });

    return identifier;
  } catch (error) {
    console.error("Failed to schedule notification:", error);
    return null;
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// Handle notification response - navigate based on data
export function handleNotificationResponse(
  response: Notifications.NotificationResponse
): void {
  const data = response.notification.request.content.data;
  
  if (data?.type === "daily_reminder") {
    // Navigate to reading flow
    console.log("Navigate to reading from notification");
  }
}
