import { useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { RitualOrnament } from "@/components/ritual-ornament";
import { useColors } from "@/hooks/use-colors";
import { coreStore } from "@/lib/services/core-store";
import { getCurrentUserId } from "@/lib/services/current-user-id";
import { SubscriptionTier, UserIntent } from "@/lib/types";
import { Fonts } from "@/constants/theme";

const STEPS = ["welcome", "intent", "ready"] as const;

const INTENTS = [
  { intent: UserIntent.Clarity, icon: "✧", title: "Sự rõ ràng", description: "Khi bạn cần gọi đúng tên vấn đề." },
  { intent: UserIntent.Comfort, icon: "❋", title: "Sự an ủi", description: "Khi bạn cần một giọng nói dịu hơn." },
  { intent: UserIntent.Challenge, icon: "✦", title: "Một thách thức", description: "Khi bạn sẵn sàng nghe điều không dễ chịu." },
  { intent: UserIntent.Guidance, icon: "◈", title: "Để vũ trụ dẫn lối", description: "Khi bạn muốn buông kiểm soát và nhận điều đến." },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedIntent, setSelectedIntent] = useState<UserIntent | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const canContinue = useMemo(() => currentStep !== "intent" || Boolean(selectedIntent), [currentStep, selectedIntent]);

  const transitionTo = (nextStep: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setStep(nextStep);
  };

  const completeOnboarding = async () => {
    setIsCompleting(true);
    try {
      const userId = await getCurrentUserId();
      const userState = await coreStore.getUserState(userId);
      await coreStore.updateUserState({
        ...userState,
        user_id: userId,
        subscription_tier: userState.subscription_tier ?? SubscriptionTier.Free,
        onboarding_complete: true,
        user_intent: selectedIntent ?? userState.user_intent ?? UserIntent.Clarity,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      setIsCompleting(false);
    }
  };

  const handleNext = () => {
    if (!canContinue || isCompleting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLastStep) {
      completeOnboarding();
      return;
    }
    transitionTo(step + 1);
  };

  const handleSkip = () => {
    if (isCompleting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIntent((value) => value ?? UserIntent.Clarity);
    completeOnboarding();
  };

  return (
    <ScreenContainer className="px-6 pb-6">
      <View style={styles.root}>
        <View style={styles.topBar}>
          <View style={styles.progressTrack}>
            {STEPS.map((item, index) => (
              <View
                key={item}
                style={[
                  styles.progressPill,
                  {
                    width: index === step ? 28 : 8,
                    backgroundColor: index <= step ? colors.primary : colors.border + "44",
                  },
                ]}
              />
            ))}
          </View>
          <Pressable onPress={handleSkip}>
            <Text testID="onboarding-skip" style={[styles.skip, { color: colors.muted }]}>Bỏ qua</Text>
          </Pressable>
        </View>

        <Animated.View style={{ opacity: fadeAnim, flex: 1, justifyContent: "space-between" }}>
          <View style={styles.main}>
            {currentStep === "welcome" ? (
              <>
                <View style={[styles.heroHalo, { backgroundColor: colors.primary + "10" }]} />
                <RitualOrnament variant="eye" size="lg" />
                <Text style={[styles.title, { color: colors.foreground, fontFamily: Fonts.displayStrong }]}>ALETHEIA</Text>
                <Text style={[styles.kicker, { color: colors.primary }]}>not a fortune • a mirror</Text>
                <Text style={[styles.tagline, { color: colors.foreground }]}>Dừng lại. Phản chiếu. Hiểu.</Text>
                <Text style={[styles.body, { color: colors.muted }]}>
                  Aletheia không nói trước tương lai. Nó tạo ra một không gian tối, chậm và đủ yên để bạn nhìn lại chính mình qua các đoạn trích triết học.
                </Text>
              </>
            ) : null}

            {currentStep === "intent" ? (
              <>
                <RitualOrnament variant="sigil" />
                <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: Fonts.display }]}>Hôm nay bạn cần chiếc gương nào?</Text>
                <Text style={[styles.body, { color: colors.muted }]}>
                  Chọn một ý định mở đầu. Nó giúp Aletheia điều chỉnh sắc thái phản chiếu cho lần đọc đầu tiên.
                </Text>
                <View style={styles.intentGrid}>
                  {INTENTS.map((item) => {
                    const isSelected = selectedIntent === item.intent;
                    return (
                      <Pressable
                        key={item.intent}
                        testID={`intent-card-${item.intent}`}
                        accessibilityLabel={`intent-card-${item.intent}`}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          setSelectedIntent(item.intent);
                        }}
                        style={[
                          styles.intentCard,
                          {
                            backgroundColor: isSelected ? colors.primary + "18" : colors.surface + "CC",
                            borderColor: isSelected ? colors.primary + "88" : colors.primary + "22",
                          },
                        ]}
                      >
                        <Text style={[styles.intentIcon, { color: colors.primary }]}>{item.icon}</Text>
                        <Text style={[styles.intentTitle, { color: colors.foreground, fontFamily: Fonts.display }]}>{item.title}</Text>
                        <Text style={[styles.intentDesc, { color: colors.muted }]}>{item.description}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {currentStep === "ready" ? (
              <>
                <RitualOrnament variant="line" />
                <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: Fonts.display }]}>Cách Aletheia hoạt động</Text>
                <View style={styles.checklist}>
                  {[
                    "Bạn mô tả điều đang diễn ra, hoặc để trống nếu muốn.",
                    "Bạn chọn một biểu tượng để mở passage.",
                    "AI chỉ diễn giải khi bạn chủ động yêu cầu.",
                    "Lịch sử và trạng thái được giữ local trên thiết bị.",
                  ].map((item) => (
                    <View key={item} style={[styles.checkItem, { backgroundColor: colors.surface + "B6", borderColor: colors.primary + "18" }]}>
                      <Text style={[styles.checkGlyph, { color: colors.primary }]}>✦</Text>
                      <Text style={[styles.checkText, { color: colors.foreground }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.bottom}>
            <Pressable
              testID="onboarding-primary-action"
              accessibilityLabel="onboarding-primary-action"
              onPress={handleNext}
              disabled={!canContinue || isCompleting}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.primary + "18",
                  borderColor: colors.primary + "76",
                  opacity: !canContinue || isCompleting ? 0.45 : 1,
                },
              ]}
            >
              <Text style={[styles.primaryButtonText, { color: colors.foreground, fontFamily: Fonts.display }]}>
                {isLastStep ? (isCompleting ? "Đang mở cổng..." : "Bắt đầu lần đọc đầu tiên") : "Tiếp tục"}
              </Text>
            </Pressable>
            <Text style={[styles.stepText, { color: colors.muted }]}>Bước {step + 1} / {STEPS.length}</Text>
          </View>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  progressTrack: {
    flexDirection: "row",
    gap: 8,
  },
  progressPill: {
    height: 8,
    borderRadius: 999,
  },
  skip: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  main: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    position: "relative",
  },
  heroHalo: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -24,
  },
  title: {
    fontSize: 40,
    letterSpacing: 8,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 3.2,
    textTransform: "uppercase",
  },
  tagline: {
    fontSize: 13,
    letterSpacing: 3.2,
    textTransform: "uppercase",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
  },
  body: {
    maxWidth: 320,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.bodyItalic,
  },
  intentGrid: {
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  intentCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  intentIcon: {
    fontSize: 22,
  },
  intentTitle: {
    fontSize: 18,
  },
  intentDesc: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Fonts.bodyItalic,
  },
  checklist: {
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  checkItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  checkGlyph: {
    fontSize: 14,
    marginTop: 1,
  },
  checkText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.body,
  },
  bottom: {
    gap: 12,
    paddingBottom: 12,
  },
  primaryButton: {
    borderRadius: 22,
    borderWidth: 1.2,
    paddingHorizontal: 24,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 18,
    letterSpacing: 1.2,
    textAlign: "center",
    textTransform: "uppercase",
  },
  stepText: {
    textAlign: "center",
    fontSize: 12,
  },
});
