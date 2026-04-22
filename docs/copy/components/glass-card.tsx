import React from "react";
import { View, Text, ViewProps } from "react-native";
import { useColors } from "@/hooks/use-colors";

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
  const colors = useColors();
  
  const baseStyle = {
    borderRadius: 22,
    padding: 24,
    backgroundColor: variant === "default" ? colors.surface + "D9" : variant === "highlighted" ? colors.surface + "F0" : colors.surface + "C8",
    borderWidth: 1,
    borderColor: variant === "default" ? colors.border + "55" : variant === "highlighted" ? colors.primary + "66" : colors.border + "40",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 5,
  };

  return (
    <View
      style={[baseStyle, style]}
      className={className}
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
  const colors = useColors();
  
  const cardStyle = {
    borderRadius: 22,
    padding: 24,
    backgroundColor: colors.surface + "F0",
    borderWidth: 1,
    borderColor: colors.primary + "50",
  };

  const textStyle = {
    fontSize: 20,
    fontWeight: "300" as const,
    color: colors.foreground,
    lineHeight: 32,
    marginBottom: 16,
  };

  const refStyle = {
    fontSize: 14,
    color: colors.muted,
    textAlign: "right" as const,
  };

  if (isLoading) {
    return (
      <View style={cardStyle}>
        <View style={{ marginBottom: 16 }}>
          <Text style={textStyle}>Loading passage...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={cardStyle}>
      <View style={{ marginBottom: 16 }}>
        <Text style={textStyle}>{passage}</Text>
        <Text style={refStyle}>{reference}</Text>
      </View>
      {source && (
        <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border + "80" }}>
          <Text style={{ fontSize: 12, color: colors.muted, textTransform: "uppercase" as const, letterSpacing: 1 }}>{source}</Text>
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
  const colors = useColors();
  const moodEmojis: Record<string, string> = {
    confused: "😕",
    hopeful: "🌟",
    anxious: "😰",
    curious: "🤔",
    grateful: "🙏",
    grief: "😢",
  };

  const cardStyle = {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface + "D4",
    borderWidth: 1,
    borderColor: colors.border + "55",
    marginBottom: 12,
  };

  return (
    <View style={cardStyle}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 18 }}>{mood ? moodEmojis[mood] || "💭" : "💭"}</Text>
          <Text style={{ fontSize: 14, color: colors.muted }}>{date}</Text>
        </View>
        {hasAI && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.primary + "33" }}>
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>AI</Text>
          </View>
        )}
      </View>

      <Text style={{ fontSize: 14, color: colors.foreground, marginBottom: 8 }} numberOfLines={2}>
        {situation || "No situation recorded"}
      </Text>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Text style={{ fontSize: 12, color: colors.muted }}>
          Symbol: {symbol || "?"}
        </Text>
        {duration && (
          <Text style={{ fontSize: 12, color: colors.muted }}>{duration}</Text>
        )}
      </View>
    </View>
  );
}

export { type GlassCardProps, type PassageCardProps, type ReadingCardProps };
