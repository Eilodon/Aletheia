import { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, TextInput, Animated, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import * as Haptics from "expo-haptics";

export default function GiftRedeemScreen() {
  const colors = useColors();
  const router = useRouter();
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  
  const [token, setToken] = useState(tokenParam || "");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{
    success: boolean;
    sourceName?: string;
    buyerNote?: string;
    error?: string;
  } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Auto-redeem if token provided via deep link
  useEffect(() => {
    if (tokenParam && !redeemResult) {
      handleRedeem(tokenParam);
    }
  }, [tokenParam]);

  const handleRedeem = async (tokenToRedeem: string = token) => {
    if (!tokenToRedeem.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRedeeming(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock success (in real implementation, call gift backend)
      if (tokenToRedeem.length >= 6) {
        setRedeemResult({
          success: true,
          sourceName: "I Ching — Kinh Dịch",
          buyerNote: "Gửi bạn một lần đọc để tìm clarity trong lúc bối rối.",
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setRedeemResult({
          success: false,
          error: "Mã quà không hợp lệ hoặc đã được sử dụng.",
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error("Redeem failed:", error);
      setRedeemResult({
        success: false,
        error: "Không thể kết nối. Vui lòng thử lại.",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleStartReading = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to reading with the gifted source
    router.replace({
      pathname: "/reading/situation",
      params: { giftSource: "gifted" },
    });
  };

  const handleClose = () => {
    router.back();
  };

  // Result state
  if (redeemResult) {
    return (
      <ScreenContainer className="p-6">
        <Animated.View style={{ opacity: fadeAnim }} className="flex-1 justify-center">
          {redeemResult.success ? (
            <View className="items-center gap-6">
              <View
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.primary + "20" }}
              >
                <Text className="text-4xl">🎁</Text>
              </View>

              <View className="items-center gap-2">
                <Text className="text-xl font-semibold text-foreground">
                  Nhận quà thành công!
                </Text>
                <Text className="text-sm text-muted text-center max-w-xs">
                  Bạn đã nhận được một lần đọc từ{" "}
                  <Text className="text-primary font-medium">
                    {redeemResult.sourceName}
                  </Text>
                </Text>
              </View>

              {redeemResult.buyerNote && (
                <View className="w-full max-w-xs p-4 rounded-xl bg-muted/20">
                  <Text className="text-xs text-muted mb-2">Lời nhắn:</Text>
                  <Text className="text-sm text-foreground italic">
                    "{redeemResult.buyerNote}"
                  </Text>
                </View>
              )}

              <View className="gap-3 w-full max-w-xs mt-4">
                <Pressable
                  onPress={handleStartReading}
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
                    Bắt đầu đọc
                  </Text>
                </Pressable>

                <Pressable onPress={handleClose} className="py-3">
                  <Text className="text-sm text-muted text-center">Để sau</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View className="items-center gap-6">
              <View className="w-20 h-20 rounded-full bg-red-500/10 items-center justify-center">
                <Text className="text-4xl">❌</Text>
              </View>

              <View className="items-center gap-2">
                <Text className="text-xl font-semibold text-foreground">
                  Không thể nhận quà
                </Text>
                <Text className="text-sm text-muted text-center max-w-xs">
                  {redeemResult.error}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  setRedeemResult(null);
                  setToken("");
                }}
                className="py-4 px-6 rounded-xl border border-primary/30 mt-4"
              >
                <Text className="text-sm text-primary font-medium">
                  Thử lại
                </Text>
              </Pressable>

              <Pressable onPress={handleClose} className="py-3">
                <Text className="text-sm text-muted text-center">Đóng</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-6">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <Animated.View style={{ opacity: fadeAnim }} className="flex-1 justify-center">
          <View className="items-center gap-6">
            <View
              className="w-20 h-20 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.primary + "20" }}
            >
              <Text className="text-4xl">🎁</Text>
            </View>

            <View className="items-center gap-2">
              <Text className="text-xl font-semibold text-foreground">
                Nhận quà
              </Text>
              <Text className="text-sm text-muted text-center max-w-xs">
                Nhập mã quà được tặng để nhận một lần đọc đặc biệt
              </Text>
            </View>

            <View className="w-full max-w-xs gap-4">
              <TextInput
                value={token}
                onChangeText={setToken}
                placeholder="Nhập mã quà (VD: ABC123)"
                placeholderTextColor="#6B7280"
                autoCapitalize="characters"
                className="bg-muted/20 rounded-xl p-4 text-base text-foreground text-center font-mono tracking-wider"
                maxLength={16}
                editable={!isRedeeming}
              />

              <Pressable
                onPress={() => handleRedeem()}
                disabled={!token.trim() || isRedeeming}
                style={({ pressed }) => ({
                  backgroundColor: !token.trim() ? "#6B7280" : colors.primary,
                  paddingHorizontal: 24,
                  paddingVertical: 16,
                  borderRadius: 12,
                  opacity: pressed || !token.trim() ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <Text className="text-lg font-semibold text-white text-center">
                  {isRedeeming ? "Đang xử lý..." : "Nhận quà"}
                </Text>
              </Pressable>
            </View>

            <Pressable onPress={handleClose} className="py-3">
              <Text className="text-sm text-muted text-center">Hủy</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
