import { memo, useEffect } from "react";
import { AppState, Platform, StyleSheet, View, useWindowDimensions, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/use-colors";
import { hexToRgba } from "@/lib/utils/color";

type WebGradientStyle = ViewStyle & { backgroundImage: string };

const BREATH_IN = 2500;
const BREATH_OUT = 2500;
const BREATH_MIN = 0.6;

function useBreathStyle(delayMs: number) {
  const isReducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  function startBreath() {
    opacity.value = withRepeat(
      withSequence(
        withTiming(BREATH_MIN, { duration: BREATH_IN, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: BREATH_OUT, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }

  useEffect(() => {
    if (isReducedMotion || Platform.OS === "web") return;

    const startTimer = setTimeout(startBreath, delayMs);

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        cancelAnimation(opacity);
        opacity.value = 1;
      } else if (state === "active") {
        setTimeout(startBreath, delayMs);
      }
    });

    return () => {
      clearTimeout(startTimer);
      cancelAnimation(opacity);
      opacity.value = 1;
      appStateSub.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReducedMotion]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

export const AmbientBackdrop = memo(function AmbientBackdrop() {
  const colors = useColors();
  const { width, height } = useWindowDimensions();

  const orbSize = Math.max(width * 0.84, 300);
  const lowerOrbSize = Math.max(width * 1.08, 360);
  const centerHalo = Math.max(width * 0.56, 220);

  const webGradientStyle: WebGradientStyle = {
    backgroundImage: [
      `radial-gradient(circle at 20% 20%, ${hexToRgba(colors.primary, 0.08)} 0%, transparent 32%)`,
      "radial-gradient(circle at 80% 10%, rgba(135,96,189,0.07) 0%, transparent 26%)",
      "radial-gradient(circle at 50% 100%, rgba(0,0,0,0.24) 0%, transparent 42%)",
      "radial-gradient(circle at 50% 40%, rgba(255,230,182,0.05) 0%, transparent 24%)",
    ].join(", "),
  };

  const breath1 = useBreathStyle(0);
  const breath2 = useBreathStyle(700);
  const breath3 = useBreathStyle(1400);
  const breath4 = useBreathStyle(2100);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#07060A", opacity: 0.18 }]} />

      <Animated.View
        style={[
          styles.orb,
          breath1,
          {
            width: orbSize,
            height: orbSize,
            borderRadius: orbSize / 2,
            backgroundColor: colors.primary + "18",
            top: -orbSize * 0.16,
            left: -orbSize * 0.16,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          breath2,
          {
            width: orbSize * 0.9,
            height: orbSize * 0.9,
            borderRadius: (orbSize * 0.9) / 2,
            backgroundColor: colors.border + "16",
            top: height * 0.12,
            right: -orbSize * 0.18,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          breath3,
          {
            width: centerHalo,
            height: centerHalo,
            borderRadius: centerHalo / 2,
            backgroundColor: colors.primary + "10",
            top: height * 0.22,
            alignSelf: "center",
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          breath4,
          {
            width: lowerOrbSize,
            height: lowerOrbSize,
            borderRadius: lowerOrbSize / 2,
            backgroundColor: colors.primary + "0C",
            bottom: -lowerOrbSize * 0.2,
            alignSelf: "center",
          },
        ]}
      />

      <View style={[styles.edgeTop, { borderBottomColor: colors.primary + "08" }]} />
      <View style={[styles.edgeBottom, { backgroundColor: "#07060A", opacity: 0.28 }]} />
      <View style={[styles.veil, { borderColor: colors.border + "14" }]} />

      {Platform.OS === "web" ? (
        <View style={[StyleSheet.absoluteFill, webGradientStyle]} />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    opacity: 0.9,
  },
  edgeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    borderBottomWidth: 1,
  },
  edgeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
  },
});
