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
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary + "1F" }} />
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary + "55" }} />
        <View style={{ width: 10, height: 1, backgroundColor: colors.primary + "20" }} />
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary + "55" }} />
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary + "1F" }} />
      </View>
    );
  }

  if (variant === "eye") {
    return (
      <Svg width={88 * scale} height={56 * scale} viewBox="0 0 88 56" fill="none">
        <Path d="M4 28 Q16 6 44 6 Q72 6 84 28 Q72 50 44 50 Q16 50 4 28Z" stroke={colors.primary + "8A"} strokeWidth="1" />
        <Path d="M10 28 Q20 10 44 10 Q68 10 78 28 Q68 46 44 46 Q20 46 10 28Z" stroke={colors.border + "90"} strokeWidth="0.8" />
        <Circle cx="44" cy="28" r="12" stroke={colors.primary + "70"} strokeWidth="0.9" fill={colors.primary + "10"} />
        <Circle cx="44" cy="28" r="8.5" stroke={colors.primary + "55"} strokeWidth="0.6" fill="none" />
        <Circle cx="44" cy="28" r="4.5" fill={colors.primary + "4A"} />
        <Circle cx="44" cy="28" r="2.2" fill={colors.foreground + "CC"} />
        <Circle cx="41" cy="25.5" r="1" fill={colors.primary + "5A"} />
        <Line x1="44" y1="0" x2="44" y2="5.5" stroke={colors.primary + "44"} strokeWidth="0.8" />
        <Line x1="35.5" y1="1.5" x2="37.8" y2="6.2" stroke={colors.primary + "32"} strokeWidth="0.8" />
        <Line x1="52.5" y1="1.5" x2="50.2" y2="6.2" stroke={colors.primary + "32"} strokeWidth="0.8" />
        <Line x1="18" y1="15" x2="22" y2="18" stroke={colors.primary + "24"} strokeWidth="0.8" />
        <Line x1="70" y1="15" x2="66" y2="18" stroke={colors.primary + "24"} strokeWidth="0.8" />
      </Svg>
    );
  }

  if (variant === "sigil") {
    return (
      <Svg width={76 * scale} height={76 * scale} viewBox="0 0 76 76" fill="none">
        <Circle cx="38" cy="38" r="31" stroke={colors.primary + "36"} strokeWidth="1" />
        <Circle cx="38" cy="38" r="25" stroke={colors.border + "78"} strokeWidth="0.8" strokeDasharray="3 5" />
        <Path d="M38 14 54 38 38 62 22 38 38 14Z" stroke={colors.primary + "8A"} strokeWidth="1.1" />
        <Path d="M38 20 48 38 38 56 28 38 38 20Z" stroke={colors.primary + "52"} strokeWidth="0.9" />
        <Path d="M24 30 52 30" stroke={colors.primary + "30"} strokeWidth="0.8" />
        <Path d="M24 46 52 46" stroke={colors.primary + "30"} strokeWidth="0.8" />
        <Path d="M38 12 38 64" stroke={colors.primary + "32"} strokeWidth="0.8" />
        <Circle cx="38" cy="38" r="8" stroke={colors.primary + "92"} strokeWidth="1" fill={colors.primary + "10"} />
        <Circle cx="38" cy="38" r="3" fill={colors.primary + "88"} />
      </Svg>
    );
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 46 * scale, height: 1, backgroundColor: colors.primary + "26" }} />
      <Svg width={16 * scale} height={10 * scale} viewBox="0 0 16 10" fill="none">
        <Path d="M8 1 12 5 8 9 4 5 8 1Z" stroke={colors.primary + "AA"} strokeWidth="1" fill={colors.primary + "16"} />
        <Line x1="0" y1="5" x2="4" y2="5" stroke={colors.primary + "42"} strokeWidth="1" />
        <Line x1="12" y1="5" x2="16" y2="5" stroke={colors.primary + "42"} strokeWidth="1" />
      </Svg>
      <View style={{ width: 46 * scale, height: 1, backgroundColor: colors.primary + "26" }} />
    </View>
  );
}
