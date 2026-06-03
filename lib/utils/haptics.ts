import * as Haptics from "expo-haptics";

export type HapticType =
  | "navigation"
  | "selection"
  | "confirm"
  | "emphasis"
  | "heavy"
  | "success"
  | "error"
  | "warning";

export function haptic(type: HapticType): void {
  switch (type) {
    case "navigation":
    case "selection":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case "confirm":
    case "emphasis":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case "heavy":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case "success":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case "error":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
    case "warning":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
  }
}
