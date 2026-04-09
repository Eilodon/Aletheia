import { useState } from "react";
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useReading } from "@/lib/context/reading-context";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { RitualOrnament } from "@/components/ritual-ornament";
import { SITUATION_SKIP_TEXT_VI } from "@/lib/reading/ritual";
import { Fonts } from "@/constants/theme";
import * as Haptics from "expo-haptics";

export default function SituationScreen() {
  const [situationText, setSituationText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { startReading } = useReading();
  const colors = useColors();
  const router = useRouter();

  const handleContinue = async () => {
    if (isLoading) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    
    try {
      await startReading(undefined, situationText.trim() || undefined);
      router.push("/reading/wildcard");
    } catch (error) {
      console.error("Failed to start reading:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (isLoading) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    
    try {
      await startReading();
      router.push("/reading/wildcard");
    } catch (error) {
      console.error("Failed to start reading:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer className="p-6">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-between">
          {/* Header */}
          <View className="items-center gap-4 pt-8">
            <RitualOrnament variant="line" />
            <Text className="text-3xl text-foreground text-center" style={{ fontFamily: Fonts.serif }}>
              Bạn đang mang điều gì?
            </Text>
            <Text className="text-sm text-muted text-center max-w-xs">
              Chia sẻ tình huống giúp AI diễn giải sâu hơn — nhưng bạn hoàn toàn có thể để trống.
            </Text>
          </View>

          {/* Input */}
          <View className="flex-1 justify-center px-2">
            <TextInput
              value={situationText}
              onChangeText={setSituationText}
              placeholder="Tôi đang cảm thấy... / Tôi đang đối mặt với..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              className="rounded-3xl p-5 text-base text-foreground min-h-[180px]"
              style={{
                backgroundColor: colors.surface + "EE",
                borderWidth: 1,
                borderColor: colors.border + "88",
                lineHeight: 24,
              }}
              maxLength={500}
            />
            <Text className="text-xs text-muted text-right mt-2">
              {situationText.length}/500
            </Text>
          </View>

          {/* Actions */}
          <View className="gap-4 pb-8">
            <Pressable
              onPress={handleContinue}
              disabled={isLoading}
              style={({ pressed }) => ({
                backgroundColor: colors.surface + "F2",
                borderWidth: 1,
                borderColor: colors.primary + "88",
                paddingHorizontal: 32,
                paddingVertical: 18,
                borderRadius: 22,
                opacity: pressed || isLoading ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text className="text-lg text-foreground text-center" style={{ fontFamily: Fonts.serif }}>
                {isLoading ? "Đang chuẩn bị..." : "Tiếp tục"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSkip}
              disabled={isLoading}
              className="py-3"
            >
              <Text className="text-sm text-muted text-center">
                {SITUATION_SKIP_TEXT_VI} →
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
