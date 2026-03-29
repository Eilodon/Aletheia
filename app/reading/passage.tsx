import { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, ScrollView, Animated, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useReading } from "@/lib/context/reading-context";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { COMPLETE_SILENCE_BEAT_MS } from "@/lib/reading/ritual";
import * as Haptics from "expo-haptics";

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

  // Fade in animation - use ref to avoid re-renders
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Only run animation once on mount
    const animation = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRequestAI = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAI(true);
    try {
      await requestAIInterpretation();
    } catch (error) {
      console.error("AI request failed:", error);
    }
  };

  const handleComplete = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await saveReading();
      completeReading();
      // UX-04: Silence beat before navigating to home
      await new Promise((resolve) => setTimeout(resolve, COMPLETE_SILENCE_BEAT_MS));
      router.replace("/");
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Navigate to share screen
    console.log("Share card not implemented yet");
  };

  if (!passage || !session) {
    return (
      <ScreenContainer className="justify-center items-center">
        <Text className="text-muted">Đang tải...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-6">
      <Animated.View style={{ opacity: fadeAnim }} className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header - Symbol & Source */}
          <View className="items-center gap-2 pt-4 pb-6">
            <Text className="text-lg font-medium text-primary">
              {selectedSymbol?.display_name || "Biểu tượng"}
            </Text>
            <Text className="text-xs text-muted uppercase tracking-wider">
              {session.source.name}
            </Text>
          </View>

          {/* Passage Card - Glassmorphic */}
          <View style={styles.passageCard}>
            <Text style={styles.passageText}>
              {visiblePassageText || passage.text}
            </Text>
            <Text style={styles.passageReference}>
              {passage.reference}
            </Text>
          </View>

          {/* Context hint */}
          {passage.context && (
            <Text className="text-sm text-muted text-center italic mb-6 px-4">
              {passage.context}
            </Text>
          )}

          {/* AI Interpretation Section */}
          <View className="gap-4 mb-6">
            {!aiResponse && !showAI && (
              <Pressable
                onPress={handleRequestAI}
                disabled={!passageActionsReady}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.primary + "20" : "transparent",
                  borderColor: colors.primary,
                  borderWidth: 1,
                  paddingHorizontal: 24,
                  paddingVertical: 14,
                  borderRadius: 12,
                  opacity: passageActionsReady ? 1 : 0.5,
                })}
              >
                <Text
                  className="text-base font-medium text-center"
                  style={{ color: colors.primary }}
                >
                  ✦ Xin diễn giải từ AI
                </Text>
              </Pressable>
            )}

            {showAI && !aiResponse && (
              <View className="p-4 rounded-xl bg-muted/20">
                <Text className="text-sm text-muted text-center">
                  Đang diễn giải...
                </Text>
                <View className="flex-row justify-center gap-1 mt-2">
                  <Text className="text-primary animate-pulse">●</Text>
                  <Text className="text-primary animate-pulse delay-75">●</Text>
                  <Text className="text-primary animate-pulse delay-150">●</Text>
                </View>
              </View>
            )}

            {aiResponse && (
              <View
                className="p-5 rounded-xl"
                style={{
                  backgroundColor: isAIFallback ? "#374151" : "#1E3A5F",
                  borderLeftWidth: 3,
                  borderLeftColor: isAIFallback ? "#9CA3AF" : colors.primary,
                }}
              >
                <Text className="text-sm text-muted mb-2">
                  {isAIFallback ? "Diễn giải nội tại:" : "Diễn giải:"}
                </Text>
                <Text className="text-base text-foreground leading-relaxed">
                  {aiResponse}
                </Text>
              </View>
            )}
          </View>

          {/* Spacer */}
          <View className="flex-1" />

          {/* Actions */}
          <View className="gap-3 pb-4">
            <Pressable
              onPress={handleShare}
              disabled={!passageActionsReady}
              style={({ pressed }) => ({
                backgroundColor: "#374151",
                paddingHorizontal: 24,
                paddingVertical: 14,
                borderRadius: 12,
                opacity: pressed || !passageActionsReady ? 0.7 : 1,
              })}
            >
              <Text className="text-base font-medium text-foreground text-center">
                Chia sẻ
              </Text>
            </Pressable>

            <Pressable
              onPress={handleComplete}
              disabled={!passageActionsReady}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                paddingHorizontal: 24,
                paddingVertical: 16,
                borderRadius: 12,
                opacity: pressed || !passageActionsReady ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text className="text-lg font-semibold text-white text-center">
                Hoàn thành
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  passageCard: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: "rgba(31, 41, 55, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(55, 65, 81, 0.5)",
    marginBottom: 24,
  },
  passageText: {
    fontSize: 20,
    fontWeight: "300",
    color: "#ECEDEE",
    lineHeight: 32,
    marginBottom: 16,
  },
  passageReference: {
    fontSize: 14,
    color: "#9BA1A6",
    textAlign: "right",
  },
});
