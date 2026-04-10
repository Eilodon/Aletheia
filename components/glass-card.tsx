import React from "react";
import { View, Text, ViewProps } from "react-native";
import { Fonts } from "@/constants/theme";
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
    borderRadius: 26,
    padding: 24,
    backgroundColor: variant === "default" ? colors.surface + "C8" : variant === "highlighted" ? colors.surface + "D8" : colors.surface + "B8",
    borderWidth: 1,
    borderColor: variant === "default" ? colors.primary + "22" : variant === "highlighted" ? colors.primary + "66" : colors.border + "40",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 34,
    elevation: 7,
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
    borderRadius: 28,
    padding: 24,
    backgroundColor: colors.surface + "C8",
    borderWidth: 1,
    borderColor: colors.primary + "42",
  };

  const textStyle = {
    fontSize: 20,
    fontWeight: "300" as const,
    color: colors.foreground,
    lineHeight: 32,
    marginBottom: 16,
    fontFamily: Fonts.bodyItalic,
  };

  const refStyle = {
    fontSize: 14,
    color: colors.muted,
    textAlign: "right" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
    fontFamily: Fonts.bodyMedium,
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
    borderRadius: 22,
    backgroundColor: colors.surface + "C4",
    borderWidth: 1,
    borderColor: colors.primary + "22",
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
            <Text style={{ fontSize: 10, color: colors.primary, letterSpacing: 1, textTransform: "uppercase", fontFamily: Fonts.display }}>AI</Text>
          </View>
        )}
      </View>

      <Text style={{ fontSize: 15, color: colors.foreground, marginBottom: 8, lineHeight: 22, fontFamily: Fonts.bodyItalic }} numberOfLines={2}>
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
