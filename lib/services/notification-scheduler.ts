/**
 * NotificationScheduler Service - Daily Notification with Static Matrix
 * Handles: get_daily_notification, schedule local notifications
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { NotificationEntry, Symbol, NOTIFICATION_MATRIX_SIZE } from "@/lib/types";
import { store } from "./store";

const DEFAULT_NOTIFICATION_MATRIX: Array<{ symbol_id: string; question: string }> = [
  { symbol_id: "candle", question: "Bạn đang thắp sáng hay đang cháy" },
  { symbol_id: "key", question: "Cánh cửa nào đang chờ bạn mở" },
  { symbol_id: "dawn", question: "Điều gì đang chào đón bạn" },
  { symbol_id: "mirror", question: "Bạn thấy gì khi nhìn vào gương" },
  { symbol_id: "wave", question: "Bạn đang chảy theo dòng hay đang bơi ngược" },
  { symbol_id: "seed", question: "Điều gì đang nảy mầm trong bạn" },
  { symbol_id: "bridge", question: "Bạn đang cần băng qua điều gì" },
  { symbol_id: "moon", question: "Điều gì đang chiếu sáng trong bóng tối" },
  { symbol_id: "flame", question: "Điều gì đang nung nấu trong bạn" },
  { symbol_id: "river", question: "Bạn đang đi đến đâu" },
  { symbol_id: "mountain", question: "Điều gì bạn cần vượt qua" },
  { symbol_id: "bird", question: "Bạn đang khao khát điều gì" },
  { symbol_id: "tree", question: "Rễ của bạn đang bám vào đâu" },
  { symbol_id: "door", question: "Bạn có dám bước vào không" },
  { symbol_id: "star", question: "Điều gì đang dẫn lối cho bạn" },
  { symbol_id: "shadow", question: "Bạn đang trốn tránh điều gì" },
  { symbol_id: "rain", question: "Điều gì đang cần được rửa trôi" },
  { symbol_id: "clock", question: "Thời gian nào đang chờ bạn" },
  { symbol_id: "book", question: "Bài học nào đang chờ bạn" },
  { symbol_id: "garden", question: "Điều gì bạn cần gieo trồng" },
  { symbol_id: "path", question: "Con đường nào gọi tên bạn" },
  { symbol_id: "window", question: "Bạn đang nhìn ra đâu" },
  { symbol_id: "fire", question: "Điều gì cần được đốt cháy" },
  { symbol_id: "ocean", question: "Bạn đang giấu điều gì sâu trong lòng" },
  { symbol_id: "stone", question: "Điều gì đang nặng nề trong bạn" },
  { symbol_id: "wind", question: "Điều gì đang thổi qua cuộc sống bạn" },
  { symbol_id: "leaf", question: "Điều gì cần được buông bỏ" },
  { symbol_id: "eye", question: "Bạn đang nhìn thấy gì" },
  { symbol_id: "heart", question: "Trái tim bạn đang nói gì" },
  { symbol_id: "road", question: "Lối nào bạn sẽ chọn" },
];

class NotificationSchedulerService {
  private isConfigured = false;

  async configure(): Promise<void> {
    if (this.isConfigured) return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.warn("[NotificationScheduler] Permission not granted");
      return;
    }

    this.isConfigured = true;
  }

  async getDailyNotification(userId: string, date: string): Promise<NotificationEntry> {
    const seed = this.hashCode(`${userId}${date}`) % NOTIFICATION_MATRIX_SIZE;
    
    let matrix = await store.getNotificationMatrix();
    
    if (matrix.length === 0) {
      matrix = DEFAULT_NOTIFICATION_MATRIX;
    }

    const entry = matrix[seed % matrix.length];
    
    const symbol = await store.getSymbolById(entry.symbol_id);
    const symbolName = symbol?.display_name || entry.symbol_id;

    return {
      symbol_id: entry.symbol_id,
      question: entry.question,
    };
  }

  async scheduleDailyNotification(
    userId: string,
    hour: number = 9,
    minute: number = 0
  ): Promise<string | null> {
    await this.configure();

    const today = new Date();
    const scheduledDate = new Date(today);
    scheduledDate.setHours(hour, minute, 0, 0);

    if (scheduledDate <= today) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    const dateStr = today.toISOString().split("T")[0];
    const notification = await this.getDailyNotification(userId, dateStr);

    const symbol = await store.getSymbolById(notification.symbol_id);
    const symbolName = symbol?.display_name || notification.symbol_id;

    const content: Notifications.NotificationContentInput = {
      title: "✦ Vũ trụ hôm nay lật",
      body: `${symbolName}. ${notification.question}?`,
      data: { type: "daily_reading", symbol_id: notification.symbol_id },
    };

    const trigger: Notifications.NotificationTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    };

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger,
      });
      return id;
    } catch (error) {
      console.error("[NotificationScheduler] Failed to schedule:", error);
      return null;
    }
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

export const notificationScheduler = new NotificationSchedulerService();
