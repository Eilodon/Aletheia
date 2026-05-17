import { Text } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

import { useColors } from "@/hooks/use-colors";
import { Fonts } from "@/constants/theme";

type Size = "sm" | "md" | "lg";

const FLAME_HEIGHT: Record<Size, number> = { sm: 24, md: 32, lg: 44 };
const TEXT_SIZE: Record<Size, number> = { sm: 12, md: 14, lg: 18 };

export function StreakBadge({
  streak,
  size = "md",
}: {
  streak: number;
  size?: Size;
}) {
  const colors = useColors();
  const flameHeight = FLAME_HEIGHT[size];
  const flameWidth = flameHeight * (24 / 32);
  const fontSize = TEXT_SIZE[size];

  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(0.92, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (streak === 0) {
    return null;
  }

  return (
    <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 4 }, animatedStyle]}>
      <Svg width={flameWidth} height={flameHeight} viewBox="0 0 24 32" fill="none">
        <Path
          d="M 12 2 C 12 2 20 10 20 18 C 20 26 16 30 12 30 C 8 30 4 26 4 18 C 4 10 12 2 12 2 Z"
          fill={colors.primary + "CC"}
        />
        <Path
          d="M 12 10 C 12 10 16 15 16 20 C 16 24 14 27 12 27 C 10 27 8 24 8 20 C 8 15 12 10 12 10 Z"
          fill="#FFA040"
        />
        <Circle cx="12" cy="16" r="2" fill="white" fillOpacity={0.4} />
      </Svg>
      <Text
        style={{
          fontSize,
          color: colors.primary,
          fontFamily: Fonts?.displayStrong,
        }}
      >
        {streak}
      </Text>
    </Animated.View>
  );
}
