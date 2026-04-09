import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { RitualOrnament } from "@/components/ritual-ornament";
import { useReading } from "@/lib/context/reading-context";
import { useColors } from "@/hooks/use-colors";
import { Fonts } from "@/constants/theme";

export default function RitualScreen() {
  const { passage, selectedSymbol } = useReading();
  const router = useRouter();
  const colors = useColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const pulseAnim = useRef(new Animated.Value(0.96)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.96,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 14000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
    ]).start();

    const timeout = setTimeout(() => {
      router.replace("/reading/passage");
    }, 1800);

    return () => clearTimeout(timeout);
  }, [fadeAnim, pulseAnim, router, rotateAnim, scaleAnim]);

  const slowRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const reverseRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-360deg"],
  });

  return (
    <ScreenContainer className="px-6 py-6 justify-center items-center">
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <View style={styles.shell}>
          <Animated.View
            style={[
              styles.outerHalo,
              {
                borderColor: colors.primary + "24",
                transform: [{ scale: pulseAnim }, { rotate: slowRotate }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.middleHalo,
              {
                borderColor: colors.border + "95",
                transform: [{ scale: pulseAnim }, { rotate: reverseRotate }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.innerHalo,
              {
                borderColor: colors.primary + "18",
                transform: [{ rotate: slowRotate }],
              },
            ]}
          />
          <View style={[styles.coreHalo, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "66" }]}>
            <RitualOrnament variant="sigil" />
          </View>
        </View>

        <View style={styles.textGroup}>
          <Text style={[styles.kicker, { color: colors.primary }]}>{selectedSymbol?.display_name?.toUpperCase() || "NGHI THỨC"}</Text>
          <Text testID="reading-ritual-title" style={[styles.title, { color: colors.foreground, fontFamily: Fonts.serif }]}>
            Đang mở passage
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {passage?.reference || "Một đoạn trích đang tiến lại gần bạn."}
          </Text>
        </View>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: 270,
    height: 270,
    alignItems: "center",
    justifyContent: "center",
  },
  outerHalo: {
    position: "absolute",
    width: 236,
    height: 236,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  middleHalo: {
    position: "absolute",
    width: 186,
    height: 186,
    borderRadius: 999,
    borderWidth: 1,
  },
  innerHalo: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 999,
    borderWidth: 1,
  },
  coreHalo: {
    width: 124,
    height: 124,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  textGroup: {
    marginTop: 16,
    alignItems: "center",
    gap: 10,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 30,
    letterSpacing: 1.2,
    textAlign: "center",
  },
  subtitle: {
    maxWidth: 260,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    fontStyle: "italic",
  },
});
