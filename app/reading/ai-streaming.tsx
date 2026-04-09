import { useEffect, useRef } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { RitualOrnament } from "@/components/ritual-ornament";
import { useReading } from "@/lib/context/reading-context";
import { useColors } from "@/hooks/use-colors";
import { Fonts } from "@/constants/theme";

export default function AIStreamingScreen() {
  const { selectedSymbol, aiResponse, isAIFallback, cancelAIInterpretation } = useReading();
  const colors = useColors();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();
  }, [fadeAnim, pulseAnim]);

  const handleCancel = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await cancelAIInterpretation();
    router.back();
  };

  const handleBackToPassage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace("/reading/passage");
  };

  if (aiResponse) {
    return (
      <ScreenContainer className="px-6 pb-6">
        <Animated.View style={{ opacity: fadeAnim }} className="flex-1">
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <RitualOrnament variant="line" />
              <Text style={[styles.title, { color: colors.foreground, fontFamily: Fonts.serif }]}>
                {isAIFallback ? "Diễn giải nội tại" : "Diễn giải"}
              </Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>{selectedSymbol?.display_name || "Biểu tượng"}</Text>
            </View>

            <View style={[styles.responseCard, { backgroundColor: colors.surface + "C6", borderColor: colors.primary + "4A" }]}>
              <Text style={[styles.responseLabel, { color: isAIFallback ? colors.muted : colors.primary }]}>
                {isAIFallback ? "fallback reflection" : "oracle reflection"}
              </Text>
              <Text style={[styles.responseText, { color: colors.foreground }]}>{aiResponse}</Text>
            </View>

            <View style={styles.spacer} />

            <Pressable onPress={handleBackToPassage} style={[styles.primaryButton, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "72" }]}>
              <Text style={[styles.primaryButtonText, { color: colors.foreground, fontFamily: Fonts.serif }]}>Quay lại đoạn trích</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-6 pb-6">
      <Animated.View style={{ opacity: fadeAnim }} className="flex-1 justify-between">
        <View style={styles.header}>
          <View style={[styles.waitHalo, { backgroundColor: colors.primary + "12" }]} />
          <RitualOrnament variant="sigil" />
          <Text style={[styles.title, { color: colors.foreground, fontFamily: Fonts.serif }]}>Đang diễn giải</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{selectedSymbol?.display_name}</Text>
        </View>

        <View style={[styles.responseCard, { backgroundColor: colors.surface + "BC", borderColor: colors.primary + "2E" }]}>
          <Text style={[styles.responseLabel, { color: colors.primary }]}>oracle is listening</Text>
          <Text style={[styles.responseText, { color: colors.foreground }]}>
            {aiResponse}
            <Animated.Text style={{ color: colors.primary, opacity: pulseAnim }}>|</Animated.Text>
          </Text>
          <RitualOrnament variant="dot" />
        </View>

        <Pressable onPress={handleCancel} style={[styles.secondaryButton, { backgroundColor: colors.surface + "B8", borderColor: colors.primary + "22" }]}>
          <Text style={[styles.secondaryButtonText, { color: colors.muted }]}>Hủy diễn giải</Text>
        </Pressable>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    gap: 10,
    paddingTop: 24,
    paddingBottom: 24,
    position: "relative",
  },
  waitHalo: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -10,
  },
  title: {
    fontSize: 28,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    fontStyle: "italic",
  },
  responseCard: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 22,
    minHeight: 220,
    gap: 16,
  },
  responseLabel: {
    fontSize: 10,
    letterSpacing: 2.8,
    textTransform: "uppercase",
    textAlign: "center",
  },
  responseText: {
    fontSize: 16,
    lineHeight: 29,
    fontStyle: "italic",
  },
  spacer: {
    flex: 1,
    minHeight: 20,
  },
  primaryButton: {
    borderRadius: 22,
    borderWidth: 1.2,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 17,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  secondaryButton: {
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
