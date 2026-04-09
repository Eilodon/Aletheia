import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { OpaqueColorValue, StyleProp, View, ViewStyle } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

type IconSymbolName = SymbolViewProps["name"];

function ArcaneHomeIcon({ color, size, style }: { color: string; size: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
        <Path d="M6 13.5 14 6l8 7.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M8.5 12.8V22h11V12.8" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
        <Rect x="12.2" y="16" width="3.6" height="6" rx="1.2" stroke={color} strokeWidth="1.4" />
        <Line x1="14" y1="3.8" x2="14" y2="6.4" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        <Circle cx="14" cy="3.4" r="1" fill={color} />
      </Svg>
    </View>
  );
}

function ArcaneBookIcon({ color, size, style }: { color: string; size: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
        <Path d="M6 8.5c0-1.7 1.3-3 3-3h5v17H9c-1.7 0-3-1.3-3-3v-11Z" stroke={color} strokeWidth="1.6" />
        <Path d="M22 8.5c0-1.7-1.3-3-3-3h-5v17h5c1.7 0 3-1.3 3-3v-11Z" stroke={color} strokeWidth="1.6" />
        <Line x1="14" y1="5.5" x2="14" y2="22.5" stroke={color} strokeWidth="1.2" />
        <Path d="M10 10.5h2.5M10 13.5h2.5M15.5 10.5H18M15.5 13.5H18" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
        <Circle cx="14" cy="4" r="1" fill={color} />
      </Svg>
    </View>
  );
}

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  const tint = String(color);

  if (name === "house.fill") {
    return <ArcaneHomeIcon color={tint} size={size} style={style} />;
  }

  if (name === "book.fill") {
    return <ArcaneBookIcon color={tint} size={size} style={style} />;
  }

  return <ArcaneHomeIcon color={tint} size={size} style={style} />;
}
