import { describe, expect, it } from "vitest";

import {
  buildDailyNotificationContent,
  buildWeeklySummaryNotificationContent,
} from "@/lib/services/notification-privacy";
import { NotificationPrivacy } from "@/lib/types";

const message = {
  symbol_id: "moon",
  question: "What is waiting in the quiet?",
  title: "Moon",
  body: "A private passage that should not be visible in discreet mode.",
};

describe("notification privacy", () => {
  it("uses exact message content in full-text mode", () => {
    expect(buildDailyNotificationContent(message, NotificationPrivacy.FullText)).toMatchObject({
      title: message.title,
      body: message.body,
      data: { symbol_id: "moon" },
    });
  });

  it("uses generic lock-screen copy in discreet daily mode", () => {
    expect(buildDailyNotificationContent(message, NotificationPrivacy.Discreet)).toMatchObject({
      title: "AletheiA",
      body: "A quiet moment is waiting.",
      data: { symbol_id: "moon", privacy: "discreet" },
    });
  });

  it("returns null in off mode so callers do not schedule content", () => {
    expect(buildDailyNotificationContent(message, NotificationPrivacy.Off)).toBeNull();
    expect(buildWeeklySummaryNotificationContent("3 readings this week", "Private passage", { passage_id: "p1" }, NotificationPrivacy.Off)).toBeNull();
  });

  it("uses generic lock-screen copy for weekly summaries in discreet mode", () => {
    expect(
      buildWeeklySummaryNotificationContent(
        "3 readings this week",
        "A private weekly passage snippet.",
        { passage_id: "p1" },
        NotificationPrivacy.Discreet,
      ),
    ).toMatchObject({
      title: "AletheiA",
      body: "Your weekly mirror is ready.",
      data: { passage_id: "p1", privacy: "discreet" },
    });
  });
});
