import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Fonts } from "@/constants/theme";

type EmotionType = "anxious" | "sad" | "confused" | "hopeful" | "curious" | "grateful" | "grief" | "default";

interface EmotionTagProps {
  emotion?: EmotionType;
  showLabel?: boolean;
  size?: "small" | "medium" | "large";
}

const EMOTION_CONFIG: Record<EmotionType, { emoji: string; label: string; bg: string; text: string; border: string }> = {
  anxious: { emoji: "😰", label: "Anxious", bg: "rgba(245, 158, 11, 0.15)", text: "#FBBF24", border: "rgba(245, 158, 11, 0.3)" },
  sad: { emoji: "😢", label: "Sad", bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.3)" },
  confused: { emoji: "😕", label: "Confused", bg: "rgba(139, 92, 246, 0.15)", text: "#A78BFA", border: "rgba(139, 92, 246, 0.3)" },
  hopeful: { emoji: "🌟", label: "Hopeful", bg: "rgba(34, 197, 94, 0.15)", text: "#4ADE80", border: "rgba(34, 197, 94, 0.3)" },
  curious: { emoji: "🤔", label: "Curious", bg: "rgba(236, 72, 153, 0.15)", text: "#F472B6", border: "rgba(236, 72, 153, 0.3)" },
  grateful: { emoji: "🙏", label: "Grateful", bg: "rgba(251, 191, 36, 0.15)", text: "#FBBF24", border: "rgba(251, 191, 36, 0.3)" },
  grief: { emoji: "😢", label: "Grief", bg: "rgba(107, 114, 128, 0.15)", text: "#9CA3AF", border: "rgba(107, 114, 128, 0.3)" },
  default: { emoji: "💭", label: "Neutral", bg: "rgba(55, 65, 81, 0.3)", text: "#9BA1A6", border: "rgba(55, 65, 81, 0.5)" },
};

export function EmotionTag({ emotion = "default", showLabel = true, size = "medium" }: EmotionTagProps) {
  const config = EMOTION_CONFIG[emotion];

  const sizeStyles = {
    small: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 10, emojiSize: 12 },
    medium: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, emojiSize: 14 },
    large: { paddingHorizontal: 12, paddingVertical: 6, fontSize: 14, emojiSize: 18 },
  };

  const s = sizeStyles[size];

  return (
    <View style={[styles.container, { backgroundColor: config.bg, borderColor: config.border, paddingHorizontal: s.paddingHorizontal, paddingVertical: s.paddingVertical }]}>
      <Text style={[styles.emoji, { fontSize: s.emojiSize }]}>{config.emoji}</Text>
      {showLabel && <Text style={[styles.label, { color: config.text, fontSize: s.fontSize }]}>{config.label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  emoji: {
    lineHeight: 18,
  },
  label: {
    fontFamily: Fonts.serif,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
