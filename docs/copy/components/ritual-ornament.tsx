import Svg, { Circle, Line, Path } from "react-native-svg";
import { View } from "react-native";

import { useColors } from "@/hooks/use-colors";

type OrnamentVariant = "line" | "dot" | "eye" | "sigil";

export function RitualOrnament({
  variant = "line",
  size = "md",
}: {
  variant?: OrnamentVariant;
  size?: "sm" | "md" | "lg";
}) {
  const colors = useColors();
  const scale = size === "sm" ? 0.8 : size === "lg" ? 1.35 : 1;

  if (variant === "dot") {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary + "22" }} />
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary + "55" }} />
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary + "22" }} />
      </View>
    );
  }

  if (variant === "eye") {
    return (
      <Svg width={72 * scale} height={42 * scale} viewBox="0 0 72 42" fill="none">
        <Path d="M4 21C11 10 22 4 36 4s25 6 32 17c-7 11-18 17-32 17S11 32 4 21Z" stroke={colors.primary + "A0"} strokeWidth="1.2" />
        <Path d="M11 21c6-8 14-12 25-12s19 4 25 12c-6 8-14 12-25 12S17 29 11 21Z" stroke={colors.border + "90"} strokeWidth="1" />
        <Circle cx="36" cy="21" r="8.5" stroke={colors.primary + "A0"} strokeWidth="1.1" fill={colors.primary + "12"} />
        <Circle cx="36" cy="21" r="4.5" fill={colors.primary + "40"} />
        <Circle cx="36" cy="21" r="2.2" fill={colors.foreground + "CC"} />
        <Line x1="36" y1="0" x2="36" y2="6" stroke={colors.primary + "66"} strokeWidth="1" />
        <Line x1="26" y1="3" x2="29" y2="8" stroke={colors.primary + "33"} strokeWidth="1" />
        <Line x1="46" y1="3" x2="43" y2="8" stroke={colors.primary + "33"} strokeWidth="1" />
      </Svg>
    );
  }

  if (variant === "sigil") {
    return (
      <Svg width={72 * scale} height={72 * scale} viewBox="0 0 72 72" fill="none">
        <Circle cx="36" cy="36" r="30" stroke={colors.primary + "40"} strokeWidth="1" />
        <Circle cx="36" cy="36" r="24" stroke={colors.border + "90"} strokeWidth="1" strokeDasharray="3 5" />
        <Path d="M36 14 50 44H22L36 14Z" stroke={colors.primary + "A0"} strokeWidth="1.1" />
        <Path d="M36 58 50 28H22l14 30Z" stroke={colors.primary + "55"} strokeWidth="1" />
        <Circle cx="36" cy="36" r="7" stroke={colors.primary + "A0"} strokeWidth="1.1" fill={colors.primary + "10"} />
        <Circle cx="36" cy="36" r="2.5" fill={colors.primary + "88"} />
      </Svg>
    );
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 52 * scale, height: 1, backgroundColor: colors.primary + "30" }} />
      <Svg width={10 * scale} height={10 * scale} viewBox="0 0 10 10" fill="none">
        <Path d="M5 1 9 5 5 9 1 5 5 1Z" stroke={colors.primary + "AA"} strokeWidth="1" fill={colors.primary + "16"} />
      </Svg>
      <View style={{ width: 52 * scale, height: 1, backgroundColor: colors.primary + "30" }} />
    </View>
  );
}
