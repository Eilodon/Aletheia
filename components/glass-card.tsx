import React from "react";
import { View, Text, StyleSheet, ViewProps } from "react-native";

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  variant?: "default" | "highlighted" | "subtle";
}

export function GlassCard({
  children,
  variant = "default",
  className,
  style,
  ...props
}: GlassCardProps) {
  const variantStyles = {
    default: styles.default,
    highlighted: styles.highlighted,
    subtle: styles.subtle,
  };

  return (
    <View
      style={[styles.card, variantStyles[variant], style]}
      {...props}
    >
      {children}
    </View>
  );
}

interface PassageCardProps {
  passage: string;
  reference: string;
  source?: string;
  isLoading?: boolean;
}

export function PassageCard({
  passage,
  reference,
  source,
  isLoading = false,
}: PassageCardProps) {
  if (isLoading) {
    return (
      <View style={styles.passageCard}>
        <View style={styles.passageContent}>
          <Text style={styles.passageText}>Loading passage...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.passageCard}>
      <View style={styles.passageContent}>
        <Text style={styles.passageText}>{passage}</Text>
        <Text style={styles.passageReference}>{reference}</Text>
      </View>
      {source && (
        <View style={styles.passageSource}>
          <Text style={styles.passageSourceText}>{source}</Text>
        </View>
      )}
    </View>
  );
}

interface ReadingCardProps {
  mood?: string;
  date: string;
  situation?: string;
  symbol?: string;
  duration?: string;
  hasAI?: boolean;
  onPress?: () => void;
}

export function ReadingCard({
  mood,
  date,
  situation,
  symbol,
  duration,
  hasAI,
}: ReadingCardProps) {
  const moodEmojis: Record<string, string> = {
    confused: "😕",
    hopeful: "🌟",
    anxious: "😰",
    curious: "🤔",
    grateful: "🙏",
    grief: "😢",
  };

  return (
    <View style={styles.readingCard}>
      <View style={styles.readingHeader}>
        <View style={styles.readingHeaderLeft}>
          <Text style={styles.moodEmoji}>{mood ? moodEmojis[mood] || "💭" : "💭"}</Text>
          <Text style={styles.readingDate}>{date}</Text>
        </View>
        {hasAI && (
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        )}
      </View>

      <Text style={styles.readingSituation} numberOfLines={2}>
        {situation || "No situation recorded"}
      </Text>

      <View style={styles.readingFooter}>
        <Text style={styles.readingMeta}>
          Symbol: {symbol || "?"}
        </Text>
        {duration && (
          <Text style={styles.readingMeta}>{duration}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  default: {},
  highlighted: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  subtle: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  passageCard: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: "rgba(31, 41, 55, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(55, 65, 81, 0.5)",
  },
  passageContent: {
    marginBottom: 16,
  },
  passageText: {
    fontSize: 20,
    fontWeight: "300",
    color: "#ECEDEE",
    lineHeight: 32,
    marginBottom: 16,
  },
  passageReference: {
    fontSize: 14,
    color: "#9BA1A6",
    textAlign: "right",
  },
  passageSource: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(55, 65, 81, 0.5)",
  },
  passageSourceText: {
    fontSize: 12,
    color: "#9BA1A6",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  readingCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(55, 65, 81, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(55, 65, 81, 0.2)",
    marginBottom: 12,
  },
  readingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  readingHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moodEmoji: {
    fontSize: 18,
  },
  readingDate: {
    fontSize: 14,
    color: "#9BA1A6",
  },
  aiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(10, 126, 164, 0.2)",
  },
  aiBadgeText: {
    fontSize: 12,
    color: "#0a7ea4",
    fontWeight: "600",
  },
  readingSituation: {
    fontSize: 14,
    color: "#ECEDEE",
    marginBottom: 8,
  },
  readingFooter: {
    flexDirection: "row",
    gap: 12,
  },
  readingMeta: {
    fontSize: 12,
    color: "#9BA1A6",
  },
});
