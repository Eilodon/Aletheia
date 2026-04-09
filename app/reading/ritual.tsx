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
    ]).start();

    const timeout = setTimeout(() => {
      router.replace("/reading/passage");
    }, 1800);

    return () => clearTimeout(timeout);
  }, [fadeAnim, pulseAnim, router, scaleAnim]);

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
                borderColor: colors.primary + "35",
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.middleHalo,
              {
                borderColor: colors.border + "95",
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <View style={[styles.coreHalo, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "66" }]}>
            <RitualOrnament variant="sigil" />
          </View>
        </View>

        <View style={styles.textGroup}>
          <Text style={[styles.kicker, { color: colors.primary }]}>
            {selectedSymbol?.display_name?.toUpperCase() || "NGHI THỨC"}
          </Text>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: Fonts.serif }]}>Đang mở passage</Text>
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
    width: 250,
    height: 250,
    alignItems: "center",
    justifyContent: "center",
  },
  outerHalo: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    borderWidth: 1,
  },
  middleHalo: {
    position: "absolute",
    width: 176,
    height: 176,
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
    marginTop: 20,
    alignItems: "center",
    gap: 10,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 2.4,
  },
  title: {
    fontSize: 30,
    letterSpacing: 0.8,
  },
  subtitle: {
    maxWidth: 260,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
  },
});
