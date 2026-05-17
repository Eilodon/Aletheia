import { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { coreStore } from "@/lib/services/core-store";
import { getCurrentUserId } from "@/lib/services/current-user-id";
import * as Haptics from "expo-haptics";

const FREE_READINGS_PER_DAY = 3;
const FREE_AI_PER_DAY = 1;

export default function PaywallScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<"free" | "pro">("free");
  const [billingNotice, setBillingNotice] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Check current tier
    const checkTier = async () => {
      try {
        const userId = await getCurrentUserId();
        const userState = await coreStore.getUserState(userId);
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

  const handlePurchase = async () => {
    if (!selectedPlan) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBillingNotice("Thanh toán Pro chưa được bật trong beta này. Không có giao dịch hoặc nâng hạng giả được thực hiện.");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBillingNotice("Khôi phục mua hàng chưa khả dụng vì RevenueCat chưa được tích hợp trong beta hiện tại.");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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

          {/* Header - Ritual threshold */}
          <View className="items-center gap-3 pt-10 pb-8">
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: colors.surface + "15",
                borderWidth: 1,
                borderColor: colors.primary + "30",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.primary, fontSize: 28 }}>✦</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: "300", color: colors.foreground, letterSpacing: 1 }}>
              Aletheia Pro
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", maxWidth: 260, lineHeight: 22 }}>
              Mở khóa chiều sâu của phản chiếu
            </Text>
          </View>

          {/* Current tier badge */}
          {currentTier === "pro" && (
            <View className="items-center mb-6">
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: colors.primary + "15",
                  borderWidth: 1,
                  borderColor: colors.primary + "30",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "500", color: colors.primary }}>
                  ✓ Đang sử dụng Pro
                </Text>
              </View>
            </View>
          )}

          {/* Benefits - Elegant list */}
          <View className="gap-2 mb-8">
            {benefits.map((benefit, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: colors.surface + "0A",
                  borderWidth: 1,
                  borderColor: colors.border + "15",
                }}
              >
                <Text style={{ fontSize: 18 }}>{benefit.icon}</Text>
                <Text style={{ fontSize: 15, color: colors.foreground, flex: 1 }}>
                  {benefit.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Free tier note - Honest, clear */}
          {currentTier === "free" && (
            <View style={{ padding: 16, borderRadius: 14, backgroundColor: colors.surface + "10", marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
                Miễn phí: {FREE_READINGS_PER_DAY} lần đọc/ngày • {FREE_AI_PER_DAY} AI/ngày
              </Text>
            </View>
          )}

          {currentTier === "free" && billingNotice && (
            <View
              style={{
                padding: 16,
                borderRadius: 14,
                backgroundColor: colors.primary + "10",
                borderWidth: 1,
                borderColor: colors.primary + "25",
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 13, color: colors.foreground, textAlign: "center", lineHeight: 20 }}>
                {billingNotice}
              </Text>
            </View>
          )}

          {/* Plans - Premium selection */}
          {currentTier === "free" && (
            <View className="gap-3 mb-6">
              {/* Yearly - Recommended */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPlan("yearly");
                }}
                style={({ pressed }) => ({
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: selectedPlan === "yearly" ? colors.primary + "10" : colors.surface + "08",
                  borderWidth: 1.5,
                  borderColor: selectedPlan === "yearly" ? colors.primary : colors.border + "30",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: selectedPlan === "yearly" ? colors.primary : colors.foreground,
                        }}
                      >
                        Gói Năm
                      </Text>
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 12,
                          backgroundColor: colors.primary,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "600", color: "#FFFFFF" }}>
                          TIẾT KIỆM 50%
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 13, color: colors.muted, marginTop: 6 }}>
                      599.000đ/năm
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: selectedPlan === "yearly" ? colors.primary : colors.border,
                      backgroundColor: selectedPlan === "yearly" ? colors.primary : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selectedPlan === "yearly" && (
                      <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>✓</Text>
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
                style={({ pressed }) => ({
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: selectedPlan === "monthly" ? colors.primary + "10" : colors.surface + "08",
                  borderWidth: 1.5,
                  borderColor: selectedPlan === "monthly" ? colors.primary : colors.border + "30",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: selectedPlan === "monthly" ? colors.primary : colors.foreground,
                      }}
                    >
                      Gói Tháng
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.muted, marginTop: 6 }}>
                      99.000đ/tháng
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: selectedPlan === "monthly" ? colors.primary : colors.border,
                      backgroundColor: selectedPlan === "monthly" ? colors.primary : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selectedPlan === "monthly" && (
                      <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>✓</Text>
                    )}
                  </View>
                </View>
              </Pressable>
            </View>
          )}

          {/* Spacer */}
          <View className="flex-1" />

          {/* Actions - Premium, not aggressive */}
          <View className="gap-3 pb-4">
            {currentTier === "free" ? (
              <>
                <Pressable
                  onPress={handlePurchase}
                  disabled={!selectedPlan}
                  style={({ pressed }) => ({
                    backgroundColor: !selectedPlan ? colors.surface + "40" : colors.primary,
                    paddingHorizontal: 32,
                    paddingVertical: 18,
                    borderRadius: 28,
                    opacity: pressed || !selectedPlan ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 3,
                  })}
                >
                  <Text style={{ fontSize: 17, fontWeight: "600", color: "#FFFFFF", textAlign: "center" }}>
                    {selectedPlan ? "Thông báo mở khóa Pro" : "Chọn gói để tiếp tục"}
                  </Text>
                </Pressable>

                <Pressable onPress={handleRestore} style={{ paddingVertical: 10 }}>
                  <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
                    Đã mua trước đó? Khôi phục
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => ({
                  backgroundColor: colors.primary,
                  paddingHorizontal: 32,
                  paddingVertical: 18,
                  borderRadius: 28,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <Text style={{ fontSize: 17, fontWeight: "600", color: "#FFFFFF", textAlign: "center" }}>
                  Tiếp tục hành trình
                </Text>
              </Pressable>
            )}

            <Text style={{ fontSize: 11, color: colors.muted, textAlign: "center", paddingHorizontal: 20, lineHeight: 18 }}>
              Trong beta hiện tại, màn hình này chỉ hiển thị cấu trúc gói. Thanh toán thật chưa được bật.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
}
