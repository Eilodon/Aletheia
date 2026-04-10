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
import { screen, trackShareEvent } from "@/lib/analytics";

export default function PassageScreen() {
  const {
    currentState,
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
    resetReading,
  } = useReading();
  const colors = useColors();
  const router = useRouter();
  const [showAI, setShowAI] = useState(false);
  const [isRequestingAI, setIsRequestingAI] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
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

  useEffect(() => {
    screen("passage", {
      source_id: session?.source.id,
      has_ai_response: Boolean(aiResponse),
    });
  }, [aiResponse, session?.source.id]);

  useEffect(() => {
    if (aiResponse) {
      setShowAI(true);
      setIsRequestingAI(false);
    }
  }, [aiResponse]);

  const handleRequestAI = async () => {
    if (isRequestingAI || isCompleting || aiResponse) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAI(true);
    setIsRequestingAI(true);

    try {
      await requestAIInterpretation();
    } catch (error) {
      console.error("AI request failed:", error);
      setShowAI(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsRequestingAI(false);
    }
  };

  const handleComplete = async () => {
    if (isCompleting) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsCompleting(true);
    try {
      await saveReading();
      completeReading();
      router.replace("/");
      setTimeout(() => {
        resetReading();
      }, 64);
      await new Promise((resolve) => setTimeout(resolve, COMPLETE_SILENCE_BEAT_MS));
    } catch (error) {
      console.error("Failed to save:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsCompleting(false);
    }
  };

  const handleShare = () => {
    if (isCompleting || isRequestingAI) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!session) return;
    trackShareEvent("entry", {
      source_id: session.source.id,
      symbol_id: selectedSymbol?.id,
      from: "passage",
    });
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
            <Text testID="reading-passage-symbol" style={[styles.symbolName, { color: colors.primary }]}>{selectedSymbol?.display_name || "Biểu tượng"}</Text>
            <Text style={[styles.sourceName, { color: colors.muted }]}>{session.source.name}</Text>
          </View>

          <View
            style={[
              styles.stateBand,
              {
                backgroundColor: colors.surface + "B8",
                borderColor: colors.primary + "22",
              },
            ]}
          >
            <View style={styles.stateBandItem}>
              <Text style={[styles.stateBandLabel, { color: colors.muted }]}>Ngôn ngữ</Text>
              <Text style={[styles.stateBandValue, { color: colors.foreground }]}>
                {session.source.language === "vi" ? "Tiếng Việt" : "Nguồn dịch/tiếng Anh"}
              </Text>
            </View>
            <View style={styles.stateBandDivider} />
            <View style={styles.stateBandItem}>
              <Text style={[styles.stateBandLabel, { color: colors.muted }]}>Diễn giải</Text>
              <Text style={[styles.stateBandValue, { color: colors.foreground }]}>
                {currentState === "ai_streaming" || isRequestingAI
                  ? "Đang gọi"
                  : aiResponse
                    ? isAIFallback
                      ? "Fallback"
                      : "Đã xong"
                    : "Theo yêu cầu"}
              </Text>
            </View>
          </View>

          <View
            testID="reading-passage-card"
            style={[
              styles.passageCard,
              {
                backgroundColor: colors.surface + "C8",
                borderColor: colors.primary + "42",
              },
            ]}
          >
            <Text style={[styles.quoteMark, { color: colors.primary + "88", fontFamily: Fonts.display }]}>“</Text>
            <Text style={[styles.passageText, { color: colors.foreground, fontFamily: Fonts.bodyItalic }]}>
              {visiblePassageText || passage.text}
            </Text>
            <View style={styles.referenceBlock}>
              <View style={[styles.referenceRule, { backgroundColor: colors.primary + "50" }]} />
              <Text style={[styles.referenceText, { color: colors.muted }]}>{passage.reference}</Text>
            </View>
          </View>

          {passage.context ? (
            <View
              style={[
                styles.contextCard,
                {
                  backgroundColor: colors.surface + "A8",
                  borderColor: colors.primary + "1C",
                },
              ]}
            >
              <Text style={[styles.contextLabel, { color: colors.primary }]}>Đường gợi</Text>
              <Text style={[styles.contextText, { color: colors.muted }]}>{passage.context}</Text>
            </View>
          ) : null}

          <View style={styles.aiSection}>
            {!aiResponse && !showAI ? (
              <Pressable
                testID="reading-passage-request-ai"
                accessibilityLabel="reading-passage-request-ai"
                onPress={handleRequestAI}
                disabled={!passageActionsReady}
                style={[
                  styles.aiButton,
                  {
                    backgroundColor: colors.primary + "16",
                    borderColor: colors.primary + "64",
                    opacity: passageActionsReady ? 1 : 0.45,
                  },
                ]}
              >
                <Text style={[styles.aiButtonKicker, { color: colors.primary }]}>TÙY CHỌN</Text>
                <Text style={[styles.aiButtonText, { color: colors.foreground, fontFamily: Fonts.display }]}>Xin diễn giải</Text>
                <Text style={[styles.aiButtonHint, { color: colors.muted }]}>
                  AI chỉ mở khi bạn chủ động yêu cầu.
                </Text>
              </Pressable>
            ) : null}

            {showAI && (!aiResponse || isRequestingAI) ? (
              <View style={[styles.aiCard, { backgroundColor: colors.surface + "BC", borderColor: colors.primary + "24" }]}>
                <Text style={[styles.aiStatus, { color: colors.primary }]}>Đang xin diễn giải...</Text>
                <Text style={[styles.aiStatusHint, { color: colors.muted }]}>
                  Aletheia đang ghép tình huống, biểu tượng và ngữ cảnh của đoạn trích.
                </Text>
                <RitualOrnament variant="dot" />
              </View>
            ) : null}

            {aiResponse ? (
              <View
                style={[
                  styles.aiCard,
                  {
                    backgroundColor: colors.surface + "C4",
                    borderColor: isAIFallback ? colors.border + "66" : colors.primary + "4A",
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
              testID="reading-passage-share"
              accessibilityLabel="reading-passage-share"
              onPress={handleShare}
              disabled={!passageActionsReady || isCompleting || isRequestingAI}
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: colors.surface + "B8",
                  borderColor: colors.primary + "22",
                  opacity: passageActionsReady && !isCompleting && !isRequestingAI ? 1 : 0.5,
                },
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Chia sẻ</Text>
            </Pressable>

            <Pressable
              testID="reading-passage-complete"
              accessibilityLabel="reading-passage-complete"
              onPress={handleComplete}
              disabled={!passageActionsReady || isCompleting || isRequestingAI}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: isCompleting ? colors.primary + "20" : colors.primary + "18",
                  borderColor: colors.primary + "72",
                  opacity: passageActionsReady && !isRequestingAI ? 1 : 0.5,
                },
              ]}
            >
              <Text style={[styles.primaryButtonText, { color: colors.foreground, fontFamily: Fonts.display }]}>
                {isCompleting ? "Đang khép nghi thức..." : "Hoàn thành"}
              </Text>
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
    paddingTop: 28,
    paddingBottom: 18,
  },
  symbolName: {
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  sourceName: {
    fontSize: 12,
    fontFamily: Fonts.bodyItalic,
  },
  stateBand: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stateBandItem: {
    flex: 1,
    gap: 4,
  },
  stateBandDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 16,
  },
  stateBandLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 2.2,
  },
  stateBandValue: {
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
  },
  passageCard: {
    borderRadius: 32,
    borderWidth: 1.2,
    paddingHorizontal: 24,
    paddingVertical: 30,
    marginBottom: 16,
    gap: 8,
  },
  quoteMark: {
    fontSize: 46,
    lineHeight: 44,
    textAlign: "center",
  },
  passageText: {
    fontSize: 24,
    lineHeight: 40,
    textAlign: "center",
    letterSpacing: 0.2,
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
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: Fonts.bodyMedium,
  },
  contextCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 22,
    gap: 8,
  },
  contextLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  contextText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.bodyItalic,
  },
  aiSection: {
    gap: 14,
    marginBottom: 20,
  },
  aiButton: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 18,
    alignItems: "center",
    gap: 6,
  },
  aiButtonKicker: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  aiButtonText: {
    fontSize: 18,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  aiButtonHint: {
    fontSize: 12,
    textAlign: "center",
    fontFamily: Fonts.bodyItalic,
  },
  aiCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 10,
    alignItems: "center",
  },
  aiStatus: {
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
  },
  aiStatusHint: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  aiLabel: {
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: "uppercase",
  },
  aiBody: {
    fontSize: 15,
    lineHeight: 27,
    width: "100%",
    fontFamily: Fonts.bodyItalic,
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
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    letterSpacing: 0.5,
    fontFamily: Fonts.display,
  },
  primaryButton: {
    borderRadius: 22,
    borderWidth: 1.2,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 18,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
});
