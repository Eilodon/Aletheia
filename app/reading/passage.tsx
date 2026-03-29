import { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, ScrollView, Animated } from "react-native";
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
          {/* Header - Symbol & Source - Subtle, not competing */}
          <View className="items-center gap-1 pt-6 pb-8">
            <Text style={{ fontSize: 13, color: colors.primary, letterSpacing: 2, textTransform: "uppercase" }}>
              {selectedSymbol?.display_name || "Biểu tượng"}
            </Text>
            <View style={{ width: 20, height: 1, backgroundColor: colors.border + "50", marginTop: 8 }} />
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 8, letterSpacing: 1 }}>
              {session.source.name}
            </Text>
          </View>

          {/* Passage Card - Hero object, breathing space */}
          <View style={{
            borderRadius: 28,
            padding: 28,
            backgroundColor: colors.surface + "E6",
            borderWidth: 1,
            borderColor: colors.border + "40",
            marginBottom: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 3,
          }}>
            <Text style={{
              fontSize: 22,
              fontWeight: "300",
              color: colors.foreground,
              lineHeight: 38,
              fontStyle: "italic",
              textAlign: "center",
            }}>
              "{visiblePassageText || passage.text}"
            </Text>
            <View style={{ alignItems: "center", marginTop: 20 }}>
              <View style={{ width: 30, height: 1, backgroundColor: colors.primary + "30" }} />
            </View>
            <Text style={{
              fontSize: 13,
              color: colors.muted,
              textAlign: "center",
              marginTop: 16,
              letterSpacing: 0.5,
            }}>
              {passage.reference}
            </Text>
          </View>

          {/* Context hint - Whisper text */}
          {passage.context && (
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center", fontStyle: "italic", marginBottom: 24, paddingHorizontal: 16 }}>
              {passage.context}
            </Text>
          )}

          {/* AI Interpretation Section - Secondary reveal */}
          <View className="gap-4 mb-8">
            {!aiResponse && !showAI && (
              <Pressable
                onPress={handleRequestAI}
                disabled={!passageActionsReady}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.surface + "10" : "transparent",
                  borderColor: colors.primary + "60",
                  borderWidth: 1,
                  paddingHorizontal: 24,
                  paddingVertical: 16,
                  borderRadius: 24,
                  opacity: passageActionsReady ? 1 : 0.4,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "500" }}>✦</Text>
                  <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "500" }}>Xin diễn giải</Text>
                  <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "500" }}>✦</Text>
                </View>
              </Pressable>
            )}

            {showAI && !aiResponse && (
              <View style={{ padding: 20, borderRadius: 16, backgroundColor: colors.surface + "15", alignItems: "center" }}>
                <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>
                  Đang lắng nghe...
                </Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary + "60" }} />
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary + "60" }} />
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary + "60" }} />
                </View>
              </View>
            )}

            {aiResponse && (
              <View
                style={{
                  padding: 20,
                  borderRadius: 20,
                  backgroundColor: colors.surface + "E6",
                  borderLeftWidth: 2,
                  borderLeftColor: isAIFallback ? colors.muted : colors.primary,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <Text style={{ color: isAIFallback ? colors.muted : colors.primary, fontSize: 12, letterSpacing: 1 }}>
                    {isAIFallback ? "DIỄN GIẢI NỘI TẠI" : "DIỄN GIẢI"}
                  </Text>
                </View>
                <Text style={{ fontSize: 15, color: colors.foreground, lineHeight: 26 }}>
                  {aiResponse}
                </Text>
              </View>
            )}
          </View>

          {/* Spacer */}
          <View className="flex-1" />

          {/* Actions - Subdued until ready */}
          <View className="gap-3 pb-4">
            <Pressable
              onPress={handleShare}
              disabled={!passageActionsReady}
              style={({ pressed }) => ({
                backgroundColor: colors.surface + "80",
                paddingHorizontal: 24,
                paddingVertical: 16,
                borderRadius: 24,
                opacity: pressed || !passageActionsReady ? 0.6 : 1,
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: "500", color: colors.foreground, textAlign: "center" }}>
                Chia sẻ
              </Text>
            </Pressable>

            <Pressable
              onPress={handleComplete}
              disabled={!passageActionsReady}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                paddingHorizontal: 32,
                paddingVertical: 18,
                borderRadius: 28,
                opacity: pressed || !passageActionsReady ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 4,
              })}
            >
              <Text style={{ fontSize: 17, fontWeight: "600", color: "#FFFFFF", textAlign: "center", letterSpacing: 0.5 }}>
                Hoàn thành
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
}
