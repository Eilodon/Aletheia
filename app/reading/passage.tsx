import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { RitualOrnament } from "@/components/ritual-ornament";
import { useReading } from "@/lib/context/reading-context";
import { useColors } from "@/hooks/use-colors";
import { COMPLETE_SILENCE_BEAT_MS } from "@/lib/reading/ritual";
import { Fonts } from "@/constants/theme";

export default function PassageScreen() {
  const {
    passage,
    session,
    selectedSymbol,
    visiblePassageText,
    passageActionsReady,
    aiResponse,
    isAIFallback,
    requestAIInterpretation,
    saveReading,
    completeReading,
  } = useReading();
  const colors = useColors();
  const router = useRouter();
  const [showAI, setShowAI] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [fadeAnim]);

  const handleRequestAI = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await requestAIInterpretation();
      setShowAI(true);
    } catch (error) {
      console.error("AI request failed:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleComplete = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await saveReading();
      completeReading();
      await new Promise((resolve) => setTimeout(resolve, COMPLETE_SILENCE_BEAT_MS));
      router.replace("/");
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/reading/share-card");
  };

  if (!passage || !session) {
    return (
      <ScreenContainer className="justify-center items-center">
        <Text className="text-muted">Đang tải...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-6 pb-6">
      <Animated.View style={{ opacity: fadeAnim }} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <RitualOrnament variant="line" />
            <Text style={[styles.symbolName, { color: colors.primary }]}>{selectedSymbol?.display_name || "Biểu tượng"}</Text>
            <Text style={[styles.sourceName, { color: colors.muted }]}>{session.source.name}</Text>
          </View>

          <View
            style={[
              styles.passageCard,
              {
                backgroundColor: colors.surface + "F0",
                borderColor: colors.primary + "50",
              },
            ]}
          >
            <Text style={[styles.passageText, { color: colors.foreground, fontFamily: Fonts.serif }]}>
              {`"${visiblePassageText || passage.text}"`}
            </Text>
            <View style={styles.referenceBlock}>
              <View style={[styles.referenceRule, { backgroundColor: colors.primary + "50" }]} />
              <Text style={[styles.referenceText, { color: colors.muted }]}>{passage.reference}</Text>
            </View>
          </View>

          {passage.context ? (
            <Text style={[styles.contextText, { color: colors.muted }]}>{passage.context}</Text>
          ) : null}

          <View style={styles.aiSection}>
            {!aiResponse && !showAI ? (
              <Pressable
                onPress={handleRequestAI}
                disabled={!passageActionsReady}
                style={[
                  styles.aiButton,
                  {
                    backgroundColor: colors.surface + "E8",
                    borderColor: colors.primary + "60",
                    opacity: passageActionsReady ? 1 : 0.45,
                  },
                ]}
              >
                <Text style={[styles.aiButtonText, { color: colors.foreground, fontFamily: Fonts.serif }]}>Xin diễn giải</Text>
              </Pressable>
            ) : null}

            {showAI && !aiResponse ? (
              <View style={[styles.aiCard, { backgroundColor: colors.surface + "D8", borderColor: colors.border + "55" }]}>
                <Text style={[styles.aiStatus, { color: colors.primary }]}>Đang lắng nghe...</Text>
                <RitualOrnament variant="dot" />
              </View>
            ) : null}

            {aiResponse ? (
              <View
                style={[
                  styles.aiCard,
                  {
                    backgroundColor: colors.surface + "F0",
                    borderColor: isAIFallback ? colors.border + "66" : colors.primary + "66",
                  },
                ]}
              >
                <Text style={[styles.aiLabel, { color: isAIFallback ? colors.muted : colors.primary }]}>
                  {isAIFallback ? "DIỄN GIẢI NỘI TẠI" : "DIỄN GIẢI"}
                </Text>
                <Text style={[styles.aiBody, { color: colors.foreground }]}>{aiResponse}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.spacer} />

          <View style={styles.actions}>
            <Pressable
              onPress={handleShare}
              disabled={!passageActionsReady}
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: colors.surface + "E8",
                  borderColor: colors.border + "66",
                  opacity: passageActionsReady ? 1 : 0.5,
                },
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Chia sẻ</Text>
            </Pressable>

            <Pressable
              onPress={handleComplete}
              disabled={!passageActionsReady}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.surface + "F4",
                  borderColor: colors.primary + "88",
                  opacity: passageActionsReady ? 1 : 0.5,
                },
              ]}
            >
              <Text style={[styles.primaryButtonText, { color: colors.foreground, fontFamily: Fonts.serif }]}>Hoàn thành</Text>
            </Pressable>
          </View>
        </ScrollView>
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
  },
  symbolName: {
    fontSize: 12,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  sourceName: {
    fontSize: 12,
  },
  passageCard: {
    borderRadius: 26,
    borderWidth: 1.2,
    paddingHorizontal: 24,
    paddingVertical: 26,
    marginBottom: 18,
  },
  passageText: {
    fontSize: 24,
    lineHeight: 38,
    textAlign: "center",
  },
  referenceBlock: {
    alignItems: "center",
    gap: 12,
    marginTop: 22,
  },
  referenceRule: {
    width: 34,
    height: 1,
  },
  referenceText: {
    fontSize: 12,
    letterSpacing: 0.4,
  },
  contextText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: 10,
    marginBottom: 22,
  },
  aiSection: {
    gap: 14,
    marginBottom: 20,
  },
  aiButton: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 16,
    alignItems: "center",
  },
  aiButtonText: {
    fontSize: 17,
  },
  aiCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 10,
    alignItems: "center",
  },
  aiStatus: {
    fontSize: 14,
  },
  aiLabel: {
    fontSize: 11,
    letterSpacing: 2,
  },
  aiBody: {
    fontSize: 15,
    lineHeight: 25,
    width: "100%",
  },
  spacer: {
    flex: 1,
    minHeight: 12,
  },
  actions: {
    gap: 12,
    paddingBottom: 8,
  },
  secondaryButton: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  primaryButton: {
    borderRadius: 22,
    borderWidth: 1.2,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 18,
  },
});
