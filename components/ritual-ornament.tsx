import Svg, { Circle, Line, Path, Polygon } from "react-native-svg";
import { View } from "react-native";

import { useColors } from "@/hooks/use-colors";

type OrnamentVariant = "line" | "dot" | "eye" | "sigil" | "compass" | "cross" | "diamond" | "star";

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

  if (variant === "compass") {
    return (
      <Svg width={64 * scale} height={64 * scale} viewBox="0 0 64 64" fill="none">
        <Circle cx="32" cy="32" r="28" stroke={colors.primary + "30"} strokeWidth="0.8" />
        <Circle cx="32" cy="32" r="20" stroke={colors.border + "60"} strokeWidth="0.6" strokeDasharray="2 4" />
        <Path d="M32 4 L36 28 L32 32 L28 28 Z" fill={colors.primary + "AA"} />
        <Path d="M32 60 L28 36 L32 32 L36 36 Z" fill={colors.primary + "44"} />
        <Path d="M4 32 L28 28 L32 32 L28 36 Z" fill={colors.primary + "66"} />
        <Path d="M60 32 L36 36 L32 32 L36 28 Z" fill={colors.primary + "44"} />
        <Circle cx="32" cy="32" r="4" stroke={colors.primary + "CC"} strokeWidth="1" fill={colors.primary + "20"} />
        <Circle cx="32" cy="32" r="1.5" fill={colors.primary + "EE"} />
        <Line x1="32" y1="4" x2="32" y2="2" stroke={colors.primary + "60"} strokeWidth="1" />
        <Line x1="32" y1="62" x2="32" y2="60" stroke={colors.primary + "60"} strokeWidth="1" />
        <Line x1="2" y1="32" x2="4" y2="32" stroke={colors.primary + "60"} strokeWidth="1" />
        <Line x1="60" y1="32" x2="62" y2="32" stroke={colors.primary + "60"} strokeWidth="1" />
      </Svg>
    );
  }

  if (variant === "cross") {
    return (
      <Svg width={56 * scale} height={56 * scale} viewBox="0 0 56 56" fill="none">
        <Circle cx="28" cy="28" r="24" stroke={colors.primary + "28"} strokeWidth="0.7" />
        <Line x1="28" y1="6" x2="28" y2="50" stroke={colors.primary + "70"} strokeWidth="1.2" />
        <Line x1="6" y1="28" x2="50" y2="28" stroke={colors.primary + "70"} strokeWidth="1.2" />
        <Line x1="28" y1="6" x2="28" y2="18" stroke={colors.primary + "CC"} strokeWidth="1.4" />
        <Line x1="6" y1="28" x2="18" y2="28" stroke={colors.primary + "66"} strokeWidth="1" />
        <Line x1="38" y1="28" x2="50" y2="28" stroke={colors.primary + "66"} strokeWidth="1" />
        <Circle cx="28" cy="28" r="5" stroke={colors.primary + "88"} strokeWidth="1" fill={colors.primary + "14"} />
        <Circle cx="28" cy="6" r="2" fill={colors.primary + "80"} />
        <Circle cx="28" cy="50" r="1.5" fill={colors.primary + "44"} />
        <Circle cx="6" cy="28" r="1.5" fill={colors.primary + "44"} />
        <Circle cx="50" cy="28" r="1.5" fill={colors.primary + "44"} />
        <Line x1="22" y1="22" x2="34" y2="34" stroke={colors.primary + "22"} strokeWidth="0.6" />
        <Line x1="34" y1="22" x2="22" y2="34" stroke={colors.primary + "22"} strokeWidth="0.6" />
      </Svg>
    );
  }

  if (variant === "diamond") {
    return (
      <Svg width={52 * scale} height={52 * scale} viewBox="0 0 52 52" fill="none">
        <Path d="M26 4 L48 26 L26 48 L4 26 Z" stroke={colors.primary + "80"} strokeWidth="1.2" fill={colors.primary + "08"} />
        <Path d="M26 10 L42 26 L26 42 L10 26 Z" stroke={colors.border + "70"} strokeWidth="0.8" fill="none" />
        <Path d="M26 16 L36 26 L26 36 L16 26 Z" stroke={colors.primary + "60"} strokeWidth="0.9" fill={colors.primary + "10"} />
        <Circle cx="26" cy="4" r="2" fill={colors.primary + "AA"} />
        <Circle cx="26" cy="48" r="1.5" fill={colors.primary + "60"} />
        <Circle cx="4" cy="26" r="1.5" fill={colors.primary + "60"} />
        <Circle cx="48" cy="26" r="1.5" fill={colors.primary + "60"} />
        <Circle cx="26" cy="26" r="3" fill={colors.primary + "88"} />
        <Circle cx="26" cy="26" r="1.2" fill={colors.foreground + "CC"} />
      </Svg>
    );
  }

  if (variant === "star") {
    return (
      <Svg width={60 * scale} height={60 * scale} viewBox="0 0 60 60" fill="none">
        <Circle cx="30" cy="30" r="26" stroke={colors.primary + "22"} strokeWidth="0.7" strokeDasharray="1 3" />
        <Polygon
          points="30,4 35,24 54,24 39,37 45,57 30,44 15,57 21,37 6,24 25,24"
          stroke={colors.primary + "90"} strokeWidth="1" fill={colors.primary + "14"} strokeLinejoin="round"
        />
        <Polygon
          points="30,12 33,24 44,24 35,31 38,43 30,36 22,43 25,31 16,24 27,24"
          stroke={colors.primary + "50"} strokeWidth="0.7" fill={colors.primary + "0A"} strokeLinejoin="round"
        />
        <Circle cx="30" cy="30" r="4" fill={colors.primary + "70"} />
        <Circle cx="30" cy="30" r="2" fill={colors.foreground + "CC"} />
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
