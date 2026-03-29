import { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { store } from "@/lib/services/store";
import { getCurrentUserId } from "@/lib/services/current-user-id";
import { SubscriptionTier } from "@/lib/types";
import * as Haptics from "expo-haptics";

// RevenueCat types (mock for now)
interface Package {
  identifier: string;
  priceString: string;
  price: number;
}

interface Offering {
  identifier: string;
  packages: Package[];
}

const FREE_READINGS_PER_DAY = 3;
const FREE_AI_PER_DAY = 1;

// Price constants from CONTRACTS.md
const PRO_PRICE_MONTHLY_USD = 3.99;
const PRO_PRICE_YEARLY_USD = 29.99;

export default function PaywallScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [currentTier, setCurrentTier] = useState<"free" | "pro">("free");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Check current tier
    const checkTier = async () => {
      try {
        const userId = await getCurrentUserId();
        const userState = await store.getUserState(userId);
        setCurrentTier(userState.subscription_tier);
      } catch (error) {
        console.error("Failed to check tier:", error);
      }
    };
    checkTier();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Use USD prices from CONTRACTS.md (RevenueCat will auto-localize based on store country)
  const packages: Package[] = [
    { identifier: "monthly", priceString: `$${PRO_PRICE_MONTHLY_USD}/mo`, price: PRO_PRICE_MONTHLY_USD },
    { identifier: "yearly", priceString: `$${PRO_PRICE_YEARLY_USD}/yr`, price: PRO_PRICE_YEARLY_USD },
  ];

  const handlePurchase = async () => {
    if (!selectedPlan) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPurchasing(true);

    try {
      // Simulate purchase (will be replaced with RevenueCat)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update user tier
      const userId = await getCurrentUserId();
      const userState = await store.getUserState(userId);
      await store.updateUserState({
        ...userState,
        subscription_tier: SubscriptionTier.Pro,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error("Purchase failed:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      // Simulate restore
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Restore purchases");
    } catch (error) {
      console.error("Restore failed:", error);
    }
  };

  const handleClose = () => {
    router.back();
  };

  const benefits = [
    { icon: "∞", text: "Không giới hạn lần đọc" },
    { icon: "✨", text: "Không giới hạn AI diễn giải" },
    { icon: "🎁", text: "Tạo và tặng quà cho người thân" },
    { icon: "🔓", text: "Truy cập tất cả nguồn triết lý" },
    { icon: "💾", text: "Lưu trữ không giới hạn" },
  ];

  return (
    <ScreenContainer className="p-6">
      <Animated.View style={{ opacity: fadeAnim }} className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Close button */}
          <Pressable
            onPress={handleClose}
            className="absolute top-0 right-0 p-2 z-10"
          >
            <Text className="text-2xl text-muted">×</Text>
          </Pressable>

          {/* Header */}
          <View className="items-center gap-2 pt-8 pb-6">
            <View
              className="w-16 h-16 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.primary + "20" }}
            >
              <Text className="text-3xl">✦</Text>
            </View>
            <Text className="text-2xl font-bold text-foreground">
              Aletheia Pro
            </Text>
            <Text className="text-sm text-muted text-center max-w-xs">
              Mở khóa toàn bộ trải nghiệm phản chiếu
            </Text>
          </View>

          {/* Current tier badge */}
          {currentTier === "pro" && (
            <View className="items-center mb-4">
              <View
                className="px-4 py-2 rounded-full"
                style={{ backgroundColor: colors.primary + "20" }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: colors.primary }}
                >
                  ✓ Bạn đang là Pro
                </Text>
              </View>
            </View>
          )}

          {/* Benefits */}
          <View className="gap-3 mb-8">
            {benefits.map((benefit, index) => (
              <View
                key={index}
                className="flex-row items-center gap-3 p-3 rounded-xl bg-muted/10"
              >
                <Text className="text-xl">{benefit.icon}</Text>
                <Text className="text-base text-foreground">
                  {benefit.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Free tier note */}
          {currentTier === "free" && (
            <View className="p-4 rounded-xl bg-muted/20 mb-6">
              <Text className="text-sm text-muted text-center">
                Gói Miễn phí: {FREE_READINGS_PER_DAY} lần đọc/ngày,{" "}
                {FREE_AI_PER_DAY} AI/ngày
              </Text>
            </View>
          )}

          {/* Plans */}
          {currentTier === "free" && (
            <View className="gap-3 mb-6">
              <Text className="text-sm font-medium text-foreground mb-2">
                Chọn gói:
              </Text>
              
              {/* Yearly (best value) */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPlan("yearly");
                }}
                className={`p-4 rounded-xl border ${
                  selectedPlan === "yearly"
                    ? "border-primary bg-primary/5"
                    : "border-muted/30"
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <View className="flex-row items-center gap-2">
                      <Text
                        className={`font-semibold ${
                          selectedPlan === "yearly"
                            ? "text-primary"
                            : "text-foreground"
                        }`}
                      >
                        Gói Năm
                      </Text>
                      <View
                        className="px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <Text className="text-xs text-white font-medium">
                          Tiết kiệm 50%
                        </Text>
                      </View>
                    </View>
                    <Text className="text-sm text-muted mt-1">
                      599.000đ/năm
                    </Text>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      selectedPlan === "yearly"
                        ? "border-primary bg-primary"
                        : "border-muted"
                    }`}
                  >
                    {selectedPlan === "yearly" && (
                      <Text className="text-white text-xs">✓</Text>
                    )}
                  </View>
                </View>
              </Pressable>

              {/* Monthly */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPlan("monthly");
                }}
                className={`p-4 rounded-xl border ${
                  selectedPlan === "monthly"
                    ? "border-primary bg-primary/5"
                    : "border-muted/30"
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text
                      className={`font-semibold ${
                        selectedPlan === "monthly"
                          ? "text-primary"
                          : "text-foreground"
                      }`}
                    >
                      Gói Tháng
                    </Text>
                    <Text className="text-sm text-muted mt-1">
                      99.000đ/tháng
                    </Text>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      selectedPlan === "monthly"
                        ? "border-primary bg-primary"
                        : "border-muted"
                    }`}
                  >
                    {selectedPlan === "monthly" && (
                      <Text className="text-white text-xs">✓</Text>
                    )}
                  </View>
                </View>
              </Pressable>
            </View>
          )}

          {/* Spacer */}
          <View className="flex-1" />

          {/* Actions */}
          <View className="gap-3 pb-4">
            {currentTier === "free" ? (
              <>
                <Pressable
                  onPress={handlePurchase}
                  disabled={!selectedPlan || isPurchasing}
                  style={({ pressed }) => ({
                    backgroundColor: !selectedPlan ? "#6B7280" : colors.primary,
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    borderRadius: 12,
                    opacity: pressed || !selectedPlan ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  <Text className="text-lg font-semibold text-white text-center">
                    {isPurchasing
                      ? "Đang xử lý..."
                      : selectedPlan
                      ? "Đăng ký"
                      : "Chọn gói để tiếp tục"}
                  </Text>
                </Pressable>

                <Pressable onPress={handleRestore} className="py-3">
                  <Text className="text-sm text-muted text-center">
                    Khôi phục gói đã mua
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={handleClose}
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
                  Tiếp tục sử dụng Pro
                </Text>
              </Pressable>
            )}

            <Text className="text-xs text-muted text-center px-4">
              Thanh toán sẽ được tính vào tài khoản của bạn. Tự động gia hạn trừ
              khi tắt ít nhất 24 giờ trước khi hết hạn.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
}
