import Svg, { Circle, Line, Path } from "react-native-svg";
import { View } from "react-native";

import { useColors } from "@/hooks/use-colors";

type Intensity = "subtle" | "medium" | "vivid";

const OPACITY: Record<Intensity, number> = {
  subtle: 0.28,
  medium: 0.52,
  vivid: 0.78,
};

function toHex(opacity: number): string {
  return Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}

function CornerSvg({
  size,
  color,
  rotation,
}: {
  size: number;
  color: string;
  rotation: string;
}) {
  const end = size * 0.55;
  const curlStart = size * 0.5;
  const curlMid = size * 0.55;
  const curlEnd = size * 0.62;
  const dot1 = size * 0.25;
  const dot2 = size * 0.4;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      style={{ transform: [{ rotate: rotation }] }}
    >
      <Line x1="4" y1="4" x2="4" y2={end} stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <Line x1="4" y1="4" x2={end} y2="4" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <Circle cx="4" cy="4" r="2.5" fill={color} />
      <Path
        d={`M 4 ${curlStart} Q 12 ${curlMid} 14 ${curlEnd}`}
        stroke={color}
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d={`M ${curlStart} 4 Q ${curlMid} 12 ${curlEnd} 14`}
        stroke={color}
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx="4" cy={dot1} r="1.2" fill={color} />
      <Circle cx="4" cy={dot2} r="1.2" fill={color} />
      <Circle cx={dot1} cy="4" r="1.2" fill={color} />
      <Circle cx={dot2} cy="4" r="1.2" fill={color} />
    </Svg>
  );
}

export function OrnateCorners({
  intensity = "medium",
  size = 48,
  children,
}: {
  intensity?: Intensity;
  size?: number;
  children?: React.ReactNode;
}) {
  const colors = useColors();
  const opacity = OPACITY[intensity];
  const color = colors.primary + toHex(opacity);

  return (
    <View style={{ position: "relative" }}>
      {children}
      <View style={{ position: "absolute", top: 0, left: 0 }} pointerEvents="none">
        <CornerSvg size={size} color={color} rotation="0deg" />
      </View>
      <View style={{ position: "absolute", top: 0, right: 0 }} pointerEvents="none">
        <CornerSvg size={size} color={color} rotation="90deg" />
      </View>
      <View style={{ position: "absolute", bottom: 0, left: 0 }} pointerEvents="none">
        <CornerSvg size={size} color={color} rotation="270deg" />
      </View>
      <View style={{ position: "absolute", bottom: 0, right: 0 }} pointerEvents="none">
        <CornerSvg size={size} color={color} rotation="180deg" />
      </View>
    </View>
  );
}
