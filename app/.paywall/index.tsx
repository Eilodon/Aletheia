import { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, Animated } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { coreStore } from "@/lib/services/core-store";
import { getCurrentUserId } from "@/lib/services/current-user-id";
import {
  getCurrentOffering,
  purchasePackage,
  restorePurchases,
} from "@/lib/services/purchases";
import type { PurchasesPackage } from "react-native-purchases";
import * as Haptics from "expo-haptics";
import { track } from "@/lib/analytics";
import { SubscriptionTier } from "@/lib/types";

const FREE_READINGS_PER_DAY = 3;
const FREE_AI_PER_DAY = 1;
// Maps UI plan IDs to RevenueCat package types
const PLAN_PACKAGE_TYPE: Record<string, string> = {
  yearly: "ANNUAL",
  lifetime: "LIFETIME",
  monthly: "MONTHLY",
};

export default function PaywallScreen() {
  const colors = useColors();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const isFromDailyLimit = from === "daily_limit";
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>(SubscriptionTier.Free);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [rcPackages, setRcPackages] = useState<Map<string, PurchasesPackage>>(new Map());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const userId = await getCurrentUserId();
        const userState = await coreStore.getUserState(userId);
        setCurrentTier(userState.subscription_tier);
      } catch (e) {
        console.error("[paywall] failed to load user state:", e);
      }

      // Load RC offerings — non-blocking, UI works without them
      try {
        const offering = await getCurrentOffering();
        if (offering) {
          const map = new Map<string, PurchasesPackage>();
          for (const pkg of offering.availablePackages) {
            const planId = Object.entries(PLAN_PACKAGE_TYPE).find(
              ([, type]) => pkg.packageType === type,
            )?.[0];
            if (planId) map.set(planId, pkg);
          }
          setRcPackages(map);
        }
      } catch (e) {
        console.warn("[paywall] failed to load offerings:", e);
      }
    };

    bootstrap();
    track("paywall_viewed", { screen: "paywall" });
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handlePurchase = async () => {
    if (!selectedPlan || isPurchasing) return;

    track("paywall_upgrade_tapped", { selected_plan: selectedPlan, current_tier: currentTier, screen: "paywall" });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPurchasing(true);
    setPurchaseError(null);

    try {
      const pkg = rcPackages.get(selectedPlan);
      if (!pkg) {
        // RC not configured yet — inform honestly
        setPurchaseError("Thanh toán chưa được kích hoạt trong build này. API key RevenueCat chưa được cấu hình.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      const success = await purchasePackage(pkg);
      if (success) {
        await coreStore.updateSubscriptionTier(SubscriptionTier.Pro);
        track("paywall_purchase_success", { plan: selectedPlan });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
      // false = user cancelled, no error needed
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Thanh toán thất bại. Vui lòng thử lại.";
      setPurchaseError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      track("paywall_purchase_error", { plan: selectedPlan, error: msg });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (isRestoring) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRestoring(true);
    setPurchaseError(null);

    try {
      const hasPro = await restorePurchases();
      if (hasPro) {
        await coreStore.updateSubscriptionTier(SubscriptionTier.Pro);
        track("paywall_restore_success");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        setPurchaseError("Không tìm thấy giao dịch Pro trước đó để khôi phục.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch {
      setPurchaseError("Khôi phục thất bại. Vui lòng thử lại.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  const benefits = [
    { icon: "✦", text: "Thư viện nguồn triết lý sâu hơn — thêm truyền thống, thêm ngôn ngữ" },
    { icon: "◎", text: "Soi thêm bằng AI nhiều hơn mỗi ngày" },
    { icon: "🎁", text: "Tặng một chiếc gương nhỏ cho người thân" },
    { icon: "◌", text: "Xuất archive cá nhân — hoàn toàn offline" },
    { icon: "◉", text: "Giúp giữ AletheiA yên, riêng tư, không quảng cáo, không bán dữ liệu" },
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

          {/* Header — contemplative when reaching daily limit, standard otherwise */}
          {isFromDailyLimit ? (
            <View className="items-center gap-4 pt-12 pb-8">
              <Text style={{ color: colors.primary, fontSize: 28, letterSpacing: 2 }}>✦</Text>
              <Text style={{ fontSize: 20, fontWeight: "300", color: colors.foreground, textAlign: "center", letterSpacing: 0.5, lineHeight: 30, maxWidth: 280 }}>
                Bạn đã đối thoại đủ cho hôm nay.
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", maxWidth: 260, lineHeight: 22, fontStyle: "italic" }}>
                Phần còn lại, hãy để cuộc sống trả lời.
              </Text>
              <View style={{ width: 40, height: 1, backgroundColor: colors.primary + "40", marginVertical: 8 }} />
              <Text style={{ fontSize: 12, color: colors.muted, textAlign: "center", maxWidth: 240, lineHeight: 18, letterSpacing: 0.5 }}>
                Nếu bạn muốn tiếp tục khám phá sâu hơn, Aletheia Pro mở thêm không gian.
              </Text>
            </View>
          ) : (
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
                Ủng hộ một chiếc gương yên, riêng tư, không quảng cáo
              </Text>
            </View>
          )}

          {/* Current tier badge */}
          {currentTier === SubscriptionTier.Pro && (
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
          {currentTier === SubscriptionTier.Free && (
            <View style={{ padding: 16, borderRadius: 14, backgroundColor: colors.surface + "10", marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
                Miễn phí: {FREE_READINGS_PER_DAY} lần đọc/ngày • {FREE_AI_PER_DAY} AI/ngày
              </Text>
            </View>
          )}

          {purchaseError && (
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
                {purchaseError}
              </Text>
            </View>
          )}

          {/* Plans - Premium selection */}
          {currentTier === SubscriptionTier.Free && (
            <View className="gap-3 mb-6">
              {/* Yearly - Recommended */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPlan("yearly");
                  track("paywall_plan_selected", { plan: "yearly" });
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

              {/* Lifetime — one-time, no renewal anxiety */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPlan("lifetime");
                  track("paywall_plan_selected", { plan: "lifetime" });
                }}
                style={({ pressed }) => ({
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: selectedPlan === "lifetime" ? colors.primary + "10" : colors.surface + "08",
                  borderWidth: 1.5,
                  borderColor: selectedPlan === "lifetime" ? colors.primary : colors.border + "30",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Text style={{ fontSize: 16, fontWeight: "600",
                        color: selectedPlan === "lifetime" ? colors.primary : colors.foreground }}>
                        Trọn Đời
                      </Text>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
                        backgroundColor: colors.primary }}>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: "#FFFFFF" }}>
                          MỘT LẦN DUY NHẤT
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 13, color: colors.muted, marginTop: 6 }}>
                      999.000đ — không gia hạn
                    </Text>
                  </View>
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2,
                    borderColor: selectedPlan === "lifetime" ? colors.primary : colors.border,
                    backgroundColor: selectedPlan === "lifetime" ? colors.primary : "transparent",
                    alignItems: "center", justifyContent: "center" }}>
                    {selectedPlan === "lifetime" && (
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
                  track("paywall_plan_selected", { plan: "monthly" });
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
            {currentTier === SubscriptionTier.Free ? (
              <>
                <Pressable
                  onPress={handlePurchase}
                  disabled={!selectedPlan || isPurchasing}
                  style={({ pressed }) => ({
                    backgroundColor: !selectedPlan || isPurchasing ? colors.surface + "40" : colors.primary,
                    paddingHorizontal: 32,
                    paddingVertical: 18,
                    borderRadius: 28,
                    opacity: pressed || !selectedPlan || isPurchasing ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 3,
                  })}
                >
                  <Text style={{ fontSize: 17, fontWeight: "600", color: "#FFFFFF", textAlign: "center" }}>
                    {isPurchasing ? "Đang xử lý..." : selectedPlan ? "Ủng hộ AletheiA" : "Chọn gói để tiếp tục"}
                  </Text>
                </Pressable>

                <Pressable onPress={handleRestore} disabled={isRestoring} style={{ paddingVertical: 10 }}>
                  <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
                    {isRestoring ? "Đang khôi phục..." : "Đã mua trước đó? Khôi phục"}
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
              Thanh toán được xử lý qua App Store / Google Play. Không lưu thông tin thẻ.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
}
