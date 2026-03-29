import { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useReading } from "@/lib/context/reading-context";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import * as Haptics from "expo-haptics";

export default function AIStreamingScreen() {
  const {
    passage,
    selectedSymbol,
    aiResponse,
    isAIFallback,
    cancelAIInterpretation,
    currentState,
  } = useReading();
  const colors = useColors();
  const router = useRouter();
  const [displayedText, setDisplayedText] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Typewriter effect for AI response
  useEffect(() => {
    if (!aiResponse) return;

    let index = 0;
    const interval = setInterval(() => {
      if (index < aiResponse.length) {
        setDisplayedText(aiResponse.slice(0, index + 1));
        index++;
        // Haptic feedback every few characters
        if (index % 10 === 0) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } else {
        clearInterval(interval);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [aiResponse]);

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleCancel = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await cancelAIInterpretation();
    router.back();
  };

  const handleBackToPassage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace("/reading/passage");
  };

  // If we have a complete AI response, show the full screen
  if (aiResponse && displayedText.length === aiResponse.length) {
    return (
      <ScreenContainer className="p-6">
        <Animated.View style={{ opacity: fadeAnim }} className="flex-1">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View className="items-center gap-2 pt-4 pb-6">
              <Text className="text-lg font-medium text-primary">
                {selectedSymbol?.display_name || "Biểu tượng"}
              </Text>
              <Text className="text-xs text-muted">
                {isAIFallback ? "Diễn giải nội tại" : "Diễn giải từ AI"}
              </Text>
            </View>

            {/* AI Response Card */}
            <View
              className="rounded-2xl p-6 mb-6"
              style={{
                backgroundColor: isAIFallback ? "#374151" : "#1E3A5F",
                borderLeftWidth: 3,
                borderLeftColor: isAIFallback ? "#9CA3AF" : colors.primary,
              }}
            >
              <Text className="text-base text-foreground leading-relaxed">
                {aiResponse}
              </Text>
            </View>

            {/* Spacer */}
            <View className="flex-1" />

            {/* Actions */}
            <View className="gap-3 pb-4">
              <Pressable
                onPress={handleBackToPassage}
                style={({ pressed }) => ({
                  backgroundColor: colors.primary,
                  paddingHorizontal: 24,
                  paddingVertical: 16,
                  borderRadius: 12,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <Text className="text-lg font-semibold text-white text-center">
                  Quay lại đoạn trích
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </ScreenContainer>
    );
  }

  // Streaming state
  return (
    <ScreenContainer className="p-6">
      <Animated.View style={{ opacity: fadeAnim }} className="flex-1">
        {/* Header */}
        <View className="items-center gap-2 pt-4 pb-6">
          <Text className="text-lg font-medium text-foreground">
            Đang diễn giải...
          </Text>
          <Text className="text-xs text-muted">
            {selectedSymbol?.display_name}
          </Text>
        </View>

        {/* Streaming Content */}
        <View className="flex-1">
          <View
            className="rounded-2xl p-6 min-h-[200px]"
            style={{ backgroundColor: "#1E3A5F" }}
          >
            <Text className="text-base text-foreground leading-relaxed">
              {displayedText}
              <Text className="text-primary animate-pulse">|</Text>
            </Text>
          </View>

          {/* Progress indicator */}
          <View className="flex-row justify-center gap-1 mt-6">
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                className="w-2 h-2 rounded-full bg-primary animate-pulse"
              />
            ))}
          </View>
        </View>

        {/* Cancel button */}
        <View className="pb-8 pt-4">
          <Pressable
            onPress={handleCancel}
            className="py-4 px-6 rounded-xl border border-muted/30"
          >
            <Text className="text-sm text-muted text-center">
              Hủy diễn giải
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </ScreenContainer>
  );
}
