import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { store } from "@/lib/services/store";
import { getCurrentUserId } from "@/lib/services/current-user-id";

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

    // Create notification content
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🌟 Vũ trụ đang chờ",
        body: "Một đoạn triết lý đang chờ bạn khám phá hôm nay",
        data: { type: "daily_reminder" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    // Save notification time to user state
    const userId = await getCurrentUserId();
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
